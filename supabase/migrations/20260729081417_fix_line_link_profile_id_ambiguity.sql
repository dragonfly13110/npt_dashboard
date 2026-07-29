CREATE OR REPLACE FUNCTION public.consume_line_link_code(
  p_code_hash TEXT,
  p_line_user_id TEXT
)
RETURNS TABLE(profile_id UUID, role TEXT, department TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id UUID;
  v_profile_id UUID;
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$'
    OR p_line_user_id IS NULL OR btrim(p_line_user_id) = '' THEN
    RETURN;
  END IF;

  SELECT c.id, c.profile_id
  INTO v_code_id, v_profile_id
  FROM public.line_link_codes AS c
  WHERE c.code_hash = p_code_hash
    AND c.used_at IS NULL
    AND c.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.line_link_codes AS c
  SET used_at = now()
  WHERE c.id = v_code_id;

  DELETE FROM public.line_account_links AS l
  WHERE l.profile_id = v_profile_id OR l.line_user_id = p_line_user_id;

  INSERT INTO public.line_account_links (line_user_id, profile_id)
  VALUES (p_line_user_id, v_profile_id);

  RETURN QUERY
  SELECT p.id, COALESCE(p.role, 'viewer'), p.department
  FROM public.profiles AS p
  WHERE p.id = v_profile_id;
END;
$$;
