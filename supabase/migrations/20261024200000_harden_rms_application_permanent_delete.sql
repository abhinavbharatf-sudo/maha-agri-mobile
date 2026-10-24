-- Migration: 20261024200000_harden_rms_application_permanent_delete.sql
-- Description: Hardens RMS application permanent delete protection across RLS, RPC, and slot counters.
-- Restricts permanent deletion when payments, appointment letters, interview bookings, evaluations,
-- notes, candidate documents, or training allocations exist.

-- 1. Upgrade Super Admin RLS DELETE policy with comprehensive audit & legal retention checks
DROP POLICY IF EXISTS "rms_applications_super_admin_delete" ON public.rms_applications;
CREATE POLICY "rms_applications_super_admin_delete" ON public.rms_applications
  FOR DELETE TO authenticated
  USING (
    -- Caller must have super_admin or ROOT_SUPER_ADMIN role
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.rbac_roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.key IN ('super_admin', 'ROOT_SUPER_ADMIN')
    )
    -- Never permit deletion if financial payment transactions exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_payments pay
      WHERE pay.application_id = rms_applications.id
    )
    -- Never permit deletion if appointment letters exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_appointment_letters al
      WHERE al.application_id = rms_applications.id
    )
    -- Never permit deletion if interview bookings exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_interview_bookings ib
      WHERE ib.application_id = rms_applications.id
    )
    -- Never permit deletion if interview evaluations exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_interview_evaluations ie
      WHERE ie.application_id = rms_applications.id
    )
    -- Never permit deletion if application / interview notes exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_application_notes an
      WHERE an.application_id = rms_applications.id
    )
    -- Never permit deletion if candidate documents exist (avoids orphaned storage files)
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_candidate_documents cd
      WHERE cd.application_id = rms_applications.id
    )
    -- Never permit deletion if training batch allocations exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_training_allocations ta
      WHERE ta.application_id = rms_applications.id
    )
  );

-- 2. Upgrade Stored Procedure for authorized, hardened permanent deletion
CREATE OR REPLACE FUNCTION public.rms_permanently_delete_application(p_application_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app RECORD;
  v_is_super_admin boolean;
  v_payment_count int;
  v_appointment_count int;
  v_booking_count int;
  v_eval_count int;
  v_notes_count int;
  v_docs_count int;
  v_training_count int;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();

  -- 1. Verify application exists
  SELECT * INTO v_app FROM public.rms_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  -- 2. Verify caller is Super Admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON p.role_id = r.id
    WHERE p.id = v_caller_id
    AND r.key IN ('super_admin', 'ROOT_SUPER_ADMIN')
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Permanent application deletion is strictly restricted to Super Admin role.'
    );
  END IF;

  -- 3. Statutory financial records check
  SELECT count(*) INTO v_payment_count FROM public.rms_payments WHERE application_id = p_application_id;
  IF v_payment_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has recorded financial payment transactions that must be retained for statutory and accounting compliance. Use Archive or Trash instead.'
    );
  END IF;

  -- 4. Appointment letters check
  SELECT count(*) INTO v_appointment_count FROM public.rms_appointment_letters WHERE application_id = p_application_id;
  IF v_appointment_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has an official appointment letter on record. Use Archive or Trash instead.'
    );
  END IF;

  -- 5. Interview bookings check (protects schedule tracking and prevents capacity inconsistencies)
  SELECT count(*) INTO v_booking_count FROM public.rms_interview_bookings WHERE application_id = p_application_id;
  IF v_booking_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has an interview booking on record. Deleting would corrupt slot capacity tracking. Cancel or reschedule the booking first, or use Archive / Trash.'
    );
  END IF;

  -- 6. Interview evaluations check (protects candidate evaluation scores)
  SELECT count(*) INTO v_eval_count FROM public.rms_interview_evaluations WHERE application_id = p_application_id;
  IF v_eval_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has recorded interviewer evaluation scores and recommendations. Retain records using Archive or Trash.'
    );
  END IF;

  -- 7. Application notes check (protects recruiter / interview audit notes)
  SELECT count(*) INTO v_notes_count FROM public.rms_application_notes WHERE application_id = p_application_id;
  IF v_notes_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application contains interview or recruitment notes. Retain records using Archive or Trash.'
    );
  END IF;

  -- 8. Candidate documents check (prevents orphaned binary storage files)
  SELECT count(*) INTO v_docs_count FROM public.rms_candidate_documents WHERE application_id = p_application_id;
  IF v_docs_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has candidate documents attached. Retain records using Archive or Trash to prevent orphaned file records.'
    );
  END IF;

  -- 9. Training allocations check
  SELECT count(*) INTO v_training_count FROM public.rms_training_allocations WHERE application_id = p_application_id;
  IF v_training_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has been allocated to a training batch. Use Archive or Trash instead.'
    );
  END IF;

  -- 10. Log into immutable system audit_log before physical deletion
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_caller_id,
    'PERMANENT_DELETE_APPLICATION',
    'rms_applications',
    p_application_id::text,
    jsonb_build_object(
      'application_number', v_app.application_number,
      'candidate_id', v_app.candidate_id,
      'job_posting_id', v_app.job_posting_id,
      'status', v_app.status,
      'deleted_at', now()
    )
  );

  -- 11. Perform physical delete of eligible, unencumbered application
  DELETE FROM public.rms_applications WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'success', true,
    'application_number', v_app.application_number
  );
END;
$$;

-- 3. Trigger to maintain slot booked_count consistency if an interview booking is deleted
CREATE OR REPLACE FUNCTION public.rms_sync_slot_booked_count_on_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.rms_interview_slots
  SET booked_count = GREATEST(0, booked_count - 1),
      updated_at = now()
  WHERE id = OLD.slot_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_rms_sync_slot_booked_count_on_delete ON public.rms_interview_bookings;
CREATE TRIGGER trg_rms_sync_slot_booked_count_on_delete
  AFTER DELETE ON public.rms_interview_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.rms_sync_slot_booked_count_on_delete();
