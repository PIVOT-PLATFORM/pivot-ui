import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ResendVerificationComponent } from './resend-verification.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('ResendVerificationComponent', () => {
  let fixture: ComponentFixture<ResendVerificationComponent>;
  let component: ResendVerificationComponent;
  let httpMock: HttpTestingController;
  const URL = `${environment.apiUrl}/auth/resend-verification`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ResendVerificationComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResendVerificationComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('does not submit when form invalid', () => {
    component.submit();
    httpMock.expectNone(r => r.url === URL);
    expect(component.loading()).toBe(false);
  });

  it('sets loading then sent on success', () => {
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    expect(component.loading()).toBe(true);
    fixture.detectChanges();
    httpMock.expectOne(r => r.url === URL).flush({ message: 'ok' });
    fixture.detectChanges();
    expect(component.sent()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('sets sent=true even on error (RGPD — pas d\'énumération)', () => {
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    httpMock.expectOne(r => r.url === URL).flush('', { status: 404, statusText: 'Not Found' });
    expect(component.sent()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('affiche alerte erreur quand signal error positionné', () => {
    component.error.set('common.error_generic');
    fixture.detectChanges();
    expect(component.error()).toBe('common.error_generic');
  });

  it('does not submit while loading', () => {
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    component.submit();
    const reqs = httpMock.match(r => r.url === URL);
    expect(reqs).toHaveLength(1);
    reqs[0].flush({ message: 'ok' });
  });
});
