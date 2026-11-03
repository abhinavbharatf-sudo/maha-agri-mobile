-- ============================================================================
-- MAHA-AGRI Careers / RMS: Fix Foreign-Key Dependency on auth.users for Job Postings
-- Migration: 20261026114000_fix_job_postings_created_by_fk.sql
-- Description:
--   1. Updates foreign key constraints on operational records (rms_job_postings,
--      rms_campaigns, rms_workflow_templates, etc.) to ON DELETE SET NULL.
--      This preserves all job postings, campaigns, vacancies, and historical data
--      without deletion, while allowing candidate auth.users deletion.
--   2. Updates public.rms_permanently_delete_candidate() to explicitly detach
--      operational creator references before deleting auth.users.
-- ============================================================================

-- 1. Alter Foreign Key Constraints to ON DELETE SET NULL
ALTER TABLE public.rms_job_postings
  DROP CONSTRAINT IF EXISTS rms_job_postings_created_by_fkey,
  ADD CONSTRAINT rms_job_postings_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_campaigns
  DROP CONSTRAINT IF EXISTS rms_campaigns_created_by_fkey,
  ADD CONSTRAINT rms_campaigns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_campaigns
  DROP CONSTRAINT IF EXISTS rms_campaigns_campaign_owner_id_fkey,
  ADD CONSTRAINT rms_campaigns_campaign_owner_id_fkey
    FOREIGN KEY (campaign_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_workflow_templates
  DROP CONSTRAINT IF EXISTS rms_workflow_templates_created_by_fkey,
  ADD CONSTRAINT rms_workflow_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_recruitment_drives
  DROP CONSTRAINT IF EXISTS rms_recruitment_drives_created_by_fkey,
  ADD CONSTRAINT rms_recruitment_drives_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_interview_slots
  DROP CONSTRAINT IF EXISTS rms_interview_slots_created_by_fkey,
  ADD CONSTRAINT rms_interview_slots_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_training_batches
  DROP CONSTRAINT IF EXISTS rms_training_batches_created_by_fkey,
  ADD CONSTRAINT rms_training_batches_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rms_vacancy_audit
  DROP CONSTRAINT IF EXISTS rms_vacancy_audit_changed_by_fkey,
  ADD CONSTRAINT rms_vacancy_audit_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey,
  ADD CONSTRAINT audit_log_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Update Master Candidate Deletion Stored Procedure to detach operational references
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

  -- 11. Detach operational references from auth.users prior to deletion
  -- Preserves all job postings, campaigns, vacancies, and audit logs with created_by = NULL
  IF v_user_id IS NOT NULL THEN
    UPDATE public.rms_job_postings SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE public.rms_campaigns SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE public.rms_campaigns SET campaign_owner_id = NULL WHERE campaign_owner_id = v_user_id;
    UPDATE public.rms_workflow_templates SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE public.rms_recruitment_drives SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE public.rms_interview_slots SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE public.rms_training_batches SET created_by = NULL WHERE created_by = v_user_id;
    UPDATE public.rms_vacancy_audit SET changed_by = NULL WHERE changed_by = v_user_id;
    UPDATE public.audit_log SET actor_id = NULL WHERE actor_id = v_user_id;
  END IF;

  -- 12. Supabase Auth User
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  -- 13. System Audit Log (Immutable record with masked identifier — ZERO candidate PII retained)
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
