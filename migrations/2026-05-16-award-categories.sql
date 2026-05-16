-- Award Categories: admin-managed list, replaces the hardcoded AWARD_CATEGORIES constant.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS award_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_award_categories_order ON award_categories(display_order);

-- Public read (active list is read by the public homepage)
ALTER TABLE award_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active award categories" ON award_categories;
CREATE POLICY "Public can read active award categories"
  ON award_categories FOR SELECT
  USING (true);

-- Seed the 2026 list (idempotent — only inserts on first run)
INSERT INTO award_categories (name, display_order) VALUES
  ('Best Motorcycle',          10),
  ('Best Vanity Plate',        20),
  ('Best Interior',            30),
  ('Best Domestic',            40),
  ('Best Asian Import',        50),
  ('Best European Import',     60),
  ('Best Classic (Pre-2000)',  70),
  ('Best Modern (2000+)',      80),
  ('Best in Show',             90)
ON CONFLICT (name) DO NOTHING;

-- OPTIONAL: migrate any existing registrations from old category names to new ones.
-- Review these before running — uncomment as needed:
-- UPDATE registrations SET award_category = 'Best Asian Import'    WHERE award_category = 'Best Japanese';
-- UPDATE registrations SET award_category = 'Best European Import' WHERE award_category = 'Best European';
-- UPDATE registrations SET award_category = 'Best in Show'         WHERE award_category = 'Best of Show';
-- UPDATE registrations SET award_category = NULL                   WHERE award_category = 'Best Custom';
