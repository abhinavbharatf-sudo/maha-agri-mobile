-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 07_20261109150000_employee_id_and_location_fields.sql
-- Target: ABF DIGITAL PRODUCTION (dmtetjahbxedugszztla)
--
-- Description:
--   M0 Essential Prerequisite: Deploys employee code generation, sequence,
--   location assignments, and security triggers on public.profiles.
-- ============================================================================

-- ── 1. Column Extensions on public.profiles ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_code    text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS assigned_state   text DEFAULT 'Maharashtra',
  ADD COLUMN IF NOT EXISTS assigned_district text,
  ADD COLUMN IF NOT EXISTS assigned_taluka   text,
  ADD COLUMN IF NOT EXISTS assigned_location text;

-- ── 2. Sequence and Unique Index ────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.staff_employee_code_seq START WITH 1001;
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_employee_code
  ON public.profiles(employee_code)
  WHERE employee_code IS NOT NULL;

-- ── 3. Generator Function ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_staff_employee_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year text := to_char(CURRENT_DATE, 'YYYY');
  v_seq bigint;
  v_code text;
BEGIN
  LOOP
    v_seq := nextval('public.staff_employee_code_seq');
    v_code := 'MA-STF-' || v_year || '-' || lpad(v_seq::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE employee_code = v_code) THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

-- ── 4. Trigger for Automatic Assignment on Insert ───────────────────────────
CREATE OR REPLACE FUNCTION public.trg_assign_staff_employee_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.employee_code IS NULL OR trim(NEW.employee_code) = '' THEN
    NEW.employee_code := public.generate_staff_employee_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_staff_employee_code ON public.profiles;
CREATE TRIGGER trg_assign_staff_employee_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_staff_employee_code();

-- ── 5. Field Protection Trigger on public.profiles ──────────────────────────
CREATE OR REPLACE FUNCTION public.trg_protect_staff_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Database administrative/maintenance sessions bypass self-service checks
  IF (session_user = 'postgres' OR public.is_admin()) THEN
    RETURN NEW;
  END IF;

  -- Non-admin cannot modify another user's profile
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Access denied: You cannot modify another employee profile';
  END IF;

  -- Non-admin cannot modify employee_code
  IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
    RAISE EXCEPTION 'Access denied: Employee ID is system-controlled and cannot be altered';
  END IF;

  -- Non-admin cannot modify role_id
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    RAISE EXCEPTION 'Access denied: System role cannot be altered';
  END IF;

  -- Non-admin cannot modify designation
  IF NEW.designation IS DISTINCT FROM OLD.designation THEN
    RAISE EXCEPTION 'Access denied: Designation cannot be altered';
  END IF;

  -- Non-admin cannot modify department
  IF NEW.department IS DISTINCT FROM OLD.department THEN
    RAISE EXCEPTION 'Access denied: Department cannot be altered';
  END IF;

  -- Non-admin cannot modify is_active status
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Access denied: Account status cannot be altered';
  END IF;

  -- Non-admin cannot modify assigned location fields
  IF NEW.assigned_location IS DISTINCT FROM OLD.assigned_location 
     OR NEW.assigned_district IS DISTINCT FROM OLD.assigned_district 
     OR NEW.assigned_taluka IS DISTINCT FROM OLD.assigned_taluka 
     OR NEW.assigned_state IS DISTINCT FROM OLD.assigned_state THEN
    RAISE EXCEPTION 'Access denied: Assigned location cannot be altered';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_staff_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_staff_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_protect_staff_profile_fields();

-- ── 6. Deterministic, Role-Aware Backfill for Existing Profiles ──────────────
DO $$
DECLARE
  rec record;
  v_seq bigint;
  v_year text := to_char(CURRENT_DATE, 'YYYY');
BEGIN
  FOR rec IN (
    SELECT p.id, roles.key as role_key 
    FROM public.profiles p 
    LEFT JOIN public.rbac_roles roles ON p.role_id = roles.id 
    WHERE p.employee_code IS NULL 
    ORDER BY p.created_at ASC
  ) LOOP
    v_seq := nextval('public.staff_employee_code_seq');
    IF rec.role_key = 'super_admin' THEN
      UPDATE public.profiles
      SET employee_code = 'MA-SUP-' || v_year || '-' || lpad(v_seq::text, 4, '0')
      WHERE id = rec.id;
    ELSIF rec.role_key = 'admin' THEN
      UPDATE public.profiles
      SET employee_code = 'MA-ADM-' || v_year || '-' || lpad(v_seq::text, 4, '0')
      WHERE id = rec.id;
    ELSE
      UPDATE public.profiles
      SET employee_code = 'MA-STF-' || v_year || '-' || lpad(v_seq::text, 4, '0')
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- ── 7. Profile Update RPC with Location & Contact Arguments ─────────────────
CREATE OR REPLACE FUNCTION public.rms_update_staff_profile(
  p_user_id           uuid,
  p_full_name         text,
  p_designation       text,
  p_department        text,
  p_role_key          text DEFAULT NULL::text,
  p_assigned_state    text DEFAULT NULL::text,
  p_assigned_district text DEFAULT NULL::text,
  p_assigned_taluka   text DEFAULT NULL::text,
  p_assigned_location text DEFAULT NULL::text,
  p_phone             text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_id uuid;
  v_old_profile record;
BEGIN
  IF NOT (public.is_admin() OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required to update staff profiles.');
  END IF;

  SELECT * INTO v_old_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff user not found.');
  END IF;

  IF p_role_key IS NOT NULL THEN
    SELECT id INTO v_role_id FROM public.rbac_roles WHERE key = p_role_key;
  END IF;

  UPDATE public.profiles
  SET full_name = COALESCE(NULLIF(trim(p_full_name), ''), full_name),
      designation = COALESCE(NULLIF(trim(p_designation), ''), designation),
      department = COALESCE(NULLIF(trim(p_department), ''), department),
      role_id = COALESCE(v_role_id, role_id),
      assigned_state = COALESCE(NULLIF(trim(p_assigned_state), ''), assigned_state),
      assigned_district = COALESCE(NULLIF(trim(p_assigned_district), ''), assigned_district),
      assigned_taluka = COALESCE(NULLIF(trim(p_assigned_taluka), ''), assigned_taluka),
      assigned_location = COALESCE(NULLIF(trim(p_assigned_location), ''), assigned_location),
      phone = COALESCE(NULLIF(trim(p_phone), ''), phone),
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    'STAFF_PROFILE_UPDATED',
    'staff_user',
    p_user_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'name', v_old_profile.full_name,
        'designation', v_old_profile.designation,
        'department', v_old_profile.department,
        'district', v_old_profile.assigned_district,
        'taluka', v_old_profile.assigned_taluka
      ),
      'after', jsonb_build_object(
        'name', p_full_name,
        'designation', p_designation,
        'department', p_department,
        'district', p_assigned_district,
        'taluka', p_assigned_taluka
      )
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Staff profile updated successfully.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.rms_update_staff_profile(uuid, text, text, text, text, text, text, text, text, text) TO authenticated;
