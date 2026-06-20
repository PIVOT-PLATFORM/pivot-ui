import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-shell.component').then(m => m.AuthShellComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./pages/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
      {
        path: 'device-confirm',
        loadComponent: () => import('./pages/device-confirm/device-confirm.component').then(m => m.DeviceConfirmComponent),
      },
    ],
  },
];
