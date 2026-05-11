# 04 การออกแบบฐานข้อมูลและตั้งค่า Supabase

ไฟล์นี้ใช้เป็นคู่มือออกแบบฐานข้อมูลและตั้งค่า Supabase สำหรับระบบ `npt_dashboard` ให้ใช้งานได้จริง ตั้งแต่การวางโครงสร้างตาราง การรัน SQL การตั้งค่า Auth, Profile, Role, Department, RLS, Audit Log, RPC สำหรับ Search และแนวทางเพิ่มตารางใหม่ในอนาคต

บทนี้ต่อจากบท 03 ที่เตรียมข้อมูลให้สะอาดแล้ว ขั้นตอนนี้คือการสร้างฐานข้อมูลให้รองรับข้อมูลเหล่านั้นอย่างเป็นระบบ ปลอดภัย และเชื่อมกับ Dashboard, Data Management, Global Search และ AI Chatbot ได้

## 1. เป้าหมายของบทนี้

เมื่อจบบทนี้ควรทำได้ดังนี้

- เข้าใจว่า Supabase ในระบบนี้ทำหน้าที่อะไร
- สร้างตารางหลักของระบบได้
- ตั้งค่า `profiles` เพื่อผูกผู้ใช้กับ role และ department ได้
- เปิดใช้ Row Level Security หรือ RLS ได้ถูกหลัก
- ตั้งค่า permission ให้เหมาะกับ public, viewer, editor และ admin
- ใช้ SQL migration ที่มีใน repo ได้เป็นลำดับ
- เพิ่มตารางใหม่ให้ Data Management, Search และ AI ใช้งานต่อได้
- ตรวจสอบความปลอดภัยก่อนเปิดใช้งานจริงได้

## 2. ภาพรวม Supabase ในระบบนี้

ระบบ `npt_dashboard` ใช้ Supabase เป็น backend หลักของข้อมูลภายใน

Supabase ใช้ทำงานหลัก 4 ส่วน

| ส่วน | ใช้ทำอะไร |
|---|---|
| Database | เก็บข้อมูลเกษตรจังหวัด ตารางกลุ่มงาน ข้อมูลผู้ใช้ ข้อมูลคำขอข้อมูล และ audit log |
| Auth | จัดการ login/logout และ session ของผู้ใช้ |
| RLS | จำกัดสิทธิ์อ่าน/เพิ่ม/แก้ไข/ลบข้อมูลในระดับฐานข้อมูล |
| RPC | สร้าง function ฝั่ง database เช่น `global_search` เพื่อค้นหาข้ามหลายตาราง |

ระบบ frontend เชื่อม Supabase ผ่านไฟล์หลัก

```text
src/supabaseClient.js
src/contexts/AuthContext.jsx
src/hooks/useSupabase.js
src/services/globalSearchService.js
src/services/chatbotDataService.js
```

## 3. สิ่งที่ต้องเตรียมก่อนตั้งค่า Supabase

ก่อนรัน SQL ควรเตรียมข้อมูลต่อไปนี้ให้พร้อม

- Supabase project ที่สร้างแล้ว
- URL ของ Supabase project
- `anon key` สำหรับ frontend
- สิทธิ์เข้า SQL Editor ของ Supabase
- รายชื่อผู้ดูแลระบบชุดแรก
- รายชื่อกลุ่มงานหรืออำเภอที่จะใช้เป็น department
- รายการตารางที่ต้องเปิดใช้จริงในระยะแรก
- ข้อมูลตัวอย่างสำหรับทดสอบอย่างน้อยตารางละ 3-5 แถว

ข้อควรระวัง:

- ห้ามนำ `service_role key` ไปใส่ใน frontend
- frontend ควรใช้เฉพาะ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
- ข้อมูลจริงที่มีข้อมูลส่วนบุคคลควรทดสอบใน environment ที่ควบคุมสิทธิ์แล้วเท่านั้น

## 4. ไฟล์ Supabase ที่มีใน repo

ใน repo มีไฟล์ SQL หลักที่ใช้ตั้งค่าฐานข้อมูล

| ไฟล์ | ใช้ทำอะไร | ควรรันเมื่อไร |
|---|---|---|
| `supabase/schema.sql` | สร้างตารางหลัก เช่น `profiles`, ตารางกลุ่มงาน และเปิด RLS เบื้องต้น | ครั้งแรกที่ตั้ง project |
| `supabase/migration_rbac_audit.sql` | ปรับ role default เป็น `viewer` และสร้าง `audit_logs` | หลังรัน schema หลัก |
| `supabase/data_requests.sql` | สร้างระบบคำขอข้อมูลจากจังหวัดไปอำเภอ | เมื่อต้องใช้ Data Request |
| `supabase/forecast_plots.sql` | สร้างตารางแปลงพยากรณ์ | เมื่อต้องใช้โมดูลอารักขาพืชส่วนนี้ |

ลำดับแนะนำในการรัน SQL

```text
1. supabase/schema.sql
2. supabase/migration_rbac_audit.sql
3. supabase/data_requests.sql
4. SQL เฉพาะตารางเสริมอื่น ๆ เช่น forecast_plots.sql
5. SQL สำหรับ RPC เช่น global_search ถ้ามีแยกไฟล์หรือเตรียมเพิ่มเอง
```

หลังรันแต่ละไฟล์ควรตรวจใน Table Editor ว่าตารางถูกสร้างครบ และตรวจใน Authentication ว่าสร้างผู้ใช้ได้ตามปกติ

## 5. โครงสร้างตารางหลักของระบบ

ระบบแบ่งตารางตามกลุ่มงาน เพื่อให้ดูแลสิทธิ์และเมนูได้ง่าย

### 5.1 ตารางระบบผู้ใช้

| ตาราง | ใช้ทำอะไร |
|---|---|
| `profiles` | เก็บข้อมูลผู้ใช้ที่ต่อจาก Supabase Auth เช่น email, full_name, department, role |
| `audit_logs` | เก็บประวัติการเพิ่ม แก้ไข ลบข้อมูล |
| `site_statistics` | เก็บสถิติการเข้าชมเว็บ ถ้ามีการเปิดใช้ |

### 5.2 ตารางฝ่ายบริหารทั่วไป

| ตาราง | ใช้ทำอะไร |
|---|---|
| `personnel` | ข้อมูลบุคลากร |
| `assets` | ข้อมูลทรัพย์สิน/ครุภัณฑ์ |
| `budgets` | ข้อมูลงบประมาณ แผนงาน โครงการ กิจกรรม และสถานะการใช้จ่าย |

### 5.3 ตารางกลุ่มยุทธศาสตร์และสารสนเทศ

| ตาราง | ใช้ทำอะไร |
|---|---|
| `farmer_registry` | ทะเบียนเกษตรกรหรือสรุปครัวเรือนเกษตรกร |
| `gis_areas` | ข้อมูลพื้นที่ GIS หรือจุดพิกัด |
| `agricultural_areas` | พื้นที่การเกษตรรายอำเภอ |
| `learning_centers` | ศูนย์เรียนรู้หรือ ศพก. |
| `disasters` | ข้อมูลภัยพิบัติด้านการเกษตร |
| `kpi_plans` | แผนงาน ตัวชี้วัด และเป้าหมาย |
| `daily_weather` | ข้อมูลสภาพอากาศและน้ำฝนรายวัน |

### 5.4 ตารางกลุ่มส่งเสริมและพัฒนาการผลิต

| ตาราง | ใช้ทำอะไร |
|---|---|
| `large_plots` | ข้อมูลแปลงใหญ่ |
| `certifications` | ข้อมูลมาตรฐาน GAP หรือใบรับรอง |
| `crop_production` | ข้อมูลการผลิตพืช |

### 5.5 ตารางกลุ่มส่งเสริมและพัฒนาเกษตรกร

| ตาราง | ใช้ทำอะไร |
|---|---|
| `community_enterprises` | วิสาหกิจชุมชน |
| `smart_farmers` | Smart Farmer / Young Smart Farmer |
| `farmer_groups` | กลุ่มแม่บ้านเกษตรกร ยุวเกษตรกร หรือกลุ่มเกษตรกรอื่น |
| `farmer_institutes` | สถาบันเกษตรกร |
| `agri_tourism` | ท่องเที่ยวเชิงเกษตร |

### 5.6 ตารางกลุ่มอารักขาพืช

| ตาราง | ใช้ทำอะไร |
|---|---|
| `forecast_plots` | แปลงพยากรณ์และเฝ้าระวังศัตรูพืช |
| `pest_centers` | ศูนย์จัดการศัตรูพืชชุมชน หรือ ศจช. |
| `soil_fertilizer_centers` | ศูนย์จัดการดินปุ๋ยชุมชน หรือ ศดปช. |
| `fire_hotspots` | จุดความร้อนหรือจุดเฝ้าระวัง PM2.5 |
| `pest_outbreaks` | ข้อมูลการระบาดศัตรูพืช |
| `biocontrol_stock` | สต็อกชีวภัณฑ์ |

### 5.7 ตารางระบบคำขอข้อมูล

| ตาราง | ใช้ทำอะไร |
|---|---|
| `data_requests` | หัวข้อคำขอข้อมูล schema แบบฟอร์ม สถานะ และกำหนดส่ง |
| `data_request_assignments` | รายการมอบหมายให้อำเภอส่งข้อมูล |
| `data_request_responses` | คำตอบที่อำเภอส่งกลับมา |

## 6. มาตรฐานการออกแบบตาราง

ทุกตารางที่ใช้กับระบบควรมีโครงสร้างพื้นฐานใกล้เคียงกัน เพื่อให้ Data Management, Search, Dashboard และ AI ใช้งานร่วมกันได้ง่าย

คอลัมน์ที่แนะนำให้มีในเกือบทุกตาราง

| คอลัมน์ | ชนิดข้อมูล | เหตุผล |
|---|---|---|
| `id` | `uuid` | primary key ของแต่ละรายการ |
| `district` | `text` | ใช้กรองและสรุปรายอำเภอ |
| `subdistrict` | `text` | ใช้กรองระดับตำบล ถ้ามี |
| `created_at` | `timestamptz` | วันที่สร้างข้อมูล |
| `updated_at` | `timestamptz` | วันที่แก้ไขล่าสุด |
| `notes` | `text` | เก็บหมายเหตุหรือข้อมูลประกอบ |

คอลัมน์ตามประเภทข้อมูล

| ประเภทข้อมูล | คอลัมน์ที่ควรมี |
|---|---|
| ข้อมูลสถานที่ | `latitude`, `longitude`, `address`, `location_name` |
| ข้อมูลปีงบประมาณ | `fiscal_year`, `budget_amount`, `spent_amount` |
| ข้อมูลแปลง/พื้นที่ | `area_rai`, `member_count`, `commodity` |
| ข้อมูลการรับรอง | `cert_type`, `commodity`, `status`, `issued_date`, `expired_date` |
| ข้อมูลเหตุการณ์ | `report_date`, `severity`, `status` |

หลักการตั้งชื่อ field

- ใช้ภาษาอังกฤษแบบ `snake_case`
- ใช้ชื่อเดียวกันสำหรับความหมายเดียวกัน เช่น `district`, `subdistrict`, `latitude`, `longitude`
- อย่าใช้ชื่อคลุมเครือ เช่น `data1`, `data2`, `amount1`
- ถ้าเป็นตัวเลข ให้ชื่อบอกหน่วย เช่น `area_rai`, `budget_amount`, `production_ton`
- ถ้าเป็นวันที่ ให้ลงท้ายด้วย `_date` หรือ `_at` ตามความหมาย

## 7. ตัวอย่าง SQL สำหรับสร้างตารางใหม่

ตัวอย่างนี้ใช้สร้างตารางข้อมูลแหล่งเรียนรู้ใหม่ สมมติชื่อ `field_learning_sites`

```sql
CREATE TABLE IF NOT EXISTS field_learning_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL,
  district TEXT NOT NULL,
  subdistrict TEXT,
  site_type TEXT,
  main_activity TEXT,
  area_rai NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  contact_person TEXT,
  contact_phone TEXT,
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('public', 'internal', 'restricted')),
  data_year INTEGER,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_learning_sites_district ON field_learning_sites(district);
CREATE INDEX IF NOT EXISTS idx_field_learning_sites_site_type ON field_learning_sites(site_type);
CREATE INDEX IF NOT EXISTS idx_field_learning_sites_visibility ON field_learning_sites(visibility);
CREATE INDEX IF NOT EXISTS idx_field_learning_sites_created_at ON field_learning_sites(created_at DESC);

ALTER TABLE field_learning_sites ENABLE ROW LEVEL SECURITY;
```

แนวคิดของตารางนี้

- `site_name` เป็นข้อมูลบังคับ เพราะใช้แสดงในตารางและ Search
- `district` เป็นข้อมูลบังคับ เพราะ Dashboard ต้องสรุปรายอำเภอได้
- `visibility` ใช้แยกว่าแสดง public ได้หรือไม่
- `latitude` และ `longitude` เตรียมไว้สำหรับแผนที่
- `source` ใช้ตรวจย้อนกลับว่าได้ข้อมูลมาจากไหน

## 8. Supabase Auth และตาราง profiles

Supabase Auth เก็บข้อมูล login ของผู้ใช้ แต่ระบบต้องมีตาราง `profiles` เพื่อเก็บข้อมูลประกอบ เช่น ชื่อ กลุ่มงาน และสิทธิ์

โครงสร้างพื้นฐานของ `profiles`

| คอลัมน์ | ความหมาย |
|---|---|
| `id` | UUID เดียวกับ `auth.users.id` |
| `email` | email ของผู้ใช้ |
| `full_name` | ชื่อผู้ใช้ |
| `department` | กลุ่มงานหรืออำเภอที่สังกัด |
| `role` | สิทธิ์การใช้งาน เช่น `admin`, `editor`, `viewer` |
| `created_at` | วันที่สร้าง profile |
| `updated_at` | วันที่แก้ไขล่าสุด |

ใน `schema.sql` มี function `handle_new_user()` เพื่อสร้าง profile อัตโนมัติเมื่อมีผู้ใช้สมัครหรือถูกสร้างใน Auth

หลักการทำงาน

```text
Supabase Auth สร้าง user
        ↓
Trigger on_auth_user_created ทำงาน
        ↓
เพิ่มแถวใน public.profiles
        ↓
frontend อ่าน role และ department จาก profiles
        ↓
ระบบกรองเมนูและสิทธิ์ตาม role/department
```

## 9. Role ที่ควรใช้ในระบบ

ระบบนี้ใช้ role หลักตามแนวคิดใน frontend

| role | ความหมาย | สิทธิ์ที่ควรมี |
|---|---|---|
| `guest` | ผู้ใช้แบบไม่ login หรือโหมดสาธารณะ | ดูเฉพาะข้อมูล public หรือข้อมูลที่ระบบอนุญาต |
| `viewer` | ผู้ใช้ภายในที่ดูข้อมูลได้ | อ่านข้อมูลตามกลุ่มงานหรือข้อมูลที่เปิดให้ดู |
| `editor` | เจ้าหน้าที่ที่จัดการข้อมูลได้ | อ่านและแก้ไขข้อมูลในกลุ่มงาน/อำเภอของตัวเอง |
| `admin` | ผู้ดูแลระบบ | จัดการผู้ใช้ ข้อมูลทั้งหมด audit log และระบบโดยรวม |

คำแนะนำ:

- ผู้ใช้ใหม่ควรเริ่มเป็น `viewer`
- อย่าให้ทุกคนเป็น `admin`
- ผู้ที่ import ข้อมูลควรเป็น `editor` หรือ `admin`
- การลบข้อมูลควรจำกัดเฉพาะ `admin`
- `guest` ไม่ควรมีสิทธิ์เขียนข้อมูลใด ๆ ใน Supabase

## 10. Department และการผูกกับกลุ่มงาน

ใน frontend มี mapping กลุ่มงานประมาณนี้

| department | group key | ตารางหลักที่เกี่ยวข้อง |
|---|---|---|
| `ฝ่ายบริหารทั่วไป` | `admin` | `personnel`, `assets`, `budgets` |
| `กลุ่มยุทธศาสตร์และสารสนเทศ` | `strategy` | `farmer_registry`, `gis_areas`, `disasters`, `kpi_plans` และข้อมูลยุทธศาสตร์อื่น |
| `กลุ่มส่งเสริมและพัฒนาการผลิต` | `production` | `large_plots`, `learning_centers`, `certifications`, `crop_production` |
| `กลุ่มส่งเสริมและพัฒนาเกษตรกร` | `development` | `community_enterprises`, `smart_farmers`, `farmer_groups`, `agri_tourism` |
| `กลุ่มอารักขาพืช` | `protection` | `forecast_plots`, `pest_centers`, `soil_fertilizer_centers`, `fire_hotspots` |

ถ้าใช้ Data Request สำหรับอำเภอ อาจใช้ `department` เป็นชื่ออำเภอ เช่น `พุทธมณฑล`, `สามพราน`, `บางเลน` เพื่อให้ policy ใน `data_requests.sql` เทียบกับ field `district` ได้

ข้อควรระวัง:

- ถ้า `department` ใช้ทั้งชื่อกลุ่มงานและชื่ออำเภอในระบบเดียวกัน ต้องออกแบบให้ชัดว่าเมนูไหนใช้แบบใด
- ถ้าจะใช้จริงระยะยาว แนะนำเพิ่ม field แยก เช่น `department_type`, `district`, `office_group` เพื่อไม่ให้ความหมายปนกัน
- ในช่วงเริ่มต้นสามารถใช้ `department` แบบเดียวกับโค้ดปัจจุบันได้ แต่ต้องตั้งค่าผู้ใช้ให้ตรงกับ flow ที่ใช้งาน

## 11. การตั้ง admin คนแรก

หลังรัน SQL และสร้างผู้ใช้ใน Supabase Auth แล้ว ต้องตั้ง user คนแรกให้เป็น admin

ตัวอย่าง SQL

```sql
UPDATE profiles
SET
  role = 'admin',
  full_name = 'ผู้ดูแลระบบ',
  department = 'ฝ่ายบริหารทั่วไป',
  updated_at = NOW()
WHERE email = 'your-email@example.com';
```

ตรวจสอบผล

```sql
SELECT id, email, full_name, department, role
FROM profiles
ORDER BY created_at DESC;
```

ถ้าไม่ตั้ง admin คนแรก ระบบอาจ login ได้แต่เข้าเมนูจัดการผู้ใช้หรือ audit log ไม่ได้

## 12. การเพิ่มผู้ใช้ทั่วไป

ขั้นตอนแนะนำ

1. สร้างผู้ใช้ใน Supabase Auth หรือให้ผู้ใช้สมัครตาม flow ที่ระบบเปิดไว้
2. ตรวจว่ามี row ใน `profiles`
3. ตั้ง `full_name`, `department`, `role`
4. ให้ผู้ใช้ logout/login ใหม่ หรือกด refresh profile
5. ตรวจเมนูใน Dashboard ว่าขึ้นตามสิทธิ์

ตัวอย่าง SQL สำหรับตั้ง editor ของกลุ่มงาน

```sql
UPDATE profiles
SET
  role = 'editor',
  full_name = 'เจ้าหน้าที่กลุ่มส่งเสริมและพัฒนาการผลิต',
  department = 'กลุ่มส่งเสริมและพัฒนาการผลิต',
  updated_at = NOW()
WHERE email = 'production@example.com';
```

ตัวอย่าง SQL สำหรับตั้ง viewer

```sql
UPDATE profiles
SET
  role = 'viewer',
  full_name = 'ผู้บริหาร',
  department = 'กลุ่มยุทธศาสตร์และสารสนเทศ',
  updated_at = NOW()
WHERE email = 'viewer@example.com';
```

ตัวอย่าง SQL สำหรับอำเภอที่ใช้ Data Request

```sql
UPDATE profiles
SET
  role = 'editor',
  full_name = 'สำนักงานเกษตรอำเภอพุทธมณฑล',
  department = 'พุทธมณฑล',
  updated_at = NOW()
WHERE email = 'phutthamonthon@example.com';
```

## 13. หลักการ RLS ที่ต้องเข้าใจ

RLS หรือ Row Level Security คือการกำหนดว่า user คนใดอ่านหรือเขียนแถวใดได้ในระดับฐานข้อมูล

สิ่งที่ต้องจำ:

- เปิด RLS แล้ว ถ้าไม่มี policy ผู้ใช้จะอ่าน/เขียนไม่ได้
- policy ฝั่ง Supabase สำคัญกว่าการซ่อนปุ่มในหน้าเว็บ
- การซ่อนเมนูใน frontend ช่วยเรื่อง UX แต่ไม่ใช่ความปลอดภัยหลัก
- ทุกตารางที่มีข้อมูลจริงควรเปิด RLS
- public data ควรมี policy แยก ไม่ควรเปิดทุกอย่างโดยไม่คิด

ใน `schema.sql` ปัจจุบันมี policy แบบกว้าง คือ authenticated user เข้าถึงได้ทุกตาราง นี่ใช้เริ่มต้นหรือทดลองได้ แต่ถ้าใช้งานจริงควรปรับให้ละเอียดขึ้นตาม role และ department

## 14. Policy เริ่มต้นแบบปลอดภัยกว่า

ตัวอย่างแนวทาง policy ที่แนะนำสำหรับตาราง internal ทั่วไป

```sql
ALTER TABLE large_plots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access large_plots" ON large_plots;
CREATE POLICY "Admin full access large_plots" ON large_plots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Editor read large_plots" ON large_plots;
CREATE POLICY "Editor read large_plots" ON large_plots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'editor', 'viewer')
    )
  );

DROP POLICY IF EXISTS "Production editor write large_plots" ON large_plots;
CREATE POLICY "Production editor write large_plots" ON large_plots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'editor'
      AND profiles.department = 'กลุ่มส่งเสริมและพัฒนาการผลิต'
    )
  );
```

ถ้าต้องให้ editor แก้ไขและลบเฉพาะกลุ่มงาน ให้เพิ่ม policy `UPDATE` และ `DELETE` แยกอีกชั้น

```sql
CREATE POLICY "Production editor update large_plots" ON large_plots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'editor'
      AND profiles.department = 'กลุ่มส่งเสริมและพัฒนาการผลิต'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'editor'
      AND profiles.department = 'กลุ่มส่งเสริมและพัฒนาการผลิต'
    )
  );
```

สำหรับการลบ แนะนำให้จำกัดเฉพาะ admin ก่อน

```sql
CREATE POLICY "Admin delete large_plots" ON large_plots
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## 15. Helper function สำหรับ policy

เพื่อไม่ต้องเขียน `EXISTS SELECT profiles` ซ้ำหลายครั้ง ควรสร้าง helper function

```sql
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_profile_department()
RETURNS TEXT AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

เมื่อมี helper แล้ว policy จะอ่านง่ายขึ้น

```sql
CREATE POLICY "Admin full access budgets" ON budgets
  FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');
```

ตัวอย่าง policy สำหรับ editor ของกลุ่มงาน

```sql
CREATE POLICY "Production editor insert certifications" ON certifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_role() = 'editor'
    AND public.current_profile_department() = 'กลุ่มส่งเสริมและพัฒนาการผลิต'
  );
```

## 16. Public data policy

ข้อมูลบางชุดสามารถเปิดให้ public หรือ guest ดูได้ เช่น แปลงใหญ่ วิสาหกิจชุมชน ท่องเที่ยวเกษตร ศูนย์เรียนรู้ หรือข้อมูลภาพรวมรายอำเภอ

ถ้าตารางมีคอลัมน์ `visibility` สามารถกำหนด policy แบบนี้

```sql
CREATE POLICY "Public read visible records" ON agri_tourism
  FOR SELECT TO anon, authenticated
  USING (visibility = 'public');
```

ถ้าตารางยังไม่มี `visibility` แต่อยากเปิดอ่าน public ทั้งตาราง ต้องระวังมาก เพราะข้อมูลทุกแถวจะถูกเปิดอ่านได้

```sql
CREATE POLICY "Public read agri_tourism" ON agri_tourism
  FOR SELECT TO anon, authenticated
  USING (true);
```

แนวทางที่ปลอดภัยกว่า:

- เพิ่มคอลัมน์ `visibility`
- แยกคอลัมน์ส่วนบุคคลออกจากข้อมูล public
- หรือสร้าง view สำหรับ public โดยเลือกเฉพาะคอลัมน์ที่เผยแพร่ได้

ตัวอย่าง public view

```sql
CREATE OR REPLACE VIEW public_agri_tourism AS
SELECT
  id,
  spot_name,
  district,
  spot_type,
  latitude,
  longitude,
  description
FROM agri_tourism
WHERE visibility = 'public';
```

## 17. Policy สำหรับ Data Request

ระบบ Data Request ใช้ตาราง 3 ตัว

| ตาราง | policy ที่ควรใช้ |
|---|---|
| `data_requests` | admin จัดการทั้งหมด, editor อ่านเฉพาะคำขอที่มอบหมายให้อำเภอตัวเอง |
| `data_request_assignments` | admin จัดการทั้งหมด, editor อ่านเฉพาะ assignment ของอำเภอตัวเอง |
| `data_request_responses` | admin ดูทั้งหมด, editor upsert เฉพาะคำตอบของอำเภอตัวเอง |

แนวคิดสำคัญคือ editor ที่เป็นอำเภอไม่ควรเห็นหรือแก้คำตอบของอำเภออื่น

ตัวอย่าง logic ที่ใช้

```sql
public.current_profile_role() = 'editor'
AND district = public.current_profile_department()
```

ดังนั้น ถ้าจะใช้ Data Request ต้องตั้ง `profiles.department` ของผู้ใช้อำเภอให้ตรงกับชื่ออำเภอใน `data_request_assignments.district`

ตัวอย่าง:

| email | role | department |
|---|---|---|
| `phutthamonthon@example.com` | `editor` | `พุทธมณฑล` |
| `samphran@example.com` | `editor` | `สามพราน` |
| `banglen@example.com` | `editor` | `บางเลน` |

## 18. Audit Log

ไฟล์ `migration_rbac_audit.sql` สร้างตาราง `audit_logs` เพื่อเก็บประวัติการแก้ไขข้อมูล

โครงสร้างหลัก

| คอลัมน์ | ความหมาย |
|---|---|
| `user_id` | ผู้ใช้ที่ทำรายการ |
| `user_email` | email ของผู้ใช้ |
| `action` | `CREATE`, `UPDATE`, `DELETE` |
| `table_name` | ตารางที่ถูกแก้ไข |
| `record_id` | id ของรายการที่ถูกแก้ไข |
| `old_data` | ข้อมูลเดิม |
| `new_data` | ข้อมูลใหม่ |
| `created_at` | เวลาที่เกิดรายการ |

แนวทางใช้งาน:

- ให้ authenticated user insert audit log ได้
- ให้เฉพาะ admin อ่าน audit log ได้
- ไม่ควรให้ผู้ใช้ทั่วไปแก้หรือลบ audit log
- ถ้าข้อมูลใน `old_data` หรือ `new_data` มีข้อมูลส่วนบุคคล ต้องจำกัดการอ่านอย่างเข้มงวด

SQL ตรวจ audit log ล่าสุด

```sql
SELECT user_email, action, table_name, record_id, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
```

## 19. Index ที่ควรมี

Index ช่วยให้ Dashboard, Search และ filter ทำงานเร็วขึ้น โดยเฉพาะตารางที่มีข้อมูลจำนวนมาก

คอลัมน์ที่ควรทำ index

| ประเภทคอลัมน์ | ตัวอย่าง | เหตุผล |
|---|---|---|
| พื้นที่ | `district`, `subdistrict` | ใช้กรองและสรุปรายอำเภอ |
| วันที่ | `created_at`, `updated_at`, `report_date` | ใช้เรียงและกรองช่วงเวลา |
| ปีข้อมูล | `year`, `fiscal_year`, `data_year` | ใช้ filter ปีงบประมาณ |
| สถานะ | `status`, `visibility` | ใช้กรองข้อมูลที่แสดงหรือรอตรวจ |
| ประเภท | `commodity`, `cert_type`, `site_type` | ใช้ทำ chart และ filter |

ตัวอย่าง SQL

```sql
CREATE INDEX IF NOT EXISTS idx_large_plots_district ON large_plots(district);
CREATE INDEX IF NOT EXISTS idx_large_plots_commodity ON large_plots(commodity);
CREATE INDEX IF NOT EXISTS idx_large_plots_year ON large_plots(year);
CREATE INDEX IF NOT EXISTS idx_large_plots_created_at ON large_plots(created_at DESC);
```

สำหรับการค้นหาข้อความแบบ `ilike` ปกติ index อาจช่วยไม่มาก ถ้าข้อมูลเยอะมากในอนาคตค่อยพิจารณา full-text search หรือ trigram index

## 20. การออกแบบตารางให้ใช้กับ Dashboard

Dashboard ต้องการข้อมูลที่สรุปได้ง่าย จึงควรมี field มาตรฐาน

| สิ่งที่ Dashboard ต้องใช้ | field ที่ควรมี |
|---|---|
| สรุปรายอำเภอ | `district` |
| สรุปตามประเภท | `commodity`, `site_type`, `cert_type`, `farmer_type` |
| สรุปตามปี | `year`, `fiscal_year`, `data_year` |
| ตัวเลขรวม | `area_rai`, `member_count`, `budget_amount`, `production_ton` |
| แผนที่ | `latitude`, `longitude` |
| สถานะ | `status`, `visibility` |

ถ้าตารางใดไม่มี `district` Dashboard จะสรุปรายอำเภอยากขึ้น

ถ้าตารางใดเก็บตัวเลขเป็น text เช่น `1,200 ไร่` Dashboard จะรวมผลผิดหรือรวมไม่ได้

## 21. การออกแบบตารางให้ใช้กับ Global Search

Global Search ใช้ config ใน frontend เพื่อระบุว่าตารางไหนค้นจากคอลัมน์ใด

ส่วนที่เกี่ยวข้อง

```text
src/services/globalSearchService.js
src/utils/chatbotConstants.js
```

ถ้าเพิ่มตารางใหม่ ต้องเพิ่มอย่างน้อย 3 จุดใน frontend

1. `TABLE_CONFIG` เพื่อบอกชื่อไทย ไอคอน กลุ่มงาน และคำอธิบาย
2. `TABLE_SEARCH_COLS` เพื่อบอกคอลัมน์ที่ใช้ค้นหา
3. `TABLE_ROUTES` เพื่อบอกว่าคลิกผลลัพธ์แล้วไปหน้าไหน

ตัวอย่าง

```js
TABLE_CONFIG.field_learning_sites = {
  label: 'แหล่งเรียนรู้ภาคสนาม',
  icon: '📍',
  group: 'ยุทธศาสตร์',
  descTh: 'ข้อมูลจุดเรียนรู้และแหล่งเรียนรู้ด้านการเกษตร'
};

TABLE_SEARCH_COLS.field_learning_sites = [
  'site_name',
  'site_type',
  'main_activity'
];

TABLE_ROUTES.field_learning_sites = '/dashboard/strategy/field-learning-sites';
```

ถ้าใช้ RPC `global_search` ต้องแก้ function ฝั่ง Supabase ให้ค้นตารางใหม่นี้ด้วย ไม่เช่นนั้นระบบจะ fallback เป็น parallel query หรือไม่เห็นผลใน RPC

## 22. ตัวอย่าง RPC สำหรับ Global Search

ระบบปัจจุบันพยายามเรียก Supabase RPC ชื่อ `global_search` ก่อน ถ้า RPC ล้มเหลวจะ fallback ไป query หลายตารางแบบขนาน

ถ้าจะสร้าง RPC เอง แนวคิดคือรับ `search_term` และ `result_limit` แล้วคืนค่า JSON ของแต่ละตาราง

ตัวอย่างโครงแบบย่อ

```sql
CREATE OR REPLACE FUNCTION public.global_search(
  search_term TEXT,
  result_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  large_plot_results JSONB;
BEGIN
  SELECT jsonb_agg(to_jsonb(t))
  INTO large_plot_results
  FROM (
    SELECT *
    FROM large_plots
    WHERE
      plot_name ILIKE '%' || search_term || '%'
      OR commodity ILIKE '%' || search_term || '%'
      OR district ILIKE '%' || search_term || '%'
    LIMIT result_limit
  ) t;

  IF large_plot_results IS NOT NULL THEN
    result := result || jsonb_build_array(jsonb_build_object(
      'table', 'large_plots',
      'totalCount', jsonb_array_length(large_plot_results),
      'results', large_plot_results
    ));
  END IF;

  RETURN result;
END;
$$;
```

ข้อควรระวัง:

- ถ้าใช้ `SECURITY DEFINER` ต้องเขียน function ให้ระวังสิทธิ์
- อย่าคืนข้อมูลส่วนบุคคลที่ไม่ควรเผยแพร่
- ถ้า search ใช้ในหน้า internal เท่านั้น ให้ตรวจ session/role ให้เหมาะสม
- ถ้า search ใช้ public ด้วย ควรค้นเฉพาะข้อมูล public หรือ view ที่ปลอดภัย

## 23. การออกแบบตารางให้ใช้กับ AI Chatbot

AI Chatbot ไม่ควรดึงข้อมูลดิบทั้งหมดไปให้ AI โดยไม่จำเป็น แต่ควรให้ service ดึงข้อมูลที่เกี่ยวข้องและ aggregate ก่อน

ส่วนที่เกี่ยวข้อง

```text
src/services/chatbotDataService.js
src/utils/chatbotConstants.js
```

ถ้าเพิ่มตารางใหม่ให้ AI ใช้ได้ ต้องพิจารณา

| จุดที่ต้องเพิ่ม | ใช้ทำอะไร |
|---|---|
| `TABLE_CONFIG` | ให้ AI รู้ว่าตารางคือข้อมูลเรื่องอะไร |
| `TABLE_SEARCH_COLS` | ใช้เลือกแถวตัวอย่างหรือค้นหา keyword |
| `DISTRICT_COLS` | บอกว่าคอลัมน์อำเภอชื่ออะไร ถ้าไม่ใช่ `district` |
| `NUMERIC_COLS` | บอกว่าคอลัมน์ไหนเอาไป sum/average ได้ |
| `CATEGORY_COLS` | บอกว่าคอลัมน์ไหนเอาไป group by ได้ |

ตัวอย่างสำหรับตารางใหม่

```js
NUMERIC_COLS.field_learning_sites = ['area_rai'];
CATEGORY_COLS.field_learning_sites = ['site_type', 'main_activity'];
```

หลักการสำคัญ:

- ตัวเลขต้องเป็น numeric จริง
- category ต้องสะกดสม่ำเสมอ
- district ต้องใช้ชื่ออำเภอมาตรฐาน
- หลีกเลี่ยงส่งข้อมูลส่วนบุคคลให้ AI ถ้าไม่จำเป็น

## 24. การออกแบบตารางให้ใช้กับ Data Management

หน้า Data Management ใช้ `CrudTable` เป็น component กลาง

ตารางที่จะใช้กับ `CrudTable` ได้ดีควรมี

- `id` เป็น primary key
- field ที่แสดงใน columns ของหน้าเว็บ
- field ที่ใช้ใน form เพิ่ม/แก้ไข
- `created_at` สำหรับเรียงข้อมูลล่าสุด
- RLS ที่อนุญาตให้ role ที่เหมาะสม insert/update/delete

ระบบ import CSV ใช้ `CsvImportModal` โดยอ่าน header จาก CSV แล้วให้ map เข้ากับ field ของตาราง

ข้อควรทำก่อนเปิด import:

- ตั้งชื่อ field ให้เข้าใจง่าย
- กำหนด required field ในฐานข้อมูลเท่าที่จำเป็นจริง
- ทดลอง import 3-5 แถวก่อน import ชุดใหญ่
- ตรวจ error จาก Supabase ถ้า field type ไม่ตรง
- ถ้ามีข้อมูลซ้ำ ควรลบหรือกันซ้ำก่อน เพราะ import ปัจจุบันเป็น insert

## 25. การใช้ view สำหรับข้อมูลสาธารณะ

ถ้าตารางจริงมีทั้งข้อมูล public และข้อมูล internal ควรใช้ view สำหรับ public แทนการเปิดทั้งตาราง

ตัวอย่าง

```sql
CREATE OR REPLACE VIEW public_large_plots AS
SELECT
  id,
  plot_name,
  commodity,
  district,
  subdistrict,
  member_count,
  area_rai,
  year,
  agency
FROM large_plots
WHERE COALESCE(visibility, 'internal') = 'public';
```

ถ้าตารางเดิมยังไม่มี `visibility` สามารถเพิ่มได้

```sql
ALTER TABLE large_plots
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'internal'
CHECK (visibility IN ('public', 'internal', 'restricted'));
```

ข้อดีของ view:

- เลือกเฉพาะคอลัมน์ที่ปลอดภัย
- ลดความเสี่ยงข้อมูลส่วนบุคคลหลุด
- frontend public ใช้ view แทนตารางจริงได้
- policy เขียนง่ายขึ้น

## 26. การจัดการข้อมูลส่วนบุคคลในฐานข้อมูล

ข้อมูลบางคอลัมน์ควรถูกจำกัดสิทธิ์ เช่น เบอร์โทร ชื่อบุคคล ผู้ประสานงาน หรือข้อมูลรายบุคคล

แนวทางที่ใช้ได้จริง

| แนวทาง | เหมาะกับกรณี |
|---|---|
| แยก public view | ตารางเดียวมีทั้งข้อมูล public และ internal |
| แยกตาราง contact | ข้อมูลติดต่อควรให้เฉพาะเจ้าหน้าที่ดู |
| ใช้ `visibility` | ต้องการกำหนดระดับข้อมูลรายแถว |
| จำกัด RLS ตาม role | ต้องการให้ admin/editor เท่านั้นดูข้อมูลบางส่วน |
| ไม่ import ข้อมูลอ่อนไหว | ถ้าข้อมูลนั้นไม่จำเป็นต่อ Dashboard |

ตัวอย่างแยกตาราง contact

```sql
CREATE TABLE IF NOT EXISTS enterprise_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id UUID REFERENCES community_enterprises(id) ON DELETE CASCADE,
  contact_name TEXT,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enterprise_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and development editor read contacts" ON enterprise_contacts
  FOR SELECT TO authenticated
  USING (
    public.current_profile_role() = 'admin'
    OR (
      public.current_profile_role() = 'editor'
      AND public.current_profile_department() = 'กลุ่มส่งเสริมและพัฒนาเกษตรกร'
    )
  );
```

## 27. ลำดับการเพิ่มตารางใหม่แบบใช้ได้จริง

เมื่อจะเพิ่มข้อมูลชุดใหม่เข้าระบบ ให้ทำตามลำดับนี้

1. ระบุเจ้าของข้อมูลและระดับข้อมูลจากบท 02
2. clean ไฟล์ตามบท 03
3. ออกแบบ field และชนิดข้อมูล
4. สร้าง SQL `CREATE TABLE`
5. เพิ่ม index ที่จำเป็น
6. เปิด RLS
7. สร้าง policy สำหรับ admin, viewer, editor และ public ถ้ามี
8. เพิ่มข้อมูลตัวอย่าง 3-5 แถว
9. ทดลอง query ใน Supabase SQL Editor
10. เพิ่มหน้า Data Management หรือผูกกับ `CrudTable`
11. เพิ่ม route และเมนู ถ้าต้องการหน้าใหม่
12. เพิ่ม config สำหรับ Search
13. เพิ่ม config สำหรับ AI Chatbot ถ้าต้องให้ถามตอบได้
14. import CSV ชุดทดสอบ
15. ตรวจ Dashboard, Search, Map และ AI
16. ค่อย import ข้อมูลจริงทั้งชุด

## 28. Template SQL สำหรับตารางใหม่

ใช้ template นี้เป็นจุดเริ่มต้น แล้วปรับ field ตามข้อมูลจริง

```sql
CREATE TABLE IF NOT EXISTS table_name_here (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  district TEXT,
  subdistrict TEXT,
  category TEXT,
  amount NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('public', 'internal', 'restricted')),
  data_year INTEGER,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_table_name_here_district ON table_name_here(district);
CREATE INDEX IF NOT EXISTS idx_table_name_here_category ON table_name_here(category);
CREATE INDEX IF NOT EXISTS idx_table_name_here_visibility ON table_name_here(visibility);
CREATE INDEX IF NOT EXISTS idx_table_name_here_created_at ON table_name_here(created_at DESC);

ALTER TABLE table_name_here ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access table_name_here" ON table_name_here
  FOR ALL TO authenticated
  USING (public.current_profile_role() = 'admin')
  WITH CHECK (public.current_profile_role() = 'admin');

CREATE POLICY "Authenticated read table_name_here" ON table_name_here
  FOR SELECT TO authenticated
  USING (visibility IN ('public', 'internal'));

CREATE POLICY "Public read table_name_here" ON table_name_here
  FOR SELECT TO anon
  USING (visibility = 'public');
```

ถ้าจะให้ editor แก้ได้ ให้เพิ่ม policy ตาม department ของตารางนั้น

```sql
CREATE POLICY "Editor write table_name_here" ON table_name_here
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_role() = 'editor'
    AND public.current_profile_department() = 'ชื่อกลุ่มงานที่รับผิดชอบ'
  );
```

## 29. การตรวจสอบหลังรัน SQL

หลังรัน SQL ควรตรวจทันที

### 29.1 ตรวจว่าตารางสร้างแล้ว

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 29.2 ตรวจคอลัมน์ของตาราง

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'large_plots'
ORDER BY ordinal_position;
```

### 29.3 ตรวจ RLS

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 29.4 ตรวจ policy

```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 29.5 ตรวจ profile ผู้ใช้

```sql
SELECT email, full_name, department, role, created_at
FROM profiles
ORDER BY created_at DESC;
```

## 30. การทดสอบสิทธิ์แบบใช้งานจริง

ควรทดสอบด้วยบัญชีอย่างน้อย 4 แบบ

| บัญชีทดสอบ | สิ่งที่ต้องตรวจ |
|---|---|
| admin | เห็นเมนูทั้งหมด เพิ่ม แก้ ลบ และดู audit log ได้ |
| viewer | ดูข้อมูลได้ แต่เพิ่ม/แก้/ลบไม่ได้ |
| editor กลุ่มงาน | เห็นเมนูกลุ่มงานตัวเอง และแก้ข้อมูลที่ได้รับอนุญาตได้ |
| editor อำเภอ | เห็น Data Request เฉพาะอำเภอตัวเอง และส่งคำตอบได้ |

Checklist ทดสอบ

- [ ] login ได้ทุกบัญชี
- [ ] sidebar แสดงเมนูถูกต้อง
- [ ] route ที่ไม่มีสิทธิ์เข้าไม่ได้
- [ ] ปุ่มเพิ่ม/แก้/ลบแสดงตามสิทธิ์
- [ ] ถ้าเรียก Supabase โดยตรงด้วย role นั้น ๆ ยังถูก RLS กันอยู่
- [ ] editor ไม่เห็นข้อมูลของอำเภออื่นใน Data Request
- [ ] guest หรือ public ไม่เห็นข้อมูล internal/restricted

## 31. การเชื่อม Environment Variables

ไฟล์ frontend ต้องอ่านค่า Supabase จาก environment variables

ควรมีค่าใน `.env.local`

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

ใน Netlify ต้องตั้งค่าเดียวกันใน Environment Variables

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

ข้อห้าม:

- ห้ามใส่ `service_role key` ใน `.env` ที่ frontend ใช้
- ห้าม commit `.env.local` ขึ้น GitHub
- ถ้าพบ key หลุด ให้ rotate key ใน Supabase ทันที

## 32. การสำรองข้อมูลและการกู้คืน

ก่อน import ข้อมูลจำนวนมากหรือแก้ schema ควรสำรองข้อมูลก่อน

แนวทางง่ายที่สุดในช่วงเริ่มต้น

- Export ตารางสำคัญเป็น CSV จาก Supabase Table Editor
- เก็บไฟล์ไว้ในพื้นที่จำกัดสิทธิ์
- ตั้งชื่อไฟล์พร้อมวันที่ เช่น `backup_large_plots_2026-05-10.csv`
- บันทึก SQL migration ที่รันทุกครั้ง

ตารางที่ควรสำรองสม่ำเสมอ

- `profiles`
- `budgets`
- ตารางข้อมูลหลักทุกกลุ่มงาน
- `data_requests`, `data_request_assignments`, `data_request_responses`
- `audit_logs`

ถ้าใช้งานจริงระดับหน่วยงาน ควรตั้งรอบ backup จาก Supabase project settings หรือใช้เครื่องมือ backup เพิ่มเติมตามนโยบายหน่วยงาน

## 33. ข้อผิดพลาดที่พบบ่อยและวิธีแก้

| อาการ | สาเหตุที่เป็นไปได้ | วิธีตรวจ/แก้ |
|---|---|---|
| login แล้วไม่เห็นเมนู | `profiles.role` หรือ `department` ไม่ถูก | ตรวจตาราง `profiles` |
| import CSV ไม่สำเร็จ | field type ไม่ตรง เช่น text เข้า numeric | ตรวจ error แถวที่ระบบแจ้ง และแก้ CSV |
| Dashboard ตัวเลขไม่ขึ้น | ชื่อตารางหรือ field ไม่ตรงกับ hook/frontend | ตรวจ config และ query ที่ frontend ใช้ |
| Search ไม่เจอตารางใหม่ | ยังไม่ได้เพิ่ม `TABLE_CONFIG`, `TABLE_SEARCH_COLS` หรือ RPC | เพิ่ม config และทดสอบ fallback/RPC |
| AI ไม่รู้จักข้อมูลใหม่ | ยังไม่ได้เพิ่ม config ใน `chatbotConstants.js` | เพิ่ม table config, numeric cols, category cols |
| public เห็นข้อมูลมากเกินไป | policy เปิดกว้าง หรือใช้ตารางจริงแทน view | จำกัด RLS หรือสร้าง public view |
| editor แก้ข้อมูลไม่ได้ | RLS ไม่มี policy สำหรับ INSERT/UPDATE | ตรวจ `pg_policies` |
| editor เห็นข้อมูลอำเภออื่น | policy ไม่กรอง district/department | แก้ USING และ WITH CHECK |
| ข้อมูลซ้ำหลัง import | import เป็น insert และไม่ได้ตรวจซ้ำก่อน | clean CSV หรือใช้ unique constraint/upsert ในอนาคต |

## 34. แนวทางปรับ RLS จากระบบทดลองเป็นระบบใช้งานจริง

ระบบเริ่มต้นอาจใช้ policy แบบกว้างเพื่อให้พัฒนาง่าย แต่ก่อนใช้งานจริงควรปรับเป็นลำดับ

ลำดับแนะนำ

1. สำรวจทุก policy ปัจจุบัน
2. แยกตารางเป็น public, internal, restricted
3. เพิ่ม `visibility` ในตารางที่ต้องเผยแพร่บางส่วน
4. สร้าง public view สำหรับข้อมูลสาธารณะ
5. จำกัด write ให้เฉพาะ admin/editor
6. จำกัด delete ให้เฉพาะ admin
7. จำกัด Data Request ตามอำเภอ
8. ทดสอบด้วยบัญชีจริงทุก role
9. ตรวจว่า anon key อ่านได้เฉพาะ public view หรือ public policy เท่านั้น
10. บันทึก SQL migration ทุกครั้ง

## 35. Checklist ตั้งค่า Supabase ตั้งแต่ศูนย์

- [ ] สร้าง Supabase project แล้ว
- [ ] ตั้งค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` แล้ว
- [ ] รัน `supabase/schema.sql` แล้ว
- [ ] รัน `supabase/migration_rbac_audit.sql` แล้ว
- [ ] รัน `supabase/data_requests.sql` ถ้าจะใช้ Data Request แล้ว
- [ ] รัน SQL ตารางเสริมที่ต้องใช้แล้ว
- [ ] สร้างผู้ใช้ admin คนแรกแล้ว
- [ ] ตั้ง role และ department ของผู้ใช้ทดสอบแล้ว
- [ ] ตรวจว่า `profiles` สร้างอัตโนมัติเมื่อมี user ใหม่แล้ว
- [ ] เปิด RLS ทุกตารางสำคัญแล้ว
- [ ] ตรวจ policy ของ public/internal/restricted แล้ว
- [ ] ทดสอบ import CSV อย่างน้อย 1 ตารางแล้ว
- [ ] ทดสอบ Dashboard แล้ว
- [ ] ทดสอบ Global Search แล้ว
- [ ] ทดสอบ AI Chatbot แล้ว
- [ ] ทดสอบ Data Request แล้ว ถ้าเปิดใช้
- [ ] ตรวจว่าไม่มี service role key ใน frontend หรือ repo แล้ว
- [ ] สำรอง SQL migration และข้อมูลตัวอย่างแล้ว

## 36. ผลลัพธ์ที่ควรได้จากบทนี้

หลังจบบทนี้ ควรมีผลลัพธ์ดังนี้

1. Supabase project ที่มีตารางหลักครบ
2. ตาราง `profiles` ที่เชื่อมกับ Auth แล้ว
3. ผู้ใช้ admin, viewer และ editor สำหรับทดสอบ
4. RLS policy ที่เหมาะกับระดับข้อมูล
5. audit log สำหรับติดตามการเปลี่ยนแปลงข้อมูล
6. ตาราง Data Request ถ้าจะใช้ flow ขอข้อมูลจากอำเภอ
7. ตารางข้อมูลหลักที่พร้อมรับ CSV จากบท 03
8. แนวทางเพิ่มตารางใหม่ที่เชื่อม Dashboard, Search และ AI ได้

เมื่อฐานข้อมูลพร้อมแล้ว ขั้นตอนถัดไปคือบท 05 การติดตั้งและตั้งค่าโปรเจกต์ React + Vite บนเครื่องพัฒนา เพื่อให้ frontend เชื่อมกับ Supabase และทดสอบระบบทั้งหมดได้จริง
