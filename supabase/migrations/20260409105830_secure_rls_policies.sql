-- Create a helper function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the creator
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- Table: agri_tourism
DROP POLICY IF EXISTS "Allow authenticated full access" ON agri_tourism;
DROP POLICY IF EXISTS "Allow public read" ON agri_tourism;
CREATE POLICY "Users can view agricultural tourism spots" ON agri_tourism FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage agricultural tourism spots" ON agri_tourism FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: agricultural_areas
DROP POLICY IF EXISTS "Allow authenticated full access" ON agricultural_areas;
DROP POLICY IF EXISTS "Allow public read" ON agricultural_areas;
CREATE POLICY "Users can view agricultural areas" ON agricultural_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage agricultural areas" ON agricultural_areas FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: assets
DROP POLICY IF EXISTS "Allow authenticated full access" ON assets;
DROP POLICY IF EXISTS "Allow public read" ON assets;
CREATE POLICY "Users can view assets" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage assets" ON assets FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: audit_logs
DROP POLICY IF EXISTS "Allow admin read audit" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert audit" ON audit_logs;
CREATE POLICY "Authenticated users can create audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT TO authenticated USING (is_admin());

-- Table: biocontrol_stock
DROP POLICY IF EXISTS "Allow authenticated full access" ON biocontrol_stock;
CREATE POLICY "Users can view biocontrol stock" ON biocontrol_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage biocontrol stock" ON biocontrol_stock FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: budgets
DROP POLICY IF EXISTS "Allow authenticated full access" ON budgets;
DROP POLICY IF EXISTS "Allow public read" ON budgets;
CREATE POLICY "Users can view budgets" ON budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage budgets" ON budgets FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: certifications
DROP POLICY IF EXISTS "Allow authenticated full access" ON certifications;
DROP POLICY IF EXISTS "Allow public read" ON certifications;
CREATE POLICY "Users can view certifications" ON certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage certifications" ON certifications FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: community_enterprises
DROP POLICY IF EXISTS "Allow authenticated full access" ON community_enterprises;
DROP POLICY IF EXISTS "Allow public read" ON community_enterprises;
CREATE POLICY "Users can view community enterprises" ON community_enterprises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage community enterprises" ON community_enterprises FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: crop_production
DROP POLICY IF EXISTS "Allow authenticated full access" ON crop_production;
DROP POLICY IF EXISTS "Allow public read" ON crop_production;
CREATE POLICY "Users can view crop production" ON crop_production FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage crop production" ON crop_production FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: disasters
DROP POLICY IF EXISTS "Allow authenticated full access" ON disasters;
DROP POLICY IF EXISTS "Allow public read" ON disasters;
CREATE POLICY "Users can view disasters" ON disasters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage disasters" ON disasters FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: farmer_groups
DROP POLICY IF EXISTS "Allow authenticated full access" ON farmer_groups;
CREATE POLICY "Users can view farmer groups" ON farmer_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage farmer groups" ON farmer_groups FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: farmer_institutes
DROP POLICY IF EXISTS "Allow authenticated full access" ON farmer_institutes;
DROP POLICY IF EXISTS "Allow public read" ON farmer_institutes;
CREATE POLICY "Users can view farmer institutes" ON farmer_institutes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage farmer institutes" ON farmer_institutes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: farmer_registry
DROP POLICY IF EXISTS "Allow authenticated full access" ON farmer_registry;
CREATE POLICY "Users can view farmer registry" ON farmer_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage farmer registry" ON farmer_registry FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: fire_hotspots
DROP POLICY IF EXISTS "Allow authenticated full access" ON fire_hotspots;
DROP POLICY IF EXISTS "Allow public read" ON fire_hotspots;
CREATE POLICY "Users can view fire hotspots" ON fire_hotspots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage fire hotspots" ON fire_hotspots FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: forecast_plots
DROP POLICY IF EXISTS "Allow authenticated delete" ON forecast_plots;
DROP POLICY IF EXISTS "Allow authenticated insert" ON forecast_plots;
DROP POLICY IF EXISTS "Allow authenticated read" ON forecast_plots;
DROP POLICY IF EXISTS "Allow authenticated update" ON forecast_plots;
DROP POLICY IF EXISTS "Allow public read" ON forecast_plots;
CREATE POLICY "Users can view forecast plots" ON forecast_plots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage forecast plots" ON forecast_plots FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: gis_areas
DROP POLICY IF EXISTS "Allow authenticated full access" ON gis_areas;
DROP POLICY IF EXISTS "Allow public read" ON gis_areas;
CREATE POLICY "Users can view GIS areas" ON gis_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage GIS areas" ON gis_areas FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: kpi_plans
DROP POLICY IF EXISTS "Allow authenticated full access" ON kpi_plans;
CREATE POLICY "Users can view KPI plans" ON kpi_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage KPI plans" ON kpi_plans FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: large_plots
DROP POLICY IF EXISTS "Allow authenticated full access" ON large_plots;
DROP POLICY IF EXISTS "Allow public read" ON large_plots;
CREATE POLICY "Users can view large plots" ON large_plots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage large plots" ON large_plots FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: learning_centers
DROP POLICY IF EXISTS "Allow authenticated full access" ON learning_centers;
DROP POLICY IF EXISTS "Allow public read" ON learning_centers;
CREATE POLICY "Users can view learning centers" ON learning_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage learning centers" ON learning_centers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: personnel
DROP POLICY IF EXISTS "Allow authenticated full access" ON personnel;
DROP POLICY IF EXISTS "Allow public read" ON personnel;
CREATE POLICY "Users can view personnel" ON personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage personnel" ON personnel FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: pest_centers
DROP POLICY IF EXISTS "Allow authenticated full access" ON pest_centers;
DROP POLICY IF EXISTS "Allow public read" ON pest_centers;
CREATE POLICY "Users can view pest centers" ON pest_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pest centers" ON pest_centers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: pest_outbreaks
DROP POLICY IF EXISTS "Allow authenticated full access" ON pest_outbreaks;
CREATE POLICY "Users can view pest outbreaks" ON pest_outbreaks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pest outbreaks" ON pest_outbreaks FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: profiles
DROP POLICY IF EXISTS "Allow authenticated full access" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: smart_farmers
DROP POLICY IF EXISTS "Allow authenticated full access" ON smart_farmers;
DROP POLICY IF EXISTS "Allow public read" ON smart_farmers;
CREATE POLICY "Users can view smart farmers" ON smart_farmers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage smart farmers" ON smart_farmers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Table: soil_fertilizer_centers
DROP POLICY IF EXISTS "Allow authenticated full access" ON soil_fertilizer_centers;
DROP POLICY IF EXISTS "Allow public read" ON soil_fertilizer_centers;
CREATE POLICY "Users can view soil fertilizer centers" ON soil_fertilizer_centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage soil fertilizer centers" ON soil_fertilizer_centers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
;
