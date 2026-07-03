import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map, of, switchMap, timer } from 'rxjs';

/**
 * Délai avant affichage de l'indicateur (US01.1.4) : une résolution de
 * navigation (guard async, lazy-loading) plus longue que 500 ms affiche
 * l'indicateur ; en deçà, rien n'est montré pour éviter le flash visuel.
 */
export const ROUTE_LOADING_DELAY_MS = 500;

/**
 * Indicateur global de navigation (US01.1.4).
 *
 * Écoute les événements du routeur : si une navigation (guard async,
 * chargement lazy d'un bundle) dure plus de {@link ROUTE_LOADING_DELAY_MS},
 * un spinner est affiché jusqu'à la fin (succès, annulation ou erreur).
 *
 * Accessibilité : conteneur `role="status"` avec `aria-label` externalisé
 * Transloco (`common.loading` → « Chargement en cours... ») et texte
 * visuellement masqué (`sr-only`) annoncé aux lecteurs d'écran ; le spinner
 * décoratif est `aria-hidden`.
 */
@Component({
  selector: 'piv-route-loading',
  standalone: true,
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="route-loading" role="status" [attr.aria-label]="'common.loading' | transloco">
        <span class="route-loading__spinner spinner" aria-hidden="true"></span>
        <span class="sr-only">{{ 'common.loading' | transloco }}</span>
      </div>
    }
  `,
  styleUrl: './route-loading.component.scss',
})
export class RouteLoadingComponent {
  private readonly router = inject(Router);

  /**
   * `true` quand une navigation est en cours depuis plus de
   * {@link ROUTE_LOADING_DELAY_MS} ; retombe à `false` dès la fin de la
   * navigation (le `switchMap` annule le timer si la navigation se termine
   * avant le délai).
   */
  readonly visible = toSignal(
    this.router.events.pipe(
      filter(
        (event) =>
          event instanceof NavigationStart ||
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError,
      ),
      switchMap((event) =>
        event instanceof NavigationStart
          ? timer(ROUTE_LOADING_DELAY_MS).pipe(map(() => true))
          : of(false),
      ),
    ),
    { initialValue: false },
  );
}
