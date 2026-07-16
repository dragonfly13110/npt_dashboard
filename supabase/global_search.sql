CREATE OR REPLACE FUNCTION public.global_search_public(
  search_terms TEXT[],
  table_names TEXT[],
  result_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
        ('housewife_farmer_groups'::text, ARRAY['group_name','district','subdistrict','activity','production_standard','potential_level','community_enterprise_registration']::text[], ARRAY['id','group_name','district','subdistrict','activity','member_count','production_standard','potential_level','community_enterprise_registration','year','created_at','updated_at']::text[]),
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

    -- Exclude offices from personnel unless 'สำนักงาน' is explicitly in cleaned_terms
    IF cfg.table_name = 'personnel' THEN
      IF NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(cleaned_terms, ARRAY[]::text[])) AS term
        WHERE term ILIKE '%สำนักงาน%'
      ) THEN
        where_sql := format('(%s) AND position IS DISTINCT FROM ''สำนักงาน''', where_sql);
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
$$;

-- Staff gateway keeps the privileged entry point separate from public callers.
CREATE OR REPLACE FUNCTION public.global_search_staff(
  search_terms TEXT[],
  table_names TEXT[],
  result_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.global_search_public(search_terms, table_names, result_limit);
$$;

REVOKE ALL ON FUNCTION public.global_search_staff(TEXT[], TEXT[], INTEGER)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.global_search_staff(TEXT[], TEXT[], INTEGER)
  TO service_role;

-- Legacy wrapper: existing callers keep working while AI uses one targeted RPC.
CREATE OR REPLACE FUNCTION public.global_search(
  search_term TEXT,
  result_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.global_search_public(
    ARRAY[search_term],
    ARRAY[
      'farmer_registry','agricultural_areas','gis_areas','learning_centers','daily_weather',
      'large_plots','certifications','crop_production','production_costs','community_enterprises',
      'smart_farmers','smart_farmer_sf','young_smart_farmer_ysf',
      'agricultural_career_groups','housewife_farmer_groups',
      'young_farmer_groups_detailed','farmer_institutes','agri_tourism',
      'disasters','forecast_plots','ai_disease_forecasts','pest_outbreaks','pest_centers',
      'plant_doctors','soil_fertilizer_centers','soil_series','biocontrol_stock','fire_hotspots','assets','budgets',
      'personnel','geoplots_parcel_progress','geoplots_parcel_subdistrict_progress'
    ],
    result_limit
  );
$$;

GRANT EXECUTE ON FUNCTION public.global_search_public(TEXT[], TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search_public(TEXT[], TEXT[], INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.global_search(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(TEXT, INTEGER) TO anon;
