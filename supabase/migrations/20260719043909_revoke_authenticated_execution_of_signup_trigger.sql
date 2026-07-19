-- This function is invoked by the auth.users trigger, not directly by API users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
