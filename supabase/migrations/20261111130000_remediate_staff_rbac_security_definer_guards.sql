-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261111130000_remediate_staff_rbac_security_definer_guards.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Remediates the SECURITY DEFINER authorization flaw in Staff Management RPCs.
--   Specifically removes the 'current_user = ''postgres''' expression which was
--   unintentionally satisfied for all callers inside SECURITY DEFINER functions.
--   Enforces genuine auth.uid() RBAC validation (is_admin() OR is_hr_or_admin())
--   prior to executing any queries, state inspections, or database mutations.
--
-- Functions Remediated:
--   1. public.rms_list_staff_directory
--   2. public.rms_get_interviewer_audit_history
--   3. public.rms_authorize_interviewer
-- ============================================================================

-- ── 1. Remediate public.rms_list_staff_directory ─────────────────────────────
DROP FUNCTION IF EXISTS public.rms_list_staff_directory(text, text, text, text, uuid, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.rms_list_staff_directory(
  p_search      text    DEFAULT NULL::text,
  p_department  text    DEFAULT NULL::text,
  p_designation text    DEFAULT NULL::text,
  p_status      text    DEFAULT 'all'::text,
  p_role_id     uuid    DEFAULT NULL::uuid,
  p_is_active   boolean DEFAULT NULL::boolean,
  p_limit       integer DEFAULT NULL::integer,
  p_offset      integer DEFAULT 0
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
  created_at            timestamp with time zone,
  employee_code         text,
  phone                 text,
  assigned_state        text,
  assigned_district     text,
  assigned_taluka       text,
  assigned_location     text,
  is_interviewer        boolean,
  interviewer_id        uuid,
  interviewer_is_active boolean,
  interviewer_meet_link text,
  authorized_at         timestamp with time zone,
  authorized_by         uuid,
  authorized_by_name    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: Caller account is inactive or requires first-login activation.';
  END IF;

  -- Strict Authorization: Admin or HR only. Never bypass based on current_user in SECURITY DEFINER.
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: Administrative role required to access staff directory.';
    END IF;
  ELSIF NOT (session_user = 'postgres') THEN
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
    p.employee_code,
    p.phone,
    p.assigned_state,
    p.assigned_district,
    p.assigned_taluka,
    p.assigned_location,
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
  WHERE r.key IN ('admin', 'super_admin', 'staff', 'hr', 'hr_manager', 'editor', 'member')
    AND (
      p_search IS NULL
      OR trim(p_search) = ''
      OR p.full_name ILIKE '%' || trim(p_search) || '%'
      OR p.email ILIKE '%' || trim(p_search) || '%'
      OR p.designation ILIKE '%' || trim(p_search) || '%'
      OR p.employee_code ILIKE '%' || trim(p_search) || '%'
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
      (p_is_active IS NULL AND p_status IS NULL)
      OR (p_is_active IS NOT NULL AND p.is_active = p_is_active)
      OR (p_status IS NOT NULL AND (
            p_status = 'all'
            OR (p_status = 'active' AND p.is_active = true)
            OR (p_status = 'inactive' AND p.is_active = false)
         ))
    )
    AND (
      p_role_id IS NULL
      OR p.role_id = p_role_id
    )
  ORDER BY p.full_name ASC, p.id ASC
  LIMIT p_limit
  OFFSET COALESCE(p_offset, 0);
END;
$function$;

-- ── 2. Remediate public.rms_get_interviewer_audit_history ───────────────────
DROP FUNCTION IF EXISTS public.rms_get_interviewer_audit_history(uuid);

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
  created_at          timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: Caller account is inactive or requires first-login activation.';
  END IF;

  -- Strict Authorization: Admin or HR only. Never bypass based on current_user in SECURITY DEFINER.
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: Admin role required to view interviewer audit history.';
    END IF;
  ELSIF NOT (session_user = 'postgres') THEN
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
$function$;

-- ── 3. Remediate public.rms_authorize_interviewer ───────────────────────────
DROP FUNCTION IF EXISTS public.rms_authorize_interviewer(uuid, text);

CREATE OR REPLACE FUNCTION public.rms_authorize_interviewer(
  p_user_id           uuid,
  p_default_meet_link text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_staff_record  record;
  v_intv_id       uuid;
  v_action        text := 'authorized';
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Caller account is inactive or requires first-login activation.');
  END IF;

  -- Strict Authorization: Admin or HR only. Never bypass based on current_user in SECURITY DEFINER.
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or HR role required to authorize interviewers.');
    END IF;
  ELSIF NOT (session_user = 'postgres') THEN
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
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_ACTIVE',
        'interviewer_id', v_intv_id,
        'already_authorized', true,
        'error', 'This staff member is already an active interviewer.',
        'message', 'This staff member is already an active interviewer.'
      );
    ELSE
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
    INSERT INTO public.rms_interviewers (
      user_id, default_meet_link, role_at_authorization, is_active, authorized_by, authorized_at
    ) VALUES (
      p_user_id, NULLIF(trim(p_default_meet_link), ''), v_staff_record.designation, true, auth.uid(), now()
    )
    RETURNING id INTO v_intv_id;

    v_action := 'authorized';
  END IF;

  -- Default schedule Mon-Fri
  FOR d IN 1..5 LOOP
    INSERT INTO public.rms_interviewer_schedules (
      interviewer_id, day_of_week, start_time, end_time, daily_capacity, is_active
    ) VALUES (
      v_intv_id, d, '10:00:00', '17:00:00', 8, true
    ) ON CONFLICT (interviewer_id, day_of_week) DO NOTHING;
  END LOOP;

  -- Audit trail
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
$function$;

-- ── 4. Explicit Grants & Revocations ─────────────────────────────────────────
REVOKE ALL ON FUNCTION public.rms_list_staff_directory(text, text, text, text, uuid, boolean, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.rms_list_staff_directory(text, text, text, text, uuid, boolean, integer, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.rms_get_interviewer_audit_history(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.rms_get_interviewer_audit_history(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.rms_authorize_interviewer(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.rms_authorize_interviewer(uuid, text) TO authenticated;
