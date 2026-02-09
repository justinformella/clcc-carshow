-- Run this SQL in your Supabase SQL Editor to create the registrations table

-- Registrations table
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  car_number SERIAL,
  -- Owner info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  hometown TEXT,
  -- Vehicle info
  vehicle_year INTEGER NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_color TEXT,
  engine_specs TEXT,
  modifications TEXT,
  story TEXT,
  -- Event info
  preferred_category TEXT NOT NULL,
  -- Payment
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  amount_paid INTEGER DEFAULT 3000,
  -- Check-in
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  -- AI image
  ai_image_url TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX idx_registrations_email ON registrations(email);
CREATE INDEX idx_registrations_payment_status ON registrations(payment_status);
CREATE INDEX idx_registrations_stripe_session ON registrations(stripe_session_id);

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for registration form)
CREATE POLICY "Allow anonymous inserts" ON registrations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users (admin) to read all
CREATE POLICY "Allow authenticated read" ON registrations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users (admin) to update
CREATE POLICY "Allow authenticated update" ON registrations
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Allow service role full access (for webhooks)
-- The service role key bypasses RLS by default, so no policy needed

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Admins table
-- ============================================================
CREATE TABLE admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read admins" ON admins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert admins" ON admins
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update admins" ON admins
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete admins" ON admins
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Email log table
-- ============================================================
CREATE TABLE email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resend_id TEXT
);

CREATE INDEX idx_email_log_registration ON email_log(registration_id);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read email_log" ON email_log
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Registration audit log
-- ============================================================
CREATE TABLE registration_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  changed_fields JSONB NOT NULL,   -- {"field": {"old": ..., "new": ...}}
  actor_email TEXT,                 -- admin email or null for system/webhook
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_registration ON registration_audit_log(registration_id);
CREATE INDEX idx_audit_created_at ON registration_audit_log(created_at);

ALTER TABLE registration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read audit" ON registration_audit_log
  FOR SELECT TO authenticated USING (true);

-- Trigger function: logs every field change on registrations
CREATE OR REPLACE FUNCTION log_registration_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  changes JSONB := '{}'::JSONB;
  actor TEXT := NULL;
  uid UUID;
BEGIN
  -- Resolve actor email from auth.uid() (NULL for service-role calls)
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    SELECT email INTO actor FROM auth.users WHERE id = uid;
  END IF;

  -- Compare tracked fields (skip updated_at — noise from auto-update trigger)
  IF OLD.first_name              IS DISTINCT FROM NEW.first_name              THEN changes := changes || jsonb_build_object('first_name',              jsonb_build_object('old', to_jsonb(OLD.first_name),              'new', to_jsonb(NEW.first_name))); END IF;
  IF OLD.last_name               IS DISTINCT FROM NEW.last_name               THEN changes := changes || jsonb_build_object('last_name',               jsonb_build_object('old', to_jsonb(OLD.last_name),               'new', to_jsonb(NEW.last_name))); END IF;
  IF OLD.email                   IS DISTINCT FROM NEW.email                   THEN changes := changes || jsonb_build_object('email',                   jsonb_build_object('old', to_jsonb(OLD.email),                   'new', to_jsonb(NEW.email))); END IF;
  IF OLD.phone                   IS DISTINCT FROM NEW.phone                   THEN changes := changes || jsonb_build_object('phone',                   jsonb_build_object('old', to_jsonb(OLD.phone),                   'new', to_jsonb(NEW.phone))); END IF;
  IF OLD.hometown                IS DISTINCT FROM NEW.hometown                THEN changes := changes || jsonb_build_object('hometown',                jsonb_build_object('old', to_jsonb(OLD.hometown),                'new', to_jsonb(NEW.hometown))); END IF;
  IF OLD.vehicle_year            IS DISTINCT FROM NEW.vehicle_year            THEN changes := changes || jsonb_build_object('vehicle_year',            jsonb_build_object('old', to_jsonb(OLD.vehicle_year),            'new', to_jsonb(NEW.vehicle_year))); END IF;
  IF OLD.vehicle_make            IS DISTINCT FROM NEW.vehicle_make            THEN changes := changes || jsonb_build_object('vehicle_make',            jsonb_build_object('old', to_jsonb(OLD.vehicle_make),            'new', to_jsonb(NEW.vehicle_make))); END IF;
  IF OLD.vehicle_model           IS DISTINCT FROM NEW.vehicle_model           THEN changes := changes || jsonb_build_object('vehicle_model',           jsonb_build_object('old', to_jsonb(OLD.vehicle_model),           'new', to_jsonb(NEW.vehicle_model))); END IF;
  IF OLD.vehicle_color           IS DISTINCT FROM NEW.vehicle_color           THEN changes := changes || jsonb_build_object('vehicle_color',           jsonb_build_object('old', to_jsonb(OLD.vehicle_color),           'new', to_jsonb(NEW.vehicle_color))); END IF;
  IF OLD.engine_specs            IS DISTINCT FROM NEW.engine_specs            THEN changes := changes || jsonb_build_object('engine_specs',            jsonb_build_object('old', to_jsonb(OLD.engine_specs),            'new', to_jsonb(NEW.engine_specs))); END IF;
  IF OLD.modifications           IS DISTINCT FROM NEW.modifications           THEN changes := changes || jsonb_build_object('modifications',           jsonb_build_object('old', to_jsonb(OLD.modifications),           'new', to_jsonb(NEW.modifications))); END IF;
  IF OLD.story                   IS DISTINCT FROM NEW.story                   THEN changes := changes || jsonb_build_object('story',                   jsonb_build_object('old', to_jsonb(OLD.story),                   'new', to_jsonb(NEW.story))); END IF;
  IF OLD.preferred_category      IS DISTINCT FROM NEW.preferred_category      THEN changes := changes || jsonb_build_object('preferred_category',      jsonb_build_object('old', to_jsonb(OLD.preferred_category),      'new', to_jsonb(NEW.preferred_category))); END IF;
  IF OLD.payment_status          IS DISTINCT FROM NEW.payment_status          THEN changes := changes || jsonb_build_object('payment_status',          jsonb_build_object('old', to_jsonb(OLD.payment_status),          'new', to_jsonb(NEW.payment_status))); END IF;
  IF OLD.stripe_payment_intent_id IS DISTINCT FROM NEW.stripe_payment_intent_id THEN changes := changes || jsonb_build_object('stripe_payment_intent_id', jsonb_build_object('old', to_jsonb(OLD.stripe_payment_intent_id), 'new', to_jsonb(NEW.stripe_payment_intent_id))); END IF;
  IF OLD.checked_in              IS DISTINCT FROM NEW.checked_in              THEN changes := changes || jsonb_build_object('checked_in',              jsonb_build_object('old', to_jsonb(OLD.checked_in),              'new', to_jsonb(NEW.checked_in))); END IF;
  IF OLD.ai_image_url            IS DISTINCT FROM NEW.ai_image_url            THEN changes := changes || jsonb_build_object('ai_image_url',            jsonb_build_object('old', to_jsonb(OLD.ai_image_url),            'new', to_jsonb(NEW.ai_image_url))); END IF;

  -- Only insert if something actually changed
  IF changes != '{}'::JSONB THEN
    INSERT INTO registration_audit_log (registration_id, changed_fields, actor_email)
    VALUES (NEW.id, changes, actor);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER registrations_audit
  AFTER UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION log_registration_changes();

-- ============================================================
-- Sponsors table
-- ============================================================
CREATE TABLE sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  sponsorship_level TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'inquired',  -- prospect | inquired | engaged | paid
  amount_paid INTEGER DEFAULT 0,   -- cents (consistent with registrations)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sponsors_email ON sponsors(email);
CREATE INDEX idx_sponsors_status ON sponsors(status);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public sponsor inquiry form)
CREATE POLICY "Allow anonymous insert sponsors" ON sponsors
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users (admin) full access
CREATE POLICY "Allow authenticated read sponsors" ON sponsors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update sponsors" ON sponsors
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete sponsors" ON sponsors
  FOR DELETE TO authenticated USING (true);

-- Reuse the update_updated_at() trigger function
CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Sponsor audit log
-- ============================================================
CREATE TABLE sponsor_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
  changed_fields JSONB NOT NULL,
  actor_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sponsor_audit_sponsor ON sponsor_audit_log(sponsor_id);
CREATE INDEX idx_sponsor_audit_created_at ON sponsor_audit_log(created_at);

ALTER TABLE sponsor_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read sponsor_audit" ON sponsor_audit_log
  FOR SELECT TO authenticated USING (true);

-- Trigger function: logs every field change on sponsors
CREATE OR REPLACE FUNCTION log_sponsor_changes()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  changes JSONB := '{}'::JSONB;
  actor TEXT := NULL;
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    SELECT email INTO actor FROM auth.users WHERE id = uid;
  END IF;

  IF OLD.name               IS DISTINCT FROM NEW.name               THEN changes := changes || jsonb_build_object('name',               jsonb_build_object('old', to_jsonb(OLD.name),               'new', to_jsonb(NEW.name))); END IF;
  IF OLD.company            IS DISTINCT FROM NEW.company            THEN changes := changes || jsonb_build_object('company',            jsonb_build_object('old', to_jsonb(OLD.company),            'new', to_jsonb(NEW.company))); END IF;
  IF OLD.email              IS DISTINCT FROM NEW.email              THEN changes := changes || jsonb_build_object('email',              jsonb_build_object('old', to_jsonb(OLD.email),              'new', to_jsonb(NEW.email))); END IF;
  IF OLD.phone              IS DISTINCT FROM NEW.phone              THEN changes := changes || jsonb_build_object('phone',              jsonb_build_object('old', to_jsonb(OLD.phone),              'new', to_jsonb(NEW.phone))); END IF;
  IF OLD.website            IS DISTINCT FROM NEW.website            THEN changes := changes || jsonb_build_object('website',            jsonb_build_object('old', to_jsonb(OLD.website),            'new', to_jsonb(NEW.website))); END IF;
  IF OLD.sponsorship_level  IS DISTINCT FROM NEW.sponsorship_level  THEN changes := changes || jsonb_build_object('sponsorship_level',  jsonb_build_object('old', to_jsonb(OLD.sponsorship_level),  'new', to_jsonb(NEW.sponsorship_level))); END IF;
  IF OLD.message            IS DISTINCT FROM NEW.message            THEN changes := changes || jsonb_build_object('message',            jsonb_build_object('old', to_jsonb(OLD.message),            'new', to_jsonb(NEW.message))); END IF;
  IF OLD.status             IS DISTINCT FROM NEW.status             THEN changes := changes || jsonb_build_object('status',             jsonb_build_object('old', to_jsonb(OLD.status),             'new', to_jsonb(NEW.status))); END IF;
  IF OLD.amount_paid        IS DISTINCT FROM NEW.amount_paid        THEN changes := changes || jsonb_build_object('amount_paid',        jsonb_build_object('old', to_jsonb(OLD.amount_paid),        'new', to_jsonb(NEW.amount_paid))); END IF;
  IF OLD.notes              IS DISTINCT FROM NEW.notes              THEN changes := changes || jsonb_build_object('notes',              jsonb_build_object('old', to_jsonb(OLD.notes),              'new', to_jsonb(NEW.notes))); END IF;

  IF changes != '{}'::JSONB THEN
    INSERT INTO sponsor_audit_log (sponsor_id, changed_fields, actor_email)
    VALUES (NEW.id, changes, actor);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsors_audit
  AFTER UPDATE ON sponsors
  FOR EACH ROW
  EXECUTE FUNCTION log_sponsor_changes();
