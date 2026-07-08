import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * ModuleLoadErrorComponent — EN17.10.
 *
 * Fallback rendered when a module's `loadChildren()` dynamic `import()` rejects (network
 * failure, missing/stale content-hashed chunk after a fresh deployment, GitHub Packages
 * registry unavailable at runtime for a lazy-loaded module such as `@pivot-platform/collaboratif-ui`).
 *
 * Angular's Router treats a rejected `loadChildren` promise as a **failed navigation** — with
 * no route-level recovery, this silently leaves the user on their previous URL with no visible
 * feedback (indistinguishable from a dead link). This component is the shell's explicit
 * recovery surface (Enabler EN17.10, AC "Error case") — wired as the fallback route returned by
 * the `.catch()` on the module's `loadChildren()` (see `app.routes.ts`), so the Router still
 * activates *something* observable instead of stalling on a blank/unchanged page.
 *
 * "Réessayer" triggers a hard reload rather than an in-app retry: a stale chunk failure after a
 * new deployment requires a fresh `index.html`/asset manifest, which only a full navigation
 * fetches — retrying the same in-memory dynamic `import()` would fail identically.
 */
@Component({
  selector: 'piv-module-load-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoPipe],
  template: `
    <div class="module-load-error" role="alert">
      <svg
        class="module-load-error__icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="13" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h1 class="module-load-error__title">{{ 'module_load_error.title' | transloco }}</h1>
      <p class="module-load-error__subtitle">{{ 'module_load_error.subtitle' | transloco }}</p>
      <div class="module-load-error__actions">
        <button type="button" class="module-load-error__retry" (click)="retry()">
          {{ 'module_load_error.retry' | transloco }}
        </button>
        <a routerLink="/" class="module-load-error__back">{{ 'module_load_error.back' | transloco }}</a>
      </div>
    </div>
  `,
  styles: [`
    .module-load-error { max-width:480px; margin:80px auto; text-align:center; padding:0 24px; }
    .module-load-error__icon { width:56px; height:56px; color:var(--color-gray-300); margin:0 auto 24px; display:block; }
    .module-load-error__title { font-size:var(--text-xl); font-weight:700; color:var(--color-navy-900); margin:0 0 8px; }
    .module-load-error__subtitle { font-size:var(--text-sm); color:var(--color-gray-500); margin:0 0 32px; }
    .module-load-error__actions { display:flex; gap:16px; justify-content:center; align-items:center; flex-wrap:wrap; }
    .module-load-error__retry {
      font:inherit; font-size:var(--text-sm); font-weight:500; color:#fff; background:var(--color-brand-600);
      border:none; border-radius:6px; padding:10px 20px; cursor:pointer;
    }
    .module-load-error__retry:hover { background:var(--color-brand-700, var(--color-brand-600)); }
    .module-load-error__retry:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; }
    .module-load-error__back { font-size:var(--text-sm); color:var(--color-brand-600); text-decoration:none; font-weight:500; }
    .module-load-error__back:hover { text-decoration:underline; }
    .module-load-error__back:focus-visible { outline:2px solid var(--color-brand-500); outline-offset:2px; border-radius:2px; }
  `],
})
export class ModuleLoadErrorComponent {
  /** Isolated for testability — spied on in specs instead of stubbing the global `Location`. */
  retry(): void {
    window.location.reload();
  }
}
