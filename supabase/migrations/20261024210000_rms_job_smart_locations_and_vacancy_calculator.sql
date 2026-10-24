-- Migration: 20261024210000_rms_job_smart_locations_and_vacancy_calculator.sql
-- Description: Adds smart location configuration and automatic vacancy calculator fields to rms_job_postings

ALTER TABLE public.rms_job_postings
  ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'Multiple Locations',
  ADD COLUMN IF NOT EXISTS location_regions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_districts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_talukas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS internal_location text,
  ADD COLUMN IF NOT EXISTS show_city_publicly boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS city_name text,
  ADD COLUMN IF NOT EXISTS vacancy_allocations jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_calculate_vacancies boolean DEFAULT false;

-- Create index on location_type for filtering
CREATE INDEX IF NOT EXISTS idx_rms_job_postings_location_type
  ON public.rms_job_postings(location_type);
