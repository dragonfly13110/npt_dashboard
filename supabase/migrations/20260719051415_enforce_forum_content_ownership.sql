ALTER TABLE public.forum_posts
  ADD COLUMN author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id);

ALTER TABLE public.forum_comments
  ADD COLUMN author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.forum_posts;
DROP POLICY IF EXISTS "Enable update for all users" ON public.forum_posts;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.forum_comments;
DROP POLICY IF EXISTS "Enable update for all users" ON public.forum_comments;

CREATE POLICY "Authenticated users create own forum posts"
  ON public.forum_posts FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors update own forum posts"
  ON public.forum_posts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authenticated users create own forum comments"
  ON public.forum_comments FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "Authors update own forum comments"
  ON public.forum_comments FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.forum_posts, public.forum_comments
  FROM anon;

CREATE OR REPLACE FUNCTION public.increment_forum_post_views(target_post_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_views integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.forum_posts
  SET views = COALESCE(views, 0) + 1
  WHERE id = target_post_id
  RETURNING views INTO updated_views;

  RETURN updated_views;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_forum_post_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_forum_post_views(uuid) TO authenticated;
