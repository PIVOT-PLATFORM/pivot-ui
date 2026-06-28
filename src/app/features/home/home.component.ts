/**
 * HomeComponent — placeholder landing page for authenticated users.
 * Full implementation will follow in a dedicated US.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'piv-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home-placeholder">
      <h1>Accueil</h1>
      <p>Page en cours de construction.</p>
    </div>
  `,
  styles: [`
    .home-placeholder {
      max-width: 800px;
      margin: 48px auto;
      padding: 0 24px;
      h1 { font-size: var(--text-2xl); font-weight: 700; color: var(--color-navy-900); margin: 0 0 8px; }
      p { color: var(--color-gray-500); font-size: var(--text-base); }
    }
  `],
})
export class HomeComponent {}