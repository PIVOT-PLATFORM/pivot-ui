/**
 * ShellComponent — authenticated application shell.
 *
 * Layout: full-width top navbar + scrollable content area + footer.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, type ActivatedRouteSnapshot } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { ModuleAccessOverlayComponent } from '../../modules/module-access-overlay.component';

/**
 * Le conteneur global de toasts (`piv-toast-container`) est monté une seule
 * fois au niveau du composant racine ({@link import('../../../app').App}),
 * pas ici — visible sur toutes les routes, authentifiées ou non.
 */
@Component({
  selector: 'piv-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ModuleAccessOverlayComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);

  /**
   * `true` on routes that opt into a full-bleed content area via `data.fullBleed` (e.g. the
   * whiteboard board canvas): the shell drops its page padding/max-width and hides the footer so
   * the routed view fills the viewport below the navbar. Any route in the active chain carrying
   * the flag wins, so a module only has to set it on its own canvas route.
   */
  protected readonly fullBleed = signal(this.resolveFullBleed());

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.fullBleed.set(this.resolveFullBleed()));
  }

  /** Walks the activated-route snapshot chain; any route carrying `data.fullBleed` wins. */
  private resolveFullBleed(): boolean {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (route) {
      if (route.data['fullBleed'] === true) {
        return true;
      }
      route = route.firstChild;
    }
    return false;
  }
}
