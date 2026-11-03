-- ============================================================================
-- MAHA-AGRI Careers / RMS: Drop obsolete 3-parameter overload of candidate purge RPC
-- Migration: 20261026113500_drop_obsolete_candidate_deletion_overload.sql
-- Description:
--   Drops the legacy 3-parameter overload to eliminate function ambiguity (ERROR 42725).
--   The 5-parameter overload with default parameters handles all 2, 3, 4, and 5 argument calls.
-- ============================================================================

DROP FUNCTION IF EXISTS public.rms_permanently_delete_candidate(uuid, text, text);
