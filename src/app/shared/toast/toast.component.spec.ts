import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

@Component({ template: '', standalone: true })
class StubRoute {}

describe('ToastComponent', () => {
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
      providers: [provideRouter([{ path: 'admin/modules', component: StubRoute }])],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('renders nothing when there is no toast', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.toast')).toHaveLength(0);
  });

  it('AC-02 — renders the translated expiry message with role="alert" (a11y)', () => {
    toastService.show('auth.session.expired', 'warning');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const toast = el.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.textContent).toContain('Session expirée, veuillez vous reconnecter.');
    expect(toast?.classList.contains('toast--warning')).toBe(true);
  });

  it('close button has a translated aria-label and dismisses the toast', () => {
    toastService.show('auth.session.expired', 'warning');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const closeBtn = el.querySelector<HTMLButtonElement>('.toast__close');
    expect(closeBtn?.getAttribute('aria-label')).toBe('Fermer');

    closeBtn?.click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.toast')).toHaveLength(0);
    expect(toastService.toasts()).toEqual([]);
  });

  it('renders an action link when the toast has one, and dismisses on click', () => {
    toastService.show('auth.session.expired', 'warning', undefined, {
      labelKey: 'modules.guard.adminLink',
      route: '/admin/modules',
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector<HTMLAnchorElement>('.toast__action');
    expect(link?.textContent?.trim()).toBe('Gérer les modules');

    link?.click();
    fixture.detectChanges();

    expect(toastService.toasts()).toEqual([]);
  });

  it('renders no action link when the toast has none', () => {
    toastService.show('auth.session.expired', 'warning');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.toast__action')).toBeNull();
  });
});
