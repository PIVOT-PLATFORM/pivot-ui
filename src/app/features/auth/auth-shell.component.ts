import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'piv-auth-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="auth-shell">
      <!-- Decorative background blobs -->
      <div class="blob blob-1" aria-hidden="true"></div>
      <div class="blob blob-2" aria-hidden="true"></div>
      <div class="blob blob-3" aria-hidden="true"></div>

      <!-- Language switcher -->
      <div class="lang-wrapper">
        <span class="lang-globe">🌐</span>
        <select class="lang-select" [value]="currentLang()" (change)="onLangChange($event)">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <!-- Page content -->
      <router-outlet/>

      <!-- Legal footer -->
      <footer class="auth-footer-legal">
        <a routerLink="/legal/mentions-legales">Mentions légales</a>
        <span class="sep">·</span>
        <a routerLink="/legal/confidentialite">Confidentialité</a>
        <span class="sep">·</span>
        <a routerLink="/legal/cgu">CGU</a>
      </footer>
    </div>
  `,
  styles: [`
    .auth-shell {
      position: relative;
      min-height: 100vh;
      background: var(--auth-gradient,
        linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4338ca 50%, #6d28d9 75%, #7c3aed 100%));
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Decorative large blobs */
    .blob {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }
    .blob-1 {
      width: 420px; height: 420px;
      background: rgba(255,255,255,.06);
      bottom: -80px; left: -80px;
    }
    .blob-2 {
      width: 300px; height: 300px;
      background: rgba(255,255,255,.04);
      top: -60px; right: -60px;
    }
    .blob-3 {
      width: 200px; height: 200px;
      background: rgba(124,58,237,.25);
      top: 30%; right: 5%;
    }

    /* Language switcher */
    .lang-wrapper {
      position: fixed;
      top: 16px;
      right: 20px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,.25);
      border-radius: var(--radius-md);
      padding: 0 10px 0 8px;
    }
    .lang-globe { font-size: 14px; line-height: 1; }
    .lang-select {
      border: none;
      outline: none;
      background: transparent;
      font-size: var(--text-sm);
      font-weight: 500;
      color: #fff;
      cursor: pointer;
      padding: 7px 0;
      appearance: auto;
      option { color: #1e1b4b; background: #fff; }
    }

    /* Legal footer */
    .auth-footer-legal {
      position: relative;
      z-index: 10;
      text-align: center;
      padding: 16px 24px 24px;
      margin-top: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      a {
        color: rgba(255,255,255,.65);
        font-size: 0.8125rem;
        text-decoration: none;
        &:hover { color: #fff; text-decoration: underline; }
      }
      .sep { color: rgba(255,255,255,.35); font-size: 0.8125rem; }
    }
  `]
})
export class AuthShellComponent {
  private transloco = inject(TranslocoService);

  currentLang = signal(this.transloco.getActiveLang());

  onLangChange(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value;
    this.transloco.setActiveLang(lang);
    localStorage.setItem('pivot_lang', lang);
    this.currentLang.set(lang);
  }
}
