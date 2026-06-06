-- =========================================================================
-- คำแนะนำ: คัดลอกคำสั่งด้านล่างนี้ไปรันใน Supabase Dashboard > SQL Editor > Run
-- =========================================================================

-- 1. ลบตารางเดิมออก (กรุณาสำรองข้อมูลหากจำเป็น แต่ตารางสรุปนี้สามารถคำนวณสดจากตารางอื่นได้ 100%)
DROP TABLE IF EXISTS public.farmer_institutes CASCADE;

-- 2. สร้าง SQL View ขึ้นมาทดแทนตารางเดิมเพื่อประมวลผลคำนวณแบบ Dynamic (สดใหม่เสมอ 100%)
CREATE OR REPLACE VIEW public.farmer_institutes AS
WITH districts AS (
  SELECT unnest(ARRAY[
    'เมืองนครปฐม', 
    'กำแพงแสน', 
    'นครชัยศรี', 
    'ดอนตูม', 
    'บางเลน', 
    'สามพราน', 
    'พุทธมณฑล'
  ]) AS district
),
ce_counts AS (
  SELECT district, COUNT(*)::int AS count
  FROM public.community_enterprises
  GROUP BY district
),
hw_counts AS (
  -- นับเฉพาะกลุ่มแม่บ้านเกษตรกรในปีล่าสุดที่มีข้อมูลในระบบ
  SELECT district, COUNT(*)::int AS count
  FROM public.housewife_farmer_groups
  WHERE year = (SELECT MAX(year) FROM public.housewife_farmer_groups)
  GROUP BY district
),
yf_counts AS (
  -- นับเฉพาะกลุ่มยุวเกษตรกรในปีล่าสุดที่มีข้อมูลในระบบ
  SELECT district, COUNT(*)::int AS count
  FROM public.young_farmer_groups_detailed
  WHERE data_year = (SELECT MAX(data_year) FROM public.young_farmer_groups_detailed)
  GROUP BY district
),
career_counts AS (
  -- นับเฉพาะกลุ่มส่งเสริมอาชีพในปีล่าสุดที่มีข้อมูลในระบบ
  SELECT district, COUNT(*)::int AS count
  FROM public.agricultural_career_groups
  WHERE data_year = (SELECT MAX(data_year) FROM public.agricultural_career_groups)
  GROUP BY district
),
sf_counts AS (
  -- นับเฉพาะ Smart Farmer ในปีล่าสุดที่มีข้อมูลในระบบ
  SELECT district, COUNT(*)::int AS count
  FROM public.smart_farmer_sf
  WHERE data_year = (SELECT MAX(data_year) FROM public.smart_farmer_sf)
  GROUP BY district
),
ysf_counts AS (
  -- นับเฉพาะ Young Smart Farmer ในปีล่าสุดที่มีข้อมูลในระบบ
  SELECT district, COUNT(*)::int AS count
  FROM public.young_smart_farmer_ysf
  WHERE data_year = (SELECT MAX(data_year) FROM public.young_smart_farmer_ysf)
  GROUP BY district
)
SELECT
  -- สร้างแถว ID แบบเรียงลำดับเพื่อให้ตัวจับคิวรีตารางฝั่ง React/Client สามารถอ้างอิงเป็นคีย์หลักที่ไม่ซ้ำได้
  row_number() OVER ()::bigint AS id,
  d.district,
  -- ผลรวมกลุ่มทั้งหมด (วิสาหกิจ + แม่บ้าน + ยุวเกษตรกร + ส่งเสริมอาชีพ)
  (coalesce(ce.count, 0) + coalesce(hw.count, 0) + coalesce(yf.count, 0) + coalesce(career.count, 0))::int AS total_groups,
  coalesce(ce.count, 0)::int AS community_enterprise_groups,
  coalesce(hw.count, 0)::int AS housewives_groups,
  coalesce(yf.count, 0)::int AS young_farmer_groups,
  coalesce(career.count, 0)::int AS career_promotion_groups,
  -- กำหนดค่า เกษตรกรหมู่บ้าน (กม.) แบบคงที่ เนื่องจากเป็นตัวเลขค่าสถิติสะสมที่ไม่มีตารางรายการแยกเฉพาะ
  CASE d.district
    WHEN 'เมืองนครปฐม' THEN 210
    WHEN 'กำแพงแสน' THEN 204
    WHEN 'นครชัยศรี' THEN 98
    WHEN 'ดอนตูม' THEN 69
    WHEN 'บางเลน' THEN 179
    WHEN 'สามพราน' THEN 137
    WHEN 'พุทธมณฑล' THEN 21
    ELSE 0
  END::int AS village_farmers_count,
  coalesce(sf.count, 0)::int AS smart_farmer_count,
  coalesce(ysf.count, 0)::int AS young_smart_farmer_count,
  now() AS created_at
FROM districts d
LEFT JOIN ce_counts ce ON ce.district = d.district
LEFT JOIN hw_counts hw ON hw.district = d.district
LEFT JOIN yf_counts yf ON yf.district = d.district
LEFT JOIN career_counts career ON career.district = d.district
LEFT JOIN sf_counts sf ON sf.district = d.district
LEFT JOIN ysf_counts ysf ON ysf.district = d.district;

-- 3. มอบสิทธิ์ในการเข้าถึงให้กับบทบาท anon และ authenticated (สอดคล้องกับ RLS เดิมของโครงการ)
GRANT SELECT ON public.farmer_institutes TO anon, authenticated;
