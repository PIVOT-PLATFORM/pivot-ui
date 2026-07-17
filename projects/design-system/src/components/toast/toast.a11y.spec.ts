/**
 * Tests d'accessibilité automatisés (axe-core) — ToastComponent (conteneur).
 *
 * Rend le conteneur global avec un toast actif (poussé via ToastService) puis
 * lance une passe axe complète sur le DOM (live region role status/alert, bouton de fermeture
 * avec aria-label traduit, glyphe aria-hidden).
 *
 * Nouveau fichier dédié (`*.a11y.spec.ts`) pour éviter tout conflit avec les
 * specs existants.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

@Component({ selector: 'test-a11y-stub-route', template: '', standalone: true })
class A11yStubRoute {}

describe('ToastComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<ToastComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ToastComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              auth: { session: { expired: 'Session expirée, veuillez vous reconnecter.' } },
              common: { close: 'Fermer' },
              modules: { guard: { adminLink: 'Gérer les modules' } },
            },
            en: {},
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
        }),
      ],
      providers: [provideRouter([{ path: 'admin/modules', component: A11yStubRoute }])],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('has no detectable axe violations with an active toast', async () => {
    toastService.show('auth.session.expired', 'warning');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.toast')).not.toBeNull();
    expect(await axe(el)).toHaveNoViolations();
  });

  it('has no detectable axe violations with an action-link toast', async () => {
    toastService.show('auth.session.expired', 'warning', undefined, {
      labelKey: 'modules.guard.adminLink',
      route: '/admin/modules',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.toast__action')).not.toBeNull();
    expect(await axe(el)).toHaveNoViolations();
  });
});
