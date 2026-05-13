CREATE TABLE IF NOT EXISTS young_smart_farmer_ysf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  sequence_no INTEGER,
  title TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (trim(coalesce(title, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED,
  address_no TEXT,
  moo TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  line_id TEXT,
  email TEXT,
  facebook TEXT,
  education TEXT,
  education_major TEXT,
  production_area TEXT,
  agricultural_activity TEXT,
  production_standard TEXT,
  farmer_status TEXT,
  sales_channel TEXT,
  affiliated_district TEXT,
  farm_area_rai NUMERIC,
  annual_agri_income NUMERIC,
  main_activity_type TEXT,
  has_crop TEXT,
  has_livestock TEXT,
  has_fishery TEXT,
  has_processing TEXT,
  has_online_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE INDEX IF NOT EXISTS idx_young_smart_farmer_ysf_year ON young_smart_farmer_ysf (data_year);
CREATE INDEX IF NOT EXISTS idx_young_smart_farmer_ysf_district ON young_smart_farmer_ysf (district);
CREATE INDEX IF NOT EXISTS idx_young_smart_farmer_ysf_activity ON young_smart_farmer_ysf (agricultural_activity);

ALTER TABLE young_smart_farmer_ysf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow public read young smart farmer ysf"
  ON young_smart_farmer_ysf FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write young smart farmer ysf" ON young_smart_farmer_ysf;
DROP POLICY IF EXISTS "Allow authenticated full access" ON young_smart_farmer_ysf;
DROP POLICY IF EXISTS "Allow editor insert young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow editor insert young smart farmer ysf"
  ON young_smart_farmer_ysf FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow editor update young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow editor update young smart farmer ysf"
  ON young_smart_farmer_ysf FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow admin delete young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow admin delete young smart farmer ysf"
  ON young_smart_farmer_ysf FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
