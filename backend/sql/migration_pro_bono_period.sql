-- Migration: add pro_bono_period_start to users
-- Run this once against an existing database (skip if using master_reset.sql on a fresh DB).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pro_bono_period_start DATE;

-- Seed existing attorneys with their account creation date as the period start.
-- Admins can override this per-attorney via the admin panel if needed.
UPDATE public.users
SET pro_bono_period_start = created_at::date
WHERE role = 'Volunteer Attorney'
  AND pro_bono_period_start IS NULL;
