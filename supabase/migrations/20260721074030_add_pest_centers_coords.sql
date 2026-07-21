-- Add latitude and longitude columns to pest_centers
ALTER TABLE public.pest_centers 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;
