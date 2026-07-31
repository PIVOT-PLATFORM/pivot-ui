import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HubTab } from './agilite-hub.model';

/**
 * Agilité module landing hub — the aggregated dashboard mounted at the module's `''` route
 * (the shell's `/agilite`, previously empty). Five tabs, each a real feature: **Daily** (daily
 * standup), **Roue d'équipe** (weighted random draw wheel), **Capacity** (capacity planning),
 * **Planning Poker**, and **PI Planning** — every tab is an entry point linking into that
 * feature's real screens (`pivot-agilite-core`), the only nav path to routes that would
 * otherwise be unreachable from the shell.
 *
 * This hub carries no data of its own — no demo/fake rows, no client-side simulation. Each tab
 * is a thin call-to-action into the corresponding feature module.
 */
@Component({
  selector: 'app-agilite-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './agilite-hub.component.html',
  styleUrl: './agilite-hub.component.scss',
})
export class AgiliteHubComponent {
  protected readonly tab = signal<HubTab>('daily');

  protected select(tab: HubTab): void {
    this.tab.set(tab);
  }
}
