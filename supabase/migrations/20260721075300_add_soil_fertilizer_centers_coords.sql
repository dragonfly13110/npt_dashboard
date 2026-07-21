-- Add latitude and longitude columns to soil_fertilizer_centers
ALTER TABLE public.soil_fertilizer_centers 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;
