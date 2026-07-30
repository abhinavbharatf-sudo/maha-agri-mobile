/**
 * AuthRepository Interface Contract
 * Abstracts the authentication backend so Supabase can be replaced by Node/Laravel/Self-Hosted Auth seamlessly.
 */

import type {
  LoginCredentials,
  AuthResponse,
  MahaAgriSession,
  MahaAgriUser,
  MahaAgriRole,
  ResetPasswordRequest,
  ForcePasswordChangeRequest,
  AuditMetadata,
} from '../types/auth.types';

export interface IAuthRepository {
  /**
   * Authenticate user with Mobile Number + Password
   */
  loginWithMobileAndPassword(credentials: LoginCredentials): Promise<AuthResponse<MahaAgriSession>>;

  /**
   * Request OTP for password reset
   */
  requestPasswordResetOtp(mobile: string): Promise<AuthResponse<{ otpSent: boolean }>>;

  /**
   * Verify OTP and set a new password
   */
  resetPasswordWithOtp(request: ResetPasswordRequest): Promise<AuthResponse<boolean>>;

  /**
   * Change password required on First Login
   */
  forceChangePassword(request: ForcePasswordChangeRequest): Promise<AuthResponse<boolean>>;

  /**
   * Fetch normalized roles for a given user ID
   */
  getUserRoles(userId: string): Promise<MahaAgriRole[]>;

  /**
   * Fetch current authenticated user details
   */
  getCurrentUser(userId: string): Promise<MahaAgriUser | null>;

  /**
   * Sign out the active session
   */
  logout(sessionId?: string): Promise<void>;

  /**
   * Log security audit event
   */
  logAuditEvent(entry: AuditMetadata): Promise<void>;
}
