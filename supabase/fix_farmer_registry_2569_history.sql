BEGIN;

-- Reports scraped from pv69/ap69 were mislabeled 2568 by a page-text regex.
ALTER TABLE farmer_registry DISABLE TRIGGER trigger_recalculate_province_total;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM farmer_registry
    WHERE data_year = 2568 AND created_at >= DATE '2026-01-01'
  ) THEN
    DELETE FROM farmer_registry WHERE data_year = 2569;
    UPDATE farmer_registry
    SET data_year = 2569
    WHERE data_year = 2568 AND created_at >= DATE '2026-01-01';
  END IF;
END $$;

ALTER TABLE farmer_registry ENABLE TRIGGER trigger_recalculate_province_total;

UPDATE farmer_registry_snapshots
SET data_year = 2569
WHERE data_year = 2568 AND snapshot_date >= DATE '2026-01-01';

UPDATE farmer_registry_subdistricts
SET data_year = 2569
WHERE data_year = 2568 AND created_at >= DATE '2026-01-01';

UPDATE farmer_registry_subdistrict_snapshots
SET data_year = 2569
WHERE data_year = 2568 AND snapshot_date >= DATE '2026-01-01';

COMMIT;
