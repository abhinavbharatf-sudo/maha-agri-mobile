-- ============================================================================
-- MAHA-AGRI Government Digital Operations Platform
-- Migration: 20261109210000_align_hr_role_definition.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Harmonizes public.is_hr_or_admin() so that active staff members in the
--   Human Resources department or holding HR designations are correctly
--   recognized by PostgreSQL security functions and protected RMS RPCs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND (
        r.key IN ('admin', 'super_admin', 'hr', 'hr_manager')
        OR p.department = 'Human Resources'
        OR p.designation ILIKE '%HR%'
        OR EXISTS (
          SELECT 1 FROM public.rbac_role_permissions rp
          JOIN public.rbac_permissions perm ON perm.id = rp.permission_id
          WHERE rp.role_id = r.id AND perm.key IN ('rms:selection', 'users:write', 'all')
        )
      )
  );
$function$;
