DROP POLICY IF EXISTS "Public read personnel" ON public.personnel;
DROP POLICY IF EXISTS "Role read personnel" ON public.personnel;
DROP POLICY IF EXISTS "Users can view personnel" ON public.personnel;

CREATE POLICY "Public read personnel"
ON public.personnel
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Role scoped read personnel"
ON public.personnel
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() = 'admin'
  OR public.current_profile_department() = 'ฝ่ายบริหารทั่วไป'
  OR (
    public.current_profile_role() = 'district_editor'
    AND district = public.current_profile_department()
  )
  OR (
    public.current_profile_role() IN ('editor', 'viewer')
    AND office_type = 'Provincial'
  )
);
