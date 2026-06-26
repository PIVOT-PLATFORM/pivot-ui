import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject, InjectionToken } from '@angular/core';

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
import { catchError, of } from 'rxjs';

function detectInitialLang(): string {
  const stored = localStorage.getItem('pivot_lang');
  if (stored === 'en' || stored === 'fr') return stored;
  return navigator.language.startsWith('fr') ? 'fr' : 'en';
}

function initSession(auth: AuthService) {
  // Tente la restauration de session sur TOUTES les routes (y compris /auth/*) : un utilisateur
  // déjà authentifié qui ouvre /auth/login doit être redirigé vers /dashboard par guestGuard,
  // ce qui exige que le token soit restauré avant l'activation du routeur. Le 401 attendu pour
  // un visiteur non authentifié est absorbé par catchError (pas d'impact fonctionnel).
  return auth.initSession().pipe(catchError(() => of(null)));
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
        prodMode: false,
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(() => initSession(inject(AuthService))),
  ]
};
