-- ==========================================
-- JusticeLink RLS Policies
-- Run this in Supabase SQL Editor after master_reset.sql
-- ==========================================

-- ==========================================
-- HELPER FUNCTION (avoids infinite recursion)
-- Querying public.users inside a policy ON public.users causes recursion.
-- This SECURITY DEFINER function runs as owner, bypassing RLS.
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

-- ==========================================
-- USERS TABLE
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Anyone authenticated can read any user profile (needed for attorney listings, messaging)
CREATE POLICY "users_read_authenticated" ON public.users
  FOR SELECT TO authenticated USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can do everything
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'Super Administrator')
  WITH CHECK (public.get_my_role() = 'Super Administrator');

-- ==========================================
-- SYSTEM SETTINGS TABLE
-- ==========================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_read" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;

-- All authenticated users can read settings (e.g. maintenance_mode check on login)
CREATE POLICY "system_settings_read" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

-- Only Super Administrators can create/update/delete settings
CREATE POLICY "system_settings_admin_write" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'Super Administrator')
  WITH CHECK (public.get_my_role() = 'Super Administrator');

-- ==========================================
-- AUDIT LOGS TABLE
-- ==========================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;

-- Any authenticated user can insert their own audit log entries
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'Super Administrator');

-- ==========================================
-- CASES TABLE
-- ==========================================
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_client_own" ON public.cases;
DROP POLICY IF EXISTS "cases_attorney_assigned" ON public.cases;
DROP POLICY IF EXISTS "cases_admin_all" ON public.cases;

-- Citizens can read/write their own cases
CREATE POLICY "cases_client_own" ON public.cases
  FOR ALL TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Attorneys can read cases assigned to them or pending triage
CREATE POLICY "cases_attorney_assigned" ON public.cases
  FOR SELECT TO authenticated
  USING (
    attorney_id = auth.uid()
    OR status = 'Pending Triage'
  );

-- Attorneys can update cases assigned to them, OR self-assign from Pro-Bono Hub
CREATE POLICY "cases_attorney_update" ON public.cases
  FOR UPDATE TO authenticated
  USING (
    attorney_id = auth.uid()
    OR (attorney_id IS NULL AND status = 'Pending Triage')
  )
  WITH CHECK (attorney_id = auth.uid());

-- Admins can do everything
CREATE POLICY "cases_admin_all" ON public.cases
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'Super Administrator')
  WITH CHECK (public.get_my_role() = 'Super Administrator');

-- ==========================================
-- MESSAGES TABLE
-- ==========================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_thread_participant" ON public.messages;

-- Users can read/insert messages only in threads they participate in
CREATE POLICY "messages_thread_participant" ON public.messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = messages.thread_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = messages.thread_id AND user_id = auth.uid()
    )
  );

-- ==========================================
-- MESSAGE THREADS TABLE
-- ==========================================
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "threads_participant_read" ON public.message_threads;

CREATE POLICY "threads_participant_read" ON public.message_threads
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = message_threads.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "threads_create" ON public.message_threads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "threads_update_participant" ON public.message_threads
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.thread_participants
      WHERE thread_id = message_threads.id AND user_id = auth.uid()
    )
  );

-- ==========================================
-- THREAD PARTICIPANTS TABLE
-- ==========================================
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thread_participants_read" ON public.thread_participants;
DROP POLICY IF EXISTS "thread_participants_insert" ON public.thread_participants;

CREATE POLICY "thread_participants_read" ON public.thread_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "thread_participants_insert" ON public.thread_participants
  FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- TRIAGE ASSESSMENTS TABLE
-- ==========================================
ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "triage_read_case_owner" ON public.triage_assessments;
DROP POLICY IF EXISTS "triage_insert_authenticated" ON public.triage_assessments;

-- Users can read triage for their own cases; attorneys can read triage for assigned cases
CREATE POLICY "triage_read_case_owner" ON public.triage_assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = triage_assessments.case_id
      AND (cases.client_id = auth.uid() OR cases.attorney_id = auth.uid())
    )
    OR public.get_my_role() = 'Super Administrator'
  );

CREATE POLICY "triage_insert_authenticated" ON public.triage_assessments
  FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- AI CONVERSATIONS & MESSAGES
-- ==========================================
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conversations_own" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_messages_own" ON public.ai_messages;

CREATE POLICY "ai_conversations_own" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ai_messages_own" ON public.ai_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- ==========================================
-- DOCUMENT TABLES
-- ==========================================
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_read_all" ON public.document_templates;
DROP POLICY IF EXISTS "generated_docs_own" ON public.generated_documents;

-- Everyone can read active templates
CREATE POLICY "templates_read_all" ON public.document_templates
  FOR SELECT TO authenticated USING (is_active = true);

-- Admins manage templates
CREATE POLICY "templates_admin_all" ON public.document_templates
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'Super Administrator')
  WITH CHECK (public.get_my_role() = 'Super Administrator');

-- Users manage their own generated documents
CREATE POLICY "generated_docs_own" ON public.generated_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_any" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Any authenticated user can create notifications for others (needed for case acceptance alerts)
CREATE POLICY "notifications_insert_any" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can only mark their own notifications as read / delete them
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ==========================================
-- STORAGE BUCKET POLICIES
-- ==========================================

-- message-attachments bucket (chat file uploads)
DROP POLICY IF EXISTS "authenticated can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can read attachments" ON storage.objects;

CREATE POLICY "authenticated can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

-- documents bucket (pro-bono evidence, generated docs)
DROP POLICY IF EXISTS "authenticated can upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can read documents" ON storage.objects;

CREATE POLICY "authenticated can upload to documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "authenticated can read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
