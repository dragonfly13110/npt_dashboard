-- =============================================================
-- Migration: RBAC + Audit Log
-- สำนักงานเกษตรจังหวัดนครปฐม
-- วิธีใช้: Copy ทั้งหมดไปวางใน Supabase Dashboard > SQL Editor > Run
-- =============================================================

-- ==================== 1. ปรับปรุง profiles ====================

-- เปลี่ยน default role เป็น viewer (ผู้ใช้ใหม่เริ่มจากดูอย่างเดียว)
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- ==================== 2. สร้างตาราง audit_logs ====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,        -- 'CREATE', 'UPDATE', 'DELETE'
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับ query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- ==================== 3. RLS สำหรับ audit_logs ====================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ทุกคนที่ login แล้วสามารถ insert audit log ได้
CREATE POLICY "Allow authenticated insert audit" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- เฉพาะ admin เท่านั้นที่ดู audit log ได้
CREATE POLICY "Allow admin read audit" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ==================== 4. อัปเดต handle_new_user ให้ set role = viewer ====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== เสร็จแล้ว! ====================
-- หลังจากรัน SQL นี้ ให้ไปแก้ role ของ user ปัจจุบันใน profiles table:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
