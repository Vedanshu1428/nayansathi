-- =============================================================================
-- GAZECONNECT — PRODUCTION SUPABASE POSTGRESQL DATABASE SCHEMA
-- Row-Level Security (RLS) enabled on all tables.
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- References Supabase auth.users. Stores patient and caregiver account roles.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'caregiver')),
    preferred_language TEXT NOT NULL DEFAULT 'en-US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies:
-- Users can view and update their own profile.
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 2. PATIENT PREFERENCES TABLE
-- Stores eye-tracking calibration, dwell duration, layout, and speech preferences.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patient_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    dwell_time_ms INTEGER NOT NULL DEFAULT 1200 CHECK (dwell_time_ms BETWEEN 600 AND 2500),
    keyboard_layout TEXT NOT NULL DEFAULT 'QWERTY' CHECK (keyboard_layout IN ('QWERTY', 'Simplified', 'Large-Key', 'High-Contrast')),
    voice_preference TEXT DEFAULT 'default',
    speech_rate NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (speech_rate BETWEEN 0.50 AND 2.00),
    accessibility_settings JSONB NOT NULL DEFAULT '{
        "high_contrast": false,
        "reduced_motion": false,
        "smoothing_beta": 0.05,
        "exit_grace_ms": 150,
        "cooldown_ms": 600
    }'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.patient_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own preferences"
    ON public.patient_preferences FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Active caregivers view patient preferences"
    ON public.patient_preferences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_connections cc
            WHERE cc.patient_id = patient_preferences.user_id
              AND cc.caregiver_id = auth.uid()
              AND cc.status = 'active'
        )
    );

CREATE POLICY "Active caregivers update patient preferences"
    ON public.patient_preferences FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_connections cc
            WHERE cc.patient_id = patient_preferences.user_id
              AND cc.caregiver_id = auth.uid()
              AND cc.status = 'active'
        )
    );

-- -----------------------------------------------------------------------------
-- 3. SAVED PHRASES TABLE
-- Stores 1-dwell categorized communication phrases.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_phrases (
    phrase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    phrase TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Daily Needs' CHECK (category IN ('Daily Needs', 'Medical', 'Social', 'Custom')),
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_saved_phrases_user_category ON public.saved_phrases(user_id, category);

ALTER TABLE public.saved_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own saved phrases"
    ON public.saved_phrases FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Active caregivers view patient phrases"
    ON public.saved_phrases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_connections cc
            WHERE cc.patient_id = saved_phrases.user_id
              AND cc.caregiver_id = auth.uid()
              AND cc.status = 'active'
        )
    );

CREATE POLICY "Active caregivers manage patient phrases"
    ON public.saved_phrases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.caregiver_connections cc
            WHERE cc.patient_id = saved_phrases.user_id
              AND cc.caregiver_id = auth.uid()
              AND cc.status = 'active'
        )
    );

-- -----------------------------------------------------------------------------
-- 4. COMMUNICATION HISTORY TABLE
-- Consent-gated communication history. Records strictly when user_consent is true.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_history (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    user_consent BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_comm_history_user_time ON public.communication_history(user_id, timestamp DESC);

ALTER TABLE public.communication_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage own communication history"
    ON public.communication_history FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Active caregivers view consented history"
    ON public.communication_history FOR SELECT
    USING (
        user_consent = true
        AND EXISTS (
            SELECT 1 FROM public.caregiver_connections cc
            WHERE cc.patient_id = communication_history.user_id
              AND cc.caregiver_id = auth.uid()
              AND cc.status = 'active'
        )
    );

-- -----------------------------------------------------------------------------
-- 5. CAREGIVER CONNECTIONS TABLE
-- Consent-based handshake between patient and authorized caregiver.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.caregiver_connections (
    connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL DEFAULT 'full' CHECK (permission_level IN ('full', 'read_phrases', 'settings_only')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_patient_caregiver UNIQUE (patient_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_caregiver ON public.caregiver_connections(caregiver_id, status);

ALTER TABLE public.caregiver_connections ENABLE ROW LEVEL SECURITY;

-- Patients can view and update connection status (approve/revoke)
CREATE POLICY "Patients control connections"
    ON public.caregiver_connections FOR ALL
    USING (auth.uid() = patient_id);

-- Caregivers can view connections they are part of
CREATE POLICY "Caregivers view own connections"
    ON public.caregiver_connections FOR SELECT
    USING (auth.uid() = caregiver_id);

CREATE POLICY "Caregivers request connection"
    ON public.caregiver_connections FOR INSERT
    WITH CHECK (auth.uid() = caregiver_id AND status = 'pending');

-- -----------------------------------------------------------------------------
-- 6. EMERGENCY CONTACTS TABLE
-- Designated emergency contacts with mandatory confirmation toggle.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_method TEXT NOT NULL DEFAULT 'phone' CHECK (contact_method IN ('phone', 'sms', 'email')),
    contact_details TEXT NOT NULL,
    relationship TEXT NOT NULL DEFAULT 'Caregiver',
    confirmation_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients manage emergency contacts"
    ON public.emergency_contacts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Active caregivers view emergency contacts"
    ON public.emergency_contacts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.caregiver_connections cc
            WHERE cc.patient_id = emergency_contacts.user_id
              AND cc.caregiver_id = auth.uid()
              AND cc.status = 'active'
        )
    );
