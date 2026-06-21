import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DeviceService } from './device.service';

export interface UserInfo {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified: boolean;
  tenantId: number;
  tenantSlug: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: number;
  user: UserInfo;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Login request aligned with backend LoginRequest.java (US-AUTH-002).
 * rememberMe = true → 30-day session via SESSION_TTL_REMEMBER_ME_SECONDS feature flag.
 */
export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
  deviceName?: string;
  rememberMe?: boolean;
}

/**
 * Core authentication service — manages the in-memory opaque session token lifecycle.
 *
 * Opaque token rules (per CLAUDE.md):
 * - Access token stored in memory ONLY — never in localStorage or cookie.
 * - Cookie (httpOnly, SameSite=Strict) is managed server-side for page reload persistence.
 * - Token rotation is handled server-side (TokenAuthenticationFilter) via X-New-Token header.
 * - TokenInterceptor reads X-New-Token and calls updateToken() to keep memory in sync.
 *
 * Session restore on page load: initSession() → POST /auth/refresh (reads session cookie server-side).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly deviceService = inject(DeviceService);
  private readonly apiUrl = environment.apiUrl;

  // Access token in memory only — never persisted to localStorage
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<UserInfo | null>(null);
  private readonly _tokenExpiresAt = signal<number>(0);

  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly currentUser = computed(() => this._user());
  readonly accessToken = computed(() => this._accessToken());
  readonly tokenExpiresAt = computed(() => this._tokenExpiresAt());

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

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, req, {
      withCredentials: true
    }).pipe(tap(res => this.storeAuth(res)));
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
    }, { withCredentials: true }).pipe(tap(res => this.storeAuth(res)));
  }

  /**
   * Restores session from the httpOnly session cookie (page reload path).
   * The server validates the cookie and returns the opaque token for in-memory storage.
   */
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

  /** Called on app init to restore session via httpOnly session cookie. */
  initSession(): Observable<AuthResponse> {
    return this.refresh();
  }

  /**
   * Updates the in-memory token after server-side rotation.
   * Called by TokenInterceptor when it detects an X-New-Token response header.
   *
   * @param rawToken   the new raw opaque token
   * @param expiresAt  epoch-millisecond expiry of the new token
   */
  updateToken(rawToken: string, expiresAt: number): void {
    this._accessToken.set(rawToken);
    this._tokenExpiresAt.set(expiresAt);
  }

  /** @deprecated Use DeviceService.getDeviceFingerprint() directly. */
  getDeviceFingerprint(): string {
    return this.deviceService.getDeviceFingerprint();
  }

  /** @deprecated Use DeviceService.getDeviceName() directly. */
  getDeviceName(): string {
    return this.deviceService.getDeviceName();
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
  }
}
