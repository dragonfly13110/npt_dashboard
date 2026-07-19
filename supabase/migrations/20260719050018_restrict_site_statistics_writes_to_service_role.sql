DROP POLICY IF EXISTS "Enable update for all users"
  ON public.site_statistics;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.site_statistics
  FROM anon, authenticated;

-- Visitor counting is performed by the Netlify function with service_role.
REVOKE EXECUTE ON FUNCTION public.increment_site_visit()
  FROM anon, authenticated;
