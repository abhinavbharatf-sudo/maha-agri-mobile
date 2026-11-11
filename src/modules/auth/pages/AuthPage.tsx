/**
 * AuthPage Component - Final Production Enterprise Login
 * Abhinav Bharat Foundation Enterprise Management System
 *
 * Enforces:
 * 1. Branding: Abhinav Bharat Foundation - Enterprise Management System
 * 2. Automatic RBAC Redirection (no manual role selector unless multi-workspace)
 * 3. Generic Security Error Messages ("Invalid Employee ID or Password.")
 * 4. Clean Enterprise Footer with Version 1.0.0 & Privacy Policy links
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Sprout, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useMahaAgriAuth } from '../hooks/useMahaAgriAuth';
import { LoginForm } from '../components/LoginForm';
import { MultiRoleSelector } from '../components/MultiRoleSelector';
import { ForcePasswordChange } from '../components/ForcePasswordChange';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { SplashScreen } from '../components/SplashScreen';
import type { MahaAgriRole } from '../types/auth.types';
import { authService } from '../services/AuthService';

export const AuthPage: React.FC = () => {
  const { session, user, roles, loading, login, switchRole } = useMahaAgriAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'LOGIN' | 'MULTI_ROLE' | 'FORCE_PASSWORD_CHANGE'>('LOGIN');
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const from = (location.state as { from?: string })?.from ?? null;

  // Resolve target route after authentication based on RBAC role and platform target
  const navigateToRoleDashboard = (role: MahaAgriRole, customTarget?: string) => {
    const rKey = (role?.key || '').toUpperCase();
    const rName = (role?.name || '').toLowerCase();
    const isStaffRole = rKey === 'STAFF' || rName.includes('staff');

    // 0. Requested origin route from location state
    if (from && typeof from === 'string' && from !== '/login') {
      // Security guard: If user is Staff, reject privileged origin routes and force /staff/dashboard
      const isPrivilegedOrigin = /^\/(maha-agri|admin|super-admin|superadmin|dashboard|abf|root|governance|users|state-admin)/i.test(from);
      if (!(isStaffRole && isPrivilegedOrigin)) {
        navigate(from, { replace: true });
        return;
      }
    }

    // 1. Direct Target specified by authenticated account
    if (customTarget) {
      navigate(customTarget, { replace: true });
      return;
    }

    // 2. Role-specific Dashboard Resolution
    // Super Admin Gateway
    if (rKey === 'SUPER_ADMIN' || rName.includes('super admin') || rName.includes('root')) {
      navigate('/dashboard', { replace: true });
    }
    // State Admin / Platform Administrator
    else if (rKey === 'STATE_ADMIN' || rKey === 'ADMIN' || rName.includes('administrator')) {
      navigate('/admin/dashboard', { replace: true });
    }
    // HR / Recruitment
    else if (rName.includes('hr') || rKey.includes('HR') || user?.email === 'hr@abhinavbharat.org') {
      navigate('/admin/rms/dashboard', { replace: true });
    }
    // CRM / CSM / Telecalling
    else if (rName.includes('crm') || rName.includes('csm') || rKey.includes('CRM') || user?.email === 'telecaller@abhinavbharat.org') {
      navigate('/crm/dashboard', { replace: true });
    }
    // EDP Entrepreneur
    else if (rKey === 'EDP_AGRI_ENTREPRENEUR') {
      navigate('/candidate/training', { replace: true });
    }
    // Agridoot Field Staff
    else if (rKey === 'MAHA_AGRIDOOT' || rName.includes('agridoot')) {
      navigate('/maha-agri/agridoot', { replace: true });
    }
    // Operational Staff (e.g. Rasmika Patil) -> Dedicated Staff Dashboard
    else if (rKey === 'STAFF' || rName.includes('staff')) {
      navigate('/staff/dashboard', { replace: true });
    }
    // Default Fallback
    else {
      navigate('/staff/dashboard', { replace: true });
    }
  };

  const handleLoginSubmit = async (credentials: { mobile: string; password: string }) => {
    setErrorMessage(null);
    setAuthLoading(true);

    try {
      const res = await login(credentials);
      setAuthLoading(false);

      if (!res.success || !res.data) {
        // Requirement 5: Generic Security Error Message (No internal detail leak)
        setErrorMessage('Invalid Employee ID or Password.');
        return;
      }

      if (res.requiresFirstLoginPasswordChange) {
        setMode('FORCE_PASSWORD_CHANGE');
        return;
      }

      // Show workspace selector ONLY if user has multiple assigned workspaces/roles
      if (res.requiresRoleSelection && res.roles && res.roles.length > 1) {
        setMode('MULTI_ROLE');
        return;
      }

      // Single workspace: Automatic redirection
      const customTarget = (res.data as unknown as Record<string, unknown>)?.targetDashboard as string | undefined;
      navigateToRoleDashboard(res.data.activeRole, customTarget);
    } catch (err) {
      setAuthLoading(false);
      setErrorMessage('Invalid Employee ID or Password.');
    }
  };

  const handleRoleSelection = async (selectedRole: MahaAgriRole) => {
    setAuthLoading(true);
    await switchRole(selectedRole);
    setAuthLoading(false);
    navigateToRoleDashboard(selectedRole);
  };

  const handleForcePasswordChangeSubmit = async (newPassword: string) => {
    if (!user) return;
    setErrorMessage(null);
    setAuthLoading(true);

    const res = await authService.forceChangePassword({
      userId: user.id,
      newPassword,
    });

    setAuthLoading(false);

    if (res.success) {
      if (roles.length > 1) {
        setMode('MULTI_ROLE');
      } else if (session?.activeRole) {
        navigateToRoleDashboard(session.activeRole);
      } else {
        setMode('LOGIN');
      }
    } else {
      setErrorMessage('Failed to update password. Please ensure password policies are met.');
    }
  };

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white px-4 py-6 sm:py-8 relative overflow-hidden font-sans antialiased">
      {/* Background Decorators */}
      <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Top Navigation Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Main Website</span>
        </Link>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Integrated Operations Portal</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6 z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-900 border border-slate-200/80">
          {/* Abhinav Bharat Foundation Branding */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-emerald-500/20 mb-3">
              <Sprout className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Abhinav Bharat Foundation</h1>
            <p className="text-xs text-slate-500 font-bold tracking-wide mt-1 uppercase">Enterprise Management System</p>
          </div>

          {/* Mode Switcher */}
          {mode === 'LOGIN' && (
            <LoginForm
              onSubmit={handleLoginSubmit}
              onForgotPasswordClick={() => setForgotPasswordOpen(true)}
              loading={authLoading}
              errorMessage={errorMessage}
            />
          )}

          {mode === 'MULTI_ROLE' && (
            <MultiRoleSelector
              roles={roles}
              onSelectRole={handleRoleSelection}
              loading={authLoading}
            />
          )}

          {mode === 'FORCE_PASSWORD_CHANGE' && (
            <ForcePasswordChange
              onSubmit={handleForcePasswordChangeSubmit}
              loading={authLoading}
              error={errorMessage}
            />
          )}
        </div>
      </div>

      {/* Footer Section */}
      <div className="w-full max-w-md mx-auto text-center space-y-2 text-xs text-slate-400 font-medium z-10 pt-2 border-t border-slate-800/60">
        <p className="text-[11px] text-slate-500 font-mono font-semibold">Version 1.0.0</p>
        <p>© {new Date().getFullYear()} Abhinav Bharat Foundation. All Rights Reserved.</p>
        <div className="flex items-center justify-center space-x-3 text-[11px] text-slate-400">
          <button type="button" className="hover:text-white transition-colors">Privacy Policy</button>
          <span>•</span>
          <button type="button" className="hover:text-white transition-colors">Terms of Use</button>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        onSuccess={() => {
          setErrorMessage(null);
          setMode('LOGIN');
        }}
      />
    </div>
  );
};
