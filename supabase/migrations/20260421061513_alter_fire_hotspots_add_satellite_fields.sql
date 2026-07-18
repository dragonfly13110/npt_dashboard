
-- Add satellite data columns to fire_hotspots table
ALTER TABLE public.fire_hotspots
  ADD COLUMN IF NOT EXISTS acq_date date,
  ADD COLUMN IF NOT EXISTS acq_time text,
  ADD COLUMN IF NOT EXISTS satellite text,
  ADD COLUMN IF NOT EXISTS instrument text,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS bright_ti4 numeric,
  ADD COLUMN IF NOT EXISTS bright_ti5 numeric,
  ADD COLUMN IF NOT EXISTS frp numeric,
  ADD COLUMN IF NOT EXISTS daynight text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'FIRMS',
  ADD COLUMN IF NOT EXISTS subdistrict text,
  ADD COLUMN IF NOT EXISTS land_use text,
  ADD COLUMN IF NOT EXISTS village text;

-- Make spot_name nullable (auto-generated for satellite data)
ALTER TABLE public.fire_hotspots ALTER COLUMN spot_name DROP NOT NULL;

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_fire_hotspots_unique_point
  ON public.fire_hotspots (latitude, longitude, acq_date, acq_time);

-- Create index on acq_date for fast date range queries
CREATE INDEX IF NOT EXISTS idx_fire_hotspots_acq_date
  ON public.fire_hotspots (acq_date);

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS idx_fire_hotspots_source
  ON public.fire_hotspots (source);
;
