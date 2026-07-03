-- GEOPLOTS parcel drawing progress, latest state per Nakhon Pathom subdistrict.

CREATE TABLE IF NOT EXISTS geoplots_parcel_subdistrict_progress (
  subdistrict_code TEXT PRIMARY KEY,
  subdistrict TEXT NOT NULL,
  district_code TEXT NOT NULL,
  district TEXT NOT NULL,
  province_code TEXT NOT NULL DEFAULT '73',
  province TEXT NOT NULL DEFAULT 'นครปฐม',
  target_plots INTEGER NOT NULL DEFAULT 0,
  drawn_plots INTEGER NOT NULL DEFAULT 0,
  remaining_target_plots INTEGER NOT NULL DEFAULT 0,
  remaining_list_68 INTEGER NOT NULL DEFAULT 0,
  remaining_list_67 INTEGER NOT NULL DEFAULT 0,
  geoplots_68 INTEGER NOT NULL DEFAULT 0,
  geoplots_67 INTEGER NOT NULL DEFAULT 0,
  qgis_68 INTEGER NOT NULL DEFAULT 0,
  qgis_67 INTEGER NOT NULL DEFAULT 0,
  doae_plots INTEGER NOT NULL DEFAULT 0,
  progress_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_chart_plots INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'geoplots.doae.go.th',
  snapshot_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Asia/Bangkok')::DATE),
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geoplots_parcel_subdistrict_progress_district_idx
  ON geoplots_parcel_subdistrict_progress (district_code, subdistrict);

ALTER TABLE geoplots_parcel_subdistrict_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read geoplots parcel subdistrict progress"
  ON geoplots_parcel_subdistrict_progress;
CREATE POLICY "Allow public read geoplots parcel subdistrict progress"
  ON geoplots_parcel_subdistrict_progress
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON geoplots_parcel_subdistrict_progress TO anon, authenticated;
