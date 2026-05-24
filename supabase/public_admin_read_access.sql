-- Make general administration reference data publicly readable.
-- These tables contain public-facing personnel, asset, and budget information.
-- Write access remains controlled by the existing editor/admin policies.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['personnel', 'assets', 'budgets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$I" ON %1$I', tbl);
    EXECUTE format('CREATE POLICY "Public read %1$I" ON %1$I FOR SELECT TO anon, authenticated USING (true)', tbl);
  END LOOP;
END $$;
