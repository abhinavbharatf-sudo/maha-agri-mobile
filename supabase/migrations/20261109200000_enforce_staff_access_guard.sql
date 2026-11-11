-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261109200000_enforce_staff_access_guard.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Enforces public.check_staff_access_permitted() across all protected Staff
--   Management and Interviewer Operations RPCs to guarantee that unactivated
--   (is_first_login = true) or deactivated (is_active = false) staff accounts
--   are strictly barred from administrative execution and interviewer allocation.
-- ============================================================================

-- 1. rms_allocate_balanced_interviewer
CREATE OR REPLACE FUNCTION public.rms_allocate_balanced_interviewer(p_slot_date date, p_slot_time time without time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_dow int;
  v_allocated_id uuid;
BEGIN
  v_dow := EXTRACT(DOW FROM p_slot_date)::int;

  -- Select only active interviewers whose staff profile is active and access is permitted (not pending first login)
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
    AND public.check_staff_access_permitted(p.id) = true
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
$function$;

-- 2. rms_authorize_interviewer
CREATE OR REPLACE FUNCTION public.rms_authorize_interviewer(p_user_id uuid, p_default_meet_link text DEFAULT NULL::text)
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

  -- Admin or HR role required
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

-- 3. rms_create_or_invite_staff
CREATE OR REPLACE FUNCTION public.rms_create_or_invite_staff(p_email text, p_full_name text, p_designation text DEFAULT 'Other Staff'::text, p_department text DEFAULT 'General Operations'::text, p_role_key text DEFAULT 'staff'::text, p_temporary_password text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_role_id         uuid;
  v_user_id         uuid;
  v_is_new          boolean := false;
  v_temp_password   text;
  v_encrypted_pass  text;
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Caller account is inactive or requires first-login activation.');
  END IF;

  -- Strict Authorization: Admin or HR only
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Administrative role required to create staff users.');
    END IF;
  ELSIF NOT (current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Administrative role required to create staff users.');
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

  -- Cryptographically secure random password generation (CSPRNG 96-bit entropy)
  v_temp_password := COALESCE(
    NULLIF(trim(p_temporary_password), ''),
    'Maha@' || translate(encode(gen_random_bytes(12), 'base64'), '+/=', 'XyZ')
  );
  v_encrypted_pass := crypt(v_temp_password, gen_salt('bf', 10));

  SELECT id INTO v_user_id FROM public.profiles WHERE lower(email) = trim(lower(p_email));

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = trim(p_full_name),
        designation = trim(p_designation),
        department = trim(p_department),
        role_id = v_role_id,
        is_active = true,
        is_first_login = true,
        last_password_reset_at = now(),
        password_reset_expires_at = now() + interval '72 hours',
        updated_at = now()
    WHERE id = v_user_id;

    UPDATE auth.users
    SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
        encrypted_password = v_encrypted_pass,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
          'provider', 'email',
          'providers', jsonb_build_array('email'),
          'role', p_role_key,
          'is_first_login', true
        ),
        raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name)),
        updated_at = now()
    WHERE id = v_user_id;
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = trim(lower(p_email));
    
    IF v_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
          encrypted_password = v_encrypted_pass,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email'),
            'role', p_role_key,
            'is_first_login', true
          ),
          raw_user_meta_data = jsonb_build_object('full_name', trim(p_full_name)),
          updated_at = now()
      WHERE id = v_user_id;

      INSERT INTO public.profiles (id, email, full_name, designation, department, role_id, is_active, is_first_login, last_password_reset_at, password_reset_expires_at)
      VALUES (v_user_id, trim(lower(p_email)), trim(p_full_name), trim(p_designation), trim(p_department), v_role_id, true, true, now(), now() + interval '72 hours')
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        role_id = EXCLUDED.role_id,
        is_active = true,
        is_first_login = true,
        last_password_reset_at = now(),
        password_reset_expires_at = now() + interval '72 hours';
    ELSE
      v_user_id := gen_random_uuid();
      v_is_new := true;

      INSERT INTO auth.users (
        instance_id, id, email, encrypted_password, email_confirmed_at,
        role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        phone_change, phone_change_token, email_change_token_current, reauthentication_token,
        email_change_confirm_status, is_sso_user, is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        v_user_id,
        trim(lower(p_email)),
        v_encrypted_pass,
        now(),
        'authenticated',
        'authenticated',
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role_key, 'is_first_login', true),
        jsonb_build_object('full_name', trim(p_full_name)),
        now(),
        now(),
        '', '', '', '',
        '', '', '', '',
        0, false, false
      );

      INSERT INTO public.profiles (id, email, full_name, designation, department, role_id, is_active, is_first_login, last_password_reset_at, password_reset_expires_at)
      VALUES (v_user_id, trim(lower(p_email)), trim(p_full_name), trim(p_designation), trim(p_department), v_role_id, true, true, now(), now() + interval '72 hours')
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        role_id = EXCLUDED.role_id,
        is_active = true,
        is_first_login = true,
        last_password_reset_at = now(),
        password_reset_expires_at = now() + interval '72 hours';
    END IF;
  END IF;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', trim(lower(p_email))),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  ) ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data;

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
      'role_key', p_role_key,
      'activation_method', 'TEMPORARY_PASSWORD_FORCE_CHANGE',
      'entropy_bits', 96,
      'expires_in_hours', 72
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'is_new', v_is_new,
    'temporary_password', v_temp_password,
    'activation_method', 'TEMPORARY_PASSWORD_FORCE_CHANGE',
    'message', 'Staff user profile successfully saved and activation credentials generated.'
  );
END;
$function$;

-- 4. rms_generate_staff_activation_password
CREATE OR REPLACE FUNCTION public.rms_generate_staff_activation_password(p_user_id uuid, p_temporary_password text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_email           text;
  v_full_name       text;
  v_last_reset      timestamptz;
  v_temp_password   text;
  v_encrypted_pass  text;
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Caller account is inactive or requires first-login activation.');
  END IF;

  -- Strict Authorization: Admin or HR only
  IF auth.uid() IS NOT NULL THEN
    IF NOT (public.is_admin() OR public.is_hr_or_admin()) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required to generate activation credentials.');
    END IF;
  ELSIF NOT (current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required to generate activation credentials.');
  END IF;

  SELECT email, full_name, last_password_reset_at 
  INTO v_email, v_full_name, v_last_reset 
  FROM public.profiles 
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found.');
  END IF;

  -- Server-side Rate Limiting: 60-second cooldown per target account
  IF v_last_reset IS NOT NULL AND v_last_reset > (now() - interval '60 seconds') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rate limit exceeded: Activation credentials were generated recently. Please wait 60 seconds before generating again.'
    );
  END IF;

  v_temp_password := COALESCE(
    NULLIF(trim(p_temporary_password), ''),
    'Maha@' || translate(encode(gen_random_bytes(12), 'base64'), '+/=', 'XyZ')
  );
  v_encrypted_pass := crypt(v_temp_password, gen_salt('bf', 10));

  UPDATE auth.users
  SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
      encrypted_password = v_encrypted_pass,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_first_login', true),
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.profiles
  SET is_first_login = true,
      last_password_reset_at = now(),
      password_reset_expires_at = now() + interval '72 hours',
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    jsonb_build_object('sub', p_user_id::text, 'email', trim(lower(v_email))),
    'email',
    p_user_id::text,
    now(),
    now(),
    now()
  ) ON CONFLICT (provider, provider_id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data;

  INSERT INTO public.audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    'STAFF_ACTIVATION_CREDENTIALS_GENERATED',
    'staff_user',
    p_user_id::text,
    jsonb_build_object(
      'email', v_email,
      'full_name', v_full_name,
      'activation_method', 'TEMPORARY_PASSWORD_FORCE_CHANGE',
      'entropy_bits', 96,
      'expires_in_hours', 72
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'full_name', v_full_name,
    'temporary_password', v_temp_password,
    'activation_method', 'TEMPORARY_PASSWORD_FORCE_CHANGE',
    'message', 'Temporary activation credentials successfully generated.'
  );
END;
$function$;

-- 5. rms_get_interviewer_audit_history
CREATE OR REPLACE FUNCTION public.rms_get_interviewer_audit_history(p_interviewer_id uuid)
 RETURNS TABLE(id bigint, interviewer_id uuid, user_id uuid, action text, performed_by uuid, performed_by_name text, designation_at_time text, department_at_time text, reason text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: Caller account is inactive or requires first-login activation.';
  END IF;

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
$function$;

-- 6. rms_list_staff_directory
CREATE OR REPLACE FUNCTION public.rms_list_staff_directory(p_search text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_designation text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_role_id uuid DEFAULT NULL::uuid, p_is_active boolean DEFAULT NULL::boolean, p_limit integer DEFAULT NULL::integer, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, email text, full_name text, designation text, department text, role_id uuid, role_key text, role_name text, is_active boolean, created_at timestamp with time zone, is_interviewer boolean, interviewer_id uuid, interviewer_is_active boolean, interviewer_meet_link text, authorized_at timestamp with time zone, authorized_by uuid, authorized_by_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden: Caller account is inactive or requires first-login activation.';
  END IF;

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
      OR trim(p_search) = ''
      OR p.full_name ILIKE '%' || trim(p_search) || '%'
      OR p.email ILIKE '%' || trim(p_search) || '%'
      OR p.designation ILIKE '%' || trim(p_search) || '%'
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

-- 7. rms_toggle_interviewer_status
CREATE OR REPLACE FUNCTION public.rms_toggle_interviewer_status(p_interviewer_id uuid, p_is_active boolean, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_intv record;
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Caller account is inactive or requires first-login activation.');
  END IF;

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
$function$;

-- 8. rms_toggle_staff_status
CREATE OR REPLACE FUNCTION public.rms_toggle_staff_status(p_user_id uuid, p_is_active boolean, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_staff_name text;
  v_intv_id uuid;
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Caller account is inactive or requires first-login activation.');
  END IF;

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
$function$;

-- 9. rms_update_staff_profile
CREATE OR REPLACE FUNCTION public.rms_update_staff_profile(p_user_id uuid, p_full_name text, p_designation text, p_department text, p_role_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role_id uuid;
  v_old_profile record;
BEGIN
  -- Server-side staff access guard: caller must be active and activated
  IF auth.uid() IS NOT NULL AND NOT public.check_staff_access_permitted(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: Caller account is inactive or requires first-login activation.');
  END IF;

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
$function$;
