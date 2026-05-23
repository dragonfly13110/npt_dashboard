-- =============================================================
-- ระบบฐานข้อมูลกลาง สำนักงานเกษตรจังหวัดนครปฐม
-- Supabase SQL Schema
-- วิธีใช้: Copy ทั้งหมดไปวางใน Supabase Dashboard > SQL Editor > Run
-- =============================================================

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  department TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== กลุ่ม 1: ฝ่ายบริหารทั่วไป ====================

CREATE TABLE IF NOT EXISTS personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ปฏิบัติงาน',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  serial_number TEXT,
  location TEXT,
  condition TEXT DEFAULT 'ใช้งานได้',
  value NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  fiscal_year INTEGER,
  budget_source TEXT,
  budget_amount NUMERIC,
  spent_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ดำเนินการ',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== กลุ่ม 2: ยุทธศาสตร์และสารสนเทศ ====================

CREATE TABLE IF NOT EXISTS farmer_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district TEXT NOT NULL,
  household_count INTEGER,
  farm_area_rai NUMERIC,
  main_crop TEXT,
  data_year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gis_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name TEXT NOT NULL,
  district TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  area_type TEXT,
  area_rai NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_type TEXT NOT NULL,
  district TEXT,
  subdistrict TEXT,
  damaged_area NUMERIC,
  affected_farmers INTEGER,
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== กลุ่ม 3: ส่งเสริมและพัฒนาการผลิต ====================

CREATE TABLE IF NOT EXISTS large_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT,
  plot_name TEXT NOT NULL,
  commodity_group TEXT,
  commodity TEXT,
  secondary_commodity TEXT,
  district TEXT,
  subdistrict TEXT,
  phone TEXT,
  member_count INTEGER,
  area_rai NUMERIC,
  year INTEGER,
  agency TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_name TEXT NOT NULL,
  district TEXT,
  manager TEXT,
  main_crop TEXT,
  area_rai NUMERIC,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_name TEXT NOT NULL,
  cert_type TEXT,
  commodity TEXT,
  district TEXT,
  status TEXT DEFAULT 'รอตรวจ',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crop_production (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name TEXT NOT NULL,
  district TEXT,
  planted_area NUMERIC,
  production_ton NUMERIC,
  harvest_period TEXT,
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== กลุ่ม 4: ส่งเสริมและพัฒนาเกษตรกร ====================

CREATE TABLE IF NOT EXISTS community_enterprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_name TEXT NOT NULL,
  product_type TEXT,
  district TEXT,
  chairman TEXT,
  member_count INTEGER,
  level TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smart_farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  farmer_type TEXT,
  district TEXT,
  main_product TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smart_farmer_sf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  sequence_no INTEGER,
  citizen_id TEXT,
  title TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (trim(coalesce(title, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED,
  age INTEGER,
  district TEXT,
  province TEXT,
  farmer_status TEXT,
  agricultural_activity TEXT,
  phone TEXT,
  education TEXT,
  production_standard TEXT,
  sales_channel TEXT,
  annual_agri_income NUMERIC,
  production_area TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE TABLE IF NOT EXISTS farmer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  group_type TEXT,
  district TEXT,
  chairman TEXT,
  member_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS housewife_farmer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER,
  group_name TEXT NOT NULL,
  address_no TEXT,
  moo INTEGER,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  established_text TEXT,
  established_date DATE,
  chairman TEXT,
  member_count INTEGER,
  community_enterprise_registration TEXT,
  model_group TEXT,
  fund_management NUMERIC,
  income NUMERIC,
  activity TEXT,
  production_standard TEXT,
  online_domestic TEXT,
  online_international TEXT,
  offline_domestic TEXT,
  offline_international TEXT,
  potential_level TEXT,
  lat NUMERIC,
  lon NUMERIC,
  has_sales_channel TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS young_farmer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  district TEXT,
  chairman TEXT,
  member_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS young_farmer_groups_detailed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  address_no TEXT,
  moo TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  mobile TEXT,
  established_date DATE,
  established_year_be INTEGER,
  established_year_ce INTEGER,
  member_count INTEGER,
  model_group TEXT,
  fund_management NUMERIC,
  income NUMERIC,
  activity TEXT,
  activity_count INTEGER,
  potential_level TEXT,
  lat NUMERIC,
  lon NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE TABLE IF NOT EXISTS young_smart_farmer_ysf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  sequence_no INTEGER,
  title TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (trim(coalesce(title, '') || ' ' || coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED,
  address_no TEXT,
  moo TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  phone TEXT,
  line_id TEXT,
  email TEXT,
  facebook TEXT,
  education TEXT,
  education_major TEXT,
  production_area TEXT,
  agricultural_activity TEXT,
  production_standard TEXT,
  farmer_status TEXT,
  sales_channel TEXT,
  affiliated_district TEXT,
  farm_area_rai NUMERIC,
  annual_agri_income NUMERIC,
  main_activity_type TEXT,
  has_crop TEXT,
  has_livestock TEXT,
  has_fishery TEXT,
  has_processing TEXT,
  has_online_channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE TABLE IF NOT EXISTS agricultural_career_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL,
  record_code TEXT NOT NULL,
  group_name TEXT NOT NULL,
  address_no TEXT,
  moo TEXT,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  mobile TEXT,
  established_date TEXT,
  established_date_ce DATE,
  established_year_be INTEGER,
  member_count INTEGER,
  community_enterprise_registration TEXT,
  fund_management NUMERIC,
  income NUMERIC,
  activity TEXT,
  main_activity TEXT,
  production_standard TEXT,
  potential_level TEXT,
  lat NUMERIC,
  lon NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, record_code)
);

CREATE TABLE IF NOT EXISTS agri_tourism (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_name TEXT NOT NULL,
  district TEXT,
  spot_type TEXT,
  contact_person TEXT,
  phone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== กลุ่ม 5: อารักขาพืช ====================

CREATE TABLE IF NOT EXISTS pest_outbreaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pest_name TEXT NOT NULL,
  affected_crop TEXT,
  district TEXT,
  outbreak_area NUMERIC,
  severity TEXT,
  report_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pest_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_name TEXT NOT NULL,
  district TEXT,
  subdistrict TEXT,
  chairman TEXT,
  member_count INTEGER,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS biocontrol_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  source TEXT,
  quantity_kg NUMERIC,
  period TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fire_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_name TEXT NOT NULL,
  district TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  risk_level TEXT,
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== RLS POLICIES ====================
-- เปิด RLS สำหรับทุกตาราง (ต้อง login ถึงจะใช้ได้)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE gis_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE disasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE large_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_farmer_sf ENABLE ROW LEVEL SECURITY;
ALTER TABLE young_smart_farmer_ysf ENABLE ROW LEVEL SECURITY;
ALTER TABLE agricultural_career_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE housewife_farmer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE young_farmer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE young_farmer_groups_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE agri_tourism ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE biocontrol_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_hotspots ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users สามารถ CRUD ทุกข้อมูลได้
-- (ในอนาคตสามารถแยกสิทธิ์ตามกลุ่มงานเพิ่มเติม)

-- Broad authenticated full-access policies were removed.
-- Apply supabase/rls_role_hardening.sql after this schema for role-based access.

DROP POLICY IF EXISTS "Allow public read smart farmer sf" ON smart_farmer_sf;
DROP POLICY IF EXISTS "Allow authenticated full access" ON smart_farmer_sf;
CREATE POLICY "Allow public read smart farmer sf" ON smart_farmer_sf FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow editor insert smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow editor insert smart farmer sf" ON smart_farmer_sf FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow editor update smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow editor update smart farmer sf" ON smart_farmer_sf FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow admin delete smart farmer sf" ON smart_farmer_sf;
CREATE POLICY "Allow admin delete smart farmer sf" ON smart_farmer_sf FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow public read young smart farmer ysf" ON young_smart_farmer_ysf;
DROP POLICY IF EXISTS "Allow authenticated full access" ON young_smart_farmer_ysf;
CREATE POLICY "Allow public read young smart farmer ysf" ON young_smart_farmer_ysf FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow editor insert young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow editor insert young smart farmer ysf" ON young_smart_farmer_ysf FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow editor update young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow editor update young smart farmer ysf" ON young_smart_farmer_ysf FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow admin delete young smart farmer ysf" ON young_smart_farmer_ysf;
CREATE POLICY "Allow admin delete young smart farmer ysf" ON young_smart_farmer_ysf FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow public read agricultural career groups" ON agricultural_career_groups;
DROP POLICY IF EXISTS "Allow authenticated full access" ON agricultural_career_groups;
CREATE POLICY "Allow public read agricultural career groups" ON agricultural_career_groups FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow editor insert agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow editor insert agricultural career groups" ON agricultural_career_groups FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow editor update agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow editor update agricultural career groups" ON agricultural_career_groups FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow admin delete agricultural career groups" ON agricultural_career_groups;
CREATE POLICY "Allow admin delete agricultural career groups" ON agricultural_career_groups FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow public read young farmer groups detailed" ON young_farmer_groups_detailed;
DROP POLICY IF EXISTS "Allow authenticated full access" ON young_farmer_groups_detailed;
CREATE POLICY "Allow public read young farmer groups detailed" ON young_farmer_groups_detailed FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow editor insert young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow editor insert young farmer groups detailed" ON young_farmer_groups_detailed FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow editor update young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow editor update young farmer groups detailed" ON young_farmer_groups_detailed FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow admin delete young farmer groups detailed" ON young_farmer_groups_detailed;
CREATE POLICY "Allow admin delete young farmer groups detailed" ON young_farmer_groups_detailed FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow public read housewife farmer groups" ON housewife_farmer_groups;
DROP POLICY IF EXISTS "Allow authenticated full access" ON housewife_farmer_groups;
CREATE POLICY "Allow public read housewife farmer groups" ON housewife_farmer_groups FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow editor insert housewife farmer groups" ON housewife_farmer_groups;
CREATE POLICY "Allow editor insert housewife farmer groups" ON housewife_farmer_groups FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow editor update housewife farmer groups" ON housewife_farmer_groups;
CREATE POLICY "Allow editor update housewife farmer groups" ON housewife_farmer_groups FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor'))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'editor')));
DROP POLICY IF EXISTS "Allow admin delete housewife farmer groups" ON housewife_farmer_groups;
CREATE POLICY "Allow admin delete housewife farmer groups" ON housewife_farmer_groups FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
