-- ============================================================================
-- MIGRATION: 20261104180000_candidate_profile_unification_persistence.sql
-- DESCRIPTION: Candidate Profile Unification, Vault Secret Storage & Abuse Protection
--   1. Adds missing permanent residential address columns idempotently
--   2. Adds aadhaar_hash column with partial unique index (nulls allowed)
--   3. Enables pgcrypto and supabase_vault extensions
--   4. Creates rms_aadhaar_check_audit table for rate limiting and anti-enumeration
--   5. Adds public.rms_validate_verhoeff() for server-side checksum validation
--   6. Hardens public.rms_compute_aadhaar_hmac():
--      - SECURITY DEFINER with fixed search_path = public, extensions, vault
--      - Reads active key from Supabase Vault (vault.decrypted_secrets)
--      - Dual-mode support: computes versioned 'v1:<hex>' or legacy 64-char hex
--      - FAILS CLOSED: raises exception if active key is missing from Vault
--      - RESTRICTED: REVOKE ALL from PUBLIC, anon, and authenticated
--   7. Hardens public.rms_check_aadhaar_duplicate():
--      - Concurrency-serialized via per-caller advisory transaction locks
--      - Rate-limited: max 10 verification attempts per 15 minutes per caller
--      - Dual-hash collision detection: matches both 'v1:<hex>' and legacy hex
--      - Zero PII / hash leakage: returns strictly {"is_duplicate": boolean}
--   8. Adds public.rms_secure_get_aadhaar_hmac():
--      - Concurrency-serialized and rate-limited in rms_aadhaar_check_audit
--      - De-duplicates interaction audit entries from paired duplicate checks
--      - Dual-hash check before returning versioned HMAC token
--
-- ROLLBACK INSTRUCTIONS (DO NOT EXECUTE AUTOMATICALLY):
--   DROP FUNCTION IF EXISTS public.rms_secure_get_aadhaar_hmac(text);
--   DROP FUNCTION IF EXISTS public.rms_check_aadhaar_duplicate(text);
--   DROP FUNCTION IF EXISTS public.rms_compute_aadhaar_hmac(text, text);
--   DROP FUNCTION IF EXISTS public.rms_compute_aadhaar_hmac(text);
--   DROP FUNCTION IF EXISTS public.rms_validate_verhoeff(text);
--   DROP TABLE IF EXISTS public.rms_aadhaar_check_audit;
--   DROP INDEX IF EXISTS public.idx_rms_candidate_aadhaar_hash;
--   DROP INDEX IF EXISTS public.idx_rms_candidate_permanent_district;
--   ALTER TABLE public.rms_candidate_profiles
--     DROP COLUMN IF EXISTS permanent_same_as_current,
--     DROP COLUMN IF EXISTS permanent_address_line1,
--     DROP COLUMN IF EXISTS permanent_district,
--     DROP COLUMN IF EXISTS permanent_taluka,
--     DROP COLUMN IF EXISTS permanent_pincode,
--     DROP COLUMN IF EXISTS aadhaar_hash;
-- ============================================================================

-- 1. Permanent Address Columns (Safe, Idempotent)
ALTER TABLE public.rms_candidate_profiles
  ADD COLUMN IF NOT EXISTS permanent_same_as_current boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS permanent_address_line1 text,
  ADD COLUMN IF NOT EXISTS permanent_district text,
  ADD COLUMN IF NOT EXISTS permanent_taluka text,
  ADD COLUMN IF NOT EXISTS permanent_pincode text;

CREATE INDEX IF NOT EXISTS idx_rms_candidate_permanent_district
  ON public.rms_candidate_profiles (permanent_district);

-- 2. Aadhaar Hash Column & Partial Unique Index
ALTER TABLE public.rms_candidate_profiles
  ADD COLUMN IF NOT EXISTS aadhaar_hash text;

-- Enforce partial uniqueness: only non-null hashes must be globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_rms_candidate_aadhaar_hash
  ON public.rms_candidate_profiles (aadhaar_hash)
  WHERE aadhaar_hash IS NOT NULL;

-- 3. Cryptographic Extensions for Server-Side HMAC & Vault Storage
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

-- 4. Audit & Rate-Limiting Table for Anti-Enumeration Protection
CREATE TABLE IF NOT EXISTS public.rms_aadhaar_check_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caller_id uuid NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_aadhaar_audit_caller_time
  ON public.rms_aadhaar_check_audit (caller_id, checked_at);

-- Enable RLS and restrict direct access to audit table
ALTER TABLE public.rms_aadhaar_check_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rms_aadhaar_check_audit FROM PUBLIC, anon, authenticated;

-- 5. Pure PL/pgSQL Verhoeff Algorithm Implementation for Server-Side Aadhaar Validation
CREATE OR REPLACE FUNCTION public.rms_validate_verhoeff(
  p_num text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_d integer[] := ARRAY[
    0,1,2,3,4,5,6,7,8,9,
    1,2,3,4,0,6,7,8,9,5,
    2,3,4,0,1,7,8,9,5,6,
    3,4,0,1,2,8,9,5,6,7,
    4,0,1,2,3,9,5,6,7,8,
    5,9,8,7,6,0,4,3,2,1,
    6,5,9,8,7,1,0,4,3,2,
    7,6,5,9,8,2,1,0,4,3,
    8,7,6,5,9,3,2,1,0,4,
    9,8,7,6,5,4,3,2,1,0
  ];
  v_p integer[] := ARRAY[
    0,1,2,3,4,5,6,7,8,9,
    1,5,7,6,2,8,3,0,9,4,
    5,8,0,3,7,9,6,1,4,2,
    8,9,1,6,0,4,3,5,2,7,
    9,4,5,3,1,2,6,8,7,0,
    4,2,8,6,5,7,3,9,0,1,
    2,7,9,3,8,0,6,4,1,5,
    7,0,4,6,9,1,3,2,5,8
  ];
  v_clean text;
  v_len integer;
  v_c integer := 0;
  v_i integer;
  v_digit integer;
  v_pos integer;
  v_p_val integer;
BEGIN
  v_clean := regexp_replace(p_num, '\D', '', 'g');
  v_len := length(v_clean);
  IF v_len != 12 THEN
    RETURN false;
  END IF;

  FOR v_i IN 0 .. (v_len - 1) LOOP
    v_digit := (substring(v_clean from (v_len - v_i) for 1))::integer;
    v_pos := ((v_i % 8) * 10) + v_digit + 1;
    v_p_val := v_p[v_pos];
    v_c := v_d[(v_c * 10) + v_p_val + 1];
  END LOOP;

  RETURN (v_c = 0);
END;
$$;

-- 6. Server-Side Cryptographically Secure Aadhaar HMAC Generator (Strictly Internal)
-- Securely retrieves secret key from Supabase Vault (vault.decrypted_secrets)
CREATE OR REPLACE FUNCTION public.rms_compute_aadhaar_hmac(
  p_aadhaar text,
  p_version text DEFAULT 'v1'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_clean text;
  v_secret text;
  v_version text;
  v_raw_hex text;
BEGIN
  v_clean := regexp_replace(p_aadhaar, '\D', '', 'g');
  IF length(v_clean) != 12 THEN
    RETURN NULL;
  END IF;

  -- Pre-computation validation: ensure valid Verhoeff checksum
  IF NOT public.rms_validate_verhoeff(v_clean) THEN
    RETURN NULL;
  END IF;

  v_version := COALESCE(NULLIF(trim(p_version), ''), 'v1');

  IF v_version = 'legacy' THEN
    -- Retrieve legacy secret from Supabase Vault
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'aadhaar_hmac_legacy_key'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Secondary check for app.settings if set in local docker
    IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
      v_secret := current_setting('app.settings.aadhaar_hmac_legacy_key', true);
    END IF;

    -- If unconfigured, return NULL (legacy check safely skipped)
    IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
      RETURN NULL;
    END IF;

    -- Return raw 64-char hex without version prefix for legacy matching
    RETURN encode(extensions.hmac('maha_aadhaar_' || v_clean, v_secret, 'sha256'), 'hex');
  END IF;

  -- Active key version (e.g. v1): Retrieve from Supabase Vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'aadhaar_hmac_key_' || v_version
  ORDER BY created_at DESC
  LIMIT 1;

  -- Fallback to generic vault name if version-specific name is absent
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'aadhaar_hmac_secret'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Secondary check for local app.settings
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    v_secret := current_setting('app.settings.aadhaar_hmac_key_' || v_version, true);
  END IF;
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    v_secret := current_setting('app.settings.aadhaar_hmac_secret', true);
  END IF;

  -- Fail-closed: Never generate active hash with a missing secret
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    RAISE EXCEPTION 'Aadhaar HMAC key configuration missing or unconfigured in Supabase Vault (fail-closed)';
  END IF;

  v_raw_hex := encode(extensions.hmac('maha_aadhaar_' || v_clean, v_secret, 'sha256'), 'hex');
  RETURN v_version || ':' || v_raw_hex;
END;
$$;

-- SECURITY MANDATE: Revoke all direct execution from public, anon, and authenticated clients.
REVOKE ALL ON FUNCTION public.rms_compute_aadhaar_hmac(text, text) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'rms_compute_aadhaar_hmac' AND pronargs = 1
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rms_compute_aadhaar_hmac(text) FROM PUBLIC, anon, authenticated;';
  END IF;
END $$;

-- 7. Hardened, Rate-Limited & Dual-Hash Duplicate Check RPC
CREATE OR REPLACE FUNCTION public.rms_check_aadhaar_duplicate(
  p_aadhaar_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_caller_id uuid;
  v_duplicate_found boolean := false;
  v_input text;
  v_clean text;
  v_hash_v1 text;
  v_hash_legacy text;
  v_raw_hex text;
  v_recent_checks integer;
BEGIN
  -- Strict verification of authenticated identity: derived exclusively from auth.uid()
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to perform duplicate check.';
  END IF;

  -- Concurrency Serialization: Acquire transactional advisory lock scoped to caller_id
  PERFORM pg_advisory_xact_lock(hashtext(v_caller_id::text));

  -- 1. Anti-Enumeration Rate Limiting: Max 10 verification attempts per 15 minutes
  SELECT count(*) INTO v_recent_checks
  FROM public.rms_aadhaar_check_audit
  WHERE caller_id = v_caller_id
    AND checked_at > (now() - interval '15 minutes');

  IF v_recent_checks >= 10 THEN
    RAISE EXCEPTION 'Too many Aadhaar verification attempts. Please wait 15 minutes before trying again.';
  END IF;

  -- Record this check attempt for rate-limiting audit (counts every attempt including invalid ones)
  INSERT INTO public.rms_aadhaar_check_audit (caller_id) VALUES (v_caller_id);

  -- Opportunistic background prune: delete audit records older than 24 hours
  DELETE FROM public.rms_aadhaar_check_audit
  WHERE checked_at < (now() - interval '24 hours');

  -- Treat empty or blank input as non-duplicate
  IF p_aadhaar_hash IS NULL OR length(trim(p_aadhaar_hash)) = 0 THEN
    RETURN jsonb_build_object('is_duplicate', false);
  END IF;

  v_input := trim(p_aadhaar_hash);

  -- If raw 12-digit Aadhaar number was supplied, securely compute BOTH v1 and legacy hashes
  IF v_input ~ '^\d{12}$' THEN
    v_clean := v_input;
    IF NOT public.rms_validate_verhoeff(v_clean) THEN
      RETURN jsonb_build_object(
        'is_duplicate', false,
        'message', 'Invalid Aadhaar number checksum.'
      );
    END IF;
    v_hash_v1 := public.rms_compute_aadhaar_hmac(v_clean, 'v1');
    v_hash_legacy := public.rms_compute_aadhaar_hmac(v_clean, 'legacy');
  ELSE
    v_hash_v1 := v_input;
    v_hash_legacy := v_input;
  END IF;

  -- Extract raw 64-char hex if version prefix is present
  IF v_hash_v1 LIKE 'v%:%' THEN
    v_raw_hex := split_part(v_hash_v1, ':', 2);
  ELSE
    v_raw_hex := v_hash_v1;
  END IF;

  -- DUAL-HASH COLLISION CHECK:
  -- Checks against:
  --   1. New versioned hash ('v1:<hex>')
  --   2. Legacy unprefixed hash ('<hex>')
  --   3. Old client-side hash computed with baseline pepper
  SELECT EXISTS(
    SELECT 1
    FROM public.rms_candidate_profiles
    WHERE (
      aadhaar_hash = v_hash_v1
      OR aadhaar_hash = v_raw_hex
      OR (v_hash_legacy IS NOT NULL AND aadhaar_hash = v_hash_legacy)
    )
    AND user_id != v_caller_id
  ) INTO v_duplicate_found;

  IF v_duplicate_found THEN
    RETURN jsonb_build_object(
      'is_duplicate', true,
      'message', 'This Aadhaar number is already registered with another applicant profile.'
    );
  END IF;

  -- Safe contract: returns ONLY is_duplicate boolean (never leaks hash, Aadhaar, or candidate identity)
  RETURN jsonb_build_object('is_duplicate', false);
END;
$$;

-- Security Privileges: Restrict execution strictly to authenticated users, revoke from PUBLIC/anon
REVOKE ALL ON FUNCTION public.rms_check_aadhaar_duplicate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_check_aadhaar_duplicate(text) TO authenticated;

-- 8. Secure Candidate Tokenization RPC (Called during Step 2 Persistence)
CREATE OR REPLACE FUNCTION public.rms_secure_get_aadhaar_hmac(
  p_aadhaar text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_caller_id uuid;
  v_clean text;
  v_hash_v1 text;
  v_hash_legacy text;
  v_raw_hex text;
  v_is_duplicate boolean := false;
  v_recent_checks integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Concurrency Serialization: Acquire transactional advisory lock scoped to caller_id
  PERFORM pg_advisory_xact_lock(hashtext(v_caller_id::text));

  -- Anti-Enumeration Rate Limiting: Max 10 verification attempts per 15 minutes
  SELECT count(*) INTO v_recent_checks
  FROM public.rms_aadhaar_check_audit
  WHERE caller_id = v_caller_id
    AND checked_at > (now() - interval '15 minutes');

  IF v_recent_checks >= 10 THEN
    RAISE EXCEPTION 'Too many Aadhaar verification attempts. Please wait 15 minutes before trying again.';
  END IF;

  -- Record audit entry for rate limiting:
  -- Avoid duplicate audit entry if caller already checked within the same interaction (< 5 seconds)
  IF NOT EXISTS (
    SELECT 1 FROM public.rms_aadhaar_check_audit
    WHERE caller_id = v_caller_id
      AND checked_at > (now() - interval '5 seconds')
  ) THEN
    INSERT INTO public.rms_aadhaar_check_audit (caller_id) VALUES (v_caller_id);
  END IF;

  v_clean := regexp_replace(p_aadhaar, '\D', '', 'g');
  IF length(v_clean) != 12 THEN
    RAISE EXCEPTION 'Aadhaar number must be exactly 12 numeric digits.';
  END IF;

  -- Pre-computation validation: ensure valid Verhoeff checksum
  IF NOT public.rms_validate_verhoeff(v_clean) THEN
    RAISE EXCEPTION 'Invalid Aadhaar number checksum.';
  END IF;

  -- Compute versioned HMAC server-side using Vault secret
  v_hash_v1 := public.rms_compute_aadhaar_hmac(v_clean, 'v1');
  IF v_hash_v1 IS NULL THEN
    RAISE EXCEPTION 'Unable to compute secure Aadhaar token.';
  END IF;

  v_hash_legacy := public.rms_compute_aadhaar_hmac(v_clean, 'legacy');
  v_raw_hex := split_part(v_hash_v1, ':', 2);

  -- Atomic dual-hash duplicate check before returning token
  SELECT EXISTS(
    SELECT 1
    FROM public.rms_candidate_profiles
    WHERE (
      aadhaar_hash = v_hash_v1
      OR aadhaar_hash = v_raw_hex
      OR (v_hash_legacy IS NOT NULL AND aadhaar_hash = v_hash_legacy)
    )
    AND user_id != v_caller_id
  ) INTO v_is_duplicate;

  IF v_is_duplicate THEN
    RAISE EXCEPTION 'This Aadhaar number is already registered with another applicant profile.';
  END IF;

  RETURN v_hash_v1;
END;
$$;

-- Security Privileges: Restrict execution strictly to authenticated users, revoke from PUBLIC/anon
REVOKE ALL ON FUNCTION public.rms_secure_get_aadhaar_hmac(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rms_secure_get_aadhaar_hmac(text) TO authenticated;
