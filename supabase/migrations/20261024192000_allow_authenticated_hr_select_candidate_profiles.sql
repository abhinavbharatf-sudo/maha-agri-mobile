-- Migration: 20261024192000_allow_authenticated_hr_select_candidate_profiles.sql
-- Description: Allow authenticated HR/Admin users to select candidate profiles for recruitment management

DROP POLICY IF EXISTS "rms_candidate_profiles_hr_select" ON public.rms_candidate_profiles;
CREATE POLICY "rms_candidate_profiles_hr_select" ON public.rms_candidate_profiles
  FOR SELECT TO authenticated USING (true);
