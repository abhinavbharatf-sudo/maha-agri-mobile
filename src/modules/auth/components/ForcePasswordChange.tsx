/**
 * ForcePasswordChange Component
 * First-login password change screen enforcing password policy.
 */

import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
import { PasswordInput } from './PasswordInput';
import { validatePasswordStrength } from '../utils/password.utils';

interface ForcePasswordChangeProps {
  onSubmit: (newPassword: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({
  onSubmit,
  loading = false,
  error = null,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const pwdStrength = validatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!pwdStrength.isValid) {
      setValidationError(pwdStrength.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New password and confirm password do not match.');
      return;
    }

    await onSubmit(newPassword);
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-700">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-primary-900">Create New Password</h2>
        <p className="text-xs text-primary-500 mt-1">
          This is your first login with a temporary password. You must set a secure password to activate your account.
        </p>
      </div>

      {(error || validationError) && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-snug">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error || validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          label="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 8 chars, uppercase, number & special char"
        />

        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your new password"
        />

        {/* Password Strength Checklist */}
        <div className="bg-primary-50 p-3 rounded-xl border border-primary-100 space-y-1.5 text-xs text-primary-600">
          <p className="font-semibold text-primary-800 mb-1">Password Requirements:</p>
          <div className="grid grid-cols-2 gap-1">
            <span className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-emerald-700 font-medium' : 'text-primary-400'}`}>
              <CheckCircle className="w-3 h-3" /> Min 8 characters
            </span>
            <span className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-primary-400'}`}>
              <CheckCircle className="w-3 h-3" /> 1 Uppercase (A-Z)
            </span>
            <span className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-primary-400'}`}>
              <CheckCircle className="w-3 h-3" /> 1 Number (0-9)
            </span>
            <span className={`flex items-center gap-1 ${/[!@#$%^&*]/.test(newPassword) ? 'text-emerald-700 font-medium' : 'text-primary-400'}`}>
              <CheckCircle className="w-3 h-3" /> 1 Special char
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !pwdStrength.isValid || newPassword !== confirmPassword}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-md transition-all disabled:opacity-50 touch-manipulation min-h-[46px]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShieldAlert className="w-4 h-4" />
              <span>Update Password & Continue</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
