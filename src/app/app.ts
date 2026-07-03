import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { RouteLoadingComponent } from './core/layout/route-loading/route-loading.component';

/**
 * Composant racine du shell PIVOT.
 * Monte l'indicateur global de chargement de route (navigation, US01.1.4) et le
 * conteneur global de toasts (notifications transverses — ex. expiration de session
 * US01.1.5) autour du router-outlet, visibles sur toutes les routes.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouteLoadingComponent, ToastComponent],
  template: '<piv-route-loading/><router-outlet/><piv-toast-container/>',
  styles: [`:host { display: contents; }`],
})
export class App {}
