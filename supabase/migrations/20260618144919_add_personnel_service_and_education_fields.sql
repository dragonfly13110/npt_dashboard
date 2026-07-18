alter table public.personnel
  add column if not exists appointed_date date,
  add column if not exists current_position_start_date date,
  add column if not exists education text,
  add column if not exists highest_education text,
  add column if not exists birth_date date;

grant select on table public.personnel to authenticated;

revoke select on table public.personnel from anon;
grant select (
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
) on table public.personnel to anon;;
