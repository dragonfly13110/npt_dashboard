-- Harden broad RLS policies and align access with application roles.
-- Run after the base schema and feature table migrations.

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = auth.uid()), 'guest');
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_role() IN ('admin', 'editor', 'viewer');
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','personnel','assets','budgets',
    'farmer_registry','gis_areas','disasters',
    'large_plots','learning_centers','certifications','crop_production','production_costs',
    'community_enterprises','smart_farmers','farmer_groups','young_farmer_groups','agri_tourism',
    'pest_outbreaks','pest_centers','plant_doctors','biocontrol_stock','fire_hotspots',
    'forecast_plots',
    'data_requests','data_request_assignments','data_request_responses'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated all" ON %I', tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Profiles read own or admin" ON profiles;
CREATE POLICY "Profiles read own or admin" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Profiles update own basic profile or admin" ON profiles;
-- Allow users to update their own basic details or admins to update anyone.
-- Securing column modifications (like role) is handled via tr_check_profile_update trigger.
CREATE POLICY "Profiles update own basic profile or admin" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'personnel','assets','budgets',
    'farmer_registry','gis_areas','disasters',
    'large_plots','learning_centers','certifications','crop_production','production_costs',
    'community_enterprises','smart_farmers','farmer_groups','young_farmer_groups','agri_tourism',
    'pest_outbreaks','pest_centers','plant_doctors','biocontrol_stock','fire_hotspots',
    'forecast_plots'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Role read %1$I" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Role insert %1$I" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Role update %1$I" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Role delete %1$I" ON %1$I', tbl);

    EXECUTE format('CREATE POLICY "Role read %1$I" ON %1$I FOR SELECT TO authenticated USING (public.is_viewer())', tbl);
    EXECUTE format('CREATE POLICY "Role insert %1$I" ON %1$I FOR INSERT TO authenticated WITH CHECK (public.is_editor())', tbl);
    EXECUTE format('CREATE POLICY "Role update %1$I" ON %1$I FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor())', tbl);
    EXECUTE format('CREATE POLICY "Role delete %1$I" ON %1$I FOR DELETE TO authenticated USING (public.is_admin())', tbl);
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'smart_farmer_sf',
    'young_smart_farmer_ysf',
    'agricultural_career_groups',
    'young_farmer_groups_detailed',
    'housewife_farmer_groups'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$I" ON %1$I', tbl);
    EXECUTE format('CREATE POLICY "Public read %1$I" ON %1$I FOR SELECT TO anon, authenticated USING (true)', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Editor insert %1$I" ON %1$I', tbl);
    EXECUTE format('CREATE POLICY "Editor insert %1$I" ON %1$I FOR INSERT TO authenticated WITH CHECK (public.is_editor())', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Editor update %1$I" ON %1$I', tbl);
    EXECUTE format('CREATE POLICY "Editor update %1$I" ON %1$I FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor())', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Admin delete %1$I" ON %1$I', tbl);
    EXECUTE format('CREATE POLICY "Admin delete %1$I" ON %1$I FOR DELETE TO authenticated USING (public.is_admin())', tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Forecast plots public read" ON forecast_plots;
CREATE POLICY "Forecast plots public read" ON forecast_plots
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access data_requests" ON data_requests;
DROP POLICY IF EXISTS "Admin full access data_request_assignments" ON data_request_assignments;
DROP POLICY IF EXISTS "Admin full access data_request_responses" ON data_request_responses;

CREATE POLICY "Admin full access data_requests" ON data_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access data_request_assignments" ON data_request_assignments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin full access data_request_responses" ON data_request_responses
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
