-- =============================================================
-- ALTER TABLE: large_plots — เพิ่มคอลัมน์ใหม่ให้ตรงกับ spreadsheet
-- วิธีใช้: Copy ทั้งหมดไปวางใน Supabase Dashboard > SQL Editor > Run
-- =============================================================

ALTER TABLE large_plots ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE large_plots ADD COLUMN IF NOT EXISTS commodity_group TEXT;
ALTER TABLE large_plots ADD COLUMN IF NOT EXISTS secondary_commodity TEXT;
ALTER TABLE large_plots ADD COLUMN IF NOT EXISTS subdistrict TEXT;
ALTER TABLE large_plots ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE large_plots ADD COLUMN IF NOT EXISTS agency TEXT;
