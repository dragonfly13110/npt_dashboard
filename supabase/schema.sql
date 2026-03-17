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

CREATE TABLE IF NOT EXISTS kpi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL,
  unit TEXT,
  target NUMERIC,
  actual NUMERIC,
  fiscal_year INTEGER,
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
ALTER TABLE kpi_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE large_plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE agri_tourism ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pest_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE biocontrol_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE fire_hotspots ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users สามารถ CRUD ทุกข้อมูลได้
-- (ในอนาคตสามารถแยกสิทธิ์ตามกลุ่มงานเพิ่มเติม)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles','personnel','assets','budgets',
      'farmer_registry','gis_areas','disasters','kpi_plans',
      'large_plots','learning_centers','certifications','crop_production',
      'community_enterprises','smart_farmers','farmer_groups','agri_tourism',
      'pest_outbreaks','pest_centers','biocontrol_stock','fire_hotspots'
    ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow authenticated full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
