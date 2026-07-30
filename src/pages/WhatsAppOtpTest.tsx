import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Phone,
  KeyRound,
  RefreshCw,
  CheckCircle,
  XCircle,
  Building2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { sendOTP, WHATSAPP_TEMPLATES } from '../services/whatapi';
import type { SendOtpMessageResult } from '../services/whatapi';

export default function WhatsAppOtpTest() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [orgName, setOrgName] = useState('ABHINAV BHARAT FOUNDATION');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendOtpMessageResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  const handleGenerateOtp = () => {
    const digits = '0123456789';
    const arr = new Uint32Array(4);
    crypto.getRandomValues(arr);
    let generated = '';
    for (let i = 0; i < 4; i++) {
      generated += digits[arr[i] % digits.length];
    }
    setOtp(generated);
    setResult(null);
    setShowResult(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setResult({ success: false, error: 'Please enter a valid 10-digit mobile number.' });
      setShowResult(true);
      return;
    }
    if (otp.length < 4) {
      setResult({ success: false, error: 'Please generate or enter a valid OTP.' });
      setShowResult(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setShowResult(false);

    const res = await sendOTP(phone, otp, { orgName });
    setResult(res);
    setShowResult(true);
    setLoading(false);
  };

  const handleReset = () => {
    setPhone('');
    setOtp('');
    setResult(null);
    setShowResult(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header card */}
        <div className="relative bg-gradient-to-br from-primary-900 to-primary-800 rounded-t-2xl px-6 pt-8 pb-10 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16" />

          <div className="relative flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.118 1.528 5.845L0 24l6.335-1.508A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.012-1.378l-.36-.214-3.732.979.996-3.638-.234-.374A9.792 9.792 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">WhatsApp OTP Test</h1>
              <p className="text-primary-200 text-sm">WhatAPI Integration — Template: {WHATSAPP_TEMPLATES.USER_ALERT_9}</p>
            </div>
          </div>
          <p className="relative text-primary-200 text-xs leading-relaxed">
            Send a test OTP to any WhatsApp-enabled mobile number using the approved
            <span className="text-white font-semibold"> user_alert_9 </span>
            template. Body Variable #1 = Organization Name, Body Variable #2 = OTP.
          </p>
        </div>

        {/* Body */}
        <div className="bg-white rounded-b-2xl shadow-2xl px-6 py-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-primary-800 mb-2">
                Mobile Number
              </label>
              <div className="flex items-center border-2 border-primary-200 rounded-xl overflow-hidden focus-within:border-primary-600 transition-colors">
                <div className="px-4 py-3 bg-primary-50 border-r-2 border-primary-200 text-primary-700 font-semibold text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setShowResult(false);
                  }}
                  placeholder="Enter 10-digit number"
                  className="flex-1 px-4 py-3 text-primary-900 placeholder-primary-400 bg-transparent focus:outline-none text-lg font-medium tracking-wider"
                  autoFocus
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-sm font-semibold text-primary-800 mb-2">
                <Building2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Body Variable #1 — Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setShowResult(false);
                }}
                placeholder="Organization name"
                className="w-full px-4 py-3 text-primary-900 placeholder-primary-400 border-2 border-primary-200 rounded-xl focus:outline-none focus:border-primary-600 transition-colors text-sm font-medium"
              />
            </div>

            {/* OTP */}
            <div>
              <label className="block text-sm font-semibold text-primary-800 mb-2">
                <KeyRound className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Body Variable #2 — OTP Code
              </label>
              <div className="flex gap-2">
                <input
                  ref={otpRef}
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setShowResult(false);
                  }}
                  placeholder="Enter or generate OTP"
                  className="flex-1 px-4 py-3 text-primary-900 placeholder-primary-400 border-2 border-primary-200 rounded-xl focus:outline-none focus:border-primary-600 transition-colors text-lg font-bold tracking-[0.3em] text-center"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={handleGenerateOtp}
                  className="px-4 py-3 bg-primary-100 text-primary-700 font-semibold rounded-xl hover:bg-primary-200 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 bg-[#E9FBF0] rounded-lg border border-[#25D366]/30">
              <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs text-[#075E54] leading-relaxed">
                The phone number is automatically converted to Indian format (91xxxxxxxxxx)
                before sending. Credentials are never exposed to the frontend.
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || phone.length !== 10 || otp.length < 4}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-900 text-white font-semibold rounded-xl hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Sending via WhatsApp...
                </>
              ) : (
                <>
                  Send WhatsApp OTP <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Result */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={`p-4 rounded-xl border ${
                    result.success
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-bold ${
                          result.success ? 'text-emerald-800' : 'text-red-800'
                        }`}
                      >
                        {result.success ? 'OTP Sent Successfully' : 'Send Failed'}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          result.success ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {result.message ?? result.error}
                      </p>
                    </div>
                  </div>

                  {result.success && (
                    <div className="mt-3 space-y-1.5 text-xs">
                      {result.mobile && (
                        <div className="flex justify-between gap-4">
                          <span className="text-primary-500">Mobile (converted)</span>
                          <span className="text-primary-900 font-mono font-semibold">
                            {result.mobile}
                          </span>
                        </div>
                      )}
                      {result.template && (
                        <div className="flex justify-between gap-4">
                          <span className="text-primary-500">Template</span>
                          <span className="text-primary-900 font-mono font-semibold">
                            {result.template}
                          </span>
                        </div>
                      )}
                      {result.messageId && (
                        <div className="flex justify-between gap-4">
                          <span className="text-primary-500">Message ID</span>
                          <span className="text-primary-900 font-mono font-semibold break-all text-right">
                            {result.messageId}
                          </span>
                        </div>
                      )}
                      {result.logId && (
                        <div className="flex justify-between gap-4">
                          <span className="text-primary-500">Log ID</span>
                          <span className="text-primary-900 font-mono font-semibold">
                            {result.logId}
                          </span>
                        </div>
                      )}
                      {result.deduplicated && (
                        <div className="flex justify-between gap-4">
                          <span className="text-primary-500">Deduplicated</span>
                          <span className="text-amber-700 font-semibold">Yes</span>
                        </div>
                      )}
                    </div>
                  )}

                  {result.diagnostics && (
                    <div className="mt-3 p-3 bg-gray-900 rounded-lg overflow-x-auto">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        WhatAPI Request/Response Diagnostics
                      </p>
                      <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                        {JSON.stringify(result.diagnostics, null, 2)}
                      </pre>
                    </div>
                  )}

                  <button
                    onClick={handleReset}
                    className="mt-3 text-xs text-primary-600 font-semibold hover:text-primary-800 underline"
                  >
                    Reset form
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
