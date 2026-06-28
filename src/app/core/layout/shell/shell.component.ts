/**
 * ShellComponent — authenticated application shell.
 *
 * Layout: full-width top navbar + scrollable content area + footer.
 * The sidebar has been removed in favour of a top-nav-only layout.
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
      padding: 40px 40px 0;
    }

    .shell__page { flex: 1; }

    @media (max-width: 1024px) { .shell__content { padding: 32px 24px 0; } }
    @media (max-width: 767px) { .shell__content { padding: 24px 16px 0; } }
  `],
})
export class ShellComponent {}
