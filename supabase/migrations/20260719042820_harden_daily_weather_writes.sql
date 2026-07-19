DROP POLICY IF EXISTS "Enable insert access for all" ON public.daily_weather;
DROP POLICY IF EXISTS "Enable update access for all" ON public.daily_weather;

REVOKE EXECUTE ON FUNCTION public.can_write_table(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_table(text) TO authenticated;
