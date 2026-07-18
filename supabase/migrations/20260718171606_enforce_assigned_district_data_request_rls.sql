-- District editors may only work on Data Requests assigned to their own district.
-- Admin policies from the baseline remain unchanged and retain full access.

DROP POLICY IF EXISTS "Editor read assigned data_requests" ON public.data_requests;
DROP POLICY IF EXISTS "Editor read own data_request_assignments" ON public.data_request_assignments;
DROP POLICY IF EXISTS "Editor upsert own data_request_responses" ON public.data_request_responses;

CREATE POLICY "Assigned editor read data_requests"
  ON public.data_requests
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND EXISTS (
      SELECT 1
      FROM public.data_request_assignments AS assignment
      WHERE assignment.request_id = data_requests.id
        AND assignment.district = public.current_profile_department()
    )
  );

CREATE POLICY "Assigned editor read data_request_assignments"
  ON public.data_request_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
  );

CREATE POLICY "Assigned editor update own data_request_assignments"
  ON public.data_request_assignments
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
  )
  WITH CHECK (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
  );

CREATE POLICY "Assigned editor read data_request_responses"
  ON public.data_request_responses
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
    AND EXISTS (
      SELECT 1
      FROM public.data_request_assignments AS assignment
      WHERE assignment.request_id = data_request_responses.request_id
        AND assignment.district = data_request_responses.district
    )
  );

CREATE POLICY "Assigned editor insert own data_request_responses"
  ON public.data_request_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.data_request_assignments AS assignment
      WHERE assignment.request_id = data_request_responses.request_id
        AND assignment.district = data_request_responses.district
    )
  );

CREATE POLICY "Assigned editor update own data_request_responses"
  ON public.data_request_responses
  FOR UPDATE TO authenticated
  USING (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.data_request_assignments AS assignment
      WHERE assignment.request_id = data_request_responses.request_id
        AND assignment.district = data_request_responses.district
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('editor', 'district_editor')
    AND district = public.current_profile_department()
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.data_request_assignments AS assignment
      WHERE assignment.request_id = data_request_responses.request_id
        AND assignment.district = data_request_responses.district
    )
  );

CREATE OR REPLACE FUNCTION public.guard_assigned_data_request_assignment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_profile_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.district IS DISTINCT FROM OLD.district
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.status <> 'submitted'
    OR NEW.submitted_at IS NULL THEN
    RAISE EXCEPTION 'Editors may only submit their assigned data request'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_assigned_data_request_response_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_profile_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.request_id IS DISTINCT FROM OLD.request_id
    OR NEW.district IS DISTINCT FROM OLD.district
    OR NEW.submitted_by IS DISTINCT FROM auth.uid()
    OR NEW.submitted_at IS NULL THEN
    RAISE EXCEPTION 'Editors may only update their own assigned response'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_assigned_data_request_assignment_update
  ON public.data_request_assignments;
CREATE TRIGGER guard_assigned_data_request_assignment_update
  BEFORE UPDATE ON public.data_request_assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_assigned_data_request_assignment_update();

DROP TRIGGER IF EXISTS guard_assigned_data_request_response_update
  ON public.data_request_responses;
CREATE TRIGGER guard_assigned_data_request_response_update
  BEFORE UPDATE ON public.data_request_responses
  FOR EACH ROW EXECUTE FUNCTION public.guard_assigned_data_request_response_update();
