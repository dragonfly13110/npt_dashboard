CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;

ALTER FUNCTION public.global_search_public(text[], text[], integer)
  SET search_path = public, extensions;
