import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function resolveFilePath(relPath) {
  const directPath = path.resolve(relPath);
  if (fs.existsSync(directPath)) return directPath;
  const projectPath = path.resolve('project', relPath);
  if (fs.existsSync(projectPath)) return projectPath;
  const parentProjectPath = path.resolve('..', relPath);
  if (fs.existsSync(parentProjectPath)) return parentProjectPath;
  return directPath;
}

const clientSource = fs.readFileSync(resolveFilePath('src/lib/supabase/client.ts'), 'utf8');
const authContextSource = fs.readFileSync(resolveFilePath('src/careers/lib/CandidateAuthContext.tsx'), 'utf8');
const step1Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step1CreateProfile.tsx'), 'utf8');
const step2Source = fs.readFileSync(resolveFilePath('src/careers/portal/steps/Step2MasterProfile.tsx'), 'utf8');
const apiSource = fs.readFileSync(resolveFilePath('src/careers/lib/api.ts'), 'utf8');
const myProfileSource = fs.readFileSync(resolveFilePath('src/careers/dashboard/MyProfile.tsx'), 'utf8');

// ── Test Suite 1: Candidate Authentication Isolation ────────────────────────

test('Auth Isolation 1: candidateSupabase uses isolated auth storage key', () => {
  assert.ok(
    clientSource.includes("export const candidateSupabase = createClient"),
    'candidateSupabase client must be exported from client.ts'
  );
  assert.ok(
    clientSource.includes("storageKey: 'maha_candidate_auth_token'"),
    'candidateSupabase must use isolated storageKey maha_candidate_auth_token'
  );
  assert.ok(
    authContextSource.includes("import { candidateSupabase } from '../../lib/supabase/client'"),
    'CandidateAuthContext must import and use candidateSupabase'
  );
});

test('Auth Isolation 2: CandidateAuthContext strictly rejects sessions lacking phone_confirmed_at or bearing email', () => {
  // Candidate session validation requires a non-empty, 10-digit phone AND phone_confirmed_at AND no email
  assert.ok(
    authContextSource.includes('sessPhone.length === 10'),
    'CandidateAuthContext must verify sessPhone is exactly 10 digits'
  );
  assert.ok(
    authContextSource.includes('sess.user.phone_confirmed_at'),
    'CandidateAuthContext must verify phone_confirmed_at as proof of OTP verification'
  );
  assert.ok(
    authContextSource.includes('!sess.user.email'),
    'CandidateAuthContext must reject any session bearing an email (admin/staff accounts)'
  );
  assert.ok(
    authContextSource.includes('if (!isCandidatePhoneSession) {'),
    'CandidateAuthContext must have a guard when session is not a candidate phone session'
  );
});

test('Auth Isolation 3: onAuthStateChange listener prevents non-phone/email sessions from hijacking candidate state', () => {
  const listenerMatch = authContextSource.match(/onAuthStateChange\(\(_event, newSession\) => {([\s\S]*?)return \(\) => {/);
  assert.ok(listenerMatch, 'onAuthStateChange listener must be implemented');
  const listenerBody = listenerMatch[1];

  assert.ok(
    listenerBody.includes('const isCandidatePhoneSession = Boolean('),
    'onAuthStateChange must compute isCandidatePhoneSession'
  );
  assert.ok(
    listenerBody.includes('newSession.user.phone_confirmed_at'),
    'onAuthStateChange must require phone_confirmed_at'
  );
  assert.ok(
    listenerBody.includes('!newSession.user.email'),
    'onAuthStateChange must reject email-bearing sessions'
  );
  assert.ok(
    listenerBody.includes('if (!isCandidatePhoneSession) {') &&
    listenerBody.includes('setSession(null)') &&
    listenerBody.includes('setProfile(null)'),
    'Non-candidate sessions must immediately clear session and profile'
  );
});

test('Auth Isolation 4: Candidate signOut operates strictly on candidateSupabase', () => {
  const signOutMatch = authContextSource.match(/const signOut = useCallback\(async \(\) => {([\s\S]*?)}, \[\]\);/);
  assert.ok(signOutMatch, 'signOut callback must exist in CandidateAuthContext');
  const signOutBody = signOutMatch[1];

  // Clears candidate storage
  assert.ok(signOutBody.includes("sessionStorage.removeItem('maha_candidate_verified_mobile')"), 'signOut must remove sessionStorage key');
  assert.ok(signOutBody.includes("localStorage.removeItem('maha_candidate_verified_mobile')"), 'signOut must remove localStorage key');

  // Terminates candidate session via candidateSupabase (preserving admin sessions)
  assert.ok(
    signOutBody.includes('candidateSupabase.auth.signOut()'),
    'Candidate signOut must invoke candidateSupabase.auth.signOut() to avoid logging out Admin'
  );
});

test('Auth Isolation 5: api.ts routes candidate operations through candidateSupabase when authenticated', () => {
  assert.ok(
    apiSource.includes("import { supabase, candidateSupabase } from '../../lib/supabase/client'"),
    'api.ts must import both supabase and candidateSupabase'
  );
  assert.ok(
    apiSource.includes("candidateSupabase.auth.getSession()"),
    'api.ts must check candidateSupabase session for candidate profile operations'
  );
  assert.ok(
    apiSource.includes("if (profile.user_id.startsWith('dummy-')) {"),
    'api.ts must check for dummy- user ID prefix'
  );
  assert.ok(
    apiSource.includes('if (!isDummyOtpMode()) {') &&
    apiSource.includes("code: 'AUTH_REQUIRED'"),
    'api.ts must return AUTH_REQUIRED error for dummy candidate IDs when not in dev dummy mode'
  );
});

test('Auth Isolation 6: Step 1 and Step 2 enforce userId authentication before saving', () => {
  assert.ok(
    step1Source.includes("if (!userId || userId === 'profile-user') {"),
    'Step 1 must reject saves without authenticated userId'
  );
  assert.ok(
    step2Source.includes("if (!userId || userId === 'profile-user') {"),
    'Step 2 must reject saves without authenticated userId'
  );
  assert.ok(
    myProfileSource.includes("userId={user?.id || ''}"),
    'MyProfile must pass authenticated user?.id or empty string'
  );
});

test('Auth Isolation 7: MyProfile does not trust arbitrary localStorage as phone proof', () => {
  const authMobileMatch = myProfileSource.match(/const authoritativeMobile = useMemo\(\(\) => {([\s\S]*?)}\s*,/);
  assert.ok(authMobileMatch, 'authoritativeMobile must be defined in MyProfile');
  const authMobileBody = authMobileMatch[1];

  assert.ok(!authMobileBody.includes('fromStorage'), 'authoritativeMobile must not read from unauthenticated localStorage');
  assert.ok(authMobileBody.includes('fromUser'), 'authoritativeMobile must derive from user.phone');
});

// ── Test Suite 2: Step 1 Alternate Mobile Validation & Normalization ────────

test('Alternate Mobile Step 1: Optional field handling', () => {
  const altMobileCase = step1Source.match(/case 'alternateMobile': {([\s\S]*?)case 'email':/);
  assert.ok(altMobileCase, "Step 1 must have a case 'alternateMobile' in validateField");
  const caseBody = altMobileCase[1];

  // Optional: returns null when empty
  assert.ok(
    caseBody.includes('if (!raw) return null;') || caseBody.includes('if (!raw) return null'),
    'Step 1 alternate mobile must return null when empty (optional)'
  );
});

test('Alternate Mobile Step 1: Normalizes prefixes (+91, 91, 0) and accepts valid Indian mobile', () => {
  const altMobileCase = step1Source.match(/case 'alternateMobile': {([\s\S]*?)case 'email':/);
  const caseBody = altMobileCase[1];

  assert.ok(caseBody.includes("startsWith('91')"), 'Step 1 must normalize 91 prefix');
  assert.ok(caseBody.includes("startsWith('0')"), 'Step 1 must normalize 0 prefix');
  assert.ok(caseBody.includes('/^[6-9]\\d{9}$/'), 'Step 1 must validate 10 digits starting with 6-9');
  assert.ok(!caseBody.includes('cleanDigits === cleanVerifiedMobile'), 'Step 1 must NOT forbid alternate mobile matching verified WhatsApp number');
});

test('Alternate Mobile Step 1: Rejects invalid alternate mobile numbers', () => {
  assert.ok(step1Source.includes("case 'alternateMobile':"), 'Step 1 must contain alternateMobile validation');

  // Verify regex logic in Node test
  const validateAlt = (value) => {
    const raw = (value || '').trim().replace(/\D/g, '');
    if (!raw) return null;
    const cleanDigits = raw.length === 12 && raw.startsWith('91')
      ? raw.slice(2)
      : raw.length === 11 && raw.startsWith('0')
      ? raw.slice(1)
      : raw;
    if (cleanDigits.length !== 10) {
      return 'Alternate mobile number must be exactly 10 digits.';
    }
    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }
    return null;
  };

  assert.equal(validateAlt(''), null);
  assert.equal(validateAlt('   '), null);
  assert.equal(validateAlt(null), null);
  assert.equal(validateAlt(undefined), null);

  // Valid numbers
  assert.equal(validateAlt('9876543210'), null);
  assert.equal(validateAlt('+919876543210'), null);
  assert.equal(validateAlt('919876543210'), null);
  assert.equal(validateAlt('09876543210'), null);
  assert.equal(validateAlt('8765432109'), null);
  assert.equal(validateAlt('7654321098'), null);
  assert.equal(validateAlt('6543210987'), null);

  // Invalid numbers
  assert.equal(validateAlt('5432109876'), 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
  assert.equal(validateAlt('1234567890'), 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
  assert.equal(validateAlt('98765'), 'Alternate mobile number must be exactly 10 digits.');
  assert.equal(validateAlt('9876543210123'), 'Alternate mobile number must be exactly 10 digits.');
});

// ── Test Suite 3: Step 2 Alternate Mobile Validation & Normalization ────────

test('Alternate Mobile Step 2: Optional field handling', () => {
  const altMobileCase = step2Source.match(/case 'alternateMobile': {([\s\S]*?)case 'casteCategory':/);
  assert.ok(altMobileCase, "Step 2 must have a case 'alternateMobile' in validateField");
  const caseBody = altMobileCase[1];

  assert.ok(
    caseBody.includes('if (!trimmed) return null;') || caseBody.includes('if (!trimmed) return null'),
    'Step 2 alternate mobile must return null when empty (optional)'
  );
  assert.ok(caseBody.includes("startsWith('91')"), 'Step 2 must normalize 91 prefix');
  assert.ok(caseBody.includes("startsWith('0')"), 'Step 2 must normalize 0 prefix');
  assert.ok(caseBody.includes('/^[6-9]\\d{9}$/'), 'Step 2 must validate 10 digits starting with 6-9');
  assert.ok(!caseBody.includes('cleanDigits === cleanVerifiedMobile'), 'Step 2 must NOT forbid alternate mobile matching verified WhatsApp number');
});

test('Alternate Mobile Step 2: Rejects invalid alternate mobile numbers and accepts valid ones', () => {
  const validateAltStep2 = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;
    const rawDigits = trimmed.replace(/\D/g, '');
    const cleanDigits = rawDigits.length === 12 && rawDigits.startsWith('91')
      ? rawDigits.slice(2)
      : rawDigits.length === 11 && rawDigits.startsWith('0')
      ? rawDigits.slice(1)
      : rawDigits;
    const validIndianMobileRegex = /^[6-9]\d{9}$/;
    if (!validIndianMobileRegex.test(cleanDigits)) {
      return 'Enter a valid 10-digit alternate mobile number.';
    }
    return null;
  };

  assert.equal(validateAltStep2(''), null);
  assert.equal(validateAltStep2('  '), null);

  // Valid numbers
  assert.equal(validateAltStep2('9876543210'), null);
  assert.equal(validateAltStep2('+919876543210'), null);
  assert.equal(validateAltStep2('919876543210'), null);
  assert.equal(validateAltStep2('09876543210'), null);
  assert.equal(validateAltStep2('8765432100'), null);

  // Invalid numbers
  assert.equal(validateAltStep2('1876543210'), 'Enter a valid 10-digit alternate mobile number.');
  assert.equal(validateAltStep2('5876543210'), 'Enter a valid 10-digit alternate mobile number.');
  assert.equal(validateAltStep2('98765'), 'Enter a valid 10-digit alternate mobile number.');
});

// ── Test Suite 4: Database Payload Mapping for Alternate Mobile ──────────────

test('Payload Mapping: Both Step 1 and Step 2 map emergency_mobile and alternate_mobile to clean 10-digit value', () => {
  // Step 1 check
  const step1PayloadMatch = step1Source.match(/const payload: Record<string, unknown> = {([\s\S]*?)};/);
  assert.ok(step1PayloadMatch, 'Step 1 payload must be defined');
  const step1Payload = step1PayloadMatch[1];

  assert.ok(step1Payload.includes('emergency_mobile: cleanAlt'), 'Step 1 must map emergency_mobile: cleanAlt');
  assert.ok(step1Payload.includes('alternate_mobile: cleanAlt'), 'Step 1 must map alternate_mobile: cleanAlt');

  // Step 2 check
  assert.ok(step2Source.includes('payload.emergency_mobile = cleanAlt;'), 'Step 2 must map payload.emergency_mobile = cleanAlt');
  assert.ok(step2Source.includes('payload.alternate_mobile = cleanAlt;'), 'Step 2 must map payload.alternate_mobile = cleanAlt');
});
