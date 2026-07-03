import { TestBed, ComponentFixture } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

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
            },
            en: {},
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
        }),
      ],
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
});
