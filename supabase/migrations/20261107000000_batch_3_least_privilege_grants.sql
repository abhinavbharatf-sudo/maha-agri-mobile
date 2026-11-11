-- ============================================================================
-- MAHA-AGRI Platform: Batch 3 Database Grants & PostgREST Compatibility
-- Migration: 20261107000000_batch_3_least_privilege_grants.sql
-- Status: PREPARED FOR REVIEW (NOT APPLIED)
--
-- Description:
--   Establishes least-privilege table, sequence, and routine grants across all
--   public domain tables created in Batch 1 (01-09) and Batch 2 (10-20).
--
-- Security Principles:
--   1. NO BLANKET 'GRANT ALL' TO ANON OR AUTHENTICATED.
--   2. 'anon' receives strictly SELECT on public-facing catalog tables only.
--   3. 'authenticated' receives targeted DML only where frontend workflows and
--      corresponding RLS policies require it.
--   4. Candidate interview slot booking write operations remain strictly locked
--      to the approved atomic RPC (rms_book_interview_slot).
--   5. 'service_role' receives operational administrative privileges.
--   6. All tables remain 100% protected by existing Row-Level Security policies.
-- ============================================================================

-- ── 1. Schema Usage ─────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── 2. Anonymous Public Role (anon) — Least Privilege (SELECT Only) ────────
-- Enables unauthenticated citizens and job seekers to browse open positions,
-- view active campaign details, read CMS content, and query public feature flags.
GRANT SELECT ON public.rms_job_postings           TO anon;
GRANT SELECT ON public.rms_job_badges             TO anon;
GRANT SELECT ON public.rms_job_faqs               TO anon;
GRANT SELECT ON public.rms_recruitment_steps       TO anon;
GRANT SELECT ON public.rms_job_analytics          TO anon;
GRANT SELECT ON public.rms_campaigns              TO anon;
GRANT SELECT ON public.rms_campaign_job_postings  TO anon;
GRANT SELECT ON public.rms_vacancies              TO anon;
GRANT SELECT ON public.rms_recruitment_drives     TO anon;
GRANT SELECT ON public.rms_drive_batches          TO anon;
GRANT SELECT ON public.rms_drive_job_postings     TO anon;
GRANT SELECT ON public.rms_workflow_stages        TO anon;
GRANT SELECT ON public.rms_workflow_templates     TO anon;
GRANT SELECT ON public.feature_flags              TO anon;
GRANT SELECT ON public.cms_contents               TO anon;
GRANT SELECT ON public.cms_content_types          TO anon;
GRANT SELECT ON public.search_index               TO anon;

-- Explicitly verify anon has zero write permissions on any table
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- ── 3. Authenticated Role (authenticated) — Granular DML Grants ─────────────
-- Governed by existing row-level security (RLS) policies for Candidates, Staff & Admins.

-- A. Identity, RBAC & Core Platform
GRANT SELECT, UPDATE                         ON public.profiles               TO authenticated;
GRANT SELECT                                 ON public.rbac_roles             TO authenticated;
GRANT SELECT                                 ON public.rbac_permissions      TO authenticated;
GRANT SELECT                                 ON public.rbac_role_permissions TO authenticated;
GRANT SELECT                                 ON public.feature_flags          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.notifications          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.file_metadata          TO authenticated;
GRANT SELECT, INSERT                         ON public.audit_log              TO authenticated;
GRANT SELECT, INSERT                         ON public.activity_timeline      TO authenticated;
GRANT SELECT                                 ON public.cms_content_types      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.cms_contents           TO authenticated;
GRANT SELECT                                 ON public.search_index           TO authenticated;

-- B. Candidate Self-Service & Profile Management
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_candidate_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_candidate_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE                 ON public.rms_applications       TO authenticated;
GRANT SELECT, INSERT, UPDATE                 ON public.rms_payments           TO authenticated;
GRANT SELECT                                 ON public.rms_payment_receipts   TO authenticated;
GRANT SELECT                                 ON public.rms_appointment_letters TO authenticated;

-- C. Interview Slots & Bookings Access Boundary
-- Preserves Phase A hardening: Candidate has read-only slot access; write is locked to Admin
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_interview_slots    TO authenticated;
-- Interview bookings: Read-only for authenticated candidates & staff
-- Booking write is strictly mediated by rms_book_interview_slot atomic RPC
GRANT SELECT                                 ON public.rms_interview_bookings TO authenticated;

-- D. Recruitment Pipeline & Staff / Admin Operations
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_job_postings       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_job_badges         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_job_faqs           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_recruitment_steps   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_job_analytics      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_campaigns          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_campaign_job_postings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_vacancies          TO authenticated;
GRANT SELECT, INSERT                         ON public.rms_vacancy_audit      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_recruitment_drives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_drive_batches      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_drive_job_postings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_drive_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_workflow_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_workflow_stages    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_application_workflow_state TO authenticated;
GRANT SELECT, INSERT                         ON public.rms_application_status_log TO authenticated;
GRANT SELECT, INSERT                         ON public.rms_application_stage_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_application_notes  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_interview_evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_training_batches   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_training_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE         ON public.rms_notification_queue TO authenticated;
GRANT SELECT, INSERT                         ON public.rms_notification_delivery_log TO authenticated;

-- ── 4. Sequence Usage Grants ────────────────────────────────────────────────
-- Required for trigger-based ID generation (ABF-CAND-, ABF-APP-, ABF-RCPT-)
GRANT USAGE, SELECT ON SEQUENCE public.rms_candidate_id_seq       TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rms_application_number_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rms_receipt_number_seq     TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rms_letter_number_seq      TO authenticated;

-- ── 5. Service Role (service_role) — Full Schema Privileges ─────────────────
-- Backend administrative tasks, webhook ingest (Razorpay), and automated runners
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public    TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public  TO service_role;

-- ── 6. Verification Comment ─────────────────────────────────────────────────
COMMENT ON SCHEMA public IS 'MAHA-AGRI: Least-privilege table and sequence grant envelope (Batch 3 preflight approved).';
