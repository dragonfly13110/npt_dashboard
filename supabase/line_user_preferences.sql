CREATE TABLE IF NOT EXISTS public.line_user_preferences (
  line_user_id TEXT PRIMARY KEY
    CHECK (char_length(line_user_id) BETWEEN 1 AND 100),
  crop TEXT CHECK (crop IS NULL OR char_length(crop) BETWEEN 1 AND 50),
  district TEXT CHECK (district IS NULL OR district IN (
    'เมืองนครปฐม', 'กำแพงแสน', 'นครชัยศรี', 'ดอนตูม',
    'บางเลน', 'สามพราน', 'พุทธมณฑล'
  )),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (crop IS NOT NULL OR district IS NOT NULL)
);

ALTER TABLE public.line_user_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.line_user_preferences FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.line_user_preferences TO service_role;
