import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LoginComponent } from './login.component';
import { GOOGLE_CLIENT_ID } from '../../../../app.config';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const mockAuthResponse = {
  accessToken: 'tok',
  expiresAt: Date.now() + 3600_000,
  user: { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', emailVerified: true, tenantId: 1, tenantSlug: 'test' },
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
        { provide: GOOGLE_CLIENT_ID, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
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
    httpMock.expectNone(`${environment.apiUrl}/auth/login`);
  });

  it('sets loading during submit', () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret', rememberMe: false });
    component.submit();
    expect(component.loading()).toBe(true);
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
  });

  it('clears loading and error on success', () => {
    component.form.setValue({ email: 'a@b.com', password: 'secret', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
    expect(component.loading()).toBe(false);
  });

  it('sets error on 401', () => {
    component.form.setValue({ email: 'a@b.com', password: 'wrong', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 401, statusText: 'Unauthorized' });
    expect(component.error()).toBe('auth.login.error_generic_credentials');
  });

  it('sets error on 403', () => {
    component.form.setValue({ email: 'a@b.com', password: 'wrong', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 403, statusText: 'Forbidden' });
    expect(component.error()).toBe('auth.login.error_generic_credentials');
  });

  it('sets error on 429', () => {
    component.form.setValue({ email: 'a@b.com', password: 'pw', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 429, statusText: 'Too Many Requests' });
    expect(component.error()).toBe('auth.login.error_rate_limit');
  });

  it('sets generic error on 500', () => {
    component.form.setValue({ email: 'a@b.com', password: 'pw', rememberMe: false });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush('', { status: 500, statusText: 'Server Error' });
    expect(component.error()).toBe('auth.login.error_generic');
  });

  it('does not submit while already loading', () => {
    component.form.setValue({ email: 'a@b.com', password: 'pw', rememberMe: false });
    component.submit();
    component.submit();
    const reqs = httpMock.match(`${environment.apiUrl}/auth/login`);
    expect(reqs.length).toBe(1);
    reqs[0].flush(mockAuthResponse);
  });

  it('googleEnabled is false when no Google client ID', () => {
    expect(component.googleEnabled()).toBe(false);
  });

  it('onGoogleLogin sets error when Google not configured', () => {
    component.onGoogleLogin();
    expect(component.error()).toBe('auth.login.error_google_not_configured');
  });
});
