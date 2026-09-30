-- Case attachments contain private case material. They must only be
-- readable/uploadable by authenticated participants in the associated case.

CREATE TABLE IF NOT EXISTS public.case_documents (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES auth.users(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'case_documents_case_id_fkey'
      AND conrelid = 'public.case_documents'::regclass
  ) THEN
    ALTER TABLE public.case_documents
      ADD CONSTRAINT case_documents_case_id_fkey
      FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.case_documents FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.case_documents TO authenticated;

DROP POLICY IF EXISTS "Case participants can read case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Case participants can upload case documents" ON public.case_documents;
CREATE POLICY "Case participants can read case documents"
  ON public.case_documents FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'Super Administrator'
    OR EXISTS (
      SELECT 1 FROM public.cases AS c
      WHERE c.id = case_documents.case_id
        AND (c.client_id = (SELECT auth.uid()) OR c.attorney_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Case participants can upload case documents"
  ON public.case_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (
      public.get_my_role() = 'Super Administrator'
      OR EXISTS (
        SELECT 1 FROM public.cases AS c
        WHERE c.id = case_documents.case_id
          AND (c.client_id = (SELECT auth.uid()) OR c.attorney_id = (SELECT auth.uid()))
      )
    )
  );

-- These files include legal evidence and identity-adjacent case material.
-- Disable anonymous public URLs and use authenticated access instead.
UPDATE storage.buckets
SET public = false
WHERE id = 'case-documents';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Case participants can read case attachments" ON storage.objects;
DROP POLICY IF EXISTS "Case participants can upload case attachments" ON storage.objects;

CREATE POLICY "Case participants can read case attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.cases AS c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (
          c.client_id = (SELECT auth.uid())
          OR c.attorney_id = (SELECT auth.uid())
          OR public.get_my_role() = 'Super Administrator'
        )
    )
  );

CREATE POLICY "Case participants can upload case attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.cases AS c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (
          c.client_id = (SELECT auth.uid())
          OR c.attorney_id = (SELECT auth.uid())
          OR public.get_my_role() = 'Super Administrator'
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id_created_at
  ON public.case_documents (case_id, created_at DESC);
