import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PostLoginRedirectService } from './post-login-redirect.service';

describe('PostLoginRedirectService', () => {
  let service: PostLoginRedirectService;
  let router: Router;
  let navigateByUrlSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PostLoginRedirectService);
    router = TestBed.inject(Router);
    navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  describe('resolveTarget — priorité et validation', () => {
    it('sans returnUrl (query ni session) → /home (AC défaut)', () => {
      expect(service.resolveTarget(null)).toBe('/home');
    });

    it('query param valide → utilisé', () => {
      expect(service.resolveTarget('/dashboard')).toBe('/dashboard');
    });

    it('session Angular seule → utilisée', () => {
      service.remember('/teams');
      expect(service.resolveTarget(null)).toBe('/teams');
    });

    it('query param ET session présents → le query param gagne (AC priorité)', () => {
      service.remember('/teams');
      expect(service.resolveTarget('/dashboard')).toBe('/dashboard');
    });

    it('query param invalide → /home, jamais de repli sur la session', () => {
      service.remember('/teams');
      expect(service.resolveTarget('https://evil.com')).toBe('/home');
    });

    it('open redirect via query param → /home', () => {
      expect(service.resolveTarget('//evil.com')).toBe('/home');
    });

    it('open redirect via session → /home', () => {
      service.remember('javascript:alert(1)');
      expect(service.resolveTarget(null)).toBe('/home');
    });
  });

  describe('non-persistance (AC : pas au-delà de la tentative de navigation)', () => {
    it('la valeur session est effacée après consommation', () => {
      service.remember('/dashboard');
      expect(service.resolveTarget(null)).toBe('/dashboard');
      // Deuxième tentative : la valeur ne doit plus exister → défaut
      expect(service.resolveTarget(null)).toBe('/home');
    });

    it('la valeur session est effacée même quand le query param gagne', () => {
      service.remember('/teams');
      service.resolveTarget('/dashboard');
      expect(service.resolveTarget(null)).toBe('/home');
    });

    it('clear() efface la valeur mémorisée', () => {
      service.remember('/dashboard');
      service.clear();
      expect(service.resolveTarget(null)).toBe('/home');
    });
  });

  describe('redirectAfterLogin — navigation', () => {
    it('navigue vers le returnUrl valide', async () => {
      await service.redirectAfterLogin('/dashboard');
      expect(navigateByUrlSpy).toHaveBeenCalledWith('/dashboard');
    });

    it('navigue vers /home sans returnUrl', async () => {
      await service.redirectAfterLogin(null);
      expect(navigateByUrlSpy).toHaveBeenCalledWith('/home');
    });

    it('navigue vers /home pour un returnUrl externe (open redirect bloqué)', async () => {
      await service.redirectAfterLogin('https://evil.com');
      expect(navigateByUrlSpy).toHaveBeenCalledWith('/home');
      expect(navigateByUrlSpy).toHaveBeenCalledTimes(1);
    });

    it('retombe sur /home si la navigation vers la cible échoue (AC route refusée)', async () => {
      navigateByUrlSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const result = await service.redirectAfterLogin('/route-refusee');
      expect(navigateByUrlSpy).toHaveBeenNthCalledWith(1, '/route-refusee');
      expect(navigateByUrlSpy).toHaveBeenNthCalledWith(2, '/home');
      expect(result).toBe(true);
    });

    it('ne boucle pas si la navigation vers /home échoue', async () => {
      navigateByUrlSpy.mockResolvedValue(false);
      const result = await service.redirectAfterLogin(null);
      expect(navigateByUrlSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });
  });
});
