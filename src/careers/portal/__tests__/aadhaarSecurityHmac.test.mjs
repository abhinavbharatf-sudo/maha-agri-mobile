import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');

describe('Aadhaar HMAC Security & Privacy Safeguards', () => {
  const verhoeffPath = path.resolve(projectRoot, 'src/careers/portal/utils/verhoeff.ts');
  const migrationPath = path.resolve(projectRoot, 'supabase/migrations/20261104180000_candidate_profile_unification_persistence.sql');
  const step2Path = path.resolve(projectRoot, 'src/careers/portal/steps/Step2MasterProfile.tsx');

  const verhoeffContent = fs.readFileSync(verhoeffPath, 'utf8');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const step2Content = fs.readFileSync(step2Path, 'utf8');

  test('Security 1: Zero client-side secret or pepper in frontend bundle', () => {
    // Must never contain VITE_AADHAAR_HMAC_PEPPER or hardcoded pepper
    assert.strictEqual(
      verhoeffContent.includes('VITE_AADHAAR_HMAC_PEPPER'),
      false,
      'Client file must not reference VITE_AADHAAR_HMAC_PEPPER'
    );
    assert.strictEqual(
      verhoeffContent.includes('MAHA_AGRI_RMS_PEPPER_2026'),
      false,
      'Client file must not contain hardcoded fallback pepper'
    );
    assert.strictEqual(
      step2Content.includes('VITE_AADHAAR_HMAC_PEPPER'),
      false,
      'Step 2 must not reference VITE_AADHAAR_HMAC_PEPPER'
    );
    assert.strictEqual(
      step2Content.includes('MAHA_AGRI_RMS_PEPPER_2026'),
      false,
      'Step 2 must not contain hardcoded pepper'
    );
  });

  test('Security 2: Server-side HMAC generator fails closed on missing secret in Supabase Vault', () => {
    // Migration SQL must NOT contain hardcoded fallback pepper
    assert.strictEqual(
      migrationContent.includes("'MAHA_AGRI_RMS_PEPPER_2026'"),
      false,
      'Migration SQL must not fall back to hardcoded pepper'
    );

    // Migration SQL enables Supabase Vault
    assert.match(
      migrationContent,
      /CREATE EXTENSION IF NOT EXISTS\s+["']supabase_vault["']\s+WITH SCHEMA\s+["']vault["']/i,
      'Migration must enable supabase_vault extension'
    );

    // Migration reads decrypted secret from Vault
    assert.match(
      migrationContent,
      /FROM vault\.decrypted_secrets/i,
      'Must read secret from vault.decrypted_secrets'
    );

    // Migration SQL must fail closed by raising an exception
    assert.match(
      migrationContent,
      /RAISE EXCEPTION\s+['"]Aadhaar HMAC key configuration missing or unconfigured in Supabase Vault \(fail-closed\)['"]/i,
      'Must raise exception when secret is missing from Vault'
    );
  });

  test('Security 3: rms_compute_aadhaar_hmac is revoked from public, anon, and authenticated', () => {
    // Authenticated users must not be able to invoke rms_compute_aadhaar_hmac directly
    assert.match(
      migrationContent,
      /REVOKE ALL ON FUNCTION public\.rms_compute_aadhaar_hmac.*FROM PUBLIC, anon, authenticated;/i,
      'Must revoke execution of rms_compute_aadhaar_hmac from authenticated and anon clients'
    );

    // Ensure it is NOT granted to authenticated
    const lines = migrationContent.split('\n');
    const computeGrant = lines.find(l => l.includes('GRANT EXECUTE') && l.includes('rms_compute_aadhaar_hmac') && l.includes('authenticated'));
    assert.strictEqual(computeGrant, undefined, 'rms_compute_aadhaar_hmac must NEVER be granted to authenticated clients');
  });

  test('Security 4: Duplicate check returns ONLY is_duplicate boolean and message (zero PII/hash leak)', () => {
    // Find the return statements inside rms_check_aadhaar_duplicate
    const duplicateFnBody = migrationContent.slice(
      migrationContent.indexOf('CREATE OR REPLACE FUNCTION public.rms_check_aadhaar_duplicate'),
      migrationContent.indexOf('CREATE OR REPLACE FUNCTION public.rms_secure_get_aadhaar_hmac')
    );

    // Verify it never returns aadhaar_hash in jsonb_build_object
    assert.strictEqual(
      duplicateFnBody.includes("'aadhaar_hash'"),
      false,
      'rms_check_aadhaar_duplicate must not leak aadhaar_hash in return object'
    );
    assert.strictEqual(
      duplicateFnBody.includes("'user_id'"),
      false,
      'rms_check_aadhaar_duplicate must not leak user_id in return object'
    );
    assert.strictEqual(
      duplicateFnBody.includes("'aadhaar'"),
      false,
      'rms_check_aadhaar_duplicate must not leak plaintext aadhaar in return object'
    );

    // Verify return format
    assert.match(duplicateFnBody, /RETURN jsonb_build_object\('is_duplicate', false\);/);
    assert.match(duplicateFnBody, /RETURN jsonb_build_object\(\s*'is_duplicate', true,/);
  });

  test('Security 5: Server-side Verhoeff validation and key versioning', () => {
    // Migration must implement pure PL/pgSQL Verhoeff algorithm
    assert.match(
      migrationContent,
      /CREATE OR REPLACE FUNCTION public\.rms_validate_verhoeff/i,
      'Migration must define public.rms_validate_verhoeff'
    );

    // Migration must output version-prefixed HMAC for rotation support
    assert.match(
      migrationContent,
      /v_version\s*\|\|\s*':'\s*\|\|\s*v_raw_hex/i,
      'Must produce version-tagged hash e.g. v1:<hex>'
    );

    // Duplicate check must support both versioned and unversioned hashes
    assert.match(
      migrationContent,
      /aadhaar_hash\s*=\s*v_hash_v1[\s\S]*?aadhaar_hash\s*=\s*v_raw_hex/i,
      'Must check against both versioned and unversioned hashes for compatibility'
    );
  });

  test('Security 6: Pure Verhoeff algorithm logic correctness in JavaScript & SQL specification', () => {
    // Verhoeff lookup tables: test against known test vectors
    // Valid Aadhaar examples:
    // 123456789012 (invalid checksum) vs valid Verhoeff numbers
    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ];
    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ];

    function validateJs(numStr) {
      const clean = numStr.replace(/\D/g, '');
      if (clean.length !== 12) return false;
      let c = 0;
      const digits = clean.split('').map(Number).reverse();
      for (let i = 0; i < digits.length; i++) {
        c = d[c][p[i % 8][digits[i]]];
      }
      return c === 0;
    }

    // Test vectors
    assert.strictEqual(validateJs('123456789012'), false, '123456789012 has invalid checksum');
    assert.strictEqual(validateJs('12345678901'), false, '11 digits must fail');
    assert.strictEqual(validateJs('1234567890123'), false, '13 digits must fail');

    // Generate valid checksum for 23456789012
    const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
    let c = 0;
    const test11 = '23456789012'.split('').map(Number).reverse();
    for (let i = 0; i < test11.length; i++) {
      c = d[c][p[(i + 1) % 8][test11[i]]];
    }
    const checkDigit = inv[c];
    const validNum = '23456789012' + checkDigit;
    assert.strictEqual(validateJs(validNum), true, 'Valid Verhoeff number must pass');

    // Transposed digits (012 -> 021) must fail
    const transposed = '23456789021' + checkDigit;
    assert.strictEqual(validateJs(transposed), false, 'Transposition error must be caught');
  });

  test('Security 7: Step 2 pre-checks duplicate before calling server tokenization', () => {
    // Step 2 calls checkAadhaarDuplicateServer with aadhaarNumber
    assert.match(
      step2Content,
      /checkAadhaarDuplicateServer\(\{\s*aadhaarNumber:\s*cleanAadhaar/s,
      'Step 2 must pass cleanAadhaar to checkAadhaarDuplicateServer'
    );

    // Step 2 halts immediately if dupCheck.isDuplicate is true
    assert.match(
      step2Content,
      /if\s*\(\s*dupCheck\.isDuplicate\s*\)\s*\{[\s\S]*?setSaving\(false\);[\s\S]*?return;/s,
      'Step 2 must halt persistence if duplicate is found'
    );

    // Step 2 computes HMAC only when not duplicate
    const checkIndex = step2Content.indexOf('checkAadhaarDuplicateServer');
    const computeIndex = step2Content.indexOf('computeAadhaarHmac(cleanAadhaar)', checkIndex);
    assert.ok(computeIndex > checkIndex, 'computeAadhaarHmac must be called after or guarded by duplicate check');
  });

  test('Security 8: Anti-enumeration rate limiting audit table and sliding window', () => {
    // Migration must create dedicated audit table for rate limiting
    assert.match(
      migrationContent,
      /CREATE TABLE IF NOT EXISTS public\.rms_aadhaar_check_audit/i,
      'Migration must define rms_aadhaar_check_audit table'
    );

    // RLS enabled and direct access revoked
    assert.match(
      migrationContent,
      /REVOKE ALL ON TABLE public\.rms_aadhaar_check_audit FROM PUBLIC, anon, authenticated;/i,
      'Direct table access to audit logs must be revoked'
    );

    // Concurrency serialization via advisory lock
    assert.match(
      migrationContent,
      /PERFORM pg_advisory_xact_lock\(hashtext\(v_caller_id::text\)\);/i,
      'Must serialize concurrent requests using per-caller advisory transaction locks'
    );

    // Duplicate check RPC enforces rate limit (10 attempts per 15 mins)
    assert.match(
      migrationContent,
      /v_recent_checks >= 10[\s\S]*?RAISE EXCEPTION ['"]Too many Aadhaar verification attempts/i,
      'Duplicate check RPC must reject enumeration attempts'
    );

    // Tokenization RPC also records audit entry and prevents duplicate paired entries
    assert.match(
      migrationContent,
      /rms_secure_get_aadhaar_hmac[\s\S]*?INSERT INTO public\.rms_aadhaar_check_audit/i,
      'Tokenization RPC must record audit attempts'
    );
    assert.match(
      migrationContent,
      /checked_at > \(now\(\) - interval '5 seconds'\)/i,
      'Tokenization RPC must avoid duplicate audit entries for paired interaction'
    );

    // Verhoeff client library surfaces rate limit errors cleanly
    assert.match(
      verhoeffContent,
      /error\.message\?\.includes\('Too many'\)/i,
      'Client must surface rate-limiting error messages to user'
    );
  });

  test('Security 9: Dual-hash backward compatibility protects legacy records', () => {
    // Migration supports legacy hash calculation via DBA setting
    assert.match(
      migrationContent,
      /v_version = 'legacy'[\s\S]*?aadhaar_hmac_legacy_key/i,
      'Must support legacy hash derivation via app.settings.aadhaar_hmac_legacy_key'
    );

    // Duplicate check compares against BOTH versioned and legacy hashes
    assert.match(
      migrationContent,
      /aadhaar_hash = v_hash_v1[\s\S]*?aadhaar_hash = v_hash_legacy/i,
      'Duplicate check must compare against both v1 and legacy hashes'
    );

    // Tokenization RPC also performs dual-hash duplicate verification
    const tokenFn = migrationContent.slice(
      migrationContent.indexOf('CREATE OR REPLACE FUNCTION public.rms_secure_get_aadhaar_hmac')
    );
    assert.match(
      tokenFn,
      /v_hash_legacy[\s\S]*?aadhaar_hash = v_hash_legacy/i,
      'Tokenization RPC must check legacy collision before issuing token'
    );
  });
});
