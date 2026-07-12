import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NavbarComponent, avatarColor } from './navbar.component';
import { AuthService } from '../../auth/service/auth.service';
import { ThemeService } from '../../theme/theme.service';
import { NotificationService } from '../../notifications/notification.service';
import { environment } from '../../../../environments/environment';
import { ensureLocalStorageStub } from '../../i18n/testing/local-storage-stub';

ensureLocalStorageStub();

const TRANSLOCO_FR = {
  nav: {
    home: 'Accueil', modules: 'Modules', teams: 'Mes équipes',
    lang_aria: 'Langue', notifications: 'Notifications',
    notif_count: '{{ count }} notifications non lues', user_menu: 'Menu de {{ name }}',
    sign_out: 'Se déconnecter',
    theme_to_dark: 'Passer en mode sombre', theme_to_light: 'Passer en mode clair',
    dropdown: {
      user_menu_aria: 'Menu utilisateur', profile: 'Mon profil',
      preferences: 'Préférences', security: 'Sécurité', my_data: 'Mes données',
      coming_soon: 'Bientôt', coming_soon_a11y: 'Bientôt disponible', logout: 'Déconnexion',
    },
  },
};

/** URL du contrat EN-NOTIF consommé par {@link NotificationService} (US16.1.3). */
const notifUrl = `${environment.apiUrl}/notifications/unread-count`;

@Component({ template: '', standalone: true })
class StubComponent {}

const mockAuthResponse = {
  accessToken: 'tok',
  expiresAt: Date.now() + 3_600_000,
  user: {
    id: 1,
    email: 'alexandre.solane@example.com',
    firstName: 'Alexandre',
    lastName: 'Solane',
    role: 'USER',
    emailVerified: true,
    tenantId: 1,
    tenantSlug: 'test',
  },
};

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let themeService: ThemeService;
  let notifications: NotificationService;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        importProvidersFrom(
          TranslocoTestingModule.forRoot({
            langs: { fr: TRANSLOCO_FR, en: TRANSLOCO_FR },
            translocoConfig: { defaultLang: 'fr', availableLangs: ['fr', 'en'] },
            preloadLangs: true,
          }),
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    themeService = TestBed.inject(ThemeService);
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();

    // US16.1.3 — the constructor fires one immediate `fetchUnreadCount()` call; drain it
    // here so every test starts from a clean, matched request (count 0 — badge hidden).
    httpMock.expectOne(notifUrl).flush({ count: 0 });
  });

  afterEach(() => { httpMock.verify(); localStorage.clear(); vi.useRealTimers(); });

  it('creates the component', () => { expect(component).toBeTruthy(); });
  it('userMenuOpen starts as false', () => { expect(component.userMenuOpen()).toBe(false); });
  it('notifOpen starts as false', () => { expect(component.notifOpen()).toBe(false); });
  it('notifCount starts at 0', () => { expect(component.notifCount()).toBe(0); });

  describe('admin menu (role-based)', () => {
    function loginAs(role: string): void {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
        ...mockAuthResponse,
        user: { ...mockAuthResponse.user, role },
      });
      component.userMenuOpen.set(true);
      fixture.detectChanges();
    }

    function menuHrefs(): (string | null)[] {
      return (Array.from(
        fixture.nativeElement.querySelectorAll('a[role="menuitem"]'),
      ) as HTMLAnchorElement[]).map((a) => a.getAttribute('href'));
    }

    it('exposes no admin/superadmin entry for ROLE_USER', () => {
      loginAs('ROLE_USER');
      expect(component.isAdmin()).toBe(false);
      expect(component.isSuperAdmin()).toBe(false);
      const hrefs = menuHrefs();
      expect(hrefs).not.toContain('/admin/modules');
      expect(hrefs.some((h) => h?.startsWith('/superadmin'))).toBe(false);
    });

    it('exposes /admin/modules (and /admin/users) for ROLE_ADMIN', () => {
      loginAs('ROLE_ADMIN');
      expect(component.isAdmin()).toBe(true);
      const hrefs = menuHrefs();
      expect(hrefs).toContain('/admin/modules');
      expect(hrefs).toContain('/admin/users');
      expect(hrefs.some((h) => h?.startsWith('/superadmin'))).toBe(false);
    });

    it('exposes /superadmin/* for ROLE_SUPER_ADMIN', () => {
      loginAs('ROLE_SUPER_ADMIN');
      expect(component.isSuperAdmin()).toBe(true);
      const hrefs = menuHrefs();
      expect(hrefs).toContain('/superadmin/tenants');
      expect(hrefs).toContain('/superadmin/plans');
      expect(hrefs).not.toContain('/admin/modules');
    });
  });

  describe('initials()', () => {
    it('returns "?" when no user', () => { expect(component.initials()).toBe('?'); });

    it('returns "AS" for Alexandre Solane', () => {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      expect(component.initials()).toBe('AS');
    });

    it('handles null lastName', () => {
      const noLast = { ...mockAuthResponse, user: { ...mockAuthResponse.user, lastName: null } };
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(noLast);
      expect(component.initials()).toBe('A');
    });

    it('falls back to email initial when name is empty', () => {
      const noName = { ...mockAuthResponse, user: { ...mockAuthResponse.user, firstName: null, lastName: null, email: 'z@example.com' } };
      authService.login({ email: 'z@example.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(noName);
      expect(component.initials()).toBe('Z');
    });
  });

  describe('avatarColor()', () => {
    it('returns a valid hex color', () => { expect(avatarColor('Alexandre Solane')).toMatch(/^#[0-9A-Fa-f]{6}$/); });
    it('is deterministic', () => { expect(avatarColor('Alice Dupont')).toBe(avatarColor('Alice Dupont')); });
    it('differs for different names', () => { expect(avatarColor('Alice')).not.toBe(avatarColor('Bob')); });
  });

  describe('userMenuOpen toggle', () => {
    it('opens on toggleUserMenu', () => {
      const e = new MouseEvent('click');
      vi.spyOn(e, 'stopPropagation');
      component.toggleUserMenu(e);
      expect(component.userMenuOpen()).toBe(true);
    });

    it('closes on second call', () => {
      const e = new MouseEvent('click');
      component.toggleUserMenu(e);
      component.toggleUserMenu(e);
      expect(component.userMenuOpen()).toBe(false);
    });

    it('closes notif when user menu opens', () => {
      component.notifOpen.set(true);
      const e = new MouseEvent('click');
      component.toggleUserMenu(e);
      expect(component.notifOpen()).toBe(false);
    });
  });

  describe('toggleTheme()', () => {
    it('switches light to dark', () => {
      themeService.setTheme('light'); TestBed.flushEffects();
      component.toggleTheme(); TestBed.flushEffects();
      expect(component.theme()).toBe('dark');
    });

    it('switches dark to light', () => {
      themeService.setTheme('dark'); TestBed.flushEffects();
      component.toggleTheme(); TestBed.flushEffects();
      expect(component.theme()).toBe('light');
    });
  });

  describe('logout()', () => {
    it('clears session after logout', () => {
      authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      component.logout();
      httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('onDocumentClick()', () => {
    it('closes user menu', () => { component.userMenuOpen.set(true); component.onDocumentClick(); expect(component.userMenuOpen()).toBe(false); });
    it('closes notif dropdown', () => { component.notifOpen.set(true); component.onDocumentClick(); expect(component.notifOpen()).toBe(false); });
  });

  describe('setLang()', () => {
    it('persists en to localStorage when not authenticated (no PATCH fired)', () => {
      component.setLang('en');
      expect(localStorage.getItem('pivot_lang')).toBe('en');
      httpMock.expectNone(`${environment.apiUrl}/account/profile`);
    });

    it('persists fr to localStorage when not authenticated (no PATCH fired)', () => {
      component.setLang('fr');
      expect(localStorage.getItem('pivot_lang')).toBe('fr');
    });

    it('ignores an unsupported value', () => {
      component.setLang('de');
      expect(localStorage.getItem('pivot_lang')).toBeNull();
    });

    describe('when authenticated (US02.1.2)', () => {
      beforeEach(() => {
        authService.login({ email: 'a@b.com', password: 'pw' }).subscribe();
        httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
      });

      it('switches instantly AND calls PATCH /account/profile', () => {
        component.setLang('en');
        expect(localStorage.getItem('pivot_lang')).toBe('en');

        const req = httpMock.expectOne(`${environment.apiUrl}/account/profile`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual({ preferredLanguage: 'en' });
        req.flush({ preferredLanguage: 'en' });
      });

      it('reverts to the previous language on a save failure', () => {
        component.setLang('en');
        httpMock
          .expectOne(`${environment.apiUrl}/account/profile`)
          .flush('Network error', { status: 0, statusText: 'Unknown Error' });

        expect(localStorage.getItem('pivot_lang')).toBe('fr');
      });
    });
  });

  describe('themeLabel()', () => {
    it('returns dark label when theme is light', () => {
      themeService.setTheme('light'); TestBed.flushEffects();
      expect(component.themeLabel()).toBe('Passer en mode sombre');
    });

    it('returns light label when theme is dark', () => {
      themeService.setTheme('dark'); TestBed.flushEffects();
      expect(component.themeLabel()).toBe('Passer en mode clair');
    });
  });

  describe('bugReportUrl', () => {
    it('is a mailto link', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const link = el.querySelector<HTMLAnchorElement>('a.navbar__icon-btn[href]');
      expect(link?.href).toMatch(/mailto:/);
    });
  });

  describe('dropdown rendering', () => {
    it('renders dropdown when userMenuOpen is true', () => {
      const e = new MouseEvent('click');
      component.toggleUserMenu(e);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.navbar__dropdown')).toBeTruthy();
    });

    it('renders logout button inside open dropdown', () => {
      const e = new MouseEvent('click');
      component.toggleUserMenu(e);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.navbar__dropdown-item--danger')).toBeTruthy();
    });

    it('hides dropdown when userMenuOpen is false', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.navbar__dropdown')).toBeNull();
    });
  });

  describe('notification badge (US16.1.3)', () => {
    it('renders badge when notifCount > 0', () => {
      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush({ count: 3 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const badge = el.querySelector('.navbar__badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBe('3');
    });

    it('hides badge when notifCount is 0', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.navbar__badge')).toBeNull();
    });

    it('shows "99+" when the count exceeds 99, while the aria-label keeps the exact count', () => {
      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush({ count: 127 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const badge = el.querySelector('.navbar__badge');
      expect(badge?.textContent).toBe('99+');

      const bellButton = el.querySelector('.navbar__icon-btn[aria-disabled="true"]');
      expect(bellButton?.getAttribute('aria-label')).toBe('127 notifications non lues');
    });

    it('shows the exact count as-is when it does not exceed 99', () => {
      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush({ count: 99 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.navbar__badge')?.textContent).toBe('99');
    });

    it('badge is aria-hidden — never carries its own aria-live (announced via the dedicated region instead)', () => {
      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush({ count: 3 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const badge = el.querySelector('.navbar__badge');
      expect(badge?.getAttribute('aria-hidden')).toBe('true');
      expect(badge?.hasAttribute('aria-live')).toBe(false);
    });

    it('announces the exact count via a dedicated aria-live="polite" region', () => {
      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush({ count: 3 });
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const liveRegion = el.querySelector('output[aria-live="polite"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.textContent).toBe('3 notifications non lues');
    });

    it('falls back to the generic "Notifications" label when the count is 0', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const bellButton = el.querySelector('.navbar__icon-btn[aria-disabled="true"]');
      expect(bellButton?.getAttribute('aria-label')).toBe('Notifications');
    });

    it('hides the badge if the unread-count fetch fails after all retries (AC error)', () => {
      vi.useFakeTimers();
      notifications.fetchUnreadCount().subscribe();

      httpMock.expectOne(notifUrl).flush('error', { status: 500, statusText: 'Internal Server Error' });
      vi.advanceTimersByTime(1000);
      httpMock.expectOne(notifUrl).flush('error', { status: 500, statusText: 'Internal Server Error' });
      vi.advanceTimersByTime(2000);
      httpMock.expectOne(notifUrl).flush('error', { status: 500, statusText: 'Internal Server Error' });

      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.navbar__badge')).toBeNull();
    });

    it('shows the badge again once a later fetch recovers from a previous error', () => {
      vi.useFakeTimers();
      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush('error', { status: 500, statusText: 'Internal Server Error' });
      vi.advanceTimersByTime(1000);
      httpMock.expectOne(notifUrl).flush('error', { status: 500, statusText: 'Internal Server Error' });
      vi.advanceTimersByTime(2000);
      httpMock.expectOne(notifUrl).flush('error', { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.navbar__badge')).toBeNull();

      notifications.fetchUnreadCount().subscribe();
      httpMock.expectOne(notifUrl).flush({ count: 6 });
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.navbar__badge')?.textContent).toBe('6');
    });
  });

  describe('notification polling (US16.1.3)', () => {
    // A fresh, local fixture is created *after* vi.useFakeTimers() so the RxJS
    // interval() backing NotificationService.poll() is itself scheduled under the fake
    // clock from the start — the shared `fixture` from the outer beforeEach was already
    // constructed under real timers (before this test could switch them), so its own
    // polling interval cannot be advanced by vi.advanceTimersByTime() here.

    it('polls every 30s and keeps the badge in sync', () => {
      vi.useFakeTimers();
      const localFixture = TestBed.createComponent(NavbarComponent);
      localFixture.detectChanges();
      httpMock.expectOne(notifUrl).flush({ count: 0 });

      vi.advanceTimersByTime(30_000);
      httpMock.expectOne(notifUrl).flush({ count: 2 });
      localFixture.detectChanges();
      expect((localFixture.nativeElement as HTMLElement).querySelector('.navbar__badge')?.textContent).toBe('2');

      localFixture.destroy();
    });

    it('stops polling once the navbar is destroyed (takeUntilDestroyed)', () => {
      vi.useFakeTimers();
      const localFixture = TestBed.createComponent(NavbarComponent);
      localFixture.detectChanges();
      httpMock.expectOne(notifUrl).flush({ count: 0 });

      localFixture.destroy();
      vi.advanceTimersByTime(30_000);
      httpMock.expectNone(notifUrl);
    });
  });
});
