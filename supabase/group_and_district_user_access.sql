-- Role model:
-- - admin: read/write/delete everything.
-- - editor + department in a province group: read everything, write only that group.
-- - district_editor + department as district name: read everything, write only personnel and budgets.

CREATE OR REPLACE FUNCTION public.current_profile_department()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT department FROM public.profiles WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.can_write_table(target_table text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'personnel',
    'assets',
    'budgets',
    'farmer_registry',
    'farmer_registry_subdistricts',
    'farmer_registry_snapshots',
    'farmer_registry_subdistrict_snapshots',
    'agricultural_areas',
    'gis_areas',
    'learning_centers',
    'daily_weather',
    'geoplots_parcel_progress',
    'geoplots_parcel_subdistrict_progress',
    'disasters',
    'large_plots',
    'certifications',
    'crop_production',
    'production_costs',
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
    'forecast_plots',
    'pest_outbreaks',
    'pest_centers',
    'plant_doctors',
    'soil_fertilizer_centers',
    'soil_series',
    'biocontrol_stock',
    'fire_hotspots',
    'ai_disease_forecasts'
  ] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Role read %1$I" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Role insert %1$I" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Role update %1$I" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Role delete %1$I" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Editor insert %1$I" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Editor update %1$I" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admin delete %1$I" ON public.%1$I', tbl);

    EXECUTE format('CREATE POLICY "Role read %1$I" ON public.%1$I FOR SELECT TO authenticated USING (true)', tbl);
    EXECUTE format('CREATE POLICY "Role insert %1$I" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_write_table(%L))', tbl, tbl);
    EXECUTE format('CREATE POLICY "Role update %1$I" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_write_table(%L)) WITH CHECK (public.can_write_table(%L))', tbl, tbl, tbl);
    EXECUTE format('CREATE POLICY "Role delete %1$I" ON public.%1$I FOR DELETE TO authenticated USING (public.is_admin())', tbl);
  END LOOP;
END $$;
