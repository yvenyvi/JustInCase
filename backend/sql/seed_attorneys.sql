-- ==========================================
-- JusticeLink - Seed Verified Attorney Accounts
-- Run this in the Supabase SQL Editor.
-- Password for all accounts: TestPassword123!
-- Covers all 6 triage categories with distinct specialties.
-- ==========================================

-- Clean up any existing seed attorneys first
DELETE FROM auth.users WHERE email IN (
  'atty.santos@justicelink.ph',
  'atty.reyes@justicelink.ph',
  'atty.cruz@justicelink.ph',
  'atty.dizon@justicelink.ph',
  'atty.gomez@justicelink.ph',
  'atty.villanueva@justicelink.ph'
);

-- -------------------------------------------------------
-- Attorney 1: Housing, Lupa & Eviction specialist
-- Location: Metro Manila / NCR
-- -------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'atty.santos@justicelink.ph',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{
    "handle": "atty_santos",
    "first_name": "Maria",
    "middle_name": "Reyes",
    "last_name": "Santos",
    "suffix": "",
    "phone_number": "+63 917 111 0001",
    "region": "NCR",
    "province": "Metro Manila",
    "city_municipality": "Quezon City",
    "barangay": "Diliman",
    "street_address": "123 Commonwealth Ave",
    "status_verification": "verified",
    "is_didit_verified": false,
    "role": "Volunteer Attorney",
    "ibp_number": "IBP-001234",
    "roll_number": "RN-056789"
  }',
  'authenticated', 'authenticated'
);

-- -------------------------------------------------------
-- Attorney 2: Labor & Employment specialist
-- Location: Cavite / CALABARZON
-- -------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'atty.reyes@justicelink.ph',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{
    "handle": "atty_reyes",
    "first_name": "Jose",
    "middle_name": "dela",
    "last_name": "Reyes",
    "suffix": "Jr.",
    "phone_number": "+63 918 222 0002",
    "region": "CALABARZON",
    "province": "Cavite",
    "city_municipality": "Dasmariñas",
    "barangay": "Salawag",
    "street_address": "456 Aguinaldo Highway",
    "status_verification": "verified",
    "is_didit_verified": false,
    "role": "Volunteer Attorney",
    "ibp_number": "IBP-002345",
    "roll_number": "RN-067890"
  }',
  'authenticated', 'authenticated'
);

-- -------------------------------------------------------
-- Attorney 3: Family Law & VAWC specialist
-- Location: Cebu / Region VII
-- -------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'atty.cruz@justicelink.ph',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{
    "handle": "atty_cruz",
    "first_name": "Angela",
    "middle_name": "Lim",
    "last_name": "Cruz",
    "suffix": "",
    "phone_number": "+63 919 333 0003",
    "region": "Region VII",
    "province": "Cebu",
    "city_municipality": "Cebu City",
    "barangay": "Lahug",
    "street_address": "789 Gorordo Ave",
    "status_verification": "verified",
    "is_didit_verified": false,
    "role": "Volunteer Attorney",
    "ibp_number": "IBP-003456",
    "roll_number": "RN-078901"
  }',
  'authenticated', 'authenticated'
);

-- -------------------------------------------------------
-- Attorney 4: Criminal Defense specialist
-- Location: Bulacan / Central Luzon
-- -------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  'atty.dizon@justicelink.ph',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{
    "handle": "atty_dizon",
    "first_name": "Rafael",
    "middle_name": "Garcia",
    "last_name": "Dizon",
    "suffix": "",
    "phone_number": "+63 920 444 0004",
    "region": "Region III",
    "province": "Bulacan",
    "city_municipality": "Malolos",
    "barangay": "Molave",
    "street_address": "321 MacArthur Highway",
    "status_verification": "verified",
    "is_didit_verified": false,
    "role": "Volunteer Attorney",
    "ibp_number": "IBP-004567",
    "roll_number": "RN-089012"
  }',
  'authenticated', 'authenticated'
);

-- -------------------------------------------------------
-- Attorney 5: Debt & Small Claims / Civil Matters specialist
-- Location: Davao / Region XI
-- -------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a5555555-5555-5555-5555-555555555555',
  'atty.gomez@justicelink.ph',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{
    "handle": "atty_gomez",
    "first_name": "Elena",
    "middle_name": "Torres",
    "last_name": "Gomez",
    "suffix": "",
    "phone_number": "+63 921 555 0005",
    "region": "Region XI",
    "province": "Davao del Sur",
    "city_municipality": "Davao City",
    "barangay": "Poblacion",
    "street_address": "654 JP Laurel Ave",
    "status_verification": "verified",
    "is_didit_verified": false,
    "role": "Volunteer Attorney",
    "ibp_number": "IBP-005678",
    "roll_number": "RN-090123"
  }',
  'authenticated', 'authenticated'
);

-- -------------------------------------------------------
-- Attorney 6: General / Multi-specialty
-- Location: Pampanga / Central Luzon
-- -------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES (
  'a6666666-6666-6666-6666-666666666666',
  'atty.villanueva@justicelink.ph',
  crypt('TestPassword123!', gen_salt('bf', 10)),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{
    "handle": "atty_villanueva",
    "first_name": "Marco",
    "middle_name": "Bautista",
    "last_name": "Villanueva",
    "suffix": "II",
    "phone_number": "+63 922 666 0006",
    "region": "Region III",
    "province": "Pampanga",
    "city_municipality": "San Fernando",
    "barangay": "Santo Rosario",
    "street_address": "987 Jose Abad Santos Ave",
    "status_verification": "verified",
    "is_didit_verified": false,
    "role": "Volunteer Attorney",
    "ibp_number": "IBP-006789",
    "roll_number": "RN-101234"
  }',
  'authenticated', 'authenticated'
);

-- -------------------------------------------------------
-- Set interests on public.users for each attorney.
-- The trigger creates the profile rows but does not set interests,
-- so we update them here after the inserts complete.
-- These values match the triage category keywords exactly.
--
-- NOTE: If the interests column is jsonb, use the ::jsonb lines below.
-- If it is text[], replace with:
--   ARRAY['Housing, Lupa & Eviction', 'Lupa at Ari-arian']
-- -------------------------------------------------------

UPDATE public.users SET interests = '["Housing, Lupa & Eviction", "Lupa at Ari-arian"]'::jsonb
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE public.users SET interests = '["Labor & Employment (Trabaho)", "Karapatan sa Paggawa"]'::jsonb
WHERE id = 'a2222222-2222-2222-2222-222222222222';

UPDATE public.users SET interests = '["Family & VAWC (Violence Against Women)", "Batas Pampamilya"]'::jsonb
WHERE id = 'a3333333-3333-3333-3333-333333333333';

UPDATE public.users SET interests = '["Criminal Cases", "Depensa sa Krimen"]'::jsonb
WHERE id = 'a4444444-4444-4444-4444-444444444444';

UPDATE public.users SET interests = '["Debt & Small Claims", "Iba pang Civil Matters"]'::jsonb
WHERE id = 'a5555555-5555-5555-5555-555555555555';

UPDATE public.users SET interests = '["Housing, Lupa & Eviction", "Criminal Cases", "Labor & Employment (Trabaho)", "Iba pang Civil Matters"]'::jsonb
WHERE id = 'a6666666-6666-6666-6666-666666666666';

-- Verify inserts
SELECT id, email, first_name, last_name, province, status_verification, interests
FROM public.users
WHERE role = 'Volunteer Attorney'
ORDER BY created_at;
