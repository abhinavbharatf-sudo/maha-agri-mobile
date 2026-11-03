-- ============================================================================
-- Migration: 20261028160000_rms_atomic_candidate_portal_submission.sql
-- Description: Hardened Transactional PostgreSQL RPC for MAHA-AGRI Candidate Portal
-- Security: SECURITY DEFINER with fixed search_path; candidate authorization via auth.uid()
-- Fixes: JSONB array operators, Taluka allocation validation, FOR UPDATE concurrency lock
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rms_submit_application(
  p_job_posting_id uuid,
  p_preferred_district text,
  p_preferred_taluka text,
  p_master_profile jsonb,
  p_job_specific jsonb,
  p_declaration jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_candidate record;
  v_job record;
  v_existing_app record;
  v_target_status text;
  v_fee numeric;
  v_snapshot jsonb;
  v_app_data jsonb;
  v_new_id uuid;
  v_app_number text;
  v_final_status text;
  v_final_submitted_at timestamptz;
  v_is_dist_level boolean;
  v_dist_alloc jsonb;
  v_taluka_alloc jsonb;
BEGIN
  -- 1. Candidate Authentication & Authorization
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: You must be authenticated to submit an application.'
      USING ERRCODE = '28000';
  END IF;

  SELECT id, full_name, mobile, district, taluka, date_of_birth, gender
  INTO v_candidate
  FROM public.rms_candidate_profiles
  WHERE user_id = v_user_id;

  IF v_candidate.id IS NULL THEN
    RAISE EXCEPTION 'Candidate profile not found for authenticated account.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Concurrency Control: Acquire row lock on candidate profile row
  -- Serializes simultaneous clicks/retries for the same candidate, eliminating unique constraint race conditions
  PERFORM id 
  FROM public.rms_candidate_profiles 
  WHERE id = v_candidate.id 
  FOR UPDATE;

  -- 3. Verify Job Status & Authoritative Closing Deadlines
  SELECT id, title, department, status, is_trashed, closing_date,
         application_close_date, never_close_applications, application_fee_amount,
         location_districts, vacancy_allocations
  INTO v_job
  FROM public.rms_job_postings
  WHERE id = p_job_posting_id;

  IF v_job.id IS NULL OR COALESCE(v_job.is_trashed, false) = true THEN
    RAISE EXCEPTION 'Selected position does not exist or has been archived.'
      USING ERRCODE = 'P0003';
  END IF;

  IF v_job.status <> 'published' THEN
    RAISE EXCEPTION 'Applications are closed for this position (Current status: %)', v_job.status
      USING ERRCODE = 'P0003';
  END IF;

  -- Authoritative deadline enforcement using database clock_timestamp()
  IF COALESCE(v_job.never_close_applications, false) = false THEN
    IF v_job.closing_date IS NOT NULL AND clock_timestamp() > v_job.closing_date THEN
      RAISE EXCEPTION 'Applications closed for this position on %', v_job.closing_date
        USING ERRCODE = 'P0004';
    END IF;

    IF v_job.application_close_date IS NOT NULL AND clock_timestamp() > v_job.application_close_date THEN
      RAISE EXCEPTION 'Applications closed for this position on %', v_job.application_close_date
        USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- 4. Validate District Eligibility against Job Allocation Quotas (JSONB-compatible)
  IF v_job.location_districts IS NOT NULL 
     AND jsonb_typeof(v_job.location_districts) = 'array' 
     AND jsonb_array_length(v_job.location_districts) > 0 THEN
    IF NOT (v_job.location_districts ? p_preferred_district) THEN
      RAISE EXCEPTION 'The selected district (%) is not eligible for this position.', p_preferred_district
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 5. Validate Taluka Eligibility against Vacancy Allocations (Server-side)
  v_is_dist_level := COALESCE(v_job.vacancy_allocations->>'vacancy_level', '') = 'district';
  IF NOT v_is_dist_level AND p_preferred_taluka IS NOT NULL AND p_preferred_taluka <> '' THEN
    IF v_job.vacancy_allocations IS NOT NULL 
       AND (v_job.vacancy_allocations ? 'district_allocations')
       AND (v_job.vacancy_allocations->'district_allocations') ? p_preferred_district THEN
      
      v_dist_alloc := v_job.vacancy_allocations->'district_allocations'->p_preferred_district;
      IF v_dist_alloc IS NOT NULL AND (v_dist_alloc ? 'taluka_allocations') THEN
        v_taluka_alloc := v_dist_alloc->'taluka_allocations';
        IF v_taluka_alloc IS NOT NULL AND v_taluka_alloc <> '{}'::jsonb THEN
          IF NOT (v_taluka_alloc ? p_preferred_taluka) OR (v_taluka_alloc->p_preferred_taluka->>'included')::boolean = false THEN
            RAISE EXCEPTION 'The selected taluka (%) has no allocated vacancies in % district.', p_preferred_taluka, p_preferred_district
              USING ERRCODE = '22023';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 6. Check for Existing Active Applications (Idempotency & Safe Retry)
  SELECT id, application_number, status, submitted_at, created_at, application_data
  INTO v_existing_app
  FROM public.rms_applications
  WHERE candidate_id = v_candidate.id
    AND job_posting_id = p_job_posting_id
    AND (is_trashed IS NULL OR is_trashed = false);

  IF v_existing_app.id IS NOT NULL AND v_existing_app.status <> 'draft' THEN
    -- Return existing record idempotently without duplicate errors
    RETURN jsonb_build_object(
      'success', true,
      'already_submitted', true,
      'application_id', v_existing_app.id,
      'application_number', v_existing_app.application_number,
      'status', v_existing_app.status,
      'submitted_at', COALESCE(v_existing_app.submitted_at, v_existing_app.created_at)
    );
  END IF;

  -- 7. Determine Payment Workflow & Initial Submission Status
  v_fee := COALESCE(v_job.application_fee_amount, 0);
  IF v_fee > 0 THEN
    v_target_status := 'payment_pending';
  ELSE
    v_target_status := 'submitted';
  END IF;

  -- 8. Construct Immutable Server Snapshot
  v_snapshot := jsonb_build_object(
    'snapshot_version', 1,
    'snapshot_at', clock_timestamp(),
    'user_id', v_user_id,
    'candidate_id', v_candidate.id,
    'master_profile', p_master_profile,
    'job_specific', p_job_specific,
    'declaration', p_declaration,
    'job_meta', jsonb_build_object(
      'job_id', v_job.id,
      'title', v_job.title,
      'department', v_job.department,
      'application_fee_amount', v_fee
    )
  );

  v_app_data := jsonb_build_object(
    'submission_snapshot', v_snapshot,
    'preferred_taluka', p_preferred_taluka,
    'highest_qualification', p_job_specific->>'highestQualification',
    'passing_year', p_job_specific->>'passingYear',
    'marks_percentage', p_job_specific->>'marksPercentage',
    'experience_years', p_job_specific->>'experienceYears',
    'driving_licence', p_job_specific->>'drivingLicence',
    'marathi_fluent', p_job_specific->'marathiFluent'
  );

  -- 9. Persist Application (Atomic Insert or Draft Promotion)
  IF v_existing_app.id IS NOT NULL AND v_existing_app.status = 'draft' THEN
    UPDATE public.rms_applications
    SET status = v_target_status,
        application_data = v_app_data,
        preferred_district = p_preferred_district,
        preferred_location = COALESCE(NULLIF(p_preferred_taluka, ''), p_preferred_district),
        application_number = COALESCE(NULLIF(v_existing_app.application_number, ''), 'ABF-APP-' || LPAD(nextval('rms_application_number_seq')::text, 6, '0')),
        submitted_at = clock_timestamp(),
        last_status_change_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = v_existing_app.id
    RETURNING id, application_number, status, submitted_at
    INTO v_new_id, v_app_number, v_final_status, v_final_submitted_at;
  ELSE
    INSERT INTO public.rms_applications (
      candidate_id,
      job_posting_id,
      application_number,
      status,
      application_data,
      preferred_district,
      preferred_location,
      submitted_at,
      last_status_change_at
    ) VALUES (
      v_candidate.id,
      p_job_posting_id,
      '', -- Authoritatively populated by rms_application_number_trigger
      v_target_status,
      v_app_data,
      p_preferred_district,
      COALESCE(NULLIF(p_preferred_taluka, ''), p_preferred_district),
      clock_timestamp(),
      clock_timestamp()
    )
    RETURNING id, application_number, status, submitted_at
    INTO v_new_id, v_app_number, v_final_status, v_final_submitted_at;
  END IF;

  -- 10. Record Status History in Same Transaction
  INSERT INTO public.rms_application_status_log (
    application_id,
    from_status,
    to_status,
    changed_by,
    notes,
    changed_at
  ) VALUES (
    v_new_id,
    CASE WHEN v_existing_app.id IS NOT NULL THEN v_existing_app.status ELSE NULL END,
    v_final_status,
    v_user_id,
    'Application submitted via MAHA-AGRI Candidate Portal',
    clock_timestamp()
  );

  -- 11. Update Master Profile with profile_complete and latest demographic details
  UPDATE public.rms_candidate_profiles
  SET full_name = COALESCE(NULLIF(p_master_profile->>'fullName', ''), full_name),
      date_of_birth = COALESCE(NULLIF(p_master_profile->>'dateOfBirth', '')::date, date_of_birth),
      gender = COALESCE(NULLIF(p_master_profile->>'gender', ''), gender),
      district = COALESCE(NULLIF(p_master_profile->>'homeDistrict', ''), district),
      taluka = COALESCE(NULLIF(p_master_profile->>'homeTaluka', ''), taluka),
      profile_complete = true,
      updated_at = clock_timestamp()
  WHERE id = v_candidate.id;

  -- 12. Return Authoritative Response Payload
  RETURN jsonb_build_object(
    'success', true,
    'already_submitted', false,
    'application_id', v_new_id,
    'application_number', v_app_number,
    'status', v_final_status,
    'submitted_at', v_final_submitted_at
  );
END;
$$;

-- Least-Privilege Execution Permissions
REVOKE ALL ON FUNCTION public.rms_submit_application(uuid, text, text, jsonb, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.rms_submit_application(uuid, text, text, jsonb, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.rms_submit_application IS
  'Atomic, transactional submission for the MAHA-AGRI Candidate Portal with concurrency locking, JSONB quota validation, and immutable snapshots.';
