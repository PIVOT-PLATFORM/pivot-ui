import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, InjectionToken, isDevMode } from '@angular/core';

export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  factory: () => ((globalThis as unknown) as Record<string, unknown>)['__PIVOT_GOOGLE_CLIENT_ID'] as string ?? '',
});
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/auth/interceptor/token.interceptor';
import { AuthService } from './core/auth/service/auth.service';
import { TranslocoHttpLoader } from './core/i18n/transloco.loader';
import { LanguageSyncService } from './core/i18n/language-sync.service';
import { catchError, of } from 'rxjs';

function detectInitialLang(): string {
  // Préférence explicite de l'utilisateur d'abord, sinon FR par défaut (produit français-first).
  // On NE retombe PAS sur navigator.language : la langue par défaut doit être déterministe
  // (un navigateur en-US ne doit pas basculer l'UI en anglais sans choix de l'utilisateur).
  const stored = localStorage.getItem('pivot_lang');
  return stored === 'en' || stored === 'fr' ? stored : 'fr';
}

function initSession(auth: AuthService) {
  // Tente la restauration de session sur TOUTES les routes (y compris /auth/*) : un utilisateur
  // déjà authentifié qui ouvre /auth/login doit être redirigé vers /dashboard par guestGuard,
  // ce qui exige que le token soit restauré avant l'activation du routeur. Le 401 attendu pour
  // un visiteur non authentifié est absorbé par catchError (pas d'impact fonctionnel).
  return auth.initSession().pipe(catchError(() => of(null)));
}

/**
 * Force la construction de `LanguageSyncService` (US02.1.2) dès le bootstrap. Le service est
 * `providedIn: 'root'` mais n'est instancié que lors d'une première injection — sans cet
 * appel explicite, rien ne le construirait jamais et son `effect()` (qui applique
 * `preferredLanguage` à chaque login/restauration de session) ne s'enclencherait jamais.
 */
function initLanguageSync(): void {
  inject(LanguageSyncService);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['en', 'fr'],
        defaultLang: detectInitialLang(),
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(() => {
      initLanguageSync();
      return initSession(inject(AuthService));
    }),
  ]
};
