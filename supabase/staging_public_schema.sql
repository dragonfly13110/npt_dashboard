


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."can_write_table"("target_table" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH me AS (
    SELECT role, department
    FROM public.profiles
    WHERE id = auth.uid()
  )
  SELECT COALESCE((
    SELECT
      role = 'admin'
      OR (
        role = 'district_editor'
        AND target_table = ANY (ARRAY['personnel', 'budgets'])
      )
      OR (
        role = 'editor'
        AND (
          (
            department = 'ฝ่ายบริหารทั่วไป'
            AND target_table = ANY (ARRAY['personnel', 'assets', 'budgets'])
          )
          OR (
            department = 'กลุ่มยุทธศาสตร์และสารสนเทศ'
            AND target_table = ANY (ARRAY[
              'farmer_registry',
              'farmer_registry_subdistricts',
              'farmer_registry_snapshots',
              'farmer_registry_subdistrict_snapshots',
              'agricultural_areas',
              'gis_areas',
              'learning_centers',
              'daily_weather',
              'geoplots_parcel_progress',
              'geoplots_parcel_subdistrict_progress'
            ])
          )
          OR (
            department = 'กลุ่มส่งเสริมและพัฒนาการผลิต'
            AND target_table = ANY (ARRAY[
              'large_plots',
              'certifications',
              'crop_production',
              'production_costs'
            ])
          )
          OR (
            department = 'กลุ่มส่งเสริมและพัฒนาเกษตรกร'
            AND target_table = ANY (ARRAY[
              'community_enterprises',
              'smart_farmers',
              'smart_farmer_sf',
              'young_smart_farmer_ysf',
              'agricultural_career_groups',
              'farmer_groups',
              'housewife_farmer_groups',
              'young_farmer_groups',
              'young_farmer_groups_detailed',
              'agri_tourism',
              'disasters'
            ])
          )
          OR (
            department = 'กลุ่มอารักขาพืช'
            AND target_table = ANY (ARRAY[
              'forecast_plots',
              'pest_outbreaks',
              'pest_centers',
              'plant_doctors',
              'soil_fertilizer_centers',
              'soil_series',
              'biocontrol_stock',
              'fire_hotspots',
              'ai_disease_forecasts'
            ])
          )
        )
      )
    FROM me
  ), false);
$$;


ALTER FUNCTION "public"."can_write_table"("target_table" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_api_rate_limit"("p_rate_key" "text", "p_limit" integer, "p_window_seconds" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  current_row private.api_rate_limits%rowtype;
  v_now timestamptz := clock_timestamp();
  retry_after integer;
begin
  if p_rate_key is null or btrim(p_rate_key) = '' then
    raise exception 'rate key is required';
  end if;
  if p_limit is null or p_limit <= 0 then
    raise exception 'limit must be positive';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'window seconds must be positive';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_rate_key));

  select *
  into current_row
  from private.api_rate_limits
  where rate_key = p_rate_key;

  if not found then
    insert into private.api_rate_limits (
      rate_key,
      window_started_at,
      request_count,
      updated_at
    )
    values (p_rate_key, v_now, 1, v_now)
    returning * into current_row;
  elsif current_row.window_started_at
    + pg_catalog.make_interval(secs => p_window_seconds) <= v_now then
    update private.api_rate_limits
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where rate_key = p_rate_key
    returning * into current_row;
  elsif current_row.request_count < p_limit then
    update private.api_rate_limits
    set request_count = request_count + 1,
        updated_at = v_now
    where rate_key = p_rate_key
    returning * into current_row;
  else
    retry_after := greatest(
      1,
      ceil(
        extract(
          epoch from (
            current_row.window_started_at
            + pg_catalog.make_interval(secs => p_window_seconds)
            - v_now
          )
        )
      )::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds', retry_after
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(0, p_limit - current_row.request_count),
    'retry_after_seconds', 0
  );
end;
$$;


ALTER FUNCTION "public"."claim_api_rate_limit"("p_rate_key" "text", "p_limit" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_line_ai_quota"("p_user_id" "text", "p_kind" "text", "p_daily_limit" integer, "p_window_limit" integer, "p_window_seconds" integer, "p_key_slot" smallint DEFAULT NULL::smallint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  day_start timestamptz :=
    date_trunc('day', now() at time zone 'Asia/Bangkok')
      at time zone 'Asia/Bangkok';
  daily_count integer;
  window_count integer := 0;
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'invalid user id';
  end if;

  if p_kind is null or p_kind not in ('ai', 'grounding') then
    raise exception 'invalid usage kind';
  end if;

  if p_daily_limit is null or p_daily_limit <= 0 then
    raise exception 'invalid daily limit';
  end if;

  if p_window_limit is null or p_window_limit < 0 then
    raise exception 'invalid window limit';
  end if;

  if p_window_limit > 0
    and (p_window_seconds is null or p_window_seconds <= 0) then
    raise exception 'invalid window seconds';
  end if;

  if p_key_slot is not null and p_key_slot not between 1 and 5 then
    raise exception 'invalid key slot';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id || ':' || p_kind));

  select count(*)
  into daily_count
  from public.line_ai_usage
  where line_user_id = p_user_id
    and usage_type = p_kind
    and created_at >= day_start;

  if p_window_limit > 0 then
    select count(*)
    into window_count
    from public.line_ai_usage
    where line_user_id = p_user_id
      and usage_type = p_kind
      and created_at >= now() - make_interval(secs => p_window_seconds);
  end if;

  if daily_count >= p_daily_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'daily',
      'used', daily_count
    );
  end if;

  if p_window_limit > 0 and window_count >= p_window_limit then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'window',
      'used', window_count
    );
  end if;

  insert into public.line_ai_usage (line_user_id, usage_type, key_slot)
  values (p_user_id, p_kind, p_key_slot);

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'used', daily_count + 1
  );
end;
$$;


ALTER FUNCTION "public"."claim_line_ai_quota"("p_user_id" "text", "p_kind" "text", "p_daily_limit" integer, "p_window_limit" integer, "p_window_seconds" integer, "p_key_slot" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_line_link_code"("p_code_hash" "text", "p_line_user_id" "text") RETURNS TABLE("profile_id" "uuid", "role" "text", "department" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_code_id UUID;
  v_profile_id UUID;
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$'
    OR p_line_user_id IS NULL OR btrim(p_line_user_id) = '' THEN
    RETURN;
  END IF;

  SELECT c.id, c.profile_id
  INTO v_code_id, v_profile_id
  FROM public.line_link_codes AS c
  WHERE c.code_hash = p_code_hash
    AND c.used_at IS NULL
    AND c.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.line_link_codes
  SET used_at = now()
  WHERE id = v_code_id;

  DELETE FROM public.line_account_links
  WHERE profile_id = v_profile_id OR line_user_id = p_line_user_id;

  INSERT INTO public.line_account_links (line_user_id, profile_id)
  VALUES (p_line_user_id, v_profile_id);

  RETURN QUERY
  SELECT p.id, COALESCE(p.role, 'viewer'), p.department
  FROM public.profiles AS p
  WHERE p.id = v_profile_id;
END;
$_$;


ALTER FUNCTION "public"."consume_line_link_code"("p_code_hash" "text", "p_line_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_profile_department"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT (SELECT department FROM public.profiles WHERE id = auth.uid());
$$;


ALTER FUNCTION "public"."current_profile_department"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_profile_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'guest');
$$;


ALTER FUNCTION "public"."current_profile_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_custom_field_definition_as_service"("p_definition_id" "uuid") RETURNS TABLE("deleted_table_name" "text", "deleted_field_key" "text", "affected_rows" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  definition RECORD;
  rows_changed INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete custom fields';
  END IF;

  SELECT *
    INTO definition
    FROM public.custom_field_definitions
   WHERE id = p_definition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'custom field definition not found';
  END IF;

  IF definition.promoted_at IS NOT NULL THEN
    RAISE EXCEPTION 'promoted custom fields cannot be deleted by this operation';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET custom_fields = custom_fields - $1 WHERE custom_fields ? $1',
    definition.table_name
  )
  USING definition.field_key;

  GET DIAGNOSTICS rows_changed = ROW_COUNT;

  DELETE FROM public.custom_field_definitions
   WHERE id = p_definition_id;

  deleted_table_name := definition.table_name;
  deleted_field_key := definition.field_key;
  affected_rows := rows_changed;
  RETURN NEXT;
END;
$_$;


ALTER FUNCTION "public"."delete_custom_field_definition_as_service"("p_definition_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_custom_field_definition_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.field_type <> NEW.field_type AND OLD.archived_at IS NULL THEN
    RAISE EXCEPTION 'field_type cannot be changed after creation';
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL) THEN
    SELECT COUNT(*) INTO active_count
    FROM public.custom_field_definitions
    WHERE table_name = NEW.table_name
      AND archived_at IS NULL
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF active_count >= 30 THEN
      RAISE EXCEPTION 'custom field limit reached for table %', NEW.table_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_custom_field_definition_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_sql_query"("query" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result json;
BEGIN
  EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO result;
  RETURN COALESCE(result, '[]'::json);
END;
$$;


ALTER FUNCTION "public"."execute_sql_query"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."global_search"("search_term" "text", "result_limit" integer DEFAULT 3) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT public.global_search_public(
    ARRAY[search_term],
    ARRAY[
      'farmer_registry','agricultural_areas','gis_areas','learning_centers','daily_weather',
      'large_plots','certifications','crop_production','production_costs','community_enterprises',
      'smart_farmers','smart_farmer_sf','young_smart_farmer_ysf',
      'agricultural_career_groups','farmer_groups','housewife_farmer_groups',
      'young_farmer_groups','young_farmer_groups_detailed','farmer_institutes','agri_tourism',
      'disasters','forecast_plots','ai_disease_forecasts','pest_outbreaks','pest_centers',
      'plant_doctors','soil_fertilizer_centers','soil_series','biocontrol_stock','fire_hotspots','assets','budgets',
      'personnel','geoplots_parcel_progress','geoplots_parcel_subdistrict_progress'
    ],
    result_limit
  );
$$;


ALTER FUNCTION "public"."global_search"("search_term" "text", "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."global_search_public"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer DEFAULT 3) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  result JSONB := '[]'::jsonb;
  cfg RECORD;
  existing_search_cols TEXT[];
  existing_return_cols TEXT[];
  where_sql TEXT;
  select_sql TEXT;
  table_results JSONB;
  table_count INTEGER;
  cleaned_terms TEXT[];
  safe_limit INTEGER := GREATEST(COALESCE(result_limit, 3), 1);
BEGIN
  SELECT array_agg(term)
  INTO cleaned_terms
  FROM (
    SELECT DISTINCT trim(raw_term) AS term
    FROM unnest(COALESCE(search_terms, ARRAY[]::text[])) AS raw_term
    WHERE length(trim(raw_term)) >= 2
    LIMIT 5
  ) clean;

  IF table_names IS NULL
    OR array_length(table_names, 1) IS NULL
  THEN
    RETURN result;
  END IF;

  FOR cfg IN
    SELECT *
    FROM (
      VALUES
        ('farmer_registry'::text, ARRAY['district','main_crop']::text[], ARRAY['id','district','main_crop','household_count','total_updated_households','target','farm_area_rai','data_year','created_at','updated_at']::text[]),
        ('agricultural_areas'::text, ARRAY['area_name','area_type','district','subdistrict']::text[], ARRAY['id','area_name','area_type','district','subdistrict','total_area_rai','agri_crop_area_rai','farmer_households','created_at','updated_at']::text[]),
        ('gis_areas'::text, ARRAY['area_name','district','area_type','notes']::text[], ARRAY['id','area_name','district','area_type','area_rai','notes','created_at','updated_at']::text[]),
        ('learning_centers'::text, ARRAY['center_name','district','main_crop']::text[], ARRAY['id','center_name','district','main_crop','area_rai','created_at','updated_at']::text[]),
        ('daily_weather'::text, ARRAY['date']::text[], ARRAY['id','date','tavg','tmin','tmax','prcp','wspd','pres','created_at','updated_at']::text[]),
        ('large_plots'::text, ARRAY['plot_name','commodity','secondary_commodity','district','subdistrict','agency']::text[], ARRAY['id','plot_name','commodity','secondary_commodity','district','subdistrict','member_count','area_rai','year','agency','created_at','updated_at']::text[]),
        ('certifications'::text, ARRAY['farm_name','cert_type','commodity','district','status']::text[], ARRAY['id','farm_name','cert_type','commodity','district','status','certified_area_rai','created_at','updated_at']::text[]),
        ('crop_production'::text, ARRAY['crop_name','district','harvest_period']::text[], ARRAY['id','crop_name','district','planted_area','production_ton','harvest_period','year','created_at','updated_at']::text[]),
        ('production_costs'::text, ARRAY['crop_name']::text[], ARRAY['id','data_year','crop_name','yield_kg_per_rai','revenue_baht_per_rai','total_cost_baht','created_at','updated_at']::text[]),
        ('community_enterprises'::text, ARRAY['enterprise_name','enterprise_type','product_type','district','subdistrict','level']::text[], ARRAY['id','enterprise_name','enterprise_type','product_type','district','subdistrict','member_count','level','created_at','updated_at']::text[]),
        ('smart_farmers'::text, ARRAY['farmer_type','district','main_product']::text[], ARRAY['id','farmer_type','district','main_product','created_at','updated_at']::text[]),
        ('smart_farmer_sf'::text, ARRAY['record_code','district','province','farmer_status','agricultural_activity','production_standard']::text[], ARRAY['id','record_code','district','province','farmer_status','agricultural_activity','production_standard','data_year','created_at','updated_at']::text[]),
        ('young_smart_farmer_ysf'::text, ARRAY['record_code','district','province','farmer_status','agricultural_activity','production_standard']::text[], ARRAY['id','record_code','district','province','farmer_status','agricultural_activity','production_standard','data_year','created_at','updated_at']::text[]),
        ('agricultural_career_groups'::text, ARRAY['record_code','group_name','district','subdistrict','activity','main_activity','production_standard','potential_level','community_enterprise_registration']::text[], ARRAY['id','record_code','group_name','district','subdistrict','activity','main_activity','member_count','production_standard','potential_level','community_enterprise_registration','data_year','created_at','updated_at']::text[]),
        ('farmer_groups'::text, ARRAY['group_name','group_type','district','notes']::text[], ARRAY['id','group_name','group_type','district','member_count','notes','created_at','updated_at']::text[]),
        ('housewife_farmer_groups'::text, ARRAY['group_name','district','subdistrict','activity','production_standard','potential_level','community_enterprise_registration']::text[], ARRAY['id','group_name','district','subdistrict','activity','member_count','production_standard','potential_level','community_enterprise_registration','year','created_at','updated_at']::text[]),
        ('young_farmer_groups'::text, ARRAY['group_name','district','notes']::text[], ARRAY['id','group_name','district','member_count','notes','created_at','updated_at']::text[]),
        ('young_farmer_groups_detailed'::text, ARRAY['record_code','group_name','district','subdistrict','activity','potential_level']::text[], ARRAY['id','record_code','group_name','district','subdistrict','activity','member_count','potential_level','data_year','created_at','updated_at']::text[]),
        ('farmer_institutes'::text, ARRAY['name','group_name','district','subdistrict','type']::text[], ARRAY['id','name','group_name','district','subdistrict','type','member_count','created_at','updated_at']::text[]),
        ('agri_tourism'::text, ARRAY['spot_name','spot_type','district','description']::text[], ARRAY['id','spot_name','spot_type','district','description','created_at','updated_at']::text[]),
        ('disasters'::text, ARRAY['disaster_type','district','subdistrict','activity_group','crop_type','variety','year']::text[], ARRAY['id','disaster_type','district','subdistrict','village_no','activity_group','crop_type','variety','planted_area_rai','affected_area_rai','affected_households','year','created_at','updated_at']::text[]),
        ('forecast_plots'::text, ARRAY['plot_name','crop_type','variety','district','subdistrict']::text[], ARRAY['id','plot_name','crop_type','variety','district','subdistrict','created_at','updated_at']::text[]),
        ('ai_disease_forecasts'::text, ARRAY['name','description','target_crop','risk_level']::text[], ARRAY['id','name','description','target_crop','risk_level','forecast_date','created_at','updated_at']::text[]),
        ('pest_outbreaks'::text, ARRAY['pest_name','affected_crop','district','severity','report_date','notes']::text[], ARRAY['id','pest_name','affected_crop','district','outbreak_area','severity','report_date','notes','created_at','updated_at']::text[]),
        ('pest_centers'::text, ARRAY['center_name','district','subdistrict','main_crop_type']::text[], ARRAY['id','center_name','district','subdistrict','main_crop_type','member_count','created_at','updated_at']::text[]),
        ('plant_doctors'::text, ARRAY['district','subdistrict','province']::text[], ARRAY['id','district','subdistrict','province','created_at','updated_at']::text[]),
        ('soil_fertilizer_centers'::text, ARRAY['center_name','district','subdistrict','main_crop_type']::text[], ARRAY['id','center_name','district','subdistrict','main_crop_type','member_count','created_at','updated_at']::text[]),
        ('soil_series'::text, ARRAY['soil_series_name','soil_series_code','soil_group','texture','fertility','ph_top','district']::text[], ARRAY['id','soil_series_name','soil_series_code','soil_group','texture','fertility','ph_top','district','area_rai','created_at','updated_at']::text[]),
        ('biocontrol_stock'::text, ARRAY['product_name','source','period','status','notes']::text[], ARRAY['id','product_name','source','quantity_kg','period','status','notes','created_at','updated_at']::text[]),
        ('fire_hotspots'::text, ARRAY['spot_name','district','risk_level']::text[], ARRAY['id','spot_name','district','risk_level','year','created_at','updated_at']::text[]),
        ('assets'::text, ARRAY['name','category','serial_number','location','condition','notes']::text[], ARRAY['id','name','category','serial_number','location','condition','value','notes','created_at','updated_at']::text[]),
        ('budgets'::text, ARRAY['project_name','budget_source','status']::text[], ARRAY['id','project_name','budget_source','budget_amount','spent_amount','status','fiscal_year','budget_round','created_at','updated_at']::text[]),
        ('personnel'::text, ARRAY['position','department','district','office_type']::text[], ARRAY['id','position','department','district','office_type','created_at','updated_at']::text[]),
        ('geoplots_parcel_progress'::text, ARRAY['district']::text[], ARRAY['district_code','district','target_plots','drawn_plots','remaining_target_plots','progress_percent','snapshot_date','created_at','updated_at']::text[]),
        ('geoplots_parcel_subdistrict_progress'::text, ARRAY['subdistrict','district']::text[], ARRAY['subdistrict_code','subdistrict','district_code','district','target_plots','drawn_plots','remaining_target_plots','progress_percent','snapshot_date','created_at','updated_at']::text[])
    ) AS t(table_name, search_cols, return_cols)
    WHERE table_name = ANY(table_names)
  LOOP
    IF to_regclass('public.' || cfg.table_name) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT array_agg(c)
    INTO existing_search_cols
    FROM unnest(cfg.search_cols) AS c
    WHERE EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = cfg.table_name
        AND column_name = c
    );

    SELECT array_agg(c)
    INTO existing_return_cols
    FROM unnest(cfg.return_cols) AS c
    WHERE EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = cfg.table_name
        AND column_name = c
    );

    IF existing_search_cols IS NULL
      OR existing_return_cols IS NULL
      OR array_length(existing_search_cols, 1) IS NULL
      OR array_length(existing_return_cols, 1) IS NULL
    THEN
      CONTINUE;
    END IF;

    IF cleaned_terms IS NOT NULL AND array_length(cleaned_terms, 1) > 0 THEN
      SELECT string_agg(
        format('coalesce(%I::text, '''') ILIKE ''%%'' || term_value || ''%%''', c),
        ' OR '
      )
      INTO where_sql
      FROM unnest(existing_search_cols) AS c;

      where_sql := format('NOT EXISTS (SELECT 1 FROM unnest($1::text[]) AS search_term(term_value) WHERE NOT (%s))', where_sql);
    ELSE
      where_sql := 'TRUE';
    END IF;

    -- Exclude offices from personnel unless 'เธชเธณเธเธฑเธเธเธฒเธ' is explicitly in cleaned_terms
    IF cfg.table_name = 'personnel' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(cleaned_terms, ARRAY[]::text[])) AS term
        WHERE term ILIKE '%เธชเธณเธเธฑเธเธเธฒเธ%'
      ) THEN
        where_sql := format('(%s) AND position IS DISTINCT FROM ''เธชเธณเธเธฑเธเธเธฒเธ''', where_sql);
      END IF;
    END IF;

    SELECT string_agg(format('%I', c), ', ')
    INTO select_sql
    FROM unnest(existing_return_cols) AS c;

    -- Dynamically filter by latest year if data_year, year, or fiscal_year column exists
    DECLARE
      year_col TEXT := NULL;
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = cfg.table_name
          AND column_name = 'data_year'
      ) THEN
        year_col := 'data_year';
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = cfg.table_name
          AND column_name = 'year'
      ) THEN
        year_col := 'year';
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = cfg.table_name
          AND column_name = 'fiscal_year'
      ) THEN
        year_col := 'fiscal_year';
      END IF;

      IF year_col IS NOT NULL AND cfg.table_name = ANY(ARRAY['farmer_registry', 'crop_production', 'fire_hotspots']) THEN
        where_sql := format('(%s) AND %I = (SELECT COALESCE(max(%I), 0) FROM public.%I)', where_sql, year_col, year_col, cfg.table_name);
      END IF;
    END;

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(to_jsonb(s) - ''__total_count''), ''[]''::jsonb),
              COALESCE(max(s.__total_count), 0)
       FROM (
         SELECT %s,
                COALESCE(ranked_match.score, 0) AS score,
                ranked_match.match_column,
                ranked_match.match_value,
                ranked_match.match_type,
                count(*) OVER() AS __total_count
         FROM public.%I AS src
         LEFT JOIN LATERAL (
           SELECT
             m.key AS match_column,
             m.value AS match_value,
             CASE
               WHEN lower(m.value) = lower(search_term.term_value) THEN ''exact''
               WHEN lower(m.value) LIKE lower(search_term.term_value) || ''%%'' THEN ''prefix''
               WHEN lower(m.value) LIKE ''%%'' || lower(search_term.term_value) || ''%%'' THEN ''substring''
               ELSE ''trigram''
             END AS match_type,
             CASE
               WHEN lower(m.value) = lower(search_term.term_value) THEN 100
               WHEN lower(m.value) LIKE lower(search_term.term_value) || ''%%'' THEN 80
               WHEN lower(m.value) LIKE ''%%'' || lower(search_term.term_value) || ''%%'' THEN 60
               ELSE round((similarity(m.value, search_term.term_value) * 40)::numeric, 2)
             END AS score
           FROM jsonb_each_text(to_jsonb(src)) AS m(key, value)
           CROSS JOIN unnest($1::text[]) AS search_term(term_value)
           WHERE m.key = ANY($3::text[])
             AND (
               m.value ILIKE ''%%'' || search_term.term_value || ''%%''
               OR similarity(m.value, search_term.term_value) > 0.2
             )
           ORDER BY score DESC
           LIMIT 1
         ) ranked_match ON TRUE
         WHERE %s
         ORDER BY COALESCE(ranked_match.score, 0) DESC
         LIMIT $2
       ) s',
      select_sql,
      cfg.table_name,
      where_sql
    )
    INTO table_results, table_count
    USING cleaned_terms, safe_limit, existing_search_cols;

    IF table_count > 0 THEN
      result := result || jsonb_build_array(
        jsonb_build_object(
          'table', cfg.table_name,
          'totalCount', table_count,
          'results', table_results
        )
      );
    END IF;
  END LOOP;

  RETURN result;
END;
$_$;


ALTER FUNCTION "public"."global_search_public"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."global_search_staff"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer DEFAULT 3) RETURNS "jsonb"
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
  SELECT public.global_search_public(search_terms, table_names, result_limit);
$$;


ALTER FUNCTION "public"."global_search_staff"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_site_visit"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_visits INTEGER;
BEGIN
    UPDATE public.site_statistics
    SET value = value + 1, updated_at = timezone('utc'::text, now())
    WHERE key = 'total_visits'
    RETURNING value INTO current_visits;

    RETURN current_visits;
END;
$$;


ALTER FUNCTION "public"."increment_site_visit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.current_profile_role() = 'admin';
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_editor"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.current_profile_role() IN ('admin', 'editor');
$$;


ALTER FUNCTION "public"."is_editor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_viewer"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.current_profile_role() IN ('admin', 'editor', 'viewer');
$$;


ALTER FUNCTION "public"."is_viewer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_province_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
        DECLARE
            target_year INTEGER;
            max_cutoff DATE;
            current_province_target INTEGER;
        BEGIN
            -- Determine target year based on the operation
            IF TG_OP = 'DELETE' THEN
                target_year := OLD.data_year;
            ELSE
                target_year := NEW.data_year;
            END IF;

            -- Prevent infinite recursion: If the modified row is the province row, do nothing
            IF TG_OP != 'DELETE' AND NEW.district = 'จังหวัดนครปฐม' THEN
                RETURN NEW;
            END IF;
            IF TG_OP = 'DELETE' AND OLD.district = 'จังหวัดนครปฐม' THEN
                RETURN OLD;
            END IF;

            -- Get current province target to preserve it if districts have no targets
            SELECT target INTO current_province_target
            FROM farmer_registry
            WHERE data_year = target_year AND district = 'จังหวัดนครปฐม';

            -- Calculate the max cutoff date from districts
            SELECT MAX(cutoff_date) INTO max_cutoff
            FROM farmer_registry
            WHERE data_year = target_year AND district != 'จังหวัดนครปฐม';

            -- Upsert the province row
            INSERT INTO farmer_registry (
                district, data_year, cutoff_date,
                target, household_count, farm_area_rai,
                update_tbk_households, update_tbk_plots, update_tbk_area_rai,
                update_farmbook_households, update_farmbook_plots, update_farmbook_area_rai,
                update_eform_households, update_eform_plots, update_eform_area_rai,
                total_updated_households, total_updated_plots, total_updated_area_rai,
                cancelled_households, net_total_households,
                updated_at
            )
            SELECT
                'จังหวัดนครปฐม',
                target_year,
                max_cutoff,
                COALESCE(SUM(target), 0),
                COALESCE(SUM(household_count), 0),
                COALESCE(SUM(farm_area_rai), 0),
                COALESCE(SUM(update_tbk_households), 0),
                COALESCE(SUM(update_tbk_plots), 0),
                COALESCE(SUM(update_tbk_area_rai), 0),
                COALESCE(SUM(update_farmbook_households), 0),
                COALESCE(SUM(update_farmbook_plots), 0),
                COALESCE(SUM(update_farmbook_area_rai), 0),
                COALESCE(SUM(update_eform_households), 0),
                COALESCE(SUM(update_eform_plots), 0),
                COALESCE(SUM(update_eform_area_rai), 0),
                COALESCE(SUM(total_updated_households), 0),
                COALESCE(SUM(total_updated_plots), 0),
                COALESCE(SUM(total_updated_area_rai), 0),
                COALESCE(SUM(cancelled_households), 0),
                COALESCE(SUM(net_total_households), 0),
                NOW()
            FROM farmer_registry
            WHERE data_year = target_year AND district != 'จังหวัดนครปฐม'
            ON CONFLICT (district, data_year) DO UPDATE SET
                cutoff_date = EXCLUDED.cutoff_date,
                target = CASE WHEN EXCLUDED.target = 0 THEN COALESCE(current_province_target, 0) ELSE EXCLUDED.target END,
                household_count = EXCLUDED.household_count,
                farm_area_rai = EXCLUDED.farm_area_rai,
                update_tbk_households = EXCLUDED.update_tbk_households,
                update_tbk_plots = EXCLUDED.update_tbk_plots,
                update_tbk_area_rai = EXCLUDED.update_tbk_area_rai,
                update_farmbook_households = EXCLUDED.update_farmbook_households,
                update_farmbook_plots = EXCLUDED.update_farmbook_plots,
                update_farmbook_area_rai = EXCLUDED.update_farmbook_area_rai,
                update_eform_households = EXCLUDED.update_eform_households,
                update_eform_plots = EXCLUDED.update_eform_plots,
                update_eform_area_rai = EXCLUDED.update_eform_area_rai,
                total_updated_households = EXCLUDED.total_updated_households,
                total_updated_plots = EXCLUDED.total_updated_plots,
                total_updated_area_rai = EXCLUDED.total_updated_area_rai,
                cancelled_households = EXCLUDED.cancelled_households,
                net_total_households = EXCLUDED.net_total_households,
                updated_at = NOW();

            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$;


ALTER FUNCTION "public"."recalculate_province_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_custom_field_definition_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_custom_field_definition_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
        BEGIN
           NEW.updated_at = NOW();
           RETURN NEW;
        END;
        $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agri_tourism" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spot_name" "text" NOT NULL,
    "district" "text",
    "spot_type" "text",
    "contact_person" "text",
    "phone" "text",
    "latitude" numeric,
    "longitude" numeric,
    "description" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "subdistrict" "text",
    "registration_code" "text",
    "address" "text",
    "evaluation" "text"
);


ALTER TABLE "public"."agri_tourism" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agricultural_areas" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "district" "text",
    "villages_count" numeric,
    "subdistricts_count" numeric,
    "farmer_households" numeric,
    "total_area_rai" numeric,
    "agri_crop_area_rai" numeric,
    "rice_in_season_rai" numeric,
    "rice_off_season_rai" numeric,
    "field_crops_rai" numeric,
    "horticulture_rai" numeric,
    "fruit_trees_rai" numeric,
    "vegetables_rai" numeric,
    "flowers_rai" numeric,
    "herbs_spices_rai" numeric,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."agricultural_areas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."agricultural_areas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."agricultural_areas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."agricultural_areas_id_seq" OWNED BY "public"."agricultural_areas"."id";



CREATE TABLE IF NOT EXISTS "public"."agricultural_career_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_year" integer NOT NULL,
    "record_code" "text" NOT NULL,
    "group_name" "text" NOT NULL,
    "address_no" "text",
    "moo" "text",
    "subdistrict" "text",
    "district" "text",
    "province" "text",
    "mobile" "text",
    "established_date" "text",
    "established_date_ce" "date",
    "established_year_be" integer,
    "member_count" integer,
    "community_enterprise_registration" "text",
    "fund_management" numeric,
    "income" numeric,
    "activity" "text",
    "main_activity" "text",
    "production_standard" "text",
    "potential_level" "text",
    "lat" numeric,
    "lon" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."agricultural_career_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_disease_forecasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "forecast_date" "date" NOT NULL,
    "summary" "text" NOT NULL,
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_disease_forecasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "serial_number" "text",
    "location" "text",
    "condition" "text" DEFAULT 'ใช้งานได้'::"text",
    "value" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."biocontrol_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_name" "text" NOT NULL,
    "source" "text",
    "quantity_kg" numeric,
    "period" "text",
    "status" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."biocontrol_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_name" "text" NOT NULL,
    "fiscal_year" integer,
    "budget_source" "text",
    "budget_amount" numeric,
    "spent_amount" numeric DEFAULT 0,
    "status" "text" DEFAULT 'ดำเนินการ'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "budget_round" integer,
    "source_file" "text",
    "source_row_id" integer,
    "imported_at" timestamp with time zone
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certifications" (
    "id" integer NOT NULL,
    "cert_date" character varying(50),
    "exp_date" character varying(50),
    "farmer_name" character varying(255) NOT NULL,
    "plot_code" character varying(100),
    "crop_name" character varying(255),
    "plot_type" character varying(100),
    "area_rai" numeric,
    "production_volume_kg" numeric,
    "plot_moo" character varying(50),
    "plot_subdistrict" character varying(100),
    "plot_district" character varying(100),
    "farmer_moo" character varying(50),
    "farmer_subdistrict" character varying(100),
    "farmer_district" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."certifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."certifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."certifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."certifications_id_seq" OWNED BY "public"."certifications"."id";



CREATE TABLE IF NOT EXISTS "public"."coconut_aromatic_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "record_date" "date" DEFAULT '2026-06-01'::"date" NOT NULL,
    "round_no" integer DEFAULT 1 NOT NULL,
    "round_label" "text",
    "round_start_date" "date",
    "round_end_date" "date",
    "farmer_code" "text",
    "prefix" "text",
    "farmer_name" "text" NOT NULL,
    "house_no" "text",
    "village_no" "text",
    "subdistrict" "text",
    "district" "text",
    "own_area_rai" numeric DEFAULT 0,
    "rented_area_rai" numeric DEFAULT 0,
    "planted_area_rai" numeric DEFAULT 0,
    "production_cost_per_rai" numeric DEFAULT 0,
    "cost_per_fruit" numeric DEFAULT 0,
    "standard_fruit_per_rai" numeric DEFAULT 0,
    "standard_percent" numeric DEFAULT 0,
    "standard_price_per_fruit" numeric DEFAULT 0,
    "standard_income_per_rai" numeric DEFAULT 0,
    "small_fruit_per_rai" numeric DEFAULT 0,
    "small_percent" numeric DEFAULT 0,
    "small_price_per_fruit" numeric DEFAULT 0,
    "small_income_per_rai" numeric DEFAULT 0,
    "total_fruit_per_rai" numeric DEFAULT 0,
    "income_per_rai" numeric DEFAULT 0,
    "total_income" numeric DEFAULT 0,
    "notes" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."coconut_aromatic_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_enterprises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enterprise_name" "text" NOT NULL,
    "product_type" "text",
    "district" "text",
    "chairman" "text",
    "member_count" integer,
    "level" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sequence_no" integer,
    "approval_date" "text",
    "enterprise_type" "text",
    "address" "text",
    "village_no" integer,
    "subdistrict" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."community_enterprises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crop_production" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "crop_name" "text" NOT NULL,
    "district" "text",
    "planted_area" numeric,
    "production_ton" numeric,
    "harvest_period" "text",
    "year" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."crop_production" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_field_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "field_type" "text" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_required" boolean DEFAULT false NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "archived_at" timestamp with time zone,
    "promoted_at" timestamp with time zone,
    "promoted_column_name" "text",
    CONSTRAINT "custom_field_definitions_allowed_table_check" CHECK (("table_name" = ANY (ARRAY['farmer_registry'::"text", 'agricultural_areas'::"text", 'learning_centers'::"text", 'disasters'::"text", 'daily_weather'::"text", 'large_plots'::"text", 'certifications'::"text", 'crop_production'::"text", 'coconut_aromatic_surveys'::"text", 'community_enterprises'::"text", 'smart_farmers'::"text", 'smart_farmer_sf'::"text", 'young_smart_farmer_ysf'::"text", 'agricultural_career_groups'::"text", 'farmer_groups'::"text", 'housewife_farmer_groups'::"text", 'young_farmer_groups'::"text", 'young_farmer_groups_detailed'::"text", 'agri_tourism'::"text", 'forecast_plots'::"text", 'pest_outbreaks'::"text", 'pest_centers'::"text", 'plant_doctors'::"text", 'soil_fertilizer_centers'::"text", 'biocontrol_stock'::"text", 'fire_hotspots'::"text", 'forum_posts'::"text", 'forum_comments'::"text"]))),
    CONSTRAINT "custom_field_definitions_field_key_format" CHECK (("field_key" ~ '^[a-z][a-z0-9_]{1,40}$'::"text")),
    CONSTRAINT "custom_field_definitions_field_type_check" CHECK (("field_type" = ANY (ARRAY['text'::"text", 'textarea'::"text", 'number'::"text", 'date'::"text", 'select'::"text", 'boolean'::"text"]))),
    CONSTRAINT "custom_field_definitions_options_array" CHECK (("jsonb_typeof"("options") = 'array'::"text"))
);


ALTER TABLE "public"."custom_field_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_weather" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "tavg" numeric,
    "tmin" numeric,
    "tmax" numeric,
    "prcp" numeric,
    "wspd" numeric,
    "pres" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."daily_weather" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_request_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "district" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_request_assignments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'submitted'::"text"])))
);


ALTER TABLE "public"."data_request_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_request_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "district" "text" NOT NULL,
    "answers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "submitted_by" "uuid",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_request_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "schema" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "deadline" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "data_requests_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."data_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disasters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "disaster_type" "text" NOT NULL,
    "district" "text",
    "subdistrict" "text",
    "damaged_area" numeric,
    "affected_farmers" integer,
    "year" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "village_no" "text",
    "affected_area_rai" numeric,
    "affected_households" integer,
    "source_row_id" integer,
    "utm_zone" integer,
    "utm_x" numeric,
    "utm_y" numeric,
    "activity_group" "text",
    "crop_type" "text",
    "variety" "text",
    "planted_area_rai" numeric
);


ALTER TABLE "public"."disasters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmer_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_name" "text" NOT NULL,
    "group_type" "text",
    "district" "text",
    "chairman" "text",
    "member_count" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."farmer_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."housewife_farmer_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_name" "text" NOT NULL,
    "district" "text",
    "chairman" "text",
    "member_count" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "year" integer,
    "address_no" "text",
    "moo" integer,
    "subdistrict" "text",
    "province" "text",
    "phone" "text",
    "established_text" "text",
    "established_date" "date",
    "community_enterprise_registration" "text",
    "model_group" "text",
    "fund_management" numeric,
    "income" numeric,
    "activity" "text",
    "production_standard" "text",
    "online_domestic" "text",
    "online_international" "text",
    "offline_domestic" "text",
    "offline_international" "text",
    "potential_level" "text",
    "lat" numeric,
    "lon" numeric,
    "has_sales_channel" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."housewife_farmer_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."smart_farmer_sf" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_year" integer NOT NULL,
    "record_code" "text" NOT NULL,
    "sequence_no" integer,
    "citizen_id" "text",
    "title" "text",
    "first_name" "text",
    "last_name" "text",
    "full_name" "text" GENERATED ALWAYS AS (TRIM(BOTH FROM ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("first_name", ''::"text")) || ' '::"text") || COALESCE("last_name", ''::"text")))) STORED,
    "age" integer,
    "district" "text",
    "province" "text",
    "farmer_status" "text",
    "agricultural_activity" "text",
    "phone" "text",
    "education" "text",
    "production_standard" "text",
    "sales_channel" "text",
    "annual_agri_income" numeric,
    "production_area" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."smart_farmer_sf" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."young_farmer_groups_detailed" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_year" integer NOT NULL,
    "record_code" "text" NOT NULL,
    "group_name" "text" NOT NULL,
    "address_no" "text",
    "moo" "text",
    "subdistrict" "text",
    "district" "text",
    "province" "text",
    "phone" "text",
    "mobile" "text",
    "established_date" "date",
    "established_year_be" integer,
    "established_year_ce" integer,
    "member_count" integer,
    "model_group" "text",
    "fund_management" numeric,
    "income" numeric,
    "activity" "text",
    "activity_count" integer,
    "potential_level" "text",
    "lat" numeric,
    "lon" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."young_farmer_groups_detailed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."young_smart_farmer_ysf" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_year" integer NOT NULL,
    "record_code" "text" NOT NULL,
    "sequence_no" integer,
    "title" "text",
    "first_name" "text",
    "last_name" "text",
    "full_name" "text" GENERATED ALWAYS AS (TRIM(BOTH FROM ((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("first_name", ''::"text")) || ' '::"text") || COALESCE("last_name", ''::"text")))) STORED,
    "address_no" "text",
    "moo" "text",
    "subdistrict" "text",
    "district" "text",
    "province" "text",
    "phone" "text",
    "line_id" "text",
    "email" "text",
    "facebook" "text",
    "education" "text",
    "education_major" "text",
    "production_area" "text",
    "agricultural_activity" "text",
    "production_standard" "text",
    "farmer_status" "text",
    "sales_channel" "text",
    "affiliated_district" "text",
    "farm_area_rai" numeric,
    "annual_agri_income" numeric,
    "main_activity_type" "text",
    "has_crop" "text",
    "has_livestock" "text",
    "has_fishery" "text",
    "has_processing" "text",
    "has_online_channel" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."young_smart_farmer_ysf" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."farmer_institutes" AS
 WITH "districts" AS (
         SELECT "unnest"(ARRAY['เมืองนครปฐม'::"text", 'กำแพงแสน'::"text", 'นครชัยศรี'::"text", 'ดอนตูม'::"text", 'บางเลน'::"text", 'สามพราน'::"text", 'พุทธมณฑล'::"text"]) AS "district"
        ), "ce_counts" AS (
         SELECT "community_enterprises"."district",
            ("count"(*))::integer AS "count"
           FROM "public"."community_enterprises"
          GROUP BY "community_enterprises"."district"
        ), "hw_counts" AS (
         SELECT "housewife_farmer_groups"."district",
            ("count"(*))::integer AS "count"
           FROM "public"."housewife_farmer_groups"
          WHERE ("housewife_farmer_groups"."year" = ( SELECT "max"("housewife_farmer_groups_1"."year") AS "max"
                   FROM "public"."housewife_farmer_groups" "housewife_farmer_groups_1"))
          GROUP BY "housewife_farmer_groups"."district"
        ), "yf_counts" AS (
         SELECT "young_farmer_groups_detailed"."district",
            ("count"(*))::integer AS "count"
           FROM "public"."young_farmer_groups_detailed"
          WHERE ("young_farmer_groups_detailed"."data_year" = ( SELECT "max"("young_farmer_groups_detailed_1"."data_year") AS "max"
                   FROM "public"."young_farmer_groups_detailed" "young_farmer_groups_detailed_1"))
          GROUP BY "young_farmer_groups_detailed"."district"
        ), "career_counts" AS (
         SELECT "agricultural_career_groups"."district",
            ("count"(*))::integer AS "count"
           FROM "public"."agricultural_career_groups"
          WHERE ("agricultural_career_groups"."data_year" = ( SELECT "max"("agricultural_career_groups_1"."data_year") AS "max"
                   FROM "public"."agricultural_career_groups" "agricultural_career_groups_1"))
          GROUP BY "agricultural_career_groups"."district"
        ), "sf_counts" AS (
         SELECT "smart_farmer_sf"."district",
            ("count"(*))::integer AS "count"
           FROM "public"."smart_farmer_sf"
          WHERE ("smart_farmer_sf"."data_year" = ( SELECT "max"("smart_farmer_sf_1"."data_year") AS "max"
                   FROM "public"."smart_farmer_sf" "smart_farmer_sf_1"))
          GROUP BY "smart_farmer_sf"."district"
        ), "ysf_counts" AS (
         SELECT "young_smart_farmer_ysf"."district",
            ("count"(*))::integer AS "count"
           FROM "public"."young_smart_farmer_ysf"
          WHERE ("young_smart_farmer_ysf"."data_year" = ( SELECT "max"("young_smart_farmer_ysf_1"."data_year") AS "max"
                   FROM "public"."young_smart_farmer_ysf" "young_smart_farmer_ysf_1"))
          GROUP BY "young_smart_farmer_ysf"."district"
        )
 SELECT "row_number"() OVER () AS "id",
    "d"."district",
    (((COALESCE("ce"."count", 0) + COALESCE("hw"."count", 0)) + COALESCE("yf"."count", 0)) + COALESCE("career"."count", 0)) AS "total_groups",
    COALESCE("ce"."count", 0) AS "community_enterprise_groups",
    COALESCE("hw"."count", 0) AS "housewives_groups",
    COALESCE("yf"."count", 0) AS "young_farmer_groups",
    COALESCE("career"."count", 0) AS "career_promotion_groups",
        CASE "d"."district"
            WHEN 'เมืองนครปฐม'::"text" THEN 210
            WHEN 'กำแพงแสน'::"text" THEN 204
            WHEN 'นครชัยศรี'::"text" THEN 98
            WHEN 'ดอนตูม'::"text" THEN 69
            WHEN 'บางเลน'::"text" THEN 179
            WHEN 'สามพราน'::"text" THEN 137
            WHEN 'พุทธมณฑล'::"text" THEN 21
            ELSE 0
        END AS "village_farmers_count",
    COALESCE("sf"."count", 0) AS "smart_farmer_count",
    COALESCE("ysf"."count", 0) AS "young_smart_farmer_count",
    "now"() AS "created_at"
   FROM (((((("districts" "d"
     LEFT JOIN "ce_counts" "ce" ON (("ce"."district" = "d"."district")))
     LEFT JOIN "hw_counts" "hw" ON (("hw"."district" = "d"."district")))
     LEFT JOIN "yf_counts" "yf" ON (("yf"."district" = "d"."district")))
     LEFT JOIN "career_counts" "career" ON (("career"."district" = "d"."district")))
     LEFT JOIN "sf_counts" "sf" ON (("sf"."district" = "d"."district")))
     LEFT JOIN "ysf_counts" "ysf" ON (("ysf"."district" = "d"."district")));


ALTER VIEW "public"."farmer_institutes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmer_registry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "district" "text" NOT NULL,
    "household_count" integer,
    "farm_area_rai" numeric,
    "main_crop" "text",
    "data_year" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "target" integer,
    "update_tbk_households" integer,
    "update_tbk_plots" integer,
    "update_tbk_area_rai" numeric,
    "update_farmbook_households" integer,
    "update_farmbook_plots" integer,
    "update_farmbook_area_rai" numeric,
    "update_eform_households" integer,
    "update_eform_plots" integer,
    "update_eform_area_rai" numeric,
    "total_updated_households" integer,
    "total_updated_plots" integer,
    "total_updated_area_rai" numeric,
    "cancelled_households" integer,
    "net_total_households" integer,
    "cutoff_date" "date",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."farmer_registry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmer_registry_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_date" "date" DEFAULT (("now"() AT TIME ZONE 'Asia/Bangkok'::"text"))::"date" NOT NULL,
    "scraped_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "district" "text" NOT NULL,
    "household_count" integer,
    "target" integer,
    "update_tbk_households" integer,
    "update_tbk_plots" integer,
    "update_tbk_area_rai" numeric,
    "update_farmbook_households" integer,
    "update_farmbook_plots" integer,
    "update_farmbook_area_rai" numeric,
    "update_eform_households" integer,
    "update_eform_plots" integer,
    "update_eform_area_rai" numeric,
    "total_updated_households" integer,
    "total_updated_plots" integer,
    "total_updated_area_rai" numeric,
    "cancelled_households" integer,
    "net_total_households" integer,
    "farm_area_rai" numeric,
    "data_year" integer,
    "cutoff_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farmer_registry_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmer_registry_subdistrict_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "snapshot_date" "date" DEFAULT (("now"() AT TIME ZONE 'Asia/Bangkok'::"text"))::"date" NOT NULL,
    "scraped_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "district" "text" NOT NULL,
    "subdistrict" "text" NOT NULL,
    "household_count" integer,
    "target" integer,
    "update_tbk_households" integer,
    "update_tbk_plots" integer,
    "update_tbk_area_rai" numeric,
    "update_farmbook_households" integer,
    "update_farmbook_plots" integer,
    "update_farmbook_area_rai" numeric,
    "update_eform_households" integer,
    "update_eform_plots" integer,
    "update_eform_area_rai" numeric,
    "total_updated_households" integer,
    "total_updated_plots" integer,
    "total_updated_area_rai" numeric,
    "cancelled_households" integer,
    "net_total_households" integer,
    "farm_area_rai" numeric,
    "data_year" integer,
    "cutoff_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farmer_registry_subdistrict_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farmer_registry_subdistricts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "district" "text" NOT NULL,
    "subdistrict" "text" NOT NULL,
    "household_count" integer,
    "target" integer,
    "update_tbk_households" integer,
    "update_tbk_plots" integer,
    "update_tbk_area_rai" numeric,
    "update_farmbook_households" integer,
    "update_farmbook_plots" integer,
    "update_farmbook_area_rai" numeric,
    "update_eform_households" integer,
    "update_eform_plots" integer,
    "update_eform_area_rai" numeric,
    "total_updated_households" integer,
    "total_updated_plots" integer,
    "total_updated_area_rai" numeric,
    "cancelled_households" integer,
    "net_total_households" integer,
    "farm_area_rai" numeric,
    "data_year" integer,
    "cutoff_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farmer_registry_subdistricts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fire_hotspots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "spot_name" "text",
    "district" "text",
    "latitude" numeric,
    "longitude" numeric,
    "risk_level" "text",
    "year" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "acq_date" "date",
    "acq_time" "text",
    "satellite" "text",
    "instrument" "text",
    "confidence" "text",
    "bright_ti4" numeric,
    "bright_ti5" numeric,
    "frp" numeric,
    "daynight" "text",
    "source" "text" DEFAULT 'FIRMS'::"text",
    "subdistrict" "text",
    "land_use" "text",
    "village" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."fire_hotspots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forecast_plots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "row_number" integer,
    "province" "text" DEFAULT 'นครปฐม'::"text",
    "district" "text",
    "subdistrict" "text",
    "village_no" integer,
    "owner_name" "text",
    "zone" "text",
    "coord_x" numeric,
    "coord_y" numeric,
    "crop_type" "text",
    "variety" "text",
    "planted_area_rai" numeric,
    "planting_date" "text",
    "plot_type" "text",
    "crop_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."forecast_plots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid",
    "author_name" "text" NOT NULL,
    "avatar" "text",
    "content" "text" NOT NULL,
    "likes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."forum_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forum_posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text" NOT NULL,
    "author_name" "text" NOT NULL,
    "district" "text",
    "province" "text",
    "avatar" "text",
    "views" integer DEFAULT 0,
    "likes" integer DEFAULT 0,
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."forum_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geoplots_parcel_progress" (
    "district_code" "text" NOT NULL,
    "district" "text" NOT NULL,
    "province_code" "text" DEFAULT '73'::"text" NOT NULL,
    "province" "text" DEFAULT 'นครปฐม'::"text" NOT NULL,
    "target_plots" integer DEFAULT 0 NOT NULL,
    "drawn_plots" integer DEFAULT 0 NOT NULL,
    "remaining_target_plots" integer DEFAULT 0 NOT NULL,
    "remaining_list_68" integer DEFAULT 0 NOT NULL,
    "remaining_list_67" integer DEFAULT 0 NOT NULL,
    "geoplots_68" integer DEFAULT 0 NOT NULL,
    "geoplots_67" integer DEFAULT 0 NOT NULL,
    "qgis_68" integer DEFAULT 0 NOT NULL,
    "qgis_67" integer DEFAULT 0 NOT NULL,
    "doae_plots" integer DEFAULT 0 NOT NULL,
    "progress_percent" numeric(6,2) DEFAULT 0 NOT NULL,
    "total_chart_plots" integer DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'geoplots.doae.go.th'::"text" NOT NULL,
    "snapshot_date" "date" DEFAULT (("now"() AT TIME ZONE 'Asia/Bangkok'::"text"))::"date" NOT NULL,
    "scraped_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."geoplots_parcel_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geoplots_parcel_subdistrict_progress" (
    "subdistrict_code" "text" NOT NULL,
    "subdistrict" "text" NOT NULL,
    "district_code" "text" NOT NULL,
    "district" "text" NOT NULL,
    "province_code" "text" DEFAULT '73'::"text" NOT NULL,
    "province" "text" DEFAULT 'นครปฐม'::"text" NOT NULL,
    "target_plots" integer DEFAULT 0 NOT NULL,
    "drawn_plots" integer DEFAULT 0 NOT NULL,
    "remaining_target_plots" integer DEFAULT 0 NOT NULL,
    "remaining_list_68" integer DEFAULT 0 NOT NULL,
    "remaining_list_67" integer DEFAULT 0 NOT NULL,
    "geoplots_68" integer DEFAULT 0 NOT NULL,
    "geoplots_67" integer DEFAULT 0 NOT NULL,
    "qgis_68" integer DEFAULT 0 NOT NULL,
    "qgis_67" integer DEFAULT 0 NOT NULL,
    "doae_plots" integer DEFAULT 0 NOT NULL,
    "progress_percent" numeric(6,2) DEFAULT 0 NOT NULL,
    "total_chart_plots" integer DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'geoplots.doae.go.th'::"text" NOT NULL,
    "snapshot_date" "date" DEFAULT (("now"() AT TIME ZONE 'Asia/Bangkok'::"text"))::"date" NOT NULL,
    "scraped_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."geoplots_parcel_subdistrict_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gis_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "area_name" "text" NOT NULL,
    "district" "text",
    "latitude" numeric,
    "longitude" numeric,
    "area_type" "text",
    "area_rai" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gis_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kpi_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kpi_name" "text" NOT NULL,
    "unit" "text",
    "target" numeric,
    "actual" numeric,
    "fiscal_year" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kpi_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."large_plots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plot_name" "text" NOT NULL,
    "commodity" "text",
    "district" "text",
    "member_count" integer,
    "area_rai" numeric,
    "year" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "code" "text",
    "commodity_group" "text",
    "secondary_commodity" "text",
    "subdistrict" "text",
    "phone" "text",
    "agency" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."large_plots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."learning_centers" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "name" "text",
    "featured_product" "text",
    "moo" "text",
    "subdistrict" "text",
    "district" "text",
    "network_centers_count" numeric,
    "chairman_name" "text",
    "phone" "text",
    "knowledge_course" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."learning_centers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."learning_centers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."learning_centers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."learning_centers_id_seq" OWNED BY "public"."learning_centers"."id";



CREATE TABLE IF NOT EXISTS "public"."line_account_links" (
    "line_user_id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "linked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_account_links_line_user_id_check" CHECK ((("char_length"("line_user_id") >= 1) AND ("char_length"("line_user_id") <= 100)))
);


ALTER TABLE "public"."line_account_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_ai_cache" (
    "cache_key" "text" NOT NULL,
    "response" "jsonb" NOT NULL,
    "source_type" "text" NOT NULL,
    "model" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."line_ai_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_ai_key_health" (
    "key_slot" smallint NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "consecutive_failures" integer DEFAULT 0 NOT NULL,
    "cooldown_until" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "last_error_code" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_ai_key_health_key_slot_check" CHECK ((("key_slot" >= 1) AND ("key_slot" <= 5))),
    CONSTRAINT "line_ai_key_health_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."line_ai_key_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_ai_usage" (
    "id" bigint NOT NULL,
    "line_user_id" "text" NOT NULL,
    "usage_type" "text" NOT NULL,
    "key_slot" smallint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_ai_usage_key_slot_check" CHECK ((("key_slot" IS NULL) OR (("key_slot" >= 1) AND ("key_slot" <= 5)))),
    CONSTRAINT "line_ai_usage_usage_type_check" CHECK (("usage_type" = ANY (ARRAY['ai'::"text", 'grounding'::"text"])))
);


ALTER TABLE "public"."line_ai_usage" OWNER TO "postgres";


ALTER TABLE "public"."line_ai_usage" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."line_ai_usage_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."line_conversations" (
    "id" bigint NOT NULL,
    "line_user_id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "source_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_conversations_content_check" CHECK ((("char_length"("content") >= 1) AND ("char_length"("content") <= 4000))),
    CONSTRAINT "line_conversations_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."line_conversations" OWNER TO "postgres";


ALTER TABLE "public"."line_conversations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."line_conversations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."line_link_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_link_codes_code_hash_check" CHECK (("char_length"("code_hash") = 64))
);


ALTER TABLE "public"."line_link_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_user_preferences" (
    "line_user_id" "text" NOT NULL,
    "crop" "text",
    "district" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_user_preferences_check" CHECK ((("crop" IS NOT NULL) OR ("district" IS NOT NULL))),
    CONSTRAINT "line_user_preferences_crop_check" CHECK ((("crop" IS NULL) OR (("char_length"("crop") >= 1) AND ("char_length"("crop") <= 50)))),
    CONSTRAINT "line_user_preferences_district_check" CHECK ((("district" IS NULL) OR ("district" = ANY (ARRAY['เมืองนครปฐม'::"text", 'กำแพงแสน'::"text", 'นครชัยศรี'::"text", 'ดอนตูม'::"text", 'บางเลน'::"text", 'สามพราน'::"text", 'พุทธมณฑล'::"text"])))),
    CONSTRAINT "line_user_preferences_line_user_id_check" CHECK ((("char_length"("line_user_id") >= 1) AND ("char_length"("line_user_id") <= 100)))
);


ALTER TABLE "public"."line_user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personnel" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "position" "text",
    "department" "text",
    "phone" "text",
    "email" "text",
    "status" "text" DEFAULT 'ปฏิบัติงาน'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "province" "text",
    "district" "text",
    "office_type" "text",
    "sort_order" integer DEFAULT 999,
    "appointed_date" "date",
    "current_position_start_date" "date",
    "education" "text",
    "highest_education" "text",
    "birth_date" "date",
    "executive_training" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."personnel" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pest_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "center_name" "text" NOT NULL,
    "district" "text",
    "subdistrict" "text",
    "chairman" "text",
    "member_count" integer,
    "contact_phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "established_year_th" "text",
    "established_year_en" "text",
    "grade_level" "text",
    "main_crop_type" "text",
    "location_type" "text",
    "other_status" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."pest_centers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pest_outbreaks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pest_name" "text" NOT NULL,
    "affected_crop" "text",
    "district" "text",
    "outbreak_area" numeric,
    "severity" "text",
    "report_date" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."pest_outbreaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plant_doctors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "row_number" integer,
    "full_name" "text" NOT NULL,
    "address_no" "text",
    "village_no" "text",
    "subdistrict" "text",
    "district" "text",
    "province" "text" DEFAULT 'นครปฐม'::"text",
    "contact_phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."plant_doctors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "data_year" integer DEFAULT 2567 NOT NULL,
    "crop_name" "text" NOT NULL,
    "yield_kg_per_rai" numeric,
    "revenue_baht_per_rai" numeric,
    "seed_cost_baht" numeric,
    "fertilizer_cost_baht" numeric,
    "pesticide_cost_baht" numeric,
    "service_cost_baht" numeric,
    "equipment_cost_baht" numeric,
    "fuel_cost_baht" numeric,
    "repair_depreciation_cost_baht" numeric,
    "packaging_cost_baht" numeric,
    "other_cost_baht" numeric,
    "total_cost_baht" numeric,
    "source_file" "text" DEFAULT 'ต้นทุนการผลิต ปี 2567.xlsx'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."production_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "department" "text",
    "role" "text" DEFAULT 'viewer'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_alert_events" (
    "event_key" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "district" "text",
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "push_alert_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['outbreak'::"text", 'hotspot'::"text"])))
);


ALTER TABLE "public"."push_alert_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "subscription" "jsonb" NOT NULL,
    "outbreak" boolean DEFAULT true NOT NULL,
    "hotspot" boolean DEFAULT true NOT NULL,
    "districts" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


ALTER TABLE "public"."push_subscriptions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."push_subscriptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."site_statistics" (
    "id" integer NOT NULL,
    "key" "text" NOT NULL,
    "value" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."site_statistics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."site_statistics_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."site_statistics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."site_statistics_id_seq" OWNED BY "public"."site_statistics"."id";



CREATE TABLE IF NOT EXISTS "public"."smart_farmers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "farmer_type" "text",
    "district" "text",
    "main_product" "text",
    "phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."smart_farmers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."soil_fertilizer_centers" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "cert_date" "text",
    "established_year_th" "text",
    "established_year_en" "text",
    "district" "text",
    "center_name" "text",
    "grade_level" "text",
    "address_no" "text",
    "village_no" "text",
    "subdistrict" "text",
    "chairman" "text",
    "contact_phone" "text",
    "member_count" numeric,
    "main_crop_type" "text",
    "group_type" "text",
    "latitude" numeric,
    "longitude" numeric,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."soil_fertilizer_centers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."soil_fertilizer_centers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."soil_fertilizer_centers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."soil_fertilizer_centers_id_seq" OWNED BY "public"."soil_fertilizer_centers"."id";



CREATE TABLE IF NOT EXISTS "public"."soil_series" (
    "id" bigint NOT NULL,
    "source_feature_id" integer NOT NULL,
    "soil_series_name" "text" NOT NULL,
    "soil_series_code" "text",
    "soil_group" "text",
    "texture" "text",
    "fertility" "text",
    "ph_top" "text",
    "district" "text",
    "district_code" "text",
    "province" "text" DEFAULT 'นครปฐม'::"text",
    "area_sqm" numeric,
    "area_rai" numeric,
    "geometry" "jsonb" NOT NULL,
    "raw_properties" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source" "text" DEFAULT 'Land Development Department (LDD), Thailand'::"text" NOT NULL,
    "source_dataset" "text" DEFAULT 'Soil Series, Nakhon Pathom'::"text" NOT NULL,
    "production_year_be" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ldd_soil25_id" integer,
    "ldd_wgs84_id" integer
);


ALTER TABLE "public"."soil_series" OWNER TO "postgres";


ALTER TABLE "public"."soil_series" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."soil_series_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."visitor_events" (
    "id" bigint NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "path" "text",
    "referrer" "text",
    "user_agent" "text",
    "ip_hash" "text",
    "ip_prefix" "text",
    "country_code" "text",
    "country_name" "text",
    "region" "text",
    "city" "text",
    "timezone" "text",
    "latitude" double precision,
    "longitude" double precision,
    "source" "text" DEFAULT 'netlify'::"text" NOT NULL
);


ALTER TABLE "public"."visitor_events" OWNER TO "postgres";


ALTER TABLE "public"."visitor_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."visitor_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."website_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_type" "text" NOT NULL,
    "rating_usability" integer NOT NULL,
    "rating_information" integer NOT NULL,
    "rating_speed" integer NOT NULL,
    "comments" "text",
    "user_id" "uuid",
    CONSTRAINT "website_evaluations_rating_information_check" CHECK ((("rating_information" >= 1) AND ("rating_information" <= 5))),
    CONSTRAINT "website_evaluations_rating_speed_check" CHECK ((("rating_speed" >= 1) AND ("rating_speed" <= 5))),
    CONSTRAINT "website_evaluations_rating_usability_check" CHECK ((("rating_usability" >= 1) AND ("rating_usability" <= 5)))
);


ALTER TABLE "public"."website_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."young_farmer_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_name" "text" NOT NULL,
    "district" "text",
    "chairman" "text",
    "member_count" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."young_farmer_groups" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agricultural_areas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agricultural_areas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."certifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."certifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."learning_centers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."learning_centers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."site_statistics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."site_statistics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."soil_fertilizer_centers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."soil_fertilizer_centers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."agri_tourism"
    ADD CONSTRAINT "agri_tourism_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agricultural_areas"
    ADD CONSTRAINT "agricultural_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agricultural_career_groups"
    ADD CONSTRAINT "agricultural_career_groups_data_year_record_code_key" UNIQUE ("data_year", "record_code");



ALTER TABLE ONLY "public"."agricultural_career_groups"
    ADD CONSTRAINT "agricultural_career_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_disease_forecasts"
    ADD CONSTRAINT "ai_disease_forecasts_forecast_date_key" UNIQUE ("forecast_date");



ALTER TABLE ONLY "public"."ai_disease_forecasts"
    ADD CONSTRAINT "ai_disease_forecasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."biocontrol_stock"
    ADD CONSTRAINT "biocontrol_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certifications"
    ADD CONSTRAINT "certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coconut_aromatic_surveys"
    ADD CONSTRAINT "coconut_aromatic_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_enterprises"
    ADD CONSTRAINT "community_enterprises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crop_production"
    ADD CONSTRAINT "crop_production_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_field_definitions"
    ADD CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_weather"
    ADD CONSTRAINT "daily_weather_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."daily_weather"
    ADD CONSTRAINT "daily_weather_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_request_assignments"
    ADD CONSTRAINT "data_request_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_request_assignments"
    ADD CONSTRAINT "data_request_assignments_request_id_district_key" UNIQUE ("request_id", "district");



ALTER TABLE ONLY "public"."data_request_responses"
    ADD CONSTRAINT "data_request_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_request_responses"
    ADD CONSTRAINT "data_request_responses_request_id_district_key" UNIQUE ("request_id", "district");



ALTER TABLE ONLY "public"."data_requests"
    ADD CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disasters"
    ADD CONSTRAINT "disasters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_groups"
    ADD CONSTRAINT "farmer_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_registry"
    ADD CONSTRAINT "farmer_registry_district_year_uq" UNIQUE ("district", "data_year");



ALTER TABLE ONLY "public"."farmer_registry"
    ADD CONSTRAINT "farmer_registry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_registry_snapshots"
    ADD CONSTRAINT "farmer_registry_snapshots_date_district_year_uq" UNIQUE ("snapshot_date", "district", "data_year");



ALTER TABLE ONLY "public"."farmer_registry_snapshots"
    ADD CONSTRAINT "farmer_registry_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_registry_subdistrict_snapshots"
    ADD CONSTRAINT "farmer_registry_subdistrict_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_registry_subdistrict_snapshots"
    ADD CONSTRAINT "farmer_registry_subdistrict_snapshots_uq" UNIQUE ("snapshot_date", "district", "subdistrict", "data_year");



ALTER TABLE ONLY "public"."farmer_registry_subdistricts"
    ADD CONSTRAINT "farmer_registry_subdistricts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farmer_registry_subdistricts"
    ADD CONSTRAINT "farmer_registry_subdistricts_uq" UNIQUE ("district", "subdistrict", "data_year");



ALTER TABLE ONLY "public"."fire_hotspots"
    ADD CONSTRAINT "fire_hotspots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forecast_plots"
    ADD CONSTRAINT "forecast_plots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_comments"
    ADD CONSTRAINT "forum_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forum_posts"
    ADD CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geoplots_parcel_progress"
    ADD CONSTRAINT "geoplots_parcel_progress_pkey" PRIMARY KEY ("district_code");



ALTER TABLE ONLY "public"."geoplots_parcel_subdistrict_progress"
    ADD CONSTRAINT "geoplots_parcel_subdistrict_progress_pkey" PRIMARY KEY ("subdistrict_code");



ALTER TABLE ONLY "public"."gis_areas"
    ADD CONSTRAINT "gis_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."housewife_farmer_groups"
    ADD CONSTRAINT "housewife_farmer_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kpi_plans"
    ADD CONSTRAINT "kpi_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."large_plots"
    ADD CONSTRAINT "large_plots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."learning_centers"
    ADD CONSTRAINT "learning_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_account_links"
    ADD CONSTRAINT "line_account_links_pkey" PRIMARY KEY ("line_user_id");



ALTER TABLE ONLY "public"."line_account_links"
    ADD CONSTRAINT "line_account_links_profile_id_key" UNIQUE ("profile_id");



ALTER TABLE ONLY "public"."line_ai_cache"
    ADD CONSTRAINT "line_ai_cache_pkey" PRIMARY KEY ("cache_key");



ALTER TABLE ONLY "public"."line_ai_key_health"
    ADD CONSTRAINT "line_ai_key_health_pkey" PRIMARY KEY ("key_slot");



ALTER TABLE ONLY "public"."line_ai_usage"
    ADD CONSTRAINT "line_ai_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_conversations"
    ADD CONSTRAINT "line_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_link_codes"
    ADD CONSTRAINT "line_link_codes_code_hash_key" UNIQUE ("code_hash");



ALTER TABLE ONLY "public"."line_link_codes"
    ADD CONSTRAINT "line_link_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_user_preferences"
    ADD CONSTRAINT "line_user_preferences_pkey" PRIMARY KEY ("line_user_id");



ALTER TABLE ONLY "public"."personnel"
    ADD CONSTRAINT "personnel_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pest_centers"
    ADD CONSTRAINT "pest_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pest_outbreaks"
    ADD CONSTRAINT "pest_outbreaks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plant_doctors"
    ADD CONSTRAINT "plant_doctors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_costs"
    ADD CONSTRAINT "production_costs_data_year_crop_name_key" UNIQUE ("data_year", "crop_name");



ALTER TABLE ONLY "public"."production_costs"
    ADD CONSTRAINT "production_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_alert_events"
    ADD CONSTRAINT "push_alert_events_pkey" PRIMARY KEY ("event_key");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."site_statistics"
    ADD CONSTRAINT "site_statistics_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."site_statistics"
    ADD CONSTRAINT "site_statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."smart_farmer_sf"
    ADD CONSTRAINT "smart_farmer_sf_data_year_record_code_key" UNIQUE ("data_year", "record_code");



ALTER TABLE ONLY "public"."smart_farmer_sf"
    ADD CONSTRAINT "smart_farmer_sf_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."smart_farmers"
    ADD CONSTRAINT "smart_farmers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."soil_fertilizer_centers"
    ADD CONSTRAINT "soil_fertilizer_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."soil_series"
    ADD CONSTRAINT "soil_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."soil_series"
    ADD CONSTRAINT "soil_series_source_feature_id_key" UNIQUE ("source_feature_id");



ALTER TABLE ONLY "public"."visitor_events"
    ADD CONSTRAINT "visitor_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."website_evaluations"
    ADD CONSTRAINT "website_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."young_farmer_groups_detailed"
    ADD CONSTRAINT "young_farmer_groups_detailed_data_year_record_code_key" UNIQUE ("data_year", "record_code");



ALTER TABLE ONLY "public"."young_farmer_groups_detailed"
    ADD CONSTRAINT "young_farmer_groups_detailed_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."young_farmer_groups"
    ADD CONSTRAINT "young_farmer_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."young_smart_farmer_ysf"
    ADD CONSTRAINT "young_smart_farmer_ysf_data_year_record_code_key" UNIQUE ("data_year", "record_code");



ALTER TABLE ONLY "public"."young_smart_farmer_ysf"
    ADD CONSTRAINT "young_smart_farmer_ysf_pkey" PRIMARY KEY ("id");



CREATE INDEX "budgets_fiscal_year_round_idx" ON "public"."budgets" USING "btree" ("fiscal_year", "budget_round");



CREATE UNIQUE INDEX "budgets_source_round_row_uidx" ON "public"."budgets" USING "btree" ("fiscal_year", "budget_round", "source_file", "source_row_id") WHERE (("source_file" IS NOT NULL) AND ("source_row_id" IS NOT NULL));



CREATE UNIQUE INDEX "disasters_flood_source_key" ON "public"."disasters" USING "btree" ("source_row_id");



CREATE INDEX "farmer_registry_snapshots_district_idx" ON "public"."farmer_registry_snapshots" USING "btree" ("district");



CREATE INDEX "farmer_registry_snapshots_year_date_idx" ON "public"."farmer_registry_snapshots" USING "btree" ("data_year", "snapshot_date" DESC);



CREATE INDEX "farmer_registry_subdistrict_snapshots_district_idx" ON "public"."farmer_registry_subdistrict_snapshots" USING "btree" ("district", "subdistrict");



CREATE INDEX "farmer_registry_subdistrict_snapshots_year_date_idx" ON "public"."farmer_registry_subdistrict_snapshots" USING "btree" ("data_year", "snapshot_date" DESC);



CREATE INDEX "farmer_registry_subdistricts_year_district_idx" ON "public"."farmer_registry_subdistricts" USING "btree" ("data_year", "district", "subdistrict");



CREATE INDEX "geoplots_parcel_progress_percent_idx" ON "public"."geoplots_parcel_progress" USING "btree" ("progress_percent");



CREATE INDEX "geoplots_parcel_subdistrict_progress_district_idx" ON "public"."geoplots_parcel_subdistrict_progress" USING "btree" ("district_code", "subdistrict");



CREATE INDEX "idx_agri_tourism_custom_fields" ON "public"."agri_tourism" USING "gin" ("custom_fields");



CREATE INDEX "idx_agricultural_areas_custom_fields" ON "public"."agricultural_areas" USING "gin" ("custom_fields");



CREATE INDEX "idx_agricultural_career_groups_custom_fields" ON "public"."agricultural_career_groups" USING "gin" ("custom_fields");



CREATE INDEX "idx_agricultural_career_groups_district" ON "public"."agricultural_career_groups" USING "btree" ("district");



CREATE INDEX "idx_agricultural_career_groups_potential" ON "public"."agricultural_career_groups" USING "btree" ("potential_level");



CREATE INDEX "idx_agricultural_career_groups_year" ON "public"."agricultural_career_groups" USING "btree" ("data_year");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_table_name" ON "public"."audit_logs" USING "btree" ("table_name");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_biocontrol_stock_custom_fields" ON "public"."biocontrol_stock" USING "gin" ("custom_fields");



CREATE INDEX "idx_budgets_fiscal_year" ON "public"."budgets" USING "btree" ("fiscal_year");



CREATE INDEX "idx_certifications_custom_fields" ON "public"."certifications" USING "gin" ("custom_fields");



CREATE INDEX "idx_coconut_aromatic_surveys_custom_fields" ON "public"."coconut_aromatic_surveys" USING "gin" ("custom_fields");



CREATE INDEX "idx_coconut_aromatic_surveys_location" ON "public"."coconut_aromatic_surveys" USING "btree" ("district", "subdistrict");



CREATE INDEX "idx_coconut_aromatic_surveys_record_date" ON "public"."coconut_aromatic_surveys" USING "btree" ("record_date");



CREATE INDEX "idx_coconut_aromatic_surveys_round" ON "public"."coconut_aromatic_surveys" USING "btree" ("round_no");



CREATE INDEX "idx_community_enterprises_custom_fields" ON "public"."community_enterprises" USING "gin" ("custom_fields");



CREATE INDEX "idx_crop_production_custom_fields" ON "public"."crop_production" USING "gin" ("custom_fields");



CREATE INDEX "idx_crop_production_year" ON "public"."crop_production" USING "btree" ("year");



CREATE UNIQUE INDEX "idx_custom_field_definitions_active_key" ON "public"."custom_field_definitions" USING "btree" ("table_name", "field_key") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_custom_field_definitions_table_order" ON "public"."custom_field_definitions" USING "btree" ("table_name", "display_order", "created_at") WHERE ("archived_at" IS NULL);



CREATE INDEX "idx_daily_weather_custom_fields" ON "public"."daily_weather" USING "gin" ("custom_fields");



CREATE INDEX "idx_data_request_assignments_district" ON "public"."data_request_assignments" USING "btree" ("district");



CREATE INDEX "idx_data_request_assignments_request" ON "public"."data_request_assignments" USING "btree" ("request_id");



CREATE INDEX "idx_data_request_responses_district" ON "public"."data_request_responses" USING "btree" ("district");



CREATE INDEX "idx_data_request_responses_request" ON "public"."data_request_responses" USING "btree" ("request_id");



CREATE INDEX "idx_data_requests_created_at" ON "public"."data_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_data_requests_status" ON "public"."data_requests" USING "btree" ("status");



CREATE INDEX "idx_disasters_custom_fields" ON "public"."disasters" USING "gin" ("custom_fields");



CREATE INDEX "idx_farmer_groups_custom_fields" ON "public"."farmer_groups" USING "gin" ("custom_fields");



CREATE INDEX "idx_farmer_registry_custom_fields" ON "public"."farmer_registry" USING "gin" ("custom_fields");



CREATE INDEX "idx_farmer_registry_data_year" ON "public"."farmer_registry" USING "btree" ("data_year");



CREATE INDEX "idx_fire_hotspots_acq_date" ON "public"."fire_hotspots" USING "btree" ("acq_date");



CREATE INDEX "idx_fire_hotspots_custom_fields" ON "public"."fire_hotspots" USING "gin" ("custom_fields");



CREATE INDEX "idx_fire_hotspots_source" ON "public"."fire_hotspots" USING "btree" ("source");



CREATE UNIQUE INDEX "idx_fire_hotspots_unique_point" ON "public"."fire_hotspots" USING "btree" ("latitude", "longitude", "acq_date", "acq_time");



CREATE INDEX "idx_fire_hotspots_year" ON "public"."fire_hotspots" USING "btree" ("year");



CREATE INDEX "idx_forecast_plots_custom_fields" ON "public"."forecast_plots" USING "gin" ("custom_fields");



CREATE INDEX "idx_forum_comments_custom_fields" ON "public"."forum_comments" USING "gin" ("custom_fields");



CREATE INDEX "idx_forum_posts_custom_fields" ON "public"."forum_posts" USING "gin" ("custom_fields");



CREATE INDEX "idx_gin_agri_tourism_description" ON "public"."agri_tourism" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_agri_tourism_district" ON "public"."agri_tourism" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_agri_tourism_spot_name" ON "public"."agri_tourism" USING "gin" ("spot_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_agri_tourism_spot_type" ON "public"."agri_tourism" USING "gin" ("spot_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_agricultural_areas_district" ON "public"."agricultural_areas" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ai_forecasts_summary" ON "public"."ai_disease_forecasts" USING "gin" ("summary" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_assets_category" ON "public"."assets" USING "gin" ("category" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_assets_condition" ON "public"."assets" USING "gin" ("condition" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_assets_location" ON "public"."assets" USING "gin" ("location" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_assets_name" ON "public"."assets" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_assets_notes" ON "public"."assets" USING "gin" ("notes" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_assets_serial" ON "public"."assets" USING "gin" ("serial_number" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_biocontrol_stock_notes" ON "public"."biocontrol_stock" USING "gin" ("notes" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_biocontrol_stock_period" ON "public"."biocontrol_stock" USING "gin" ("period" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_biocontrol_stock_product" ON "public"."biocontrol_stock" USING "gin" ("product_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_biocontrol_stock_source" ON "public"."biocontrol_stock" USING "gin" ("source" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_biocontrol_stock_status" ON "public"."biocontrol_stock" USING "gin" ("status" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_budgets_project_name" ON "public"."budgets" USING "gin" ("project_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_budgets_source" ON "public"."budgets" USING "gin" ("budget_source" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_budgets_status" ON "public"."budgets" USING "gin" ("status" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_activity" ON "public"."agricultural_career_groups" USING "gin" ("activity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_ce_reg" ON "public"."agricultural_career_groups" USING "gin" ("community_enterprise_registration" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_district" ON "public"."agricultural_career_groups" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_group_name" ON "public"."agricultural_career_groups" USING "gin" ("group_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_main_activity" ON "public"."agricultural_career_groups" USING "gin" ("main_activity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_potential" ON "public"."agricultural_career_groups" USING "gin" ("potential_level" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_record_code" ON "public"."agricultural_career_groups" USING "gin" ("record_code" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_standard" ON "public"."agricultural_career_groups" USING "gin" ("production_standard" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_career_groups_subdistrict" ON "public"."agricultural_career_groups" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_certifications_crop_name" ON "public"."certifications" USING "gin" ("crop_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_certifications_farmer_district" ON "public"."certifications" USING "gin" ("farmer_district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_certifications_farmer_name" ON "public"."certifications" USING "gin" ("farmer_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_certifications_plot_type" ON "public"."certifications" USING "gin" ("plot_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_community_enterprises_district" ON "public"."community_enterprises" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_community_enterprises_level" ON "public"."community_enterprises" USING "gin" ("level" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_community_enterprises_name" ON "public"."community_enterprises" USING "gin" ("enterprise_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_community_enterprises_product" ON "public"."community_enterprises" USING "gin" ("product_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_community_enterprises_subdistrict" ON "public"."community_enterprises" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_community_enterprises_type" ON "public"."community_enterprises" USING "gin" ("enterprise_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_crop_production_crop_name" ON "public"."crop_production" USING "gin" ("crop_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_crop_production_district" ON "public"."crop_production" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_crop_production_harvest_period" ON "public"."crop_production" USING "gin" ("harvest_period" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_disasters_district" ON "public"."disasters" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_disasters_subdistrict" ON "public"."disasters" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_disasters_type" ON "public"."disasters" USING "gin" ("disaster_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_groups_chairman" ON "public"."farmer_groups" USING "gin" ("chairman" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_groups_district" ON "public"."farmer_groups" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_groups_group_name" ON "public"."farmer_groups" USING "gin" ("group_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_groups_notes" ON "public"."farmer_groups" USING "gin" ("notes" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_groups_type" ON "public"."farmer_groups" USING "gin" ("group_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_registry_district" ON "public"."farmer_registry" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_farmer_registry_main_crop" ON "public"."farmer_registry" USING "gin" ("main_crop" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_fire_hotspots_district" ON "public"."fire_hotspots" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_fire_hotspots_risk_level" ON "public"."fire_hotspots" USING "gin" ("risk_level" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_fire_hotspots_spot_name" ON "public"."fire_hotspots" USING "gin" ("spot_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_forecast_plots_crop_type" ON "public"."forecast_plots" USING "gin" ("crop_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_forecast_plots_district" ON "public"."forecast_plots" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_forecast_plots_subdistrict" ON "public"."forecast_plots" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_forecast_plots_variety" ON "public"."forecast_plots" USING "gin" ("variety" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_gis_areas_area_name" ON "public"."gis_areas" USING "gin" ("area_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_gis_areas_area_type" ON "public"."gis_areas" USING "gin" ("area_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_gis_areas_district" ON "public"."gis_areas" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_gis_areas_notes" ON "public"."gis_areas" USING "gin" ("notes" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_activity" ON "public"."housewife_farmer_groups" USING "gin" ("activity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_ce_reg" ON "public"."housewife_farmer_groups" USING "gin" ("community_enterprise_registration" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_chairman" ON "public"."housewife_farmer_groups" USING "gin" ("chairman" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_district" ON "public"."housewife_farmer_groups" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_group_name" ON "public"."housewife_farmer_groups" USING "gin" ("group_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_potential" ON "public"."housewife_farmer_groups" USING "gin" ("potential_level" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_standard" ON "public"."housewife_farmer_groups" USING "gin" ("production_standard" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_housewife_groups_subdistrict" ON "public"."housewife_farmer_groups" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_large_plots_agency" ON "public"."large_plots" USING "gin" ("agency" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_large_plots_commodity" ON "public"."large_plots" USING "gin" ("commodity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_large_plots_district" ON "public"."large_plots" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_large_plots_plot_name" ON "public"."large_plots" USING "gin" ("plot_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_large_plots_secondary_commodity" ON "public"."large_plots" USING "gin" ("secondary_commodity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_large_plots_subdistrict" ON "public"."large_plots" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_learning_centers_district" ON "public"."learning_centers" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_learning_centers_name" ON "public"."learning_centers" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_personnel_department" ON "public"."personnel" USING "gin" ("department" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_personnel_district" ON "public"."personnel" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_personnel_office_type" ON "public"."personnel" USING "gin" ("office_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_personnel_position" ON "public"."personnel" USING "gin" ("position" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_centers_chairman" ON "public"."pest_centers" USING "gin" ("chairman" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_centers_district" ON "public"."pest_centers" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_centers_main_crop" ON "public"."pest_centers" USING "gin" ("main_crop_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_centers_name" ON "public"."pest_centers" USING "gin" ("center_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_centers_subdistrict" ON "public"."pest_centers" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_outbreaks_crop" ON "public"."pest_outbreaks" USING "gin" ("affected_crop" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_outbreaks_district" ON "public"."pest_outbreaks" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_outbreaks_name" ON "public"."pest_outbreaks" USING "gin" ("pest_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_outbreaks_notes" ON "public"."pest_outbreaks" USING "gin" ("notes" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_outbreaks_report_date" ON "public"."pest_outbreaks" USING "gin" ("report_date" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_pest_outbreaks_severity" ON "public"."pest_outbreaks" USING "gin" ("severity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_plant_doctors_district" ON "public"."plant_doctors" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_plant_doctors_province" ON "public"."plant_doctors" USING "gin" ("province" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_plant_doctors_subdistrict" ON "public"."plant_doctors" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_production_costs_crop_name" ON "public"."production_costs" USING "gin" ("crop_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmer_sf_activity" ON "public"."smart_farmer_sf" USING "gin" ("agricultural_activity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmer_sf_district" ON "public"."smart_farmer_sf" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmer_sf_province" ON "public"."smart_farmer_sf" USING "gin" ("province" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmer_sf_record_code" ON "public"."smart_farmer_sf" USING "gin" ("record_code" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmer_sf_standard" ON "public"."smart_farmer_sf" USING "gin" ("production_standard" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmer_sf_status" ON "public"."smart_farmer_sf" USING "gin" ("farmer_status" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmers_district" ON "public"."smart_farmers" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmers_farmer_type" ON "public"."smart_farmers" USING "gin" ("farmer_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_smart_farmers_main_product" ON "public"."smart_farmers" USING "gin" ("main_product" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_centers_chairman" ON "public"."soil_fertilizer_centers" USING "gin" ("chairman" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_centers_district" ON "public"."soil_fertilizer_centers" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_centers_main_crop" ON "public"."soil_fertilizer_centers" USING "gin" ("main_crop_type" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_centers_name" ON "public"."soil_fertilizer_centers" USING "gin" ("center_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_centers_subdistrict" ON "public"."soil_fertilizer_centers" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_code" ON "public"."soil_series" USING "gin" ("soil_series_code" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_district" ON "public"."soil_series" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_fertility" ON "public"."soil_series" USING "gin" ("fertility" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_group" ON "public"."soil_series" USING "gin" ("soil_group" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_name" ON "public"."soil_series" USING "gin" ("soil_series_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_ph_top" ON "public"."soil_series" USING "gin" ("ph_top" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_soil_series_texture" ON "public"."soil_series" USING "gin" ("texture" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_farmer_groups_chairman" ON "public"."young_farmer_groups" USING "gin" ("chairman" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_farmer_groups_district" ON "public"."young_farmer_groups" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_farmer_groups_name" ON "public"."young_farmer_groups" USING "gin" ("group_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_farmer_groups_notes" ON "public"."young_farmer_groups" USING "gin" ("notes" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_groups_activity" ON "public"."young_farmer_groups_detailed" USING "gin" ("activity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_groups_district" ON "public"."young_farmer_groups_detailed" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_groups_group_name" ON "public"."young_farmer_groups_detailed" USING "gin" ("group_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_groups_potential" ON "public"."young_farmer_groups_detailed" USING "gin" ("potential_level" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_groups_record_code" ON "public"."young_farmer_groups_detailed" USING "gin" ("record_code" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_young_groups_subdistrict" ON "public"."young_farmer_groups_detailed" USING "gin" ("subdistrict" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ysf_activity" ON "public"."young_smart_farmer_ysf" USING "gin" ("agricultural_activity" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ysf_district" ON "public"."young_smart_farmer_ysf" USING "gin" ("district" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ysf_province" ON "public"."young_smart_farmer_ysf" USING "gin" ("province" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ysf_record_code" ON "public"."young_smart_farmer_ysf" USING "gin" ("record_code" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ysf_standard" ON "public"."young_smart_farmer_ysf" USING "gin" ("production_standard" "public"."gin_trgm_ops");



CREATE INDEX "idx_gin_ysf_status" ON "public"."young_smart_farmer_ysf" USING "gin" ("farmer_status" "public"."gin_trgm_ops");



CREATE INDEX "idx_housewife_farmer_groups_custom_fields" ON "public"."housewife_farmer_groups" USING "gin" ("custom_fields");



CREATE INDEX "idx_large_plots_custom_fields" ON "public"."large_plots" USING "gin" ("custom_fields");



CREATE INDEX "idx_learning_centers_custom_fields" ON "public"."learning_centers" USING "gin" ("custom_fields");



CREATE INDEX "idx_pest_centers_custom_fields" ON "public"."pest_centers" USING "gin" ("custom_fields");



CREATE INDEX "idx_pest_outbreaks_custom_fields" ON "public"."pest_outbreaks" USING "gin" ("custom_fields");



CREATE INDEX "idx_plant_doctors_custom_fields" ON "public"."plant_doctors" USING "gin" ("custom_fields");



CREATE INDEX "idx_plant_doctors_district" ON "public"."plant_doctors" USING "btree" ("district");



CREATE INDEX "idx_plant_doctors_full_name" ON "public"."plant_doctors" USING "btree" ("full_name");



CREATE INDEX "idx_smart_farmer_sf_activity" ON "public"."smart_farmer_sf" USING "btree" ("agricultural_activity");



CREATE INDEX "idx_smart_farmer_sf_custom_fields" ON "public"."smart_farmer_sf" USING "gin" ("custom_fields");



CREATE INDEX "idx_smart_farmer_sf_district" ON "public"."smart_farmer_sf" USING "btree" ("district");



CREATE INDEX "idx_smart_farmer_sf_year" ON "public"."smart_farmer_sf" USING "btree" ("data_year");



CREATE INDEX "idx_smart_farmers_custom_fields" ON "public"."smart_farmers" USING "gin" ("custom_fields");



CREATE INDEX "idx_soil_fertilizer_centers_custom_fields" ON "public"."soil_fertilizer_centers" USING "gin" ("custom_fields");



CREATE INDEX "idx_visitor_events_country_region" ON "public"."visitor_events" USING "btree" ("country_code", "region", "occurred_at" DESC);



CREATE INDEX "idx_visitor_events_occurred_at" ON "public"."visitor_events" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_yfg_detailed_district" ON "public"."young_farmer_groups_detailed" USING "btree" ("district");



CREATE INDEX "idx_yfg_detailed_potential" ON "public"."young_farmer_groups_detailed" USING "btree" ("potential_level");



CREATE INDEX "idx_yfg_detailed_year" ON "public"."young_farmer_groups_detailed" USING "btree" ("data_year");



CREATE INDEX "idx_young_farmer_groups_custom_fields" ON "public"."young_farmer_groups" USING "gin" ("custom_fields");



CREATE INDEX "idx_young_farmer_groups_detailed_custom_fields" ON "public"."young_farmer_groups_detailed" USING "gin" ("custom_fields");



CREATE INDEX "idx_young_smart_farmer_ysf_activity" ON "public"."young_smart_farmer_ysf" USING "btree" ("agricultural_activity");



CREATE INDEX "idx_young_smart_farmer_ysf_custom_fields" ON "public"."young_smart_farmer_ysf" USING "gin" ("custom_fields");



CREATE INDEX "idx_young_smart_farmer_ysf_district" ON "public"."young_smart_farmer_ysf" USING "btree" ("district");



CREATE INDEX "idx_young_smart_farmer_ysf_year" ON "public"."young_smart_farmer_ysf" USING "btree" ("data_year");



CREATE INDEX "line_ai_cache_expiry_idx" ON "public"."line_ai_cache" USING "btree" ("expires_at");



CREATE INDEX "line_ai_usage_user_type_created_idx" ON "public"."line_ai_usage" USING "btree" ("line_user_id", "usage_type", "created_at" DESC);



CREATE INDEX "line_conversations_user_created_idx" ON "public"."line_conversations" USING "btree" ("line_user_id", "created_at" DESC);



CREATE INDEX "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "soil_series_district_idx" ON "public"."soil_series" USING "btree" ("district");



CREATE INDEX "soil_series_group_idx" ON "public"."soil_series" USING "btree" ("soil_group");



CREATE INDEX "soil_series_name_idx" ON "public"."soil_series" USING "btree" ("soil_series_name");



CREATE OR REPLACE TRIGGER "trg_custom_field_definition_metadata" BEFORE INSERT OR UPDATE ON "public"."custom_field_definitions" FOR EACH ROW EXECUTE FUNCTION "public"."set_custom_field_definition_metadata"();



CREATE OR REPLACE TRIGGER "trg_custom_field_definition_rules" BEFORE INSERT OR UPDATE ON "public"."custom_field_definitions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_custom_field_definition_rules"();



CREATE OR REPLACE TRIGGER "trigger_recalculate_province_total" AFTER INSERT OR DELETE OR UPDATE ON "public"."farmer_registry" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_province_total"();



CREATE OR REPLACE TRIGGER "update_farmer_registry_updated_at" BEFORE UPDATE ON "public"."farmer_registry" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."custom_field_definitions"
    ADD CONSTRAINT "custom_field_definitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_request_assignments"
    ADD CONSTRAINT "data_request_assignments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."data_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_request_responses"
    ADD CONSTRAINT "data_request_responses_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."data_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_request_responses"
    ADD CONSTRAINT "data_request_responses_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_requests"
    ADD CONSTRAINT "data_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forum_comments"
    ADD CONSTRAINT "forum_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_account_links"
    ADD CONSTRAINT "line_account_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_link_codes"
    ADD CONSTRAINT "line_link_codes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."website_evaluations"
    ADD CONSTRAINT "website_evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Admin full access data_request_assignments" ON "public"."data_request_assignments" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin full access data_request_responses" ON "public"."data_request_responses" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin full access data_requests" ON "public"."data_requests" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin manage custom fields" ON "public"."custom_field_definitions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admin read visitor_events" ON "public"."visitor_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage GIS areas" ON "public"."gis_areas" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage KPI plans" ON "public"."kpi_plans" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage agricultural areas" ON "public"."agricultural_areas" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage agricultural tourism spots" ON "public"."agri_tourism" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage all profiles" ON "public"."profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage assets" ON "public"."assets" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage biocontrol stock" ON "public"."biocontrol_stock" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage budgets" ON "public"."budgets" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage certifications" ON "public"."certifications" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage community enterprises" ON "public"."community_enterprises" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage crop production" ON "public"."crop_production" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage disasters" ON "public"."disasters" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage farmer groups" ON "public"."farmer_groups" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage farmer registry" ON "public"."farmer_registry" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage fire hotspots" ON "public"."fire_hotspots" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage forecast plots" ON "public"."forecast_plots" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage large plots" ON "public"."large_plots" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage learning centers" ON "public"."learning_centers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage personnel" ON "public"."personnel" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage pest centers" ON "public"."pest_centers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage pest outbreaks" ON "public"."pest_outbreaks" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage plant doctors" ON "public"."plant_doctors" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage smart farmers" ON "public"."smart_farmers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage soil fertilizer centers" ON "public"."soil_fertilizer_centers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Allow admin delete agricultural career groups" ON "public"."agricultural_career_groups" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admin delete evaluations" ON "public"."website_evaluations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admin delete housewife farmer groups" ON "public"."housewife_farmer_groups" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admin delete young smart farmer ysf" ON "public"."young_smart_farmer_ysf" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow admin select evaluations" ON "public"."website_evaluations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow authenticated read farmer registry snapshots" ON "public"."farmer_registry_snapshots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated read geoplots parcel progress" ON "public"."geoplots_parcel_progress" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated write smart farmer sf" ON "public"."smart_farmer_sf" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated write young farmer groups detailed" ON "public"."young_farmer_groups_detailed" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow editor insert agricultural career groups" ON "public"."agricultural_career_groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Allow editor insert housewife farmer groups" ON "public"."housewife_farmer_groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Allow editor insert young smart farmer ysf" ON "public"."young_smart_farmer_ysf" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Allow editor update agricultural career groups" ON "public"."agricultural_career_groups" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Allow editor update housewife farmer groups" ON "public"."housewife_farmer_groups" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Allow editor update young smart farmer ysf" ON "public"."young_smart_farmer_ysf" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'editor'::"text"]))))));



CREATE POLICY "Allow public insert evaluations" ON "public"."website_evaluations" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow public read agricultural career groups" ON "public"."agricultural_career_groups" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read ai_disease_forecasts" ON "public"."ai_disease_forecasts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read farmer registry snapshots" ON "public"."farmer_registry_snapshots" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow public read farmer registry subdistrict snapshots" ON "public"."farmer_registry_subdistrict_snapshots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read farmer registry subdistricts" ON "public"."farmer_registry_subdistricts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read forecast plots" ON "public"."forecast_plots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read geoplots parcel progress" ON "public"."geoplots_parcel_progress" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow public read geoplots parcel subdistrict progress" ON "public"."geoplots_parcel_subdistrict_progress" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read housewife farmer groups" ON "public"."housewife_farmer_groups" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read smart farmer sf" ON "public"."smart_farmer_sf" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read young farmer groups detailed" ON "public"."young_farmer_groups_detailed" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read young smart farmer ysf" ON "public"."young_smart_farmer_ysf" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Anyone can view fire hotspots" ON "public"."fire_hotspots" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Authenticated users can create audit logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Editor read assigned data_requests" ON "public"."data_requests" FOR SELECT TO "authenticated" USING ((("public"."current_profile_role"() = 'editor'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."data_request_assignments" "a"
  WHERE (("a"."request_id" = "data_requests"."id") AND ("a"."district" = "public"."current_profile_department"()))))));



CREATE POLICY "Editor read own data_request_assignments" ON "public"."data_request_assignments" FOR SELECT TO "authenticated" USING ((("public"."current_profile_role"() = 'editor'::"text") AND ("district" = "public"."current_profile_department"())));



CREATE POLICY "Editor upsert own data_request_responses" ON "public"."data_request_responses" TO "authenticated" USING ((("public"."current_profile_role"() = 'editor'::"text") AND ("district" = "public"."current_profile_department"()))) WITH CHECK ((("public"."current_profile_role"() = 'editor'::"text") AND ("district" = "public"."current_profile_department"())));



CREATE POLICY "Enable insert access for all" ON "public"."daily_weather" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."forum_comments" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."forum_posts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable public read" ON "public"."agri_tourism" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."agricultural_areas" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."community_enterprises" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."gis_areas" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."large_plots" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."learning_centers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."pest_centers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."plant_doctors" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."smart_farmers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable public read" ON "public"."soil_fertilizer_centers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."daily_weather" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."forum_comments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."forum_posts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."site_statistics" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all" ON "public"."daily_weather" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."forum_comments" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."forum_posts" FOR UPDATE USING (true);



CREATE POLICY "Enable update for all users" ON "public"."site_statistics" FOR UPDATE USING (true);



CREATE POLICY "Forecast plots public read" ON "public"."forecast_plots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Profiles read own or admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Profiles update own basic profile or admin" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read agri_tourism" ON "public"."agri_tourism" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read agricultural_areas" ON "public"."agricultural_areas" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read agricultural_career_groups" ON "public"."agricultural_career_groups" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read assets" ON "public"."assets" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read biocontrol_stock" ON "public"."biocontrol_stock" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read budgets" ON "public"."budgets" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read certifications" ON "public"."certifications" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read coconut_aromatic_surveys" ON "public"."coconut_aromatic_surveys" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read community_enterprises" ON "public"."community_enterprises" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read crop_production" ON "public"."crop_production" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read daily_weather" ON "public"."daily_weather" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read disasters" ON "public"."disasters" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read farmer_groups" ON "public"."farmer_groups" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read farmer_registry" ON "public"."farmer_registry" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read fire_hotspots" ON "public"."fire_hotspots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read forecast_plots" ON "public"."forecast_plots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read forum_comments" ON "public"."forum_comments" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read forum_posts" ON "public"."forum_posts" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read gis_areas" ON "public"."gis_areas" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read housewife_farmer_groups" ON "public"."housewife_farmer_groups" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read large_plots" ON "public"."large_plots" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read learning_centers" ON "public"."learning_centers" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read personnel" ON "public"."personnel" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read pest_centers" ON "public"."pest_centers" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read pest_outbreaks" ON "public"."pest_outbreaks" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read plant_doctors" ON "public"."plant_doctors" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read production_costs" ON "public"."production_costs" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read site_statistics" ON "public"."site_statistics" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read smart_farmer_sf" ON "public"."smart_farmer_sf" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read smart_farmers" ON "public"."smart_farmers" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read soil_fertilizer_centers" ON "public"."soil_fertilizer_centers" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read young_farmer_groups" ON "public"."young_farmer_groups" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read young_farmer_groups_detailed" ON "public"."young_farmer_groups_detailed" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read young_smart_farmer_ysf" ON "public"."young_smart_farmer_ysf" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Role delete agri_tourism" ON "public"."agri_tourism" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete agricultural_areas" ON "public"."agricultural_areas" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete agricultural_career_groups" ON "public"."agricultural_career_groups" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete ai_disease_forecasts" ON "public"."ai_disease_forecasts" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete assets" ON "public"."assets" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete biocontrol_stock" ON "public"."biocontrol_stock" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete budgets" ON "public"."budgets" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete certifications" ON "public"."certifications" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete coconut_aromatic_surveys" ON "public"."coconut_aromatic_surveys" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete community_enterprises" ON "public"."community_enterprises" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete crop_production" ON "public"."crop_production" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete daily_weather" ON "public"."daily_weather" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete disasters" ON "public"."disasters" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete farmer_groups" ON "public"."farmer_groups" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete farmer_registry" ON "public"."farmer_registry" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete farmer_registry_snapshots" ON "public"."farmer_registry_snapshots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete farmer_registry_subdistrict_snapshots" ON "public"."farmer_registry_subdistrict_snapshots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete farmer_registry_subdistricts" ON "public"."farmer_registry_subdistricts" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete fire_hotspots" ON "public"."fire_hotspots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete forecast_plots" ON "public"."forecast_plots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete geoplots_parcel_progress" ON "public"."geoplots_parcel_progress" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete geoplots_parcel_subdistrict_progress" ON "public"."geoplots_parcel_subdistrict_progress" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete gis_areas" ON "public"."gis_areas" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete housewife_farmer_groups" ON "public"."housewife_farmer_groups" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete large_plots" ON "public"."large_plots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete learning_centers" ON "public"."learning_centers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete personnel" ON "public"."personnel" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete pest_centers" ON "public"."pest_centers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete pest_outbreaks" ON "public"."pest_outbreaks" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete plant_doctors" ON "public"."plant_doctors" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete production_costs" ON "public"."production_costs" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete smart_farmer_sf" ON "public"."smart_farmer_sf" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete smart_farmers" ON "public"."smart_farmers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete soil_fertilizer_centers" ON "public"."soil_fertilizer_centers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete soil_series" ON "public"."soil_series" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete young_farmer_groups" ON "public"."young_farmer_groups" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete young_farmer_groups_detailed" ON "public"."young_farmer_groups_detailed" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role delete young_smart_farmer_ysf" ON "public"."young_smart_farmer_ysf" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Role insert agri_tourism" ON "public"."agri_tourism" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('agri_tourism'::"text"));



CREATE POLICY "Role insert agricultural_areas" ON "public"."agricultural_areas" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('agricultural_areas'::"text"));



CREATE POLICY "Role insert agricultural_career_groups" ON "public"."agricultural_career_groups" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('agricultural_career_groups'::"text"));



CREATE POLICY "Role insert ai_disease_forecasts" ON "public"."ai_disease_forecasts" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('ai_disease_forecasts'::"text"));



CREATE POLICY "Role insert assets" ON "public"."assets" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('assets'::"text"));



CREATE POLICY "Role insert biocontrol_stock" ON "public"."biocontrol_stock" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('biocontrol_stock'::"text"));



CREATE POLICY "Role insert budgets" ON "public"."budgets" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('budgets'::"text"));



CREATE POLICY "Role insert certifications" ON "public"."certifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('certifications'::"text"));



CREATE POLICY "Role insert coconut_aromatic_surveys" ON "public"."coconut_aromatic_surveys" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_editor"());



CREATE POLICY "Role insert community_enterprises" ON "public"."community_enterprises" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('community_enterprises'::"text"));



CREATE POLICY "Role insert crop_production" ON "public"."crop_production" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('crop_production'::"text"));



CREATE POLICY "Role insert daily_weather" ON "public"."daily_weather" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('daily_weather'::"text"));



CREATE POLICY "Role insert disasters" ON "public"."disasters" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('disasters'::"text"));



CREATE POLICY "Role insert farmer_groups" ON "public"."farmer_groups" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('farmer_groups'::"text"));



CREATE POLICY "Role insert farmer_registry" ON "public"."farmer_registry" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('farmer_registry'::"text"));



CREATE POLICY "Role insert farmer_registry_snapshots" ON "public"."farmer_registry_snapshots" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('farmer_registry_snapshots'::"text"));



CREATE POLICY "Role insert farmer_registry_subdistrict_snapshots" ON "public"."farmer_registry_subdistrict_snapshots" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('farmer_registry_subdistrict_snapshots'::"text"));



CREATE POLICY "Role insert farmer_registry_subdistricts" ON "public"."farmer_registry_subdistricts" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('farmer_registry_subdistricts'::"text"));



CREATE POLICY "Role insert fire_hotspots" ON "public"."fire_hotspots" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('fire_hotspots'::"text"));



CREATE POLICY "Role insert forecast_plots" ON "public"."forecast_plots" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('forecast_plots'::"text"));



CREATE POLICY "Role insert geoplots_parcel_progress" ON "public"."geoplots_parcel_progress" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('geoplots_parcel_progress'::"text"));



CREATE POLICY "Role insert geoplots_parcel_subdistrict_progress" ON "public"."geoplots_parcel_subdistrict_progress" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('geoplots_parcel_subdistrict_progress'::"text"));



CREATE POLICY "Role insert gis_areas" ON "public"."gis_areas" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('gis_areas'::"text"));



CREATE POLICY "Role insert housewife_farmer_groups" ON "public"."housewife_farmer_groups" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('housewife_farmer_groups'::"text"));



CREATE POLICY "Role insert large_plots" ON "public"."large_plots" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('large_plots'::"text"));



CREATE POLICY "Role insert learning_centers" ON "public"."learning_centers" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('learning_centers'::"text"));



CREATE POLICY "Role insert personnel" ON "public"."personnel" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('personnel'::"text"));



CREATE POLICY "Role insert pest_centers" ON "public"."pest_centers" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('pest_centers'::"text"));



CREATE POLICY "Role insert pest_outbreaks" ON "public"."pest_outbreaks" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('pest_outbreaks'::"text"));



CREATE POLICY "Role insert plant_doctors" ON "public"."plant_doctors" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('plant_doctors'::"text"));



CREATE POLICY "Role insert production_costs" ON "public"."production_costs" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('production_costs'::"text"));



CREATE POLICY "Role insert smart_farmer_sf" ON "public"."smart_farmer_sf" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('smart_farmer_sf'::"text"));



CREATE POLICY "Role insert smart_farmers" ON "public"."smart_farmers" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('smart_farmers'::"text"));



CREATE POLICY "Role insert soil_fertilizer_centers" ON "public"."soil_fertilizer_centers" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('soil_fertilizer_centers'::"text"));



CREATE POLICY "Role insert soil_series" ON "public"."soil_series" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('soil_series'::"text"));



CREATE POLICY "Role insert young_farmer_groups" ON "public"."young_farmer_groups" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('young_farmer_groups'::"text"));



CREATE POLICY "Role insert young_farmer_groups_detailed" ON "public"."young_farmer_groups_detailed" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('young_farmer_groups_detailed'::"text"));



CREATE POLICY "Role insert young_smart_farmer_ysf" ON "public"."young_smart_farmer_ysf" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_write_table"('young_smart_farmer_ysf'::"text"));



CREATE POLICY "Role read agri_tourism" ON "public"."agri_tourism" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read agricultural_areas" ON "public"."agricultural_areas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read agricultural_career_groups" ON "public"."agricultural_career_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read ai_disease_forecasts" ON "public"."ai_disease_forecasts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read assets" ON "public"."assets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read biocontrol_stock" ON "public"."biocontrol_stock" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read budgets" ON "public"."budgets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read certifications" ON "public"."certifications" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read coconut_aromatic_surveys" ON "public"."coconut_aromatic_surveys" FOR SELECT TO "authenticated" USING ("public"."is_viewer"());



CREATE POLICY "Role read community_enterprises" ON "public"."community_enterprises" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read crop_production" ON "public"."crop_production" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read daily_weather" ON "public"."daily_weather" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read disasters" ON "public"."disasters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read farmer_groups" ON "public"."farmer_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read farmer_registry" ON "public"."farmer_registry" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read farmer_registry_snapshots" ON "public"."farmer_registry_snapshots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read farmer_registry_subdistrict_snapshots" ON "public"."farmer_registry_subdistrict_snapshots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read farmer_registry_subdistricts" ON "public"."farmer_registry_subdistricts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read fire_hotspots" ON "public"."fire_hotspots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read forecast_plots" ON "public"."forecast_plots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read geoplots_parcel_progress" ON "public"."geoplots_parcel_progress" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read geoplots_parcel_subdistrict_progress" ON "public"."geoplots_parcel_subdistrict_progress" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read gis_areas" ON "public"."gis_areas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read housewife_farmer_groups" ON "public"."housewife_farmer_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read large_plots" ON "public"."large_plots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read learning_centers" ON "public"."learning_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read personnel" ON "public"."personnel" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read pest_centers" ON "public"."pest_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read pest_outbreaks" ON "public"."pest_outbreaks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read plant_doctors" ON "public"."plant_doctors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read production_costs" ON "public"."production_costs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read smart_farmer_sf" ON "public"."smart_farmer_sf" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read smart_farmers" ON "public"."smart_farmers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read soil_fertilizer_centers" ON "public"."soil_fertilizer_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read soil_series" ON "public"."soil_series" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read young_farmer_groups" ON "public"."young_farmer_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read young_farmer_groups_detailed" ON "public"."young_farmer_groups_detailed" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role read young_smart_farmer_ysf" ON "public"."young_smart_farmer_ysf" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Role update agri_tourism" ON "public"."agri_tourism" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('agri_tourism'::"text")) WITH CHECK ("public"."can_write_table"('agri_tourism'::"text"));



CREATE POLICY "Role update agricultural_areas" ON "public"."agricultural_areas" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('agricultural_areas'::"text")) WITH CHECK ("public"."can_write_table"('agricultural_areas'::"text"));



CREATE POLICY "Role update agricultural_career_groups" ON "public"."agricultural_career_groups" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('agricultural_career_groups'::"text")) WITH CHECK ("public"."can_write_table"('agricultural_career_groups'::"text"));



CREATE POLICY "Role update ai_disease_forecasts" ON "public"."ai_disease_forecasts" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('ai_disease_forecasts'::"text")) WITH CHECK ("public"."can_write_table"('ai_disease_forecasts'::"text"));



CREATE POLICY "Role update assets" ON "public"."assets" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('assets'::"text")) WITH CHECK ("public"."can_write_table"('assets'::"text"));



CREATE POLICY "Role update biocontrol_stock" ON "public"."biocontrol_stock" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('biocontrol_stock'::"text")) WITH CHECK ("public"."can_write_table"('biocontrol_stock'::"text"));



CREATE POLICY "Role update budgets" ON "public"."budgets" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('budgets'::"text")) WITH CHECK ("public"."can_write_table"('budgets'::"text"));



CREATE POLICY "Role update certifications" ON "public"."certifications" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('certifications'::"text")) WITH CHECK ("public"."can_write_table"('certifications'::"text"));



CREATE POLICY "Role update coconut_aromatic_surveys" ON "public"."coconut_aromatic_surveys" FOR UPDATE TO "authenticated" USING ("public"."is_editor"()) WITH CHECK ("public"."is_editor"());



CREATE POLICY "Role update community_enterprises" ON "public"."community_enterprises" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('community_enterprises'::"text")) WITH CHECK ("public"."can_write_table"('community_enterprises'::"text"));



CREATE POLICY "Role update crop_production" ON "public"."crop_production" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('crop_production'::"text")) WITH CHECK ("public"."can_write_table"('crop_production'::"text"));



CREATE POLICY "Role update daily_weather" ON "public"."daily_weather" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('daily_weather'::"text")) WITH CHECK ("public"."can_write_table"('daily_weather'::"text"));



CREATE POLICY "Role update disasters" ON "public"."disasters" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('disasters'::"text")) WITH CHECK ("public"."can_write_table"('disasters'::"text"));



CREATE POLICY "Role update farmer_groups" ON "public"."farmer_groups" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('farmer_groups'::"text")) WITH CHECK ("public"."can_write_table"('farmer_groups'::"text"));



CREATE POLICY "Role update farmer_registry" ON "public"."farmer_registry" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('farmer_registry'::"text")) WITH CHECK ("public"."can_write_table"('farmer_registry'::"text"));



CREATE POLICY "Role update farmer_registry_snapshots" ON "public"."farmer_registry_snapshots" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('farmer_registry_snapshots'::"text")) WITH CHECK ("public"."can_write_table"('farmer_registry_snapshots'::"text"));



CREATE POLICY "Role update farmer_registry_subdistrict_snapshots" ON "public"."farmer_registry_subdistrict_snapshots" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('farmer_registry_subdistrict_snapshots'::"text")) WITH CHECK ("public"."can_write_table"('farmer_registry_subdistrict_snapshots'::"text"));



CREATE POLICY "Role update farmer_registry_subdistricts" ON "public"."farmer_registry_subdistricts" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('farmer_registry_subdistricts'::"text")) WITH CHECK ("public"."can_write_table"('farmer_registry_subdistricts'::"text"));



CREATE POLICY "Role update fire_hotspots" ON "public"."fire_hotspots" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('fire_hotspots'::"text")) WITH CHECK ("public"."can_write_table"('fire_hotspots'::"text"));



CREATE POLICY "Role update forecast_plots" ON "public"."forecast_plots" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('forecast_plots'::"text")) WITH CHECK ("public"."can_write_table"('forecast_plots'::"text"));



CREATE POLICY "Role update geoplots_parcel_progress" ON "public"."geoplots_parcel_progress" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('geoplots_parcel_progress'::"text")) WITH CHECK ("public"."can_write_table"('geoplots_parcel_progress'::"text"));



CREATE POLICY "Role update geoplots_parcel_subdistrict_progress" ON "public"."geoplots_parcel_subdistrict_progress" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('geoplots_parcel_subdistrict_progress'::"text")) WITH CHECK ("public"."can_write_table"('geoplots_parcel_subdistrict_progress'::"text"));



CREATE POLICY "Role update gis_areas" ON "public"."gis_areas" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('gis_areas'::"text")) WITH CHECK ("public"."can_write_table"('gis_areas'::"text"));



CREATE POLICY "Role update housewife_farmer_groups" ON "public"."housewife_farmer_groups" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('housewife_farmer_groups'::"text")) WITH CHECK ("public"."can_write_table"('housewife_farmer_groups'::"text"));



CREATE POLICY "Role update large_plots" ON "public"."large_plots" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('large_plots'::"text")) WITH CHECK ("public"."can_write_table"('large_plots'::"text"));



CREATE POLICY "Role update learning_centers" ON "public"."learning_centers" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('learning_centers'::"text")) WITH CHECK ("public"."can_write_table"('learning_centers'::"text"));



CREATE POLICY "Role update personnel" ON "public"."personnel" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('personnel'::"text")) WITH CHECK ("public"."can_write_table"('personnel'::"text"));



CREATE POLICY "Role update pest_centers" ON "public"."pest_centers" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('pest_centers'::"text")) WITH CHECK ("public"."can_write_table"('pest_centers'::"text"));



CREATE POLICY "Role update pest_outbreaks" ON "public"."pest_outbreaks" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('pest_outbreaks'::"text")) WITH CHECK ("public"."can_write_table"('pest_outbreaks'::"text"));



CREATE POLICY "Role update plant_doctors" ON "public"."plant_doctors" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('plant_doctors'::"text")) WITH CHECK ("public"."can_write_table"('plant_doctors'::"text"));



CREATE POLICY "Role update production_costs" ON "public"."production_costs" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('production_costs'::"text")) WITH CHECK ("public"."can_write_table"('production_costs'::"text"));



CREATE POLICY "Role update smart_farmer_sf" ON "public"."smart_farmer_sf" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('smart_farmer_sf'::"text")) WITH CHECK ("public"."can_write_table"('smart_farmer_sf'::"text"));



CREATE POLICY "Role update smart_farmers" ON "public"."smart_farmers" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('smart_farmers'::"text")) WITH CHECK ("public"."can_write_table"('smart_farmers'::"text"));



CREATE POLICY "Role update soil_fertilizer_centers" ON "public"."soil_fertilizer_centers" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('soil_fertilizer_centers'::"text")) WITH CHECK ("public"."can_write_table"('soil_fertilizer_centers'::"text"));



CREATE POLICY "Role update soil_series" ON "public"."soil_series" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('soil_series'::"text")) WITH CHECK ("public"."can_write_table"('soil_series'::"text"));



CREATE POLICY "Role update young_farmer_groups" ON "public"."young_farmer_groups" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('young_farmer_groups'::"text")) WITH CHECK ("public"."can_write_table"('young_farmer_groups'::"text"));



CREATE POLICY "Role update young_farmer_groups_detailed" ON "public"."young_farmer_groups_detailed" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('young_farmer_groups_detailed'::"text")) WITH CHECK ("public"."can_write_table"('young_farmer_groups_detailed'::"text"));



CREATE POLICY "Role update young_smart_farmer_ysf" ON "public"."young_smart_farmer_ysf" FOR UPDATE TO "authenticated" USING ("public"."can_write_table"('young_smart_farmer_ysf'::"text")) WITH CHECK ("public"."can_write_table"('young_smart_farmer_ysf'::"text"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view GIS areas" ON "public"."gis_areas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view KPI plans" ON "public"."kpi_plans" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view agricultural areas" ON "public"."agricultural_areas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view agricultural tourism spots" ON "public"."agri_tourism" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view assets" ON "public"."assets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view biocontrol stock" ON "public"."biocontrol_stock" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view budgets" ON "public"."budgets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view certifications" ON "public"."certifications" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view community enterprises" ON "public"."community_enterprises" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view crop production" ON "public"."crop_production" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view disasters" ON "public"."disasters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view farmer groups" ON "public"."farmer_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view farmer registry" ON "public"."farmer_registry" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view fire hotspots" ON "public"."fire_hotspots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view forecast plots" ON "public"."forecast_plots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view large plots" ON "public"."large_plots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view learning centers" ON "public"."learning_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view personnel" ON "public"."personnel" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view pest centers" ON "public"."pest_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view pest outbreaks" ON "public"."pest_outbreaks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view plant doctors" ON "public"."plant_doctors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view smart farmers" ON "public"."smart_farmers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view soil fertilizer centers" ON "public"."soil_fertilizer_centers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users manage their push subscriptions" ON "public"."push_subscriptions" TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Visible custom fields readable" ON "public"."custom_field_definitions" FOR SELECT USING ((("archived_at" IS NULL) AND ("is_visible" = true)));



ALTER TABLE "public"."agri_tourism" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agricultural_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agricultural_career_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_disease_forecasts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."biocontrol_stock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."certifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coconut_aromatic_surveys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_enterprises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crop_production" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_field_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_weather" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_request_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_request_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."data_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disasters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "edit coconut aromatic surveys" ON "public"."coconut_aromatic_surveys" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."farmer_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farmer_registry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farmer_registry_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farmer_registry_subdistrict_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farmer_registry_subdistricts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fire_hotspots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forecast_plots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forum_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geoplots_parcel_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geoplots_parcel_subdistrict_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gis_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."housewife_farmer_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kpi_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."large_plots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."learning_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_account_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_ai_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_ai_key_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_ai_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_link_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personnel" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pest_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pest_outbreaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plant_doctors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_alert_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read coconut aromatic surveys" ON "public"."coconut_aromatic_surveys" FOR SELECT USING (true);



ALTER TABLE "public"."site_statistics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."smart_farmer_sf" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."smart_farmers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."soil_fertilizer_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."soil_series" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "soil_series_public_read" ON "public"."soil_series" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."visitor_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."website_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."young_farmer_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."young_farmer_groups_detailed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."young_smart_farmer_ysf" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_write_table"("target_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_write_table"("target_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_write_table"("target_table" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_api_rate_limit"("p_rate_key" "text", "p_limit" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_api_rate_limit"("p_rate_key" "text", "p_limit" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_line_ai_quota"("p_user_id" "text", "p_kind" "text", "p_daily_limit" integer, "p_window_limit" integer, "p_window_seconds" integer, "p_key_slot" smallint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_line_ai_quota"("p_user_id" "text", "p_kind" "text", "p_daily_limit" integer, "p_window_limit" integer, "p_window_seconds" integer, "p_key_slot" smallint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_line_link_code"("p_code_hash" "text", "p_line_user_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_line_link_code"("p_code_hash" "text", "p_line_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile_department"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_department"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_department"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_custom_field_definition_as_service"("p_definition_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_custom_field_definition_as_service"("p_definition_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_custom_field_definition_as_service"("p_definition_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."enforce_custom_field_definition_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_custom_field_definition_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_custom_field_definition_rules"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."execute_sql_query"("query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."execute_sql_query"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."global_search"("search_term" "text", "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."global_search"("search_term" "text", "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."global_search"("search_term" "text", "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."global_search_public"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."global_search_public"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."global_search_public"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."global_search_staff"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."global_search_staff"("search_terms" "text"[], "table_names" "text"[], "result_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_site_visit"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_site_visit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_site_visit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_editor"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_editor"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_editor"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_viewer"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_viewer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_viewer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_province_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_province_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_province_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_custom_field_definition_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_custom_field_definition_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_custom_field_definition_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."agri_tourism" TO "anon";
GRANT ALL ON TABLE "public"."agri_tourism" TO "authenticated";
GRANT ALL ON TABLE "public"."agri_tourism" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("spot_name") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("district") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("spot_type") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("latitude") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("longitude") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("description") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("notes") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."agri_tourism" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."agri_tourism" TO "anon";



GRANT ALL ON TABLE "public"."agricultural_areas" TO "anon";
GRANT ALL ON TABLE "public"."agricultural_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."agricultural_areas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agricultural_areas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agricultural_areas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agricultural_areas_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."agricultural_career_groups" TO "anon";
GRANT ALL ON TABLE "public"."agricultural_career_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."agricultural_career_groups" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("data_year") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("record_code") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("group_name") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("subdistrict") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("district") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("province") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("established_date") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("established_date_ce") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("established_year_be") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("member_count") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("community_enterprise_registration") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("fund_management") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("income") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("activity") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("main_activity") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("production_standard") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("potential_level") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("lat") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("lon") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."agricultural_career_groups" TO "anon";



GRANT ALL ON TABLE "public"."ai_disease_forecasts" TO "anon";
GRANT ALL ON TABLE "public"."ai_disease_forecasts" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_disease_forecasts" TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."biocontrol_stock" TO "anon";
GRANT ALL ON TABLE "public"."biocontrol_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."biocontrol_stock" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."certifications" TO "anon";
GRANT ALL ON TABLE "public"."certifications" TO "authenticated";
GRANT ALL ON TABLE "public"."certifications" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("cert_date") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("exp_date") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("farmer_name") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("plot_code") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("crop_name") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("plot_type") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("area_rai") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("production_volume_kg") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("plot_moo") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("plot_subdistrict") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("plot_district") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("farmer_moo") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("farmer_subdistrict") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("farmer_district") ON TABLE "public"."certifications" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."certifications" TO "anon";



GRANT ALL ON SEQUENCE "public"."certifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."certifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."certifications_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."coconut_aromatic_surveys" TO "anon";
GRANT ALL ON TABLE "public"."coconut_aromatic_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."coconut_aromatic_surveys" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("record_date") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("round_no") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("round_label") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("round_start_date") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("round_end_date") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("farmer_code") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("prefix") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("house_no") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("village_no") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("subdistrict") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("district") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("own_area_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("rented_area_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("planted_area_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("production_cost_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("cost_per_fruit") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("standard_fruit_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("standard_percent") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("standard_price_per_fruit") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("standard_income_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("small_fruit_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("small_percent") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("small_price_per_fruit") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("small_income_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("total_fruit_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("income_per_rai") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("total_income") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT SELECT("notes") ON TABLE "public"."coconut_aromatic_surveys" TO "anon";



GRANT ALL ON TABLE "public"."community_enterprises" TO "anon";
GRANT ALL ON TABLE "public"."community_enterprises" TO "authenticated";
GRANT ALL ON TABLE "public"."community_enterprises" TO "service_role";



GRANT ALL ON TABLE "public"."crop_production" TO "anon";
GRANT ALL ON TABLE "public"."crop_production" TO "authenticated";
GRANT ALL ON TABLE "public"."crop_production" TO "service_role";



GRANT ALL ON TABLE "public"."custom_field_definitions" TO "anon";
GRANT ALL ON TABLE "public"."custom_field_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_field_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."daily_weather" TO "anon";
GRANT ALL ON TABLE "public"."daily_weather" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_weather" TO "service_role";



GRANT ALL ON TABLE "public"."data_request_assignments" TO "anon";
GRANT ALL ON TABLE "public"."data_request_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."data_request_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."data_request_responses" TO "anon";
GRANT ALL ON TABLE "public"."data_request_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."data_request_responses" TO "service_role";



GRANT ALL ON TABLE "public"."data_requests" TO "anon";
GRANT ALL ON TABLE "public"."data_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."data_requests" TO "service_role";



GRANT ALL ON TABLE "public"."disasters" TO "anon";
GRANT ALL ON TABLE "public"."disasters" TO "authenticated";
GRANT ALL ON TABLE "public"."disasters" TO "service_role";



GRANT ALL ON TABLE "public"."farmer_groups" TO "anon";
GRANT ALL ON TABLE "public"."farmer_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_groups" TO "service_role";



GRANT ALL ON TABLE "public"."housewife_farmer_groups" TO "anon";
GRANT ALL ON TABLE "public"."housewife_farmer_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."housewife_farmer_groups" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."smart_farmer_sf" TO "anon";
GRANT ALL ON TABLE "public"."smart_farmer_sf" TO "authenticated";
GRANT ALL ON TABLE "public"."smart_farmer_sf" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("data_year") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("record_code") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("sequence_no") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("age") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("district") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("province") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("farmer_status") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("agricultural_activity") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("education") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("production_standard") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("sales_channel") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("production_area") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."smart_farmer_sf" TO "anon";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."young_farmer_groups_detailed" TO "anon";
GRANT ALL ON TABLE "public"."young_farmer_groups_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."young_farmer_groups_detailed" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("data_year") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("record_code") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("group_name") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("subdistrict") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("district") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("province") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("established_date") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("established_year_be") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("established_year_ce") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("member_count") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("model_group") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("fund_management") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("income") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("activity") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("activity_count") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("potential_level") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("lat") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("lon") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."young_farmer_groups_detailed" TO "anon";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."young_smart_farmer_ysf" TO "anon";
GRANT ALL ON TABLE "public"."young_smart_farmer_ysf" TO "authenticated";
GRANT ALL ON TABLE "public"."young_smart_farmer_ysf" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("data_year") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("record_code") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("sequence_no") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("district") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("province") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("education") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("education_major") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("production_area") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("agricultural_activity") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("production_standard") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("farmer_status") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("sales_channel") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("affiliated_district") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("farm_area_rai") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("main_activity_type") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("has_crop") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("has_livestock") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("has_fishery") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("has_processing") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("has_online_channel") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."young_smart_farmer_ysf" TO "anon";



GRANT ALL ON TABLE "public"."farmer_institutes" TO "anon";
GRANT ALL ON TABLE "public"."farmer_institutes" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_institutes" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."farmer_registry" TO "anon";
GRANT ALL ON TABLE "public"."farmer_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_registry" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("district") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("household_count") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("farm_area_rai") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("main_crop") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("data_year") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("notes") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("target") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_tbk_households") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_tbk_plots") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_tbk_area_rai") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_farmbook_households") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_farmbook_plots") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_farmbook_area_rai") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_eform_households") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_eform_plots") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("update_eform_area_rai") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("total_updated_households") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("total_updated_plots") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("total_updated_area_rai") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("cancelled_households") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("net_total_households") ON TABLE "public"."farmer_registry" TO "anon";



GRANT SELECT("cutoff_date") ON TABLE "public"."farmer_registry" TO "anon";



GRANT ALL ON TABLE "public"."farmer_registry_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."farmer_registry_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_registry_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."farmer_registry_subdistrict_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."farmer_registry_subdistrict_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_registry_subdistrict_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."farmer_registry_subdistricts" TO "anon";
GRANT ALL ON TABLE "public"."farmer_registry_subdistricts" TO "authenticated";
GRANT ALL ON TABLE "public"."farmer_registry_subdistricts" TO "service_role";



GRANT ALL ON TABLE "public"."fire_hotspots" TO "anon";
GRANT ALL ON TABLE "public"."fire_hotspots" TO "authenticated";
GRANT ALL ON TABLE "public"."fire_hotspots" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."forecast_plots" TO "anon";
GRANT ALL ON TABLE "public"."forecast_plots" TO "authenticated";
GRANT ALL ON TABLE "public"."forecast_plots" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("row_number") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("province") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("district") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("subdistrict") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("village_no") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("zone") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("coord_x") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("coord_y") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("crop_type") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("variety") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("planted_area_rai") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("planting_date") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("plot_type") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("crop_status") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."forecast_plots" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."forecast_plots" TO "anon";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."forum_comments" TO "anon";
GRANT ALL ON TABLE "public"."forum_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_comments" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."forum_comments" TO "anon";



GRANT SELECT("post_id") ON TABLE "public"."forum_comments" TO "anon";



GRANT SELECT("content") ON TABLE "public"."forum_comments" TO "anon";



GRANT SELECT("likes") ON TABLE "public"."forum_comments" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."forum_comments" TO "anon";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."forum_posts" TO "anon";
GRANT ALL ON TABLE "public"."forum_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."forum_posts" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("title") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("content") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("category") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("district") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("province") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("views") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("likes") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("is_pinned") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."forum_posts" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."forum_posts" TO "anon";



GRANT ALL ON TABLE "public"."geoplots_parcel_progress" TO "anon";
GRANT ALL ON TABLE "public"."geoplots_parcel_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."geoplots_parcel_progress" TO "service_role";



GRANT ALL ON TABLE "public"."geoplots_parcel_subdistrict_progress" TO "anon";
GRANT ALL ON TABLE "public"."geoplots_parcel_subdistrict_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."geoplots_parcel_subdistrict_progress" TO "service_role";



GRANT ALL ON TABLE "public"."gis_areas" TO "anon";
GRANT ALL ON TABLE "public"."gis_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."gis_areas" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_plans" TO "anon";
GRANT ALL ON TABLE "public"."kpi_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_plans" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."large_plots" TO "anon";
GRANT ALL ON TABLE "public"."large_plots" TO "authenticated";
GRANT ALL ON TABLE "public"."large_plots" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("plot_name") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("commodity") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("district") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("member_count") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("area_rai") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("year") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("notes") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("code") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("commodity_group") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("secondary_commodity") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("subdistrict") ON TABLE "public"."large_plots" TO "anon";



GRANT SELECT("agency") ON TABLE "public"."large_plots" TO "anon";



GRANT ALL ON TABLE "public"."learning_centers" TO "anon";
GRANT ALL ON TABLE "public"."learning_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."learning_centers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."learning_centers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."learning_centers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."learning_centers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."line_account_links" TO "service_role";



GRANT ALL ON TABLE "public"."line_ai_cache" TO "service_role";



GRANT ALL ON TABLE "public"."line_ai_key_health" TO "service_role";



GRANT ALL ON TABLE "public"."line_ai_usage" TO "service_role";



GRANT ALL ON SEQUENCE "public"."line_ai_usage_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."line_conversations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."line_conversations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."line_link_codes" TO "service_role";



GRANT ALL ON TABLE "public"."line_user_preferences" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."personnel" TO "anon";
GRANT ALL ON TABLE "public"."personnel" TO "authenticated";
GRANT ALL ON TABLE "public"."personnel" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("position") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("department") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("status") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("notes") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("province") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("district") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("office_type") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("sort_order") ON TABLE "public"."personnel" TO "anon";



GRANT SELECT("executive_training") ON TABLE "public"."personnel" TO "anon";



GRANT ALL ON TABLE "public"."pest_centers" TO "anon";
GRANT ALL ON TABLE "public"."pest_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."pest_centers" TO "service_role";



GRANT ALL ON TABLE "public"."pest_outbreaks" TO "anon";
GRANT ALL ON TABLE "public"."pest_outbreaks" TO "authenticated";
GRANT ALL ON TABLE "public"."pest_outbreaks" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."plant_doctors" TO "anon";
GRANT ALL ON TABLE "public"."plant_doctors" TO "authenticated";
GRANT ALL ON TABLE "public"."plant_doctors" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."plant_doctors" TO "anon";



GRANT SELECT("row_number") ON TABLE "public"."plant_doctors" TO "anon";



GRANT SELECT("subdistrict") ON TABLE "public"."plant_doctors" TO "anon";



GRANT SELECT("district") ON TABLE "public"."plant_doctors" TO "anon";



GRANT SELECT("province") ON TABLE "public"."plant_doctors" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."plant_doctors" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."plant_doctors" TO "anon";



GRANT ALL ON TABLE "public"."production_costs" TO "anon";
GRANT ALL ON TABLE "public"."production_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."production_costs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_alert_events" TO "anon";
GRANT ALL ON TABLE "public"."push_alert_events" TO "authenticated";
GRANT ALL ON TABLE "public"."push_alert_events" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."site_statistics" TO "anon";
GRANT ALL ON TABLE "public"."site_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."site_statistics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."site_statistics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."site_statistics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."site_statistics_id_seq" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."smart_farmers" TO "anon";
GRANT ALL ON TABLE "public"."smart_farmers" TO "authenticated";
GRANT ALL ON TABLE "public"."smart_farmers" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."smart_farmers" TO "anon";



GRANT SELECT("farmer_type") ON TABLE "public"."smart_farmers" TO "anon";



GRANT SELECT("district") ON TABLE "public"."smart_farmers" TO "anon";



GRANT SELECT("main_product") ON TABLE "public"."smart_farmers" TO "anon";



GRANT SELECT("notes") ON TABLE "public"."smart_farmers" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."smart_farmers" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."smart_farmers" TO "anon";



GRANT ALL ON TABLE "public"."soil_fertilizer_centers" TO "anon";
GRANT ALL ON TABLE "public"."soil_fertilizer_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."soil_fertilizer_centers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."soil_fertilizer_centers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."soil_fertilizer_centers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."soil_fertilizer_centers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."soil_series" TO "anon";
GRANT ALL ON TABLE "public"."soil_series" TO "authenticated";
GRANT ALL ON TABLE "public"."soil_series" TO "service_role";



GRANT ALL ON SEQUENCE "public"."soil_series_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."soil_series_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."soil_series_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."visitor_events" TO "anon";
GRANT ALL ON TABLE "public"."visitor_events" TO "authenticated";
GRANT ALL ON TABLE "public"."visitor_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."visitor_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."visitor_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."visitor_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."website_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."website_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."website_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."young_farmer_groups" TO "anon";
GRANT ALL ON TABLE "public"."young_farmer_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."young_farmer_groups" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
