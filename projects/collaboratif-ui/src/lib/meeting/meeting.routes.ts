import { Routes } from '@angular/router';

/**
 * MeetOps (E12) route tree — creation form (US12.1.1 AC1) plus animation (US12.2.1): the
 * animator's `runner` view (start/agenda-next/end/actions) and the read-only participant `live`
 * view. Exported for the consuming shell (`pivot-ui`) to mount under a guarded path once EN12.2
 * ("Guard Angular module meetops") registers the `meetops` module id in the shell's module
 * registry/guard — see this US's pivot-docs "Dépendances" note. Not wired into `pivot-ui`'s
 * `app.routes.ts` by this US: doing so before EN12.2 exists would make the route permanently
 * unreachable (`moduleGuard` denies navigation for any unregistered module id, see that guard's
 * own TSDoc), the same ordering already established by `whiteboardRoutes`/`sessionRoutes` and
 * their own Enablers.
 */
export const meetingRoutes: Routes = [
  {
    path: 'new',
    loadComponent: () => import('./meeting-form/meeting-form.component').then(m => m.MeetingFormComponent),
  },
  {
    path: 'runner/:meetingId',
    loadComponent: () =>
      import('./meeting-runner/meeting-runner.component').then(m => m.MeetingRunnerComponent),
  },
  {
    path: 'live/:meetingId',
    loadComponent: () =>
      import('./meeting-participant-shell/meeting-participant-shell.component').then(
        m => m.MeetingParticipantShellComponent,
      ),
  },
];
