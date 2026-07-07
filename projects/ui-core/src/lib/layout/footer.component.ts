import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'piv-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="piv-footer" role="contentinfo">
      <span class="piv-footer__copy">© {{ year }} PIVOT</span>
    </footer>
  `,
  styles: [`
    .piv-footer {
      display: flex;
      align-items: center;
      padding: 16px 48px;
      background: var(--surface-navbar, #1e1e2e);
      border-top: 1px solid var(--navbar-pill-border, rgba(255,255,255,0.1));
    }
    .piv-footer__copy {
      font-size: 0.75rem;
      color: var(--navbar-text, rgba(255,255,255,0.7));
    }
  `],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
