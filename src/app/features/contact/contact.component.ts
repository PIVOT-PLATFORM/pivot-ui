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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { ContactApiService } from './contact-api.service';

interface ContactForm {
  email: string;
  message: string;
}

@Component({
  selector: 'piv-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="contact" aria-label="Page de contact">

      <!-- ─── Header ──────────────────────────────────────────────────────── -->
      <header class="contact__header">
        <h1 class="contact__title">Nous contacter</h1>
        <p class="contact__subtitle">
          Une question&nbsp;? Un problème&nbsp;? L'équipe PIVOT vous répond.
        </p>
      </header>

      <!-- ─── Contact form ─────────────────────────────────────────────────── -->
      <section class="contact__form-section" aria-labelledby="form-heading">
        <h2 id="form-heading" class="contact__form-title">Envoyer un message</h2>

        @if (submitted()) {
          <div class="contact__success" role="status" aria-live="polite" data-testid="contact-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="contact__success-icon" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>Message envoyé ! Un email de confirmation vous a été adressé.</p>
          </div>
        }

        @if (!submitted()) {
          @if (submitError()) {
            <div class="contact__error" role="alert" aria-live="assertive">
              <p>{{ submitError() }}</p>
            </div>
          }
          <form
            class="contact__form"
            (ngSubmit)="onSubmit()"
            novalidate
            aria-label="Formulaire de contact"
          >
            <!-- Email -->
            <div class="form-field">
              <label class="form-field__label" for="contact-email">
                Email <span class="form-field__required" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                class="form-field__input"
                [(ngModel)]="form.email"
                name="email"
                autocomplete="email"
                aria-required="true"
                [attr.aria-describedby]="emailError() ? 'contact-email-error' : null"
                [class.form-field__input--error]="emailError()"
                placeholder="jean.dupont@example.com"
                data-testid="contact-email-input"
              />
              @if (emailError()) {
                <p id="contact-email-error" class="form-field__error" role="alert">
                  {{ emailError() }}
                </p>
              }
            </div>

            <!-- Message -->
            <div class="form-field">
              <label class="form-field__label" for="contact-message">
                Message <span class="form-field__required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="contact-message"
                class="form-field__input form-field__input--textarea"
                [(ngModel)]="form.message"
                name="message"
                aria-required="true"
                [attr.aria-describedby]="messageError() ? 'contact-message-error' : null"
                [class.form-field__input--error]="messageError()"
                placeholder="Décrivez votre demande…"
                rows="5"
              ></textarea>
              @if (messageError()) {
                <p id="contact-message-error" class="form-field__error" role="alert">
                  Le message est requis.
                </p>
              }
            </div>

            <button type="submit" class="contact__submit" [disabled]="loading()">
              {{ loading() ? 'Envoi en cours…' : 'Envoyer le message' }}
            </button>
          </form>
        }
      </section>

    </main>
  `,
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly api = inject(ContactApiService);
  private readonly transloco = inject(TranslocoService);

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

  private readonly EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@.]+$/;

  onSubmit(): void {
    this.emailError.set('');
    this.messageError.set('');
    this.submitError.set('');

    let valid = true;

    if (!this.form.email.trim()) {
      this.emailError.set("L'email est requis.");
      valid = false;
    } else if (!this.EMAIL_RE.test(this.form.email)) {
      this.emailError.set('Adresse email invalide.');
      valid = false;
    }

    if (!this.form.message.trim()) {
      this.messageError.set('Le message est requis.');
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
          this.submitError.set(
            "Une erreur s'est produite. Veuillez réessayer ou nous écrire directement à contact@pivot.app.",
          );
          this.loading.set(false);
        },
      });
  }
}
