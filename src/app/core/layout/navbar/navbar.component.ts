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
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../auth/service/auth.service';
import { ThemeService } from '../../theme/theme.service';

const AVATAR_COLORS = [
  '#8B5CF6', '#F59E0B', '#10B981', '#EF4444',
  '#3B82F6', '#EC4899', '#F97316', '#14B8A6',
];
const HASH_MULTIPLIER = 31;

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (name.codePointAt(i) ?? 0) + (hash * HASH_MULTIPLIER);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

@Component({
  selector: 'piv-navbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
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
          <a routerLink="/home" routerLinkActive="navbar__nav-link--active" class="navbar__nav-link">{{ 'nav.home' | transloco }}</a>
          <a routerLink="/dashboard" routerLinkActive="navbar__nav-link--active" class="navbar__nav-link">{{ 'nav.modules' | transloco }}</a>
          <a routerLink="/teams" routerLinkActive="navbar__nav-link--active" class="navbar__nav-link">{{ 'nav.teams' | transloco }}</a>
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
        <button class="navbar__icon-btn" [attr.aria-label]="'nav.help' | transloco" [title]="'nav.help' | transloco" type="button">
          <span class="navbar__help-label" aria-hidden="true">?</span>
        </button>
        <a class="navbar__icon-btn" [href]="bugReportUrl()" [attr.aria-label]="'nav.bug_report' | transloco" [title]="'nav.bug_report' | transloco">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 4-4"/><path d="M17.47 9c1.93-.2 3.53-1.9 3.53-4"/><path d="M18 13h4"/><path d="M21 21c0-2.1-1.7-3.9-4-4"/></svg>
        </a>
        <div class="navbar__lang-pill" role="group" [attr.aria-label]="'nav.lang_aria' | transloco">
          <button class="navbar__lang-opt" [class.navbar__lang-opt--active]="lang() === 'fr'" (click)="setLang('fr')" type="button" [attr.aria-pressed]="lang() === 'fr'">FR</button>
          <button class="navbar__lang-opt" [class.navbar__lang-opt--active]="lang() === 'en'" (click)="setLang('en')" type="button" [attr.aria-pressed]="lang() === 'en'">EN</button>
        </div>
        <button class="navbar__icon-btn" [attr.aria-label]="'nav.notifications' | transloco" type="button" aria-disabled="true" [title]="'nav.dropdown.coming_soon_a11y' | transloco">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          @if (notifCount() > 0) {
            <span class="navbar__badge" [attr.aria-label]="'nav.notif_count' | transloco: { count: notifCount() }">{{ notifCount() }}</span>
          }
        </button>
        <div class="navbar__user">
          <button class="navbar__user-btn" (click)="toggleUserMenu($event)" [attr.aria-expanded]="userMenuOpen()" aria-haspopup="menu" type="button" [attr.aria-label]="'nav.user_menu' | transloco: { name: displayName() }">
            <span class="navbar__avatar" [style.background]="userAvatarColor()" aria-hidden="true">{{ initials() }}</span>
            <span class="navbar__username">{{ displayName() }}</span>
            <svg class="navbar__chevron" [class.navbar__chevron--open]="userMenuOpen()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          @if (userMenuOpen()) {
            <div class="navbar__dropdown" role="menu" [attr.aria-label]="'nav.dropdown.user_menu_aria' | transloco" (click)="$event.stopPropagation()">
              <div class="navbar__dropdown-header" role="none">
                <span class="navbar__avatar navbar__avatar--lg" [style.background]="userAvatarColor()" aria-hidden="true">{{ initials() }}</span>
                <div class="navbar__dropdown-identity" role="none">
                  <span class="navbar__dropdown-name">{{ displayName() }}</span>
                  <span class="navbar__dropdown-email">{{ user()?.email }}</span>
                </div>
              </div>
              <hr class="navbar__dropdown-sep" role="none"/>
              <a class="navbar__dropdown-item" routerLink="/account/profile" role="menuitem" (click)="userMenuOpen.set(false)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ 'nav.dropdown.profile' | transloco }}
              </a>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                {{ 'nav.dropdown.preferences' | transloco }}
                <span class="navbar__soon" [attr.aria-label]="'nav.dropdown.coming_soon_a11y' | transloco">{{ 'nav.dropdown.coming_soon' | transloco }}</span>
              </button>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {{ 'nav.dropdown.security' | transloco }}
                <span class="navbar__soon" [attr.aria-label]="'nav.dropdown.coming_soon_a11y' | transloco">{{ 'nav.dropdown.coming_soon' | transloco }}</span>
              </button>
              <button class="navbar__dropdown-item" role="menuitem" type="button" aria-disabled="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                {{ 'nav.dropdown.my_data' | transloco }}
                <span class="navbar__soon" [attr.aria-label]="'nav.dropdown.coming_soon_a11y' | transloco">{{ 'nav.dropdown.coming_soon' | transloco }}</span>
              </button>
              <hr class="navbar__dropdown-sep" role="none"/>
              <button class="navbar__dropdown-item navbar__dropdown-item--danger" (click)="logout()" role="menuitem" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                {{ 'nav.dropdown.logout' | transloco }}
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar { display:flex; align-items:center; height:64px; padding:0 48px; background:var(--surface-navbar); border-bottom:1px solid var(--navbar-border-color); box-shadow:var(--shadow-sm); position:sticky; top:0; z-index:100; gap:16px; }
    .navbar__left { display:flex; align-items:center; gap:24px; }
    .navbar__nav { display:flex; align-items:center; gap:4px; }
    .navbar__right { margin-left:auto; display:flex; align-items:center; gap:4px; }
    .navbar__logo { display:flex; align-items:center; gap:8px; text-decoration:none; border-radius:var(--radius-md); padding:4px; &:focus-visible { outline:2px solid rgba(255,255,255,0.6); outline-offset:2px; } }
    .navbar__logo-icon { width:32px; height:32px; flex-shrink:0; }
    .navbar__logo-text { font-size:var(--text-lg); font-weight:700; color:var(--navbar-logo-color); letter-spacing:0.04em; }
    .navbar__nav-link { font-size:var(--text-sm); font-weight:500; color:var(--navbar-text); text-decoration:none; padding:6px 12px; border-radius:var(--radius-md); transition:background var(--transition-fast),color var(--transition-fast); &:hover { background:var(--navbar-hover-bg); color:var(--navbar-text-hover); } &:focus-visible { outline:2px solid rgba(255,255,255,0.6); outline-offset:2px; } &--active { color:var(--navbar-active-color); background:var(--navbar-active-bg); font-weight:600; } }
    .navbar__icon-btn { display:flex; align-items:center; justify-content:center; position:relative; width:38px; height:38px; border:none; background:none; border-radius:var(--radius-md); color:var(--navbar-text); cursor:pointer; transition:background var(--transition-fast),color var(--transition-fast); text-decoration:none; svg { width:20px; height:20px; } &:hover { background:var(--navbar-hover-bg); color:var(--navbar-text-hover); } &:focus-visible { outline:2px solid rgba(255,255,255,0.6); outline-offset:2px; } }
    .navbar__help-label { font-size:var(--text-sm); font-weight:700; color:var(--navbar-text); line-height:1; width:22px; height:22px; border-radius:50%; border:1.5px solid rgba(255,255,255,0.75); display:flex; align-items:center; justify-content:center; }
    .navbar__lang-pill { display:flex; align-items:center; background:var(--navbar-pill-bg); border:1px solid var(--navbar-pill-border); border-radius:999px; padding:3px; gap:2px; }
    .navbar__lang-opt { border:none; background:transparent; color:var(--navbar-text); font-size:var(--text-xs); font-weight:600; letter-spacing:0.05em; padding:4px 10px; border-radius:999px; cursor:pointer; transition:background var(--transition-fast),color var(--transition-fast),box-shadow var(--transition-fast); &--active { background:var(--navbar-pill-active-bg); color:var(--navbar-pill-active-color); box-shadow:var(--shadow-sm); } &:not(.navbar__lang-opt--active):hover { color:var(--navbar-text-hover); } &:focus-visible { outline:2px solid rgba(255,255,255,0.6); outline-offset:2px; } }
    .navbar__badge { position:absolute; top:4px; right:4px; min-width:16px; height:16px; background:var(--color-error); color:#fff; font-size:10px; font-weight:700; line-height:1; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 3px; pointer-events:none; }
    .navbar__user { position:relative; }
    .navbar__user-btn { display:flex; align-items:center; gap:8px; padding:5px 10px; border:none; background:none; border-radius:var(--radius-md); cursor:pointer; transition:background var(--transition-fast); &:hover { background:var(--navbar-hover-bg); } &:focus-visible { outline:2px solid rgba(255,255,255,0.6); outline-offset:2px; } }
    .navbar__avatar { width:32px; height:32px; border-radius:50%; color:#fff; display:flex; align-items:center; justify-content:center; font-size:var(--text-xs); font-weight:700; flex-shrink:0; letter-spacing:0.03em; &--lg { width:40px; height:40px; font-size:var(--text-sm); } }
    .navbar__username { font-size:var(--text-sm); font-weight:500; color:var(--navbar-text); }
    .navbar__chevron { width:16px; height:16px; color:var(--navbar-text); transition:transform var(--transition-fast); &--open { transform:rotate(180deg); } }
    .navbar__dropdown { position:absolute; top:calc(100% + 6px); right:0; min-width:272px; background:var(--surface-card); border:1px solid var(--color-gray-200); border-radius:var(--radius-xl); box-shadow:var(--shadow-lg); padding:8px; z-index:200; }
    .navbar__dropdown-header { display:flex; align-items:center; gap:12px; padding:12px 12px 10px; }
    .navbar__dropdown-identity { display:flex; flex-direction:column; gap:3px; min-width:0; }
    .navbar__dropdown-name { font-size:var(--text-sm); font-weight:600; color:var(--color-gray-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .navbar__dropdown-email { font-size:var(--text-xs); color:var(--color-gray-500); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .navbar__dropdown-sep { border:none; border-top:1px solid var(--color-gray-200); margin:6px 0; }
    .navbar__dropdown-item { display:flex; align-items:center; gap:10px; width:100%; padding:10px 12px; border:none; background:none; border-radius:var(--radius-md); font-size:var(--text-sm); color:var(--color-gray-700); cursor:pointer; text-align:left; text-decoration:none; box-sizing:border-box; transition:background var(--transition-fast); svg { width:16px; height:16px; flex-shrink:0; color:var(--color-gray-400); } &:hover:not([aria-disabled="true"]) { background:var(--color-gray-100); } &[aria-disabled="true"] { opacity:.55; cursor:default; } &--danger { color:var(--color-error); svg { color:var(--color-error); } &:hover { background:var(--color-error-light); } } &:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; } }
    .navbar__soon { margin-left:auto; font-size:10px; font-weight:600; color:var(--color-brand-600); background:var(--color-brand-100); border-radius:4px; padding:2px 6px; letter-spacing:0.04em; text-transform:uppercase; flex-shrink:0; }
    @media (max-width:767px) { .navbar__username { display:none; } .navbar__nav { display:none; } .navbar__chevron { display:none; } }
  `],
})
export class NavbarComponent {
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly transloco = inject(TranslocoService);
  readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });

  readonly bugReportUrl = computed<string>(() => {
    const fr = this.lang() === 'fr';
    const subject = encodeURIComponent(fr ? '[PIVOT] Rapport de bug' : '[PIVOT] Bug Report');
    const body = fr
      ? encodeURIComponent(
          '**Description du problème**\n[Décrivez le problème rencontré]\n\n' +
          '**Étapes pour reproduire**\n1. \n2. \n3. \n\n' +
          '**Comportement attendu**\n[Ce qui devrait se passer]\n\n' +
          '**Comportement observé**\n[Ce qui se passe réellement]\n\n' +
          '**Environnement**\n- Navigateur : \n- Système d\'exploitation : \n- Version PIVOT : ',
        )
      : encodeURIComponent(
          '**Problem description**\n[Describe the issue]\n\n' +
          '**Steps to reproduce**\n1. \n2. \n3. \n\n' +
          '**Expected behavior**\n[What should happen]\n\n' +
          '**Actual behavior**\n[What actually happens]\n\n' +
          '**Environment**\n- Browser: \n- Operating system: \n- PIVOT version: ',
        );
    return `mailto:bugs@pivot-platform.fr?subject=${subject}&body=${body}`;
  });

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

  readonly themeLabel = computed<string>(() => {
    this.lang();
    return this.transloco.translate(
      this.theme() === 'light' ? 'nav.theme_to_dark' : 'nav.theme_to_light'
    );
  });

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
  setLang(lang: string): void {
    this.transloco.setActiveLang(lang);
    localStorage.setItem('pivot_lang', lang);
  }
  logout(): void { this.auth.logout().subscribe(); }
}
