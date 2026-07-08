import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authMatchGuard } from './core/auth/guard/auth.guard';
import { AuthService } from './core/auth/service/auth.service';
import { adminGuard } from './core/auth/guard/admin.guard';
import { superAdminGuard } from './core/auth/guard/super-admin.guard';
import { moduleGuard } from './core/modules/module.guard';

/**
 * Cible de redirection pour toute route inexistante (US01.1.4) :
 * - utilisateur authentifié → `/home` (un `returnUrl` pointant vers une route
 *   inconnue retombe donc sur /home après login) ;
 * - visiteur anonyme → `/auth/login` (comportement historique conservé).
 */
export const notFoundRedirect = (): string =>
  inject(AuthService).isAuthenticated() ? '/home' : '/auth/login';

/**
 * PIVOT module ids exposed as top-level shell routes, each gated by moduleGuard —
 * EN03.2 / US03.2.2. The routed component here is only a placeholder
 * (ComingSoonComponent): the real module UI ships from the dedicated pivot-xxx-ui
 * repos and is wired in at integration time — this shell only owns the guarded
 * route entry point and its lazy-loading boundary.
 *
 * `whiteboard` is the first module actually integrated (EN17.9) — excluded here and
 * given its own route below, lazy-loading the real `@pivot-platform/collaboratif-ui`
 * package instead of the placeholder.
 */
const MODULE_IDS = ['session', 'roadmap', 'survey', 'quiz'] as const;

const MODULE_CHILDREN: Routes = MODULE_IDS.map(id => ({
  path: id,
  canActivate: [moduleGuard(id)],
  loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
}));

/**
 * `whiteboard` — EN17.9. Guarded by the same `moduleGuard('whiteboard')` as every other
 * module (tenant activation status, unchanged contract) but `loadChildren`s the real
 * routes published by `@pivot-platform/collaboratif-ui` instead of `ComingSoonComponent`.
 */
const WHITEBOARD_ROUTE: Routes = [
  {
    path: 'whiteboard',
    canActivate: [moduleGuard('whiteboard')],
    loadChildren: () =>
      import('@pivot-platform/collaboratif-ui').then(m => m.COLLABORATIF_ROUTES),
  },
];

const LEGAL_CHILDREN: Routes = [
  {
    path: 'mentions-legales',
    loadComponent: () => import('./features/legal/legal-notice.component').then(m => m.LegalNoticeComponent),
  },
  {
    path: 'confidentialite',
    loadComponent: () => import('./features/legal/privacy.component').then(m => m.PrivacyComponent),
  },
  {
    path: 'cgu',
    loadComponent: () => import('./features/legal/terms.component').then(m => m.TermsComponent),
  },
  {
    path: 'accessibilite',
    loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
  },
];

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  // Public confirmation link (US02.2.2) — matched BEFORE the authenticated shell so it
  // works identically whether or not the visitor has an active session on this device
  // (the link is opened from an email, most often outside any logged-in browser tab).
  // Mirrors `/auth/verify-email`'s own-route pattern; this one lives under `/account`
  // because the backend hardcodes `{PIVOT_APP_URL}/account/email/confirm?token=...`
  // in the confirmation email (pivot-core PR #131) — the path is not ours to choose.
  {
    path: 'account/email/confirm',
    loadComponent: () =>
      import('./features/account/security/email-confirm/email-confirm.component').then(
        m => m.EmailConfirmComponent,
      ),
  },
  {
    path: '',
    canMatch: [authMatchGuard],
    loadComponent: () => import('./core/layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent),
      },
      {
        path: 'account/security',
        loadComponent: () =>
          import('./features/account/security/change-password/change-password.component').then(
            m => m.ChangePasswordComponent,
          ),
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
      },
      {
        path: 'account/profile',
        loadComponent: () => import('./features/account/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'account/security/email',
        loadComponent: () =>
          import('./features/account/security/change-email/change-email.component').then(
            m => m.ChangeEmailComponent,
          ),
      },
      {
        path: 'admin/modules',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/modules/admin-modules.component').then(m => m.AdminModulesComponent),
      },
      {
        path: 'superadmin/tenants/new',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/superadmin/tenants/create-tenant.component').then(m => m.CreateTenantComponent),
      },
      {
        path: 'superadmin/tenants',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/superadmin/tenants/tenants-list.component').then(m => m.TenantsListComponent),
      },
      {
        path: 'superadmin/plans',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/superadmin/plans/plans-list.component').then(m => m.PlansListComponent),
      },
      {
        path: 'superadmin/plans/:planId',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./features/superadmin/plans/plan-detail.component').then(m => m.PlanDetailComponent),
      },
      {
        // US02.2.3 — no extra guard beyond authMatchGuard on the parent shell route:
        // every authenticated user manages only their own sessions, resolved
        // server-side from the bearer token (never a client-supplied id).
        path: 'account/security/sessions',
        loadComponent: () =>
          import('./features/account/security/sessions/sessions-list.component').then(
            m => m.SessionsListComponent
          ),
      },
      {
        // US01.4.2 — trusted devices self-service screen, same no-extra-guard rationale as
        // account/security/sessions (US02.2.3): identity always resolved server-side.
        path: 'account/security/devices',
        loadComponent: () =>
          import('./features/account/security/trusted-devices/trusted-devices-list.component').then(
            m => m.TrustedDevicesListComponent
          ),
      },
      {
        // US02.3.1 — RGPD Art.20 data export request page ("Demander mon export").
        path: 'account/export',
        loadComponent: () => import('./features/account/pages/export/export.component').then(m => m.ExportComponent),
      },
      {
        // Landing route for the authenticated download link emailed once the
        // export is READY — matches the `{appUrl}/account/export/download?token=`
        // URL pivot-core's EmailService already sends (PR #133).
        path: 'account/export/download',
        loadComponent: () =>
          import('./features/account/pages/export-download/export-download.component').then(
            m => m.ExportDownloadComponent,
          ),
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/account/account-settings.component').then(m => m.AccountSettingsComponent),
      },
      ...WHITEBOARD_ROUTE,
      ...MODULE_CHILDREN,
      { path: 'legal', children: LEGAL_CHILDREN },
      {
        path: 'faq',
        loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
      },
      {
        path: 'plan-du-site',
        loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
      },
    ],
  },
  // Public fallback routes — accessible without authentication.
  // ContactComponent and legal pages are stateless (no auth dependency),
  // so loading them here is safe. authMatchGuard returns false (no redirect)
  // on unauthenticated requests, causing Angular to fall through to these routes.
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent),
  },
  // US02.2.4 — emailed "Annuler la suppression" link. Registered here (not under
  // the shell's authenticated children) because every session is revoked the
  // instant deletion is requested: by the time this link is clicked there is no
  // authenticated context left, so it must always render standalone regardless
  // of the current auth state.
  {
    path: 'account/deletion/cancel',
    loadComponent: () =>
      import('./features/account/deletion/account-deletion-cancel.component').then(
        m => m.AccountDeletionCancelComponent
      ),
  },
  { path: 'legal', children: LEGAL_CHILDREN },
  {
    path: 'faq',
    loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
  },
  {
    path: 'plan-du-site',
    loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
  },
  { path: '**', redirectTo: notFoundRedirect },
];
