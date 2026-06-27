import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { VerifyEmailComponent } from './verify-email.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

/** Construit le composant avec un token de query string donné (ou aucun). */
function setup(token: string | null): {
  fixture: ComponentFixture<VerifyEmailComponent>;
  component: VerifyEmailComponent;
  httpMock: HttpTestingController;
} {
  TestBed.configureTestingModule({
    imports: [
      VerifyEmailComponent,
      TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
    ],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => token } } } },
    ],
  });
  const fixture = TestBed.createComponent(VerifyEmailComponent);
  const component = fixture.componentInstance;
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges(); // déclenche ngOnInit
  return { fixture, component, httpMock };
}

describe('VerifyEmailComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('passe en erreur quand aucun token (pas d\'appel réseau)', () => {
    const { component, httpMock } = setup(null);
    httpMock.expectNone(`${environment.apiUrl}/auth/verify-email`);
    expect(component.state()).toBe('error');
    httpMock.verify();
  });

  it('passe en succès quand le backend valide le token', () => {
    const { component, httpMock } = setup('valid-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/auth/verify-email`).flush({ message: 'ok' });
    expect(component.state()).toBe('success');
    httpMock.verify();
  });

  it('passe en erreur quand le backend rejette le token', () => {
    const { component, httpMock } = setup('bad-token');
    httpMock.expectOne(r => r.url === `${environment.apiUrl}/auth/verify-email`)
      .flush('', { status: 400, statusText: 'Bad Request' });
    expect(component.state()).toBe('error');
    httpMock.verify();
  });
});
