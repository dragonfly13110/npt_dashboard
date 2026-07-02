ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS executive_training TEXT[] DEFAULT '{}'::TEXT[];

