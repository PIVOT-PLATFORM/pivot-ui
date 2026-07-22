import { Routes } from '@angular/router';

/**
 * Real feature routes for the agilite module (planning poker, wheels, retrospectives), exposed as
 * a single `Routes` array to be mounted by the consuming shell under a guarded path (e.g.
 * `moduleGuard('agilite')` from `@pivot-platform/ui-core`). Mirrors EN17's `COLLABORATIF_ROUTES`.
 *
 * Every feature stays lazy-loaded — no massive barrel import. Tenant/team URL segments
 * (`:teamId`, `:sessionId`, `:wheelId`, `:roomId`) are preserved exactly as authored (US14.x,
 * US20.x, US09.x — see pivot-docs). The bare `''` landing (home) is deliberately NOT included
 * here: it is the shell's/host harness's responsibility, not this module's.
 */
export const AGILITE_ROUTES: Routes = [
  {
    // Landing agrégé du module (Daily / Roue d'équipe / Capacity) — comble le `/agilite` vide.
    path: '',
    loadComponent: () => import('./features/hub/agilite-hub.component').then(m => m.AgiliteHubComponent),
  },
  {
    path: 'wheels',
    loadComponent: () =>
      import('./features/wheels/wheel-list/wheel-list.component').then(m => m.WheelListComponent),
  },
  {
    path: 'wheels/new',
    loadComponent: () =>
      import('./features/wheels/wheel-form/wheel-form.component').then(m => m.WheelFormComponent),
  },
  {
    path: 'wheels/:wheelId/edit',
    loadComponent: () =>
      import('./features/wheels/wheel-form/wheel-form.component').then(m => m.WheelFormComponent),
  },
  {
    // US14.2.1 — page de détail : tirage pondéré anti-repeat + historique des tirages.
    path: 'wheels/:wheelId',
    loadComponent: () =>
      import('./features/wheels/wheel-detail/wheel-detail.component').then(
        m => m.WheelDetailComponent,
      ),
  },
  {
    // US20.1.1 — création d'une session de rétrospective.
    path: 'retro/create',
    loadComponent: () =>
      import('./features/retro/create-session/create-session.component').then(
        m => m.CreateSessionComponent,
      ),
  },
  {
    // US20.1.2a — animation temps réel (contribution masquée + révélation) d'une session.
    path: 'retro/sessions/:sessionId',
    loadComponent: () =>
      import('./features/retro/session-room/session-room.component').then(
        m => m.SessionRoomComponent,
      ),
  },
  {
    // US20.3.1 — "Actions de l'équipe" : consultable hors contexte de session, filtrable par
    // statut, triable par échéance.
    path: 'retro/teams/:teamId/actions',
    loadComponent: () =>
      import('./features/retro/team-actions/team-actions.component').then(
        m => m.TeamActionsComponent,
      ),
  },
  {
    // US10.1.1 — liste des sessions daily standup de l'équipe sélectionnée.
    path: 'standup',
    loadComponent: () =>
      import('./features/standup/standup-list/standup-list.component').then(m => m.StandupListComponent),
  },
  {
    // US10.1.1 — création d'une nouvelle session daily standup.
    path: 'standup/new',
    loadComponent: () =>
      import('./features/standup/standup-form/standup-form.component').then(m => m.StandupFormComponent),
  },
  {
    // US10.3.1 — statistiques des sessions daily standup terminées.
    path: 'standup/stats',
    loadComponent: () =>
      import('./features/standup/standup-stats/standup-stats.component').then(m => m.StandupStatsComponent),
  },
  {
    // US10.1.2/US10.2.1/US10.2.2 — vue "runner" temps réel d'une session daily standup.
    path: 'standup/sessions/:sessionId',
    loadComponent: () =>
      import('./features/standup/standup-runner/standup-runner.component').then(m => m.StandupRunnerComponent),
  },
  {
    // US50.1.1 — liste des cycles PI accessibles à l'appelant.
    path: 'pi',
    loadComponent: () =>
      import('./features/pi-planning/pi-cycle-list/pi-cycle-list.component').then(m => m.PiCycleListComponent),
  },
  {
    // US50.1.1 — création d'un nouveau cycle PI.
    path: 'pi/new',
    loadComponent: () =>
      import('./features/pi-planning/pi-cycle-form/pi-cycle-form.component').then(m => m.PiCycleFormComponent),
  },
  {
    // US50.3.1/US50.3.2 — Program Board (matrice équipes × itérations, dépendances).
    path: 'pi/:cycleId/board',
    loadComponent: () =>
      import('./features/pi-planning/pi-program-board/pi-program-board.component').then(
        m => m.PiProgramBoardComponent,
      ),
  },
  {
    // US50.1.1 — détail d'un cycle PI (itérations, équipes du Train).
    path: 'pi/:cycleId',
    loadComponent: () =>
      import('./features/pi-planning/pi-cycle-detail/pi-cycle-detail.component').then(
        m => m.PiCycleDetailComponent,
      ),
  },
  {
    // US11.1.1 — liste des événements de capacité de l'équipe sélectionnée.
    path: 'capacity',
    loadComponent: () =>
      import('./features/capacity/capacity-event-list/capacity-event-list.component').then(
        m => m.CapacityEventListComponent,
      ),
  },
  {
    // US11.1.1 — création d'un nouvel événement de capacité.
    path: 'capacity/new',
    loadComponent: () =>
      import('./features/capacity/capacity-event-form/capacity-event-form.component').then(
        m => m.CapacityEventFormComponent,
      ),
  },
  {
    // US11.4.2 — burndown chart d'un événement SPRINT.
    path: 'capacity/:eventId/burndown',
    loadComponent: () =>
      import('./features/capacity/capacity-burndown-chart/capacity-burndown-chart.component').then(
        m => m.CapacityBurndownChartComponent,
      ),
  },
  {
    // US11.1.1/US11.1.2/US11.2.1/US11.2.2/US11.3.1/US11.4.1 — détail d'un événement de capacité.
    path: 'capacity/:eventId',
    loadComponent: () =>
      import('./features/capacity/capacity-event-detail/capacity-event-detail.component').then(
        m => m.CapacityEventDetailComponent,
      ),
  },
  {
    path: 'scrum-poker/rooms/new',
    loadComponent: () =>
      import('./features/scrum-poker/create-room/create-room.component').then(
        m => m.CreateRoomComponent,
      ),
  },
  {
    path: 'scrum-poker/rooms/join',
    loadComponent: () =>
      import('./features/scrum-poker/join-room/join-room.component').then(
        m => m.JoinRoomComponent,
      ),
  },
];
