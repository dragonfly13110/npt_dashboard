CREATE TABLE IF NOT EXISTS public.site_statistics (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.site_statistics (key, value)
VALUES ('total_visits', 0)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_site_visit()
RETURNS INTEGER AS $$
DECLARE
    current_visits INTEGER;
BEGIN
    UPDATE public.site_statistics 
    SET value = value + 1, updated_at = timezone('utc'::text, now())
    WHERE key = 'total_visits'
    RETURNING value INTO current_visits;
    
    RETURN current_visits;
END;
$$ LANGUAGE plpgsql;

-- Set up RLS to allow anyone to increment and read
ALTER TABLE public.site_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.site_statistics FOR SELECT USING (true);
CREATE POLICY "Enable update for all users" ON public.site_statistics FOR UPDATE USING (true);
;
