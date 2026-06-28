/**
 * ShellComponent — authenticated application shell.
 *
 * Layout: full-width top navbar + scrollable content area.
 * The sidebar has been removed in favour of a top-nav-only layout.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'piv-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="shell">
      <piv-navbar/>
      <main class="shell__content">
        <router-outlet/>
      </main>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .shell__content {
      flex: 1;
      overflow-y: auto;
      background: var(--surface-bg);
      padding: 40px 48px;
    }

    @media (max-width: 1024px) {
      .shell__content { padding: 32px 24px; }
    }

    @media (max-width: 767px) {
      .shell__content { padding: 24px 16px; }
    }
  `],
})
export class ShellComponent {}
