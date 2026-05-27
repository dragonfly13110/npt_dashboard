-- =============================================================
-- Migration: Alter farmer_registry to match DOAE report structure
-- รายงานผลการปรับปรุงข้อมูลทะเบียนเกษตรกร ปี 2569
-- =============================================================

-- Add new columns to match DOAE report
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS target INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_tbk_households INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_tbk_plots INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_tbk_area_rai NUMERIC;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_farmbook_households INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_farmbook_plots INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_farmbook_area_rai NUMERIC;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_eform_households INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_eform_plots INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS update_eform_area_rai NUMERIC;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS total_updated_households INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS total_updated_plots INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS total_updated_area_rai NUMERIC;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS cancelled_households INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS net_total_households INTEGER;
ALTER TABLE farmer_registry ADD COLUMN IF NOT EXISTS cutoff_date DATE;

-- Add unique constraint to prevent duplicate entries per district+year
ALTER TABLE farmer_registry DROP CONSTRAINT IF EXISTS farmer_registry_district_year_uq;
ALTER TABLE farmer_registry ADD CONSTRAINT farmer_registry_district_year_uq UNIQUE (district, data_year);
