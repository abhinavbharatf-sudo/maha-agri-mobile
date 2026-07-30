/*
# RMS: HR Notes + Interview Slot Interviewer Name

1. New Tables
   - `rms_application_notes`: stores HR notes per application (timestamp, content, author)
2. Modified Tables
   - `rms_interview_slots`: adds `interviewer_name text` for quick interviewer reference
3. Security
   - RLS enabled on rms_application_notes; all 4 CRUD policies for authenticated role
*/

-- Add interviewer_name to existing interview slots table
ALTER TABLE rms_interview_slots
  ADD COLUMN IF NOT EXISTS interviewer_name text;

-- HR Notes table
CREATE TABLE IF NOT EXISTS rms_application_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES rms_applications(id) ON DELETE CASCADE,
  content        text NOT NULL,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rms_app_notes_app ON rms_application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_rms_app_notes_created ON rms_application_notes(created_at);

ALTER TABLE rms_application_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rms_notes_select" ON rms_application_notes;
CREATE POLICY "rms_notes_select" ON rms_application_notes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rms_notes_insert" ON rms_application_notes;
CREATE POLICY "rms_notes_insert" ON rms_application_notes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "rms_notes_update" ON rms_application_notes;
CREATE POLICY "rms_notes_update" ON rms_application_notes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rms_notes_delete" ON rms_application_notes;
CREATE POLICY "rms_notes_delete" ON rms_application_notes
  FOR DELETE TO authenticated USING (true);
