-- ==========================================
-- JusticeLink Master Database Reset Script
-- WARNING: THIS WILL DELETE ALL DATA IN THE PUBLIC SCHEMA
-- ==========================================

BEGIN;

-- 1. CLEANUP
-- Drop existing triggers on auth.users for safety
DROP TRIGGER IF EXISTS trg_create_profile_on_auth_user_insert ON auth.users;

-- Drop all tables in public schema
DROP TABLE IF EXISTS public.rights_articles CASCADE;
DROP TABLE IF EXISTS public.rights_categories CASCADE;
DROP TABLE IF EXISTS public.case_studies CASCADE;
DROP TABLE IF EXISTS public.pro_bono_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.thread_participants CASCADE;
DROP TABLE IF EXISTS public.message_threads CASCADE;
DROP TABLE IF EXISTS public.triage_assessments CASCADE;
DROP TABLE IF EXISTS public.cases CASCADE;
DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.generated_documents CASCADE;
DROP TABLE IF EXISTS public.document_templates CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.user_status CASCADE;
DROP TYPE IF EXISTS public.case_status CASCADE;
DROP TYPE IF EXISTS public.verification_status CASCADE;
DROP TYPE IF EXISTS public.lawyer_preference_type CASCADE;

-- 2. CORE SCHEMA
-- Enable UUID & Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE public.user_role AS ENUM ('Volunteer Attorney', 'Citizen', 'Super Administrator');
CREATE TYPE public.user_status AS ENUM ('online', 'offline');
CREATE TYPE public.case_status AS ENUM ('Pending Triage', 'Pending Acceptance', 'In Progress', 'Hearing Scheduled', 'Demand Sent', 'Closed - Won', 'Closed - Lost', 'Withdrawn', 'Dropped');
CREATE TYPE public.verification_status AS ENUM ('unverified', 'verified', 'rejected');
CREATE TYPE public.lawyer_preference_type AS ENUM ('Pro Bono', 'Private');

-- USERS (Profiles)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    handle VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(20),
    date_of_birth DATE,
    phone_number VARCHAR(20),
    region VARCHAR(100),
    province VARCHAR(100),
    city_municipality VARCHAR(100),
    barangay VARCHAR(100),
    street_address TEXT,
    is_didit_verified BOOLEAN DEFAULT false,
    status_verification public.verification_status DEFAULT 'unverified',
    id_picture_url TEXT,
    selfie_url TEXT,
    firm_name VARCHAR(150),
    ibp_number VARCHAR(50),
    roll_number VARCHAR(50),
    pro_bono_period_start DATE,
    role public.user_role NOT NULL DEFAULT 'Citizen',
    status public.user_status DEFAULT 'offline',
    expertise TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CASES
CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lawyer_preference public.lawyer_preference_type,
    status public.case_status DEFAULT 'Pending Triage',
    client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attorney_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    closing_notes TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    ai_summary TEXT,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    client_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- TRIAGE ASSESSMENTS
CREATE TABLE public.triage_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    match_percentage DECIMAL(5, 2),
    summary TEXT,
    triage_input JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MESSAGE THREADS
CREATE TABLE public.message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thread Participants
CREATE TABLE public.thread_participants (
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, user_id)
);

-- MESSAGES
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    detail TEXT NOT NULL,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PRO-BONO SERVICE LOGS
CREATE TABLE public.pro_bono_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attorney_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    hours DECIMAL(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    evidence_url TEXT,
    evidence_name TEXT,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CASE STUDIES
CREATE TABLE public.case_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    outcomes JSONB NOT NULL DEFAULT '[]',
    tag VARCHAR(100),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. AI CHAT TABLES (Kampi)
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Legal Query',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. DOCUMENT GENERATOR TABLES
CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 10,
  law_basis TEXT NOT NULL,
  body_template TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE RESTRICT,
  template_slug TEXT NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4b. SYSTEM SETTINGS TABLE
DROP TABLE IF EXISTS public.system_settings CASCADE;
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.system_settings (key, value) VALUES
  ('platform_name',           'JusticeLink - PH'),
  ('support_email',           'support@justicelink.ph'),
  ('default_language',        'English (US)'),
  ('time_zone',               '(GMT+08:00) Manila, Taipei, Beijing'),
  ('theme',                   'trust-blue'),
  ('compact_mode',            'false'),
  ('maintenance_mode',        'false'),
  ('notify_critical_errors',  'true'),
  ('notify_admin_logins',     'true'),
  ('notify_weekly_analytics', 'false')
ON CONFLICT (key) DO NOTHING;

-- Rights Library
CREATE TABLE public.rights_categories (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  subtitle       TEXT,
  icon_name      TEXT NOT NULL DEFAULT 'BookOpen',
  law_reference  TEXT,
  source_url     TEXT,
  description    TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.rights_articles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES public.rights_categories(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  detail        TEXT,
  law_section   TEXT,
  article_url   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rights_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_articles    ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_public_read_categories" ON public.rights_categories FOR SELECT USING (true);
CREATE POLICY "allow_public_read_articles"   ON public.rights_articles    FOR SELECT USING (true);

-- 5. SEED USERS (Supabase Auth)
-- This inserts into auth.users, and the trigger handles public.users profiles.
-- The password is: TestPassword123!

-- Clean up existing test users first to ensure credentials are fresh
-- DELETE FROM auth.users WHERE email IN ('lance_citizen@example.com', 'lance_admin@example.com', 'lance_attorney@example.com');

-- 6. TRIGGERS & FUNCTIONS
-- This is a super-safe version of the trigger that will NOT block user creation even if profile sync fails
CREATE OR REPLACE FUNCTION public.handle_auth_user_insert()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (
      id, email, handle, first_name, middle_name, last_name,
      suffix, date_of_birth, phone_number, region, province,
      city_municipality, barangay, street_address,
      status_verification, is_didit_verified, role,
      ibp_number, roll_number, id_picture_url, selfie_url
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'handle', 'user_' || substr(md5(NEW.email), 1, 8)),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
      NEW.raw_user_meta_data->>'middle_name',
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Account'),
      NEW.raw_user_meta_data->>'suffix',
      (NEW.raw_user_meta_data->>'date_of_birth')::date,
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'region',
      NEW.raw_user_meta_data->>'province',
      NEW.raw_user_meta_data->>'city_municipality',
      NEW.raw_user_meta_data->>'barangay',
      NEW.raw_user_meta_data->>'street_address',
      COALESCE((NEW.raw_user_meta_data->>'status_verification')::public.verification_status, 'unverified'),
      COALESCE((NEW.raw_user_meta_data->>'is_didit_verified')::boolean, false),
      COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'Citizen'),
      NEW.raw_user_meta_data->>'ibp_number',
      NEW.raw_user_meta_data->>'roll_number',
      NEW.raw_user_meta_data->>'id_picture_url',
      NEW.raw_user_meta_data->>'selfie_url'
    ) ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If profile creation fails, we still want the auth user to be created.
    RETURN NEW;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_profile_on_auth_user_insert
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_insert();

-- 7. SYNC EXISTING USERS
-- Manually sync profiles from auth.users to public.users
INSERT INTO public.users (
    id, email, handle, first_name, middle_name, last_name,
    suffix, date_of_birth, phone_number, region, province,
    city_municipality, barangay, street_address,
    status_verification, is_didit_verified, role,
    ibp_number, roll_number, id_picture_url, selfie_url
)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'handle', 'user_' || substr(md5(email), 1, 8)),
    COALESCE(raw_user_meta_data->>'first_name', 'User'),
    raw_user_meta_data->>'middle_name',
    COALESCE(raw_user_meta_data->>'last_name', 'Account'),
    raw_user_meta_data->>'suffix',
    (raw_user_meta_data->>'date_of_birth')::date,
    raw_user_meta_data->>'phone_number',
    raw_user_meta_data->>'region',
    raw_user_meta_data->>'province',
    raw_user_meta_data->>'city_municipality',
    raw_user_meta_data->>'barangay',
    raw_user_meta_data->>'street_address',
    COALESCE((raw_user_meta_data->>'status_verification')::public.verification_status, 'unverified'),
    COALESCE((raw_user_meta_data->>'is_didit_verified')::boolean, false),
    COALESCE((raw_user_meta_data->>'role')::public.user_role, 'Citizen'),
    raw_user_meta_data->>'ibp_number',
    raw_user_meta_data->>'roll_number',
    raw_user_meta_data->>'id_picture_url',
    raw_user_meta_data->>'selfie_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ==========================================
-- ENABLE REALTIME FOR TABLES
-- ==========================================
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_bono_logs;
