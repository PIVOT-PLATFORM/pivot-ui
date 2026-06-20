import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'piv-auth-shell',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <div class="lang-wrapper">
        <span class="lang-globe">🌐</span>
        <select class="lang-select" [value]="currentLang()" (change)="onLangChange($event)">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
      <router-outlet/>
    </div>
  `,
  styles: [`
    .auth-shell { position: relative; min-height: 100vh; }
    .lang-wrapper {
      position: fixed;
      top: 16px;
      right: 20px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #fff;
      border: 1px solid var(--color-gray-300);
      border-radius: var(--radius-md);
      padding: 0 10px 0 8px;
      box-shadow: var(--shadow-sm);
    }
    .lang-globe { font-size: 14px; line-height: 1; }
    .lang-select {
      border: none;
      outline: none;
      background: transparent;
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--color-gray-700);
      cursor: pointer;
      padding: 7px 0;
      appearance: auto;
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
