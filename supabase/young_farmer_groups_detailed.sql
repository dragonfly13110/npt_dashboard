CREATE TABLE IF NOT EXISTS young_farmer_groups_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  address_no TEXT,
  moo TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  mobile TEXT,
  established_date DATE,
  established_year_be INTEGER,
  established_year_ce INTEGER,
  member_count INTEGER,
  model_group TEXT,
  fund_management NUMERIC,
  income NUMERIC,
  activity TEXT,
  activity_count INTEGER,
  potential_level TEXT,
  lat NUMERIC,
  lon NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE INDEX IF NOT EXISTS idx_yfg_detailed_year ON young_farmer_groups_detailed (data_year);
CREATE INDEX IF NOT EXISTS idx_yfg_detailed_district ON young_farmer_groups_detailed (district);
CREATE INDEX IF NOT EXISTS idx_yfg_detailed_potential ON young_farmer_groups_detailed (potential_level);

ALTER TABLE young_farmer_groups_detailed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow public read young farmer groups detailed"
  ON young_farmer_groups_detailed FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write young farmer groups detailed" ON young_farmer_groups_detailed;
DROP POLICY IF EXISTS "Allow authenticated full access" ON young_farmer_groups_detailed;
DROP POLICY IF EXISTS "Allow editor insert young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow editor insert young farmer groups detailed"
  ON young_farmer_groups_detailed FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow editor update young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow editor update young farmer groups detailed"
  ON young_farmer_groups_detailed FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow admin delete young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow admin delete young farmer groups detailed"
  ON young_farmer_groups_detailed FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
