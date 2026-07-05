import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { vi } from 'vitest';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AccountSettingsComponent } from './account-settings.component';
import { AuthService } from '../../core/auth/service/auth.service';
import { AccountDeletionStateService } from './deletion/account-deletion-state.service';
import { installMemoryLocalStorage } from './deletion/testing/memory-local-storage';
import { environment } from '../../../environments/environment';

@Component({ template: '', standalone: true })
class StubComponent {}

describe('AccountSettingsComponent', () => {
  let fixture: ComponentFixture<AccountSettingsComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  let auth: AuthService;
  let deletionState: AccountDeletionStateService;

  beforeEach(async () => {
    installMemoryLocalStorage();
    await TestBed.configureTestingModule({
      imports: [AccountSettingsComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'auth/login', component: StubComponent }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSettingsComponent);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    deletionState = TestBed.inject(AccountDeletionStateService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('does not render the dialog until the trigger is clicked', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });

  it('opens the dialog when the danger-zone trigger is clicked', () => {
    fixture.nativeElement.querySelector('[data-testid="account-settings-delete-trigger"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).not.toBeNull();
    httpMock.expectOne(`${environment.apiUrl}/account/deletion/confirmation-method`).flush({ method: 'PASSWORD' });
  });

  it('closes the dialog when it is cancelled', () => {
    fixture.nativeElement.querySelector('[data-testid="account-settings-delete-trigger"]').click();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/deletion/confirmation-method`).flush({ method: 'PASSWORD' });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });

  it('on successful deletion: records the grace-period banner state, clears the local session, and navigates to login', () => {
    auth.updateToken('some-opaque-token', Date.now() + 3_600_000);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('[data-testid="account-settings-delete-trigger"]').click();
    fixture.detectChanges();
    httpMock.expectOne(`${environment.apiUrl}/account/deletion/confirmation-method`).flush({ method: 'PASSWORD' });
    fixture.detectChanges();

    // Step 1 (irreversibility warning) → step 2 (password/OTP form).
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    const passwordInput = fixture.nativeElement.querySelector('#account-deletion-password');
    passwordInput.value = 'correct-horse-battery-staple';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    httpMock
      .expectOne(`${environment.apiUrl}/account`)
      .flush({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });
    fixture.detectChanges();

    expect(deletionState.pending()).toEqual({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });
    expect(auth.accessToken()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });
});
