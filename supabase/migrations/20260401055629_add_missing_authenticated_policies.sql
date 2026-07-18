
-- Add missing "Allow authenticated full access" policies for tables that only have SELECT

-- agricultural_areas
CREATE POLICY "Allow authenticated full access" ON public.agricultural_areas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- certifications
CREATE POLICY "Allow authenticated full access" ON public.certifications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- farmer_institutes
CREATE POLICY "Allow authenticated full access" ON public.farmer_institutes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- learning_centers
CREATE POLICY "Allow authenticated full access" ON public.learning_centers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- soil_fertilizer_centers
CREATE POLICY "Allow authenticated full access" ON public.soil_fertilizer_centers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
;
