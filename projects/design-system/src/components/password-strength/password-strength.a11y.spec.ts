/**
 * Tests d'accessibilité automatisés (axe-core) — PasswordStrengthComponent.
 *
 * Rend le composant avec un mot de passe saisi (politique flushée via
 * HttpTestingController) puis lance une passe axe complète sur le DOM
 * (meter aria-live, checklist de critères, libellés SR-only).
 *
 * Nouveau fichier dédié (`*.a11y.spec.ts`) pour éviter tout conflit avec les
 * specs existants.
 */
import { axe } from '../a11y-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PasswordStrengthComponent } from './password-strength.component';
import { DESIGN_SYSTEM_API_URL } from './password-policy.service';

describe('PasswordStrengthComponent — a11y (axe)', () => {
  let fixture: ComponentFixture<PasswordStrengthComponent>;
  let httpMock: HttpTestingController;

  const TEST_API_URL = 'http://localhost:8080/api';

  function flushDefaultPolicy(): void {
    httpMock
      .expectOne(`${TEST_API_URL}/auth/password-policy`)
      .flush({ minLength: 12, minUppercase: 1, minDigits: 1, minSpecial: 1 });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        PasswordStrengthComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DESIGN_SYSTEM_API_URL, useValue: TEST_API_URL },
      ],
    });
    fixture = TestBed.createComponent(PasswordStrengthComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('has no detectable axe violations with a password entered (medium level)', async () => {
    fixture.componentRef.setInput('password', 'Abcdefghi1!x');
    fixture.detectChanges();
    flushDefaultPolicy();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.password-strength__level')).not.toBeNull();
    expect(await axe(el)).toHaveNoViolations();
  });

  it('has no detectable axe violations with a strong password entered', async () => {
    fixture.componentRef.setInput('password', 'Abcdefghi1!xyzzy');
    fixture.detectChanges();
    flushDefaultPolicy();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(await axe(el)).toHaveNoViolations();
  });
});
