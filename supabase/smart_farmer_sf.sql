CREATE TABLE IF NOT EXISTS smart_farmer_sf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  sequence_no INTEGER,
  citizen_id TEXT,
  title TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (trim(coalesce(title, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED,
  age INTEGER,
  district TEXT,
  province TEXT,
  farmer_status TEXT,
  agricultural_activity TEXT,
  phone TEXT,
  education TEXT,
  production_standard TEXT,
  sales_channel TEXT,
  annual_agri_income NUMERIC,
  production_area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE INDEX IF NOT EXISTS idx_smart_farmer_sf_year ON smart_farmer_sf (data_year);
CREATE INDEX IF NOT EXISTS idx_smart_farmer_sf_district ON smart_farmer_sf (district);
CREATE INDEX IF NOT EXISTS idx_smart_farmer_sf_activity ON smart_farmer_sf (agricultural_activity);

ALTER TABLE smart_farmer_sf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow public read smart farmer sf"
  ON smart_farmer_sf FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated write smart farmer sf" ON smart_farmer_sf;
DROP POLICY IF EXISTS "Allow authenticated full access" ON smart_farmer_sf;
DROP POLICY IF EXISTS "Allow editor insert smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow editor insert smart farmer sf"
  ON smart_farmer_sf FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow editor update smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow editor update smart farmer sf"
  ON smart_farmer_sf FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));

DROP POLICY IF EXISTS "Allow admin delete smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow admin delete smart farmer sf"
  ON smart_farmer_sf FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
