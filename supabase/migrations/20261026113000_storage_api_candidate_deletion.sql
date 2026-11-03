-- ============================================================================
-- MAHA-AGRI Careers / RMS: Storage API Candidate Deletion & Super Admin Policies
-- Migration: 20261026113000_storage_api_candidate_deletion.sql
-- Description:
--   1. Adds storage RLS policies allowing Super Admins to SELECT and DELETE candidate
--      documents via the official Supabase Storage API without triggering protect_delete().
--   2. Adds public.rms_get_candidate_storage_info() to discover all objects belonging
--      to a candidate across all subfolders prior to deletion.
--   3. Updates public.rms_permanently_delete_candidate() to remove direct SQL deletion
--      from storage.objects and enforce a pre-flight check that no storage files remain.
-- ============================================================================

-- 1. Storage RLS Policies for Super Admin on 'candidate-docs' bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'candidate_docs_super_admin_select'
  ) THEN
    CREATE POLICY "candidate_docs_super_admin_select"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'candidate-docs' AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.rbac_roles r ON p.role_id = r.id
            WHERE p.id = auth.uid()
            AND r.key IN ('super_admin', 'ROOT_SUPER_ADMIN', 'SUPER_ADMIN')
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'candidate_docs_super_admin_delete'
  ) THEN
    CREATE POLICY "candidate_docs_super_admin_delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'candidate-docs' AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.rbac_roles r ON p.role_id = r.id
            WHERE p.id = auth.uid()
            AND r.key IN ('super_admin', 'ROOT_SUPER_ADMIN', 'SUPER_ADMIN')
          )
        )
      );
  END IF;
END $$;

-- 2. Candidate Storage Discovery Helper (Super Admin Only)
CREATE OR REPLACE FUNCTION public.rms_get_candidate_storage_info(
  p_candidate_id uuid DEFAULT NULL,
  p_mobile text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_caller_id uuid;
  v_is_super_admin boolean;
  v_candidate public.rms_candidate_profiles%ROWTYPE;
  v_candidate_found boolean := false;
  v_candidate_id uuid;
  v_candidate_code text := 'NONE';
  v_user_id uuid;
  v_raw_mobile text;
  v_norm_mobile text;
  v_storage_paths text[];
BEGIN
  v_caller_id := auth.uid();

  -- Verify caller authorization: Must be Super Admin or service_role
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON p.role_id = r.id
    WHERE p.id = v_caller_id
    AND r.key IN ('super_admin', 'ROOT_SUPER_ADMIN', 'SUPER_ADMIN')
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin AND auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Storage discovery is strictly restricted to Super Admin role.'
    );
  END IF;

  -- Normalize mobile if provided
  IF p_mobile IS NOT NULL AND length(trim(p_mobile)) > 0 THEN
    v_norm_mobile := regexp_replace(p_mobile, '[\+\s\-\(\)]', '', 'g');
    IF length(v_norm_mobile) = 12 AND v_norm_mobile LIKE '91%' THEN
      v_raw_mobile := substring(v_norm_mobile from 3);
    ELSIF length(v_norm_mobile) = 10 THEN
      v_raw_mobile := v_norm_mobile;
      v_norm_mobile := '91' || v_norm_mobile;
    ELSE
      v_raw_mobile := v_norm_mobile;
    END IF;
  END IF;

  -- Resolve Candidate Profile
  IF p_candidate_id IS NOT NULL THEN
    SELECT * INTO v_candidate FROM public.rms_candidate_profiles WHERE id = p_candidate_id;
    IF FOUND THEN
      v_candidate_found := true;
    ELSE
      SELECT * INTO v_candidate FROM public.rms_candidate_profiles WHERE user_id = p_candidate_id;
      IF FOUND THEN
        v_candidate_found := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_candidate_found AND v_raw_mobile IS NOT NULL THEN
    SELECT * INTO v_candidate FROM public.rms_candidate_profiles 
    WHERE mobile = v_raw_mobile OR mobile = v_norm_mobile;
    IF FOUND THEN
      v_candidate_found := true;
    END IF;
  END IF;

  IF v_candidate_found THEN
    v_candidate_id   := v_candidate.id;
    v_user_id        := v_candidate.user_id;
    v_candidate_code := COALESCE(v_candidate.candidate_id, 'NONE');
  END IF;

  -- Fallback: Resolve user_id from auth.users if no profile exists yet
  IF v_user_id IS NULL AND v_norm_mobile IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users 
    WHERE phone = ('+' || v_norm_mobile) OR phone = ('+91' || v_raw_mobile) OR phone = v_raw_mobile OR phone = v_norm_mobile;
  END IF;

  IF v_candidate_id IS NULL AND v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No candidate or user found matching the specified parameters.'
    );
  END IF;

  -- Discover all storage objects for this user_id in 'candidate-docs' bucket
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(name), ARRAY[]::text[]) INTO v_storage_paths
    FROM storage.objects
    WHERE bucket_id = 'candidate-docs'
    AND (
      (storage.foldername(name))[1] = v_user_id::text
      OR name LIKE (v_user_id::text || '/%')
    );
  ELSE
    v_storage_paths := ARRAY[]::text[];
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'candidate_id', v_candidate_id,
    'candidate_code', v_candidate_code,
    'user_id', v_user_id,
    'storage_paths', v_storage_paths
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rms_get_candidate_storage_info(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rms_get_candidate_storage_info(uuid, text) TO authenticated, service_role;

-- 3. Corrected Master Candidate Deletion Stored Procedure
DROP FUNCTION IF EXISTS public.rms_permanently_delete_candidate(uuid, text, text);

CREATE OR REPLACE FUNCTION public.rms_permanently_delete_candidate(
  p_candidate_id uuid DEFAULT NULL,
  p_mobile text DEFAULT NULL,
  p_confirmation text DEFAULT NULL,
  p_storage_files_deleted int DEFAULT 0,
  p_force_ignore_storage boolean DEFAULT false
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_caller_id uuid;
  v_is_super_admin boolean;
  v_candidate public.rms_candidate_profiles%ROWTYPE;
  v_candidate_found boolean := false;
  v_candidate_id uuid;
  v_candidate_code text := 'NONE';
  v_user_id uuid;
  v_mobile text;
  v_raw_mobile text;
  v_norm_mobile text;
  v_lead_id uuid;
  v_remaining_storage int := 0;
  v_deleted_apps int := 0;
  v_deleted_docs int := 0;
  v_deleted_bookings int := 0;
BEGIN
  v_caller_id := auth.uid();

  -- A. Verify caller authorization: Must be Super Admin or ROOT_SUPER_ADMIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON p.role_id = r.id
    WHERE p.id = v_caller_id
    AND r.key IN ('super_admin', 'ROOT_SUPER_ADMIN', 'SUPER_ADMIN')
  ) INTO v_is_super_admin;

  -- Allow service_role execution (direct Supabase Dashboard / SQL editor / CLI)
  IF NOT v_is_super_admin AND auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Permanent candidate deletion is strictly restricted to Super Admin role.'
    );
  END IF;

  -- B. Confirmation check: Must type exact phrase
  IF p_confirmation IS NULL OR p_confirmation <> 'PERMANENTLY DELETE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Confirmation mismatch: You must enter "PERMANENTLY DELETE" to confirm this destructive operation.'
    );
  END IF;

  -- C. Normalize input mobile if provided
  IF p_mobile IS NOT NULL AND length(trim(p_mobile)) > 0 THEN
    v_norm_mobile := regexp_replace(p_mobile, '[\+\s\-\(\)]', '', 'g');
    IF length(v_norm_mobile) = 12 AND v_norm_mobile LIKE '91%' THEN
      v_raw_mobile := substring(v_norm_mobile from 3);
    ELSIF length(v_norm_mobile) = 10 THEN
      v_raw_mobile := v_norm_mobile;
      v_norm_mobile := '91' || v_norm_mobile;
    ELSE
      v_raw_mobile := v_norm_mobile;
    END IF;
  END IF;

  -- D. Resolve Candidate Record safely
  IF p_candidate_id IS NOT NULL THEN
    SELECT * INTO v_candidate FROM public.rms_candidate_profiles WHERE id = p_candidate_id;
    IF FOUND THEN
      v_candidate_found := true;
    ELSE
      SELECT * INTO v_candidate FROM public.rms_candidate_profiles WHERE user_id = p_candidate_id;
      IF FOUND THEN
        v_candidate_found := true;
      END IF;
    END IF;
  END IF;

  IF NOT v_candidate_found AND v_raw_mobile IS NOT NULL THEN
    SELECT * INTO v_candidate FROM public.rms_candidate_profiles 
    WHERE mobile = v_raw_mobile OR mobile = v_norm_mobile;
    IF FOUND THEN
      v_candidate_found := true;
    END IF;
  END IF;

  -- Populate resolved candidate details if a profile was located
  IF v_candidate_found THEN
    v_candidate_id   := v_candidate.id;
    v_user_id        := v_candidate.user_id;
    v_mobile         := v_candidate.mobile;
    v_candidate_code := COALESCE(v_candidate.candidate_id, 'NONE');
  END IF;

  -- Fallback: Resolve Auth User if candidate profile does not exist yet (e.g. OTP login only)
  IF v_user_id IS NULL AND v_norm_mobile IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users 
    WHERE phone = ('+' || v_norm_mobile) OR phone = ('+91' || v_raw_mobile) OR phone = v_raw_mobile OR phone = v_norm_mobile;
  END IF;

  -- Resolve CRM Lead
  IF v_raw_mobile IS NOT NULL THEN
    SELECT id INTO v_lead_id FROM public.crm_leads 
    WHERE mobile_number = v_raw_mobile OR mobile_number = v_norm_mobile OR mobile_number = ('+91' || v_raw_mobile);
  ELSIF v_mobile IS NOT NULL THEN
    SELECT id INTO v_lead_id FROM public.crm_leads 
    WHERE mobile_number = v_mobile OR mobile_number = ('91' || v_mobile) OR mobile_number = ('+91' || v_mobile);
  ELSIF v_user_id IS NOT NULL THEN
    SELECT id INTO v_lead_id FROM public.crm_leads WHERE lead_owner_id = v_user_id;
  END IF;

  IF v_candidate_id IS NULL AND v_user_id IS NULL AND v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No candidate, user, or CRM lead found matching the specified parameters.'
    );
  END IF;

  -- E. Storage Safety Check: Ensure no objects remain in bucket 'candidate-docs'
  -- Direct SQL deletion from storage.objects is avoided to respect protect_delete() trigger.
  IF v_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_remaining_storage
    FROM storage.objects
    WHERE bucket_id = 'candidate-docs'
    AND (
      (storage.foldername(name))[1] = v_user_id::text
      OR name LIKE (v_user_id::text || '/%')
    );

    IF v_remaining_storage > 0 AND NOT p_force_ignore_storage THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Storage cleanup pending: ' || v_remaining_storage || ' file(s) remain in bucket "candidate-docs". Storage objects must be removed via Storage API prior to permanent database purge.',
        'remaining_storage_files', v_remaining_storage
      );
    END IF;
  END IF;

  -- F. Enable transaction-local bypass for CRM activity audit table
  PERFORM set_config('rms.allow_candidate_purge', 'true', true);

  -- 1. Candidate Documents Metadata (must precede candidate profile due to uncascaded FK)
  IF v_candidate_id IS NOT NULL THEN
    WITH deleted_docs AS (
      DELETE FROM public.rms_candidate_documents 
      WHERE candidate_id = v_candidate_id
      OR application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id)
      RETURNING id
    )
    SELECT count(*) INTO v_deleted_docs FROM deleted_docs;
  END IF;

  -- 2. Interview Bookings (fires trg_rms_sync_slot_booked_count_on_delete to restore slot capacity)
  IF v_candidate_id IS NOT NULL THEN
    WITH deleted_bk AS (
      DELETE FROM public.rms_interview_bookings
      WHERE application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id)
      RETURNING id
    )
    SELECT count(*) INTO v_deleted_bookings FROM deleted_bk;
  END IF;

  -- 3. Interview Evaluations
  IF v_candidate_id IS NOT NULL THEN
    DELETE FROM public.rms_interview_evaluations
    WHERE application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id);
  END IF;

  -- 4. Test Payments & Receipts (Allowed in test environment for single candidate)
  IF v_candidate_id IS NOT NULL THEN
    DELETE FROM public.rms_payment_receipts
    WHERE payment_id IN (
      SELECT id FROM public.rms_payments
      WHERE application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id)
    );

    DELETE FROM public.rms_payments
    WHERE application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id);
  END IF;

  -- 5. Appointment Letters & Training Allocations
  IF v_candidate_id IS NOT NULL THEN
    DELETE FROM public.rms_appointment_letters
    WHERE application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id);

    DELETE FROM public.rms_training_allocations
    WHERE application_id IN (SELECT id FROM public.rms_applications WHERE candidate_id = v_candidate_id);
  END IF;

  -- 6. Drive Registrations
  IF v_candidate_id IS NOT NULL THEN
    DELETE FROM public.rms_drive_registrations WHERE candidate_id = v_candidate_id;
  END IF;

  -- 7. Applications (cascades status logs, workflow state, stage logs, and notes)
  IF v_candidate_id IS NOT NULL THEN
    WITH deleted_app_rows AS (
      DELETE FROM public.rms_applications WHERE candidate_id = v_candidate_id
      RETURNING id
    )
    SELECT count(*) INTO v_deleted_apps FROM deleted_app_rows;
  END IF;

  -- 8. Candidate Profile
  IF v_candidate_id IS NOT NULL THEN
    DELETE FROM public.rms_candidate_profiles WHERE id = v_candidate_id;
  END IF;

  -- 9. CRM Lead Data & Activities (Permitted by transaction-local session setting)
  IF v_lead_id IS NOT NULL THEN
    DELETE FROM public.crm_activity_logs WHERE lead_id = v_lead_id;
    DELETE FROM public.crm_lead_interested_jobs WHERE lead_id = v_lead_id;
    DELETE FROM public.crm_call_history WHERE lead_id = v_lead_id;
    DELETE FROM public.crm_whatsapp_logs WHERE lead_id = v_lead_id;
    DELETE FROM public.crm_followup_reminders WHERE lead_id = v_lead_id;
    DELETE FROM public.crm_lead_comments WHERE lead_id = v_lead_id;
    DELETE FROM public.crm_leads WHERE id = v_lead_id;
  END IF;

  -- 10. OTP & Rate-Limiting Tokens
  IF v_raw_mobile IS NOT NULL OR v_mobile IS NOT NULL THEN
    DELETE FROM public.whatsapp_otp
    WHERE mobile_number IN (v_raw_mobile, v_norm_mobile, v_mobile, '+' || v_norm_mobile, '+91' || v_raw_mobile);

    DELETE FROM public.security_rate_limit_events
    WHERE key_value IN (v_raw_mobile, v_norm_mobile, v_mobile, '+' || v_norm_mobile, '+91' || v_raw_mobile);

    DELETE FROM public.whatsapp_message_logs
    WHERE mobile_number IN (v_raw_mobile, v_norm_mobile, v_mobile, '+' || v_norm_mobile, '+91' || v_raw_mobile);
  END IF;

  -- 11. Supabase Auth User
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  -- 12. System Audit Log (Immutable record with masked identifier — ZERO candidate PII retained)
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_caller_id,
    'PERMANENT_PURGE_CANDIDATE',
    'rms_candidate_profiles',
    COALESCE(v_candidate_id::text, v_user_id::text, 'lead:' || v_lead_id::text),
    jsonb_build_object(
      'candidate_code', v_candidate_code,
      'masked_mobile', CASE 
        WHEN v_raw_mobile IS NOT NULL THEN substring(v_raw_mobile, 1, 2) || '****' || substring(v_raw_mobile, 7, 4)
        WHEN v_mobile IS NOT NULL THEN substring(v_mobile, 1, 2) || '****' || substring(v_mobile, 7, 4)
        ELSE 'UNKNOWN'
      END,
      'deleted_applications', v_deleted_apps,
      'deleted_documents', v_deleted_docs,
      'deleted_bookings', v_deleted_bookings,
      'deleted_storage_files', p_storage_files_deleted,
      'purged_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Candidate and all associated data permanently purged.',
    'candidate_code', v_candidate_code,
    'deleted_applications', v_deleted_apps,
    'deleted_documents', v_deleted_docs,
    'deleted_bookings', v_deleted_bookings,
    'deleted_storage_files', p_storage_files_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rms_permanently_delete_candidate(uuid, text, text, int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rms_permanently_delete_candidate(uuid, text, text, int, boolean) TO authenticated, service_role;
