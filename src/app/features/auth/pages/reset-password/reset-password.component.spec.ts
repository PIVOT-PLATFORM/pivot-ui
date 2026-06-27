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
  const URL = `${environment.apiUrl}/auth/reset-password`;
  afterEach(() => TestBed.resetTestingModule());

  it('lit le token depuis la query string', () => {
    const { component, httpMock } = setup('reset-tok');
    expect(component.token()).toBe('reset-tok');
    httpMock.verify();
  });

  it('token absent → token() null, lien invalide', () => {
    const { component, httpMock } = setup(null);
    expect(component.token()).toBeNull();
    httpMock.verify();
  });

  it('ne soumet pas quand le mot de passe est invalide', () => {
    const { component, httpMock } = setup('reset-tok');
    component.submit();
    httpMock.expectNone(r => r.url === URL);
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('succès → success=true, loading=false', () => {
    const { component, httpMock } = setup('reset-tok');
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush({ message: 'ok' });
    expect(component.success()).toBe(true);
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('erreur serveur → message générique', () => {
    const { component, httpMock } = setup('reset-tok');
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush('', { status: 400, statusText: 'Bad Request' });
    expect(component.error()).toBe('common.error_generic');
    expect(component.loading()).toBe(false);
    httpMock.verify();
  });

  it('ne soumet pas deux fois pendant le chargement', () => {
    const { component, httpMock } = setup('reset-tok');
    component.form.setValue({ newPassword: 'SecurePass123!' });
    component.submit();
    component.submit();
    const reqs = httpMock.match(r => r.url === URL);
    expect(reqs).toHaveLength(1);
    reqs[0].flush({ message: 'ok' });
    httpMock.verify();
  });
});
