-- Create storage bucket for candidate documents (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-docs',
  'candidate-docs',
  false,
  10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: candidates can upload their own files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'candidate_docs_insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "candidate_docs_insert"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'candidate-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'candidate_docs_select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "candidate_docs_select"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'candidate-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  END IF;
END $$;
