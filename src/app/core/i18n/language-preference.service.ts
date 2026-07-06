/**
 * LanguagePreferenceService — single owner of "switch the UI language" for authenticated
 * users (US02.1.2 — "Préférence de langue").
 *
 * Centralised (rather than duplicated in `NavbarComponent` and `ProfileComponent`) so the
 * optimistic-switch / revert-on-failure / toast behaviour is implemented and tested exactly
 * once. Lives in `core/i18n` — not `features/account/profile` — precisely so `NavbarComponent`
 * (a `core/layout` component, part of the authenticated shell) can depend on it without a
 * core → features dependency, which this codebase's layering forbids.
 *
 * PATCH /account/profile is called here directly (not via `ProfileService`) for the same
 * reason: `ProfileService` lives in `features/account/profile` and is out of reach for
 * `core/` consumers. `ProfileDto`/`ProfileService` remain the source of truth for the rest of
 * the profile form (name, avatar) — this service only ever sends `{ preferredLanguage }`.
 */
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast/toast.service';
import { isSupportedLanguage, type SupportedLanguage } from './language';

/** `localStorage` key holding the last-applied UI language (shared with the pre-login language pill). */
const STORAGE_KEY = 'pivot_lang';

@Injectable({ providedIn: 'root' })
export class LanguagePreferenceService {
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _saving = signal(false);
  /** `true` while a language PATCH is in flight — callers use this to disable their selector. */
  readonly saving = this._saving.asReadonly();

  /** Current active Transloco language, narrowed to {@link SupportedLanguage} (defaults to `fr` on an unexpected value). */
  getActiveLanguage(): SupportedLanguage {
    const active = this.transloco.getActiveLang();
    return isSupportedLanguage(active) ? active : 'fr';
  }

  /**
   * Switches Transloco's active language and persists it to `localStorage` — local-only,
   * no network call. Used for the pre-login language pill (`AuthShellComponent`) and as the
   * building block of {@link saveAndApply} / {@link applyFromServer}.
   */
  apply(lang: SupportedLanguage): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  /**
   * Applies the server's source-of-truth language — called once per login/session-restore
   * (see `LanguageSyncService`). Unconditionally overwrites `localStorage`/Transloco with the
   * DB value: AC "conflit source de vérité" — la préférence BDD écrase le localStorage si
   * différente. A value outside `fr`/`en` is ignored defensively (the backend contract
   * guarantees `fr`/`en`, but nothing at the type level enforces it across an HTTP boundary).
   */
  applyFromServer(preferredLanguage: string | null | undefined): void {
    if (!isSupportedLanguage(preferredLanguage)) return;
    this.apply(preferredLanguage);
  }

  /**
   * Switches the UI language AND persists the preference server-side — used by the
   * authenticated language selectors (navbar pill, profile page `<select>`).
   *
   * Optimistic: the UI switches instantly (AC "l'interface bascule instantanément"), the
   * PATCH is fired in the background. On success, a confirmation toast is shown — since the
   * language has already switched, {@link ToastComponent} renders it in the new language
   * (AC "toast de confirmation affiché dans la nouvelle langue"). On failure (any HTTP error,
   * including a network error), the previous language is restored and an error toast shown
   * (AC "si sauvegarde échoue ... langue revient à l'état précédent + toast error").
   *
   * A no-op if `lang` is already the active language, or a save is already in flight.
   */
  saveAndApply(lang: SupportedLanguage): void {
    const previous = this.getActiveLanguage();
    if (lang === previous || this._saving()) return;

    this.apply(lang);
    this._saving.set(true);

    this.http.patch<{ preferredLanguage: SupportedLanguage }>(`${this.apiUrl}/account/profile`, {
      preferredLanguage: lang,
    }).subscribe({
      next: () => {
        this._saving.set(false);
        this.toast.show('account.preferences.success', 'info');
      },
      error: () => {
        this._saving.set(false);
        this.apply(previous);
        this.toast.show('account.preferences.error_save_generic', 'error');
      },
    });
  }
}
