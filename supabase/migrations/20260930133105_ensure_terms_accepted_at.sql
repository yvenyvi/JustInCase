-- Restore the consent timestamp field expected by the web and mobile clients.
-- The remote migration history lists earlier attempts to add this field, but
-- the linked staging schema did not contain it when verified on 2026-09-30.
-- Keep this migration additive and safe to run if the column already exists.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
