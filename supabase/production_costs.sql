CREATE TABLE IF NOT EXISTS production_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_year INTEGER NOT NULL DEFAULT 2567,
  crop_name TEXT NOT NULL,
  yield_kg_per_rai NUMERIC,
  revenue_baht_per_rai NUMERIC,
  seed_cost_baht NUMERIC,
  fertilizer_cost_baht NUMERIC,
  pesticide_cost_baht NUMERIC,
  service_cost_baht NUMERIC,
  equipment_cost_baht NUMERIC,
  fuel_cost_baht NUMERIC,
  repair_depreciation_cost_baht NUMERIC,
  packaging_cost_baht NUMERIC,
  other_cost_baht NUMERIC,
  total_cost_baht NUMERIC,
  source_file TEXT DEFAULT 'ต้นทุนการผลิต ปี 2567.xlsx',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (data_year, crop_name)
);

ALTER TABLE production_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read production_costs" ON production_costs;
CREATE POLICY "Public read production_costs" ON production_costs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Editor insert production_costs" ON production_costs;
CREATE POLICY "Editor insert production_costs" ON production_costs
  FOR INSERT TO authenticated WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "Editor update production_costs" ON production_costs;
CREATE POLICY "Editor update production_costs" ON production_costs
  FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());

DROP POLICY IF EXISTS "Admin delete production_costs" ON production_costs;
CREATE POLICY "Admin delete production_costs" ON production_costs
  FOR DELETE TO authenticated USING (public.is_admin());

INSERT INTO production_costs (
  data_year, crop_name, yield_kg_per_rai, revenue_baht_per_rai,
  seed_cost_baht, fertilizer_cost_baht, pesticide_cost_baht,
  service_cost_baht, equipment_cost_baht, fuel_cost_baht,
  repair_depreciation_cost_baht, packaging_cost_baht, other_cost_baht,
  total_cost_baht
) VALUES
  (2567, 'ข้าวนาปี', 774, 8136, 579, 1341, 719, 1583, 25, 365, 68, 0, 430, 5110),
  (2567, 'ข้าวนาปรัง', 746, 7259, 563, 1446, 666, 1674, 28, 441, 69, 0, 508, 5395),
  (2567, 'อ้อยโรงงาน', 11911, 22549, 5454, 3335, 1120, 3108, 403, 925, 103, 0, 388, 14836),
  (2567, 'ส้มโอ', 1015, 25783, 3839, 3083, 1531, 480, 660, 663, 307, 140, 1016, 11719),
  (2567, 'ฝรั่ง', 1397, 32232, 1061, 3228, 912, 485, 226, 573, 197, 700, 958, 8340),
  (2567, 'มะพร้าว', 2789, 37740, 1161, 905, 615, 1096, 469, 1225, 86, 14, 585, 6156),
  (2567, 'กล้วยไม้', 2063, 130907, 126667, 27447, 5627, 933, 34483, 783, 700, 967, 2960, 200567)
ON CONFLICT (data_year, crop_name) DO UPDATE SET
  yield_kg_per_rai = EXCLUDED.yield_kg_per_rai,
  revenue_baht_per_rai = EXCLUDED.revenue_baht_per_rai,
  seed_cost_baht = EXCLUDED.seed_cost_baht,
  fertilizer_cost_baht = EXCLUDED.fertilizer_cost_baht,
  pesticide_cost_baht = EXCLUDED.pesticide_cost_baht,
  service_cost_baht = EXCLUDED.service_cost_baht,
  equipment_cost_baht = EXCLUDED.equipment_cost_baht,
  fuel_cost_baht = EXCLUDED.fuel_cost_baht,
  repair_depreciation_cost_baht = EXCLUDED.repair_depreciation_cost_baht,
  packaging_cost_baht = EXCLUDED.packaging_cost_baht,
  other_cost_baht = EXCLUDED.other_cost_baht,
  total_cost_baht = EXCLUDED.total_cost_baht,
  updated_at = NOW();
