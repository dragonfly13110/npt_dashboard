CREATE TABLE IF NOT EXISTS public.plant_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_number INTEGER,
  full_name TEXT NOT NULL,
  address_no TEXT,
  village_no TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT DEFAULT 'นครปฐม',
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plant_doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable public read" ON public.plant_doctors;
CREATE POLICY "Enable public read" ON public.plant_doctors
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public read plant_doctors" ON public.plant_doctors;
CREATE POLICY "Public read plant_doctors" ON public.plant_doctors
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can view plant doctors" ON public.plant_doctors;
CREATE POLICY "Users can view plant doctors" ON public.plant_doctors
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Role read plant_doctors" ON public.plant_doctors;
CREATE POLICY "Role read plant_doctors" ON public.plant_doctors
  FOR SELECT TO authenticated USING (is_viewer());

DROP POLICY IF EXISTS "Role insert plant_doctors" ON public.plant_doctors;
CREATE POLICY "Role insert plant_doctors" ON public.plant_doctors
  FOR INSERT TO authenticated WITH CHECK (is_editor());

DROP POLICY IF EXISTS "Role update plant_doctors" ON public.plant_doctors;
CREATE POLICY "Role update plant_doctors" ON public.plant_doctors
  FOR UPDATE TO authenticated USING (is_editor()) WITH CHECK (is_editor());

DROP POLICY IF EXISTS "Role delete plant_doctors" ON public.plant_doctors;
CREATE POLICY "Role delete plant_doctors" ON public.plant_doctors
  FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage plant doctors" ON public.plant_doctors;
CREATE POLICY "Admins can manage plant doctors" ON public.plant_doctors
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_plant_doctors_district ON public.plant_doctors(district);
CREATE INDEX IF NOT EXISTS idx_plant_doctors_full_name ON public.plant_doctors(full_name);

REVOKE SELECT ON TABLE public.plant_doctors FROM anon;
GRANT SELECT (
  id,
  row_number,
  subdistrict,
  district,
  province,
  created_at,
  updated_at
) ON TABLE public.plant_doctors TO anon;
GRANT SELECT ON TABLE public.plant_doctors TO authenticated;
