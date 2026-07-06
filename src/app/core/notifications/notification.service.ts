/**
 * NotificationService — compteur de notifications non lues pour le badge de navigation
 * (US16.1.3).
 *
 * Consomme le contrat pivot-core livré par l'Enabler EN-NOTIF :
 * - `GET /api/notifications/unread-count` → `{ count: number }`
 *   ({@link UnreadCountResponse}, miroir de `fr.pivot.notification.dto.UnreadCountResponse`).
 * - Contrat confirmé par lecture directe du diff `pivot-core` PR #160
 *   (`feat/en-notif-infrastructure`, Gate 4 = 100/100, CI verte) — **non fusionnée sur
 *   `main`** au moment de cette implémentation. Aucun conflit de fichier (repos distincts)
 *   mais dépendance fonctionnelle : le badge n'est opérationnel en intégration réelle
 *   qu'après fusion de #160 sur `pivot-core` (point de coordination documenté dans la PR
 *   pivot-ui et dans la spec Gate 5).
 *
 * Choix polling 30s plutôt que WebSocket STOMP : le backend EN-NOTIF expose bien un canal
 * push (`/user/{userId}/queue/notifications`, `NotificationWebSocketConfig` +
 * `StompAuthChannelInterceptor`), mais `pivot-ui/CLAUDE.md` réserve le client STOMP
 * (`@stomp/rx-stomp`) aux repos modules (ex. `pivot-collaboratif-ui`) — jamais au shell
 * `pivot-ui`. Introduire un client STOMP ici violerait cette séparation d'architecture.
 * Le polling 30s est de toute façon documenté comme filet de sécurité par l'AC EN-NOTIF
 * elle-même (le canal WebSocket, quand un repo module l'utilisera, restera secondaire à ce
 * filet) — un choix cohérent avec l'architecture actuelle, pas un contournement.
 *
 * Isolation tenant (CLAUDE.md) : `userId`/`tenantId` ne sont jamais envoyés par ce service —
 * le compteur est résolu exclusivement depuis le token porteur côté backend.
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, interval, map, of, retry, switchMap, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { UnreadCountResponse } from './notification.model';

/** Intervalle de polling (ms) — AC "mise à jour en temps réel via WebSocket ou polling 30s". */
export const POLL_INTERVAL_MS = 30_000;

/**
 * Nombre total de tentatives — 1 initiale + 2 réessais — avant d'abandonner (AC "réessai
 * automatique avec backoff exponentiel, max 3 tentatives"). Interprétation explicite de
 * l'AC : "tentatives" désigne le nombre total d'appels HTTP effectués, pas le nombre de
 * réessais en plus du premier appel — documenté ici plutôt que deviné silencieusement.
 */
const MAX_ATTEMPTS = 3;

/** Délai de base du backoff exponentiel (ms) — doublé à chaque réessai : 1s puis 2s. */
const BASE_RETRY_DELAY_MS = 1000;

/** Seuil d'affichage "99+" du badge (AC). */
export const MAX_DISPLAY_COUNT = 99;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _unreadCount = signal(0);
  private readonly _hasError = signal(false);

  /** Dernier nombre de notifications non lues connu (0 avant tout chargement réussi). */
  readonly unreadCount = this._unreadCount.asReadonly();

  /**
   * `true` si les {@link MAX_ATTEMPTS} tentatives ont toutes échoué — le badge doit alors
   * être masqué (AC erreur), quelle que soit la dernière valeur connue de
   * {@link unreadCount}. Remis à `false` dès qu'un appel ultérieur réussit.
   */
  readonly hasError = this._hasError.asReadonly();

  /**
   * Un seul GET `/notifications/unread-count`, avec réessai automatique en backoff
   * exponentiel (AC erreur — {@link MAX_ATTEMPTS} tentatives max, délais {@link
   * BASE_RETRY_DELAY_MS}/2·{@link BASE_RETRY_DELAY_MS}). Met à jour {@link unreadCount} et
   * {@link hasError} en effet de bord — ne rejette jamais, l'appelant n'a pas besoin de
   * gérer l'erreur (même contrat que `ModuleRegistryService.loadModules()`).
   */
  fetchUnreadCount(): Observable<number> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/notifications/unread-count`).pipe(
      map(res => res.count),
      retry({
        count: MAX_ATTEMPTS - 1,
        delay: (_error, retryCount) => timer(BASE_RETRY_DELAY_MS * 2 ** (retryCount - 1)),
      }),
      tap(count => {
        this._unreadCount.set(count);
        this._hasError.set(false);
      }),
      catchError(() => {
        this._hasError.set(true);
        return of(0);
      }),
    );
  }

  /**
   * Polling {@link POLL_INTERVAL_MS} (30s) — filet de sécurité documenté par l'AC EN-NOTIF.
   * Le premier tick n'est pas immédiat : l'appelant doit invoquer {@link fetchUnreadCount}
   * une première fois pour un état initial avant le premier intervalle, comme
   * `ExportService.pollStatus()`. La durée de vie de l'abonnement est de la responsabilité
   * de l'appelant (ex. `takeUntilDestroyed`).
   */
  poll(): Observable<number> {
    return interval(POLL_INTERVAL_MS).pipe(switchMap(() => this.fetchUnreadCount()));
  }
}
