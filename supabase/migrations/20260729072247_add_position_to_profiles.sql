alter table public.profiles
add column if not exists position text;

notify pgrst, 'reload schema';
