-- Migration: CRM Advanced Follow-ups & Candidate RLS Patch
-- Date: 2026-07-16

-- 1. Create Follow-up Reminders Table
CREATE TABLE IF NOT EXISTS public.crm_followup_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  followup_date timestamptz NOT NULL,
  followup_type text NOT NULL DEFAULT 'Call',
  notes text,
  status text NOT NULL DEFAULT 'Pending', -- Pending, Completed, Snoozed, Cancelled
  is_recurring boolean DEFAULT false,
  recurrence_pattern text, -- e.g., 'daily', 'weekly'
  snoozed_count integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_followup_lead ON public.crm_followup_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_followup_assigned ON public.crm_followup_reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_followup_date ON public.crm_followup_reminders(followup_date);

-- Enable RLS on follow-ups
ALTER TABLE public.crm_followup_reminders ENABLE ROW LEVEL SECURITY;

-- CRM Users can access follow-ups
CREATE POLICY "CRM Users access follow-ups" ON public.crm_followup_reminders
  FOR ALL TO authenticated USING (public.has_crm_role());

-- 2. STRICT CANDIDATE RLS
-- Candidates (authenticated users without a CRM role) can only access their own records.
-- Supabase auth.jwt()->>'phone' contains the E.164 number (e.g., '+919876543210').
-- crm_leads.mobile_number stores it without the '+91'.

CREATE POLICY "Candidates can insert their own leads" ON public.crm_leads
  FOR INSERT TO authenticated WITH CHECK (
    mobile_number = REPLACE(auth.jwt()->>'phone', '+91', '')
  );

CREATE POLICY "Candidates can update their own leads" ON public.crm_leads
  FOR UPDATE TO authenticated USING (
    mobile_number = REPLACE(auth.jwt()->>'phone', '+91', '')
  );

CREATE POLICY "Candidates can insert interested jobs" ON public.crm_lead_interested_jobs
  FOR INSERT TO authenticated WITH CHECK (
    lead_id IN (SELECT id FROM public.crm_leads WHERE mobile_number = REPLACE(auth.jwt()->>'phone', '+91', ''))
  );

CREATE POLICY "Candidates can update interested jobs" ON public.crm_lead_interested_jobs
  FOR UPDATE TO authenticated USING (
    lead_id IN (SELECT id FROM public.crm_leads WHERE mobile_number = REPLACE(auth.jwt()->>'phone', '+91', ''))
  );

CREATE POLICY "Candidates can insert activity logs" ON public.crm_activity_logs
  FOR INSERT TO authenticated WITH CHECK (
    lead_id IN (SELECT id FROM public.crm_leads WHERE mobile_number = REPLACE(auth.jwt()->>'phone', '+91', ''))
  );
