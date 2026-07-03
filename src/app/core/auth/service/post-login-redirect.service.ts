import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_POST_LOGIN_URL, sanitizeReturnUrl } from '../return-url';

/**
 * Gère la redirection post-login (US01.1.4).
 *
 * Deux canaux de conservation de l'URL d'origine :
 * 1. Query param `?returnUrl=` sur /auth/login — **prioritaire** s'il est présent ;
 * 2. « Session Angular » : signal en mémoire uniquement (jamais sessionStorage /
 *    localStorage — cohérent avec la politique token du projet), alimenté par les
 *    guards quand le query param n'est pas transportable (ex. `canMatch`).
 *
 * Non-persistance : la valeur mémorisée est effacée dès qu'elle est consommée
 * (tentative de navigation post-login), qu'elle soit valide ou non.
 *
 * Sécurité open redirect : toute cible passe par {@link sanitizeReturnUrl} —
 * seules les URLs relatives internes sont acceptées, sinon /home.
 */
@Injectable({ providedIn: 'root' })
export class PostLoginRedirectService {
  private readonly router = inject(Router);

  /** URL d'origine mémorisée en mémoire (session Angular) — jamais persistée. */
  private readonly pendingUrl = signal<string | null>(null);

  /**
   * Mémorise l'URL que l'utilisateur tentait d'atteindre avant le renvoi au login.
   * La valeur brute est stockée telle quelle ; la validation a lieu à la consommation.
   *
   * @param url URL interne tentée (ex. `/dashboard?tab=2`)
   */
  remember(url: string): void {
    this.pendingUrl.set(url);
  }

  /** Efface l'URL mémorisée (non-persistance au-delà de la tentative de navigation). */
  clear(): void {
    this.pendingUrl.set(null);
  }

  /**
   * Résout la cible post-login et efface systématiquement la valeur session.
   *
   * Priorité : le query param `returnUrl` gagne s'il est présent (même invalide —
   * une valeur invalide est ignorée au profit de /home, jamais de la session).
   *
   * @param queryReturnUrl valeur du query param `returnUrl` (ou `null` si absent)
   * @returns URL relative interne sûre, ou {@link DEFAULT_POST_LOGIN_URL}
   */
  resolveTarget(queryReturnUrl: string | null): string {
    const candidate = queryReturnUrl ?? this.pendingUrl();
    this.clear();
    return sanitizeReturnUrl(candidate);
  }

  /**
   * Navigue vers la cible post-login. Si la navigation échoue (route refusée
   * par un guard, URL non recevable), retombe sur {@link DEFAULT_POST_LOGIN_URL}.
   *
   * @param queryReturnUrl valeur du query param `returnUrl` (ou `null` si absent)
   * @returns promesse résolue avec le succès de la navigation finale
   */
  async redirectAfterLogin(queryReturnUrl: string | null): Promise<boolean> {
    const target = this.resolveTarget(queryReturnUrl);
    const succeeded = await this.router.navigateByUrl(target);
    if (!succeeded && target !== DEFAULT_POST_LOGIN_URL) {
      return this.router.navigateByUrl(DEFAULT_POST_LOGIN_URL);
    }
    return succeeded;
  }
}
