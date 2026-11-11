-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261108120000_staff_management_interviewer_authorization.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Implements Staff User Management & Interviewer Authorization System:
--   1. Extends public.profiles with employment designation and department.
--   2. Extends public.rms_interviewers with deauthorization tracking.
--   3. Creates public.rms_interviewer_audit_log for immutable authorization audits.
--   4. Hardens RLS on public.profiles to allow administrative staff directory access.
--   5. Creates atomic server-side RPCs for staff management and interviewer authorization.
--   6. Enforces that inactive staff members cannot receive interview allocations.
-- ============================================================================

-- ── 1. Schema Extensions on public.profiles ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS designation text NOT NULL DEFAULT 'Other Staff',
  ADD COLUMN IF NOT EXISTS department  text NOT NULL DEFAULT 'General Operations';

CREATE INDEX IF NOT EXISTS idx_profiles_designation ON public.profiles(designation);
CREATE INDEX IF NOT EXISTS idx_profiles_department  ON public.profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles(role_id, is_active);

-- ── 2. Schema Extensions on public.rms_interviewers ─────────────────────────
ALTER TABLE public.rms_interviewers
  ADD COLUMN IF NOT EXISTS role_at_authorization  text,
  ADD COLUMN IF NOT EXISTS deauthorized_at        timestamptz,
  ADD COLUMN IF NOT EXISTS deauthorized_by        uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deauthorization_reason  text;

CREATE INDEX IF NOT EXISTS idx_rms_interviewers_deauth ON public.rms_interviewers(deauthorized_at);

-- ── 3. Dedicated Interviewer Authorization Audit Trail ──────────────────────
CREATE TABLE IF NOT EXISTS public.rms_interviewer_audit_log (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  interviewer_id      uuid REFERENCES public.rms_interviewers(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action              text NOT NULL CHECK (lower(action) IN ('authorized', 'deauthorized', 'deactivated', 'reactivated')),
  performed_by        uuid REFERENCES auth.users(id),
  designation_at_time text,
  department_at_time  text,
  reason              text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.rms_interviewer_audit_log DROP CONSTRAINT IF EXISTS rms_interviewer_audit_log_action_check;
ALTER TABLE public.rms_interviewer_audit_log ADD CONSTRAINT rms_interviewer_audit_log_action_check CHECK (lower(action) IN ('authorized', 'deauthorized', 'deactivated', 'reactivated'));

CREATE INDEX IF NOT EXISTS idx_rms_intv_audit_intv ON public.rms_interviewer_audit_log(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_rms_intv_audit_user ON public.rms_interviewer_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rms_intv_audit_created ON public.rms_interviewer_audit_log(created_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.rms_interviewer_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rms_intv_audit_admin_select" ON public.rms_interviewer_audit_log;
CREATE POLICY "rms_intv_audit_admin_select" ON public.rms_interviewer_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_hr_or_admin());

DROP POLICY IF EXISTS "rms_intv_audit_admin_insert" ON public.rms_interviewer_audit_log;
CREATE POLICY "rms_intv_audit_admin_insert" ON public.rms_interviewer_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_hr_or_admin());

REVOKE ALL ON public.rms_interviewer_audit_log FROM anon;
GRANT SELECT, INSERT ON public.rms_interviewer_audit_log TO authenticated;
REVOKE DELETE ON public.rms_interviewers FROM authenticated, anon;

-- ── 4. RLS Hardening on public.profiles for Admin Directory Access ───────────
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_hr_or_admin()
    OR auth.uid() = id
  );

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. Administrative RPC: Staff Directory Listing ──────────────────────────
CREATE OR REPLACE FUNCTION public.rms_list_staff_directory(
  p_search      text DEFAULT NULL,
  p_department  text DEFAULT NULL,
  p_designation text DEFAULT NULL,
  p_status      text DEFAULT NULL -- 'active' | 'inactive' | 'all'
)
RETURNS TABLE (
  id                    uuid,
  email                 text,
  full_name             text,
  designation           text,
  department            text,
  role_id               uuid,
  role_key              text,
  role_name             text,
  is_active             boolean,
  created_at            timestamptz,
  is_interviewer        boolean,
  interviewer_id        uuid,
  interviewer_is_active boolean,
  interviewer_meet_link text,
  authorized_at         timestamptz,
  authorized_by         uuid,
  authorized_by_name    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Strict server-side RBAC: Only Super Admin, Admin or HR can list staff directory
  IF NOT (public.is_admin() OR public.is_hr_or_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RAISE EXCEPTION 'Unauthorized: Administrative role required to access staff directory.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.designation,
    p.department,
    p.role_id,
    r.key  AS role_key,
    r.name AS role_name,
    p.is_active,
    p.created_at,
    (intv.id IS NOT NULL) AS is_interviewer,
    intv.id AS interviewer_id,
    intv.is_active AS interviewer_is_active,
    intv.default_meet_link AS interviewer_meet_link,
    intv.authorized_at,
    intv.authorized_by,
    auth_admin.full_name AS authorized_by_name
  FROM public.profiles p
  JOIN public.rbac_roles r ON r.id = p.role_id
  LEFT JOIN public.rms_interviewers intv ON intv.user_id = p.id
  LEFT JOIN public.profiles auth_admin ON auth_admin.id = intv.authorized_by
  WHERE r.key IN ('admin', 'super_admin', 'staff', 'hr', 'hr_manager', 'editor')
    AND (
      p_search IS NULL
      OR p_search = ''
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.email ILIKE '%' || p_search || '%'
      OR p.designation ILIKE '%' || p_search || '%'
    )
    AND (
      p_department IS NULL
      OR p_department = 'all'
      OR p.department = p_department
    )
    AND (
      p_designation IS NULL
      OR p_designation = 'all'
      OR p.designation = p_designation
    )
    AND (
      p_status IS NULL
      OR p_status = 'all'
      OR (p_status = 'active' AND p.is_active = true)
      OR (p_status = 'inactive' AND p.is_active = false)
    )
  ORDER BY p.full_name ASC;
END;
$$;

-- ── 6. Administrative RPC: Create or Invite Staff User ──────────────────────
CREATE OR REPLACE FUNCTION public.rms_create_or_invite_staff(
  p_email       text,
  p_full_name   text,
  p_designation text DEFAULT 'Other Staff',
  p_department  text DEFAULT 'General Operations',
  p_role_key    text DEFAULT 'staff' -- 'staff' | 'admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_id uuid;
  v_user_id uuid;
  v_is_new  boolean := false;
BEGIN
  -- Super Admin or Admin only
  IF NOT (public.is_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required to create staff users.');
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email is required.');
  END IF;

  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full name is required.');
  END IF;

  -- Validate role
  SELECT id INTO v_role_id FROM public.rbac_roles WHERE key = p_role_key;
  IF NOT FOUND THEN
    SELECT id INTO v_role_id FROM public.rbac_roles WHERE key = 'staff';
  END IF;

  -- Check if user exists in auth.users or profiles
  SELECT id INTO v_user_id FROM public.profiles WHERE email = trim(lower(p_email));

  IF v_user_id IS NOT NULL THEN
    -- Update existing profile to staff role & designation
    UPDATE public.profiles
    SET full_name = trim(p_full_name),
        designation = trim(p_designation),
        department = trim(p_department),
        role_id = v_role_id,
        is_active = true,
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    -- Check if user exists in auth.users without profile
    SELECT id INTO v_user_id FROM auth.users WHERE email = trim(lower(p_email));
    
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.profiles (id, email, full_name, designation, department, role_id, is_active)
      VALUES (v_user_id, trim(lower(p_email)), trim(p_full_name), trim(p_designation), trim(p_department), v_role_id, true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        role_id = EXCLUDED.role_id,
        is_active = true;
    ELSE
      -- User does not exist yet in auth.users; generate new identity record
      v_user_id := gen_random_uuid();
      v_is_new := true;

      INSERT INTO auth.users (
        id, email, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        v_user_id,
        trim(lower(p_email)),
        'authenticated',
        'authenticated',
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role_key),
        jsonb_build_object('full_name', trim(p_full_name)),
        now(),
        now()
      );

      INSERT INTO public.profiles (id, email, full_name, designation, department, role_id, is_active)
      VALUES (v_user_id, trim(lower(p_email)), trim(p_full_name), trim(p_designation), trim(p_department), v_role_id, true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        role_id = EXCLUDED.role_id,
        is_active = true;
    END IF;
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN v_is_new THEN 'STAFF_USER_CREATED' ELSE 'STAFF_USER_UPDATED' END,
    'staff_user',
    v_user_id::text,
    jsonb_build_object(
      'email', trim(lower(p_email)),
      'full_name', trim(p_full_name),
      'designation', trim(p_designation),
      'department', trim(p_department),
      'role_key', p_role_key
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'is_new', v_is_new,
    'message', 'Staff user profile successfully saved.'
  );
END;
$$;

-- ── 7. Administrative RPC: Update Staff Profile ─────────────────────────────
CREATE OR REPLACE FUNCTION public.rms_update_staff_profile(
  p_user_id     uuid,
  p_full_name   text,
  p_designation text,
  p_department  text,
  p_role_key    text DEFAULT NULL
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
  IF NOT (public.is_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
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
      'before', jsonb_build_object('name', v_old_profile.full_name, 'designation', v_old_profile.designation, 'department', v_old_profile.department),
      'after', jsonb_build_object('name', p_full_name, 'designation', p_designation, 'department', p_department)
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Staff profile updated successfully.');
END;
$$;

-- ── 8. Administrative RPC: Toggle Staff Activation Status ───────────────────
CREATE OR REPLACE FUNCTION public.rms_toggle_staff_status(
  p_user_id   uuid,
  p_is_active boolean,
  p_reason    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_name text;
  v_intv_id uuid;
BEGIN
  IF NOT (public.is_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required to toggle staff status.');
  END IF;

  SELECT full_name INTO v_staff_name FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff user not found.');
  END IF;

  UPDATE public.profiles
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_user_id;

  -- If staff user is deactivated, automatically deactivate their interviewer pool membership
  IF p_is_active = false THEN
    SELECT id INTO v_intv_id FROM public.rms_interviewers WHERE user_id = p_user_id AND is_active = true;
    IF v_intv_id IS NOT NULL THEN
      UPDATE public.rms_interviewers
      SET is_active = false,
          deauthorized_at = now(),
          deauthorized_by = auth.uid(),
          deauthorization_reason = COALESCE(p_reason, 'Cascaded from staff user deactivation'),
          updated_at = now()
      WHERE id = v_intv_id;

      INSERT INTO public.rms_interviewer_audit_log (
        interviewer_id, user_id, action, performed_by, reason
      ) VALUES (
        v_intv_id, p_user_id, 'deactivated', auth.uid(),
        'Automatic deactivation due to staff user deactivation'
      );
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN p_is_active THEN 'STAFF_USER_ACTIVATED' ELSE 'STAFF_USER_DEACTIVATED' END,
    'staff_user',
    p_user_id::text,
    jsonb_build_object('is_active', p_is_active, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_active', p_is_active,
    'message', CASE WHEN p_is_active THEN 'Staff user activated successfully.' ELSE 'Staff user deactivated successfully.' END
  );
END;
$$;

-- ── 9. Administrative RPC: Authorize Interviewer (Idempotent & Audited) ─────
CREATE OR REPLACE FUNCTION public.rms_authorize_interviewer(
  p_user_id           uuid,
  p_default_meet_link text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_record  record;
  v_intv_id       uuid;
  v_action        text := 'authorized';
BEGIN
  -- Admin role required
  IF NOT (public.is_admin() OR public.is_hr_or_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or HR role required to authorize interviewers.');
  END IF;

  -- Validate target user exists and is active
  SELECT p.id, p.full_name, p.email, p.designation, p.department, p.is_active, r.key as role_key
  INTO v_staff_record
  FROM public.profiles p
  JOIN public.rbac_roles r ON r.id = p.role_id
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target staff user does not exist in profiles.');
  END IF;

  IF v_staff_record.is_active = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot authorize an inactive staff user as an interviewer.');
  END IF;

  IF p_default_meet_link IS NOT NULL AND p_default_meet_link != '' AND p_default_meet_link !~* '^https?://' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid URL format. Meeting link must begin with https:// or http://');
  END IF;

  -- Check if already authorized
  SELECT id, is_active INTO v_intv_id, v_staff_record.is_active
  FROM public.rms_interviewers
  WHERE user_id = p_user_id;

  IF v_intv_id IS NOT NULL THEN
    IF v_staff_record.is_active = true THEN
      -- Already active interviewer: return friendly error and ALREADY_ACTIVE code
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_ACTIVE',
        'interviewer_id', v_intv_id,
        'already_authorized', true,
        'error', 'This staff member is already an active interviewer.',
        'message', 'This staff member is already an active interviewer.'
      );
    ELSE
      -- Reactivate previously deactivated interviewer
      UPDATE public.rms_interviewers
      SET is_active = true,
          role_at_authorization = COALESCE(v_staff_record.designation, role_at_authorization),
          default_meet_link = COALESCE(NULLIF(trim(p_default_meet_link), ''), default_meet_link),
          authorized_by = auth.uid(),
          authorized_at = now(),
          deauthorized_at = NULL,
          deauthorized_by = NULL,
          deauthorization_reason = NULL,
          updated_at = now()
      WHERE id = v_intv_id;

      v_action := 'reactivated';
    END IF;
  ELSE
    -- Fresh authorization
    INSERT INTO public.rms_interviewers (
      user_id, default_meet_link, role_at_authorization, is_active, authorized_by, authorized_at
    ) VALUES (
      p_user_id, NULLIF(trim(p_default_meet_link), ''), v_staff_record.designation, true, auth.uid(), now()
    )
    RETURNING id INTO v_intv_id;

    v_action := 'authorized';
  END IF;

  -- Create weekly default schedule (Mon-Fri, 10:00 to 17:00, capacity 8) if not present
  FOR d IN 1..5 LOOP
    INSERT INTO public.rms_interviewer_schedules (
      interviewer_id, day_of_week, start_time, end_time, daily_capacity, is_active
    ) VALUES (
      v_intv_id, d, '10:00:00', '17:00:00', 8, true
    ) ON CONFLICT (interviewer_id, day_of_week) DO NOTHING;
  END LOOP;

  -- Record audit trail
  INSERT INTO public.rms_interviewer_audit_log (
    interviewer_id, user_id, action, performed_by, designation_at_time, department_at_time, reason
  ) VALUES (
    v_intv_id, p_user_id, v_action, auth.uid(), v_staff_record.designation, v_staff_record.department,
    'Authorized by administrative action'
  );

  INSERT INTO public.audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    'INTERVIEWER_AUTHORIZED',
    'rms_interviewers',
    v_intv_id::text,
    jsonb_build_object(
      'user_id', p_user_id,
      'full_name', v_staff_record.full_name,
      'designation', v_staff_record.designation,
      'action', v_action
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'interviewer_id', v_intv_id,
    'action', v_action,
    'message', 'Staff member successfully authorized as RMS Interviewer with default schedule.'
  );
END;
$$;

-- ── 10. Administrative RPC: Toggle Interviewer Status ───────────────────────
CREATE OR REPLACE FUNCTION public.rms_toggle_interviewer_status(
  p_interviewer_id uuid,
  p_is_active      boolean,
  p_reason         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intv record;
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_or_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required.');
  END IF;

  SELECT i.*, p.full_name, p.designation, p.department
  INTO v_intv
  FROM public.rms_interviewers i
  JOIN public.profiles p ON p.id = i.user_id
  WHERE i.id = p_interviewer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Interviewer record not found.');
  END IF;

  IF p_is_active = false THEN
    UPDATE public.rms_interviewers
    SET is_active = false,
        deauthorized_at = now(),
        deauthorized_by = auth.uid(),
        deauthorization_reason = p_reason,
        updated_at = now()
    WHERE id = p_interviewer_id;

    INSERT INTO public.rms_interviewer_audit_log (
      interviewer_id, user_id, action, performed_by, designation_at_time, department_at_time, reason
    ) VALUES (
      p_interviewer_id, v_intv.user_id, 'deactivated', auth.uid(), v_intv.designation, v_intv.department, p_reason
    );
  ELSE
    UPDATE public.rms_interviewers
    SET is_active = true,
        deauthorized_at = NULL,
        deauthorized_by = NULL,
        deauthorization_reason = NULL,
        authorized_by = auth.uid(),
        authorized_at = now(),
        updated_at = now()
    WHERE id = p_interviewer_id;

    INSERT INTO public.rms_interviewer_audit_log (
      interviewer_id, user_id, action, performed_by, designation_at_time, department_at_time, reason
    ) VALUES (
      p_interviewer_id, v_intv.user_id, 'reactivated', auth.uid(), v_intv.designation, v_intv.department, p_reason
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_active', p_is_active,
    'message', CASE WHEN p_is_active THEN 'Interviewer reactivated successfully.' ELSE 'Interviewer deactivated successfully.' END
  );
END;
$$;

-- ── 11. Administrative RPC: Get Interviewer Audit History ───────────────────
CREATE OR REPLACE FUNCTION public.rms_get_interviewer_audit_history(
  p_interviewer_id uuid
)
RETURNS TABLE (
  id                  bigint,
  interviewer_id      uuid,
  user_id             uuid,
  action              text,
  performed_by        uuid,
  performed_by_name   text,
  designation_at_time text,
  department_at_time  text,
  reason              text,
  created_at          timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_hr_or_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required to view interviewer audit history.';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.interviewer_id,
    l.user_id,
    l.action,
    l.performed_by,
    p_admin.full_name AS performed_by_name,
    l.designation_at_time,
    l.department_at_time,
    l.reason,
    l.created_at
  FROM public.rms_interviewer_audit_log l
  LEFT JOIN public.profiles p_admin ON p_admin.id = l.performed_by
  WHERE l.interviewer_id = p_interviewer_id
  ORDER BY l.created_at DESC;
END;
$$;

-- ── 12. Enhanced Balanced Interviewer Allocation (Guard Inactive Staff) ───────
CREATE OR REPLACE FUNCTION public.rms_allocate_balanced_interviewer(
  p_slot_date date,
  p_slot_time time
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dow int;
  v_allocated_id uuid;
BEGIN
  v_dow := EXTRACT(DOW FROM p_slot_date)::int;

  -- Select only active interviewers whose staff profile is also active
  SELECT intv.id INTO v_allocated_id
  FROM public.rms_interviewers intv
  JOIN public.profiles p ON p.id = intv.user_id AND p.is_active = true
  JOIN public.rms_interviewer_schedules sched 
    ON sched.interviewer_id = intv.id 
   AND sched.day_of_week = v_dow 
   AND sched.is_active = true
  LEFT JOIN public.rms_interviewer_overrides ovr
    ON ovr.interviewer_id = intv.id
   AND ovr.override_date = p_slot_date
  LEFT JOIN (
    SELECT b.interviewer_id, count(*) AS booking_cnt
    FROM public.rms_interview_bookings b
    JOIN public.rms_interview_slots s ON s.id = b.slot_id
    WHERE s.slot_date = p_slot_date
      AND b.attendance_status != 'rescheduled'
    GROUP BY b.interviewer_id
  ) book_stats ON book_stats.interviewer_id = intv.id
  WHERE intv.is_active = true
    AND (ovr.id IS NULL OR ovr.is_leave = false)
    AND p_slot_time >= COALESCE(ovr.custom_start_time, sched.start_time)
    AND p_slot_time <  COALESCE(ovr.custom_end_time, sched.end_time)
    AND COALESCE(book_stats.booking_cnt, 0) < COALESCE(ovr.custom_capacity, sched.daily_capacity, 8)
    AND NOT EXISTS (
      SELECT 1 
      FROM public.rms_interview_bookings existing_b
      JOIN public.rms_interview_slots existing_s ON existing_s.id = existing_b.slot_id
      WHERE existing_b.interviewer_id = intv.id
        AND existing_s.slot_date = p_slot_date
        AND existing_s.slot_time = p_slot_time
        AND existing_b.attendance_status != 'rescheduled'
    )
  ORDER BY 
    COALESCE(book_stats.booking_cnt, 0) ASC,
    intv.created_at ASC,
    intv.id ASC
  LIMIT 1;

  RETURN v_allocated_id;
END;
$$;

-- ── 13. Grants for New RPCs ─────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.rms_list_staff_directory(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_create_or_invite_staff(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_update_staff_profile(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_toggle_staff_status(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_authorize_interviewer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_toggle_interviewer_status(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_get_interviewer_audit_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_allocate_balanced_interviewer(date, time) TO authenticated;
