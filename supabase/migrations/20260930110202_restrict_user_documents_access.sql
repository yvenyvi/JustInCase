-- User documents are written/read by the authenticated backend using the
-- service-role key. The mobile client must not access this table directly.
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_documents FROM PUBLIC, anon, authenticated;
