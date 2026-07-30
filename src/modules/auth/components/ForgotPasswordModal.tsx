/**
 * ForgotPasswordModal Component
 * Step-by-step OTP request & new password reset modal.
 */

import React, { useState, useEffect } from 'react';
import { X, Phone, KeyRound, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { PasswordInput } from './PasswordInput';
import { validateMobileNumber, validateOtpCode } from '../validators/auth.validators';
import { validatePasswordStrength } from '../utils/password.utils';
import { notificationService } from '../services/NotificationService';
import { authService } from '../services/AuthService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'MOBILE' | 'OTP' | 'SUCCESS'>('MOBILE');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = validateMobileNumber(mobile);
    if (!val.isValid) {
      setError(val.error || 'Invalid mobile number.');
      return;
    }

    setLoading(true);
    const res = await notificationService.requestOtp(mobile);
    setLoading(false);

    if (res.success) {
      setStep('OTP');
      setResendTimer(30);
    } else {
      setError(res.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const otpVal = validateOtpCode(otp);
    if (!otpVal.isValid) {
      setError(otpVal.error || 'Please enter a 6-digit OTP.');
      return;
    }

    const pwdVal = validatePasswordStrength(newPassword);
    if (!pwdVal.isValid) {
      setError(pwdVal.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    const res = await authService.resetPasswordWithOtp({
      mobile,
      otp,
      newPassword,
    });
    setLoading(false);

    if (res.success) {
      setStep('SUCCESS');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } else {
      setError(res.error || 'Failed to reset password. Please check your OTP.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-primary-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100 bg-primary-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-primary-900">Reset Password</h3>
          </div>
          <button
            onClick={onClose}
            className="text-primary-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-snug">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 'MOBILE' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-primary-500">
                Enter your registered mobile number to receive a 6-digit OTP for password reset.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-primary-800 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 absolute left-3 text-primary-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter 10-digit registered mobile number"
                    maxLength={10}
                    className="w-full pl-9 pr-4 py-2.5 bg-primary-50/50 border border-primary-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl text-sm text-primary-900 placeholder-primary-400 focus:outline-none focus:ring-2 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || mobile.length !== 10}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-md transition-all disabled:opacity-50 touch-manipulation min-h-[46px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              <p className="text-xs text-primary-500">
                Enter the 6-digit OTP sent to <span className="font-semibold text-primary-800">+91 {mobile}</span> and your new password.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-primary-800 uppercase tracking-wider">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  maxLength={6}
                  className="w-full tracking-widest text-center font-mono font-bold text-lg py-2.5 bg-primary-50/50 border border-primary-200 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl text-primary-900 focus:outline-none focus:ring-2 transition-all"
                />
              </div>

              <PasswordInput
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, uppercase & number"
              />

              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('MOBILE')}
                  className="text-primary-500 hover:text-primary-800 underline"
                >
                  Change Mobile Number
                </button>
                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleRequestOtp}
                  className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-md transition-all disabled:opacity-50 touch-manipulation min-h-[46px]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Verify OTP & Save Password</span>
                )}
              </button>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-primary-900">Password Updated Successfully!</h4>
              <p className="text-xs text-primary-500">
                Your new password is set. Redirecting you to login…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
