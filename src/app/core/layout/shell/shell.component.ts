/**
 * ShellComponent — authenticated application shell.
 *
 * Layout: full-width top navbar + scrollable content area + footer.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
export class ShellComponent {}
