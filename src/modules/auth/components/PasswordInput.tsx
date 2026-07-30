/**
 * PasswordInput Component
 * Secure password input field with visibility toggle and clean styling.
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Password',
  error,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-primary-800 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-primary-400 pointer-events-none">
          <Lock className="w-4 h-4" />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          className={`w-full pl-9 pr-10 py-2.5 bg-primary-50/50 border ${
            error ? 'border-red-400 focus:ring-red-500' : 'border-primary-200 focus:ring-emerald-500 focus:border-emerald-500'
          } rounded-xl text-sm text-primary-900 placeholder-primary-400 focus:outline-none focus:ring-2 transition-all ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 text-primary-400 hover:text-primary-600 focus:outline-none transition-colors p-1"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
    </div>
  );
};
