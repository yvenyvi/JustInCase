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
VALUES ('case-documents', 'case-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS for the case_documents table
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- Allow users to view documents for cases they are part of
CREATE POLICY "Users can view case documents" ON public.case_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = case_documents.case_id
            AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
        )
    );

-- Allow users to insert documents for their cases
CREATE POLICY "Users can insert case documents" ON public.case_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cases
            WHERE cases.id = case_documents.case_id
            AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
        )
    );

-- 4. Set up Storage RLS for the case-documents bucket
-- Allow public viewing since it's a public bucket, or restrict to auth if preferred
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING ( bucket_id = 'case-documents' );

CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'case-documents' AND auth.role() = 'authenticated'
    );
