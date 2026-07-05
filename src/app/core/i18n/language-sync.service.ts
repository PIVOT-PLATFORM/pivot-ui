/**
 * LanguageSyncService — applies the DB-stored `preferredLanguage` to Transloco whenever the
 * authenticated user changes (login, Google, OIDC, device-OTP, or session restore on app
 * load — every one of them funnels through `AuthService.storeAuth()` and, in turn, the
 * `currentUser` signal watched here).
 *
 * AC (US02.1.2 — "Préférence de langue"): "Au login, la langue préférée est chargée et
 * appliquée dans Transloco" + "conflit source de vérité : à la connexion, la préférence BDD
 * écrase le localStorage si différente" — see `LanguagePreferenceService.applyFromServer`,
 * which this delegates to.
 *
 * Deliberately NOT wired directly into `AuthService` (e.g. by calling
 * `languagePreference.applyFromServer(...)` inside `storeAuth()`): `AuthService` is injected
 * by almost every guard, interceptor and auth-adjacent component/service in the app, and
 * most of their unit tests do not provide `TranslocoService`. Making `AuthService` depend on
 * i18n — even transitively — would break all of them. Instead this is its own
 * `providedIn: 'root'` service, constructed exactly once via `provideAppInitializer` in
 * `app.config.ts` (nothing else needs to inject it), so only the real app bootstrap pays for
 * the `TranslocoService` dependency.
 */
import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from '../auth/service/auth.service';
import { LanguagePreferenceService } from './language-preference.service';

@Injectable({ providedIn: 'root' })
export class LanguageSyncService {
  private readonly auth = inject(AuthService);
  private readonly languagePreference = inject(LanguagePreferenceService);

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.languagePreference.applyFromServer(user.preferredLanguage);
      }
    });
  }
}
