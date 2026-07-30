-- Migration: CRM Enterprise Panel Schema
-- Date: 2026-07-16

-- 1. Insert missing roles into rbac_roles
INSERT INTO public.rbac_roles (key, name, description, is_system)
VALUES
  ('telecaller', 'Telecaller', 'CRM Telecaller access', true),
  ('team_leader', 'Team Leader', 'CRM Team Leader access', true),
  ('crm_manager', 'CRM Manager', 'CRM Manager access', true),
  ('hr_executive', 'HR Executive', 'HR Panel access', true),
  ('hr_manager', 'HR Manager', 'HR Panel access', true)
ON CONFLICT (key) DO NOTHING;

-- 2. Core CRM Leads Table
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_candidate_id text UNIQUE NOT NULL,
  mobile_number text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  district text,
  state text NOT NULL DEFAULT 'Maharashtra',
  lead_source text DEFAULT 'Career Portal',
  lead_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'Medium',
  otp_verified_at timestamptz,
  lead_score integer DEFAULT 10,
  is_blacklisted boolean DEFAULT false,
  search_vector tsvector,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_mobile ON public.crm_leads(mobile_number);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads(lead_owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_search ON public.crm_leads USING GIN(search_vector);

-- Sequence and Function for Internal Candidate ID
CREATE SEQUENCE IF NOT EXISTS public.crm_candidate_id_seq START 1;

CREATE OR REPLACE FUNCTION public.crm_generate_candidate_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.internal_candidate_id IS NULL OR NEW.internal_candidate_id = '' THEN
    NEW.internal_candidate_id := 'ABF-C-' || to_char(now(), 'YYYY') || '-' || LPAD(nextval('public.crm_candidate_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_candidate_id_trigger ON public.crm_leads;
CREATE TRIGGER crm_candidate_id_trigger
  BEFORE INSERT ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_generate_candidate_id();

-- 3. CRM Lead Interested Jobs (Normalized 1:N)
CREATE TABLE IF NOT EXISTS public.crm_lead_interested_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES public.rms_job_postings(id) ON DELETE CASCADE,
  application_id text UNIQUE,
  current_stage text NOT NULL DEFAULT 'Job Details Viewed',
  current_status text NOT NULL DEFAULT 'Active',
  viewed_date timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, job_posting_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_interested_lead_id ON public.crm_lead_interested_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_interested_job_id ON public.crm_lead_interested_jobs(job_posting_id);

-- Sequence and Function for Application ID
CREATE SEQUENCE IF NOT EXISTS public.crm_application_id_seq START 1;

CREATE OR REPLACE FUNCTION public.crm_generate_application_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only generate Application ID when stage progresses past 'Job Details Viewed'
  IF NEW.current_stage != 'Job Details Viewed' AND (NEW.application_id IS NULL OR NEW.application_id = '') THEN
    NEW.application_id := 'APP-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('public.crm_application_id_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_application_id_trigger ON public.crm_lead_interested_jobs;
CREATE TRIGGER crm_application_id_trigger
  BEFORE INSERT OR UPDATE ON public.crm_lead_interested_jobs
  FOR EACH ROW EXECUTE FUNCTION public.crm_generate_application_id();


-- 4. Centralized Activity Logs
CREATE TABLE IF NOT EXISTS public.crm_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_type text NOT NULL DEFAULT 'System',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_lead ON public.crm_activity_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activity_logs_type ON public.crm_activity_logs(activity_type);

-- Prevent deletes on activity log
CREATE OR REPLACE FUNCTION public.prevent_delete_rule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Deletions are not allowed on this audit table';
END;
$$;

DROP TRIGGER IF EXISTS crm_prevent_delete_activity ON public.crm_activity_logs;
CREATE TRIGGER crm_prevent_delete_activity
  BEFORE DELETE ON public.crm_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_rule();

-- 5. Call History
CREATE TABLE IF NOT EXISTS public.crm_call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  telecaller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  call_status text NOT NULL,
  disposition text NOT NULL,
  notes text NOT NULL,
  recording_ref text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_call_history_lead ON public.crm_call_history(lead_id);

-- 6. WhatsApp Extended Logs
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  template_version text,
  provider_response jsonb,
  status text NOT NULL DEFAULT 'Sent',
  error_message text,
  delivery_timestamp timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_whatsapp_logs_lead ON public.crm_whatsapp_logs(lead_id);

-- 7. Internal Comments
CREATE TABLE IF NOT EXISTS public.crm_lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_comments_lead ON public.crm_lead_comments(lead_id);

-- 8. Lead Score Event Calculation Trigger
CREATE OR REPLACE FUNCTION public.crm_calculate_lead_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.activity_type = 'Call Logged' THEN
     UPDATE public.crm_leads SET lead_score = lead_score + 5 WHERE id = NEW.lead_id;
  ELSIF NEW.activity_type = 'Stage Change' AND NEW.metadata->>'new_stage' = 'Application Started' THEN
     UPDATE public.crm_leads SET lead_score = lead_score + 10 WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_lead_score_trigger ON public.crm_activity_logs;
CREATE TRIGGER crm_lead_score_trigger
  AFTER INSERT ON public.crm_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.crm_calculate_lead_score();

-- 9. Full Text Search Trigger (Search Vector)
CREATE OR REPLACE FUNCTION public.crm_update_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.mobile_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.internal_candidate_id, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_search_vector_update ON public.crm_leads;
CREATE TRIGGER crm_search_vector_update
  BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_update_search_vector();

-- 10. Enable Row Level Security
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_interested_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_comments ENABLE ROW LEVEL SECURITY;

-- 11. Strict Role-Based RLS Policies
-- Using profiles table which connects to rbac_roles
CREATE OR REPLACE FUNCTION public.has_crm_role()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.rbac_roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() 
    AND r.key IN ('telecaller', 'team_leader', 'crm_manager', 'admin', 'super_admin')
  );
$$;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "CRM Users can view all leads" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM Users can insert leads" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM Users can update leads" ON public.crm_leads;
DROP POLICY IF EXISTS "CRM Users access lead jobs" ON public.crm_lead_interested_jobs;
DROP POLICY IF EXISTS "CRM Users access activity logs" ON public.crm_activity_logs;
DROP POLICY IF EXISTS "CRM Users access call history" ON public.crm_call_history;
DROP POLICY IF EXISTS "CRM Users access whatsapp logs" ON public.crm_whatsapp_logs;
DROP POLICY IF EXISTS "CRM Users access comments" ON public.crm_lead_comments;

-- CRM Leads Policies
CREATE POLICY "CRM Users can view all leads" ON public.crm_leads
  FOR SELECT TO authenticated USING (public.has_crm_role());

CREATE POLICY "CRM Users can insert leads" ON public.crm_leads
  FOR INSERT TO authenticated WITH CHECK (public.has_crm_role());

CREATE POLICY "CRM Users can update leads" ON public.crm_leads
  FOR UPDATE TO authenticated USING (public.has_crm_role());

-- Note: Candidates should be able to view/update their OWN lead record when authenticated
-- Assuming candidates use auth.uid() or mobile mapping in the future, currently we enforce CRM roles for panel.

-- Applying standard CRM access to all sub-tables for authenticated CRM users
CREATE POLICY "CRM Users access lead jobs" ON public.crm_lead_interested_jobs
  FOR ALL TO authenticated USING (public.has_crm_role());

CREATE POLICY "CRM Users access activity logs" ON public.crm_activity_logs
  FOR ALL TO authenticated USING (public.has_crm_role());

CREATE POLICY "CRM Users access call history" ON public.crm_call_history
  FOR ALL TO authenticated USING (public.has_crm_role());

CREATE POLICY "CRM Users access whatsapp logs" ON public.crm_whatsapp_logs
  FOR ALL TO authenticated USING (public.has_crm_role());

CREATE POLICY "CRM Users access comments" ON public.crm_lead_comments
  FOR ALL TO authenticated USING (public.has_crm_role());
