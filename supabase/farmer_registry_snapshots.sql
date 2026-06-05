-- =============================================================
-- Farmer registry progress snapshots
-- Stores DOAE farmer registry scrape results every scheduled run.
-- Current farmer_registry remains the latest state; this table keeps history.
-- =============================================================

CREATE TABLE IF NOT EXISTS farmer_registry_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Bangkok')::DATE),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  district TEXT NOT NULL,
  household_count INTEGER,
  target INTEGER,
  update_tbk_households INTEGER,
  update_tbk_plots INTEGER,
  update_tbk_area_rai NUMERIC,
  update_farmbook_households INTEGER,
  update_farmbook_plots INTEGER,
  update_farmbook_area_rai NUMERIC,
  update_eform_households INTEGER,
  update_eform_plots INTEGER,
  update_eform_area_rai NUMERIC,
  total_updated_households INTEGER,
  total_updated_plots INTEGER,
  total_updated_area_rai NUMERIC,
  cancelled_households INTEGER,
  net_total_households INTEGER,
  farm_area_rai NUMERIC,
  data_year INTEGER,
  cutoff_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT farmer_registry_snapshots_date_district_year_uq
    UNIQUE (snapshot_date, district, data_year)
);

CREATE INDEX IF NOT EXISTS farmer_registry_snapshots_year_date_idx
  ON farmer_registry_snapshots (data_year, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS farmer_registry_snapshots_district_idx
  ON farmer_registry_snapshots (district);

ALTER TABLE farmer_registry_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read farmer registry snapshots" ON farmer_registry_snapshots;
CREATE POLICY "Allow authenticated read farmer registry snapshots"
  ON farmer_registry_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read farmer registry snapshots" ON farmer_registry_snapshots;
CREATE POLICY "Allow public read farmer registry snapshots"
  ON farmer_registry_snapshots
  FOR SELECT
  TO anon
  USING (true);
