import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../../core/auth/service/auth.service';
import { DeviceService } from '../../../../core/auth/service/device.service';
import { PostLoginRedirectService } from '../../../../core/auth/service/post-login-redirect.service';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import type { AuthResponse } from '../../../../core/auth/service/auth.service';
import { GOOGLE_CLIENT_ID } from '../../../../app.config';

@Component({
  selector: 'piv-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly route = inject(ActivatedRoute);
  private readonly postLoginRedirect = inject(PostLoginRedirectService);
  private readonly googleClientId = inject(GOOGLE_CLIENT_ID);

  // Google OAuth flow not yet implemented — button always disabled until loginWithGoogle() is wired
  readonly googleEnabled = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  requiresDeviceVerification = signal(false);
  pendingFingerprint = signal<string | null>(null);
  pendingRememberMe = signal(false);

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    const fingerprint = this.deviceService.getDeviceFingerprint();
    const deviceName = this.deviceService.getDeviceName();

    this.auth.login({
      email: this.form.value.email!,
      password: this.form.value.password!,
      deviceFingerprint: fingerprint,
      deviceName,
      rememberMe: this.form.value.rememberMe ?? false,
    }).subscribe({
      next: (resp: HttpResponse<AuthResponse>) => {
        // 202 = MFA device requise → affiche l'alerte de vérification au lieu de naviguer.
        // On se fie au STATUT (contrat backend : 202 ⟺ device MFA) et non au header
        // X-Device-Verification-Required : en cross-origin il n'est pas exposé au JS sans
        // Access-Control-Expose-Headers, donc headers.get() renverrait null.
        if (resp.status === 202) {
          this.loading.set(false);
          this.pendingFingerprint.set(fingerprint);
          this.pendingRememberMe.set(this.form.value.rememberMe ?? false);
          this.requiresDeviceVerification.set(true);
          // US01.1.4 — le passage par /auth/device-confirm perd le query param :
          // on bascule le returnUrl en session Angular pour la fin du flux MFA.
          const returnUrl = this.returnUrlParam();
          if (returnUrl) this.postLoginRedirect.remember(returnUrl);
        } else {
          // US01.1.4 — redirection vers l'URL d'origine (returnUrl validé
          // contre l'open redirect), sinon /home.
          void this.postLoginRedirect.redirectAfterLogin(this.returnUrlParam());
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.mapError(err));
      },
    });
  }

  onGoogleLogin(): void {
    this.error.set('auth.login.error_google_not_configured');
  }

  /** Query param `returnUrl` de l'URL courante (`null` si absent) — US01.1.4. */
  private returnUrlParam(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 429) return 'auth.login.error_rate_limit';
    // RGPD : 401 et 403 retournent le même message générique
    // pour ne pas révéler si le compte existe, est bloqué ou non vérifié
    if (err.status === 401 || err.status === 403) return 'auth.login.error_generic_credentials';
    return 'auth.login.error_generic';
  }
}
