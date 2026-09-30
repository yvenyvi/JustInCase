-- 1. Create the case_documents table
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create the case-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3. Set up RLS for the case_documents table
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Users can insert case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Case participants can read case documents" ON public.case_documents;
DROP POLICY IF EXISTS "Case participants can upload case documents" ON public.case_documents;
REVOKE ALL ON TABLE public.case_documents FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.case_documents TO authenticated;

CREATE POLICY "Case participants can read case documents" ON public.case_documents
    FOR SELECT TO authenticated USING (
        public.get_my_role() = 'Super Administrator'
        OR EXISTS (
            SELECT 1 FROM public.cases AS c
            WHERE c.id = case_documents.case_id
              AND (c.client_id = (SELECT auth.uid()) OR c.attorney_id = (SELECT auth.uid()))
        )
    );

-- Allow users to insert documents for their cases
CREATE POLICY "Case participants can upload case documents" ON public.case_documents
    FOR INSERT TO authenticated WITH CHECK (
        uploaded_by = (SELECT auth.uid())
        AND (
          public.get_my_role() = 'Super Administrator'
          OR
        EXISTS (
            SELECT 1 FROM public.cases AS c
            WHERE c.id = case_documents.case_id
              AND (c.client_id = (SELECT auth.uid()) OR c.attorney_id = (SELECT auth.uid()))
        )
        )
    );

-- 4. Set up Storage RLS for the case-documents bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Case participants can read case attachments" ON storage.objects;
DROP POLICY IF EXISTS "Case participants can upload case attachments" ON storage.objects;

CREATE POLICY "Case participants can read case attachments" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'case-documents'
        AND EXISTS (
          SELECT 1 FROM public.cases AS c
          WHERE c.id::text = (storage.foldername(name))[1]
            AND (c.client_id = (SELECT auth.uid()) OR c.attorney_id = (SELECT auth.uid()) OR public.get_my_role() = 'Super Administrator')
        )
    );

CREATE POLICY "Case participants can upload case attachments" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'case-documents'
        AND EXISTS (
          SELECT 1 FROM public.cases AS c
          WHERE c.id::text = (storage.foldername(name))[1]
            AND (c.client_id = (SELECT auth.uid()) OR c.attorney_id = (SELECT auth.uid()) OR public.get_my_role() = 'Super Administrator')
        )
    );
