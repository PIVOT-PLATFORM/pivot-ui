import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { RouteLoadingComponent } from './core/layout/route-loading/route-loading.component';
import { AccountDeletionBannerComponent } from './features/account/deletion/account-deletion-banner.component';

/**
 * Composant racine du shell PIVOT.
 * Monte l'indicateur global de chargement de route (navigation, US01.1.4), le
 * conteneur global de toasts (notifications transverses — ex. expiration de session
 * US01.1.5) et la bannière persistante de suppression de compte (US02.2.4) autour
 * du router-outlet, visibles sur toutes les routes. La bannière US02.2.4 doit
 * rester visible même déconnecté (les sessions sont révoquées dès la demande de
 * suppression) — d'où son placement ici plutôt que dans ShellComponent.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouteLoadingComponent, ToastComponent, AccountDeletionBannerComponent],
  template: '<piv-account-deletion-banner/><piv-route-loading/><router-outlet/><piv-toast-container/>',
  styles: [`:host { display: contents; }`],
})
export class App {}
