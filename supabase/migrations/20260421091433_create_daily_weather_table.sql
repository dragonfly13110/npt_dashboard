CREATE TABLE daily_weather (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    tavg NUMERIC,
    tmin NUMERIC,
    tmax NUMERIC,
    prcp NUMERIC,
    wspd NUMERIC,
    pres NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE daily_weather ENABLE ROW LEVEL SECURITY;

-- Allow anon to selectively view/insert depending on context. Let's make it fully readable to authenticated and public context depending on setup.
-- We currently allow anon select for UI. We'll momentarily allow anon insert for the script, then disable it (like last time).
CREATE POLICY "Enable read access for all users" ON daily_weather FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON daily_weather FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON daily_weather FOR UPDATE USING (true);
;
