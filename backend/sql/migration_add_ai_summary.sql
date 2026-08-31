-- Migration: Add ai_summary to cases
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;
