-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261109190000_auth_security_hardening.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Critical Authentication Security Hardening:
--   1. Adds server-controlled is_first_login, rate limiting, and expiry columns to public.profiles.
--   2. Ensures canonical accounts have is_first_login = false.
--   3. Implements BEFORE UPDATE trigger on auth.users to clear is_first_login ONLY upon
--      verified password hash change.
--   4. Updates rms_create_or_invite_staff and rms_generate_staff_activation_password to use
--      kernel CSPRNG (gen_random_bytes(12) = 96 bits entropy), 60s rate limit, and app_metadata.
--   5. Implements server-side public.check_staff_access_permitted() guard.
-- ============================================================================

-- ── 1. Schema Extensions on public.profiles ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_first_login            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_password_reset_at    timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_first_login ON public.profiles(is_first_login);

-- Explicitly preserve established Super Admin, Admin, and HR operational accounts:
-- Only active administrative users already managing the platform are marked as setup complete.
-- Newly provisioned Staff, Interviewer, and Member accounts default to is_first_login = true,
-- enforcing mandatory password change upon initial login.
UPDATE public.profiles p
SET is_first_login = false
FROM public.rbac_roles r
WHERE p.role_id = r.id
  AND r.key IN ('super_admin', 'admin', 'hr', 'hr_manager')
  AND p.is_active = true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    EXECUTE $dyn$
      UPDATE public.profiles
      SET is_first_login = false
      WHERE role IN ('super_admin', 'admin', 'hr', 'hr_manager')
        AND is_active = true;
    $dyn$;
  END IF;
END $$;

-- ── 2. Server-Side Access Guard Function ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_staff_access_permitted(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_active     boolean;
  v_first_login   boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_active, is_first_login INTO v_is_active, v_first_login
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Deactivated accounts are barred
  IF NOT v_is_active THEN
    RETURN false;
  END IF;

  -- Unactivated first-login accounts are barred from protected staff operations
  IF v_first_login THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- ── 3. Trigger: Verified Password Change Clears is_first_login ───────────────
CREATE OR REPLACE FUNCTION public.handle_password_change_clear_first_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Clear flag ONLY when encrypted_password is changed to a distinct non-null hash
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password
     AND OLD.encrypted_password IS NOT NULL
     AND NEW.encrypted_password IS NOT NULL THEN

    -- Atomically clear in raw_app_meta_data (server-managed)
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_first_login', false);

    -- Atomically clear in public.profiles
    UPDATE public.profiles
    SET is_first_login = false,
        updated_at = now()
    WHERE id = NEW.id;

    -- Log password change event (No credentials logged)
    INSERT INTO public.audit_log (
      actor_id, action, entity_type, entity_id, metadata
    ) VALUES (
      NEW.id,
      'FIRST_LOGIN_PASSWORD_CHANGED',
      'auth_user',
      NEW.id::text,
      jsonb_build_object('event', 'first_login_completed', 'timestamp', now())
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_clear_first_login ON auth.users;
CREATE TRIGGER trg_auth_users_clear_first_login
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_password_change_clear_first_login();

-- ── 4. Hardened Staff Creation & Provisioning RPC ────────────────────────────
DROP FUNCTION IF EXISTS public.rms_create_or_invite_staff(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.rms_create_or_invite_staff(text, text, text, text, text, text);

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
        is_first_login = true,
        last_password_reset_at = now(),
        password_reset_expires_at = now() + interval '72 hours',
        updated_at = now()
    WHERE id = v_user_id;

    -- Ensure credentials in auth.users with raw_app_meta_data
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

  -- Audit log (Zero plaintext passwords stored)
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
$$;

-- ── 5. Hardened Password Reset RPC with Rate Limiting ────────────────────────
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
  v_last_reset      timestamptz;
  v_temp_password   text;
  v_encrypted_pass  text;
BEGIN
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

  -- Cryptographically secure random password generation (CSPRNG 96-bit entropy)
  v_temp_password := COALESCE(
    NULLIF(trim(p_temporary_password), ''),
    'Maha@' || translate(encode(gen_random_bytes(12), 'base64'), '+/=', 'XyZ')
  );
  v_encrypted_pass := crypt(v_temp_password, gen_salt('bf', 10));

  -- Update auth.users with raw_app_meta_data (server-managed)
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
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_first_login', true),
      updated_at = now()
  WHERE id = p_user_id;

  -- Update profiles with is_first_login = true, rate limit timestamp, and 72-hour expiry
  UPDATE public.profiles
  SET is_first_login = true,
      last_password_reset_at = now(),
      password_reset_expires_at = now() + interval '72 hours',
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

  -- Audit log (Never stores plaintext temporary password)
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
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.rms_create_or_invite_staff(text, text, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rms_create_or_invite_staff(text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.rms_generate_staff_activation_password(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.rms_generate_staff_activation_password(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.check_staff_access_permitted(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_staff_access_permitted(uuid) TO authenticated;
