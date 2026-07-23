import { Routes } from '@angular/router';
import { SessionListComponent } from './session-list/session-list.component';

/**
 * Module Session live (E19) route tree, mounted by the consuming shell under a guarded path
 * (`moduleGuard('session')`, see `pivot-ui` `app.routes.ts` `SESSION_ROUTE` / `loadSessionModule`
 * — US19.2.2). Mirrors `whiteboardRoutes`' shape (list at `''`, dedicated `join`/`new` routes,
 * a `:sessionId` detail subtree).
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
    // Results/export (US19.4.1/US19.4.2) — PR2/2 of E19, placeholder only in this PR.
    path: ':sessionId/results',
    loadComponent: () =>
      import('./session-results-placeholder/session-results-placeholder.component').then(
        m => m.SessionResultsPlaceholderComponent,
      ),
  },
];
