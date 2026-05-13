CREATE TABLE IF NOT EXISTS agricultural_career_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  address_no TEXT,
  moo TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  mobile TEXT,
  established_date TEXT,
  established_date_ce DATE,
  established_year_be INTEGER,
  member_count INTEGER,
  community_enterprise_registration TEXT,
  fund_management NUMERIC,
  income NUMERIC,
  activity TEXT,
  main_activity TEXT,
  production_standard TEXT,
  potential_level TEXT,
  lat NUMERIC,
  lon NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE INDEX IF NOT EXISTS idx_agricultural_career_groups_year ON agricultural_career_groups (data_year);
CREATE INDEX IF NOT EXISTS idx_agricultural_career_groups_district ON agricultural_career_groups (district);
CREATE INDEX IF NOT EXISTS idx_agricultural_career_groups_potential ON agricultural_career_groups (potential_level);

ALTER TABLE agricultural_career_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow public read agricultural career groups"
  ON agricultural_career_groups FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write agricultural career groups" ON agricultural_career_groups;
DROP POLICY IF EXISTS "Allow authenticated full access" ON agricultural_career_groups;
DROP POLICY IF EXISTS "Allow editor insert agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow editor insert agricultural career groups"
  ON agricultural_career_groups FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow editor update agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow editor update agricultural career groups"
  ON agricultural_career_groups FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow admin delete agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow admin delete agricultural career groups"
  ON agricultural_career_groups FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
