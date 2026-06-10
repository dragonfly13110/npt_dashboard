-- Database table for website evaluations / feedback
CREATE TABLE IF NOT EXISTS public.website_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_type TEXT NOT NULL, -- เกษตรกร, เจ้าหน้าที่เกษตร, ผู้ประกอบการ, นักเรียนนักศึกษา, อื่น ๆ
    rating_usability INT NOT NULL CHECK (rating_usability BETWEEN 1 AND 5),
    rating_information INT NOT NULL CHECK (rating_information BETWEEN 1 AND 5),
    rating_speed INT NOT NULL CHECK (rating_speed BETWEEN 1 AND 5),
    comments TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.website_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone (anonymous or authenticated) to submit evaluations
DROP POLICY IF EXISTS "Allow public insert evaluations" ON public.website_evaluations;
CREATE POLICY "Allow public insert evaluations" ON public.website_evaluations 
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Policy to allow only admins to read evaluations
DROP POLICY IF EXISTS "Allow admin select evaluations" ON public.website_evaluations;
CREATE POLICY "Allow admin select evaluations" ON public.website_evaluations 
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Policy to allow only admins to delete evaluations
DROP POLICY IF EXISTS "Allow admin delete evaluations" ON public.website_evaluations;
CREATE POLICY "Allow admin delete evaluations" ON public.website_evaluations 
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
