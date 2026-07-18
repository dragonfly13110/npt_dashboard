
-- Temporarily allow anon insert for data import
CREATE POLICY "Allow anon insert for import" ON public.fire_hotspots
  FOR INSERT TO anon WITH CHECK (true);
;
