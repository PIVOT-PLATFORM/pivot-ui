import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, timer, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint?: string;
  deviceName?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Access token in memory only — never persisted to localStorage
  private _accessToken = signal<string | null>(null);
  private _user = signal<UserInfo | null>(null);
  private _tokenExpiresAt = signal<number>(0);
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly currentUser = computed(() => this._user());
  readonly accessToken = computed(() => this._accessToken());

  constructor(private http: HttpClient, private router: Router) {}

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

  verifyDeviceOtp(deviceFingerprint: string, otp: string, deviceName?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/device/verify`, {
      deviceFingerprint, otp, deviceName
    }, { withCredentials: true }).pipe(tap(res => this.storeAuth(res)));
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

  /** Called on app init to restore session via refresh cookie */
  initSession(): Observable<AuthResponse> {
    return this.refresh();
  }

  private storeAuth(res: AuthResponse): void {
    this._accessToken.set(res.accessToken);
    this._user.set(res.user);
    this._tokenExpiresAt.set(res.expiresAt);
    this.scheduleRefresh(res.expiresAt);
  }

  private clearAuth(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._tokenExpiresAt.set(0);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  // Auto-refresh 60s before expiry
  private scheduleRefresh(expiresAt: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delay = expiresAt - Date.now() - 60_000;
    if (delay > 0) {
      this.refreshTimer = setTimeout(() => this.refresh().subscribe(), delay);
    }
  }

  getDeviceFingerprint(): string {
    const nav = window.navigator;
    const raw = `${nav.userAgent}|${nav.language}|${window.screen.width}x${window.screen.height}|${nav.hardwareConcurrency}`;
    return btoa(raw).substring(0, 64);
  }

  getDeviceName(): string {
    const ua = window.navigator.userAgent;
    const browser = ua.includes('Firefox') ? 'Firefox'
      : ua.includes('Edg') ? 'Edge'
      : ua.includes('Chrome') ? 'Chrome'
      : ua.includes('Safari') ? 'Safari'
      : 'Navigateur';
    const os = ua.includes('Windows') ? 'Windows'
      : ua.includes('Mac') ? 'macOS'
      : ua.includes('Linux') ? 'Linux'
      : ua.includes('Android') ? 'Android'
      : ua.includes('iOS') ? 'iOS'
      : 'OS inconnu';
    return `${browser} · ${os}`;
  }
}
