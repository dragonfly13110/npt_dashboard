-- สร้างตาราง แปลงพยากรณ์ (Forecast Plots)
CREATE TABLE IF NOT EXISTS forecast_plots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    row_number integer,
    province text DEFAULT 'นครปฐม',
    district text,
    subdistrict text,
    village_no integer,
    owner_name text,
    zone text,
    coord_x numeric,
    coord_y numeric,
    crop_type text,
    variety text,
    planted_area_rai numeric,
    planting_date text,
    plot_type text,
    crop_status text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forecast_plots ENABLE ROW LEVEL SECURITY;

-- Allow read for anon and authenticated
DROP POLICY IF EXISTS "Allow authenticated read" ON forecast_plots;
DROP POLICY IF EXISTS "Allow public read forecast plots" ON forecast_plots;
CREATE POLICY "Allow public read forecast plots" ON forecast_plots
    FOR SELECT TO anon, authenticated USING (true);

-- Allow authenticated insert
CREATE POLICY "Allow authenticated insert" ON forecast_plots
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated update
CREATE POLICY "Allow authenticated update" ON forecast_plots
    FOR UPDATE TO authenticated USING (true);

-- Allow authenticated delete
CREATE POLICY "Allow authenticated delete" ON forecast_plots
    FOR DELETE TO authenticated USING (true);
