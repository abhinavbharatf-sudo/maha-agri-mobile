import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageSquare, ArrowRight, RefreshCw, X, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import { useCandidateAuth } from '../lib/CandidateAuthContext';
import { normalizeMobileNumber } from '../../lib/utils';
import { isDummyOtpMode, verifyDummyOtp, DUMMY_OTP_CODE } from '../lib/dummyOtp';

interface OTPLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (isNewUser?: boolean, mobile?: string) => void;
  title?: string;
  subtitle?: string;
}

type Step = 'mobile' | 'otp' | 'success';

export default function OTPLoginModal({ isOpen, onClose, onSuccess, title, subtitle }: OTPLoginModalProps) {
  const { requestOtp, verifyOtp, setVerifiedMobile } = useCandidateAuth();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [sentSuccess, setSentSuccess] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const generatedOtpRef = useRef('');

  const dummyActive = isDummyOtpMode();

  useEffect(() => {
    if (!isOpen) {
      setStep('mobile');
      setMobile('');
      setOtp(['', '', '', '', '', '']);
      setError(null);
      setResendTimer(0);
      setSentSuccess(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEBUG] 1. Button click: Send WhatsApp OTP clicked');
    if (mobile.length !== 10) return setError('Please enter a valid 10-digit mobile number.');
    setError(null);
    setLoading(true);

    if (dummyActive) {
      console.log(`[LOCAL TEST MODE] Simulated OTP dispatch for +91${mobile}. Test OTP is ${DUMMY_OTP_CODE}. WhatsApp API bypassed.`);
      setLoading(false);
      setSentSuccess(true);
      setResendTimer(30);
      setTimeout(() => {
        setSentSuccess(false);
        setStep('otp');
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }, 600);
      return;
    }
    
    console.log(`[DEBUG] 2. Calling requestOtp() for mobile: ${mobile}`);
    const { error: sendErr } = await requestOtp(mobile);
    console.log(`[DEBUG] 6. requestOtp() returned. Error:`, sendErr);
    
    setLoading(false);
    if (sendErr) return setError(sendErr);
    setSentSuccess(true);
    setResendTimer(30);
    setTimeout(() => {
      setSentSuccess(false);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }, 1500);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join('');
    if (token.length !== 6) return setError('Please enter the complete 6-digit OTP.');
    setError(null);
    setLoading(true);

    if (dummyActive) {
      const verifyRes = verifyDummyOtp(token);
      if (!verifyRes.valid) {
        setLoading(false);
        return setError(verifyRes.error || `Invalid OTP. In LOCAL TEST MODE, please enter ${DUMMY_OTP_CODE}.`);
      }

      const cleanMobile = normalizeMobileNumber(mobile);
      setVerifiedMobile(cleanMobile);

      console.log(`[LOCAL TEST MODE] Test OTP ${DUMMY_OTP_CODE} successfully verified for +91${cleanMobile}. Simulating WELCOME RECRUITMENT PORTAL flow.`);
      setLoading(false);
      setStep('success');
      setTimeout(() => onSuccess(false, cleanMobile), 800);
      return;
    }

    const { error: verifyErr, isNewUser } = await verifyOtp(mobile, token);
    if (verifyErr) {
      setLoading(false);
      return setError(verifyErr);
    }
    const cleanMobile = normalizeMobileNumber(mobile);
    setVerifiedMobile(cleanMobile);
    setLoading(false);
    setStep('success');
    setTimeout(() => onSuccess(isNewUser, cleanMobile), 1000);
  };

  const handleResend = async () => {
    setError(null);
    setOtp(['', '', '', '', '', '']);
    setLoading(true);

    if (dummyActive) {
      console.log(`[LOCAL TEST MODE] Resend simulated for +91${mobile}. Test OTP remains ${DUMMY_OTP_CODE}. WhatsApp API bypassed.`);
      setLoading(false);
      setResendTimer(30);
      otpRefs.current[0]?.focus();
      return;
    }

    const { error: sendErr } = await requestOtp(mobile);
    setLoading(false);
    if (sendErr) return setError(sendErr);
    setResendTimer(30);
    otpRefs.current[0]?.focus();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary-900 to-primary-800 px-6 pt-8 pb-10 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold mb-1">{title ?? 'Candidate Login'}</h2>
              <p className="text-primary-200 text-sm">
                {subtitle ?? 'Enter your WhatsApp mobile number to receive a secure OTP.'}
              </p>
            </div>

            {/* Decorative wave */}
            <div className="bg-primary-900 -mb-1">
              <svg viewBox="0 0 400 20" className="w-full fill-white">
                <path d="M0,20 C100,0 300,0 400,20 L400,20 L0,20 Z" />
              </svg>
            </div>

            <div className="px-6 py-6">
              {dummyActive && (
                <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    !
                  </div>
                  <div className="text-xs flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold uppercase tracking-wider text-amber-900">
                        LOCAL TEST MODE
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-950 rounded font-mono font-bold">
                        DEV ONLY
                      </span>
                    </div>
                    <p className="mt-1 text-amber-800 text-[11px] leading-relaxed">
                      WhatsApp OTP sending is bypassed for local frontend testing.
                    </p>
                    <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                      <span className="font-semibold text-amber-900">Configured Test OTP:</span>
                      <code className="px-2.5 py-0.5 bg-white border border-amber-300 rounded-md font-mono font-bold text-sm tracking-widest text-amber-950 shadow-xs">
                        {DUMMY_OTP_CODE}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* Step 1: Mobile */}
                {step === 'mobile' && (
                  <motion.form
                    key="mobile"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleMobileSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-primary-800 mb-2">
                        WhatsApp Mobile Number
                      </label>
                      <div className="flex items-center border-2 border-primary-200 rounded-xl overflow-hidden focus-within:border-primary-600 transition-colors">
                        <div className="px-4 py-3 bg-primary-50 border-r-2 border-primary-200 text-primary-700 font-semibold text-sm flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          +91
                        </div>
                        <input
                          type="tel"
                          value={mobile}
                          onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Enter 10-digit number"
                          className="flex-1 px-4 py-3 text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none text-lg font-medium tracking-wider"
                          autoFocus
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-[#E9FBF0] rounded-lg border border-[#25D366]/30">
                      <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.118 1.528 5.845L0 24l6.335-1.508A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.012-1.378l-.36-.214-3.732.979.996-3.638-.234-.374A9.792 9.792 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#075E54] leading-relaxed">Your OTP will be sent instantly to your WhatsApp number.</span>
                    </div>
                    <p className="flex items-start gap-1.5 text-xs text-primary-500">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-400 shrink-0" />
                      Only WhatsApp-enabled mobile numbers can receive the OTP.
                    </p>

                    {error && (
                      <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || mobile.length !== 10}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-900 text-white font-semibold rounded-xl hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Sending OTP via WhatsApp...</>
                      ) : (
                        <>Send WhatsApp OTP <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>
                    {sentSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-sm text-emerald-700 font-medium">OTP sent successfully to your WhatsApp.</span>
                      </motion.div>
                    )}
                  </motion.form>
                )}

                {step === 'otp' && (
                  <motion.form
                    key="otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleOtpSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <p className="text-sm text-primary-600 mb-4">
                        OTP sent to <span className="font-bold text-primary-900">+91 {mobile}</span>
                        <button
                          type="button"
                          onClick={() => setStep('mobile')}
                          className="ml-2 text-primary-600 underline text-xs"
                        >
                          Change
                        </button>
                      </p>

                      <label className="block text-sm font-semibold text-primary-800 mb-3">
                        Enter 6-digit OTP
                      </label>
                      <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => { otpRefs.current[i] = el; }}
                            type="tel"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(i, e)}
                            className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl transition-all focus:outline-none ${
                              digit
                                ? 'border-primary-600 bg-primary-50 text-primary-900'
                                : 'border-primary-200 focus:border-primary-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otp.join('').length !== 6}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-900 text-white font-semibold rounded-xl hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Verify & Login'}
                    </button>

                    <div className="text-center">
                      {resendTimer > 0 ? (
                        <p className="text-sm text-primary-500">Resend OTP in {resendTimer}s</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          className="text-sm text-primary-600 font-semibold hover:text-primary-800 underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </motion.form>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle className="w-9 h-9 text-emerald-600" />
                    </motion.div>
                    <h3 className="text-lg font-bold text-primary-900">
                      {dummyActive ? 'Test Verification Successful!' : 'Login Successful!'}
                    </h3>
                    <p className="text-primary-600 text-sm mt-1">
                      {dummyActive ? 'Redirecting to Recruitment Portal / Job Details...' : 'Redirecting to your dashboard...'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
