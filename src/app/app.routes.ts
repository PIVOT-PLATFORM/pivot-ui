import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authMatchGuard } from './core/auth/guard/auth.guard';
import { AuthService } from './core/auth/service/auth.service';
import { adminGuard } from './core/auth/guard/admin.guard';
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
 */
const MODULE_IDS = ['whiteboard', 'session', 'roadmap', 'survey', 'quiz'] as const;

const MODULE_CHILDREN: Routes = MODULE_IDS.map(id => ({
  path: id,
  canActivate: [moduleGuard(id)],
  loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
}));

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
        path: 'teams',
        loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
      },
      {
        path: 'admin/modules',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/modules/admin-modules.component').then(m => m.AdminModulesComponent),
      },
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
