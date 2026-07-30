-- Extend rms_job_postings with HR-configurable fields for the public careers portal

ALTER TABLE rms_job_postings
  ADD COLUMN IF NOT EXISTS total_vacancies        integer,
  ADD COLUMN IF NOT EXISTS vacancies_per_district integer,
  ADD COLUMN IF NOT EXISTS min_age                integer,
  ADD COLUMN IF NOT EXISTS max_age                integer,
  ADD COLUMN IF NOT EXISTS salary_honorarium      text,
  ADD COLUMN IF NOT EXISTS recruitment_mode       text DEFAULT 'Online',
  ADD COLUMN IF NOT EXISTS project_pdf_url        text,
  ADD COLUMN IF NOT EXISTS project_video_url      text,
  ADD COLUMN IF NOT EXISTS jd_pdf_url             text,
  ADD COLUMN IF NOT EXISTS project_overview       text;
