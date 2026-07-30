/**
 * MAHA-AGRI Enterprise Authentication - Type Definitions
 * Strict enterprise types for User, Normalized Roles, Multi-Geography Assignment, Session, Audit Metadata, and Contracts.
 */

export type MahaAgriRoleKey =
  | 'SUPER_ADMIN'
  | 'STATE_ADMIN'
  | 'REGIONAL_MANAGER'
  | 'DISTRICT_COORDINATOR'
  | 'TALUKA_COORDINATOR'
  | 'MAHA_AGRIDOOT';

export interface MahaAgriRole {
  id: string;
  key: MahaAgriRoleKey;
  name: string;
  description?: string;
  hierarchy_level: number; // 1: Super Admin down to 6: MAHA-AGRIDOOT
  permissions?: string[];  // Data-driven permissions keys
}

export type UserAccountStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface MahaAgriUser {
  id: string;
  employee_code: string; // HR Internal Identifier e.g. MA-000154
  mobile: string;        // Login ID
  full_name: string;
  email?: string;
  status: UserAccountStatus;
  first_login: boolean;  // Triggers forced password change
  
  // Normalized Multi-Geography Assignments
  assigned_state_ids?: string[];
  assigned_region_ids?: string[];
  assigned_district_ids?: string[];
  assigned_taluka_ids?: string[];

  last_login?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null; // Soft delete
  roles: MahaAgriRole[];       // Normalized assigned roles
}

export interface MahaAgriSession {
  sessionId: string;
  user: MahaAgriUser;
  activeRole: MahaAgriRole;
  token: string;
  expiresAt: number;
  permissions?: Set<string>;   // Data-driven RBAC permissions set
}

export type SecurityAuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'FORGOT_PASSWORD_REQUEST'
  | 'OTP_REQUEST'
  | 'OTP_VERIFICATION'
  | 'ROLE_SWITCH'
  | 'SESSION_EXPIRED';

export interface AuditMetadata {
  eventId?: string;
  event: SecurityAuditEvent;
  userId?: string;
  employeeCode?: string;
  roleKey?: MahaAgriRoleKey;
  device?: string;
  browser?: string;
  operatingSystem?: string;
  ipAddress?: string;
  gpsCoordinates?: { latitude: number; longitude: number } | null;
  timestamp: string;
  sessionId?: string;
  result: 'SUCCESS' | 'FAILURE';
  reason?: string;
}

export interface LoginCredentials {
  mobile: string;
  password: string;
}

export interface ResetPasswordRequest {
  mobile: string;
  otp: string;
  newPassword: string;
}

export interface ForcePasswordChangeRequest {
  userId: string;
  currentPassword?: string;
  newPassword: string;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  requiresFirstLoginPasswordChange?: boolean;
  requiresRoleSelection?: boolean;
  roles?: MahaAgriRole[];
}
