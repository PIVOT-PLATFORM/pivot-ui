/**
 * ProfileComponent — "Voir et éditer son profil" (US02.1.1), route `/account/profile`.
 *
 * States: loading (initial GET), load error (message + retry, mirrors
 * `AdminModulesComponent`'s pattern), and the loaded form.
 *
 * Behaviour (see AC in `pivot-docs/.../us-voir-editer-profil.md`):
 * - Reactive form, firstName/lastName required + max 100 chars (mirrors the backend's
 *   INVALID_NAME rule — client-side validation avoids most round-trips, the 400 is still
 *   handled defensively since the backend also strips HTML, which could turn a
 *   whitespace-only-after-strip value into an empty one).
 * - Save button disabled while saving (spinner, prevents double submit) AND while the form
 *   is unchanged from the last loaded/saved values (`hasChanges()`).
 * - PATCH never sends an `email` field (see `profile.model.ts` — 400 EMAIL_CHANGE_NOT_ALLOWED).
 * - Avatar: client-side format/size pre-check (immediate inline `role="alert"` error, no
 *   network round-trip) + the same backend 400 codes handled defensively. No avatar →
 *   initials fallback (`profileInitials`).
 * - On invalid submit, focus moves to the first invalid field (firstName before lastName).
 * - Network/5xx error on PATCH → toast (AC), not inline: only the domain-specific
 *   `INVALID_NAME` case is shown inline next to the fields it concerns, everything else
 *   (network failure, unexpected 5xx) surfaces as a generic toast.
 * - Language preference (US02.1.2): a native `<select>` bound to the app-wide active Transloco
 *   language (not to `profile().preferredLanguage`) — see `activeLang` below for why. Switching
 *   it delegates entirely to `LanguagePreferenceService.saveAndApply()`, shared with the navbar
 *   language pill, which owns the PATCH + optimistic-switch + revert-on-failure + toast.
 */
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProfileService } from './profile.service';
import {
  AVATAR_ACCEPTED_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  type AvatarErrorKind,
  type ProfileDto,
  type ProfileSaveErrorKind,
  profileInitials,
} from './profile.model';
import { ToastService } from '../../../shared/toast/toast.service';
import { LanguagePreferenceService } from '../../../core/i18n/language-preference.service';
import { isSupportedLanguage } from '../../../core/i18n/language';

const MAX_NAME_LENGTH = 100;

@Component({
  selector: 'piv-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly transloco = inject(TranslocoService);
  private readonly languagePreference = inject(LanguagePreferenceService);

  @ViewChild('firstNameInput') private firstNameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('lastNameInput') private lastNameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('avatarInput') private avatarInput?: ElementRef<HTMLInputElement>;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
    lastName: ['', [Validators.required, Validators.maxLength(MAX_NAME_LENGTH)]],
  });

  /** Loaded profile — `null` until the initial GET resolves. */
  readonly profile = signal<ProfileDto | null>(null);
  /** Values the form was last populated with (loaded or successfully saved) — drives `hasChanges()`. */
  private readonly savedValues = signal<{ firstName: string; lastName: string } | null>(null);

  readonly loading = signal(true);
  /** True if the initial GET failed — drives the error state + retry button. */
  readonly loadError = signal(false);

  readonly saving = signal(false);
  /** Inline error shown above the submit button after a failed PATCH — `null` when none. */
  readonly saveError = signal<ProfileSaveErrorKind | null>(null);

  readonly avatarUploading = signal(false);
  /** Inline error shown under the avatar field — `null` when none. */
  readonly avatarError = signal<AvatarErrorKind | null>(null);

  /**
   * Drives the language `<select>`. Bound to the app-wide active Transloco language rather
   * than `profile().preferredLanguage`: `LanguagePreferenceService` is the single source of
   * truth for "what language is the UI in right now" (also used by the navbar pill), and it
   * reverts this same signal on a failed save — binding to it here means the select reverts
   * for free, with no local state to keep in sync.
   */
  readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.languagePreference.getActiveLanguage(),
  });
  /** True while a language PATCH is in flight — disables the select to prevent overlapping changes. */
  readonly languageSaving = this.languagePreference.saving;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.profileService.getProfile().subscribe({
      next: dto => {
        this.applyProfile(dto);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  /** Initials fallback for the avatar figure (AC: no avatar → initials). */
  initials(): string {
    const p = this.profile();
    if (!p) return '?';
    return profileInitials(p.firstName, p.lastName, p.email);
  }

  /** True once the form values differ from the last loaded/saved values — gates the submit button. */
  hasChanges(): boolean {
    const saved = this.savedValues();
    if (!saved) return false;
    const { firstName, lastName } = this.form.value;
    return (firstName ?? '').trim() !== saved.firstName || (lastName ?? '').trim() !== saved.lastName;
  }

  submit(): void {
    if (this.saving()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalidField();
      return;
    }
    if (!this.hasChanges()) return;

    this.saving.set(true);
    this.saveError.set(null);

    const firstName = (this.form.value.firstName ?? '').trim();
    const lastName = (this.form.value.lastName ?? '').trim();

    // Literal object — only ever these two keys, never `email` (see profile.model.ts).
    this.profileService.updateProfile({ firstName, lastName }).subscribe({
      next: dto => {
        this.saving.set(false);
        this.applyProfile(dto);
        this.toast.show('account.profile.success', 'info');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 400 && err.error?.error === 'INVALID_NAME') {
          this.saveError.set('invalid_name');
        } else {
          this.saveError.set(null);
          this.toast.show('account.profile.error_save_generic', 'error');
        }
      },
    });
  }

  /**
   * US02.1.2 — language `<select>` change handler. All the actual work (PATCH, optimistic
   * switch, revert + toast on failure) lives in `LanguagePreferenceService`, shared with the
   * navbar language pill.
   */
  onLanguageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!isSupportedLanguage(value)) return;
    this.languagePreference.saveAndApply(value);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file after an error
    if (!file) return;

    this.avatarError.set(null);

    const clientError = this.validateAvatarFile(file);
    if (clientError) {
      this.avatarError.set(clientError);
      return;
    }

    this.avatarUploading.set(true);
    this.profileService.uploadAvatar(file).subscribe({
      next: dto => {
        this.avatarUploading.set(false);
        this.applyProfile(dto);
      },
      error: (err: HttpErrorResponse) => {
        this.avatarUploading.set(false);
        this.avatarError.set(this.classifyAvatarError(err));
      },
    });
  }

  triggerAvatarSelect(): void {
    this.avatarInput?.nativeElement.click();
  }

  private validateAvatarFile(file: File): AvatarErrorKind | null {
    if (!(AVATAR_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      return 'invalid_format';
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      return 'too_large';
    }
    return null;
  }

  private classifyAvatarError(err: HttpErrorResponse): AvatarErrorKind {
    if (err.status === 400 && err.error?.error === 'AVATAR_INVALID_FORMAT') return 'invalid_format';
    if (err.status === 400 && err.error?.error === 'AVATAR_TOO_LARGE') return 'too_large';
    return 'generic';
  }

  private applyProfile(dto: ProfileDto): void {
    this.profile.set(dto);
    this.savedValues.set({ firstName: dto.firstName, lastName: dto.lastName });
    this.form.setValue({ firstName: dto.firstName, lastName: dto.lastName }, { emitEvent: false });
    this.form.markAsPristine();
  }

  private focusFirstInvalidField(): void {
    if (this.form.controls.firstName.invalid) {
      this.firstNameInput?.nativeElement.focus();
    } else if (this.form.controls.lastName.invalid) {
      this.lastNameInput?.nativeElement.focus();
    }
  }
}
