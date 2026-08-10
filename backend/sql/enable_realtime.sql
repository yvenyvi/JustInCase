-- Enable Realtime for relevant tables
BEGIN;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_bono_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;

COMMIT;
