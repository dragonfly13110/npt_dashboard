
-- Remove the temporary anon ALL policy
DROP POLICY IF EXISTS "Allow anon all for import" ON public.fire_hotspots;

-- Keep only the SELECT policy for anon
-- CREATE POLICY "Anyone can view fire hotspots" ON public.fire_hotspots FOR SELECT TO anon USING (true);
;
