ALTER TABLE public.disasters
  DROP CONSTRAINT IF EXISTS uniq_disasters_village_level;

DROP INDEX IF EXISTS disasters_flood_source_key;

CREATE UNIQUE INDEX disasters_flood_source_key
  ON public.disasters (source_row_id);;
