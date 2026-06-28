import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guard/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
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
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
      },
    ],
  },
  {
    path: 'legal',
    children: [
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
    ],
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
  },
  {
    path: 'faq',
    loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
  },
  {
    path: 'plan-du-site',
    loadComponent: () => import('./features/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent),
  },
  { path: '**', redirectTo: 'auth/login' },
];
