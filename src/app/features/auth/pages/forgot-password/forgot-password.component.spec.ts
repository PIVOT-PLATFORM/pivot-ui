import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ForgotPasswordComponent } from './forgot-password.component';
import { environment } from '../../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } }),
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
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
    httpMock.expectNone(`${environment.apiUrl}/auth/forgot-password`);
  });

  it('sets sent=true on success', fakeAsync(() => {
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    expect(component.loading()).toBe(true);
    httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`).flush({});
    tick();
    expect(component.sent()).toBe(true);
    expect(component.loading()).toBe(false);
  }));

  it('sets sent=true even on error (RGPD — ne révèle pas si email existant)', fakeAsync(() => {
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`).flush('', { status: 404, statusText: 'Not Found' });
    tick();
    expect(component.sent()).toBe(true);
  }));

  it('does not submit while loading', fakeAsync(() => {
    component.form.setValue({ email: 'user@example.com' });
    component.submit();
    component.submit();
    const reqs = httpMock.match(`${environment.apiUrl}/auth/forgot-password`);
    expect(reqs.length).toBe(1);
    reqs[0].flush({});
    tick();
  }));
});
