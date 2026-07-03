import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { sanitizeReturnUrl } from '../util/return-url';

/** Nom du canal inter-onglets pour la propagation du logout (US01.1.5). */
export const SESSION_CHANNEL_NAME = 'pivot-session';

/** Message diffusé sur le BroadcastChannel quand un onglet détecte l'expiration. */
interface SessionExpiredMessage {
  type: 'session-expired';
  rememberMe: boolean;
}

/**
 * Gestion de l'expiration de session côté front (US01.1.5).
 *
 * Modèle opaque tokens PIVOT : il n'existe **pas de refresh token** — le 401
 * backend est le **seul** signal d'expiration. Aucun silent refresh (ni iframe,
 * ni retry `/auth/refresh`) n'est tenté : sur 401 hors endpoints `/auth/`, le
 * TokenInterceptor délègue ici et la session locale est purgée immédiatement.
 *
 * Comportement :
 * 1. purge du token en mémoire (aucun stockage navigateur à nettoyer — le token
 *    ne vit qu'en mémoire JavaScript, conformément aux règles PIVOT) ;
 * 2. toast « Session expirée » — variante « session longue » si remember-me actif ;
 * 3. propagation du logout à tous les onglets via BroadcastChannel ;
 * 4. redirection `/auth/login` avec `returnUrl` (URL relative interne validée —
 *    protection open redirect via {@link sanitizeReturnUrl}).
 */
@Injectable({ providedIn: 'root' })
export class SessionExpiryService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** `null` si l'environnement ne supporte pas BroadcastChannel (dégradation douce). */
  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(SESSION_CHANNEL_NAME);

  constructor() {
    // Onglets secondaires : logout local sans re-broadcast (pas de boucle —
    // BroadcastChannel ne délivre jamais un message à l'onglet émetteur).
    this.channel?.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as SessionExpiredMessage | null;
      if (data?.type === 'session-expired') {
        this.expireLocalSession(data.rememberMe);
      }
    });
  }

  /**
   * Point d'entrée appelé par le TokenInterceptor sur 401 hors `/auth/`.
   *
   * No-op si aucune session locale n'est active (ex. 401 sur une ressource
   * publique pour un visiteur anonyme, ou expirations 401 multiples en rafale
   * — la première purge la session, les suivantes sont ignorées).
   */
  onSessionExpired(): void {
    if (!this.hasLocalSession()) {
      return;
    }
    const rememberMe = this.auth.rememberMe();
    this.channel?.postMessage({ type: 'session-expired', rememberMe } satisfies SessionExpiredMessage);
    this.expireLocalSession(rememberMe);
  }

  /** Session locale active = token ou utilisateur encore en mémoire. */
  private hasLocalSession(): boolean {
    return this.auth.accessToken() !== null || this.auth.currentUser() !== null;
  }

  /**
   * Purge la session locale, affiche le toast et redirige vers /auth/login.
   * `returnUrl` = URL courante si elle est relative interne et pertinente.
   */
  private expireLocalSession(rememberMe: boolean): void {
    if (!this.hasLocalSession()) {
      return;
    }
    const returnUrl = sanitizeReturnUrl(this.router.url);
    this.auth.clearSession();
    this.toast.show(
      rememberMe ? 'auth.session.expired_remember_me' : 'auth.session.expired',
      'warning',
    );
    void this.router.navigate(
      ['/auth/login'],
      returnUrl ? { queryParams: { returnUrl } } : undefined,
    );
  }

  ngOnDestroy(): void {
    this.channel?.close();
  }
}
