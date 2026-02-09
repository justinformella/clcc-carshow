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
  created_at TIMESTAMPTZ DEFAULT NOW()
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
