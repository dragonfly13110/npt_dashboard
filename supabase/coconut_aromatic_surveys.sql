create table if not exists coconut_aromatic_surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  record_date date not null default '2026-06-01',
  round_no integer not null default 1,
  round_label text,
  round_start_date date,
  round_end_date date,
  farmer_code text,
  prefix text,
  farmer_name text not null,
  house_no text,
  village_no text,
  subdistrict text,
  district text,
  own_area_rai numeric default 0,
  rented_area_rai numeric default 0,
  planted_area_rai numeric default 0,
  production_cost_per_rai numeric default 0,
  cost_per_fruit numeric default 0,
  standard_fruit_per_rai numeric default 0,
  standard_percent numeric default 0,
  standard_price_per_fruit numeric default 0,
  standard_income_per_rai numeric default 0,
  small_fruit_per_rai numeric default 0,
  small_percent numeric default 0,
  small_price_per_fruit numeric default 0,
  small_income_per_rai numeric default 0,
  total_fruit_per_rai numeric default 0,
  income_per_rai numeric default 0,
  total_income numeric default 0,
  notes text
);

create index if not exists idx_coconut_aromatic_surveys_round on coconut_aromatic_surveys(round_no);
create index if not exists idx_coconut_aromatic_surveys_location on coconut_aromatic_surveys(district, subdistrict);
create index if not exists idx_coconut_aromatic_surveys_record_date on coconut_aromatic_surveys(record_date);

alter table coconut_aromatic_surveys enable row level security;

drop policy if exists "read coconut aromatic surveys" on coconut_aromatic_surveys;
create policy "read coconut aromatic surveys"
  on coconut_aromatic_surveys for select
  using (true);

drop policy if exists "edit coconut aromatic surveys" on coconut_aromatic_surveys;
create policy "edit coconut aromatic surveys"
  on coconut_aromatic_surveys for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
