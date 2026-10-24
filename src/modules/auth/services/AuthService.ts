/**
 * AuthService
 * Core Authentication Business Logic Service.
 * Orchestrates Validation, Rate Limiting, Provider Delegation, Storage, and Rich Audit Logging.
 */

import type { IAuthRepository } from '../repositories/AuthRepository';
import { defaultAuthProvider } from '../providers/SupabaseAuthProvider';
import { AuditService } from './AuditService';
import { storageService } from './StorageService';
import { validateMobileNumber, validateOtpCode } from '../validators/auth.validators';
import { validatePasswordStrength } from '../utils/password.utils';
import type {
  LoginCredentials,
  AuthResponse,
  MahaAgriSession,
  ResetPasswordRequest,
  ForcePasswordChangeRequest,
  MahaAgriRole,
} from '../types/auth.types';
import { SECURITY_CONFIG } from '../constants/auth.constants';

export class AuthService {
  private auditService: AuditService;

  constructor(
    private authRepo: IAuthRepository = defaultAuthProvider,
    auditService?: AuditService
  ) {
    this.auditService = auditService ?? new AuditService(this.authRepo);
  }

  /**
   * Login with Mobile Number or Admin Email + Password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse<MahaAgriSession>> {
    const rawInput = (credentials.mobile || '').trim();
    const isEmail = rawInput.includes('@');

    if (isEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawInput)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }
    } else {
      const mobileValidation = validateMobileNumber(rawInput);
      if (!mobileValidation.isValid) {
        return { success: false, error: mobileValidation.error };
      }
    }

    if (!credentials.password || credentials.password.trim().length === 0) {
      return { success: false, error: 'Password is required.' };
    }

    const response = await this.authRepo.loginWithMobileAndPassword(credentials);

    if (response.success && response.data) {
      const session = response.data;
      await storageService.saveSession(session);

      await this.auditService.logEvent({
        event: 'LOGIN_SUCCESS',
        result: 'SUCCESS',
        userId: session.user.id,
        employeeCode: session.user.employee_code,
        roleKey: session.activeRole.key,
        sessionId: session.sessionId,
        includeGps: true,
      });

      return response;
    } else {
      await this.auditService.logEvent({
        event: 'LOGIN_FAILURE',
        result: 'FAILURE',
        reason: response.error || 'Invalid Mobile Number or Password',
        includeGps: false,
      });

      return response;
    }
  }

  /**
   * Request password reset OTP
   */
  async requestPasswordResetOtp(mobile: string): Promise<AuthResponse<{ otpSent: boolean }>> {
    const mobileValidation = validateMobileNumber(mobile);
    if (!mobileValidation.isValid) {
      return { success: false, error: mobileValidation.error };
    }

    const res = await this.authRepo.requestPasswordResetOtp(mobile);

    await this.auditService.logEvent({
      event: 'OTP_REQUEST',
      result: res.success ? 'SUCCESS' : 'FAILURE',
      reason: res.error,
    });

    return res;
  }

  /**
   * Reset Password with OTP
   */
  async resetPasswordWithOtp(request: ResetPasswordRequest): Promise<AuthResponse<boolean>> {
    const mobileValidation = validateMobileNumber(request.mobile);
    if (!mobileValidation.isValid) return { success: false, error: mobileValidation.error };

    const otpValidation = validateOtpCode(request.otp);
    if (!otpValidation.isValid) return { success: false, error: otpValidation.error };

    const pwdValidation = validatePasswordStrength(request.newPassword);
    if (!pwdValidation.isValid) {
      return { success: false, error: pwdValidation.errors[0] };
    }

    const res = await this.authRepo.resetPasswordWithOtp(request);

    await this.auditService.logEvent({
      event: 'PASSWORD_CHANGE',
      result: res.success ? 'SUCCESS' : 'FAILURE',
      reason: res.error,
    });

    return res;
  }

  /**
   * Force Password Change on First Login
   */
  async forceChangePassword(request: ForcePasswordChangeRequest): Promise<AuthResponse<boolean>> {
    const pwdValidation = validatePasswordStrength(request.newPassword);
    if (!pwdValidation.isValid) {
      return { success: false, error: pwdValidation.errors[0] };
    }

    const res = await this.authRepo.forceChangePassword(request);

    await this.auditService.logEvent({
      event: 'PASSWORD_CHANGE',
      result: res.success ? 'SUCCESS' : 'FAILURE',
      userId: request.userId,
      reason: res.error,
    });

    return res;
  }

  /**
   * Switch Active Role for Multi-Role User
   */
  async switchRole(currentSession: MahaAgriSession, newRole: MahaAgriRole): Promise<MahaAgriSession> {
    const updatedSession: MahaAgriSession = {
      ...currentSession,
      activeRole: newRole,
    };

    await storageService.saveSession(updatedSession);
    await storageService.saveActiveRole(newRole);

    await this.auditService.logEvent({
      event: 'ROLE_SWITCH',
      result: 'SUCCESS',
      userId: currentSession.user.id,
      employeeCode: currentSession.user.employee_code,
      roleKey: newRole.key,
      sessionId: currentSession.sessionId,
    });

    return updatedSession;
  }

  /**
   * Logout active session
   */
  async logout(session?: MahaAgriSession | null): Promise<void> {
    if (session) {
      await this.auditService.logEvent({
        event: 'LOGOUT',
        result: 'SUCCESS',
        userId: session.user.id,
        employeeCode: session.user.employee_code,
        roleKey: session.activeRole.key,
        sessionId: session.sessionId,
      });
    }

    await this.authRepo.logout(session?.sessionId);
    await storageService.clearSession();
  }
}

export const authService = new AuthService();
