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

CREATE OR REPLACE FUNCTION public.is_case_participant(case_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases
    WHERE id = case_uuid
      AND (
        client_id = auth.uid()
        OR attorney_id = auth.uid()
        OR public.get_my_role() = 'Super Administrator'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.thread_participants
    WHERE thread_id = p_thread_id
      AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.message_threads
    WHERE id = p_thread_id
      AND case_id IS NOT NULL
      AND public.is_case_participant(case_id)
  ) OR public.get_my_role() = 'Super Administrator';
$$;

CREATE OR REPLACE FUNCTION public.users_update_own_profile(
  p_first_name text DEFAULT NULL,
  p_middle_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_suffix text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_city_municipality text DEFAULT NULL,
  p_barangay text DEFAULT NULL,
  p_street_address text DEFAULT NULL,
  p_selfie_url text DEFAULT NULL,
  p_firm_name text DEFAULT NULL,
  p_expertise text[] DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_user public.users;
BEGIN
  UPDATE public.users
  SET
    first_name = COALESCE(p_first_name, first_name),
    middle_name = COALESCE(p_middle_name, middle_name),
    last_name = COALESCE(p_last_name, last_name),
    suffix = COALESCE(p_suffix, suffix),
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    phone_number = COALESCE(p_phone_number, phone_number),
    region = COALESCE(p_region, region),
    province = COALESCE(p_province, province),
    city_municipality = COALESCE(p_city_municipality, city_municipality),
    barangay = COALESCE(p_barangay, barangay),
    street_address = COALESCE(p_street_address, street_address),
    selfie_url = COALESCE(p_selfie_url, selfie_url),
    firm_name = COALESCE(p_firm_name, firm_name),
    expertise = COALESCE(p_expertise, expertise),
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_user;

  RETURN updated_user;
END;
$$;

-- ==========================================
-- USERS TABLE
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_read_authenticated" ON public.users;

-- Anyone authenticated can read any user profile (needed for attorney listings, messaging)
CREATE POLICY "users_read_authenticated" ON public.users
  FOR SELECT TO authenticated USING (true);

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
DROP POLICY IF EXISTS "audit_logs_read_authenticated" ON public.audit_logs;

-- Any authenticated user can insert their own audit log entries
CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- All authenticated users can read audit logs (needed for case timeline realtime)
CREATE POLICY "audit_logs_read_authenticated" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (true);

-- ==========================================
-- CASES TABLE
-- ==========================================
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cases_client_own" ON public.cases;
DROP POLICY IF EXISTS "cases_attorney_assigned" ON public.cases;
DROP POLICY IF EXISTS "cases_attorney_update" ON public.cases;
DROP POLICY IF EXISTS "cases_admin_all" ON public.cases;
DROP POLICY IF EXISTS "cases_read_authenticated" ON public.cases;
DROP POLICY IF EXISTS "cases_read_scoped" ON public.cases;

-- Citizens read their cases, assigned attorneys read theirs, and attorneys can see unassigned cases.
CREATE POLICY "cases_read_scoped" ON public.cases
  FOR SELECT TO authenticated USING (
    client_id = auth.uid()
    OR attorney_id = auth.uid()
    OR (
      attorney_id IS NULL
      AND status = 'Pending Triage'
      AND public.get_my_role() = 'Volunteer Attorney'
    )
    OR public.get_my_role() = 'Super Administrator'
  );

-- Citizens can create their own cases
CREATE POLICY "cases_client_own" ON public.cases
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Attorneys/clients/admins can update cases they are involved in
CREATE POLICY "cases_attorney_update" ON public.cases
  FOR UPDATE TO authenticated
  USING (
    client_id = auth.uid()
    OR attorney_id = auth.uid()
    OR (
      attorney_id IS NULL
      AND status = 'Pending Triage'
      AND public.get_my_role() = 'Volunteer Attorney'
    )
    OR public.get_my_role() = 'Super Administrator'
  )
  WITH CHECK (
    client_id = auth.uid()
    OR attorney_id = auth.uid()
    OR public.get_my_role() = 'Super Administrator'
  );

-- Only admins can delete cases
CREATE POLICY "cases_admin_all" ON public.cases
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'Super Administrator');

-- ==========================================
-- MESSAGES TABLE
-- ==========================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_thread_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_read_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_read_participants" ON public.messages;

CREATE POLICY "messages_read_participants" ON public.messages
  FOR SELECT TO authenticated USING (public.is_thread_participant(thread_id));

-- Users can only send messages as themselves
CREATE POLICY "messages_insert_authenticated" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_thread_participant(thread_id));

-- ==========================================
-- MESSAGE THREADS TABLE
-- ==========================================
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "threads_participant_read" ON public.message_threads;

DROP POLICY IF EXISTS "threads_read_authenticated" ON public.message_threads;
DROP POLICY IF EXISTS "threads_read_participant" ON public.message_threads;
DROP POLICY IF EXISTS "threads_create" ON public.message_threads;
DROP POLICY IF EXISTS "threads_update_participant" ON public.message_threads;

CREATE POLICY "threads_read_participant" ON public.message_threads
  FOR SELECT TO authenticated USING (
    public.is_thread_participant(id)
    OR (case_id IS NOT NULL AND public.is_case_participant(case_id))
  );

CREATE POLICY "threads_create" ON public.message_threads
  FOR INSERT TO authenticated WITH CHECK (
    case_id IS NULL
    OR public.is_case_participant(case_id)
    OR public.get_my_role() = 'Volunteer Attorney'
  );

CREATE POLICY "threads_update_participant" ON public.message_threads
  FOR UPDATE TO authenticated
  USING (public.is_thread_participant(id) OR public.is_case_participant(case_id))
  WITH CHECK (public.is_thread_participant(id) OR public.is_case_participant(case_id));

-- ==========================================
-- THREAD PARTICIPANTS TABLE
-- ==========================================
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "thread_participants_read" ON public.thread_participants;
DROP POLICY IF EXISTS "thread_participants_insert" ON public.thread_participants;

CREATE POLICY "thread_participants_read" ON public.thread_participants
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.is_thread_participant(thread_id)
    OR public.get_my_role() = 'Super Administrator'
  );

CREATE POLICY "thread_participants_insert" ON public.thread_participants
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR public.is_thread_participant(thread_id)
    OR public.get_my_role() = 'Super Administrator'
  );

-- ==========================================
-- TRIAGE ASSESSMENTS TABLE
-- ==========================================
ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "triage_read_case_owner" ON public.triage_assessments;
DROP POLICY IF EXISTS "triage_insert_authenticated" ON public.triage_assessments;

DROP POLICY IF EXISTS "triage_read_authenticated" ON public.triage_assessments;
DROP POLICY IF EXISTS "triage_read_case_participant" ON public.triage_assessments;
CREATE POLICY "triage_read_case_participant" ON public.triage_assessments
  FOR SELECT TO authenticated USING (public.is_case_participant(case_id));

CREATE POLICY "triage_insert_authenticated" ON public.triage_assessments
  FOR INSERT TO authenticated WITH CHECK (public.is_case_participant(case_id));

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
-- PRO BONO LOGS TABLE
-- ==========================================
ALTER TABLE public.pro_bono_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_bono_logs_read" ON public.pro_bono_logs;
CREATE POLICY "pro_bono_logs_read" ON public.pro_bono_logs
  FOR SELECT TO authenticated
  USING (
    attorney_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = pro_bono_logs.case_id AND cases.client_id = auth.uid()
    )
    OR public.get_my_role() = 'Super Administrator'
  );

DROP POLICY IF EXISTS "pro_bono_logs_insert" ON public.pro_bono_logs;
CREATE POLICY "pro_bono_logs_insert" ON public.pro_bono_logs
  FOR INSERT TO authenticated
  WITH CHECK ( attorney_id = auth.uid() );

DROP POLICY IF EXISTS "pro_bono_logs_update" ON public.pro_bono_logs;
CREATE POLICY "pro_bono_logs_update" ON public.pro_bono_logs
  FOR UPDATE TO authenticated
  USING (
    attorney_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = pro_bono_logs.case_id AND cases.client_id = auth.uid()
    )
  )
  WITH CHECK (
    attorney_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = pro_bono_logs.case_id AND cases.client_id = auth.uid()
    )
  );
  
DROP POLICY IF EXISTS "pro_bono_logs_delete" ON public.pro_bono_logs;
CREATE POLICY "pro_bono_logs_delete" ON public.pro_bono_logs
  FOR DELETE TO authenticated
  USING ( attorney_id = auth.uid() );

-- ==========================================
-- DOCUMENT TABLES
-- ==========================================
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Interactive AI drafts are not based on a saved template.
ALTER TABLE public.generated_documents ALTER COLUMN template_id DROP NOT NULL;

-- A case has one canonical conversation thread. The partial index still allows
-- non-case/system threads with a NULL case_id.
CREATE UNIQUE INDEX IF NOT EXISTS message_threads_case_id_unique
  ON public.message_threads(case_id) WHERE case_id IS NOT NULL;

DROP POLICY IF EXISTS "templates_read_all" ON public.document_templates;
DROP POLICY IF EXISTS "templates_admin_all" ON public.document_templates;
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

-- Notification settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_own" ON public.notification_preferences;

CREATE POLICY "notification_preferences_own" ON public.notification_preferences
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
