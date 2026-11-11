-- ============================================================================
-- Migration: Fix Staff Directory RPC Parameters & Reload Schema Cache
-- File: 20261108160000_fix_staff_directory_rpc_parameters.sql
-- Target: MAHA-AGRI-STAGING only (vlpschmvotaunsxcunnn)
--
-- Description:
--   Unifies public.rms_list_staff_directory signature with default parameters:
--   p_search text DEFAULT NULL,
--   p_department text DEFAULT NULL,
--   p_designation text DEFAULT NULL,
--   p_status text DEFAULT NULL,
--   p_role_id uuid DEFAULT NULL,
--   p_is_active boolean DEFAULT NULL,
--   p_limit integer DEFAULT NULL,
--   p_offset integer DEFAULT 0
--   
--   Ensures complete backward compatibility with both legacy positional calls
--   (search, department, designation, status) and modern PostgREST named parameter
--   calls (including role_id, is_active, limit, offset).
--   Reloads PostgREST schema cache via NOTIFY pgrst, 'reload schema'.
-- ============================================================================

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS public.rms_list_staff_directory(text, text, text, text);
DROP FUNCTION IF EXISTS public.rms_list_staff_directory(text, uuid, text, text, boolean, text, integer, integer);
DROP FUNCTION IF EXISTS public.rms_list_staff_directory(text, text, text, text, uuid, boolean, integer, integer);

-- 2. Create Unified Additive Staff Directory Function
CREATE OR REPLACE FUNCTION public.rms_list_staff_directory(
  p_search      text    DEFAULT NULL,
  p_department  text    DEFAULT NULL,
  p_designation text    DEFAULT NULL,
  p_status      text    DEFAULT NULL, -- 'active' | 'inactive' | 'all'
  p_role_id     uuid    DEFAULT NULL,
  p_is_active   boolean DEFAULT NULL,
  p_limit       integer DEFAULT NULL,
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
$$;

-- 3. Grants
REVOKE ALL ON FUNCTION public.rms_list_staff_directory FROM anon;
GRANT EXECUTE ON FUNCTION public.rms_list_staff_directory TO authenticated;
GRANT EXECUTE ON FUNCTION public.rms_list_staff_directory TO postgres;

-- 4. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
