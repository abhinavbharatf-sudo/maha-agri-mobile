/*
# Salary Configuration Enhancement

1. Purpose
   - Replaces the single free-text salary_honorarium field with structured enterprise HRMS salary configuration.
   - Enables dynamic, API-driven salary display on the Careers Portal with Indian number formatting.

2. New Columns (added to existing rms_job_postings table)
   - `salary_amount` (numeric, nullable): The numeric salary amount (e.g. 35000). Null/empty means no amount — only salary_type is shown.
   - `salary_type` (text, nullable): The salary period/type. One of: Per Month, Per Week, Per Day, Per Year, Per Project, Per Assignment, Per Visit, Per Camp, Per Sample, Per Farmer, Per Registration, Per Training, Per Survey, Fixed Amount, Negotiable, As Per Organization Norms, As Per Government Rules, Performance Based, Commission Based, Incentive Based, Stipend, Volunteer (No Honorarium), Other.
   - `salary_package_type` (text, nullable): The salary package inclusion type. One of: Including Incentive, T.A. & D.A., Excluding Incentive, T.A. & D.A., Including Incentive Only, Including T.A. & D.A. Only, Fixed Salary (No Additional Benefits), Other.
   - `salary_package_custom` (text, nullable): Custom package description shown when salary_package_type = 'Other'.

3. Data Safety
   - The existing `salary_honorarium` column is NOT removed or altered — it remains for backward compatibility. The new structured fields take priority in display logic.
   - No data loss. All additions are nullable with safe defaults.

4. Security
   - No RLS policy changes. Existing policies on rms_job_postings continue to govern access.
*/

ALTER TABLE public.rms_job_postings
  ADD COLUMN IF NOT EXISTS salary_amount         numeric(12,2),
  ADD COLUMN IF NOT EXISTS salary_type           text,
  ADD COLUMN IF NOT EXISTS salary_package_type   text,
  ADD COLUMN IF NOT EXISTS salary_package_custom text;
