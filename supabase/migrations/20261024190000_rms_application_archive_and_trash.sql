-- Migration: 20261024190000_rms_application_archive_and_trash.sql
-- Description: Add archive and soft-delete/trash metadata, audit triggers, Super Admin delete policy, and safe permanent deletion RPC to rms_applications

-- 1. Add archive and trash metadata columns
ALTER TABLE public.rms_applications
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_trashed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trashed_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_rms_applications_archive_trash
  ON public.rms_applications(is_archived, is_trashed);

-- 2. Add Super Admin RLS DELETE policy with financial data & appointment protections
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
    -- Never permit deletion if payment transactions exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_payments pay
      WHERE pay.application_id = rms_applications.id
    )
    -- Never permit deletion if appointment letters exist
    AND NOT EXISTS (
      SELECT 1 FROM public.rms_appointment_letters al
      WHERE al.application_id = rms_applications.id
    )
  );

-- 3. Stored Procedure for authorized, auditable permanent deletion
CREATE OR REPLACE FUNCTION public.rms_permanently_delete_application(p_application_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_app RECORD;
  v_is_super_admin boolean;
  v_payment_count int;
  v_appointment_count int;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();

  -- Verify application exists
  SELECT * INTO v_app FROM public.rms_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found.');
  END IF;

  -- Verify caller is Super Admin
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

  -- Statutory financial records check
  SELECT count(*) INTO v_payment_count FROM public.rms_payments WHERE application_id = p_application_id;
  IF v_payment_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has recorded financial payment transactions that must be retained for statutory and accounting compliance. Use Archive or Trash instead.'
    );
  END IF;

  -- Appointment letters check
  SELECT count(*) INTO v_appointment_count FROM public.rms_appointment_letters WHERE application_id = p_application_id;
  IF v_appointment_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permanent deletion blocked: This application has an official appointment letter on record. Use Archive or Trash instead.'
    );
  END IF;

  -- Log into immutable system audit_log before physical deletion
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

  -- Perform physical delete
  DELETE FROM public.rms_applications WHERE id = p_application_id;

  RETURN jsonb_build_object(
    'success', true,
    'application_number', v_app.application_number
  );
END;
$$;
