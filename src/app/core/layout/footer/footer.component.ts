/**
 * FooterComponent — application shell footer.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'piv-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="footer" role="contentinfo">
      <span class="footer__copy">© {{ year }} PIVOT — Réalisé par l'équipe PIVOT</span>
      <nav class="footer__nav" aria-label="Liens du site">
        <a routerLink="/legal/mentions-legales" class="footer__link">Mentions légales</a>
        <a routerLink="/legal/confidentialite" class="footer__link">Confidentialité</a>
        <a routerLink="/legal/cgu" class="footer__link">CGU</a>
        <a routerLink="/legal/accessibilite" class="footer__link">Accessibilité</a>
        <a routerLink="/contact" class="footer__link">Contact</a>
        <a routerLink="/faq" class="footer__link">FAQ</a>
        <a routerLink="/plan-du-site" class="footer__link">Plan du site</a>
      </nav>
    </footer>
  `,
  styles: [`
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px 24px;
      padding: 20px 48px;
      background: var(--surface-navbar);
      border-top: 1px solid var(--color-gray-200);
    }
    .footer__copy { font-size:var(--text-xs); color:var(--color-gray-400); white-space:nowrap; }
    .footer__nav { display:flex; flex-wrap:wrap; gap:8px 20px; }
    .footer__link { font-size:var(--text-xs); color:var(--color-gray-400); text-decoration:none; white-space:nowrap; transition:color var(--transition-fast); &:hover { color:var(--color-gray-700); } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; border-radius:2px; } }
    @media (max-width:1024px) { .footer { padding:20px 32px; } }
    @media (max-width:767px) { .footer { flex-direction:column; align-items:flex-start; padding:20px 16px; } }
  `],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
