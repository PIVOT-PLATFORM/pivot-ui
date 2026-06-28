/**
 * ShellComponent — authenticated application shell.
 *
 * Layout: full-width top navbar + scrollable content area + footer.
 * Footer is full-width (hors du padding latéral) avec fond blanc — symétrie avec la navbar.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'piv-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <div class="shell">
      <piv-navbar/>
      <main class="shell__content">
        <div class="shell__page">
          <router-outlet/>
        </div>
        <piv-footer/>
      </main>
    </div>
  `,
  styles: [`
    .shell { display:flex; flex-direction:column; height:100vh; overflow:hidden; }

    .shell__content {
      flex: 1;
      overflow-y: auto;
      background: var(--surface-bg);
      display: flex;
      flex-direction: column;
    }

    .shell__page {
      flex: 1;
      padding: 48px 48px 40px;
    }

    @media (max-width: 1024px) { .shell__page { padding: 32px 32px 32px; } }
    @media (max-width: 767px) { .shell__page { padding: 24px 16px 24px; } }
  `],
})
export class ShellComponent {}
