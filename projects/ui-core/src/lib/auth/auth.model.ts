export interface UserInfo {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified: boolean;
  tenantId: number;
  tenantSlug: string;
  preferredLanguage?: string;
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
  rememberMe?: boolean;
}
