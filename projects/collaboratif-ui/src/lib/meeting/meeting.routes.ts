import { Routes } from '@angular/router';

/**
 * MeetOps (E12) route tree — the creation form (US12.1.1 AC1) and the roadmap booking-flow
 * organizer validation screen (US12.4.1). Exported for the consuming shell (`pivot-ui`) to mount
 * under a guarded path once EN12.2 ("Guard Angular module meetops") registers the `meetops`
 * module id in the shell's module registry/guard — see this US's pivot-docs "Dépendances" note.
 * Not wired into `pivot-ui`'s `app.routes.ts` by this US: doing so before EN12.2 exists would
 * make the route permanently unreachable (`moduleGuard` denies navigation for any unregistered
 * module id, see that guard's own TSDoc), the same ordering already established by
 * `whiteboardRoutes`/`sessionRoutes` and their own Enablers.
 */
export const meetingRoutes: Routes = [
  {
    path: 'new',
    loadComponent: () => import('./meeting-form/meeting-form.component').then(m => m.MeetingFormComponent),
  },
  {
    path: ':meetingId/validate',
    loadComponent: () =>
      import('./meeting-validation/meeting-validation.component').then(m => m.MeetingValidationComponent),
  },
];
