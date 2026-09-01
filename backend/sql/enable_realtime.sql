-- Enable Realtime for relevant tables
BEGIN;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.cases;
EXCEPTION WHEN OTHERS THEN END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
EXCEPTION WHEN OTHERS THEN END $$;
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.pro_bono_logs;
EXCEPTION WHEN OTHERS THEN END $$;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_bono_logs;

COMMIT;
