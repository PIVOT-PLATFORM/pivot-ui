import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../auth/service/auth.service';

@Component({
  selector: 'piv-navbar',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  template: `
    <header class="navbar">
      <button class="navbar__menu-btn" (click)="menuToggle.emit()" aria-label="Toggle menu">
        <span class="hamburger"></span>
      </button>

      <div class="navbar__brand">{{ 'common.logo' | transloco }}</div>

      <div class="navbar__right">
        <button class="lang-btn" (click)="switchLang()" [attr.title]="'nav.lang_other' | transloco">
          {{ 'nav.lang_current' | transloco }}
        </button>

        <div class="navbar__user" (click)="userMenuOpen.set(!userMenuOpen())">
          <div class="avatar">{{ initials() }}</div>
          <span class="navbar__username">{{ user()?.firstName }} {{ user()?.lastName }}</span>

          @if (userMenuOpen()) {
            <div class="user-dropdown">
              <div class="user-dropdown__info">
                <strong>{{ user()?.firstName }} {{ user()?.lastName }}</strong>
                <span>{{ user()?.email }}</span>
              </div>
              <hr/>
              <button class="user-dropdown__item" (click)="logout()">
                {{ 'nav.sign_out' | transloco }}
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      display: flex;
      align-items: center;
      height: 60px;
      padding: 0 20px;
      background: var(--surface-navbar);
      border-bottom: 1px solid var(--color-gray-200);
      gap: 16px;
      position: relative;
      z-index: 10;
    }
    .navbar__menu-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: var(--radius-md);
      display: flex;
      &:hover { background: var(--color-gray-100); }
    }
    .hamburger {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--color-gray-600);
      position: relative;
      &::before, &::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 2px;
        background: var(--color-gray-600);
        left: 0;
      }
      &::before { top: -6px; }
      &::after { top: 6px; }
    }
    .navbar__brand { font-size: var(--text-lg); font-weight: 700; color: var(--color-navy-900); }
    .navbar__right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .lang-btn {
      background: none;
      border: 1px solid var(--color-gray-300);
      border-radius: var(--radius-md);
      padding: 4px 10px;
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--color-gray-600);
      cursor: pointer;
      letter-spacing: .05em;
      &:hover { background: var(--color-gray-100); border-color: var(--color-gray-400); }
    }
    .navbar__user {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      position: relative;
      &:hover { background: var(--color-gray-100); }
    }
    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--color-brand-600);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .navbar__username { font-size: var(--text-sm); font-weight: 500; color: var(--color-gray-700); }
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 220px;
      background: #fff;
      border: 1px solid var(--color-gray-200);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 8px;
      z-index: 100;
    }
    .user-dropdown__info {
      padding: 8px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      strong { font-size: var(--text-sm); color: var(--color-gray-900); }
      span { font-size: var(--text-xs); color: var(--color-gray-500); }
    }
    hr { border: none; border-top: 1px solid var(--color-gray-200); margin: 4px 0; }
    .user-dropdown__item {
      width: 100%;
      text-align: left;
      padding: 8px 12px;
      border: none;
      background: none;
      font-size: var(--text-sm);
      color: var(--color-error);
      border-radius: var(--radius-md);
      cursor: pointer;
      &:hover { background: #FEF2F2; }
    }
  `]
})
export class NavbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  private auth = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  userMenuOpen = signal(false);
  user = this.auth.currentUser;

  initials(): string {
    const u = this.user();
    if (!u) return '?';
    return `${(u.firstName?.[0] || '')}${(u.lastName?.[0] || '')}`.toUpperCase();
  }

  switchLang(): void {
    const next = this.transloco.getActiveLang() === 'fr' ? 'en' : 'fr';
    this.transloco.setActiveLang(next);
    localStorage.setItem('pivot_lang', next);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}
