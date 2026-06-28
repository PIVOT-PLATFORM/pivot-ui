/**
 * NavbarComponent — top navigation bar for the authenticated shell.
 */
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/service/auth.service';
import { ThemeService } from '../../theme/theme.service';

const AVATAR_COLORS = [
  '#8B5CF6', '#F59E0B', '#10B981', '#EF4444',
  '#3B82F6', '#EC4899', '#F97316', '#14B8A6',
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

@Component({
  selector: 'piv-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="navbar" role="banner">
      <div class="navbar__left">
        <a routerLink="/" class="navbar__logo" aria-label="PIVOT — accueil">
          <svg class="navbar__logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="var(--color-brand-600)"/>
            <path d="M10 8h7a5 5 0 010 10h-4v6h-3V8z" fill="white"/>
          </svg>
          <span class="navbar__logo-text">PIVOT</span>
        </a>
        <nav class="navbar__nav" aria-label="Navigation principale">
          <a routerLink="/teams" class="navbar__nav-link">Mes équipes</a>
        </nav>
      </div>
      <div class="navbar__right">
        <button class="navbar__icon-btn" (click)="toggleTheme()" [attr.aria-label]="themeLabel()" [title]="themeLabel()" type="button">
          @if (theme() === 'light') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          }
        </button>
        <button class="navbar__lang-btn" (click)="switchLang()" [attr.aria-label]="lang() === 'fr' ? 'Switch to English' : 'Passer en français'" [title]="lang() === 'fr' ? 'Switch to English' : 'Passer en français'" type="button">
          {{ lang() === 'fr' ? 'FR' : 'EN' }}
        </button>
        <button class="navbar__icon-btn" (click)="notifOpen.set(!notifOpen())" [attr.aria-expanded]="notifOpen()" aria-haspopup="menu" aria-label="Notifications" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          @if (notifCount() > 0) {
            <span class="navbar__badge" [attr.aria-label]="notifCount() + ' notifications'">{{ notifCount() }}</span>
          }
        </button>
        <div class="navbar__user">
          <button class="navbar__user-btn" (click)="toggleUserMenu($event)" [attr.aria-expanded]="userMenuOpen()" aria-haspopup="menu" type="button" [attr.aria-label]="'Menu de ' + displayName()">
            <span class="navbar__avatar" [style.background]="userAvatarColor()" aria-hidden="true">{{ initials() }}</span>
            <span class="navbar__username">{{ displayName() }}</span>
            <svg class="navbar__chevron" [class.navbar__chevron--open]="userMenuOpen()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          @if (userMenuOpen()) {
            <div class="navbar__dropdown" role="menu" aria-label="Menu utilisateur" (click)="$event.stopPropagation()">
              <div class="navbar__dropdown-header" role="none">
                <span class="navbar__avatar navbar__avatar--lg" [style.background]="userAvatarColor()" aria-hidden="true">{{ initials() }}</span>
                <div class="navbar__dropdown-identity" role="none">
                  <span class="navbar__dropdown-name">{{ displayName() }}</span>
                  <span class="navbar__dropdown-email">{{ user()?.email }}</span>
                </div>
              </div>
              <hr class="navbar__dropdown-sep" role="none"/>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Mon profil
                <span class="navbar__soon" aria-label="Bientôt disponible">Bientôt</span>
              </button>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Préférences
                <span class="navbar__soon" aria-label="Bientôt disponible">Bientôt</span>
              </button>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Sécurité
                <span class="navbar__soon" aria-label="Bientôt disponible">Bientôt</span>
              </button>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                Mes données
                <span class="navbar__soon" aria-label="Bientôt disponible">Bientôt</span>
              </button>
              <hr class="navbar__dropdown-sep" role="none"/>
              <button class="navbar__dropdown-item navbar__dropdown-item--danger" (click)="logout()" role="menuitem" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Déconnexion
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar { display:flex; align-items:center; height:64px; padding:0 32px; background:var(--surface-navbar); border-bottom:1px solid var(--color-gray-200); box-shadow:var(--shadow-sm); position:sticky; top:0; z-index:100; gap:16px; }
    .navbar__left { display:flex; align-items:center; gap:24px; }
    .navbar__right { margin-left:auto; display:flex; align-items:center; gap:4px; }
    .navbar__logo { display:flex; align-items:center; gap:8px; text-decoration:none; border-radius:var(--radius-md); padding:4px; &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__logo-icon { width:32px; height:32px; flex-shrink:0; }
    .navbar__logo-text { font-size:var(--text-lg); font-weight:700; color:var(--color-navy-900); letter-spacing:0.04em; }
    .navbar__nav-link { font-size:var(--text-sm); font-weight:500; color:var(--color-gray-600); text-decoration:none; padding:6px 12px; border-radius:var(--radius-md); transition:background var(--transition-fast),color var(--transition-fast); &:hover { background:var(--color-gray-100); color:var(--color-gray-900); } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__icon-btn { display:flex; align-items:center; justify-content:center; position:relative; width:38px; height:38px; border:none; background:none; border-radius:var(--radius-md); color:var(--color-gray-500); cursor:pointer; transition:background var(--transition-fast),color var(--transition-fast); svg { width:20px; height:20px; } &:hover { background:var(--color-gray-100); color:var(--color-gray-700); } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__lang-btn { display:flex; align-items:center; justify-content:center; height:28px; padding:0 8px; border:1px solid var(--color-gray-200); background:none; border-radius:var(--radius-md); font-size:var(--text-xs); font-weight:600; color:var(--color-gray-500); cursor:pointer; letter-spacing:0.06em; transition:all var(--transition-fast); &:hover { background:var(--color-gray-100); border-color:var(--color-gray-300); color:var(--color-gray-700); } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__badge { position:absolute; top:4px; right:4px; min-width:16px; height:16px; background:var(--color-error); color:#fff; font-size:10px; font-weight:700; line-height:1; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 3px; pointer-events:none; }
    .navbar__user { position:relative; }
    .navbar__user-btn { display:flex; align-items:center; gap:8px; padding:5px 10px; border:none; background:none; border-radius:var(--radius-md); cursor:pointer; transition:background var(--transition-fast); &:hover { background:var(--color-gray-100); } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__avatar { width:32px; height:32px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-size:var(--text-xs); font-weight:700; flex-shrink:0; letter-spacing:0.03em; &--lg { width:40px; height:40px; font-size:var(--text-sm); } }
    .navbar__username { font-size:var(--text-sm); font-weight:500; color:var(--color-gray-700); }
    .navbar__chevron { width:16px; height:16px; color:var(--color-gray-400); transition:transform var(--transition-fast); &--open { transform:rotate(180deg); } }
    .navbar__dropdown { position:absolute; top:calc(100% + 6px); right:0; min-width:256px; background:var(--surface-card); border:1px solid var(--color-gray-200); border-radius:var(--radius-xl); box-shadow:var(--shadow-lg); padding:6px; z-index:200; }
    .navbar__dropdown-header { display:flex; align-items:center; gap:12px; padding:12px; }
    .navbar__dropdown-identity { display:flex; flex-direction:column; gap:2px; min-width:0; }
    .navbar__dropdown-name { font-size:var(--text-sm); font-weight:600; color:var(--color-gray-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .navbar__dropdown-email { font-size:var(--text-xs); color:var(--color-gray-500); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .navbar__dropdown-sep { border:none; border-top:1px solid var(--color-gray-200); margin:4px 0; }
    .navbar__dropdown-item { display:flex; align-items:center; gap:10px; width:100%; padding:9px 12px; border:none; background:none; border-radius:var(--radius-md); font-size:var(--text-sm); color:var(--color-gray-700); cursor:pointer; text-align:left; transition:background var(--transition-fast); svg { width:16px; height:16px; flex-shrink:0; color:var(--color-gray-400); } &:hover:not([aria-disabled="true"]) { background:var(--color-gray-100); } &[aria-disabled="true"] { opacity:.55; cursor:default; } &--danger { color:var(--color-error); svg { color:var(--color-error); } &:hover { background:var(--color-error-light); } } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__soon { margin-left:auto; font-size:10px; font-weight:600; color:var(--color-brand-600); background:var(--color-brand-100); border-radius:4px; padding:2px 6px; letter-spacing:0.04em; text-transform:uppercase; flex-shrink:0; }
    @media (max-width:767px) { .navbar__username { display:none; } .navbar__nav { display:none; } .navbar__chevron { display:none; } }
  `],
})
export class NavbarComponent {
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);

  readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  readonly user = this.auth.currentUser;
  readonly userMenuOpen = signal(false);
  readonly notifOpen = signal(false);
  readonly notifCount = signal(0);
  readonly theme = this.themeService.theme;

  readonly displayName = computed<string>(() => {
    const u = this.user();
    if (!u) return '';
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return name || u.email;
  });

  initials(): string {
    const u = this.user();
    if (!u) return '?';
    const first = u.firstName?.[0] ?? '';
    const last = u.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || u.email[0].toUpperCase();
  }

  readonly userAvatarColor = computed<string>(() => avatarColor(this.displayName() || '?'));

  readonly themeLabel = computed<string>(() =>
    this.theme() === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'
  );

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userMenuOpen.set(false);
    this.notifOpen.set(false);
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.userMenuOpen();
    this.userMenuOpen.set(next);
    if (next) this.notifOpen.set(false);
  }

  toggleTheme(): void { this.themeService.toggleTheme(); }
  switchLang(): void {
    const next = this.transloco.getActiveLang() === 'fr' ? 'en' : 'fr';
    this.transloco.setActiveLang(next);
    localStorage.setItem('pivot_lang', next);
  }
  logout(): void { this.auth.logout().subscribe(); }
}
