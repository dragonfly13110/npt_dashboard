CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    author_name TEXT NOT NULL,
    district TEXT,
    province TEXT,
    avatar TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.forum_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    avatar TEXT,
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.forum_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.forum_posts FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.forum_comments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.forum_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.forum_comments FOR UPDATE USING (true);
;
