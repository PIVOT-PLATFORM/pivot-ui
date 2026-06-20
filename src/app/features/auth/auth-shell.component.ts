import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'piv-auth-shell',
  standalone: true,
  imports: [RouterOutlet, TranslocoPipe],
  template: `
    <div class="auth-shell">
      <button class="lang-btn" (click)="switchLang()">
        {{ 'nav.lang_current' | transloco }} / {{ 'nav.lang_other' | transloco }}
      </button>
      <router-outlet/>
    </div>
  `,
  styles: [`
    .auth-shell { position: relative; min-height: 100vh; }
    .lang-btn {
      position: fixed;
      top: 16px;
      right: 20px;
      z-index: 100;
      background: #fff;
      border: 1px solid var(--color-gray-300);
      border-radius: var(--radius-md);
      padding: 6px 14px;
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-gray-600);
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      letter-spacing: .05em;
      &:hover { background: var(--color-gray-50); border-color: var(--color-brand-600); color: var(--color-brand-600); }
    }
  `]
})
export class AuthShellComponent {
  private transloco = inject(TranslocoService);

  switchLang(): void {
    const next = this.transloco.getActiveLang() === 'fr' ? 'en' : 'fr';
    this.transloco.setActiveLang(next);
    localStorage.setItem('pivot_lang', next);
  }
}
