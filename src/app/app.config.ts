import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, InjectionToken } from '@angular/core';

export const GOOGLE_CLIENT_ID = new InjectionToken<string>('GOOGLE_CLIENT_ID', {
  factory: () => ((window as unknown) as Record<string, unknown>)['__PIVOT_GOOGLE_CLIENT_ID'] as string ?? '',
});
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
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
  return () => {
    // Sur les pages /auth/*, aucune session n'existe — évite un POST /refresh → 401 inutile en console.
    if (window.location.pathname.startsWith('/auth')) {
      return of(null);
    }
    return auth.initSession().pipe(catchError(() => of(null)));
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([tokenInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['en', 'fr'],
        defaultLang: detectInitialLang(),
        reRenderOnLangChange: true,
        prodMode: false,
      },
      loader: TranslocoHttpLoader,
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initSession,
      deps: [AuthService],
      multi: true,
    },
  ]
};
