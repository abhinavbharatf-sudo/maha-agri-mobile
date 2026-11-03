-- ============================================================
-- RMS: Aadhaar Hash Column & Server-Side Duplicate Check RPC
-- ============================================================

-- 1. Minimal non-breaking column addition on rms_candidate_profiles
ALTER TABLE public.rms_candidate_profiles
  ADD COLUMN IF NOT EXISTS aadhaar_hash text;

-- 2. Partial unique index to enforce server-side uniqueness across all candidates
CREATE UNIQUE INDEX IF NOT EXISTS idx_rms_candidate_aadhaar_hash
  ON public.rms_candidate_profiles (aadhaar_hash)
  WHERE aadhaar_hash IS NOT NULL;

-- 3. Dedicated SECURITY DEFINER RPC for privacy-preserving duplicate checks across mobile numbers
CREATE OR REPLACE FUNCTION public.rms_check_aadhaar_duplicate(
  p_aadhaar_hash text,
  p_user_id text DEFAULT NULL,
  p_mobile text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_existing_mobile text;
BEGIN
  IF p_aadhaar_hash IS NULL OR length(trim(p_aadhaar_hash)) = 0 THEN
    RETURN jsonb_build_object('is_duplicate', false);
  END IF;

  SELECT id, mobile INTO v_existing_id, v_existing_mobile
  FROM public.rms_candidate_profiles
  WHERE aadhaar_hash = p_aadhaar_hash
    AND (p_user_id IS NULL OR user_id::text != p_user_id)
    AND (p_mobile IS NULL OR replace(mobile, '+91', '') != replace(p_mobile, '+91', ''))
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'is_duplicate', true,
      'message', 'This Aadhaar number is already registered with another applicant profile. Please contact recruitment support if you believe this is an error.'
    );
  END IF;

  RETURN jsonb_build_object('is_duplicate', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rms_check_aadhaar_duplicate(text, text, text) TO authenticated, anon;
