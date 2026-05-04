-- =============================================================
-- Migration: Data Requests (Province to District)
-- Copy this file into Supabase SQL Editor and run once.
-- =============================================================

CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  sheet_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  deadline DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE data_requests ADD COLUMN IF NOT EXISTS sheet_url TEXT;

CREATE TABLE IF NOT EXISTS data_request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES data_requests(id) ON DELETE CASCADE,
  district TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (request_id, district)
);

CREATE TABLE IF NOT EXISTS data_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES data_requests(id) ON DELETE CASCADE,
  district TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (request_id, district)
);

CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_requests_created_at ON data_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_request_assignments_request ON data_request_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_data_request_assignments_district ON data_request_assignments(district);
CREATE INDEX IF NOT EXISTS idx_data_request_responses_request ON data_request_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_data_request_responses_district ON data_request_responses(district);

ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_request_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_request_responses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_profile_department()
RETURNS TEXT AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Admin full access data_requests" ON data_requests;
CREATE POLICY "Admin full access data_requests" ON data_requests
  FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "Editor read assigned data_requests" ON data_requests;
CREATE POLICY "Editor read assigned data_requests" ON data_requests
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() = 'editor'
    AND EXISTS (
      SELECT 1 FROM data_request_assignments a
      WHERE a.request_id = data_requests.id
      AND a.district = public.current_profile_department()
    )
  );

DROP POLICY IF EXISTS "Admin full access data_request_assignments" ON data_request_assignments;
CREATE POLICY "Admin full access data_request_assignments" ON data_request_assignments
  FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "Editor read own data_request_assignments" ON data_request_assignments;
CREATE POLICY "Editor read own data_request_assignments" ON data_request_assignments
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() = 'editor'
    AND district = public.current_profile_department()
  );

DROP POLICY IF EXISTS "Admin full access data_request_responses" ON data_request_responses;
CREATE POLICY "Admin full access data_request_responses" ON data_request_responses
  FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');

DROP POLICY IF EXISTS "Editor upsert own data_request_responses" ON data_request_responses;
CREATE POLICY "Editor upsert own data_request_responses" ON data_request_responses
  FOR ALL TO authenticated
  USING (
    public.current_profile_role() = 'editor'
    AND district = public.current_profile_department()
  )
  WITH CHECK (
    public.current_profile_role() = 'editor'
    AND district = public.current_profile_department()
  );
