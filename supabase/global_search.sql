CREATE OR REPLACE FUNCTION public.global_search(
  search_term TEXT,
  result_limit INTEGER DEFAULT 5
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
  cleaned_term TEXT := trim(search_term);
BEGIN
  IF cleaned_term IS NULL OR length(cleaned_term) < 2 THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR cfg IN
    SELECT *
    FROM (
      VALUES
        ('farmer_registry'::text, ARRAY['district','main_crop','notes']::text[], ARRAY['id','district','main_crop','household_count','farm_area_rai','data_year','notes','created_at','updated_at']::text[]),
        ('agricultural_areas'::text, ARRAY['area_name','area_type','district','subdistrict','notes']::text[], ARRAY['id','area_name','area_type','district','subdistrict','total_area_rai','agri_crop_area_rai','farmer_households','created_at','updated_at']::text[]),
        ('learning_centers'::text, ARRAY['center_name','district','manager','main_crop','notes']::text[], ARRAY['id','center_name','district','manager','main_crop','area_rai','created_at','updated_at']::text[]),
        ('daily_weather'::text, ARRAY['district','notes']::text[], ARRAY['id','district','rainfall_mm','temperature_c','humidity_percent','record_date','notes','created_at','updated_at']::text[]),
        ('large_plots'::text, ARRAY['plot_name','commodity','secondary_commodity','district','subdistrict','agency','notes']::text[], ARRAY['id','plot_name','commodity','secondary_commodity','district','subdistrict','member_count','area_rai','year','agency','created_at','updated_at']::text[]),
        ('certifications'::text, ARRAY['farm_name','cert_type','commodity','district','status','notes']::text[], ARRAY['id','farm_name','cert_type','commodity','district','status','certified_area_rai','created_at','updated_at']::text[]),
        ('crop_production'::text, ARRAY['crop_name','district','harvest_period','notes']::text[], ARRAY['id','crop_name','district','planted_area','production_ton','harvest_period','year','created_at','updated_at']::text[]),
        ('community_enterprises'::text, ARRAY['enterprise_name','enterprise_type','product_type','district','subdistrict','address','chairman','level','notes']::text[], ARRAY['id','enterprise_name','enterprise_type','product_type','district','subdistrict','address','village_no','member_count','level','created_at','updated_at']::text[]),
        ('smart_farmers'::text, ARRAY['full_name','farmer_type','district','main_product','notes']::text[], ARRAY['id','full_name','farmer_type','district','main_product','created_at','updated_at']::text[]),
        ('smart_farmer_sf'::text, ARRAY['record_code','full_name','district','province','farmer_status','agricultural_activity','production_standard']::text[], ARRAY['id','record_code','full_name','district','province','farmer_status','agricultural_activity','production_standard','data_year','created_at','updated_at']::text[]),
        ('young_smart_farmer_ysf'::text, ARRAY['record_code','full_name','district','subdistrict','province','farmer_status','agricultural_activity','production_standard']::text[], ARRAY['id','record_code','full_name','district','subdistrict','province','farmer_status','agricultural_activity','production_standard','data_year','created_at','updated_at']::text[]),
        ('agricultural_career_groups'::text, ARRAY['record_code','group_name','district','subdistrict','mobile','activity','main_activity','production_standard','potential_level','community_enterprise_registration']::text[], ARRAY['id','record_code','group_name','district','subdistrict','activity','main_activity','member_count','production_standard','potential_level','community_enterprise_registration','data_year','created_at','updated_at']::text[]),
        ('housewife_farmer_groups'::text, ARRAY['group_name','district','subdistrict','phone','chairman','activity','production_standard','potential_level','community_enterprise_registration']::text[], ARRAY['id','group_name','district','subdistrict','activity','member_count','production_standard','potential_level','community_enterprise_registration','year','created_at','updated_at']::text[]),
        ('young_farmer_groups_detailed'::text, ARRAY['record_code','group_name','district','subdistrict','phone','mobile','activity','potential_level']::text[], ARRAY['id','record_code','group_name','district','subdistrict','activity','member_count','potential_level','data_year','created_at','updated_at']::text[]),
        ('farmer_institutes'::text, ARRAY['name','group_name','district','subdistrict','type','notes']::text[], ARRAY['id','name','group_name','district','subdistrict','type','member_count','created_at','updated_at']::text[]),
        ('agri_tourism'::text, ARRAY['spot_name','spot_type','district','contact_person','description','notes']::text[], ARRAY['id','spot_name','spot_type','district','contact_person','description','created_at','updated_at']::text[]),
        ('disasters'::text, ARRAY['disaster_type','district','subdistrict','notes']::text[], ARRAY['id','disaster_type','district','subdistrict','affected_area_rai','affected_households','year','created_at','updated_at']::text[]),
        ('forecast_plots'::text, ARRAY['plot_name','owner_name','crop_type','variety','district','subdistrict']::text[], ARRAY['id','plot_name','owner_name','crop_type','variety','district','subdistrict','created_at','updated_at']::text[]),
        ('ai_disease_forecasts'::text, ARRAY['name','description','target_crop','risk_level']::text[], ARRAY['id','name','description','target_crop','risk_level','forecast_date','created_at','updated_at']::text[]),
        ('pest_centers'::text, ARRAY['center_name','district','subdistrict','chairman','main_crop_type','notes']::text[], ARRAY['id','center_name','district','subdistrict','chairman','main_crop_type','member_count','created_at','updated_at']::text[]),
        ('plant_doctors'::text, ARRAY['full_name','district','subdistrict','province','notes']::text[], ARRAY['id','full_name','district','subdistrict','province','created_at','updated_at']::text[]),
        ('soil_fertilizer_centers'::text, ARRAY['center_name','district','subdistrict','chairman','main_crop_type','notes']::text[], ARRAY['id','center_name','district','subdistrict','chairman','main_crop_type','member_count','created_at','updated_at']::text[]),
        ('fire_hotspots'::text, ARRAY['spot_name','district','risk_level','notes']::text[], ARRAY['id','spot_name','district','risk_level','year','created_at','updated_at']::text[]),
        ('budgets'::text, ARRAY['project_name','budget_source','status','notes']::text[], ARRAY['id','project_name','budget_source','budget_amount','spent_amount','status','notes','fiscal_year','budget_round','created_at','updated_at']::text[])
    ) AS t(table_name, search_cols, return_cols)
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

    IF existing_search_cols IS NULL OR array_length(existing_search_cols, 1) IS NULL THEN
      CONTINUE;
    END IF;

    IF existing_return_cols IS NULL OR array_length(existing_return_cols, 1) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT string_agg(format('%I::text ILIKE ''%%'' || $1 || ''%%''', c), ' OR ')
    INTO where_sql
    FROM unnest(existing_search_cols) AS c;

    SELECT string_agg(format('%I', c), ', ')
    INTO select_sql
    FROM unnest(existing_return_cols) AS c;

    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %s',
      cfg.table_name,
      where_sql
    )
    INTO table_count
    USING cleaned_term;

    IF table_count = 0 THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT %s FROM public.%I WHERE %s LIMIT $2) s',
      select_sql,
      cfg.table_name,
      where_sql
    )
    INTO table_results
    USING cleaned_term, result_limit;

    IF table_results IS NOT NULL THEN
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

GRANT EXECUTE ON FUNCTION public.global_search(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(TEXT, INTEGER) TO anon;
