-- Migration: add firm_name to users, triage_input to triage_assessments
-- Run once in Supabase SQL editor (Project → SQL Editor → New query)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS firm_name VARCHAR(150);

ALTER TABLE public.triage_assessments
  ADD COLUMN IF NOT EXISTS triage_input JSONB;
