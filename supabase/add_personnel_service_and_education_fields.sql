ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS appointed_date DATE,
  ADD COLUMN IF NOT EXISTS current_position_start_date DATE,
  ADD COLUMN IF NOT EXISTS education TEXT,
  ADD COLUMN IF NOT EXISTS highest_education TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

GRANT SELECT ON TABLE public.personnel TO authenticated;

REVOKE SELECT ON TABLE public.personnel FROM anon;
GRANT SELECT (
  id,
  position,
  department,
  status,
  notes,
  created_at,
  updated_at,
  province,
  district,
  office_type,
  sort_order
) ON TABLE public.personnel TO anon;
