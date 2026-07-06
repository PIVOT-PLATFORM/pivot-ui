/**
 * AccountDeletionDialogComponent — US02.2.4, the 2-step irreversible-deletion dialog.
 *
 * Step 1 ("warning"): irreversibility alert + the list of what gets deleted
 * (AC: "alerte irréversibilité avec liste des données supprimées").
 * Step 2 ("confirm"): password or OTP input, branching on
 * `GET /account/deletion/confirmation-method` (PASSWORD for local accounts,
 * OTP for OIDC/Google-only accounts — mirrors the existing device-verify OTP
 * flow, `POST /account/deletion/otp` fires automatically on entering this step).
 *
 * Built on top of `ConfirmDialogComponent` rather than a bespoke modal: it
 * already provides everything the AC asks for (`role="alertdialog"`,
 * `aria-modal="true"`, `aria-labelledby`, focus trap, Escape-to-close with
 * focus restored to the trigger) — reusing it means this destructive dialog
 * doesn't need to re-implement or re-test that accessibility contract.
 * `confirmDisabled` and content projection (both added to ConfirmDialogComponent
 * for this US) are what let a single generic dialog host two very different
 * step bodies (a data list, then a form) while keeping one continuous
 * alertdialog session across both steps.
 *
 * The dialog never has a "back" step: cancelling from step 2 fully closes and
 * resets the flow, so re-entering always re-shows the irreversibility warning —
 * intentional, not an oversight (re-acknowledgement on every attempt).
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { AccountDeletionService } from './account-deletion.service';
import type { AccountDeletionConfirmationMethod, DeleteAccountRequest } from './account-deletion.model';

type DialogStep = 'warning' | 'confirm';

const OTP_PATTERN = /^\d{6}$/;

@Component({
  selector: 'piv-account-deletion-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, ConfirmDialogComponent],
  templateUrl: './account-deletion-dialog.component.html',
  styleUrl: './account-deletion-dialog.component.scss',
})
export class AccountDeletionDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly accountDeletion = inject(AccountDeletionService);

  @Input() open = false;

  /** Dialog closed without completing deletion (Escape, backdrop, or Cancel button). */
  @Output() readonly closed = new EventEmitter<void>();
  /** Deletion confirmed — payload is the `effectiveDeletionDate` (ISO-8601 Instant). */
  @Output() readonly deleted = new EventEmitter<string>();

  protected readonly step = signal<DialogStep>('warning');
  protected readonly confirmationMethod = signal<AccountDeletionConfirmationMethod | null>(null);
  protected readonly methodLoading = signal(false);
  protected readonly methodError = signal(false);

  protected readonly otpSending = signal(false);
  protected readonly otpSent = signal(false);
  protected readonly otpError = signal<string | null>(null);

  protected readonly deleteLoading = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    currentPassword: [''],
    otp: [''],
  });

  private readonly passwordValue = signal('');
  private readonly otpValue = signal('');

  protected readonly stepTwoMessageKey = computed(() =>
    this.confirmationMethod() === 'OTP' ? 'account.deletion.otp_intro' : 'account.deletion.password_intro'
  );

  /** Drives `[confirmDisabled]` on the wrapped dialog — see class doc for the two-step rationale. */
  protected readonly confirmDisabled = computed(() => {
    if (this.step() === 'warning') {
      return this.methodLoading() || this.methodError();
    }
    if (this.deleteLoading()) {
      return true;
    }
    if (this.confirmationMethod() === 'OTP') {
      return !this.otpSent() || !OTP_PATTERN.test(this.otpValue());
    }
    if (this.confirmationMethod() === 'PASSWORD') {
      return this.passwordValue().length === 0;
    }
    return true;
  });

  constructor() {
    this.form.controls.currentPassword.valueChanges.subscribe(v => this.passwordValue.set(v ?? ''));
    this.form.controls.otp.valueChanges.subscribe(v => this.otpValue.set(v ?? ''));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }
    this.resetState();
    this.loadConfirmationMethod();
  }

  protected loadConfirmationMethod(): void {
    this.methodLoading.set(true);
    this.methodError.set(false);
    this.accountDeletion.getConfirmationMethod().subscribe({
      next: res => {
        this.methodLoading.set(false);
        this.confirmationMethod.set(res.method);
      },
      error: () => {
        this.methodLoading.set(false);
        this.methodError.set(true);
      },
    });
  }

  protected onConfirmed(): void {
    if (this.step() === 'warning') {
      if (this.confirmDisabled()) {
        return;
      }
      this.step.set('confirm');
      if (this.confirmationMethod() === 'OTP') {
        this.sendOtp();
      }
      return;
    }
    this.submitDeletion();
  }

  protected onCancelled(): void {
    this.closed.emit();
  }

  protected sendOtp(): void {
    if (this.otpSending()) {
      return;
    }
    this.otpSending.set(true);
    this.otpSent.set(false);
    this.otpError.set(null);
    this.accountDeletion.requestOtp().subscribe({
      next: () => {
        this.otpSending.set(false);
        this.otpSent.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.otpSending.set(false);
        this.otpError.set(this.classifyOtpError(err));
      },
    });
  }

  private submitDeletion(): void {
    if (this.deleteLoading() || this.confirmDisabled()) {
      return;
    }
    const request: DeleteAccountRequest =
      this.confirmationMethod() === 'OTP' ? { otp: this.otpValue() } : { currentPassword: this.passwordValue() };

    this.deleteLoading.set(true);
    this.deleteError.set(null);
    this.accountDeletion.deleteAccount(request).subscribe({
      next: res => {
        this.deleteLoading.set(false);
        this.deleted.emit(res.effectiveDeletionDate);
      },
      error: (err: HttpErrorResponse) => {
        this.deleteLoading.set(false);
        this.deleteError.set(this.classifyDeleteError(err));
      },
    });
  }

  private classifyOtpError(err: HttpErrorResponse): string {
    if (err.status === 429) {
      return 'account.deletion.error_rate_limit';
    }
    if (err.status === 409) {
      return 'account.deletion.error_conflict';
    }
    return 'account.deletion.error_generic';
  }

  private classifyDeleteError(err: HttpErrorResponse): string {
    if (err.status === 403) {
      return this.confirmationMethod() === 'OTP' ? 'account.deletion.error_wrong_otp' : 'account.deletion.error_wrong_password';
    }
    if (err.status === 409) {
      return 'account.deletion.error_conflict';
    }
    // 401 is handled globally (tokenInterceptor → SessionExpiryService: toast + redirect).
    return 'account.deletion.error_generic';
  }

  private resetState(): void {
    this.step.set('warning');
    this.confirmationMethod.set(null);
    this.methodLoading.set(false);
    this.methodError.set(false);
    this.otpSending.set(false);
    this.otpSent.set(false);
    this.otpError.set(null);
    this.deleteLoading.set(false);
    this.deleteError.set(null);
    this.form.reset({ currentPassword: '', otp: '' });
  }
}
