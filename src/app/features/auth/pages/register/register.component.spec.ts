import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { RegisterComponent } from './register.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RegisterComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('does not submit when form is invalid', () => {
    component.submit();
    httpMock.expectNone(`${environment.apiUrl}/auth/register`);
  });

  const validForm = () => ({
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.com',
    password: 'SecurePass1!',
  });

  it('submits and sets success on 200', fakeAsync(() => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush({});
    tick();
    expect(component.success()).toBe(true);
    expect(component.loading()).toBe(false);
  }));

  it('sets success on 409 (RGPD — ne révèle pas si email existant)', fakeAsync(() => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 409, statusText: 'Conflict' });
    tick();
    expect(component.success()).toBe(true);
  }));

  it('sets success on 400', fakeAsync(() => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 400, statusText: 'Bad Request' });
    tick();
    expect(component.success()).toBe(true);
  }));

  it('sets rate limit error on 429', fakeAsync(() => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 429, statusText: 'Too Many Requests' });
    tick();
    expect(component.error()).toBe('auth.login.error_rate_limit');
  }));

  it('sets generic error on 500', fakeAsync(() => {
    component.form.setValue(validForm());
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/register`).flush('', { status: 500, statusText: 'Server Error' });
    tick();
    expect(component.error()).toBe('common.error_generic');
  }));

  describe('passwordStrength()', () => {
    it('returns 0% for empty password', () => {
      component.form.patchValue({ password: '' });
      expect(component.passwordStrength().width).toBe('0%');
    });

    it('returns 100% for very strong password', () => {
      component.form.patchValue({ password: 'SuperSecure123!!Extra' });
      expect(component.passwordStrength().width).toBe('100%');
    });

    it('returns 20% for short weak password', () => {
      component.form.patchValue({ password: 'a' });
      expect(component.passwordStrength().width).toBe('20%');
    });

    it('increases with length, uppercase, digit, special char', () => {
      component.form.patchValue({ password: 'Abc123!secure' });
      const s = component.passwordStrength();
      expect(['60%', '80%', '100%']).toContain(s.width);
    });
  });

  describe('strongPassword validator', () => {
    it('is invalid when password < 12 chars', () => {
      component.form.patchValue({ password: 'Short1!' });
      expect(component.form.get('password')!.errors).toBeTruthy();
    });

    it('is invalid without uppercase', () => {
      component.form.patchValue({ password: 'alllowercase1!' });
      expect(component.form.get('password')!.errors).toBeTruthy();
    });

    it('is invalid without digit', () => {
      component.form.patchValue({ password: 'NoDigitsHere!!' });
      expect(component.form.get('password')!.errors).toBeTruthy();
    });

    it('is invalid without special char', () => {
      component.form.patchValue({ password: 'NoSpecialChar123' });
      expect(component.form.get('password')!.errors).toBeTruthy();
    });

    it('is valid when all criteria met', () => {
      component.form.patchValue({ password: 'SecurePass123!' });
      expect(component.form.get('password')!.errors).toBeNull();
    });
  });
});
