/*
# Profile auto-creation trigger

## Purpose
When a new user registers via Supabase Auth, automatically create a matching row
in the `profiles` table with the default 'member' role. This keeps profile data
in sync with auth.users without requiring the frontend to insert it manually.

## Changes
1. Creates `handle_new_user()` function that inserts a profile row with the
   new user's id, email, default role 'member', and is_active=true.
2. Creates a trigger `on_auth_user_created` that fires AFTER INSERT on
   auth.users and calls handle_new_user().
3. Function is idempotent (INSERT ... ON CONFLICT DO NOTHING) so re-running
   the migration or a retry won't duplicate profiles.

## Security
- The function runs with SECURITY DEFINER so it can insert into profiles
  even though the anon role can't (RLS blocks unauthenticated inserts).
- search_path is set to empty string ('') to prevent search_path injection attacks,
  with all table references fully qualified (public.rbac_roles, public.profiles).
- Zero dependencies on SMS, phone numbers, or external notification gateways.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  SELECT id INTO default_role_id FROM public.rbac_roles WHERE key = 'member' LIMIT 1;
  INSERT INTO public.profiles (id, email, full_name, role_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_role_id,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at auto-bump for profiles
CREATE OR REPLACE FUNCTION public.bump_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

DROP TRIGGER IF EXISTS cms_contents_updated_at ON public.cms_contents;
CREATE TRIGGER cms_contents_updated_at
  BEFORE UPDATE ON public.cms_contents
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();

DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.bump_updated_at();
