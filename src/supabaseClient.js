import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cjjirwqoovypymndhvwt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamlyd3Fvb3Z5cHltbmRodnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDQyOTQsImV4cCI6MjA4NzUyMDI5NH0.4IRMDKdboN2BrAfgGW9-Y6LGw6tp6yb4Sjbc9ZL3hEA';

if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('[Supabase] VITE_SUPABASE_URL not found in env, using fallback');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
