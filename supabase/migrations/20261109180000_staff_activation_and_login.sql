-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261109180000_staff_activation_and_login.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Enables secure staff activation and authentication without requiring external SMTP:
--   1. Ensures default auth.instances record exists.
--   2. Updates public.rms_create_or_invite_staff to generate secure temporary activation
--      credentials with crypt hash, email confirmation, and auth.identities mapping.
--   3. Creates public.rms_generate_staff_activation_password for on-demand employee
--      account activation and password reset.
-- ============================================================================

-- ── 1. Ensure Default Auth Instance ──────────────────────────────────────────
INSERT INTO auth.instances (id, uuid, raw_base_config, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 2. Update rms_create_or_invite_staff With Activation Credentials ─────────
DROP FUNCTION IF EXISTS public.rms_create_or_invite_staff(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.rms_create_or_invite_staff(
  p_email               text,
  p_full_name           text,
  p_designation         text DEFAULT 'Other Staff',
  p_department          text DEFAULT 'General Operations',
  p_role_key            text DEFAULT 'staff',
  p_temporary_password  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_role_id         uuid;
  v_user_id         uuid;
  v_is_new          boolean := false;
  v_temp_password   text;
  v_encrypted_pass  text;
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

  -- Resolve or generate temporary activation password
  v_temp_password := COALESCE(
    NULLIF(trim(p_temporary_password), ''),
    'MahaAgri@' || upper(substr(md5(random()::text), 1, 6))
  );
  v_encrypted_pass := crypt(v_temp_password, gen_salt('bf', 10));

  -- Check if user exists in auth.users or profiles
  SELECT id INTO v_user_id FROM public.profiles WHERE lower(email) = trim(lower(p_email));

  IF v_user_id IS NOT NULL THEN
    -- Update existing profile
    UPDATE public.profiles
    SET full_name = trim(p_full_name),
        designation = trim(p_designation),
        department = trim(p_department),
        role_id = v_role_id,
        is_active = true,
        updated_at = now()
    WHERE id = v_user_id;

    -- Ensure credentials in auth.users
    UPDATE auth.users
    SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
        encrypted_password = v_encrypted_pass,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        email_change_confirm_status = 0,
        is_sso_user = false,
        is_anonymous = false,
        raw_user_meta_data = jsonb_build_object(
          'full_name', trim(p_full_name),
          'is_first_login', true
        ),
        updated_at = now()
    WHERE id = v_user_id;

  ELSE
    -- Check if user exists in auth.users without profile
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = trim(lower(p_email));
    
    IF v_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
          encrypted_password = v_encrypted_pass,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          confirmation_token = COALESCE(confirmation_token, ''),
          recovery_token = COALESCE(recovery_token, ''),
          email_change_token_new = COALESCE(email_change_token_new, ''),
          email_change = COALESCE(email_change, ''),
          phone_change = COALESCE(phone_change, ''),
          phone_change_token = COALESCE(phone_change_token, ''),
          email_change_token_current = COALESCE(email_change_token_current, ''),
          reauthentication_token = COALESCE(reauthentication_token, ''),
          email_change_confirm_status = 0,
          is_sso_user = false,
          is_anonymous = false,
          raw_user_meta_data = jsonb_build_object(
            'full_name', trim(p_full_name),
            'is_first_login', true
          ),
          updated_at = now()
      WHERE id = v_user_id;

      INSERT INTO public.profiles (id, email, full_name, designation, department, role_id, is_active)
      VALUES (v_user_id, trim(lower(p_email)), trim(p_full_name), trim(p_designation), trim(p_department), v_role_id, true)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        designation = EXCLUDED.designation,
        department = EXCLUDED.department,
        role_id = EXCLUDED.role_id,
        is_active = true;
    ELSE
      -- New identity record
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
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role_key),
        jsonb_build_object('full_name', trim(p_full_name), 'is_first_login', true),
        now(),
        now(),
        '', '', '', '',
        '', '', '', '',
        0, false, false
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

  -- Ensure identity in auth.identities
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
      'role_key', p_role_key,
      'activation_method', 'TEMPORARY_PASSWORD_FORCE_CHANGE'
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
$$;

-- ── 3. Dedicated Staff Activation / Password Reset RPC ───────────────────────
CREATE OR REPLACE FUNCTION public.rms_generate_staff_activation_password(
  p_user_id             uuid,
  p_temporary_password  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_email           text;
  v_full_name       text;
  v_temp_password   text;
  v_encrypted_pass  text;
BEGIN
  -- Admin only
  IF NOT (public.is_admin() OR current_user = 'postgres' OR session_user = 'postgres') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required to generate activation credentials.');
  END IF;

  SELECT email, full_name INTO v_email, v_full_name FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff profile not found.');
  END IF;

  v_temp_password := COALESCE(
    NULLIF(trim(p_temporary_password), ''),
    'MahaAgri@' || upper(substr(md5(random()::text), 1, 6))
  );
  v_encrypted_pass := crypt(v_temp_password, gen_salt('bf', 10));

  -- Update auth.users
  UPDATE auth.users
  SET instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
      encrypted_password = v_encrypted_pass,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      email_change_confirm_status = 0,
      is_sso_user = false,
      is_anonymous = false,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('is_first_login', true),
      updated_at = now()
  WHERE id = p_user_id;

  -- Ensure identity in auth.identities
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

  -- Audit log
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
      'activation_method', 'TEMPORARY_PASSWORD_FORCE_CHANGE'
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
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.rms_create_or_invite_staff(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_generate_staff_activation_password(uuid, text) TO authenticated;
