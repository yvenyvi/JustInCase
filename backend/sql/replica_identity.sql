-- Set REPLICA IDENTITY FULL on cases table for realtime filters
BEGIN;
ALTER TABLE public.cases REPLICA IDENTITY FULL;
ALTER TABLE public.pro_bono_logs REPLICA IDENTITY FULL;
COMMIT;
