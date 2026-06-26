-- GEOPLOTS parcel drawing progress, latest state per Nakhon Pathom district.

CREATE TABLE IF NOT EXISTS geoplots_parcel_progress (
  district_code TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS geoplots_parcel_progress_percent_idx
  ON geoplots_parcel_progress (progress_percent);

ALTER TABLE geoplots_parcel_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read geoplots parcel progress" ON geoplots_parcel_progress;
CREATE POLICY "Allow public read geoplots parcel progress"
  ON geoplots_parcel_progress
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read geoplots parcel progress" ON geoplots_parcel_progress;
CREATE POLICY "Allow authenticated read geoplots parcel progress"
  ON geoplots_parcel_progress
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON geoplots_parcel_progress TO anon, authenticated;
