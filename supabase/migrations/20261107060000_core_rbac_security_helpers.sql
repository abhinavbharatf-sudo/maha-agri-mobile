-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261107060000_core_rbac_security_helpers.sql
-- Description:
--   Authoritative core RBAC helper functions required by Interview Management (03),
--   RMS Critical Corrections (04), Staff Management (06), and subsequent modules.
--   Provides:
--     - public.is_admin()
--     - public.is_staff()
--     - public.is_hr_or_admin()
-- ============================================================================

-- ── 1. Authoritative Admin RBAC Helper Function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND r.key IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── 2. Authoritative Staff RBAC Helper Function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND r.key IN ('admin', 'super_admin', 'staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM public;
REVOKE ALL ON FUNCTION public.is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ── 3. Authoritative HR / Admin RBAC Helper Function ────────────────────────
CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND (
        r.key IN ('admin', 'super_admin', 'hr', 'hr_manager')
        OR EXISTS (
          SELECT 1 FROM public.rbac_role_permissions rp
          JOIN public.rbac_permissions perm ON perm.id = rp.permission_id
          WHERE rp.role_id = r.id AND perm.key IN ('rms:selection', 'users:write', 'all')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM public;
REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_hr_or_admin() TO authenticated;
