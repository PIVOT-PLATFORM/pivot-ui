import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
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
  return () => auth.initSession().pipe(catchError(() => of(null)));
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
