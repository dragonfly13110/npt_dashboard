-- Workbook: ข้อมูลอุทกภัยจังหวัดนครปฐม ปี 2563–2568
ALTER TABLE public.disasters
  ADD COLUMN IF NOT EXISTS source_row_id INTEGER,
  ADD COLUMN IF NOT EXISTS village_no TEXT,
  ADD COLUMN IF NOT EXISTS utm_zone INTEGER,
  ADD COLUMN IF NOT EXISTS utm_x NUMERIC,
  ADD COLUMN IF NOT EXISTS utm_y NUMERIC,
  ADD COLUMN IF NOT EXISTS activity_group TEXT,
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS variety TEXT,
  ADD COLUMN IF NOT EXISTS planted_area_rai NUMERIC,
  ADD COLUMN IF NOT EXISTS affected_area_rai NUMERIC,
  ADD COLUMN IF NOT EXISTS affected_households INTEGER;

DROP INDEX IF EXISTS disasters_flood_source_key;
ALTER TABLE public.disasters
  DROP CONSTRAINT IF EXISTS uniq_disasters_village_level;

CREATE UNIQUE INDEX disasters_flood_source_key
  ON public.disasters (source_row_id);
