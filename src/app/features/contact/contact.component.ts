/**
 * ContactComponent — public contact page.
 *
 * Accessible from any route without authentication (no authGuard).
 * Provides contact cards (email, GitHub, documentation, community) and
 * a simple contact form (UX only for MVP — not wired to a backend endpoint).
 *
 * Accessibility: landmark <main>, <section> per area, form labels associated
 * via htmlFor/id, error messages linked via aria-describedby, required fields
 * marked with aria-required.
 */
import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ContactForm {
  name: string;
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

      <!-- ─── Contact cards ───────────────────────────────────────────────── -->
      <section class="contact__cards" aria-label="Canaux de contact">
        <!-- Email -->
        <a
          href="mailto:contact@pivot.app"
          class="contact-card"
          aria-label="Envoyer un email à l'équipe PIVOT"
          data-testid="contact-email"
        >
          <div class="contact-card__icon contact-card__icon--email" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div class="contact-card__body">
            <p class="contact-card__label">Email</p>
            <p class="contact-card__value">contact&#64;pivot.app</p>
          </div>
          <span class="contact-card__arrow" aria-hidden="true">→</span>
        </a>

        <!-- GitHub Issues -->
        <a
          href="https://github.com/PIVOT-PLATFORM"
          target="_blank"
          rel="noopener noreferrer"
          class="contact-card"
          aria-label="Ouvrir une issue GitHub (nouvelle fenêtre)"
        >
          <div class="contact-card__icon contact-card__icon--github" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </div>
          <div class="contact-card__body">
            <p class="contact-card__label">GitHub Issues</p>
            <p class="contact-card__value">github.com/PIVOT-PLATFORM</p>
          </div>
          <span class="contact-card__arrow" aria-hidden="true">↗</span>
        </a>

        <!-- Documentation -->
        <a
          href="https://docs.pivot.app"
          target="_blank"
          rel="noopener noreferrer"
          class="contact-card"
          aria-label="Consulter la documentation (nouvelle fenêtre)"
        >
          <div class="contact-card__icon contact-card__icon--docs" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="contact-card__body">
            <p class="contact-card__label">Documentation</p>
            <p class="contact-card__value">docs.pivot.app</p>
          </div>
          <span class="contact-card__arrow" aria-hidden="true">↗</span>
        </a>

        <!-- Community -->
        <a
          href="https://discord.gg/pivot"
          target="_blank"
          rel="noopener noreferrer"
          class="contact-card"
          aria-label="Rejoindre la communauté Discord (nouvelle fenêtre)"
        >
          <div class="contact-card__icon contact-card__icon--community" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="contact-card__body">
            <p class="contact-card__label">Rejoindre la communauté</p>
            <p class="contact-card__value">Discord / Slack — bientôt disponible</p>
          </div>
          <span class="contact-card__arrow" aria-hidden="true">↗</span>
        </a>
      </section>

      <!-- ─── Contact form ─────────────────────────────────────────────────── -->
      <section class="contact__form-section" aria-labelledby="form-heading">
        <h2 id="form-heading" class="contact__form-title">Envoyer un message</h2>
        <p class="contact__form-note">
          Ce formulaire est en cours de développement. En attendant, utilisez les canaux ci-dessus.
        </p>

        @if (submitted()) {
          <div class="contact__success" role="status" aria-live="polite">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="contact__success-icon" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>Message reçu ! Nous vous répondrons dans les plus brefs délais.</p>
          </div>
        }

        @if (!submitted()) {
          <form
            class="contact__form"
            (ngSubmit)="onSubmit()"
            novalidate
            aria-label="Formulaire de contact"
          >
            <!-- Name -->
            <div class="form-field">
              <label class="form-field__label" for="contact-name">
                Nom <span class="form-field__required" aria-hidden="true">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                class="form-field__input"
                [(ngModel)]="form.name"
                name="name"
                autocomplete="name"
                aria-required="true"
                [attr.aria-describedby]="nameError() ? 'contact-name-error' : null"
                [class.form-field__input--error]="nameError()"
                placeholder="Jean Dupont"
              />
              @if (nameError()) {
                <p id="contact-name-error" class="form-field__error" role="alert">
                  Le nom est requis.
                </p>
              }
            </div>

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

            <button type="submit" class="contact__submit">
              Envoyer le message
            </button>
          </form>
        }
      </section>

    </main>
  `,
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  /** Form model — two-way bound via ngModel. */
  form: ContactForm = { name: '', email: '', message: '' };

  /** True after a successful (client-side) submission. */
  readonly submitted = signal(false);

  /** Validation error signals — computed on demand, not reactive to every keystroke. */
  readonly nameError = signal('');
  readonly emailError = signal('');
  readonly messageError = signal('');

  /** Simple email regex for client-side validation. */
  private readonly EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Validates the form and sets error signals.
   * MVP: no backend call — shows success state on valid submission.
   */
  onSubmit(): void {
    // Reset errors
    this.nameError.set('');
    this.emailError.set('');
    this.messageError.set('');

    let valid = true;

    if (!this.form.name.trim()) {
      this.nameError.set('Le nom est requis.');
      valid = false;
    }

    if (!this.form.email.trim()) {
      this.emailError.set('L\'email est requis.');
      valid = false;
    } else if (!this.EMAIL_RE.test(this.form.email)) {
      this.emailError.set('Adresse email invalide.');
      valid = false;
    }

    if (!this.form.message.trim()) {
      this.messageError.set('Le message est requis.');
      valid = false;
    }

    if (valid) {
      // MVP: no backend — simulate success
      this.submitted.set(true);
      this.form = { name: '', email: '', message: '' };
    }
  }
}
