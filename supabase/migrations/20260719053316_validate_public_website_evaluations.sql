ALTER TABLE public.website_evaluations
  ADD CONSTRAINT website_evaluations_comments_length
  CHECK (comments IS NULL OR char_length(comments) <= 1000);

DROP POLICY IF EXISTS "Allow public insert evaluations"
  ON public.website_evaluations;

CREATE POLICY "Allow validated public insert evaluations"
  ON public.website_evaluations FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

REVOKE INSERT ON TABLE public.website_evaluations FROM anon, authenticated;
GRANT INSERT (
  user_type,
  rating_usability,
  rating_information,
  rating_speed,
  comments,
  user_id
) ON TABLE public.website_evaluations TO anon, authenticated;
