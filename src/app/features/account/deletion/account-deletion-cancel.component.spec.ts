import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AccountDeletionCancelComponent } from './account-deletion-cancel.component';
import { AccountDeletionStateService } from './account-deletion-state.service';
import { installMemoryLocalStorage } from './testing/memory-local-storage';
import { environment } from '../../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

const CANCEL_URL = `${environment.apiUrl}/account/deletion/cancel`;

function setup(token: string | null): {
  fixture: ComponentFixture<AccountDeletionCancelComponent>;
  httpMock: HttpTestingController;
} {
  installMemoryLocalStorage();
  TestBed.configureTestingModule({
    imports: [AccountDeletionCancelComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: StubComponent }]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: { get: (key: string) => (key === 'token' ? token : null) } } },
      },
    ],
  });
  const fixture = TestBed.createComponent(AccountDeletionCancelComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, httpMock };
}

describe('AccountDeletionCancelComponent', () => {
  afterEach(() => window.localStorage.clear());

  it('shows a missing-token message and does not call the API when the link has no token', () => {
    const { fixture } = setup(null);
    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-login-link"]')).not.toBeNull();
  });

  it('does NOT call POST /account/deletion/cancel automatically on load when a token is present', () => {
    const { fixture, httpMock } = setup('valid-token');
    // Give any stray microtask/subscription a chance to fire, then assert nothing was sent.
    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]')).not.toBeNull();
    httpMock.verify();
  });

  it('calls the cancel endpoint only after the explicit button click, and shows success', () => {
    const { fixture, httpMock } = setup('valid-token');

    fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]').click();
    fixture.detectChanges();

    const req = httpMock.expectOne(CANCEL_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'valid-token' });
    req.flush({ message: 'ok' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-success"]')).not.toBeNull();
  });

  it('clears the local pending-deletion banner state on successful cancellation', () => {
    const { fixture, httpMock } = setup('valid-token');
    const state = TestBed.inject(AccountDeletionStateService);
    state.record(new Date(Date.now() + 86_400_000).toISOString());
    expect(state.pending()).not.toBeNull();

    fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]').click();
    httpMock.expectOne(CANCEL_URL).flush({ message: 'ok' });

    expect(state.pending()).toBeNull();
  });

  it('shows an expired-grace-period message on a 410 response', () => {
    const { fixture, httpMock } = setup('too-late-token');

    fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]').click();
    httpMock.expectOne(CANCEL_URL).flush('Gone', { status: 410, statusText: 'Gone' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-error"]')).not.toBeNull();
  });

  it('shows an invalid-token message on a 400 response', () => {
    const { fixture, httpMock } = setup('bad-token');

    fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]').click();
    httpMock.expectOne(CANCEL_URL).flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-error"]')).not.toBeNull();
  });

  it('disables the button and ignores a second click while the request is in flight', () => {
    const { fixture, httpMock } = setup('valid-token');

    const button = fixture.nativeElement.querySelector('[data-testid="account-deletion-cancel-confirm"]');
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    button.click();

    httpMock.expectOne(CANCEL_URL).flush({ message: 'ok' });
  });
});
