import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AccountDeletionDialogComponent } from './account-deletion-dialog.component';
import { environment } from '../../../../environments/environment';

const CONFIRMATION_METHOD_URL = `${environment.apiUrl}/account/deletion/confirmation-method`;
const OTP_URL = `${environment.apiUrl}/account/deletion/otp`;
const DELETE_URL = `${environment.apiUrl}/account`;

describe('AccountDeletionDialogComponent', () => {
  let fixture: ComponentFixture<AccountDeletionDialogComponent>;
  let component: AccountDeletionDialogComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountDeletionDialogComponent, TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} } })],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDeletionDialogComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function open(): void {
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  }

  function flushMethod(method: 'PASSWORD' | 'OTP'): void {
    httpMock.expectOne(CONFIRMATION_METHOD_URL).flush({ method });
  }

  it('renders nothing when closed', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]')).toBeNull();
  });

  it('fetches the confirmation method as soon as it opens', () => {
    open();
    httpMock.expectOne(CONFIRMATION_METHOD_URL).flush({ method: 'PASSWORD' });
  });

  it('renders the alertdialog with the irreversibility data list on step 1', () => {
    open();
    flushMethod('PASSWORD');
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    const list = fixture.nativeElement.querySelector('[data-testid="account-deletion-data-list"]');
    expect(list.querySelectorAll('li').length).toBe(4);
  });

  it('disables the continue button while the confirmation method is loading', () => {
    open();
    fixture.detectChanges();
    const confirmBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]');
    expect(confirmBtn.disabled).toBe(true);
    httpMock.expectOne(CONFIRMATION_METHOD_URL).flush({ method: 'PASSWORD' });
  });

  it('shows a retry action if loading the confirmation method fails, and keeps continue disabled', () => {
    open();
    httpMock.expectOne(CONFIRMATION_METHOD_URL).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-method-error"]')).not.toBeNull();
    const confirmBtn = fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]');
    expect(confirmBtn.disabled).toBe(true);

    fixture.nativeElement.querySelector('[data-testid="account-deletion-method-retry"]').click();
    httpMock.expectOne(CONFIRMATION_METHOD_URL).flush({ method: 'PASSWORD' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').disabled).toBe(false);
  });

  it('emits closed when the dialog is cancelled on step 1', () => {
    open();
    flushMethod('PASSWORD');
    fixture.detectChanges();

    let closed = false;
    component.closed.subscribe(() => (closed = true));
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-cancel"]').click();
    expect(closed).toBe(true);
  });

  describe('PASSWORD confirmation method', () => {
    beforeEach(() => {
      open();
      flushMethod('PASSWORD');
      fixture.detectChanges();
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      fixture.detectChanges();
    });

    it('advances to the password step with the confirm button disabled until a password is typed', () => {
      expect(fixture.nativeElement.querySelector('#account-deletion-password')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').disabled).toBe(true);
    });

    it('enables confirm once a password is entered, and calls DELETE /account with it', () => {
      const input = fixture.nativeElement.querySelector('#account-deletion-password');
      input.value = 'correct-horse-battery-staple';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').disabled).toBe(false);

      let deletedAt: string | undefined;
      component.deleted.subscribe(v => (deletedAt = v));
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();

      const req = httpMock.expectOne(DELETE_URL);
      expect(req.request.body).toEqual({ currentPassword: 'correct-horse-battery-staple' });
      req.flush({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });

      expect(deletedAt).toBe('2026-08-04T00:00:00Z');
    });

    it('shows a wrong-password error on 403 without emitting deleted', () => {
      const input = fixture.nativeElement.querySelector('#account-deletion-password');
      input.value = 'wrong';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      let deleted = false;
      component.deleted.subscribe(() => (deleted = true));
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      httpMock.expectOne(DELETE_URL).flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(deleted).toBe(false);
      expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-delete-error"]')).not.toBeNull();
    });

    it('shows a conflict error on 409 (deletion already in progress)', () => {
      const input = fixture.nativeElement.querySelector('#account-deletion-password');
      input.value = 'whatever';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      httpMock.expectOne(DELETE_URL).flush('Conflict', { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-delete-error"]')).not.toBeNull();
    });
  });

  describe('OTP confirmation method', () => {
    beforeEach(() => {
      open();
      flushMethod('OTP');
      fixture.detectChanges();
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      fixture.detectChanges();
    });

    it('automatically requests the OTP email when entering step 2', () => {
      const req = httpMock.expectOne(OTP_URL);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 202, statusText: 'Accepted' });
    });

    it('keeps confirm disabled until a valid 6-digit code is entered after the OTP is sent', () => {
      httpMock.expectOne(OTP_URL).flush(null, { status: 202, statusText: 'Accepted' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').disabled).toBe(true);

      const input = fixture.nativeElement.querySelector('#account-deletion-otp');
      input.value = '123';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').disabled).toBe(true);

      input.value = '123456';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').disabled).toBe(false);
    });

    it('submits DELETE /account with the otp and emits deleted on success', () => {
      httpMock.expectOne(OTP_URL).flush(null, { status: 202, statusText: 'Accepted' });
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('#account-deletion-otp');
      input.value = '654321';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      let deletedAt: string | undefined;
      component.deleted.subscribe(v => (deletedAt = v));
      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();

      const req = httpMock.expectOne(DELETE_URL);
      expect(req.request.body).toEqual({ otp: '654321' });
      req.flush({ effectiveDeletionDate: '2026-08-04T00:00:00Z' });

      expect(deletedAt).toBe('2026-08-04T00:00:00Z');
    });

    it('shows a rate-limit error on 429 when requesting the OTP, and allows resending', () => {
      httpMock.expectOne(OTP_URL).flush('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-otp-error"]')).not.toBeNull();

      fixture.nativeElement.querySelector('[data-testid="account-deletion-otp-resend"]').click();
      httpMock.expectOne(OTP_URL).flush(null, { status: 202, statusText: 'Accepted' });
    });

    it('shows a wrong-otp error on 403 from DELETE /account', () => {
      httpMock.expectOne(OTP_URL).flush(null, { status: 202, statusText: 'Accepted' });
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('#account-deletion-otp');
      input.value = '000000';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
      httpMock.expectOne(DELETE_URL).flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-delete-error"]')).not.toBeNull();
    });
  });

  it('resets to step 1 with a clean form when reopened after being closed', () => {
    open();
    flushMethod('PASSWORD');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="confirm-dialog-confirm"]').click();
    fixture.detectChanges();

    const passwordInput = fixture.nativeElement.querySelector('#account-deletion-password');
    passwordInput.value = 'leftover-password';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="account-deletion-data-list"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#account-deletion-password')).toBeNull();

    httpMock.expectOne(CONFIRMATION_METHOD_URL).flush({ method: 'PASSWORD' });
  });
});
