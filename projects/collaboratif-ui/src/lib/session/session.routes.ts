import { Routes } from '@angular/router';
import { SessionListComponent } from './session-list/session-list.component';

/**
 * Module Session live (E19) route tree, mounted by the consuming shell under a guarded path
 * (`moduleGuard('session')`, see `pivot-ui` `app.routes.ts` `SESSION_ROUTE` / `loadSessionModule`
 * — US19.2.2). Mirrors `whiteboardRoutes`' shape (list at `''`, dedicated `join`/`new` routes,
 * a `:sessionId` detail subtree).
 *
 * `join`/`:sessionId/play`/`:sessionId/results` are participant-facing and duplicated,
 * unguarded, in {@link sessionPublicRoutes} below — see that export's own TSDoc for why.
 */
export const sessionRoutes: Routes = [
  {
    path: '',
    component: SessionListComponent,
  },
  {
    path: 'new',
    loadComponent: () => import('./session-form/session-form.component').then(m => m.SessionFormComponent),
  },
  {
    path: 'join',
    loadComponent: () => import('./session-join/session-join.component').then(m => m.SessionJoinComponent),
  },
  {
    // Facilitator control view (US19.1.2) — start/pause/resume/end.
    path: ':sessionId',
    loadComponent: () =>
      import('./session-runner/session-runner.component').then(m => m.SessionRunnerComponent),
  },
  {
    // Participant real-time view (US19.2.2) — generic shell + lazy-loaded activity component.
    path: ':sessionId/play',
    loadComponent: () =>
      import('./session-participant-shell/session-participant-shell.component').then(
        m => m.SessionParticipantShellComponent,
      ),
  },
  {
    // Facilitator real-time results view (US19.4.1) — per-activity tallies + projection mode.
    path: ':sessionId/results',
    loadComponent: () =>
      import('./session-results/session-results.component').then(m => m.SessionResultsComponent),
  },
];

/**
 * Participant-facing subset of {@link sessionRoutes} — `join`, `:sessionId/play`,
 * `:sessionId/results` — mounted a **second time**, unguarded, at the consuming shell's public
 * route fallback level (`pivot-ui` `app.routes.ts` `SESSION_PUBLIC_ROUTE` /
 * `loadSessionPublicModule`).
 *
 * US19.2.1's AC is explicit: "Frontend : session-join (saisie code + displayName, page **publique
 * sans auth requise**)". A `ROLE_GUEST` participant has no PIVOT account and no bearer token by
 * construction (that is the entire point of anonymous participation) — nesting these routes only
 * inside {@link sessionRoutes} (itself gated by the shell's authenticated route tree AND
 * `moduleGuard('session')`, which itself requires a bearer token to check tenant module status)
 * would make them structurally unreachable by exactly the caller this US exists to serve.
 *
 * Mirrors this codebase's own established pattern for a route that must work regardless of auth
 * state — `pivot-ui` `app.routes.ts` registers `contact`/`legal`/`account/deletion/cancel`
 * identically twice: once inside the authenticated shell (so a logged-in user sees it within the
 * app chrome), once as a top-level public sibling (reached when the shell's `authMatchGuard`
 * returns `false` and the Router falls through to the next top-level route). Not gated by
 * `moduleGuard`: joining a session is scoped by the session's own join code, not the caller's own
 * tenant's module-activation state — a visitor from a tenant with the session module disabled (or
 * no tenant at all) must still be able to join *someone else's* session.
 */
export const sessionPublicRoutes: Routes = [
  {
    path: 'join',
    loadComponent: () => import('./session-join/session-join.component').then(m => m.SessionJoinComponent),
  },
  {
    path: ':sessionId/play',
    loadComponent: () =>
      import('./session-participant-shell/session-participant-shell.component').then(
        m => m.SessionParticipantShellComponent,
      ),
  },
  {
    path: ':sessionId/results',
    loadComponent: () =>
      import('./session-results/session-results.component').then(m => m.SessionResultsComponent),
  },
];
