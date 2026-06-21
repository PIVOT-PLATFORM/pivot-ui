import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'piv-auth-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, TranslocoPipe],
  template: `
    <div class="auth-shell">
      <div class="blob blob-1" aria-hidden="true"></div>
      <div class="blob blob-2" aria-hidden="true"></div>
      <div class="blob blob-3" aria-hidden="true"></div>

      <!-- Language switcher pill -->
      <div class="lang-pill" role="group" aria-label="Language">
        <button class="lang-btn" [class.active]="currentLang() === 'fr'" (click)="setLang('fr')">FR</button>
        <span class="lang-divider" aria-hidden="true"></span>
        <button class="lang-btn" [class.active]="currentLang() === 'en'" (click)="setLang('en')">EN</button>
      </div>

      <router-outlet/>

      <footer class="auth-footer-legal">
        <a routerLink="/legal/mentions-legales">{{ 'legal.mentions' | transloco }}</a>
        <span class="sep" aria-hidden="true">·</span>
        <a routerLink="/legal/confidentialite">{{ 'legal.privacy' | transloco }}</a>
        <span class="sep" aria-hidden="true">·</span>
        <a routerLink="/legal/cgu">{{ 'legal.terms' | transloco }}</a>
      </footer>
    </div>
  `,
  styles: [`
    .auth-shell {
      position: relative;
      min-height: 100dvh;
      background: var(--auth-gradient,
        linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4338ca 50%, #6d28d9 75%, #7c3aed 100%));
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .blob {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }
    .blob-1 { width: 420px; height: 420px; background: rgba(255,255,255,.06); bottom: -80px; left: -80px; }
    .blob-2 { width: 300px; height: 300px; background: rgba(255,255,255,.04); top: -60px; right: -60px; }
    .blob-3 { width: 200px; height: 200px; background: rgba(124,58,237,.25); top: 30%; right: 5%; }

    /* Lang pill */
    .lang-pill {
      position: fixed;
      top: 16px;
      right: 20px;
      z-index: 100;
      display: flex;
      align-items: center;
      background: rgba(255,255,255,.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 999px;
      padding: 3px;
      gap: 0;
    }
    .lang-btn {
      border: none;
      background: transparent;
      color: rgba(255,255,255,.6);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: .04em;
      padding: 5px 12px;
      border-radius: 999px;
      cursor: pointer;
      transition: background .15s, color .15s;
      line-height: 1;
      &:hover { color: #fff; }
      &.active {
        background: rgba(255,255,255,.9);
        color: #312e81;
        box-shadow: 0 1px 4px rgba(0,0,0,.2);
      }
    }
    .lang-divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,.2);
      flex-shrink: 0;
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
        color: rgba(255,255,255,.55);
        font-size: 0.8125rem;
        text-decoration: none;
        transition: color .15s;
        &:hover { color: #fff; }
      }
      .sep { color: rgba(255,255,255,.25); font-size: 0.8125rem; }
    }
  `]
})
export class AuthShellComponent {
  private transloco = inject(TranslocoService);

  currentLang = signal(this.transloco.getActiveLang());

  setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('pivot_lang', lang);
    this.currentLang.set(lang);
  }
}
