-- Pin function name resolution to trusted objects in the public schema.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.increment_site_visit() SET search_path = public;
ALTER FUNCTION public.recalculate_province_total() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
