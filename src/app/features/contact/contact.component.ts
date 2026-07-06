/**
 * ContactComponent — authenticated contact page.
 *
 * Wired to POST /api/contact — sends email+message with active language
 * so the backend can send i18n confirmation emails.
 *
 * Accessibility: landmark <main>, <section> per area, form labels associated
 * via htmlFor/id, error messages linked via aria-describedby, required fields
 * marked with aria-required.
 */
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ContactApiService } from './contact-api.service';

interface ContactForm {
  email: string;
  message: string;
}

@Component({
  selector: 'piv-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe],
  template: `
    <div class="contact-page">
      <main class="contact-layout" [attr.aria-label]="'contact.main_aria' | transloco">

      <!-- ─── Back ────────────────────────────────────────────────────────── -->
      <button class="contact__back" type="button" (click)="goBack()">← {{ 'common.back' | transloco }}</button>

      <!-- ─── Header ──────────────────────────────────────────────────────── -->
      <header class="contact__header">
        <h1 class="contact__title">{{ 'contact.title' | transloco }}</h1>
        <p class="contact__subtitle">{{ 'contact.subtitle' | transloco }}</p>
      </header>

      <!-- ─── Contact form ─────────────────────────────────────────────────── -->
      <section class="contact__form-section" aria-labelledby="form-heading">
        <h2 id="form-heading" class="contact__form-title">{{ 'contact.form.title' | transloco }}</h2>

        @if (submitted()) {
          <div class="contact__success" role="status" aria-live="polite" data-testid="contact-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="contact__success-icon" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>{{ 'contact.success' | transloco }}</p>
          </div>
        }

        @if (!submitted()) {
          @if (submitError()) {
            <div class="contact__error" role="alert" aria-live="assertive">
              <p>{{ submitError() | transloco }}</p>
            </div>
          }
          <form
            class="contact__form"
            (ngSubmit)="onSubmit()"
            novalidate
            [attr.aria-label]="'contact.form_aria' | transloco"
          >
            <!-- Email -->
            <div class="form-field">
              <label class="form-field__label" for="contact-email">
                {{ 'contact.form.email' | transloco }}
                <span class="form-field__required" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                class="form-field__input"
                [(ngModel)]="form.email"
                name="email"
                autocomplete="email"
                aria-required="true"
                [attr.aria-invalid]="emailError() ? 'true' : null"
                [attr.aria-describedby]="emailError() ? 'contact-email-error' : null"
                [class.form-field__input--error]="emailError()"
                [placeholder]="'contact.form.email_placeholder' | transloco"
                data-testid="contact-email-input"
              />
              @if (emailError()) {
                <p id="contact-email-error" class="form-field__error" role="alert">
                  {{ emailError() | transloco }}
                </p>
              }
            </div>

            <!-- Message -->
            <div class="form-field">
              <label class="form-field__label" for="contact-message">
                {{ 'contact.form.message' | transloco }}
                <span class="form-field__required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                class="form-field__input form-field__input--textarea"
                [(ngModel)]="form.message"
                name="message"
                aria-required="true"
                [attr.aria-invalid]="messageError() ? 'true' : null"
                [attr.aria-describedby]="messageError() ? 'contact-message-error' : null"
                [class.form-field__input--error]="messageError()"
                [placeholder]="'contact.form.message_placeholder' | transloco"
                rows="5"
              ></textarea>
              @if (messageError()) {
                <p id="contact-message-error" class="form-field__error" role="alert">
                  {{ messageError() | transloco }}
                </p>
              }
            </div>

            <button type="submit" class="contact__submit" [disabled]="loading()">
              {{ loading() ? ('contact.form.submit_loading' | transloco) : ('contact.form.submit' | transloco) }}
            </button>
          </form>
        }
      </section>

      </main>
    </div>
  `,
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly api = inject(ContactApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly location = inject(Location);

  goBack(): void { this.location.back(); }

  /** Form model — two-way bound via ngModel. */
  form: ContactForm = { email: '', message: '' };

  /** True after a successful submission. */
  readonly submitted = signal(false);

  /** True while the HTTP request is in flight. */
  readonly loading = signal(false);

  /** Validation error signals. */
  readonly emailError = signal('');
  readonly messageError = signal('');

  /** Non-empty if the API call fails. */
  readonly submitError = signal('');

  private readonly EMAIL_RE = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

  onSubmit(): void {
    this.emailError.set('');
    this.messageError.set('');
    this.submitError.set('');

    let valid = true;

    if (!this.form.email.trim()) {
      this.emailError.set('contact.form.email_required');
      valid = false;
    } else if (!this.EMAIL_RE.test(this.form.email)) {
      this.emailError.set('contact.form.email_invalid');
      valid = false;
    }

    if (!this.form.message.trim()) {
      this.messageError.set('contact.form.message_required');
      valid = false;
    }

    if (!valid) {
      return;
    }

    this.loading.set(true);
    this.api
      .submit({
        email: this.form.email,
        message: this.form.message,
        lang: this.transloco.getActiveLang(),
      })
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.form = { email: '', message: '' };
          this.loading.set(false);
        },
        error: () => {
          this.submitError.set('contact.error');
          this.loading.set(false);
        },
      });
  }
}
