import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Lightweight shell header for PIVOT module applications.
 * Shows the PIVOT logo, current user name, and a logout button.
 * For a full-featured navbar (theme toggle, i18n, notifications),
 * use NavbarComponent from pivot-ui directly.
 */
@Component({
  selector: 'piv-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="piv-header" role="banner">
      <a routerLink="/" class="piv-header__logo" aria-label="PIVOT — home">
        <svg class="piv-header__logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="38" height="38" fill="none" stroke="currentColor" stroke-width="4.5"/>
          <polygon points="24,13.5 34.5,24 24,34.5 13.5,24" fill="currentColor"/>
        </svg>
        <span class="piv-header__logo-text">PIVOT</span>
      </a>
      <div class="piv-header__right">
        @if (displayName()) {
          <span class="piv-header__username">{{ displayName() }}</span>
          <button class="piv-header__logout" (click)="logout()" type="button" aria-label="Log out">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    .piv-header { display:flex; align-items:center; height:60px; padding:0 32px; background:var(--surface-navbar,#1e1e2e); border-bottom:1px solid var(--navbar-border-color,rgba(255,255,255,.1)); }
    .piv-header__logo { display:flex; align-items:center; gap:8px; text-decoration:none; color:var(--navbar-logo-color,#fff); border-radius:4px; &:focus-visible { outline:2px solid rgba(255,255,255,.6); outline-offset:2px; } }
    .piv-header__logo-icon { width:28px; height:28px; }
    .piv-header__logo-text { font-size:1.125rem; font-weight:700; letter-spacing:.04em; }
    .piv-header__right { margin-left:auto; display:flex; align-items:center; gap:8px; }
    .piv-header__username { font-size:.875rem; color:var(--navbar-text,rgba(255,255,255,.85)); }
    .piv-header__logout { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border:none; background:none; border-radius:4px; color:var(--navbar-text,rgba(255,255,255,.85)); cursor:pointer; &:hover { background:var(--navbar-hover-bg,rgba(255,255,255,.1)); } &:focus-visible { outline:2px solid rgba(255,255,255,.6); outline-offset:2px; } svg { width:18px; height:18px; } }
  `],
})
export class HeaderComponent {
  private readonly auth = inject(AuthService);

  readonly displayName = computed<string>(() => {
    const u = this.auth.currentUser();
    if (!u) return '';
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return name || u.email;
  });

  logout(): void {
    this.auth.logout().subscribe();
  }
}
