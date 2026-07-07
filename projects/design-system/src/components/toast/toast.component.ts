import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastService } from './toast.service';

/**
 * Conteneur global de toasts du shell PIVOT — monté une seule fois dans le
 * composant racine, au-dessus du router-outlet.
 *
 * Accessibilité (WCAG 2.1 AA) :
 * - chaque toast porte role="alert" (annonce immédiate par les lecteurs d'écran)
 * - bouton de fermeture avec aria-label traduit
 * - le glyphe de fermeture est masqué aux technologies d'assistance (aria-hidden)
 *
 * @pivot/design-system EN17.8 — copie incubée depuis src/app/shared/toast.
 * L'app continuera d'importer depuis src/app/shared/toast jusqu'à EN17.2.
 */
@Component({
  selector: 'pivot-ds-toast-container',
  standalone: true,
  imports: [TranslocoPipe, RouterLink],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
