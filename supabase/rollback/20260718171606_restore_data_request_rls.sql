-- Emergency rollback for 20260718171606_enforce_assigned_district_data_request_rls.sql.
-- Run as an administrator in the Supabase SQL Editor only if the new RLS
-- policy prevents legitimate Data Request work in Staging.

DROP TRIGGER IF EXISTS guard_assigned_data_request_assignment_update
  ON public.data_request_assignments;
DROP TRIGGER IF EXISTS guard_assigned_data_request_response_update
  ON public.data_request_responses;
DROP FUNCTION IF EXISTS public.guard_assigned_data_request_assignment_update();
DROP FUNCTION IF EXISTS public.guard_assigned_data_request_response_update();

DROP POLICY IF EXISTS "Assigned editor read data_requests" ON public.data_requests;
DROP POLICY IF EXISTS "Assigned editor read data_request_assignments" ON public.data_request_assignments;
DROP POLICY IF EXISTS "Assigned editor update own data_request_assignments" ON public.data_request_assignments;
DROP POLICY IF EXISTS "Assigned editor read data_request_responses" ON public.data_request_responses;
DROP POLICY IF EXISTS "Assigned editor insert own data_request_responses" ON public.data_request_responses;
DROP POLICY IF EXISTS "Assigned editor update own data_request_responses" ON public.data_request_responses;

CREATE POLICY "Editor read assigned data_requests" ON public.data_requests
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() = 'editor'
    AND EXISTS (
      SELECT 1 FROM public.data_request_assignments AS assignment
      WHERE assignment.request_id = data_requests.id
        AND assignment.district = public.current_profile_department()
    )
  );

CREATE POLICY "Editor read own data_request_assignments" ON public.data_request_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() = 'editor'
    AND district = public.current_profile_department()
  );

CREATE POLICY "Editor upsert own data_request_responses" ON public.data_request_responses
  TO authenticated
  USING (
    public.current_profile_role() = 'editor'
    AND district = public.current_profile_department()
  )
  WITH CHECK (
    public.current_profile_role() = 'editor'
    AND district = public.current_profile_department()
  );
