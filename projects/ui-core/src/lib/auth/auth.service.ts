import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { PIVOT_API_URL } from '../config/tokens';
import type { UserInfo, AuthResponse, LoginRequest, RegisterRequest } from './auth.model';

/**
 * Core authentication service — manages the in-memory opaque session token lifecycle.
 *
 * Access token stored in memory ONLY — never in localStorage or cookie.
 * Provide PIVOT_API_URL in the consuming app's providers.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(PIVOT_API_URL);

  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<UserInfo | null>(null);
  private readonly _tokenExpiresAt = signal<number>(0);
  private readonly _rememberMe = signal<boolean>(false);

  isAuthenticated(): boolean {
    return this._accessToken() !== null && this._tokenExpiresAt() > Date.now();
  }

  readonly currentUser = computed(() => this._user());
  readonly accessToken = computed(() => this._accessToken());
  readonly tokenExpiresAt = computed(() => this._tokenExpiresAt());
  readonly rememberMe = computed(() => this._rememberMe());

  millisUntilExpiry(): number {
    return this._accessToken() === null ? 0 : Math.max(0, this._tokenExpiresAt() - Date.now());
  }

  register(req: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/register`, req);
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/verify-email`, null, {
      params: { token }
    });
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/resend-verification`, null, {
      params: { email }
    });
  }

  checkResetToken(token: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/auth/check-reset-token`, {
      params: { token }
    });
  }

  login(req: LoginRequest): Observable<HttpResponse<AuthResponse>> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, req, {
      withCredentials: true,
      observe: 'response',
    }).pipe(tap(resp => {
      if (resp.status === 200 && resp.body) {
        this.storeAuth(resp.body);
        this._rememberMe.set(req.rememberMe ?? false);
      }
    }));
  }

  loginWithGoogle(idToken: string, deviceFingerprint?: string, deviceName?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, {
      idToken, deviceFingerprint, deviceName
    }, { withCredentials: true }).pipe(tap(res => this.storeAuth(res)));
  }

  exchangeOidc(tenantSlug: string, accessToken: string, deviceFingerprint?: string, deviceName?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/oidc/exchange`, {
      tenantSlug, accessToken, deviceFingerprint, deviceName
    }, { withCredentials: true }).pipe(tap(res => this.storeAuth(res)));
  }

  getOidcConfig(tenantSlug: string): Observable<{ issuerUri: string; clientId: string; scopes: string }> {
    return this.http.get<{ issuerUri: string; clientId: string; scopes: string }>(
      `${this.apiUrl}/auth/oidc/config`, { params: { tenantSlug } });
  }

  verifyDeviceOtp(deviceFingerprint: string, otp: string, deviceName?: string, rememberMe?: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/device/verify`, {
      deviceFingerprint, otp, deviceName, rememberMe: rememberMe ?? false
    }, { withCredentials: true }).pipe(tap(res => {
      this.storeAuth(res);
      this._rememberMe.set(rememberMe ?? false);
    }));
  }

  refresh(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, null, {
      withCredentials: true
    }).pipe(
      tap(res => this.storeAuth(res)),
      catchError(err => {
        this.clearAuth();
        return throwError(() => err);
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, null, {
      withCredentials: true
    }).pipe(tap(() => {
      this.clearAuth();
      this.router.navigate(['/auth/login']);
    }));
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/account/password`, {
      currentPassword, newPassword
    }).pipe(tap(res => this.storeAuth(res)));
  }

  initSession(): Observable<AuthResponse> {
    return this.refresh();
  }

  updateToken(rawToken: string, expiresAt: number): void {
    this._accessToken.set(rawToken);
    this._tokenExpiresAt.set(expiresAt);
  }

  clearSession(): void {
    this.clearAuth();
  }

  private storeAuth(res: AuthResponse): void {
    this._accessToken.set(res.accessToken);
    this._user.set(res.user);
    this._tokenExpiresAt.set(res.expiresAt);
  }

  private clearAuth(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._tokenExpiresAt.set(0);
    this._rememberMe.set(false);
  }
}
