/**
 * MAHA-AGRI Recruitment Portal — Local Dummy OTP Testing Utility
 *
 * STRICT GUARDRAILS:
 * 1. Only enabled when import.meta.env.DEV is strictly true (Vite dev server)
 *    AND import.meta.env.VITE_ENABLE_DUMMY_OTP === 'true'.
 * 2. In any production build (Vite build sets import.meta.env.DEV = false),
 *    this function strictly returns false.
 * 3. Never sends dummy OTPs to production WhatsApp or Edge Function endpoints.
 * 4. Never fabricates Supabase auth sessions or fake production credentials.
 */

export const DUMMY_OTP_CODE = '123456';

export interface DummyOtpEnv {
  DEV?: boolean;
  VITE_ENABLE_DUMMY_OTP?: string;
}

export interface DummyOtpVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Checks whether the local dummy OTP mode is active.
 * Defaults to evaluating the Vite client environment.
 */
export function isDummyOtpMode(envOverride?: DummyOtpEnv): boolean {
  if (envOverride) {
    return envOverride.DEV === true && envOverride.VITE_ENABLE_DUMMY_OTP === 'true';
  }

  // Vite replaces import.meta.env.DEV with false in production builds
  const isDev = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.DEV === true : false;
  const isFlagEnabled = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ENABLE_DUMMY_OTP === 'true' : false;

  return isDev && isFlagEnabled;
}

/**
 * Verifies a candidate-entered OTP against the local dummy OTP code.
 * Strictly checks that the environment allows dummy OTP before validating.
 */
export function verifyDummyOtp(
  token: string,
  envOverride?: DummyOtpEnv
): DummyOtpVerificationResult {
  if (!isDummyOtpMode(envOverride)) {
    return {
      valid: false,
      error: 'Dummy OTP mode is disabled. Production verification required.',
    };
  }

  const cleanToken = (token || '').trim();
  if (cleanToken === DUMMY_OTP_CODE) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Invalid OTP code. In LOCAL TEST MODE, please enter ${DUMMY_OTP_CODE}.`,
  };
}
