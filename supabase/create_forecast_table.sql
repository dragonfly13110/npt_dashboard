-- =============================================================
-- ระบบพยากรณ์และเตือนภัยโรค/แมลงศัตรูพืช
-- =============================================================

CREATE TABLE IF NOT EXISTS ai_disease_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_disease_forecasts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon and authenticated)
DROP POLICY IF EXISTS "Allow public read ai_disease_forecasts" ON ai_disease_forecasts;
CREATE POLICY "Allow public read ai_disease_forecasts"
ON ai_disease_forecasts FOR SELECT TO anon, authenticated USING (true);
