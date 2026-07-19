REVOKE EXECUTE ON FUNCTION public.current_profile_department() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_profile_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_editor() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_viewer() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_profile_department() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_viewer() TO authenticated;
