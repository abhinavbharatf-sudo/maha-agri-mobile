-- ============================================================================
-- MAHA-AGRI Careers / RMS: Security Rate Limiting & Concurrency-Safe OTP
-- Migration: 20261025020000_security_rate_limiting_and_otp_hardening.sql
-- ============================================================================

-- 1. Rate Limit Security Events Table
CREATE TABLE IF NOT EXISTS public.security_rate_limit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type        text NOT NULL, -- 'mobile', 'ip', 'candidate_id'
  key_value       text NOT NULL, -- normalized mobile, IP address, or UUID
  action          text NOT NULL, -- 'generate_otp', 'verify_otp_failed', 'submit_application'
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for sub-millisecond sliding window evaluations
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup 
ON public.security_rate_limit_events (key_type, key_value, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_created_at
ON public.security_rate_limit_events (created_at);

-- RLS: Service role only (Edge function security definer access)
ALTER TABLE public.security_rate_limit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sec_events_service_all" ON public.security_rate_limit_events;
CREATE POLICY "sec_events_service_all" ON public.security_rate_limit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Helper function to normalize Indian mobile numbers
CREATE OR REPLACE FUNCTION public.normalize_in_mobile(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cleaned text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  v_cleaned := regexp_replace(p_phone, '[\+\s\-\(\)]', '', 'g');
  IF length(v_cleaned) = 10 THEN
    RETURN '91' || v_cleaned;
  ELSIF length(v_cleaned) = 12 AND v_cleaned LIKE '91%' THEN
    RETURN v_cleaned;
  ELSIF length(v_cleaned) = 13 AND v_cleaned LIKE '091%' THEN
    RETURN substring(v_cleaned from 2);
  END IF;
  RETURN v_cleaned;
END;
$$;

-- 3. Atomic OTP Generation RPC with 30s Cooldown, 24h Quota (15), and Failure Throttling
CREATE OR REPLACE FUNCTION public.whatsapp_request_otp_secure(
  p_mobile text,
  p_otp_hash text,
  p_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mobile text;
  v_recent_failures integer;
  v_retry_after integer;
  v_cooldown_remaining integer;
  v_daily_count integer;
  v_ip_count integer;
  v_otp_id uuid;
  v_expires_at timestamptz;
BEGIN
  v_mobile := public.normalize_in_mobile(p_mobile);
  IF v_mobile IS NULL OR length(v_mobile) < 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'code', 'INVALID_MOBILE',
      'message', 'Please enter a valid 10-digit mobile number.'
    );
  END IF;

  -- 3a. Check for Temporary Lockout (>= 10 failed verifications in last 15 minutes)
  SELECT count(*)
  INTO v_recent_failures
  FROM public.security_rate_limit_events
  WHERE key_type = 'mobile'
    AND key_value = v_mobile
    AND action = 'verify_otp_failed'
    AND created_at > now() - interval '15 minutes';

  IF v_recent_failures >= 10 THEN
    SELECT EXTRACT(EPOCH FROM (min(created_at) + interval '15 minutes' - now()))::int
    INTO v_retry_after
    FROM (
      SELECT created_at
      FROM public.security_rate_limit_events
      WHERE key_type = 'mobile'
        AND key_value = v_mobile
        AND action = 'verify_otp_failed'
        AND created_at > now() - interval '15 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    ) sub;

    RETURN jsonb_build_object(
      'success', false,
      'status', 429,
      'code', 'TEMPORARILY_LOCKED',
      'retry_after', GREATEST(v_retry_after, 1),
      'message', 'Too many failed verification attempts. For your security, this mobile number is temporarily locked. Please try again in ' || CEIL(GREATEST(v_retry_after, 1)::numeric / 60) || ' minutes.'
    );
  END IF;

  -- 3b. Check 30-Second Minimum Cooldown Between Requests
  SELECT EXTRACT(EPOCH FROM (max(created_at) + interval '30 seconds' - now()))::int
  INTO v_cooldown_remaining
  FROM public.whatsapp_otp
  WHERE mobile_number = v_mobile
    AND created_at > now() - interval '30 seconds';

  IF v_cooldown_remaining IS NOT NULL AND v_cooldown_remaining > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 429,
      'code', 'COOLDOWN_ACTIVE',
      'retry_after', v_cooldown_remaining,
      'message', 'Please wait ' || v_cooldown_remaining || ' seconds before requesting another OTP.'
    );
  END IF;

  -- 3c. Check 15 Requests per Rolling 24-Hour Quota
  SELECT count(*)
  INTO v_daily_count
  FROM public.whatsapp_otp
  WHERE mobile_number = v_mobile
    AND created_at > now() - interval '24 hours';

  IF v_daily_count >= 15 THEN
    SELECT EXTRACT(EPOCH FROM (min(created_at) + interval '24 hours' - now()))::int
    INTO v_retry_after
    FROM (
      SELECT created_at
      FROM public.whatsapp_otp
      WHERE mobile_number = v_mobile
        AND created_at > now() - interval '24 hours'
      ORDER BY created_at DESC
      LIMIT 15
    ) sub;

    RETURN jsonb_build_object(
      'success', false,
      'status', 429,
      'code', 'DAILY_LIMIT_EXCEEDED',
      'retry_after', GREATEST(v_retry_after, 1),
      'message', 'Daily OTP limit reached for this mobile number (maximum 15 requests per 24 hours). Please try again later.'
    );
  END IF;

  -- 3d. Check IP Burst Limit (Max 60 OTP requests per hour per IP)
  IF p_ip IS NOT NULL AND length(trim(p_ip)) > 0 THEN
    SELECT count(*)
    INTO v_ip_count
    FROM public.security_rate_limit_events
    WHERE key_type = 'ip'
      AND key_value = p_ip
      AND action = 'generate_otp'
      AND created_at > now() - interval '1 hour';

    IF v_ip_count >= 60 THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 429,
        'code', 'IP_RATE_LIMITED',
        'retry_after', 3600,
        'message', 'Too many OTP requests from this network. Please try again later.'
      );
    END IF;
  END IF;

  -- 3e. Atomic Insertion of New OTP Record (5-minute expiry, max 5 attempts)
  INSERT INTO public.whatsapp_otp (
    mobile_number,
    otp_code,
    template_name,
    expires_at,
    max_attempts,
    attempts,
    consumed,
    verified
  ) VALUES (
    v_mobile,
    p_otp_hash,
    'otp',
    now() + interval '5 minutes',
    5,
    0,
    false,
    false
  ) RETURNING id, expires_at INTO v_otp_id, v_expires_at;

  -- Record IP rate limit event if available
  IF p_ip IS NOT NULL AND length(trim(p_ip)) > 0 THEN
    INSERT INTO public.security_rate_limit_events (key_type, key_value, action)
    VALUES ('ip', p_ip, 'generate_otp');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 200,
    'otp_id', v_otp_id,
    'expires_at', v_expires_at,
    'normalized_mobile', v_mobile
  );
END;
$$;

-- 4. Concurrency-Safe Atomic OTP Verification RPC
CREATE OR REPLACE FUNCTION public.whatsapp_verify_otp_secure(
  p_mobile text,
  p_otp_hash text,
  p_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mobile text;
  v_recent_failures integer;
  v_retry_after integer;
  v_otp record;
  v_new_attempts integer;
BEGIN
  v_mobile := public.normalize_in_mobile(p_mobile);
  IF v_mobile IS NULL OR length(v_mobile) < 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'code', 'INVALID_MOBILE',
      'message', 'Please enter a valid mobile number.'
    );
  END IF;

  -- 4a. Check for Temporary Lockout (>= 10 failed verifications in last 15 minutes)
  SELECT count(*)
  INTO v_recent_failures
  FROM public.security_rate_limit_events
  WHERE key_type = 'mobile'
    AND key_value = v_mobile
    AND action = 'verify_otp_failed'
    AND created_at > now() - interval '15 minutes';

  IF v_recent_failures >= 10 THEN
    SELECT EXTRACT(EPOCH FROM (min(created_at) + interval '15 minutes' - now()))::int
    INTO v_retry_after
    FROM (
      SELECT created_at
      FROM public.security_rate_limit_events
      WHERE key_type = 'mobile'
        AND key_value = v_mobile
        AND action = 'verify_otp_failed'
        AND created_at > now() - interval '15 minutes'
      ORDER BY created_at DESC
      LIMIT 10
    ) sub;

    RETURN jsonb_build_object(
      'success', false,
      'status', 429,
      'code', 'TEMPORARILY_LOCKED',
      'retry_after', GREATEST(v_retry_after, 1),
      'message', 'Too many failed verification attempts. For your security, this mobile number is temporarily locked. Please try again in ' || CEIL(GREATEST(v_retry_after, 1)::numeric / 60) || ' minutes.'
    );
  END IF;

  -- 4b. Row Lock on Latest Active Unconsumed, Unexpired OTP
  SELECT id, otp_code, attempts, max_attempts, expires_at
  INTO v_otp
  FROM public.whatsapp_otp
  WHERE mobile_number = v_mobile
    AND consumed = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'code', 'NO_ACTIVE_OTP',
      'message', 'Invalid or expired OTP. Please request a new OTP.'
    );
  END IF;

  -- 4c. Verify Hash Match
  IF v_otp.otp_code = p_otp_hash THEN
    -- Successful Verification: Atomically mark consumed and verified
    UPDATE public.whatsapp_otp
    SET consumed = true,
        verified = true
    WHERE id = v_otp.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 200,
      'verified', true,
      'otp_id', v_otp.id,
      'normalized_mobile', v_mobile
    );
  ELSE
    -- Failed Verification: Atomically increment attempts
    v_new_attempts := v_otp.attempts + 1;

    -- Record failed attempt security event
    INSERT INTO public.security_rate_limit_events (key_type, key_value, action, metadata)
    VALUES ('mobile', v_mobile, 'verify_otp_failed', jsonb_build_object('otp_id', v_otp.id));

    IF p_ip IS NOT NULL AND length(trim(p_ip)) > 0 THEN
      INSERT INTO public.security_rate_limit_events (key_type, key_value, action)
      VALUES ('ip', p_ip, 'verify_otp_failed');
    END IF;

    -- If this failure reaches the cumulative 10-failure threshold in 15m: Lock immediately
    IF (v_recent_failures + 1) >= 10 THEN
      UPDATE public.whatsapp_otp
      SET attempts = v_new_attempts,
          consumed = true
      WHERE id = v_otp.id;

      RETURN jsonb_build_object(
        'success', false,
        'status', 429,
        'code', 'TEMPORARILY_LOCKED',
        'attempts', v_new_attempts,
        'max_attempts', v_otp.max_attempts,
        'retry_after', 900,
        'message', 'Too many failed verification attempts across requests. Account temporarily locked for 15 minutes.'
      );
    END IF;

    -- If 5-attempt limit reached on this specific OTP: Invalidate OTP
    IF v_new_attempts >= v_otp.max_attempts THEN
      UPDATE public.whatsapp_otp
      SET attempts = v_new_attempts,
          consumed = true
      WHERE id = v_otp.id;

      RETURN jsonb_build_object(
        'success', false,
        'status', 400,
        'code', 'MAX_ATTEMPTS_EXCEEDED',
        'attempts', v_new_attempts,
        'max_attempts', v_otp.max_attempts,
        'remaining', 0,
        'consumed', true,
        'message', 'Invalid OTP. Maximum verification attempts (5) exceeded. Please request a new OTP.'
      );
    ELSE
      UPDATE public.whatsapp_otp
      SET attempts = v_new_attempts
      WHERE id = v_otp.id;

      RETURN jsonb_build_object(
        'success', false,
        'status', 400,
        'code', 'INVALID_OTP',
        'attempts', v_new_attempts,
        'max_attempts', v_otp.max_attempts,
        'remaining', (v_otp.max_attempts - v_new_attempts),
        'consumed', false,
        'message', 'Invalid OTP. ' || (v_otp.max_attempts - v_new_attempts) || ' attempts remaining.'
      );
    END IF;
  END IF;
END;
$$;

-- 5. Targeted Server-Side Rate Limit Trigger on Application Submissions (Max 10 per candidate per hour)
CREATE OR REPLACE FUNCTION public.check_application_submission_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_count integer;
BEGIN
  IF NEW.candidate_id IS NOT NULL THEN
    SELECT count(*)
    INTO v_recent_count
    FROM public.rms_applications
    WHERE candidate_id = NEW.candidate_id
      AND created_at > now() - interval '1 hour';

    IF v_recent_count >= 10 THEN
      RAISE EXCEPTION 'Rate limit exceeded: You have submitted % applications in the past hour. Maximum allowed is 10 per hour.', v_recent_count
        USING ERRCODE = 'P0429';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_application_submission_rate_limit ON public.rms_applications;
CREATE TRIGGER trg_check_application_submission_rate_limit
  BEFORE INSERT ON public.rms_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.check_application_submission_rate_limit();
