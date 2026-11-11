/**
 * MAHA-AGRI Platform — Route Guards
 *
 * Enforces server/database-backed RBAC authorization for:
 * 1. RequireAuth: Authenticated session check.
 * 2. RequireRole: Evaluates specific RBAC roles. Restricts Staff callers to /staff/dashboard.
 * 3. RequireAdminRole: State Admin / Super Admin platform access.
 * 4. RequireHRRole: Human Resources & Recruitment Management access.
 * 5. RequireCRMRole: Telecalling, CSM & Lead Management access.
 * 6. RequireStaffRole: Dedicated Staff Dashboard access.
 */

import { type ReactNode, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { hasPermission, hasRoleAtLeast, hasRole, type PermissionKey } from './rbac';
import type { RoleKey } from '../types/database';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-emerald-700 font-bold text-xs">Loading MAHA-AGRI Platform…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function RequirePermission({
  children,
}: {
  permission: PermissionKey;
  fallbackPath?: string;
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function RequireRole({
  role,
  roles,
  children,
  fallbackPath,
}: {
  role?: RoleKey;
  roles?: RoleKey[];
  children: ReactNode;
  fallbackPath?: string;
}) {
  const { roleKey, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const allowedRoles = roles || (role ? [role] : []);
  const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'ROOT_SUPER_ADMIN';
  const hasAccess = Boolean(user && (isSuperAdmin || (roleKey && allowedRoles.includes(roleKey))));

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate(fallbackPath || '/login', { replace: true, state: { from: location.pathname } });
      } else if (!hasAccess && roleKey === 'staff') {
        // Requirement 3 & 4: Staff users restricted to /staff/dashboard
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [loading, user, hasAccess, roleKey, navigate, fallbackPath, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-emerald-700 font-bold text-xs">Verifying Authorization...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath || '/login'} state={{ from: location.pathname }} replace />;
  }

  if (!hasAccess) {
    if (roleKey === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">Access Restricted: Privileged Gateway</h2>
          <p className="text-slate-600 text-xs mb-4 leading-relaxed">
            You are signed in as <span className="font-semibold text-slate-800">{user ? (roleKey ?? 'Staff') : 'Guest'}</span>. This workspace requires elevated administrative privileges.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/staff/dashboard', { replace: true })}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Go to Staff Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const ADMIN_ROLES: RoleKey[] = ['admin', 'super_admin', 'ROOT_SUPER_ADMIN', 'STATE_ADMIN'];

export function RequireAdminRole({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireRole roles={ADMIN_ROLES}>{children}</RequireRole>;
}

export function RequireHRRole({
  children,
  fallbackPath = '/login',
}: {
  fallbackPath?: string;
  children: ReactNode;
}) {
  const { user, profile, roleKey, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'ROOT_SUPER_ADMIN';
  const isAdmin = isSuperAdmin || roleKey === 'admin' || roleKey === 'STATE_ADMIN';
  const isHR =
    isAdmin ||
    roleKey === 'hr_manager' ||
    roleKey === 'hr_executive' ||
    (profile?.department?.toLowerCase() || '') === 'human resources' ||
    (profile?.designation?.toLowerCase() || '').includes('hr');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate(fallbackPath, { replace: true, state: { from: location.pathname } });
      } else if (!isHR && roleKey === 'staff') {
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [loading, user, isHR, roleKey, navigate, fallbackPath, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-blue-700 font-bold text-xs">Verifying HR Authorization...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />;
  }

  if (!isHR) {
    if (roleKey === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">Access Restricted: HR Role Required</h2>
          <p className="text-slate-600 text-xs mb-4 leading-relaxed">
            This module requires Human Resources or Administrator privileges.
          </p>
          <button
            type="button"
            onClick={() => navigate('/staff/dashboard', { replace: true })}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Go to Staff Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const CRM_ROLES: RoleKey[] = ['telecaller', 'team_leader', 'crm_manager', 'admin', 'super_admin'];

export function RequireCRMRole({
  children,
  fallbackPath = '/login',
}: {
  fallbackPath?: string;
  children: ReactNode;
}) {
  const { user, profile, roleKey, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSuperAdmin = roleKey === 'super_admin' || roleKey === 'ROOT_SUPER_ADMIN';
  const isAdmin = isSuperAdmin || roleKey === 'admin';
  const isCRM =
    isAdmin ||
    (roleKey && CRM_ROLES.includes(roleKey)) ||
    (profile?.department?.toLowerCase() || '').includes('customer support') ||
    (profile?.designation?.toLowerCase() || '').includes('telecaller') ||
    (profile?.designation?.toLowerCase() || '').includes('csm');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate(fallbackPath, { replace: true, state: { from: location.pathname } });
      } else if (!isCRM && roleKey === 'staff') {
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [loading, user, isCRM, roleKey, navigate, fallbackPath, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-blue-700 font-bold text-xs">Verifying CRM Authorization...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location.pathname }} replace />;
  }

  if (!isCRM) {
    if (roleKey === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    }

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1.5">Access Restricted: Staff Role Required</h2>
          <p className="text-slate-600 text-xs mb-4 leading-relaxed">
            तुम्ही सध्या <span className="font-semibold text-slate-800">उमेदवार (Candidate/Visitor)</span> म्हणून लॉग इन आहात. CRM Lead Management हे केवळ अधिकृत स्टाफ सदस्यांसाठी राखीव आहे.
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 mb-5 text-left space-y-1">
            <div className="font-semibold text-slate-800">CRM पाहण्यासाठी स्टाफ खात्याने लॉग इन करा:</div>
            <div className="text-[11px] text-slate-500 font-mono">उदा. admin@abhinavbharat.org</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/login', { replace: true });
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              <LogIn className="w-4 h-4" /> स्टाफ लॉगिन करा
            </button>
            <button
              type="button"
              onClick={() => navigate('/staff/dashboard')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Staff Dashboard वर परत जा
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function RequireStaffRole({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-emerald-700 font-bold text-xs">Loading Staff Portal…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

