/**
 * Unified Production Enterprise LoginForm Component
 * Abhinav Bharat Foundation & MAHA-AGRI Platform
 *
 * ONE Single Unified Login Form for ALL Users:
 * 1. Mobile Number
 * 2. Password
 * 3. Remember this device
 * 4. Secure Sign In
 *
 * Zero tab switchers, zero pre-login role selections.
 * Backend automatically resolves Platform, Role & Dashboard post-authentication.
 */

import React, { useState } from 'react';
import { Phone, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

interface LoginFormProps {
  onSubmit: (credentials: { mobile: string; password: string }) => Promise<void>;
  onForgotPasswordClick: () => void;
  loading?: boolean;
  errorMessage?: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPasswordClick,
  loading = false,
  errorMessage = null,
}) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ mobile?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setFieldErrors({});
    const errors: { mobile?: string; password?: string } = {};

    if (!mobile || mobile.trim().length === 0) {
      errors.mobile = 'Mobile Number is required.';
    }

    if (!password || password.trim().length === 0) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (rememberDevice) {
      localStorage.setItem('remember_device', 'true');
    }

    await onSubmit({ mobile: mobile.trim(), password: password.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed font-medium animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Mobile Number / Email Field */}
      <div className="space-y-1.5">
        <label htmlFor="login-mobile" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Mobile Number or Email
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Phone className="w-4 h-4" />
          </div>
          <input
            id="login-mobile"
            type="text"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter 10-digit mobile or admin email"
            autoComplete="username"
            disabled={loading}
            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
              fieldErrors.mobile
                ? 'border-red-400 focus:ring-red-500'
                : 'border-slate-200 focus:ring-emerald-600 focus:border-emerald-600'
            } rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all font-medium disabled:opacity-60`}
          />
        </div>
        {fieldErrors.mobile && (
          <p className="text-xs text-red-600 font-medium mt-1">{fieldErrors.mobile}</p>
        )}
      </div>

      {/* 2. Single Password Field */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Password
        </label>
        <PasswordInput
          id="login-password"
          label=""
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          placeholder="Enter your password"
          disabled={loading}
        />
      </div>

      {/* 3. Remember Device & Forgot Password Row */}
      <div className="flex items-center justify-between text-xs pt-1">
        <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-600 font-medium">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            disabled={loading}
            className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 focus:ring-offset-0 cursor-pointer"
          />
          <span>Remember this device</span>
        </label>

        <button
          type="button"
          onClick={onForgotPasswordClick}
          disabled={loading}
          className="font-bold text-emerald-800 hover:text-emerald-900 hover:underline focus:outline-none transition-colors disabled:opacity-50"
        >
          Forgot Password?
        </button>
      </div>

      {/* 4. Secure Sign In Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs sm:text-sm font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/50 shadow-md hover:shadow-lg transition-all disabled:opacity-50 touch-manipulation min-h-[46px]"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Signing In...</span>
          </div>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span>Secure Sign In</span>
          </>
        )}
      </button>

      {/* 5. Authorised Personnel Notice */}
      <div className="pt-3 border-t border-slate-200 text-center">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-center space-x-2 text-[11px] font-semibold text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Authorised Personnel Only. All access attempts are audited.</span>
        </div>
      </div>
    </form>
  );
};
