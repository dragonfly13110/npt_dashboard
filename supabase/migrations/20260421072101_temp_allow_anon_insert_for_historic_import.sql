
-- Create a broader policy for anon that allows all operations for import
CREATE POLICY "Allow anon all for import" ON public.fire_hotspots
  FOR ALL TO anon USING (true) WITH CHECK (true);
;
