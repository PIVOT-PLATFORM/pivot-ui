import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';

/**
 * Composant racine du shell PIVOT.
 * Monte le conteneur global de toasts (notifications transverses — ex. expiration
 * de session US01.1.5) au-dessus du router-outlet, visible sur toutes les routes.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: '<router-outlet/><piv-toast-container/>',
  styles: [`:host { display: contents; }`],
})
export class App {}
