# 07 ความปลอดภัยและการ Deploy

ไฟล์นี้เป็นคู่มือการตรวจความปลอดภัยและการ Deploy ระบบ `npt_dashboard` ขึ้นใช้งานจริง โดยเน้น 4 เรื่องหลัก ได้แก่ การป้องกันข้อมูลรั่วไหล การตั้งค่า Supabase/RLS การตั้งค่า Netlify และ checklist ก่อนเปิดระบบให้ผู้ใช้จริง

บทนี้ต่อจากบท 06 ที่อธิบายการสร้าง Dashboard, Search และ AI Chatbot แล้ว ขั้นตอนนี้คือการตรวจให้แน่ใจว่าระบบที่พัฒนาเสร็จสามารถเผยแพร่ได้อย่างปลอดภัย ใช้งานได้จริง และมีแนวทางดูแลหลัง deploy

## 1. เป้าหมายของบทนี้

เมื่อทำตามบทนี้จบ ควรทำได้ดังนี้

- แยกข้อมูล public, internal และ restricted ก่อน deploy ได้
- ตรวจว่าไฟล์ `.env` และ API key ไม่หลุดขึ้น GitHub
- ตั้งค่า Supabase Auth, Role, Department และ RLS ได้เหมาะสมกับการใช้งานจริง
- ตรวจ policy ที่กว้างเกินไปก่อนเปิดใช้ข้อมูลจริง
- ตั้งค่า Netlify ให้ build และ redirect ได้ถูกต้อง
- ตั้งค่า environment variables บน Netlify ได้
- ทดสอบ production build ก่อนเผยแพร่จริงได้
- ตรวจ security headers พื้นฐานได้
- ตรวจ AI proxy และ API key ได้อย่างปลอดภัย
- มี checklist ก่อนและหลัง deploy
- แก้ปัญหา deploy ที่พบบ่อยได้

## 2. ภาพรวมจุดเสี่ยงของระบบ

ระบบ `npt_dashboard` มีทั้งข้อมูลสาธารณะ ข้อมูลภายใน ข้อมูลผู้ใช้ และการเรียก AI/API ภายนอก จึงต้องระวังหลายจุดพร้อมกัน

| จุดเสี่ยง | ตัวอย่าง | วิธีควบคุม |
|---|---|---|
| ข้อมูลส่วนบุคคล | ชื่อเกษตรกร เบอร์โทร ที่อยู่ละเอียด เลขบัตรประชาชน | แยก field, จำกัดสิทธิ์, ไม่แสดง public |
| สิทธิ์ฐานข้อมูลกว้างเกิน | authenticated ทุกคนอ่าน/เขียนได้ทุกตาราง | ปรับ RLS ตาม role/department |
| API key หลุด | service role key, AI API key, GISTDA key | เก็บใน env, ไม่ commit, ใช้ serverless proxy |
| หน้า public แสดงข้อมูลเกินจำเป็น | รายชื่อบุคคลหรือข้อมูลติดต่อ | ทำ public view หรือเลือกเฉพาะ field ที่เผยแพร่ได้ |
| AI ได้ข้อมูลมากเกิน | ส่งข้อมูลส่วนบุคคลเข้า AI | สรุป/aggregate ก่อนส่ง, ตัด field sensitive |
| deploy แล้ว refresh 404 | React Router เป็น SPA | ตั้ง redirect `/* -> /index.html` |
| CORS เปิดกว้าง | Netlify Function อนุญาตทุก origin | จำกัด origin ใน production ถ้าต้องการเข้มงวด |
| build ผ่านแต่ระบบใช้ไม่ได้ | env บน Netlify ไม่ครบ | ตรวจ environment variables ก่อน deploy |

## 3. หลักการแบ่งระดับข้อมูลก่อนเปิดระบบ

ก่อน deploy ต้องแยกข้อมูลอย่างน้อย 3 ระดับ

| ระดับ | ความหมาย | ตัวอย่าง | แนวทางแสดงผล |
|---|---|---|---|
| `public` | เปิดเผยต่อประชาชนได้ | จำนวนแปลงใหญ่ รายชื่อแหล่งท่องเที่ยวเกษตร ข้อมูลสรุปรายอำเภอ | แสดงในหน้า public ได้ |
| `internal` | ใช้เฉพาะเจ้าหน้าที่ | รายงานภายใน รายละเอียดการติดตามงาน ข้อมูลงบประมาณระดับปฏิบัติ | ต้อง login |
| `restricted` | จำกัดเฉพาะผู้เกี่ยวข้อง | ข้อมูลส่วนบุคคล เบอร์โทร ที่อยู่ละเอียด รายชื่อพร้อมข้อมูลติดต่อ | เฉพาะ role/department ที่จำเป็น |

แนวคิดสำคัญ

- หน้า public ควรแสดงข้อมูลที่ตรวจแล้วเท่านั้น
- ข้อมูลรายบุคคลควรสรุปเป็นระดับอำเภอ/ตำบลก่อนเผยแพร่
- ถ้าไม่แน่ใจว่าเผยแพร่ได้หรือไม่ ให้จัดเป็น `internal` หรือ `restricted` ก่อน
- ห้ามนำไฟล์ข้อมูลจริงที่มีข้อมูลส่วนบุคคลไปวางใน public repository
- AI Chatbot ไม่ควรได้รับข้อมูลส่วนบุคคลเต็มชุด ถ้าไม่จำเป็นต่อคำตอบ

## 4. Checklist ข้อมูลส่วนบุคคลก่อน deploy

ตรวจทุกตารางที่มีข้อมูลจริง โดยเฉพาะตารางเหล่านี้

| ตาราง | ข้อมูลที่ต้องระวัง |
|---|---|
| `personnel` | เบอร์โทร อีเมล ตำแหน่ง ข้อมูลบุคลากร |
| `smart_farmers` | ชื่อเกษตรกร เบอร์โทร สินค้า ที่อยู่หรือข้อมูลติดต่อ |
| `community_enterprises` | ชื่อประธาน เบอร์โทร สมาชิก กลุ่ม |
| `farmer_groups` | ชื่อประธาน รายชื่อสมาชิก ข้อมูลกลุ่ม |
| `large_plots` | เบอร์โทร ประธาน/ผู้ประสานงาน ถ้ามี |
| `agri_tourism` | ผู้ประสานงาน เบอร์โทร รายละเอียดสถานที่ |
| `pest_centers` | ชื่อประธาน เบอร์ติดต่อ |
| `soil_fertilizer_centers` | ชื่อประธาน เบอร์ติดต่อ |
| `budgets` | ผู้รับผิดชอบ งบประมาณ รายละเอียดภายใน |
| `data_request_responses` | คำตอบจากอำเภอที่อาจมีข้อมูลแนบหรือ JSON ภายใน |

Checklist

- [ ] ไม่มีเลขบัตรประชาชนในหน้า public
- [ ] ไม่มีเลขบัญชีธนาคารในหน้า public
- [ ] ไม่มีเบอร์โทรส่วนตัวในหน้า public ถ้าไม่ได้รับอนุญาต
- [ ] ไม่มีที่อยู่ละเอียดรายบุคคลในหน้า public
- [ ] ไม่มีรายชื่อเกษตรกรพร้อมข้อมูลติดต่อในหน้า public
- [ ] ไม่มีไฟล์ Excel ต้นทางที่มีข้อมูลส่วนบุคคลอยู่ใน repo
- [ ] หน้า Search ไม่แสดง field sensitive ให้ guest
- [ ] AI Chatbot ไม่ส่ง field sensitive เข้า prompt ถ้าไม่จำเป็น
- [ ] Export CSV/Excel จำกัดตาม role ที่เหมาะสม

## 5. ตรวจไฟล์ลับและ Environment Variables

โปรเจกต์นี้มี `.env.example` เป็นตัวอย่างสำหรับค่า Supabase

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

ไฟล์ `.gitignore` ของโปรเจกต์ ignore env ไว้แล้ว

```text
.env
.env.*
!.env.example
```

หมายความว่า

- `.env` ไม่ควรถูก commit
- `.env.local` ไม่ควรถูก commit
- `.env.production` ไม่ควรถูก commit
- `.env.example` commit ได้ เพราะเป็น template ไม่มี key จริง

ก่อน commit ทุกครั้งให้รัน

```bash
git status
```

ห้ามมีไฟล์เหล่านี้ขึ้นในรายการ commit

```text
.env
.env.local
.env.production
.env.development
```

ถ้าเผลอ commit key ไปแล้ว ให้ทำ 2 อย่างทันที

1. เปลี่ยน key ที่ต้นทาง เช่น Supabase, Gemini, OpenRouter หรือ NVIDIA
2. ลบ key ออกจาก Git history หรืออย่างน้อยลบจาก commit ล่าสุดตามวิธีของทีม

ไม่ควรคิดว่า “ลบไฟล์ออกจาก commit ใหม่แล้วพอ” เพราะ key ที่เคยขึ้น Git แล้วอาจยังอยู่ใน history

## 6. ประเภท key ที่ต้องระวัง

| Key | ใช้ที่ไหน | ใส่ frontend ได้ไหม | หมายเหตุ |
|---|---|---:|---|
| `VITE_SUPABASE_URL` | frontend | ได้ | เป็น URL ของ Supabase project |
| `VITE_SUPABASE_ANON_KEY` | frontend | ได้ | ใช้คู่กับ RLS ต้องตั้ง policy ให้ดี |
| `SUPABASE_SERVICE_ROLE_KEY` | server เท่านั้น | ไม่ได้ | ห้ามใส่ใน frontend เด็ดขาด |
| `GEMINI_API_KEY` | Netlify Function | ไม่ควร | เก็บใน Netlify env |
| `OPENROUTER_API_KEY` | Netlify Function | ไม่ควร | เก็บใน Netlify env |
| `NVIDIA_API_KEY` | Netlify Function | ไม่ควร | เก็บใน Netlify env |
| `VITE_GISTDA_API_KEY` | frontend/proxy | ต้องประเมิน | ถ้าเป็น key จำกัดสิทธิ์ ควรหลีกเลี่ยงการใส่ frontend |

หลักจำง่าย

```text
key ที่ขึ้นต้นด้วย VITE_ จะถูกส่งเข้า frontend build ได้
```

ดังนั้นถ้าเป็น key ลับจริง ไม่ควรตั้งชื่อขึ้นต้นด้วย `VITE_` และไม่ควรเรียกจาก browser โดยตรง

## 7. ความปลอดภัยของ Supabase

ระบบนี้ใช้ Supabase เป็นฐานข้อมูลและระบบ Auth หลัก จึงต้องตรวจ 4 เรื่อง

```text
Auth
Profiles
Role / Department
RLS Policy
```

### 7.1 ตรวจ Supabase Auth

ใน Supabase Dashboard ให้ตรวจ

```text
Authentication
  → Users
```

Checklist

- [ ] มีเฉพาะผู้ใช้ที่ควรเข้าใช้งาน
- [ ] admin มีจำนวนน้อยที่สุด
- [ ] ผู้ใช้ทั่วไปเริ่มจาก role `viewer`
- [ ] ปิดหรือตั้งค่า signup ให้เหมาะสม ถ้าไม่ต้องการให้คนนอกสมัครเอง
- [ ] ตรวจ email confirmation ตาม flow ที่ต้องการ
- [ ] ลบ user ทดสอบก่อน deploy จริง ถ้าไม่จำเป็น

### 7.2 ตรวจตาราง `profiles`

ตาราง `profiles` เป็นตัวกำหนด role และ department ใน frontend

ควรตรวจด้วย SQL

```sql
SELECT id, email, full_name, department, role, created_at
FROM profiles
ORDER BY created_at DESC;
```

ค่าที่ควรใช้

| role | ความหมาย |
|---|---|
| `viewer` | ดูข้อมูลได้ตามสิทธิ์ |
| `editor` | เพิ่ม/แก้ไขข้อมูลได้ตามกลุ่มงานหรืออำเภอ |
| `admin` | จัดการระบบ ผู้ใช้ และข้อมูลทุกส่วน |

ข้อควรระวัง

- อย่าให้ทุกคนเป็น `admin`
- ถ้าผู้ใช้เป็นอำเภอสำหรับ Data Request ให้ `department` เป็นชื่ออำเภอที่ตรงกับ assignment
- ถ้าผู้ใช้เป็นกลุ่มงาน ให้ `department` สะกดตรงกับ frontend เช่น `กลุ่มอารักขาพืช`
- ถ้า role เป็นค่าเก่า เช่น `user` ให้ปรับเป็น `viewer`, `editor` หรือ `admin`

### 7.3 ตรวจ RLS พื้นฐาน

ใน `supabase/schema.sql` มีการเปิด RLS หลายตาราง และมี policy แบบกว้างสำหรับ authenticated user

แนวคิดของ policy แบบกว้างคือ

```sql
FOR ALL TO authenticated USING (true) WITH CHECK (true)
```

เหมาะสำหรับช่วงเริ่มต้นหรือ development แต่ไม่เหมาะกับ production ที่มีข้อมูลจริงละเอียด เพราะผู้ใช้ที่ login ได้อาจเข้าถึงข้อมูลได้กว้างเกินไป

ก่อนเปิดใช้งานจริง ควรตัดสินใจว่าแต่ละตารางใช้ policy แบบใด

| รูปแบบ policy | เหมาะกับ | ตัวอย่าง |
|---|---|---|
| authenticated read only | ผู้ใช้ภายในดูได้ทุกคน แต่แก้ไม่ได้ | dashboard summary |
| editor by department | editor แก้ได้เฉพาะกลุ่มงานตัวเอง | ตารางกลุ่มงาน |
| district-based | อำเภอแก้ได้เฉพาะข้อมูลอำเภอตัวเอง | Data Request |
| admin only | เฉพาะ admin | user management, audit log |
| public read | เปิดให้ anonymous อ่านบาง field | หน้า public |

## 8. ตัวอย่าง RLS ที่ควรใช้เป็นแนวทาง

### 8.1 ให้ทุกคนที่ login อ่านได้ แต่ admin/editor เท่านั้นเขียนได้

```sql
CREATE POLICY "authenticated read large_plots"
ON large_plots
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "editor admin write large_plots"
ON large_plots
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'editor')
  )
);
```

ต้องทำ policy สำหรับ UPDATE/DELETE แยกเพิ่มตามความเหมาะสม

### 8.2 ให้ admin เท่านั้นลบข้อมูล

```sql
CREATE POLICY "admin delete large_plots"
ON large_plots
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### 8.3 ให้ editor แก้เฉพาะอำเภอตัวเอง

แนวคิดนี้เหมาะกับตารางที่มี field `district`

```sql
CREATE POLICY "district editor update own district"
ON data_request_responses
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR (
        profiles.role = 'editor'
        AND profiles.department = data_request_responses.district
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.role = 'admin'
      OR (
        profiles.role = 'editor'
        AND profiles.department = data_request_responses.district
      )
    )
  )
);
```

### 8.4 ทำ public view แทนเปิดตารางจริง

ถ้าตารางมี field sensitive แต่ต้องแสดงข้อมูลบางส่วนในหน้า public แนะนำสร้าง view หรือ RPC เฉพาะ field ที่เผยแพร่ได้

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
FROM large_plots;
```

ไม่ควรเปิด public read ให้ตารางจริงที่มีเบอร์โทรหรือข้อมูลส่วนบุคคลปนอยู่

## 9. Audit Log

ระบบมี migration สำหรับ `audit_logs` และกำหนดให้ authenticated user insert audit ได้ ส่วนการอ่าน audit จำกัดเฉพาะ admin

ควรตรวจว่า migration นี้ถูกรันแล้ว

```sql
SELECT *
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

Checklist

- [ ] มีตาราง `audit_logs`
- [ ] มี index ตาม created_at, table_name, user_id
- [ ] insert audit ได้หลังเพิ่ม/แก้/ลบข้อมูล
- [ ] เฉพาะ admin อ่าน audit log ได้
- [ ] viewer/editor อ่าน audit log ไม่ได้

ข้อควรระวัง

- audit log อาจเก็บข้อมูลเก่าและใหม่แบบ JSONB จึงอาจมีข้อมูลส่วนบุคคลอยู่ภายใน
- ไม่ควรเปิด audit log ให้ role ทั่วไปอ่าน
- ถ้าข้อมูล sensitive มาก อาจต้อง mask field บางส่วนก่อนบันทึก audit

## 10. ความปลอดภัยของหน้า public

หน้า public ของระบบมีตัวอย่าง route เช่น

```text
/
/interactive-dashboard
/public/large-plots
/public/smart-farmers
/public/community-enterprises
/public/agri-tourism
/public/farmer-institutes
/public/agricultural-areas
```

ก่อน deploy ให้เปิดแต่ละหน้าและตรวจด้วยสายตา

Checklist

- [ ] หน้า public ไม่ต้อง login เฉพาะหน้าที่ตั้งใจเปิดจริง
- [ ] ไม่มีข้อมูลที่อยู่ละเอียดรายบุคคล
- [ ] ไม่มีเบอร์โทรส่วนตัวที่ไม่ได้ตั้งใจเปิดเผย
- [ ] ไม่มีเลขบัตรประชาชนหรือเลขบัญชี
- [ ] ไม่มีข้อมูลผู้ใช้ระบบภายใน
- [ ] ไม่มีข้อมูล audit log
- [ ] Export ในหน้า public ไม่เปิดข้อมูลเกินจำเป็น
- [ ] Search public ถ้ามี ต้องไม่ค้น field sensitive

ใน `CrudTable` มี logic ซ่อน field ชื่อบางประเภทสำหรับ guest แล้ว แต่ไม่ควรพึ่ง frontend อย่างเดียว ต้องตรวจ RLS หรือ public view ด้วย

## 11. ความปลอดภัยของ AI Chatbot

AI Chatbot ใช้ข้อมูลจากฐานข้อมูลเพื่อประกอบคำตอบ จึงต้องควบคุมข้อมูลก่อนส่งเข้า AI

ไฟล์สำคัญ

```text
src/pages/Chatbot.jsx
src/services/chatbotDataService.js
src/services/aiService.js
src/utils/chatbotConstants.js
netlify/functions/ai-proxy.js
```

หลักการที่ควรใช้

- ให้ AI ใช้ข้อมูลสรุป เช่น count, sum, average, district summary มากกว่าข้อมูลรายแถว
- ตัด field ที่ไม่จำเป็น เช่น `id`, `created_at`, `updated_at`, image/url/path
- ไม่ส่งเลขบัตรประชาชน เบอร์โทร ที่อยู่ละเอียด หรือข้อมูลส่วนบุคคลโดยไม่จำเป็น
- ถ้าต้องตอบเรื่องบุคคล ให้พิจารณาว่าผู้ใช้มีสิทธิ์ดูข้อมูลนั้นหรือไม่
- ให้ AI อ้างอิง `aggregated_stats` เป็นหลัก ไม่ใช่นับจาก `sample_records`

Checklist ก่อนเปิด chatbot

- [ ] Guest เข้า chatbot ไม่ได้ หรือ chatbot public ถูกจำกัดข้อมูลแล้ว
- [ ] AI ไม่ได้รับ service role key
- [ ] API key ของ AI อยู่ใน Netlify env ไม่ใช่ frontend
- [ ] ไม่มี field sensitive ใน prompt โดยไม่จำเป็น
- [ ] ทดสอบคำถามภาพรวมแล้วตัวเลขตรงกับฐานข้อมูล
- [ ] ทดสอบคำถามรายอำเภอแล้ว filter ถูกต้อง
- [ ] ทดสอบคำถามที่ AI ไม่ควรรู้ เช่น ขอเบอร์โทรรายบุคคล แล้วระบบไม่ควรเปิดเกินสิทธิ์

## 12. ความปลอดภัยของ AI Proxy

ไฟล์ proxy คือ

```text
netlify/functions/ai-proxy.js
```

หน้าที่

```text
frontend
  ↓
/.netlify/functions/ai-proxy
  ↓
Gemini / OpenRouter / NVIDIA
```

ข้อดีของ proxy

- ไม่ต้องใส่ AI API key ใน frontend
- เปลี่ยน provider ได้โดยไม่กระทบหน้าเว็บมาก
- ควบคุม CORS, method และ error ได้

ข้อควรระวังจากโค้ดปัจจุบัน

```js
'Access-Control-Allow-Origin': '*'
```

ค่า `*` ช่วยให้ทดสอบง่าย แต่ใน production ที่ต้องการเข้มงวด ควรจำกัด origin เป็น domain ของระบบ เช่น

```js
const allowedOrigins = [
  'https://npt-dashboard.netlify.app',
  'https://your-custom-domain.go.th'
];
```

แล้วตรวจ `Origin` จาก request ก่อนตอบกลับ

แนวทางเพิ่มความปลอดภัยในอนาคต

- จำกัด origin เฉพาะ domain จริง
- จำกัด method เฉพาะ `POST` และ `OPTIONS`
- ตรวจ provider ที่อนุญาตเป็น allowlist
- จำกัดขนาด request body
- ทำ rate limit หรือ quota ต่อผู้ใช้
- log เฉพาะ metadata ไม่ log prompt เต็มถ้ามีข้อมูล sensitive
- แยก key ตาม environment เช่น staging/production

## 13. ตรวจ `netlify.toml`

ไฟล์ deploy หลักคือ

```text
netlify.toml
```

ค่า build ปัจจุบัน

```toml
[build]
  publish = "dist"
  command = "npm run build:netlify"
```

ความหมาย

| ค่า | ความหมาย |
|---|---|
| `publish = "dist"` | โฟลเดอร์ที่ Netlify เอาไปเผยแพร่หลัง build |
| `command = "npm run build:netlify"` | คำสั่ง build ที่ Netlify ใช้ |

ใน `package.json` มี script

```json
"build:netlify": "vite build"
```

ดังนั้น Netlify จะ build ด้วย Vite แล้วนำไฟล์ใน `dist/` ไป deploy

## 14. Security Headers ใน Netlify

ใน `netlify.toml` มี headers พื้นฐาน

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

ความหมาย

| Header | หน้าที่ |
|---|---|
| `X-Frame-Options: DENY` | ป้องกันเว็บถูกฝังใน iframe เพื่อลด clickjacking |
| `X-XSS-Protection` | header เก่าสำหรับ browser บางตัว |
| `X-Content-Type-Options: nosniff` | กัน browser เดา content type ผิด |
| `Referrer-Policy` | จำกัดข้อมูล referrer ที่ส่งออกไปยังเว็บอื่น |

ข้อเสนอเพิ่มเติมสำหรับ production

```toml
Content-Security-Policy = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://openrouter.ai https://integrate.api.nvidia.com"
Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

หมายเหตุ: CSP ต้องทดสอบละเอียด เพราะระบบมี map, external API, Supabase และ Netlify Functions ถ้าตั้งเข้มเกินไปอาจทำให้บาง widget ใช้งานไม่ได้

## 15. SPA Redirect

ระบบนี้เป็น React SPA ใช้ React Router จึงต้องมี redirect

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

ถ้าไม่มี redirect นี้ จะเจอปัญหา

```text
เปิด /dashboard จากลิงก์ตรง → 404
refresh /dashboard/search → 404
refresh /public/large-plots → 404
```

หลัง deploy ให้ทดสอบโดยเปิด URL ย่อยโดยตรง เช่น

```text
https://your-site.netlify.app/dashboard
https://your-site.netlify.app/interactive-dashboard
https://your-site.netlify.app/public/large-plots
```

ถ้าเปิดตรงแล้วไม่ 404 แปลว่า SPA redirect ทำงาน

## 16. Environment Variables บน Netlify

ใน Netlify ให้เข้า

```text
Site configuration
  → Environment variables
```

หรือ

```text
Project configuration
  → Environment variables
```

ค่าที่ควรตั้งอย่างน้อย

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

ถ้าใช้ AI Chatbot ให้ตั้งเพิ่ม

```text
GEMINI_API_KEY
OPENROUTER_API_KEY
NVIDIA_API_KEY
```

ถ้าใช้ GISTDA key จริง

```text
VITE_GISTDA_API_KEY
```

ข้อควรจำ

- ค่า `VITE_` จะถูกฝังเข้า frontend ตอน build
- ค่า AI key ไม่ควรขึ้นต้นด้วย `VITE_` ถ้าเรียกผ่าน Netlify Function
- หลังแก้ env บน Netlify ต้อง deploy ใหม่
- production กับ preview deploy ควรใช้ key แยกกันถ้าเป็นไปได้

## 17. เตรียม deploy ครั้งแรกบน Netlify

ขั้นตอนทั่วไป

1. เข้า Netlify
2. เลือก Add new site
3. เลือก Import an existing project
4. เชื่อมกับ GitHub
5. เลือก repo `dragonfly13110/npt_dashboard`
6. ตั้งค่า build ตาม `netlify.toml`
7. ตั้ง Environment Variables
8. กด Deploy

ถ้า Netlify อ่าน `netlify.toml` ได้ถูกต้อง จะใช้ค่า

```text
Build command: npm run build:netlify
Publish directory: dist
```

ถ้า UI ของ Netlify ให้กรอกเอง ให้กรอกตามนี้

```text
Build command: npm run build:netlify
Publish directory: dist
```

## 18. ตรวจ build บนเครื่องก่อน deploy

ก่อน push หรือ deploy ควรรันในเครื่อง

```bash
npm install
npm run lint
npm run test
npm run build
npm run preview
```

ถ้าไม่มี test หรือ test ยังไม่ครบ อย่างน้อยควรรัน

```bash
npm run build
```

แล้ว preview

```bash
npm run preview
```

ตรวจ URL ที่ preview แสดง เช่น

```text
http://localhost:4173/
```

Checklist preview

- [ ] หน้า `/` เปิดได้
- [ ] หน้า `/interactive-dashboard` เปิดได้
- [ ] หน้า `/login` เปิดได้
- [ ] login ได้
- [ ] หน้า `/dashboard` เปิดได้หลัง login
- [ ] เปิด `/dashboard/search` ได้
- [ ] เปิด `/dashboard/chatbot` ได้
- [ ] refresh หน้า route ย่อยแล้วไม่เจอ error ใน preview
- [ ] ไม่มี error สำคัญใน console

## 19. ตรวจหลัง deploy สำเร็จ

หลัง Netlify deploy เสร็จ ให้ทดสอบบน URL จริง

### 19.1 หน้า public

- [ ] `/` เปิดได้
- [ ] `/interactive-dashboard` เปิดได้
- [ ] `/public/large-plots` เปิดได้
- [ ] หน้า public ไม่มีข้อมูลส่วนบุคคลเกินจำเป็น
- [ ] widget ภายนอกไม่ทำให้หน้า crash ถ้า API ล่ม

### 19.2 Login และ dashboard

- [ ] `/login` เปิดได้
- [ ] login ด้วย user จริงได้
- [ ] login แล้วเข้า `/dashboard` ได้
- [ ] role `viewer` เห็นเฉพาะเมนูที่ควรเห็น
- [ ] role `editor` เพิ่ม/แก้ไขข้อมูลได้ตามที่กำหนด
- [ ] role `admin` เข้า user management และ audit log ได้
- [ ] logout แล้วกลับเข้า dashboard ไม่ได้

### 19.3 Supabase/RLS

- [ ] anonymous อ่านเฉพาะข้อมูลที่ควร public
- [ ] authenticated อ่านข้อมูลตามสิทธิ์
- [ ] editor ไม่สามารถลบข้อมูลถ้าไม่ได้รับสิทธิ์
- [ ] viewer ไม่สามารถ insert/update/delete
- [ ] admin อ่าน audit log ได้
- [ ] non-admin อ่าน audit log ไม่ได้

### 19.4 Search

- [ ] ค้นชื่อแปลงใหญ่เจอ
- [ ] ค้นวิสาหกิจชุมชนเจอ
- [ ] ค้นตามอำเภอเจอ
- [ ] Search ไม่แสดง field sensitive ให้ผู้ใช้ที่ไม่ควรเห็น
- [ ] ถ้า RPC `global_search` fail ระบบ fallback ได้ หรือมี error ที่เข้าใจได้

### 19.5 AI Chatbot

- [ ] chatbot เปิดได้เฉพาะ role ที่กำหนด
- [ ] ถามภาพรวมจังหวัดแล้วตอบจากข้อมูลจริง
- [ ] ถามรายอำเภอแล้ว filter ถูกต้อง
- [ ] ถามเรื่องที่ไม่มีข้อมูลแล้วไม่กุข้อมูล
- [ ] ไม่ตอบข้อมูลส่วนบุคคลที่ไม่ควรเปิด
- [ ] ถ้า API key ไม่ครบ มี error ที่ตรวจได้ใน function logs

## 20. ตรวจ Logs บน Netlify

เมื่อ deploy แล้ว ถ้าระบบมีปัญหา ให้ดู 2 ส่วน

```text
Deploy logs
Function logs
```

### 20.1 Deploy logs

ใช้ดูปัญหา build เช่น

- install dependency ไม่ผ่าน
- build command ผิด
- import path ผิด
- env ไม่ครบ
- syntax error

### 20.2 Function logs

ใช้ดูปัญหา Netlify Functions เช่น

- AI key ไม่ได้ตั้ง
- provider ไม่ถูกต้อง
- request ไป Gemini/OpenRouter/NVIDIA fail
- CORS หรือ method ไม่ถูกต้อง

ไม่ควร log API key, prompt ที่มีข้อมูลส่วนบุคคล หรือข้อมูลราชการละเอียดลง function logs

## 21. การตั้งค่า Domain

ถ้าใช้ domain ของ Netlify ชั่วคราว เช่น

```text
https://npt-dashboard.netlify.app
```

สามารถใช้งานได้ทันทีหลัง deploy

ถ้าต้องใช้ custom domain ให้ทำใน Netlify

```text
Domain management
  → Add custom domain
```

Checklist custom domain

- [ ] domain ชี้ DNS ถูกต้อง
- [ ] HTTPS certificate พร้อมใช้งาน
- [ ] เปิดเว็บผ่าน `https://` ได้
- [ ] redirect จาก domain เก่าไป domain หลัก ถ้าจำเป็น
- [ ] Supabase Auth redirect URL รองรับ domain ใหม่
- [ ] CORS ของ function ถ้าจำกัด origin ต้องเพิ่ม domain ใหม่ด้วย

## 22. Supabase Auth Redirect URL

ถ้าใช้ login flow ที่เกี่ยวกับ email confirmation, magic link หรือ password reset ต้องตั้ง URL ใน Supabase ให้ตรงกับ domain จริง

ใน Supabase Dashboard

```text
Authentication
  → URL Configuration
```

ควรตรวจ

```text
Site URL
Redirect URLs
```

ตัวอย่าง

```text
https://npt-dashboard.netlify.app
https://your-custom-domain.go.th
http://localhost:5173
http://localhost:5174
```

ถ้า redirect URL ไม่ตรง อาจเกิดปัญหา

- กดยืนยัน email แล้วกลับเว็บไม่ได้
- reset password แล้ว redirect ผิด
- auth callback ไม่ทำงาน

## 23. การตั้งค่า Branch Deploy

แนวทางแนะนำ

| Branch | ใช้ทำอะไร |
|---|---|
| `main` | production deploy |
| feature branch | preview deploy หรือ pull request preview |
| docs branch | แก้เอกสาร ไม่กระทบ production ถ้าไม่ได้ merge |

ก่อน merge เข้า `main` ควรตรวจ

- [ ] build ผ่าน
- [ ] ไม่มี env/key หลุด
- [ ] ไม่มีข้อมูลตัวอย่างที่เป็นข้อมูลจริงปนใน repo
- [ ] route สำคัญไม่พัง
- [ ] manual หรือ changelog อัปเดตถ้าเป็นงานใหญ่

## 24. Rollback เมื่อ deploy มีปัญหา

ถ้า deploy ใหม่แล้วระบบพัง ให้ทำตามลำดับ

1. เข้า Netlify
2. ไปที่ Deploys
3. เลือก deploy ก่อนหน้าที่ใช้งานได้
4. กด Publish deploy หรือ Rollback ตาม UI ของ Netlify
5. แจ้งทีมว่า rollback แล้ว
6. แก้ต้นเหตุใน branch ใหม่

อย่าแก้บน production แบบเดาสุ่มหลายครั้ง เพราะจะทำให้ผู้ใช้เจอ error ต่อเนื่อง

หลัง rollback ควรตรวจ

- [ ] หน้า public กลับมาใช้ได้
- [ ] login ใช้ได้
- [ ] ข้อมูลใน Supabase ไม่เสียหาย
- [ ] function logs ไม่มี error ซ้ำ

## 25. แนวทาง Backup และ Export ข้อมูล

ก่อน deploy ใหญ่หรือ migration ใหญ่ ควร backup ข้อมูลก่อน

แนวทางพื้นฐาน

- Export ตารางสำคัญจาก Supabase เป็น CSV
- เก็บ SQL migration ที่รันไว้ใน repo
- จดวันที่ เวลา และผู้รัน migration
- ถ้าแก้ schema ใหญ่ ให้ทำ staging project ทดสอบก่อน

ตารางที่ควร backup ก่อน migration

```text
profiles
audit_logs
personnel
budgets
farmer_registry
agricultural_areas
large_plots
community_enterprises
smart_farmers
farmer_groups
farmer_institutes
agri_tourism
pest_centers
soil_fertilizer_centers
data_requests
data_request_assignments
data_request_responses
```

## 26. การจัดการ Staging และ Production

ถ้าระบบเริ่มมีผู้ใช้จริง ควรแยก environment

| Environment | ใช้ทำอะไร | ข้อมูล |
|---|---|---|
| Local | พัฒนาบนเครื่อง | ข้อมูลทดสอบ |
| Staging | ทดสอบก่อนเผยแพร่ | ข้อมูลจำลองหรือข้อมูลจริงบางส่วนที่ mask แล้ว |
| Production | ใช้งานจริง | ข้อมูลจริง |

สิ่งที่ควรแยก

- Supabase project
- Netlify site หรือ deploy context
- AI API key
- GISTDA/API key
- domain และ redirect URL

ไม่ควรใช้ production database ระหว่างทดลองโค้ดใหม่ ถ้าโค้ดนั้นมีการ insert/update/delete

## 27. การตรวจ Dependency และ Package

ก่อน deploy ใหญ่ ควรตรวจ dependency

```bash
npm audit
npm outdated
```

แนวทาง

- ถ้าเจอ vulnerability ระดับ critical/high ให้ประเมินก่อน deploy
- อย่า update package ใหญ่หลายตัวพร้อมกันก่อน deploy สำคัญ
- ถ้า update React, Vite, Ant Design หรือ Supabase client ให้ทดสอบ route หลักทั้งหมด
- ถ้ามี `package-lock.json` แล้ว ควร commit lock file เพื่อให้ build reproducible

หมายเหตุ: ถ้า repo ยังไม่มี lock file ทีมควรตกลงว่าจะใช้ npm lock file หรือไม่ เพื่อให้ Netlify build ได้เหมือนเครื่องพัฒนา

## 28. Performance Checklist ก่อน deploy

Dashboard ดึงข้อมูลหลายตารางพร้อมกัน จึงควรตรวจ performance ด้วย

Checklist

- [ ] Dashboard ไม่ดึง `*` จากตารางใหญ่ถ้าไม่จำเป็น
- [ ] card สรุปใช้ count แบบ head query
- [ ] chart ดึงเฉพาะ column ที่ใช้
- [ ] map จำกัดจำนวน marker หรือทำ pagination/layer
- [ ] Search มี limit ต่อ table
- [ ] AI ใช้ aggregation ไม่ส่ง raw rows จำนวนมาก
- [ ] หน้า public โหลดได้บน internet ปกติ
- [ ] รูปภาพใน public ไม่ใหญ่เกินจำเป็น

ถ้าหน้า dashboard ช้ามาก ให้เริ่มตรวจจาก

```text
src/hooks/useDashboardData.js
src/hooks/dashboard/dataFetchers.js
src/hooks/dashboard/selectors.js
```

## 29. ปัญหา deploy ที่พบบ่อย

### 29.1 Netlify build fail เพราะ dependency

อาการ

```text
npm ERR!
```

แนวทางแก้

- ตรวจ Node version บน Netlify
- รัน `npm install` และ `npm run build` ในเครื่องก่อน
- ตรวจว่า package ใน `package.json` ครบ
- ถ้ามี lock file ให้ commit ขึ้น repo

### 29.2 Deploy แล้วหน้า route ย่อย 404

สาเหตุหลักคือ SPA redirect ไม่ทำงาน

ตรวจ `netlify.toml`

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 29.3 Login ไม่ได้บน production แต่ local ได้

ตรวจ

- `VITE_SUPABASE_URL` บน Netlify ถูกหรือไม่
- `VITE_SUPABASE_ANON_KEY` ถูกหรือไม่
- Supabase Auth redirect URL มี domain production หรือไม่
- browser console มี CORS หรือ auth error หรือไม่
- user มี profile และ role แล้วหรือไม่

### 29.4 Dashboard ไม่มีข้อมูลบน production

ตรวจ

- Netlify env ชี้ Supabase project ถูกหรือไม่
- ตารางใน production Supabase มีข้อมูลหรือไม่
- RLS block หรือไม่
- policy ใน production ต่างจาก local หรือไม่
- column name ตรงกับ frontend หรือไม่

### 29.5 AI Chatbot error `API key not configured`

ตรวจ Netlify environment variables

```text
GEMINI_API_KEY
OPENROUTER_API_KEY
NVIDIA_API_KEY
```

หลังเพิ่ม key ต้อง deploy ใหม่

### 29.6 Function ใช้ได้ใน local แต่ใช้ไม่ได้บน Netlify

ตรวจ

- function path ตรงหรือไม่
- Netlify deploy รวม `netlify/functions/ai-proxy.js` แล้วหรือยัง
- function logs มี error อะไร
- env ตั้งใน scope ที่ถูกต้องหรือไม่
- provider endpoint เปลี่ยนหรือไม่

## 30. Checklist ก่อนเปิดใช้งานจริง

### 30.1 Code และ build

- [ ] `npm install` ผ่าน
- [ ] `npm run lint` ผ่านหรือทราบรายการที่ต้องแก้
- [ ] `npm run test` ผ่านถ้ามี test ที่เกี่ยวข้อง
- [ ] `npm run build` ผ่าน
- [ ] `npm run preview` ตรวจ route หลักแล้ว
- [ ] ไม่มี console error สำคัญ

### 30.2 Secrets และ env

- [ ] `.env` ไม่ถูก commit
- [ ] `.env.local` ไม่ถูก commit
- [ ] ไม่มี service role key ใน frontend
- [ ] Netlify มี `VITE_SUPABASE_URL`
- [ ] Netlify มี `VITE_SUPABASE_ANON_KEY`
- [ ] Netlify มี AI key ที่ใช้จริง
- [ ] key production แยกจาก key ทดลองถ้าเป็นไปได้

### 30.3 Supabase

- [ ] รัน schema ครบ
- [ ] รัน migration RBAC/audit แล้ว
- [ ] มี admin คนแรก
- [ ] ผู้ใช้ทั่วไปเริ่มเป็น viewer
- [ ] RLS เปิดครบทุกตารางสำคัญ
- [ ] policy ไม่กว้างเกินสำหรับข้อมูลจริง
- [ ] public data ใช้ view หรือ policy เฉพาะ
- [ ] audit log อ่านได้เฉพาะ admin

### 30.4 Public data

- [ ] หน้า public ไม่แสดงข้อมูลส่วนบุคคลเกินจำเป็น
- [ ] หน้า public ไม่แสดงเบอร์โทรส่วนตัวโดยไม่ตั้งใจ
- [ ] Search ไม่เปิด field sensitive ให้ guest
- [ ] Export ไม่เปิดข้อมูลเกินสิทธิ์
- [ ] AI ไม่ตอบข้อมูลส่วนบุคคลที่ไม่ควรเปิด

### 30.5 Netlify

- [ ] build command ถูกต้อง
- [ ] publish directory เป็น `dist`
- [ ] redirect SPA ทำงาน
- [ ] security headers ทำงาน
- [ ] custom domain และ HTTPS พร้อม ถ้ามี
- [ ] function logs ไม่มี error สำคัญ

## 31. Checklist หลังเปิดใช้งานจริง

หลังเปิดระบบ 1-3 วันแรก ควรตรวจซ้ำ

- [ ] มีผู้ใช้ login ได้จริง
- [ ] ไม่มีผู้ใช้แจ้ง route 404
- [ ] Dashboard โหลดได้ในเวลายอมรับได้
- [ ] Supabase ไม่มี error rate สูงผิดปกติ
- [ ] AI proxy ไม่มี error ถี่ผิดปกติ
- [ ] ค่าใช้จ่าย API ไม่พุ่งผิดปกติ
- [ ] audit log มีรายการเพิ่ม/แก้/ลบข้อมูลตามจริง
- [ ] ไม่มีข้อมูลส่วนบุคคลถูกแสดงผิดหน้า
- [ ] มีช่องทางให้ผู้ใช้แจ้งปัญหา

## 32. แนวทางปรับความปลอดภัยระยะถัดไป

หลังระบบเริ่มใช้งานจริง ควรวางแผนเพิ่มความปลอดภัยระยะถัดไป

| เรื่อง | แนวทาง |
|---|---|
| RLS รายกลุ่มงาน | editor แก้ได้เฉพาะตารางของกลุ่มงานตนเอง |
| RLS รายอำเภอ | อำเภอแก้ได้เฉพาะข้อมูลอำเภอตนเอง |
| Public view | แยกข้อมูล public ออกจากตารางจริง |
| Field masking | ซ่อนเบอร์โทรบางส่วน เช่น `08x-xxx-1234` |
| Rate limit AI | จำกัดจำนวนคำถามต่อผู้ใช้หรือช่วงเวลา |
| Function CORS | จำกัด origin เฉพาะ domain จริง |
| Audit retention | กำหนดระยะเวลาเก็บ audit log |
| Backup schedule | ตั้งรอบ export/backup ข้อมูลสำคัญ |
| Staging project | แยก staging จาก production |
| Monitoring | ตรวจ error, usage และค่าใช้จ่ายเป็นรอบ |

## 33. ผลลัพธ์ที่ควรได้จากบทนี้

หลังจบบทนี้ ควรได้ผลลัพธ์ดังนี้

- ระบบผ่าน production build
- Netlify deploy ได้สำเร็จ
- route public และ internal เปิดได้
- login และ role ทำงานถูกต้อง
- Supabase RLS ถูกตรวจแล้ว
- ข้อมูล public ไม่เปิดเผยข้อมูลส่วนบุคคลเกินจำเป็น
- AI key อยู่ใน Netlify env ไม่อยู่ใน frontend
- AI Chatbot ตอบจากข้อมูลจริงและไม่เปิดข้อมูลเกินสิทธิ์
- มี checklist สำหรับตรวจซ้ำหลังเปิดใช้งานจริง
- พร้อมเข้าสู่บท 08 เรื่องการดูแลระบบและอบรมผู้ใช้งาน
