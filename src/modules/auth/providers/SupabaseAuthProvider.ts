/**
 * SupabaseAuthProvider
 * Concrete implementation of IAuthRepository interface for Supabase backend.
 * Easily replaceable by NodeAuthProvider, LaravelAuthProvider, or SelfHostedAuthProvider in future without changing UI or AuthService.
 */

import type { IAuthRepository } from '../repositories/AuthRepository';
import type {
  LoginCredentials,
  AuthResponse,
  MahaAgriSession,
  MahaAgriUser,
  MahaAgriRole,
  MahaAgriRoleKey,
  ResetPasswordRequest,
  ForcePasswordChangeRequest,
  AuditMetadata,
} from '../types/auth.types';
import { supabase } from '../../../lib/supabase/client';
import { normalizeMobileNumber } from '../validators/auth.validators';
import { MAHA_AGRI_ROLES_HIERARCHY } from '../constants/auth.constants';

export class SupabaseAuthProvider implements IAuthRepository {
  /**
   * Fetch normalized roles from `user_roles` joined with `roles` or `rbac_roles`
   */
  async getUserRoles(userId: string): Promise<MahaAgriRole[]> {
    try {
      // 1. Try normalized user_roles table join
      const { data: userRolesData, error: urErr } = await supabase
        .from('user_roles' as never)
        .select('role_id, roles:roles(*)' as never)
        .eq('user_id' as never, userId);

      if (!urErr && userRolesData && (userRolesData as unknown[]).length > 0) {
        const roles: MahaAgriRole[] = [];
        (userRolesData as Array<{ roles?: { id: string; key: string; name?: string; description?: string } }>).forEach((ur) => {
          if (ur.roles?.key) {
            const key = ur.roles.key.toUpperCase() as MahaAgriRoleKey;
            const meta = MAHA_AGRI_ROLES_HIERARCHY[key] ?? { name: ur.roles.name || key, level: 6 };
            roles.push({
              id: ur.roles.id,
              key,
              name: meta.name,
              description: ur.roles.description,
              hierarchy_level: meta.level,
            });
          }
        });
        if (roles.length > 0) return roles;
      }

      // 2. Fallback to existing profiles + rbac_roles join
      const { data: profile } = await supabase
        .from('profiles' as never)
        .select('*, role:rbac_roles(*)' as never)
        .eq('id' as never, userId)
        .maybeSingle();

      if (profile && (profile as { role?: { id: string; key: string; name?: string } }).role) {
        const rawRole = (profile as { role: { id: string; key: string; name?: string } }).role;
        const key = rawRole.key.toUpperCase() as MahaAgriRoleKey;
        const meta = MAHA_AGRI_ROLES_HIERARCHY[key] ?? { name: rawRole.name || key, level: 6 };
        return [
          {
            id: rawRole.id,
            key,
            name: meta.name,
            hierarchy_level: meta.level,
          },
        ];
      }

      // Default fallback if no role assigned yet
      return [
        {
          id: 'role-maha-agridoot',
          key: 'MAHA_AGRIDOOT',
          name: MAHA_AGRI_ROLES_HIERARCHY.MAHA_AGRIDOOT.name,
          hierarchy_level: 6,
        },
      ];
    } catch (err) {
      console.warn('[SupabaseAuthProvider] Failed to fetch user roles:', err);
      return [
        {
          id: 'role-maha-agridoot',
          key: 'MAHA_AGRIDOOT',
          name: 'MAHA-AGRIDOOT Field Staff',
          hierarchy_level: 6,
        },
      ];
    }
  }

  /**
   * Fetch current user profile record
   */
  async getCurrentUser(userId: string): Promise<MahaAgriUser | null> {
    try {
      const roles = await this.getUserRoles(userId);

      // Try users table
      const { data: userRec } = await supabase
        .from('users' as never)
        .select('*' as never)
        .eq('id' as never, userId)
        .maybeSingle();

      if (userRec) {
        const u = userRec as unknown as Record<string, unknown>;
        return {
          id: userId,
          employee_code: (u.employee_code as string) || `MA-${userId.slice(0, 6).toUpperCase()}`,
          mobile: (u.mobile as string) || '',
          full_name: (u.full_name as string) || 'User',
          email: (u.email as string) || undefined,
          status: (u.status as 'active' | 'inactive') || 'active',
          first_login: Boolean(u.first_login),
          state_id: (u.state_id as string) || undefined,
          region_id: (u.region_id as string) || undefined,
          district_id: (u.district_id as string) || undefined,
          taluka_id: (u.taluka_id as string) || undefined,
          last_login: (u.last_login as string) || undefined,
          created_at: (u.created_at as string) || new Date().toISOString(),
          updated_at: (u.updated_at as string) || undefined,
          deleted_at: (u.deleted_at as string) || null,
          roles,
        };
      }

      // Fallback to profiles table
      const { data: profRec } = await supabase
        .from('profiles' as never)
        .select('*' as never)
        .eq('id' as never, userId)
        .maybeSingle();

      const p = (profRec as unknown as Record<string, unknown>) ?? {};
      const authUser = (await supabase.auth.getUser()).data.user;

      return {
        id: userId,
        employee_code: (p.employee_code as string) || `MA-${userId.slice(0, 6).toUpperCase()}`,
        mobile: normalizeMobileNumber((p.phone as string) || (authUser?.phone as string) || (authUser?.user_metadata?.phone as string) || ''),
        full_name: (p.full_name as string) || (authUser?.user_metadata?.full_name as string) || 'MAHA-AGRI User',
        email: (p.email as string) || authUser?.email || undefined,
        status: p.is_active === false ? 'inactive' : 'active',
        first_login: Boolean(p.is_first_login ?? (authUser?.app_metadata as Record<string, unknown>)?.is_first_login ?? false),
        created_at: (p.created_at as string) || new Date().toISOString(),
        roles,
      };
    } catch (err) {
      console.error('[SupabaseAuthProvider] getCurrentUser error:', err);
      return null;
    }
  }

  /**
   * Login with Mobile Number or Admin Email + Password
   */
  async loginWithMobileAndPassword(credentials: LoginCredentials): Promise<AuthResponse<MahaAgriSession>> {
    try {
      const input = (credentials.mobile || '').trim();
      if (!input) {
        return { success: false, error: 'Please enter a valid mobile number or email.' };
      }

      const isEmail = input.includes('@');
      let targetEmail: string | null = null;
      let mobile = '';

      if (isEmail) {
        targetEmail = input.toLowerCase();
      } else {
        mobile = normalizeMobileNumber(input);
        if (!mobile) {
          return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
        }

        // Check if this mobile or employee code corresponds to a known administrative seed account
        const { ENTERPRISE_SEED_ACCOUNTS } = await import('../seed/demoAccounts');
        const seedUser = ENTERPRISE_SEED_ACCOUNTS.find(
          (acc) => acc.mobile === mobile || acc.employeeCode.toLowerCase() === input.toLowerCase()
        );
        if (seedUser) {
          targetEmail = seedUser.roleKey === 'SUPER_ADMIN'
            ? 'super_admin@abhinavbharat.org'
            : `${seedUser.roleKey.toLowerCase()}@abhinavbharat.org`;
        } else {
          // Synthetic mobile email fallback
          targetEmail = `${mobile}@mahaagri.org`;
        }
      }

      let authRes: { data: { session: any; user: any } | null; error: any } = { data: null, error: null };
      if (targetEmail) {
        authRes = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: credentials.password,
        });
      }

      if (authRes.error || !authRes.data?.user) {
        // Enforce staging/production security: Disable mock fallback when connected to live Supabase
        const isLiveSupabaseEnv = Boolean(import.meta.env.VITE_SUPABASE_URL);
        if (isLiveSupabaseEnv) {
          return {
            success: false,
            error: 'Invalid Employee ID or Password.',
          };
        }

        // DEVELOPMENT & UAT ENVIRONMENT SEED RESOLVER
        const { ENTERPRISE_SEED_ACCOUNTS } = await import('../seed/demoAccounts');
        const seedUser = ENTERPRISE_SEED_ACCOUNTS.find(
          (acc) => acc.mobile === mobile || acc.employeeCode.toLowerCase() === credentials.mobile.toLowerCase()
        ) || ENTERPRISE_SEED_ACCOUNTS[0]; // Fallback to Super Admin for dev testing if unlisted mobile

        const roleKey = seedUser.roleKey as MahaAgriRoleKey;
        const demoUser: MahaAgriUser = {
          id: seedUser.id,
          employee_code: seedUser.employeeCode,
          mobile: seedUser.mobile,
          full_name: seedUser.fullName,
          email: `${seedUser.roleKey.toLowerCase()}@abhinavbharat.org`,
          status: seedUser.status,
          first_login: false,
          created_at: new Date().toISOString(),
          roles: [
            {
              id: `role-${seedUser.roleKey.toLowerCase()}`,
              key: roleKey,
              name: seedUser.roleName,
              hierarchy_level: 1,
            },
          ],
        };

        const demoSession: MahaAgriSession = {
          sessionId: `sess_${seedUser.id}_${Date.now()}`,
          user: demoUser,
          activeRole: demoUser.roles[0],
          token: 'demo-jwt-access-token',
          expiresAt: Date.now() + 86400000,
        };

        // Attach platform & target dashboard metadata to session
        (demoSession as unknown as Record<string, unknown>).platform = seedUser.platform;
        (demoSession as unknown as Record<string, unknown>).targetDashboard = seedUser.targetDashboard;
        (demoSession as unknown as Record<string, unknown>).permissions = seedUser.permissions;

        // Save to localStorage for cross-context compatibility
        localStorage.setItem('maha_agri_auth_session', JSON.stringify(demoSession));

        const isRootAdmin = roleKey === 'ROOT_SUPER_ADMIN';
        const isMultiWorkspaceRole = roleKey === 'SUPER_ADMIN' || roleKey === 'STATE_ADMIN';

        if (isRootAdmin) {
          (demoSession as unknown as Record<string, unknown>).targetDashboard = '/root/control-center';
        }

        const workspaceRoles = isMultiWorkspaceRole
          ? [
              { id: 'role-abf', key: roleKey, name: `${seedUser.roleName} (ABF Enterprise)`, hierarchy_level: 1 },
              { id: 'role-maha', key: roleKey, name: `${seedUser.roleName} (MAHA-AGRI Platform)`, hierarchy_level: 1 },
            ]
          : demoUser.roles;

        return {
          success: true,
          data: demoSession,
          requiresRoleSelection: isMultiWorkspaceRole,
          roles: workspaceRoles,
        };
      }

      const user = await this.getCurrentUser(authRes.data.user.id);
      if (!user) {
        return { success: false, error: 'User record not found.' };
      }

      if (user.status === 'inactive' || user.status === 'suspended') {
        return { success: false, error: 'Your account is deactivated. Please contact administrator.' };
      }

      const roles = user.roles;
      const primaryRole = roles[0] ?? {
        id: 'role-default',
        key: 'MAHA_AGRIDOOT',
        name: 'MAHA-AGRIDOOT Field Staff',
        hierarchy_level: 6,
      };

      const session: MahaAgriSession = {
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user,
        activeRole: primaryRole,
        token: authRes.data.session?.access_token ?? '',
        expiresAt: (authRes.data.session?.expires_at ?? 0) * 1000,
      };

      try {
        localStorage.setItem('maha_agri_auth_session', JSON.stringify(session));
      } catch (storageErr) {
        console.warn('[SupabaseAuthProvider] Failed to persist session to localStorage:', storageErr);
      }

      const requiresFirstLoginPasswordChange = user.first_login;
      const requiresRoleSelection = roles.length > 1;

      return {
        success: true,
        data: session,
        requiresFirstLoginPasswordChange,
        requiresRoleSelection,
        roles,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Login failed due to unexpected error.',
      };
    }
  }

  /**
   * Request password reset OTP
   */
  async requestPasswordResetOtp(mobile: string): Promise<AuthResponse<{ otpSent: boolean }>> {
    try {
      const cleaned = normalizeMobileNumber(mobile);
      if (!cleaned) return { success: false, error: 'Invalid mobile number.' };

      // Trigger OTP Edge Function / WhatAPI
      const { data, error } = await supabase.functions.invoke('whatsapp', {
        body: { action: 'generateOtp', phone: cleaned },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { otpSent: true } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to request OTP.' };
    }
  }

  /**
   * Reset Password with OTP
   */
  async resetPasswordWithOtp(request: ResetPasswordRequest): Promise<AuthResponse<boolean>> {
    try {
      const mobile = normalizeMobileNumber(request.mobile);

      // Verify OTP via Edge function
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('whatsapp', {
        body: { action: 'verifyOtp', phone: mobile, token: request.otp },
      });

      if (verifyErr || !verifyData?.success) {
        return { success: false, error: verifyErr?.message || verifyData?.error || 'Invalid OTP code.' };
      }

      // Update password for user
      if (verifyData.password) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password: request.newPassword,
        });
        if (updateErr) {
          return { success: false, error: updateErr.message };
        }
      }

      return { success: true, data: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Password reset failed.' };
    }
  }

  /**
   * Force change password on First Login
   */
  async forceChangePassword(request: ForcePasswordChangeRequest): Promise<AuthResponse<boolean>> {
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: request.newPassword,
        data: { is_first_login: false },
      });

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      // Update users table flag
      await supabase
        .from('users' as never)
        .update({ first_login: false } as never)
        .eq('id' as never, request.userId);

      await supabase
        .from('profiles' as never)
        .update({ is_first_login: false } as never)
        .eq('id' as never, request.userId);

      return { success: true, data: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update password.' };
    }
  }

  /**
   * Logout session
   */
  async logout(_sessionId?: string): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[SupabaseAuthProvider] Logout warning:', err);
    }
  }

  /**
   * Log Security Audit Event with rich metadata
   */
  async logAuditEvent(entry: AuditMetadata): Promise<void> {
    try {
      await supabase.from('security_audit_logs' as never).insert([
        {
          event_type: entry.event,
          user_id: entry.userId || null,
          employee_code: entry.employeeCode || null,
          role_key: entry.roleKey || null,
          device: entry.device || null,
          browser: entry.browser || null,
          operating_system: entry.operatingSystem || null,
          ip_address: entry.ipAddress || null,
          gps_latitude: entry.gpsCoordinates?.latitude || null,
          gps_longitude: entry.gpsCoordinates?.longitude || null,
          result: entry.result,
          reason: entry.reason || null,
          session_id: entry.sessionId || null,
          created_at: entry.timestamp,
        },
      ] as never);
    } catch (err) {
      // Audit log failures should never crash application flow
      console.warn('[SupabaseAuthProvider] Audit log recording notice:', err);
    }
  }
}

export const defaultAuthProvider = new SupabaseAuthProvider();
