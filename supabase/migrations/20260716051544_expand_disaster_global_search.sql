DO $migration$
DECLARE
  definition TEXT;
  old_config TEXT := $config$('disasters'::text, ARRAY['disaster_type','district','subdistrict']::text[], ARRAY['id','disaster_type','district','subdistrict','affected_area_rai','affected_households','year','created_at','updated_at']::text[]),$config$;
  new_config TEXT := $config$('disasters'::text, ARRAY['disaster_type','district','subdistrict','activity_group','crop_type','variety','year']::text[], ARRAY['id','disaster_type','district','subdistrict','village_no','activity_group','crop_type','variety','planted_area_rai','affected_area_rai','affected_households','year','created_at','updated_at']::text[]),$config$;
BEGIN
  SELECT pg_get_functiondef('public.global_search_public(text[],text[],integer)'::regprocedure)
  INTO definition;

  definition := replace(definition, old_config, new_config);
  IF position(new_config IN definition) = 0 THEN
    RAISE EXCEPTION 'global_search_public disaster configuration not found';
  END IF;

  EXECUTE definition;
END;
$migration$;;
