-- Restrict anonymous users to public-safe columns on person-level tables.
-- RLS still controls row access; these grants prevent anon clients from selecting
-- private name, phone, address, income, and contact fields directly.

CREATE OR REPLACE FUNCTION public._grant_anon_public_columns(p_table text, p_private_columns text[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  public_columns text;
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RETURN;
  END IF;

  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
  INTO public_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table
    AND NOT (column_name = ANY (p_private_columns));

  IF public_columns IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon', p_table);
  EXECUTE format('GRANT SELECT (%s) ON TABLE public.%I TO anon', public_columns, p_table);
  EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', p_table);
END;
$$;

SELECT public._grant_anon_public_columns('smart_farmer_sf', ARRAY[
  'citizen_id', 'title', 'first_name', 'last_name', 'full_name', 'phone', 'annual_agri_income'
]);

SELECT public._grant_anon_public_columns('young_smart_farmer_ysf', ARRAY[
  'title', 'first_name', 'last_name', 'full_name', 'address_no', 'moo', 'subdistrict',
  'phone', 'line_id', 'email', 'facebook', 'annual_agri_income'
]);

SELECT public._grant_anon_public_columns('agricultural_career_groups', ARRAY[
  'address_no', 'moo', 'mobile'
]);

SELECT public._grant_anon_public_columns('young_farmer_groups_detailed', ARRAY[
  'address_no', 'moo', 'phone', 'mobile'
]);

SELECT public._grant_anon_public_columns('smart_farmers', ARRAY[
  'full_name', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('coconut_aromatic_surveys', ARRAY[
  'farmer_name', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('farmer_registry', ARRAY[
  'contact_person', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('certifications', ARRAY[
  'owner_name', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('forecast_plots', ARRAY[
  'owner_name', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('plant_doctors', ARRAY[
  'full_name', 'address_no', 'village_no', 'contact_phone', 'notes'
]);

SELECT public._grant_anon_public_columns('large_plots', ARRAY[
  'contact_person', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('agri_tourism', ARRAY[
  'contact_person', 'phone', 'address'
]);

SELECT public._grant_anon_public_columns('personnel', ARRAY[
  'full_name', 'phone', 'email', 'address', 'appointed_date',
  'current_position_start_date', 'education', 'highest_education', 'birth_date'
]);

SELECT public._grant_anon_public_columns('forum_posts', ARRAY[
  'author_name', 'avatar'
]);

SELECT public._grant_anon_public_columns('forum_comments', ARRAY[
  'author_name', 'avatar'
]);

DROP FUNCTION public._grant_anon_public_columns(text, text[]);
