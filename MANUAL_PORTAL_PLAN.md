# แผนการออกแบบและจัดทำคู่มือบนเว็บ NPT Smart Agri Dashboard

## 1. เป้าหมายของงาน

โครงการ `npt_dashboard` มีเอกสารคู่มือใน `docs/manual` อยู่แล้ว 8 บท ครอบคลุมตั้งแต่ภาพรวมระบบ การรวบรวมข้อมูล การทำความสะอาดข้อมูล การออกแบบฐานข้อมูล Supabase การติดตั้งโปรเจกต์ การสร้าง Dashboard/Search/AI การ Deploy และการดูแลระบบหลังเปิดใช้งาน

เป้าหมายรอบนี้คือยกระดับเอกสารเหล่านั้นจาก “ไฟล์ Markdown ใน GitHub” ให้กลายเป็น “ศูนย์คู่มือในเว็บ” ที่กรรมการ ผู้บริหาร เจ้าหน้าที่ และทีมพัฒนาสามารถเปิดอ่าน เข้าใจ ทดลองใช้งาน และเชื่อมั่นว่าระบบนี้พร้อมใช้งานจริงและขยายผลต่อได้

## 2. หลักคิดสำคัญ

1. คู่มือต้องไม่ใช่เอกสารประกอบหลังบ้านเท่านั้น แต่ต้องเป็นส่วนหนึ่งของประสบการณ์ใช้งานระบบ
2. กรรมการต้องเห็นว่าระบบมีความพร้อมเชิงปฏิบัติ ไม่ใช่แค่มี dashboard สวย
3. เจ้าหน้าที่ที่ไม่ใช่นักพัฒนาต้องอ่านแล้วทำตามได้
4. ผู้ดูแลระบบต้องใช้คู่มือเป็น SOP รายวัน รายเดือน และหลังเกิดปัญหาได้
5. ทีมจังหวัดอื่นต้องเห็นแนวทางนำไปปรับใช้ต่อได้
6. เนื้อหาต้องแยกชัดระหว่างคู่มือผู้ใช้ คู่มือผู้ดูแลระบบ คู่มือเทคนิค และเอกสารสำหรับกรรมการ

## 3. กลุ่มผู้อ่านหลัก

| กลุ่มผู้อ่าน         | สิ่งที่ต้องการจากคู่มือ                              | แนวทางนำเสนอ                                                    |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| กรรมการประกวด        | เห็นความครบถ้วน ความน่าเชื่อถือ และผลกระทบเชิงระบบ   | หน้า overview, impact, architecture, security, scalability      |
| ผู้บริหาร            | อ่านเร็ว เห็นภาพรวมสถานการณ์และประโยชน์              | executive guide, situation room guide, dashboard interpretation |
| เจ้าหน้าที่กลุ่มงาน  | ใช้งานระบบ เพิ่ม/แก้ไข/นำเข้าข้อมูลได้               | step-by-step พร้อม checklist                                    |
| ผู้ดูแลระบบ          | ดูแล user, security, backup, data refresh, audit log | admin SOP, troubleshooting, maintenance calendar                |
| ทีมพัฒนา/จังหวัดอื่น | ติดตั้งและต่อยอดระบบได้                              | technical setup, schema, deployment, extension guide            |

## 4. โครงสร้าง Documentation Portal ในเว็บ

### 4.1 เส้นทางหน้าเว็บที่ควรมี

| Route                       | หน้าที่                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `/manual`                   | หน้าแรกของศูนย์คู่มือ แนะนำบททั้งหมดและกลุ่มผู้อ่าน        |
| `/manual/competition-guide` | คู่มือสำหรับกรรมการ ดูภาพรวม เหตุผล ผลลัพธ์ และจุดเด่นระบบ |
| `/manual/user-guide`        | คู่มือการใช้งานสำหรับเจ้าหน้าที่ทั่วไป                     |
| `/manual/admin-guide`       | คู่มือผู้ดูแลระบบและผู้มีสิทธิ์ admin/editor               |
| `/manual/data-guide`        | คู่มือข้อมูล การนำเข้า การทำความสะอาด และ data governance  |
| `/manual/security-guide`    | คู่มือความปลอดภัย RLS สิทธิ์ผู้ใช้ และข้อมูลส่วนบุคคล      |
| `/manual/developer-guide`   | คู่มือเทคนิคสำหรับติดตั้ง/พัฒนา/Deploy                     |
| `/manual/:slug`             | หน้าอ่านบทจาก `docs/manual/*.md`                           |

### 4.2 Navigation ที่ควรมี

- Sidebar สารบัญคู่มือ
- Search ภายในคู่มือ
- Badge แยกประเภท เช่น สำหรับกรรมการ, สำหรับเจ้าหน้าที่, สำหรับผู้ดูแลระบบ, สำหรับนักพัฒนา
- ปุ่ม “อ่านบทถัดไป”
- ปุ่ม “กลับไปหน้าคู่มือ”
- ปุ่มเปิดไฟล์ Markdown ต้นฉบับใน GitHub หรือ local docs
- ปุ่มดาวน์โหลด PDF ในระยะถัดไป

## 5. โครงสร้างเนื้อหาที่ควรจัดใหม่

### 5.1 คู่มือชุดหลักจากของเดิม

| บทเดิม                                        | บทบาทในเว็บคู่มือ               | หมายเหตุ                                                |
| --------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `01-ภาพรวมและเป้าหมายระบบ.md`                 | ภาพรวมระบบและเหตุผลของโครงการ   | ใช้เป็นฐานของ `/manual` และ `/manual/competition-guide` |
| `02-การรวบรวมข้อมูลจากจังหวัด.md`             | คู่มือ data collection          | เพิ่มตัวอย่างแบบฟอร์มและ checklist                      |
| `03-การทำความสะอาดและเตรียมข้อมูล.md`         | คู่มือ data preparation         | เพิ่มกรณีข้อมูลซ้ำ/ข้อมูลส่วนบุคคล/format CSV           |
| `04-การออกแบบฐานข้อมูลและตั้งค่า-supabase.md` | คู่มือ database/admin technical | แยกหัวข้อ RLS, role, schema, migration ให้อ่านง่าย      |
| `05-การติดตั้งและตั้งค่าโปรเจกต์.md`          | developer setup guide           | เหมาะกับทีมจังหวัดอื่นและทีมพัฒนา                       |
| `06-การสร้าง-dashboard-search-ai.md`          | feature architecture guide      | เพิ่มภาพ flow Dashboard/Search/AI                       |
| `07-ความปลอดภัยและการ-deploy.md`              | security/deployment guide       | ดันเป็นจุดขายเรื่องความพร้อม production                 |
| `08-การดูแลระบบและอบรมผู้ใช้งาน.md`           | operation and training guide    | ใช้เป็น SOP หลังส่งมอบ                                  |

### 5.2 หน้าใหม่ที่ควรเพิ่ม

1. `00-คู่มือสำหรับกรรมการ.md`
   - ระบบนี้แก้ปัญหาอะไร
   - จุดเด่นที่ควรดูตอน demo
   - data flow จากแหล่งข้อมูลถึง dashboard
   - ความปลอดภัยและการควบคุมสิทธิ์
   - หลักฐานความพร้อมใช้งานจริง

2. `09-คู่มือการใช้งานรายเมนู.md`
   - Dashboard รวม
   - Executive Situation Room
   - ข้อมูลบุคลากร
   - พัสดุ/ครุภัณฑ์
   - งบประมาณ
   - คำขอข้อมูล
   - ข้อมูลเกษตรกร/กลุ่มเกษตรกร
   - แผนที่อัจฉริยะ
   - Search
   - AI Chatbot

3. `10-คู่มือการนำเข้าข้อมูล-csv.md`
   - วิธีเตรียมไฟล์
   - วิธีเลือก mode import
   - วิธีตรวจสอบหลัง import
   - ข้อควรระวังเรื่องข้อมูลซ้ำ

4. `11-sop-ผู้ดูแลระบบ.md`
   - งานรายวัน
   - งานรายสัปดาห์
   - งานรายเดือน
   - การตรวจ audit log
   - การจัดการ user
   - การ backup/restore

5. `12-troubleshooting.md`
   - Login ไม่ได้
   - ข้อมูลไม่ขึ้น
   - Import CSV แล้ว error
   - Supabase permission/RLS error
   - Netlify Function error
   - AI Chatbot ตอบช้า/ไม่ตอบ

## 6. รูปแบบหน้า Manual Portal

### 6.1 หน้า `/manual`

ควรประกอบด้วย:

- Hero แบบเรียบ ไม่ใช่ landing page ใหญ่
- สรุปว่าเอกสารนี้ช่วยใคร
- Quick cards 5 กลุ่มผู้อ่าน
- รายการบทคู่มือทั้งหมด
- “เริ่มอ่านตามบทบาท” เช่น กรรมการเริ่มที่ไหน เจ้าหน้าที่เริ่มที่ไหน
- Checklist ความพร้อมของระบบ
- ลิงก์ไปเอกสารอ้างอิง เช่น architecture, environment, database inventory

### 6.2 หน้าอ่านบท `/manual/:slug`

ควรประกอบด้วย:

- Sidebar สารบัญ
- Title และ description ของบท
- Content markdown render
- Table of contents จาก heading
- Callout สำหรับ warning/security/checklist
- ปุ่มบทก่อนหน้า/ถัดไป
- เวลาปรับปรุงล่าสุด

### 6.3 Design tone

- สุขุม เป็นระบบ น่าเชื่อถือ
- ใช้สีของระบบเดิม ไม่ทำ palette ใหม่
- เน้นอ่านง่ายมากกว่าตกแต่งเยอะ
- หน้า manual ควรรู้สึกเหมือน knowledge base ของหน่วยงานราชการยุคใหม่

## 7. แผนงานแบบเป็นเฟส

## Phase 1: Foundation - ทำให้มีคู่มือในเว็บก่อน

### Task 1: สร้างหน้า Manual Landing

**Description:** เพิ่มหน้า `/manual` สำหรับแสดงภาพรวมคู่มือ กลุ่มผู้อ่าน และลิงก์ไปบทต่าง ๆ

**Acceptance criteria:**

- [ ] เข้า `/manual` ได้จาก browser
- [ ] แสดงรายการคู่มือจาก `docs/manual` ครบ 8 บท
- [ ] มีส่วนแนะนำสำหรับกรรมการ เจ้าหน้าที่ ผู้ดูแลระบบ และทีมพัฒนา
- [ ] Responsive บน desktop และ mobile

**Verification:**

- [ ] `npm.cmd run build` ผ่าน
- [ ] เปิดหน้า `/manual` แล้วไม่เจอ console error
- [ ] ตรวจด้วย screenshot ว่า layout ไม่ล้นบน mobile

**Dependencies:** None

**Files likely touched:**

- `src/App.jsx`
- `src/pages/Manual.jsx`
- `src/pages/Manual.css`

**Estimated scope:** Medium

### Task 2: เพิ่มเมนูคู่มือใน Sidebar และหน้า Landing

**Description:** เพิ่มทางเข้าคู่มือให้ผู้ใช้และกรรมการเข้าถึงง่ายจากเมนูหลักหรือส่วน footer/landing

**Acceptance criteria:**

- [ ] Sidebar มีเมนู “คู่มือระบบ”
- [ ] หน้า Landing มีลิงก์ไป `/manual`
- [ ] ผู้ใช้ guest สามารถเปิดคู่มือได้

**Verification:**

- [ ] เข้าจากหน้าแรกไป `/manual` ได้
- [ ] เข้าจาก dashboard sidebar ไป `/manual` ได้

**Dependencies:** Task 1

**Files likely touched:**

- `src/components/Layout/Sidebar.jsx`
- `src/pages/LandingPage.jsx`
- `src/App.jsx`

**Estimated scope:** Small

### Checkpoint 1

- [ ] หน้า `/manual` ใช้งานได้จริง
- [ ] Build ผ่าน
- [ ] มีทางเข้าคู่มือจากเว็บ
- [ ] ยังไม่ต้อง render markdown เต็ม แต่ต้องมีโครง portal ที่พร้อมต่อยอด

## Phase 2: Markdown Reader - อ่านคู่มือจากเนื้อหาจริง

### Task 3: สร้าง registry ของบทคู่มือ

**Description:** สร้างข้อมูลกลางสำหรับบทคู่มือ เช่น slug, title, audience, summary, source path, reading order

**Acceptance criteria:**

- [ ] มี manual registry ใน frontend
- [ ] ทุกบทมี slug และ metadata
- [ ] หน้า `/manual` ใช้ registry นี้แสดงรายการบท

**Verification:**

- [ ] เพิ่ม/ลบบทใน registry แล้ว UI เปลี่ยนตาม
- [ ] ไม่มี hardcode ซ้ำหลายจุด

**Dependencies:** Task 1

**Files likely touched:**

- `src/data/manualRegistry.js`
- `src/pages/Manual.jsx`

**Estimated scope:** Small

### Task 4: ทำหน้าอ่านบทคู่มือ

**Description:** เพิ่ม route `/manual/:slug` และ markdown renderer เพื่ออ่านบทคู่มือแต่ละบท

**Acceptance criteria:**

- [ ] เปิด `/manual/overview` หรือ slug ที่กำหนดแล้วเห็นเนื้อหาบท
- [ ] มีปุ่มบทก่อนหน้า/ถัดไป
- [ ] ถ้า slug ไม่ถูกต้อง แสดง not found state ที่สุภาพ

**Verification:**

- [ ] เปิดครบทุกบทจาก registry ได้
- [ ] Build ผ่าน
- [ ] ตรวจ heading, list, table, code block render ได้

**Dependencies:** Task 3

**Files likely touched:**

- `src/pages/ManualArticle.jsx`
- `src/pages/Manual.css`
- `src/data/manualRegistry.js`
- `src/App.jsx`

**Estimated scope:** Medium

### Task 5: แปลง/โหลด Markdown ให้เหมาะกับ Vite

**Description:** เลือกวิธีนำ Markdown มาใช้ในเว็บ อาจใช้ raw import, generated data, หรือ prebuild script แล้วทำให้รองรับภาษาไทย

**Acceptance criteria:**

- [ ] เนื้อหา Markdown ภาษาไทยแสดงไม่เพี้ยน
- [ ] รองรับ table, code block, heading, link
- [ ] ไม่มี secret หรือข้อมูลอ่อนไหวหลุดเข้า public bundle

**Verification:**

- [ ] ตรวจบท 04, 07 ที่เกี่ยวกับ Supabase/security เป็นพิเศษ
- [ ] Search ใน bundle หรือ content ว่าไม่มี `.env` secret จริง

**Dependencies:** Task 4

**Files likely touched:**

- `src/data/manualContent.js` หรือ script generate
- `docs/manual/*.md`
- `vite.config.js` ถ้าจำเป็น

**Estimated scope:** Medium

### Checkpoint 2

- [ ] เปิดอ่านคู่มือ 8 บทจากเว็บได้
- [ ] ภาษาไทยไม่เพี้ยน
- [ ] Build ผ่าน
- [ ] ไม่มีข้อมูลลับในคู่มือ public

## Phase 3: Competition-Ready Content - ทำคู่มือสำหรับกรรมการ

### Task 6: เขียนหน้า “คู่มือสำหรับกรรมการ”

**Description:** สร้างบทใหม่ที่สรุปสิ่งที่กรรมการควรดูและเหตุผลเชิงระบบว่าทำไมโครงการนี้พร้อมใช้งานจริง

**Acceptance criteria:**

- [ ] มีบท `00-คู่มือสำหรับกรรมการ.md`
- [ ] อธิบาย problem, solution, impact, architecture, security, scalability
- [ ] มี checklist สำหรับการ demo
- [ ] ไม่ยาวเกินไป แต่ชี้ไปคู่มือเชิงลึกได้

**Verification:**

- [ ] อ่านจบภายใน 5-8 นาที
- [ ] มีลิงก์ไปหน้า dashboard สำคัญ
- [ ] ไม่มีคำกล่าวอ้างที่ไม่มีหลักฐานจากระบบ

**Dependencies:** Task 3

**Files likely touched:**

- `docs/manual/00-คู่มือสำหรับกรรมการ.md`
- `src/data/manualRegistry.js`

**Estimated scope:** Medium

### Task 7: เพิ่ม Use Case Guide ตามบทบาท

**Description:** ทำคู่มือสั้นแบบ workflow สำหรับงานจริงของแต่ละบทบาท

**Acceptance criteria:**

- [ ] มี workflow สำหรับผู้บริหาร
- [ ] มี workflow สำหรับเจ้าหน้าที่นำเข้าข้อมูล
- [ ] มี workflow สำหรับ admin
- [ ] มี workflow สำหรับประชาชน/guest

**Verification:**

- [ ] แต่ละ workflow มี step ไม่เกิน 8 ขั้น
- [ ] ระบุเมนูและผลลัพธ์ที่ควรเห็น

**Dependencies:** Task 6

**Files likely touched:**

- `docs/manual/09-คู่มือการใช้งานรายเมนู.md`
- `src/data/manualRegistry.js`

**Estimated scope:** Medium

### Task 8: เพิ่ม Checklist และ SOP

**Description:** เพิ่ม checklist ใช้งานจริง เช่น ก่อนนำเข้าข้อมูล ก่อนเปิดเผยข้อมูล ก่อน deploy และงานดูแลระบบประจำเดือน

**Acceptance criteria:**

- [ ] มี checklist สำหรับ data import
- [ ] มี checklist สำหรับ security/privacy
- [ ] มี checklist สำหรับ admin maintenance
- [ ] มี troubleshooting table

**Verification:**

- [ ] เจ้าหน้าที่อ่านแล้วทำตามได้โดยไม่ต้องเข้าใจ code
- [ ] มีคำเตือนเรื่องข้อมูลส่วนบุคคลชัดเจน

**Dependencies:** Task 7

**Files likely touched:**

- `docs/manual/10-คู่มือการนำเข้าข้อมูล-csv.md`
- `docs/manual/11-sop-ผู้ดูแลระบบ.md`
- `docs/manual/12-troubleshooting.md`

**Estimated scope:** Medium

### Checkpoint 3

- [ ] คู่มือมีเนื้อหาสำหรับกรรมการโดยเฉพาะ
- [ ] มี workflow ใช้งานจริง
- [ ] มี checklist/SOP
- [ ] พร้อมใช้ในวันนำเสนอ

## Phase 4: UX Polish - ทำให้คู่มืออ่านง่ายและดูเป็นระบบ

### Task 9: เพิ่ม Search ภายในคู่มือ

**Description:** เพิ่มช่องค้นหาเนื้อหาคู่มือจาก title, summary, heading และ body

**Acceptance criteria:**

- [ ] ค้นคำว่า Supabase, RLS, CSV, Chatbot, Deploy แล้วเจอบทที่เกี่ยวข้อง
- [ ] ผลลัพธ์แสดงชื่อบทและ snippet
- [ ] ใช้งานบน mobile ได้

**Verification:**

- [ ] ทดสอบคำค้นหลัก 10 คำ
- [ ] ไม่มี lag ชัดเจน

**Dependencies:** Task 5

**Files likely touched:**

- `src/pages/Manual.jsx`
- `src/pages/ManualSearch.jsx`
- `src/data/manualRegistry.js`

**Estimated scope:** Medium

### Task 10: เพิ่ม Table of Contents ในบทความ

**Description:** สร้างสารบัญจาก heading ของ Markdown เพื่อให้บทที่ยาวอ่านง่ายขึ้น

**Acceptance criteria:**

- [ ] บทที่ยาวมี sidebar/table of contents
- [ ] คลิก heading แล้ว scroll ไปตำแหน่งที่ถูกต้อง
- [ ] บน mobile ไม่บังเนื้อหา

**Verification:**

- [ ] ตรวจบท 04, 06, 07, 08 ซึ่งยาวเป็นพิเศษ
- [ ] ตรวจ hash link ใน URL

**Dependencies:** Task 4

**Files likely touched:**

- `src/pages/ManualArticle.jsx`
- `src/pages/Manual.css`

**Estimated scope:** Medium

### Task 11: เพิ่ม Callout Components

**Description:** ทำรูปแบบ callout สำหรับ Warning, Tip, Security, Checklist, Example เพื่อให้คู่มืออ่านง่ายและดู professional

**Acceptance criteria:**

- [ ] Markdown สามารถแสดง callout ได้
- [ ] สีและ icon สอดคล้องกับ design system
- [ ] ใช้ในบท security/data/import อย่างน้อย 5 จุด

**Verification:**

- [ ] อ่านบน mobile แล้วไม่ล้น
- [ ] Contrast ผ่านการอ่านจริง

**Dependencies:** Task 4

**Files likely touched:**

- `src/components/manual/ManualCallout.jsx`
- `src/pages/Manual.css`
- `docs/manual/*.md`

**Estimated scope:** Medium

### Checkpoint 4

- [ ] คู่มืออ่านง่ายขึ้นอย่างชัดเจน
- [ ] Search ใช้งานได้
- [ ] บทยาวไม่หลงทาง
- [ ] UI ดูเข้ากับระบบเดิม

## Phase 5: Evidence and Handoff - ทำให้คู่มือเป็นหลักฐานความพร้อม

### Task 12: เพิ่มหน้า System Readiness

**Description:** สรุปความพร้อมของระบบเป็นหลักฐาน เช่น data coverage, security, deployment, testing, maintenance plan

**Acceptance criteria:**

- [ ] มีรายการความพร้อมก่อนใช้งานจริง
- [ ] ระบุสิ่งที่ทำแล้วและสิ่งที่ต้องดูแลต่อ
- [ ] เชื่อมโยงกับ docs/reference ที่มีอยู่

**Verification:**

- [ ] กรรมการอ่านแล้วเข้าใจว่าระบบมีแผนหลังประกวด
- [ ] ไม่มีการอ้างเกินจริง

**Dependencies:** Task 6

**Files likely touched:**

- `docs/manual/13-system-readiness.md`
- `src/data/manualRegistry.js`

**Estimated scope:** Small

### Task 13: เพิ่ม Export/Print Friendly

**Description:** ทำให้คู่มือพิมพ์หรือ export เป็น PDF ได้ง่ายในอนาคต

**Acceptance criteria:**

- [ ] มี print CSS เบื้องต้น
- [ ] ซ่อน sidebar/button ตอน print
- [ ] เนื้อหาบทอ่านต่อเนื่องเมื่อพิมพ์

**Verification:**

- [ ] ใช้ browser print preview ตรวจ 2-3 บท

**Dependencies:** Task 4

**Files likely touched:**

- `src/pages/Manual.css`

**Estimated scope:** Small

### Checkpoint 5

- [ ] คู่มือพร้อมใช้ในรอบนำเสนอ
- [ ] มีหลักฐานความพร้อมของระบบ
- [ ] เปิดเว็บแล้วกรรมการเห็น maturity ของโครงการทันที

## 8. ลำดับการทำที่แนะนำแบบเร่งด่วน

ถ้ามีเวลาจำกัดก่อนนำเสนอ ให้ทำตามลำดับนี้:

1. ทำ `/manual` หน้าแรก
2. เพิ่มลิงก์เข้า manual จากหน้าแรกและ sidebar
3. เพิ่มหน้า “คู่มือสำหรับกรรมการ”
4. ทำ registry ของบทคู่มือ
5. ทำหน้าอ่าน Markdown จากบทเดิม
6. เพิ่มคู่มือรายเมนูเฉพาะ flow ที่จะ demo
7. เพิ่ม checklist ความปลอดภัยและการนำเข้าข้อมูล
8. polish mobile/table of contents/search เท่าที่เวลาเหลือ

## 9. ความเสี่ยงและแนวทางลดความเสี่ยง

| ความเสี่ยง                            | ผลกระทบ               | แนวทางลดความเสี่ยง                                     |
| ------------------------------------- | --------------------- | ------------------------------------------------------ |
| เนื้อหา Markdown ยาวมากและ render ช้า | หน้าอ่านคู่มืออืด     | Lazy load รายบท และแยก content ตาม route               |
| ภาษาไทยเพี้ยนจาก encoding             | คู่มือไม่น่าเชื่อถือ  | ตรวจ encoding UTF-8 และทดสอบบทที่มีภาษาไทยยาว          |
| คู่มือมีข้อมูลลับหรือ env จริง        | เสี่ยง security       | ตรวจคำว่า key, secret, token, service_role ก่อน public |
| Scope ใหญ่เกินก่อนวันนำเสนอ           | ทำไม่ทัน              | ทำ Phase 1-3 ก่อน Phase 4-5                            |
| UI คู่มือไม่เข้ากับระบบเดิม           | ดูแยกจากผลิตภัณฑ์หลัก | ใช้ token, font, spacing, สี จากระบบเดิม               |
| เนื้อหาเทคนิคเกินไปสำหรับกรรมการ      | อ่านไม่จบ             | ทำหน้า competition guide แยกจาก developer guide        |

## 10. เกณฑ์สำเร็จของงานนี้

งานนี้ถือว่าสำเร็จเมื่อ:

- [ ] ผู้ใช้เปิด `/manual` ได้จากเว็บ
- [ ] กรรมการมีหน้าอ่านเฉพาะที่สรุปภาพรวมและจุดเด่นระบบ
- [ ] เจ้าหน้าที่มีคู่มือใช้งานรายเมนู
- [ ] ผู้ดูแลระบบมี checklist/SOP
- [ ] ทีมพัฒนามีเอกสารติดตั้งและต่อยอด
- [ ] เนื้อหาคู่มือเดิม 8 บทถูกเชื่อมเข้ากับเว็บ
- [ ] Build ผ่าน
- [ ] ไม่มีข้อมูลลับใน public documentation
- [ ] คู่มือแสดงผลดีบน desktop และ mobile

## 11. ข้อเสนอเชิงกลยุทธ์สำหรับรอบ 10 ทีม

ในการนำเสนอรอบ 10 ทีม ควรใช้คู่มือเป็นหลักฐานว่าโครงการไม่ได้หยุดที่ prototype แต่คิดครบถึงการนำไปใช้จริง:

1. เปิดหน้า `/manual/competition-guide` ให้กรรมการเห็นภาพรวม
2. ชี้ว่ามีคู่มือสำหรับเจ้าหน้าที่และผู้ดูแลระบบ
3. แสดง checklist เรื่องข้อมูลส่วนบุคคลและ RLS
4. เปิด workflow การนำเข้าข้อมูลหรือการดู Situation Room
5. สรุปว่าจังหวัดอื่นสามารถนำโครงนี้ไปปรับใช้ได้ เพราะมีทั้งระบบและคู่มือประกอบ

ประโยคสำคัญที่ควรสื่อสาร:

> ระบบนี้ไม่ได้เป็นเพียง dashboard สำหรับนำเสนอข้อมูล แต่เป็นต้นแบบระบบข้อมูลจังหวัดที่มีคู่มือ กระบวนการดูแล ความปลอดภัย และแนวทางขยายผลครบถ้วน
