CREATE TABLE IF NOT EXISTS public.line_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE CHECK (char_length(code_hash) = 64),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.line_account_links (
  line_user_id TEXT PRIMARY KEY CHECK (char_length(line_user_id) BETWEEN 1 AND 100),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.line_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_account_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.line_link_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.line_account_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.line_link_codes TO service_role;
GRANT ALL ON TABLE public.line_account_links TO service_role;

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

  UPDATE public.line_link_codes
  SET used_at = now()
  WHERE id = v_code_id;

  DELETE FROM public.line_account_links
  WHERE profile_id = v_profile_id OR line_user_id = p_line_user_id;

  INSERT INTO public.line_account_links (line_user_id, profile_id)
  VALUES (p_line_user_id, v_profile_id);

  RETURN QUERY
  SELECT p.id, COALESCE(p.role, 'viewer'), p.department
  FROM public.profiles AS p
  WHERE p.id = v_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_line_link_code(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_line_link_code(TEXT, TEXT)
  TO service_role;;
