-- Make public-facing dashboard data readable without login.
-- Write access remains controlled by the existing editor/admin policies.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'personnel',
    'assets',
    'budgets',
    'farmer_registry',
    'gis_areas',
    'agricultural_areas',
    'learning_centers',
    'disasters',
    'large_plots',
    'certifications',
    'crop_production',
    'coconut_aromatic_surveys',
    'community_enterprises',
    'smart_farmers',
    'smart_farmer_sf',
    'young_smart_farmer_ysf',
    'agricultural_career_groups',
    'farmer_groups',
    'housewife_farmer_groups',
    'young_farmer_groups',
    'young_farmer_groups_detailed',
    'farmer_institutes',
    'agri_tourism',
    'forecast_plots',
    'pest_outbreaks',
    'pest_centers',
    'soil_fertilizer_centers',
    'biocontrol_stock',
    'fire_hotspots',
    'daily_weather',
    'site_statistics',
    'forum_posts',
    'forum_comments'
  ] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$I" ON %1$I', tbl);
    EXECUTE format('CREATE POLICY "Public read %1$I" ON %1$I FOR SELECT TO anon, authenticated USING (true)', tbl);
  END LOOP;
END $$;
