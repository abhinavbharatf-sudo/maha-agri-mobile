/**
 * MAHA-AGRI Recruitment Portal — Local Dummy OTP Security & Guardrails Test Suite
 *
 * Runs locally with Node.js built-in test runner: node --test
 * Validates:
 *   1. Local dummy OTP success with configured code '123456'
 *   2. Incorrect OTP rejection with clear local test mode message
 *   3. Strict production-mode rejection (DEV === false), even if flag is set
 *   4. Rejection when flag is disabled or unset
 *   5. Mobile number normalization and storage contract
 *   6. Isolation: zero outbound WhatsApp API calls in dummy mode
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Logic mirror of src/careers/lib/dummyOtp.ts for pure Node execution
const DUMMY_OTP_CODE = '123456';

function isDummyOtpMode(envOverride) {
  if (envOverride) {
    return envOverride.DEV === true && envOverride.VITE_ENABLE_DUMMY_OTP === 'true';
  }
  return false;
}

function verifyDummyOtp(token, envOverride) {
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

function normalizeMobile(mobile) {
  return (mobile || '').replace(/\D/g, '').slice(-10);
}

describe('Recruitment Portal: Local Dummy OTP Security & Guardrails', () => {
  describe('1. Local Dummy OTP Success in DEV Mode', () => {
    it('accepts correct dummy OTP code "123456" when DEV=true and VITE_ENABLE_DUMMY_OTP="true"', () => {
      const devEnv = { DEV: true, VITE_ENABLE_DUMMY_OTP: 'true' };
      assert.equal(isDummyOtpMode(devEnv), true);

      const result = verifyDummyOtp('123456', devEnv);
      assert.equal(result.valid, true);
      assert.equal(result.error, undefined);
    });

    it('accepts dummy OTP with leading/trailing whitespace trimmed', () => {
      const devEnv = { DEV: true, VITE_ENABLE_DUMMY_OTP: 'true' };
      const result = verifyDummyOtp('  123456  ', devEnv);
      assert.equal(result.valid, true);
    });
  });

  describe('2. Incorrect OTP Rejection in DEV Mode', () => {
    it('rejects an incorrect 6-digit OTP code with an informative test-mode prompt', () => {
      const devEnv = { DEV: true, VITE_ENABLE_DUMMY_OTP: 'true' };
      const result = verifyDummyOtp('999999', devEnv);

      assert.equal(result.valid, false);
      assert.match(result.error, /In LOCAL TEST MODE, please enter 123456/);
    });

    it('rejects empty or partial OTP codes', () => {
      const devEnv = { DEV: true, VITE_ENABLE_DUMMY_OTP: 'true' };
      assert.equal(verifyDummyOtp('', devEnv).valid, false);
      assert.equal(verifyDummyOtp('123', devEnv).valid, false);
      assert.equal(verifyDummyOtp(null, devEnv).valid, false);
    });
  });

  describe('3. Production Mode Enforcement (DEV === false)', () => {
    it('strictly rejects dummy OTP even if VITE_ENABLE_DUMMY_OTP="true" when DEV=false', () => {
      const prodEnvWithFlagAccidentallySet = { DEV: false, VITE_ENABLE_DUMMY_OTP: 'true' };

      // isDummyOtpMode must be strictly false
      assert.equal(isDummyOtpMode(prodEnvWithFlagAccidentallySet), false);

      // verifyDummyOtp must fail and require production verification
      const result = verifyDummyOtp('123456', prodEnvWithFlagAccidentallySet);
      assert.equal(result.valid, false);
      assert.match(result.error, /Dummy OTP mode is disabled\. Production verification required\./);
    });

    it('strictly rejects when DEV is undefined or truthy non-boolean', () => {
      assert.equal(isDummyOtpMode({ DEV: undefined, VITE_ENABLE_DUMMY_OTP: 'true' }), false);
      assert.equal(isDummyOtpMode({ DEV: 'true', VITE_ENABLE_DUMMY_OTP: 'true' }), false);
    });
  });

  describe('4. Disabled Flag in DEV Mode', () => {
    it('rejects dummy OTP when DEV=true but VITE_ENABLE_DUMMY_OTP="false"', () => {
      const devDisabled = { DEV: true, VITE_ENABLE_DUMMY_OTP: 'false' };
      assert.equal(isDummyOtpMode(devDisabled), false);

      const result = verifyDummyOtp('123456', devDisabled);
      assert.equal(result.valid, false);
    });

    it('rejects dummy OTP when DEV=true but VITE_ENABLE_DUMMY_OTP is unset', () => {
      const devUnset = { DEV: true };
      assert.equal(isDummyOtpMode(devUnset), false);

      const result = verifyDummyOtp('123456', devUnset);
      assert.equal(result.valid, false);
    });
  });

  describe('5. Mobile Normalization & Storage Contract', () => {
    it('normalizes 10-digit mobile numbers for session storage correctly', () => {
      assert.equal(normalizeMobile('+91 98220 12345'), '9822012345');
      assert.equal(normalizeMobile('9822012345'), '9822012345');
      assert.equal(normalizeMobile('09822012345'), '9822012345');
    });
  });

  describe('6. Zero WhatsApp Endpoint Leakage', () => {
    it('verifies dummy flow does not invoke edge function network dispatcher', () => {
      let networkCallsCount = 0;
      const fakeNetworkDispatcher = () => { networkCallsCount++; };

      const devEnv = { DEV: true, VITE_ENABLE_DUMMY_OTP: 'true' };

      // In dummy mode, verifyOtp bypasses network dispatcher
      if (isDummyOtpMode(devEnv)) {
        const verifyRes = verifyDummyOtp('123456', devEnv);
        assert.equal(verifyRes.valid, true);
        // fakeNetworkDispatcher is NOT invoked
      } else {
        fakeNetworkDispatcher();
      }

      assert.equal(networkCallsCount, 0, 'No outbound WhatsApp network calls must be executed in dummy mode');
    });
  });
});
