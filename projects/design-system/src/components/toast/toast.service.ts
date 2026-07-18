import { Injectable, signal } from '@angular/core';

/**
 * Types visuels de toast supportés par le design system PIVOT.
 *
 * `success` complète `info`/`warning`/`error` pour les confirmations d'action
 * (sauvegarde, suppression…) consommées par les modules (agilité, collaboratif).
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/** Lien d'action optionnel affiché dans un toast (clé Transloco, jamais de libellé en dur). */
export interface ToastAction {
  /** Clé de traduction Transloco du libellé du lien (ex. `modules.guard.adminLink`). */
  labelKey: string;
  /** Cible de routing Angular, ex. `/admin/modules`. */
  route: string;
}

/** Un toast affiché par le conteneur global (clé Transloco, jamais de libellé en dur). */
export interface Toast {
  /** Identifiant unique (généré par le service). */
  id: number;
  /** Clé de traduction Transloco du message (ex. `auth.session.expired`). */
  messageKey: string;
  /** Type visuel — pilote le modificateur BEM et la sémantique ARIA. */
  type: ToastType;
  /** Paramètres d'interpolation Transloco optionnels (ex. `{ name: 'whiteboard' }`). */
  params?: Record<string, string | number>;
  /** Lien d'action optionnel (ex. accès direct à l'administration des modules). */
  action?: ToastAction;
}

/** Durée d'affichage avant fermeture automatique (ms). */
export const TOAST_AUTO_DISMISS_MS = 8000;

/**
 * Service global de notifications toast du shell PIVOT.
 *
 * State en signal Angular (readonly côté consommateurs). Les messages sont des
 * clés Transloco — la traduction est faite au rendu par le ToastComponent.
 * Chaque toast est auto-fermé après {@link TOAST_AUTO_DISMISS_MS} et peut être
 * fermé manuellement via {@link dismiss}.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  private nextId = 0;

  /** Liste réactive des toasts actuellement affichés. */
  readonly toasts = this._toasts.asReadonly();

  /**
   * Affiche un toast.
   *
   * Déduplication : si un toast avec la même clé et les mêmes paramètres est déjà
   * affiché, il n'est pas dupliqué (ex. plusieurs requêtes parallèles en 401 au
   * même instant). Deux toasts avec la même clé mais des paramètres différents
   * (ex. deux modules distincts activés coup sur coup) ne sont pas dédupliqués.
   *
   * @param messageKey clé Transloco du message
   * @param type       type visuel (défaut `info`)
   * @param params     paramètres d'interpolation Transloco optionnels
   * @param action     lien d'action optionnel (clé Transloco + route)
   * @returns l'identifiant du toast affiché (existant si dédupliqué)
   */
  show(
    messageKey: string,
    type: ToastType = 'info',
    params?: Record<string, string | number>,
    action?: ToastAction,
  ): number {
    const existing = this._toasts().find(
      (t) => t.messageKey === messageKey && JSON.stringify(t.params) === JSON.stringify(params),
    );
    if (existing) {
      return existing.id;
    }
    const id = ++this.nextId;
    this._toasts.update((list) => [...list, { id, messageKey, type, params, action }]);
    setTimeout(() => this.dismiss(id), TOAST_AUTO_DISMISS_MS);
    return id;
  }

  /**
   * Ferme un toast (manuellement ou via l'auto-dismiss).
   *
   * @param id identifiant retourné par {@link show}
   */
  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
