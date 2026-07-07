-- =============================================================================
-- Full-text search indexes for global_search_public()
-- =============================================================================
-- Safe to re-run. Each index is created only when its table and column exist.
-- This keeps the migration compatible with older databases where some search
-- columns have drifted from the current app/global_search contract.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT *
    FROM (
      VALUES
        ('idx_gin_farmer_registry_district', 'farmer_registry', 'district'),
        ('idx_gin_farmer_registry_main_crop', 'farmer_registry', 'main_crop'),

        ('idx_gin_agricultural_areas_area_name', 'agricultural_areas', 'area_name'),
        ('idx_gin_agricultural_areas_area_type', 'agricultural_areas', 'area_type'),
        ('idx_gin_agricultural_areas_district', 'agricultural_areas', 'district'),
        ('idx_gin_agricultural_areas_subdistrict', 'agricultural_areas', 'subdistrict'),

        ('idx_gin_gis_areas_area_name', 'gis_areas', 'area_name'),
        ('idx_gin_gis_areas_district', 'gis_areas', 'district'),
        ('idx_gin_gis_areas_area_type', 'gis_areas', 'area_type'),
        ('idx_gin_gis_areas_notes', 'gis_areas', 'notes'),

        ('idx_gin_learning_centers_center_name', 'learning_centers', 'center_name'),
        ('idx_gin_learning_centers_district', 'learning_centers', 'district'),
        ('idx_gin_learning_centers_manager', 'learning_centers', 'manager'),
        ('idx_gin_learning_centers_main_crop', 'learning_centers', 'main_crop'),

        ('idx_gin_daily_weather_district', 'daily_weather', 'district'),

        ('idx_gin_large_plots_plot_name', 'large_plots', 'plot_name'),
        ('idx_gin_large_plots_commodity', 'large_plots', 'commodity'),
        ('idx_gin_large_plots_secondary_commodity', 'large_plots', 'secondary_commodity'),
        ('idx_gin_large_plots_district', 'large_plots', 'district'),
        ('idx_gin_large_plots_subdistrict', 'large_plots', 'subdistrict'),
        ('idx_gin_large_plots_agency', 'large_plots', 'agency'),

        ('idx_gin_certifications_farm_name', 'certifications', 'farm_name'),
        ('idx_gin_certifications_cert_type', 'certifications', 'cert_type'),
        ('idx_gin_certifications_commodity', 'certifications', 'commodity'),
        ('idx_gin_certifications_district', 'certifications', 'district'),
        ('idx_gin_certifications_status', 'certifications', 'status'),

        ('idx_gin_crop_production_crop_name', 'crop_production', 'crop_name'),
        ('idx_gin_crop_production_district', 'crop_production', 'district'),
        ('idx_gin_crop_production_harvest_period', 'crop_production', 'harvest_period'),

        ('idx_gin_production_costs_crop_name', 'production_costs', 'crop_name'),

        ('idx_gin_community_enterprises_name', 'community_enterprises', 'enterprise_name'),
        ('idx_gin_community_enterprises_type', 'community_enterprises', 'enterprise_type'),
        ('idx_gin_community_enterprises_product', 'community_enterprises', 'product_type'),
        ('idx_gin_community_enterprises_district', 'community_enterprises', 'district'),
        ('idx_gin_community_enterprises_subdistrict', 'community_enterprises', 'subdistrict'),
        ('idx_gin_community_enterprises_level', 'community_enterprises', 'level'),

        ('idx_gin_smart_farmers_farmer_type', 'smart_farmers', 'farmer_type'),
        ('idx_gin_smart_farmers_district', 'smart_farmers', 'district'),
        ('idx_gin_smart_farmers_main_product', 'smart_farmers', 'main_product'),

        ('idx_gin_smart_farmer_sf_record_code', 'smart_farmer_sf', 'record_code'),
        ('idx_gin_smart_farmer_sf_district', 'smart_farmer_sf', 'district'),
        ('idx_gin_smart_farmer_sf_province', 'smart_farmer_sf', 'province'),
        ('idx_gin_smart_farmer_sf_status', 'smart_farmer_sf', 'farmer_status'),
        ('idx_gin_smart_farmer_sf_activity', 'smart_farmer_sf', 'agricultural_activity'),
        ('idx_gin_smart_farmer_sf_standard', 'smart_farmer_sf', 'production_standard'),

        ('idx_gin_ysf_record_code', 'young_smart_farmer_ysf', 'record_code'),
        ('idx_gin_ysf_district', 'young_smart_farmer_ysf', 'district'),
        ('idx_gin_ysf_province', 'young_smart_farmer_ysf', 'province'),
        ('idx_gin_ysf_status', 'young_smart_farmer_ysf', 'farmer_status'),
        ('idx_gin_ysf_activity', 'young_smart_farmer_ysf', 'agricultural_activity'),
        ('idx_gin_ysf_standard', 'young_smart_farmer_ysf', 'production_standard'),

        ('idx_gin_career_groups_record_code', 'agricultural_career_groups', 'record_code'),
        ('idx_gin_career_groups_group_name', 'agricultural_career_groups', 'group_name'),
        ('idx_gin_career_groups_district', 'agricultural_career_groups', 'district'),
        ('idx_gin_career_groups_subdistrict', 'agricultural_career_groups', 'subdistrict'),
        ('idx_gin_career_groups_activity', 'agricultural_career_groups', 'activity'),
        ('idx_gin_career_groups_main_activity', 'agricultural_career_groups', 'main_activity'),
        ('idx_gin_career_groups_standard', 'agricultural_career_groups', 'production_standard'),
        ('idx_gin_career_groups_potential', 'agricultural_career_groups', 'potential_level'),
        ('idx_gin_career_groups_ce_reg', 'agricultural_career_groups', 'community_enterprise_registration'),

        ('idx_gin_farmer_groups_group_name', 'farmer_groups', 'group_name'),
        ('idx_gin_farmer_groups_type', 'farmer_groups', 'group_type'),
        ('idx_gin_farmer_groups_district', 'farmer_groups', 'district'),
        ('idx_gin_farmer_groups_chairman', 'farmer_groups', 'chairman'),
        ('idx_gin_farmer_groups_notes', 'farmer_groups', 'notes'),

        ('idx_gin_housewife_groups_group_name', 'housewife_farmer_groups', 'group_name'),
        ('idx_gin_housewife_groups_district', 'housewife_farmer_groups', 'district'),
        ('idx_gin_housewife_groups_subdistrict', 'housewife_farmer_groups', 'subdistrict'),
        ('idx_gin_housewife_groups_chairman', 'housewife_farmer_groups', 'chairman'),
        ('idx_gin_housewife_groups_activity', 'housewife_farmer_groups', 'activity'),
        ('idx_gin_housewife_groups_standard', 'housewife_farmer_groups', 'production_standard'),
        ('idx_gin_housewife_groups_potential', 'housewife_farmer_groups', 'potential_level'),
        ('idx_gin_housewife_groups_ce_reg', 'housewife_farmer_groups', 'community_enterprise_registration'),

        ('idx_gin_young_farmer_groups_name', 'young_farmer_groups', 'group_name'),
        ('idx_gin_young_farmer_groups_district', 'young_farmer_groups', 'district'),
        ('idx_gin_young_farmer_groups_chairman', 'young_farmer_groups', 'chairman'),
        ('idx_gin_young_farmer_groups_notes', 'young_farmer_groups', 'notes'),

        ('idx_gin_young_groups_record_code', 'young_farmer_groups_detailed', 'record_code'),
        ('idx_gin_young_groups_group_name', 'young_farmer_groups_detailed', 'group_name'),
        ('idx_gin_young_groups_district', 'young_farmer_groups_detailed', 'district'),
        ('idx_gin_young_groups_subdistrict', 'young_farmer_groups_detailed', 'subdistrict'),
        ('idx_gin_young_groups_activity', 'young_farmer_groups_detailed', 'activity'),
        ('idx_gin_young_groups_potential', 'young_farmer_groups_detailed', 'potential_level'),

        ('idx_gin_agri_tourism_spot_name', 'agri_tourism', 'spot_name'),
        ('idx_gin_agri_tourism_spot_type', 'agri_tourism', 'spot_type'),
        ('idx_gin_agri_tourism_district', 'agri_tourism', 'district'),
        ('idx_gin_agri_tourism_description', 'agri_tourism', 'description'),

        ('idx_gin_disasters_type', 'disasters', 'disaster_type'),
        ('idx_gin_disasters_district', 'disasters', 'district'),
        ('idx_gin_disasters_subdistrict', 'disasters', 'subdistrict'),

        ('idx_gin_forecast_plots_plot_name', 'forecast_plots', 'plot_name'),
        ('idx_gin_forecast_plots_crop_type', 'forecast_plots', 'crop_type'),
        ('idx_gin_forecast_plots_variety', 'forecast_plots', 'variety'),
        ('idx_gin_forecast_plots_district', 'forecast_plots', 'district'),
        ('idx_gin_forecast_plots_subdistrict', 'forecast_plots', 'subdistrict'),

        ('idx_gin_ai_forecasts_name', 'ai_disease_forecasts', 'name'),
        ('idx_gin_ai_forecasts_description', 'ai_disease_forecasts', 'description'),
        ('idx_gin_ai_forecasts_target_crop', 'ai_disease_forecasts', 'target_crop'),
        ('idx_gin_ai_forecasts_risk_level', 'ai_disease_forecasts', 'risk_level'),
        ('idx_gin_ai_forecasts_summary', 'ai_disease_forecasts', 'summary'),

        ('idx_gin_pest_outbreaks_name', 'pest_outbreaks', 'pest_name'),
        ('idx_gin_pest_outbreaks_crop', 'pest_outbreaks', 'affected_crop'),
        ('idx_gin_pest_outbreaks_district', 'pest_outbreaks', 'district'),
        ('idx_gin_pest_outbreaks_severity', 'pest_outbreaks', 'severity'),
        ('idx_gin_pest_outbreaks_report_date', 'pest_outbreaks', 'report_date'),
        ('idx_gin_pest_outbreaks_notes', 'pest_outbreaks', 'notes'),

        ('idx_gin_pest_centers_name', 'pest_centers', 'center_name'),
        ('idx_gin_pest_centers_district', 'pest_centers', 'district'),
        ('idx_gin_pest_centers_subdistrict', 'pest_centers', 'subdistrict'),
        ('idx_gin_pest_centers_chairman', 'pest_centers', 'chairman'),
        ('idx_gin_pest_centers_main_crop', 'pest_centers', 'main_crop_type'),

        ('idx_gin_plant_doctors_district', 'plant_doctors', 'district'),
        ('idx_gin_plant_doctors_subdistrict', 'plant_doctors', 'subdistrict'),
        ('idx_gin_plant_doctors_province', 'plant_doctors', 'province'),

        ('idx_gin_soil_centers_name', 'soil_fertilizer_centers', 'center_name'),
        ('idx_gin_soil_centers_district', 'soil_fertilizer_centers', 'district'),
        ('idx_gin_soil_centers_subdistrict', 'soil_fertilizer_centers', 'subdistrict'),
        ('idx_gin_soil_centers_chairman', 'soil_fertilizer_centers', 'chairman'),
        ('idx_gin_soil_centers_main_crop', 'soil_fertilizer_centers', 'main_crop_type'),

        ('idx_gin_soil_series_name', 'soil_series', 'soil_series_name'),
        ('idx_gin_soil_series_code', 'soil_series', 'soil_series_code'),
        ('idx_gin_soil_series_group', 'soil_series', 'soil_group'),
        ('idx_gin_soil_series_texture', 'soil_series', 'texture'),
        ('idx_gin_soil_series_fertility', 'soil_series', 'fertility'),
        ('idx_gin_soil_series_ph_top', 'soil_series', 'ph_top'),
        ('idx_gin_soil_series_district', 'soil_series', 'district'),

        ('idx_gin_biocontrol_stock_product', 'biocontrol_stock', 'product_name'),
        ('idx_gin_biocontrol_stock_source', 'biocontrol_stock', 'source'),
        ('idx_gin_biocontrol_stock_period', 'biocontrol_stock', 'period'),
        ('idx_gin_biocontrol_stock_status', 'biocontrol_stock', 'status'),
        ('idx_gin_biocontrol_stock_notes', 'biocontrol_stock', 'notes'),

        ('idx_gin_fire_hotspots_spot_name', 'fire_hotspots', 'spot_name'),
        ('idx_gin_fire_hotspots_district', 'fire_hotspots', 'district'),
        ('idx_gin_fire_hotspots_risk_level', 'fire_hotspots', 'risk_level'),

        ('idx_gin_assets_name', 'assets', 'name'),
        ('idx_gin_assets_category', 'assets', 'category'),
        ('idx_gin_assets_serial', 'assets', 'serial_number'),
        ('idx_gin_assets_location', 'assets', 'location'),
        ('idx_gin_assets_condition', 'assets', 'condition'),
        ('idx_gin_assets_notes', 'assets', 'notes'),

        ('idx_gin_budgets_project_name', 'budgets', 'project_name'),
        ('idx_gin_budgets_source', 'budgets', 'budget_source'),
        ('idx_gin_budgets_status', 'budgets', 'status'),

        ('idx_gin_personnel_position', 'personnel', 'position'),
        ('idx_gin_personnel_department', 'personnel', 'department'),
        ('idx_gin_personnel_district', 'personnel', 'district'),
        ('idx_gin_personnel_office_type', 'personnel', 'office_type')
    ) AS indexes(index_name, table_name, column_name)
  LOOP
    IF to_regclass(format('public.%I', idx.table_name)) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = idx.table_name
          AND column_name = idx.column_name
      )
    THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I USING gin (%I gin_trgm_ops)',
        idx.index_name,
        idx.table_name,
        idx.column_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  idx RECORD;
BEGIN
  FOR idx IN
    SELECT *
    FROM (
      VALUES
        ('idx_farmer_registry_data_year', 'farmer_registry', 'data_year'),
        ('idx_crop_production_year', 'crop_production', 'year'),
        ('idx_fire_hotspots_year', 'fire_hotspots', 'year'),
        ('idx_budgets_fiscal_year', 'budgets', 'fiscal_year')
    ) AS indexes(index_name, table_name, column_name)
  LOOP
    IF to_regclass(format('public.%I', idx.table_name)) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = idx.table_name
          AND column_name = idx.column_name
      )
    THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
        idx.index_name,
        idx.table_name,
        idx.column_name
      );
    END IF;
  END LOOP;
END $$;
