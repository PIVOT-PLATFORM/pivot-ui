import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ResetPasswordComponent } from './reset-password.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

function setup(token: string | null): {
  fixture: ComponentFixture<ResetPasswordComponent>;
  component: ResetPasswordComponent;
  httpMock: HttpTestingController;
} {
  TestBed.configureTestingModule({
    imports: [
      ResetPasswordComponent,
      TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
    ],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => token } } } },
    ],
  });
  const fixture = TestBed.createComponent(ResetPasswordComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges(); // ngOnInit → lecture du token
  return { fixture, component, httpMock };
}

describe('ResetPasswordComponent', () => {
  const RESET_URL = `${environment.apiUrl}/auth/reset-password`;
  const CHECK_URL = `${environment.apiUrl}/auth/check-reset-token`;
  afterEach(() => TestBed.resetTestingModule());

  it('token valide → checkResetToken appelé, tokenState = valid', () => {
    const { component, httpMock } = setup('reset-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush({});
    expect(component.tokenState()).toBe('valid');
    httpMock.verify();
  });

  it('token absent → tokenState = invalid, pas de requête HTTP', () => {
    const { component, httpMock } = setup(null);
    expect(component.tokenState()).toBe('invalid');
    httpMock.expectNone(() => true);
    httpMock.verify();
  });

  it('token invalide (check 400) → tokenState = invalid', () => {
    const { component, httpMock } = setup('bad-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush('', { status: 400, statusText: 'Bad Request' });
    expect(component.tokenState()).toBe('invalid');
    httpMock.verify();
  });

  it('ne soumet pas quand le mot de passe est invalide', () => {
    const { component, httpMock } = setup('reset-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush({});
    component.submit();
    httpMock.expectNone(r => r.url === RESET_URL);
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('succès → tokenState = success, loading = false', () => {
    const { component, httpMock } = setup('reset-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush({});
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    httpMock.expectOne(r => r.url === RESET_URL).flush({ message: 'ok' });
    expect(component.tokenState()).toBe('success');
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('erreur 400 reset → tokenState = invalid', () => {
    const { component, httpMock } = setup('reset-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush({});
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    httpMock.expectOne(r => r.url === RESET_URL).flush('', { status: 400, statusText: 'Bad Request' });
    expect(component.tokenState()).toBe('invalid');
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('erreur 500 reset → message générique', () => {
    const { component, httpMock } = setup('reset-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush({});
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    httpMock.expectOne(r => r.url === RESET_URL).flush('', { status: 500, statusText: 'Server Error' });
    expect(component.error()).toBe('common.error_generic');
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('ne soumet pas deux fois pendant le chargement', () => {
    const { component, httpMock } = setup('reset-tok');
    httpMock.expectOne(r => r.url === CHECK_URL).flush({});
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    component.submit();
    const reqs = httpMock.match(r => r.url === RESET_URL);
    expect(reqs).toHaveLength(1);
    reqs[0].flush({ message: 'ok' });
    httpMock.verify();
  });
});
