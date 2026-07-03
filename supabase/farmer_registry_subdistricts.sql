-- =============================================================
-- Farmer registry progress by subdistrict
-- Stores DOAE farmer registry scrape results from district detail URLs.
-- farmer_registry_subdistricts keeps latest state; snapshots keeps history.
-- =============================================================

CREATE TABLE IF NOT EXISTS farmer_registry_subdistricts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  subdistrict TEXT NOT NULL,
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
  CONSTRAINT farmer_registry_subdistricts_uq
    UNIQUE (district, subdistrict, data_year)
);

CREATE INDEX IF NOT EXISTS farmer_registry_subdistricts_year_district_idx
  ON farmer_registry_subdistricts (data_year, district, subdistrict);

CREATE TABLE IF NOT EXISTS farmer_registry_subdistrict_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Bangkok')::DATE),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  district TEXT NOT NULL,
  subdistrict TEXT NOT NULL,
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
  CONSTRAINT farmer_registry_subdistrict_snapshots_uq
    UNIQUE (snapshot_date, district, subdistrict, data_year)
);

CREATE INDEX IF NOT EXISTS farmer_registry_subdistrict_snapshots_year_date_idx
  ON farmer_registry_subdistrict_snapshots (data_year, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS farmer_registry_subdistrict_snapshots_district_idx
  ON farmer_registry_subdistrict_snapshots (district, subdistrict);

ALTER TABLE farmer_registry_subdistricts ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_registry_subdistrict_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read farmer registry subdistricts" ON farmer_registry_subdistricts;
CREATE POLICY "Allow public read farmer registry subdistricts"
  ON farmer_registry_subdistricts
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public read farmer registry subdistrict snapshots" ON farmer_registry_subdistrict_snapshots;
CREATE POLICY "Allow public read farmer registry subdistrict snapshots"
  ON farmer_registry_subdistrict_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);
