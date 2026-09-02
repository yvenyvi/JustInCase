-- ==========================================
-- Enable Realtime for relevant tables
-- Run this in Supabase SQL Editor after rls_policies.sql
-- ==========================================

BEGIN;

-- Safely remove tables from publication first (ignore errors if not present)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.cases; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.messages; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.pro_bono_logs; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.message_threads; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.audit_logs; EXCEPTION WHEN OTHERS THEN END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.case_documents; EXCEPTION WHEN OTHERS THEN END $$;

-- Add all tables that need realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_bono_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_documents;

COMMIT;

-- ==========================================
-- REPLICA IDENTITY FULL
-- Required for realtime filters on non-primary-key columns
-- (e.g. filter: case_id=eq.${caseId}, thread_id=eq.${threadId})
-- Without this, UPDATE/DELETE events are silently dropped by
-- Supabase Realtime because the filter column is not available.
-- ==========================================
ALTER TABLE public.pro_bono_logs REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.case_documents REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.cases REPLICA IDENTITY FULL;
