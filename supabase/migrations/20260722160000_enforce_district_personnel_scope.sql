DROP POLICY IF EXISTS "Role insert personnel" ON public.personnel;
DROP POLICY IF EXISTS "Role update personnel" ON public.personnel;

CREATE POLICY "Role insert personnel"
ON public.personnel
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_write_table('personnel')
  AND (
    (
      public.current_profile_role() = 'district_editor'
      AND district = public.current_profile_department()
    )
    OR public.current_profile_role() <> 'district_editor'
  )
);

CREATE POLICY "Role update personnel"
ON public.personnel
FOR UPDATE
TO authenticated
USING (
  public.can_write_table('personnel')
  AND (
    (
      public.current_profile_role() = 'district_editor'
      AND district = public.current_profile_department()
    )
    OR public.current_profile_role() <> 'district_editor'
  )
)
WITH CHECK (
  public.can_write_table('personnel')
  AND (
    (
      public.current_profile_role() = 'district_editor'
      AND district = public.current_profile_department()
    )
    OR public.current_profile_role() <> 'district_editor'
  )
);
