import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastService } from './toast.service';

/**
 * Conteneur global de toasts du shell PIVOT — monté une seule fois dans le
 * composant racine (`App`), au-dessus du `router-outlet`.
 *
 * Accessibilité (WCAG 2.1 AA) :
 * - chaque toast porte `role="alert"` (annonce immédiate par les lecteurs d'écran) ;
 * - bouton de fermeture avec `aria-label` traduit ;
 * - le glyphe de fermeture est masqué aux technologies d'assistance (`aria-hidden`).
 */
@Component({
  selector: 'piv-toast-container',
  standalone: true,
  imports: [TranslocoPipe, RouterLink],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
