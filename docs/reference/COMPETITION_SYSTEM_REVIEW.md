# รีวิวระบบ NPT Dashboard สำหรับงานแข่งขันระดับกรม

วันที่รีวิว: 2026-05-24
สถานะ: รีวิวเชิงลึกจากโค้ด, เอกสารระบบ, โครงสร้างหน้า, security scan, lint, audit, build, test

## สรุปผู้บริหาร

ระบบนี้มีแกนที่ดีมากสำหรับงานแข่งขันระดับกรม เพราะไม่ใช่แค่ dashboard สวย ๆ แต่มีองค์ประกอบครบหลายมิติ:

- หน้า public portal สำหรับประชาชนและกรรมการ
- หน้า dashboard ภายในสำหรับเจ้าหน้าที่
- แผนที่อัจฉริยะ
- interactive dashboard
- ระบบค้นหากลาง
- chatbot/AI assistant
- ข้อมูลด้านการผลิต, พัฒนาเกษตรกร, อารักขาพืช, งบประมาณ, ครุภัณฑ์, บุคลากร
- โครงสร้าง Supabase, Netlify Functions, React Query, Recharts, Leaflet

ถ้ามองแบบกรรมการ ระบบนี้มีวัตถุดิบเพียงพอที่จะขายเป็น “ระบบบริหารข้อมูลเกษตรจังหวัดแบบครบวงจร” ได้แล้ว แต่ยังมี 3 เรื่องที่ต้องเร่งยกระดับก่อนแข่ง:

1. ความน่าเชื่อถือเชิงวิศวกรรม: CI, lint, audit, e2e, monitoring ต้องนิ่งกว่านี้
2. ความปลอดภัยและ governance: key, RLS, guest access, audit log, privacy ต้องคุมให้ชัด
3. Story สำหรับกรรมการ: ต้องมีหน้า/flow ที่ทำให้เห็นผลลัพธ์, impact, before/after, และการตัดสินใจของผู้บริหารใน 3-5 นาที

ข้อเสนอหลักคือเพิ่ม “Executive Situation Room”, “Data Quality Command Center”, “District 360”, “AI Report Builder”, และ “Competition Demo Mode” เพราะเป็นชุดฟีเจอร์ที่ทำให้ระบบดูเป็นของใช้งานระดับกรม ไม่ใช่แค่เว็บรวมกราฟ

## คะแนนภาพรวม

| ด้าน              |        สถานะ | ความเห็น                                                                            |
| ----------------- | -----------: | ----------------------------------------------------------------------------------- |
| คุณค่าต่อหน่วยงาน |        ดีมาก | โดเมนชัด มีข้อมูลเกษตรจริงหลายชุด                                                   |
| UX/ภาพรวมหน้าเว็บ |           ดี | มี landing, public pages, dashboard, map แต่ต้องจัด story ให้คม                     |
| Mobile readiness  | ปานกลางถึงดี | เพิ่งแก้ปัญหา touch บน Smart Map แล้ว แต่ควรมี mobile QA เพิ่ม                      |
| Data integration  |           ดี | มี Supabase, weather/hotspot sync, chatbot context แต่ยังขาด data lineage/freshness |
| AI capability     |           ดี | มี proxy และ chatbot service แต่ควรเพิ่ม report builder + cited numbers             |
| Security          |     ต้องเร่ง | พบ fallback keys, CORS กว้าง, RLS หลายตารางเปิด authenticated เต็ม                  |
| CI/testing        |     ต้องเร่ง | build/test ผ่าน แต่ lint fail และ CI ยังไม่ครอบคลุม lint/audit/e2e                  |
| Maintainability   |      ปานกลาง | มีไฟล์ใหญ่มากหลายไฟล์ เสี่ยงแก้ยากและ regression ง่าย                               |
| Demo readiness    |      ปานกลาง | ระบบมีของ แต่ยังต้องมี demo route, script, seeded scenario                          |

## สิ่งที่ควรแก้ด่วนที่สุด

### 1. ทำ CI ให้หยุด fail ทุกวัน

อาการที่เห็นจากเมล GitHub คือ workflow fail บ่อยจนรบกวน และทำให้ความน่าเชื่อถือของโปรเจกต์ตก ถึงแม้รอบล่าสุด build/test local ผ่านแล้ว แต่ควรทำให้ pipeline ชัดกว่าเดิม

ไฟล์เกี่ยวข้อง:

- `.github/workflows/ci.yml`
- `package.json`

สิ่งที่ควรทำ:

- แยก job เป็น `install`, `lint`, `unit-test`, `build`, `audit`
- ให้ CI upload artifact หรือ log summary เวลาล้ม
- เพิ่ม cache ของ npm
- เพิ่ม `concurrency` เพื่อ cancel run เก่าบน branch เดียวกัน
- เปิด e2e เฉพาะ PR/main หรือ nightly ไม่ต้องทุก push ถ้ากลัวช้า
- เพิ่ม badge สถานะ CI ใน `README.md`

ข้อควรระวัง:

- ตอนนี้ `npm run lint` ยังไม่ควรใส่ CI ทันทีถ้ายังไม่แก้ lint ทั้ง repo เพราะจะทำให้ CI fail แน่นอน
- ควรเริ่มจาก `npx eslint src --max-warnings=0` แล้วค่อยขยาย scope

### 2. แก้ lint debt ก่อนแข่ง

ผล scan ปัจจุบัน:

- `npx eslint src --max-warnings=0` พบ 45 ปัญหา
- 39 errors
- 6 warnings

ประเภทปัญหา:

- unused variables/imports
- React hook dependency
- setState ใน effect ที่ eslint มองว่าเสี่ยง loop/extra render
- manual memoization preservation

ไฟล์ตัวอย่างที่ควรดู:

- `src/pages/InteractiveDashboard.jsx`
- `src/pages/LandingPage.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/community/FarmerForum.jsx`
- `src/components/widgets/LandingBentoCards.jsx`
- `src/components/widgets/FarmerInstitutesV2Widget.jsx`
- `src/services/aiService.js`

ทำไมสำคัญ:

- งานแข่งขันไม่จำเป็นต้องโชว์ lint ให้กรรมการดู แต่ lint ที่พังคือสัญญาณว่าโค้ดมีจุดที่ regression ง่าย
- ถ้าจะเพิ่มฟีเจอร์ใหม่เร็ว ๆ โดย lint ยังรก จะยิ่งเสี่ยงพัง

### 3. แก้ dependency audit

ผล `npm audit --audit-level=moderate` พบ:

- `dompurify <= 3.3.3` moderate
- `postcss < 8.5.10` moderate
- `ws 8.0.0 - 8.20.0` moderate
- `xlsx *` high, ไม่มี fix อัตโนมัติ

สิ่งที่ควรทำ:

- รัน `npm audit fix` สำหรับ dependency ที่มี patch
- ตรวจว่ามีการใช้ `xlsx` ตรงไหนบ้าง
- ถ้าใช้แค่นำเข้า/ส่งออก Excel ให้พิจารณาเปลี่ยนเป็น library ที่ maintenance ดีกว่า
- ถ้าต้องใช้ต่อ ให้ isolate path, validate input, จำกัดขนาดไฟล์, และห้าม parse ไฟล์จาก public โดยตรง

### 4. เอา hardcoded fallback keys ออก

พบ key fallback ในโค้ด:

- `src/supabaseClient.js`
- `netlify/functions/sync-weather.js`
- `netlify/functions/sync-hotspots.js`
- `netlify/functions/ai-proxy.js`

ความเสี่ยง:

- key หลุดใน repo
- environment ผิดแล้วยังยิง production endpoint ได้
- demo/CI อาจใช้ key จริงโดยไม่รู้ตัว

สิ่งที่ควรทำ:

- บังคับอ่านจาก environment เท่านั้น
- ถ้า env ไม่ครบ ให้ fail แบบชัดเจน
- ทำ `.env.example`
- เพิ่ม docs วิธีตั้งค่า env
- rotate key ที่เคย commit ไปแล้ว

### 5. คุม AI proxy ให้ปลอดภัย

ไฟล์:

- `netlify/functions/ai-proxy.js`

จุดเสี่ยง:

- CORS เปิด `*`
- ไม่มี rate limit
- ไม่มี auth/session validation ที่ชัด
- provider/model/body อาจถูก abuse ถ้าหน้าเว็บถูกยิงตรง

สิ่งที่ควรทำ:

- จำกัด origin เป็น domain ที่ใช้งานจริง
- validate provider/model/payload
- จำกัด max tokens, max input length
- เพิ่ม rate limit ต่อ IP/session/user
- log usage แบบไม่เก็บข้อมูลส่วนบุคคลเกินจำเป็น
- แยก key ของ dev/staging/prod

### 6. ทบทวน Supabase RLS ทั้งระบบ

> [!NOTE]
> **สถานะการดำเนินการ:** ได้ดำเนินการ RLS Role Hardening เรียบร้อยแล้ว ผ่านสคริปต์ [rls_role_hardening.sql](../../supabase/rls_role_hardening.sql) เพื่อบังคับใช้นโยบายความปลอดภัยแยกสิทธิ์ `admin`, `editor`, `viewer` และ `guest` ในระดับฐานข้อมูลโดยตรง โดยตารางสำคัญเช่น `profiles`, `budgets`, `personnel` และตารางลงทะเบียนเกษตรกรจะไม่อนุญาตให้แก้ไขหากไม่มีสิทธิ์ของ `editor` หรือ `admin`

พบว่าเดิม `supabase/schema.sql` มีหลายตารางที่เปิด policy แบบ authenticated full access:

- `USING (true)`
- `WITH CHECK (true)`

ตารางที่เสี่ยง เช่น:

- `profiles`
- `personnel`
- `assets`
- `budgets`
- ตารางข้อมูลภายในอื่น ๆ

แม้ระบบ frontend มี role helper ใน `src/contexts/AuthContext.jsx` แต่การคุมสิทธิ์ฝั่ง client อย่างเดียวไม่พอ ต้องบังคับที่ database ด้วย ซึ่งปัญหาได้รับการแก้ไขแล้วผ่านนโยบาย RLS Hardening ที่กล่าวไปข้างต้น

สิ่งที่ควรทำเพิ่มในอนาคต:

- เฝ้าระวังความปลอดภัยและสิทธิ์การอ่านข้อมูลของ column ลับ
- เพิ่ม audit log (ปัจจุบันมี RLS trigger และบันทึก audit logs ของระบบแล้ว)

### 7. ลดไฟล์ใหญ่ที่เสี่ยงแก้ยาก

ไฟล์ที่ใหญ่มาก:

- `src/pages/SmartMap.jsx` ประมาณ 108 KB
- `src/components/widgets/HotspotWidget.jsx` ประมาณ 52 KB
- `src/pages/dataRequests/DataRequests.jsx` ประมาณ 49 KB
- `src/components/widgets/LandingBentoCards.jsx` ประมาณ 47 KB
- `src/pages/admin/Budgets.jsx` ประมาณ 40 KB
- `src/pages/InteractiveDashboard.jsx` ประมาณ 39 KB

ข้อเสนอ:

- แยก hook: data loading, filters, map state, URL state
- แยก presentational components
- แยก constants/config
- แยก utility ที่ test ได้
- เพิ่ม smoke tests ต่อหน้าใหญ่

ผลดี:

- แก้เร็วขึ้น
- regression ลด
- ทำ mobile polish ง่าย
- เพิ่ม feature ใหม่โดยไม่กระทบทั้งหน้า

### 8. เพิ่ม mobile QA สำหรับ Smart Map และหน้าหลัก

เพิ่งแก้ Smart Map เรื่อง touch บนมือถือไปแล้ว แต่ควรมี test ป้องกันกลับมาพัง

สิ่งที่ควรเพิ่ม:

- Playwright mobile smoke สำหรับ `/smart-map`
- กดเปิด/ปิด panel
- กดค้นหา
- กด marker หรือ layer control
- ตรวจว่าไม่มี double toggle
- ตรวจว่า map ไม่กิน event ของ overlay

ควร test viewports:

- iPhone SE
- iPhone 14
- Android mid-size
- tablet แนวตั้ง

### 9. เพิ่มระบบ freshness และ data quality

ตอนนี้ระบบมีข้อมูลหลายชุด แต่กรรมการจะถามทันทีว่า “ข้อมูลสดไหม”, “มาจากไหน”, “น่าเชื่อถือแค่ไหน”

ควรเพิ่ม:

- วันที่ sync ล่าสุด
- แหล่งข้อมูล
- จำนวน records
- จำนวน records ที่พิกัดหาย
- จำนวน duplicates
- จำนวน records stale เกิน X วัน
- data owner
- confidence score

ควรมีหน้าใหม่:

- `/dashboard/data-quality`
- หรือ `/dashboard/governance/data-quality`

### 10. ทำ demo story ให้กรรมการเข้าใจใน 5 นาที

ตอนนี้ระบบมีฟีเจอร์เยอะ แต่ความเยอะต้องถูกเล่าเป็น flow เดียว

flow แนะนำ:

1. เปิดหน้า landing: ระบบบริหารข้อมูลเกษตรจังหวัดนครปฐม
2. เข้า Executive Situation Room: วันนี้จังหวัดมีเรื่องไหนต้องตัดสินใจ
3. คลิกอำเภอหนึ่งใน District 360
4. เปิด Smart Map เห็นพื้นที่, hotspot, weather, กลุ่มเกษตรกร, แปลงใหญ่
5. ใช้ AI Report Builder สรุปรายงานให้ผู้บริหาร
6. เปิด Data Quality เห็นว่าระบบตรวจความสด/ความครบข้อมูล
7. ปิดด้วย Impact Dashboard: ลดเวลาทำรายงาน, รวมข้อมูลหลายหน่วย, สนับสนุนการตัดสินใจ

## หน้าหรือฟังก์ชันที่ควรเพิ่ม

### 1. Executive Situation Room

> [!NOTE]
> **สถานะการดำเนินการ:** ได้พัฒนาและเปิดใช้งานหน้า Executive Situation Room เรียบร้อยแล้วที่เส้นทาง `/dashboard/situation-room` (โค้ด: [SituationRoom.jsx](../../src/pages/SituationRoom.jsx) และสไตล์: [SituationRoom.css](../../src/pages/SituationRoom.css)) โดยแสดงข้อมูลความมั่นคงด้านน้ำ ความมั่นคงด้านการเกษตร สรุปภัยพิบัติ จุดความร้อน และระดับความสำคัญเร่งด่วนรายอำเภออย่างครบถ้วน

เป้าหมาย:

หน้าเดียวสำหรับผู้บริหาร เปิดมาแล้วรู้ทันทีว่า “วันนี้ต้องดูอะไร”

ควรมี:

- สถานการณ์รวมจังหวัด
- alert สำคัญ 3-5 รายการ
- hotspot/weather/PM/rain risk
- progress งบประมาณ
- district ranking
- pending data requests
- recommended actions
- ปุ่มสร้างรายงานผู้บริหาร

เหตุผลที่ควรทำ:

- กรรมการชอบหน้าเดียวที่เล่า value ได้ทันที
- ทำให้ระบบดูเป็น decision support ไม่ใช่แค่ dashboard

URL แนะนำ:

- `/dashboard/situation-room`

### 2. District 360

เป้าหมาย:

คลิกอำเภอเดียวแล้วเห็นภาพครบ

ควรมี:

- จำนวนเกษตรกร
- พืชหลัก
- กลุ่มเกษตรกร
- แปลงใหญ่
- Smart Farmer/YSF
- งบประมาณที่เกี่ยวข้อง
- ปัญหา/ความเสี่ยง
- แผนที่เฉพาะอำเภอ
- ประวัติ update ล่าสุด
- ข้อเสนอแนะจาก AI

URL แนะนำ:

- `/dashboard/districts`
- `/dashboard/districts/:district`

### 3. Data Quality Command Center

เป้าหมาย:

ทำให้ระบบดูน่าเชื่อถือระดับหน่วยงาน

ควรมี:

- คะแนนคุณภาพข้อมูลรวม
- ความสดของแต่ละ dataset
- missing fields
- missing coordinates
- duplicate records
- inconsistent district/subdistrict names
- privacy exposure warnings
- export issue list
- assign owner ให้แก้ข้อมูล

URL แนะนำ:

- `/dashboard/data-quality`

### 4. AI Report Builder

เป้าหมาย:

เปลี่ยนข้อมูลในระบบเป็นรายงานจริงทันที

ควรมี:

- เลือกหัวข้อ
- เลือกช่วงเวลา
- เลือกอำเภอ
- เลือกชนิดรายงาน: ผู้บริหาร, รายงานประชุม, briefing, press note
- สรุปพร้อมตัวเลขอ้างอิง
- export Markdown/PDF/Word
- แสดง source/citation ของตัวเลข

ตัวอย่างรายงาน:

- สถานการณ์เกษตรจังหวัดประจำสัปดาห์
- รายงานความเสี่ยง hotspot และฝน
- สรุปผลการดำเนินงาน Young Smart Farmer
- สรุปคำขอข้อมูลค้างดำเนินการ

URL แนะนำ:

- `/dashboard/reports/ai-builder`

### 5. Impact Dashboard

เป้าหมาย:

ตอบคำถามกรรมการว่า “ระบบนี้สร้างผลลัพธ์อะไร”

ควรมี:

- เวลาก่อนใช้ระบบ vs หลังใช้ระบบ
- จำนวน dataset ที่รวมศูนย์
- จำนวนรายงานที่สร้างได้
- จำนวนคำขอข้อมูลที่ปิดงาน
- ระยะเวลาตอบสนองเฉลี่ย
- จำนวนผู้ใช้งาน/หน่วยงานที่เกี่ยวข้อง
- success stories

URL แนะนำ:

- `/dashboard/impact`

### 6. Early Warning & Alert Center

เป้าหมาย:

ทำให้ระบบ proactive มากขึ้น

ควรมี:

- alert จาก hotspot
- alert ฝน/แล้ง/อากาศ
- alert ศัตรูพืช
- alert งบประมาณล่าช้า
- alert ข้อมูลไม่อัปเดต
- rule builder แบบง่าย
- notification log
- action status: new, acknowledged, resolved

URL แนะนำ:

- `/dashboard/alerts`

### 7. Data Request Workflow v2

ระบบมี `DataRequests.jsx` แล้ว แต่ควรยกระดับเป็น workflow จริง

ควรมี:

- template คำขอข้อมูล
- owner/assignee
- due date
- priority
- attachment
- comment thread
- approval step
- publish/unpublish
- audit trail
- SLA dashboard

ผลดี:

- ใช้เล่าได้ว่าระบบลดงานเอกสารและติดตามงานข้ามฝ่ายได้

### 8. Public Open Data Portal

เป้าหมาย:

แยกข้อมูล public ที่ปลอดภัยออกจาก internal data

ควรมี:

- dataset catalog
- data dictionary
- freshness badge
- download CSV
- API endpoint docs
- privacy note
- license/terms

URL แนะนำ:

- `/open-data`

### 9. Knowledge Base / SOP Assistant

เป้าหมาย:

AI ไม่ตอบแค่ตัวเลขจาก database แต่ตอบวิธีทำงานของเจ้าหน้าที่ได้

ควรมี:

- อัปโหลดเอกสารคู่มือ/SOP/แบบฟอร์ม
- AI ตอบจากเอกสารพร้อมแหล่งอ้างอิง
- ค้นหาเอกสารราชการ
- แนะนำขั้นตอนปฏิบัติงาน

ตัวอย่างคำถาม:

- “ถ้าจะจัดตั้งกลุ่มเกษตรกรต้องใช้เอกสารอะไร”
- “ขั้นตอนอนุมัติคำขอข้อมูลทำยังไง”
- “แบบฟอร์มรายงานแปลงใหญ่ใช้อันไหน”

### 10. Competition Demo Mode

เป้าหมาย:

ให้ demo ไม่พังและเล่าเรื่องได้ต่อเนื่อง

ควรมี:

- route พิเศษ `/demo`
- seeded scenario
- checklist สำหรับกรรมการ
- guided tour
- ปุ่ม reset demo data
- mock fallback ถ้า API ภายนอกล่ม
- ตัวเลข impact ที่เตรียมไว้

ผลดี:

- ลดความเสี่ยงเวลา present
- ทำให้กรรมการเห็นประเด็นครบในเวลาสั้น

## ไอเดียเสริมที่ทำให้ระบบดูเหนือกว่า dashboard ทั่วไป

### 1. Policy Simulation

ตัวอย่าง:

- ถ้าเพิ่มงบให้กลุ่ม YSF 20% พื้นที่เป้าหมายจะครอบคลุมเพิ่มเท่าไร
- ถ้าฝนลดลง 30% อำเภอไหนเสี่ยงสุด
- ถ้าเปลี่ยนพื้นที่ปลูกบางส่วน ผลกระทบต่อมูลค่าผลผลิตเป็นอย่างไร

### 2. GIS Layer Marketplace ภายในจังหวัด

รวม layer เช่น:

- ขอบเขตอำเภอ/ตำบล
- แปลงใหญ่
- hotspot
- rainfall
- soil group
- irrigation area
- farmer groups
- community enterprises

ให้เปิด/ปิด layer และดู metadata ได้

### 3. Provincial Intelligence Brief

ระบบสร้าง brief รายวัน/รายสัปดาห์:

- สถานการณ์เด่น
- ตัวเลขเปลี่ยนแปลง
- ความเสี่ยง
- ข้อเสนอแนะ
- งานค้าง

ใช้ได้ทั้งผู้บริหารและเจ้าหน้าที่

### 4. Data Lineage View

แสดงเส้นทางข้อมูล:

- มาจากแหล่งไหน
- sync เมื่อไร
- transform อะไร
- แสดงที่หน้าไหน
- ใครเป็น owner

เหมาะมากกับงานระดับกรม เพราะแสดง maturity ด้าน governance

### 5. Field Officer Mobile Mode

โหมดสำหรับเจ้าหน้าที่ภาคสนาม:

- check-in พื้นที่
- บันทึกภาพ
- กรอกแบบฟอร์มสั้น
- offline draft
- sync เมื่อมีเน็ต
- ผูกกับแผนที่และอำเภอ

## ปัญหาเชิงเทคนิคที่ควรจัดลำดับแก้

### Security / Governance

ลำดับเร่งด่วน:

1. Rotate keys ที่เคยอยู่ใน repo
2. เอา fallback keys ออกจาก source
3. จำกัด CORS ของ AI proxy
4. เพิ่ม rate limit และ payload validation
5. ปรับ RLS จาก authenticated full access เป็น role-based
6. แยก public views สำหรับข้อมูลที่เปิดเผยได้
7. เพิ่ม audit log ให้การแก้ข้อมูลสำคัญ
8. เพิ่ม privacy classification ต่อ dataset

### Reliability

ลำดับเร่งด่วน:

1. ทำ CI ให้แยก job และมี summary
2. แก้ lint ให้ผ่าน
3. เพิ่ม e2e smoke สำหรับหน้า public/main/dashboard/smart-map
4. เพิ่ม Netlify function health checks
5. เพิ่ม fallback UI เวลา API ภายนอกล่ม
6. เพิ่ม error boundary เฉพาะหน้าใหญ่

### Maintainability

ลำดับเร่งด่วน:

1. หั่น `SmartMap.jsx`
2. หั่น `HotspotWidget.jsx`
3. หั่น `DataRequests.jsx`
4. ย้าย config/constants ออกจาก component ใหญ่
5. เพิ่ม test ให้ utilities ที่แยกออกมา
6. ทำ route-level lazy loading ให้หน้าหนัก

### Performance

สิ่งที่ควรเช็ก:

- bundle size ของ map/chart/dashboard
- lazy load เฉพาะ route
- dynamic import สำหรับ Leaflet/Recharts หนัก ๆ
- virtualized table สำหรับข้อมูลเยอะ
- memoization ของ filters
- cache key ของ React Query
- image optimization บน landing/public pages

### UX / Accessibility

สิ่งที่ควรเพิ่ม:

- mobile-first QA สำหรับ dashboard หลัก
- keyboard navigation
- focus state ที่มองเห็น
- contrast check
- loading skeleton ที่สม่ำเสมอ
- empty state ที่บอก action ถัดไป
- error state ที่ user อ่านแล้วแก้ได้
- breadcrumb ใน dashboard ลึก ๆ
- print/export layout สำหรับรายงาน

## Roadmap แนะนำ

### ก่อนแข่ง 1-2 สัปดาห์

เป้าหมาย: ทำให้ระบบดูชนะและไม่พังบนเวที

ควรทำ:

- แก้ CI fail และ lint หลัก
- แก้ audit ที่แก้ได้ทันที
- เอา fallback keys ออก
- ทำ Executive Situation Room
- ทำ Data Quality Command Center แบบ MVP
- ทำ District 360 แบบ MVP
- ทำ AI Report Builder แบบ MVP
- ทำ Demo Mode หรืออย่างน้อย demo script
- เพิ่ม Playwright smoke สำหรับ flow ที่จะ present
- เตรียม sample data และ screenshots

### หลังแข่งระยะ 1-2 เดือน

เป้าหมาย: ทำให้ใช้งานจริงในหน่วยงานได้มั่นคง

ควรทำ:

- RLS role-based ทั้งระบบ
- Data Request Workflow v2
- Alert Center
- audit log UI
- monitoring dashboard
- e2e CI เต็ม
- refactor ไฟล์ใหญ่
- SOP Assistant

### ระยะยาว 3-6 เดือน

เป้าหมาย: ทำเป็นต้นแบบจังหวัดอื่นหรือระดับกรม

ควรทำ:

- multi-province template
- field officer mobile/PWA
- open data portal
- policy simulation
- GIS layer catalog
- API สำหรับหน่วยงานอื่น
- evaluation framework สำหรับ AI answers
- data lineage และ governance เต็มรูปแบบ

## โครงสร้างหน้าที่แนะนำหลังปรับ

Public:

- `/`
- `/interactive-dashboard`
- `/smart-map`
- `/open-data`
- `/public/...`

Internal:

- `/dashboard`
- `/dashboard/situation-room`
- `/dashboard/districts`
- `/dashboard/districts/:district`
- `/dashboard/data-quality`
- `/dashboard/alerts`
- `/dashboard/reports/ai-builder`
- `/dashboard/impact`
- `/dashboard/data-requests`
- `/dashboard/search`
- `/dashboard/chatbot`
- `/dashboard/admin/...`

Demo:

- `/demo`
- `/demo/judges`
- `/demo/scenario/:id`

## Demo script สำหรับกรรมการ

เวลา 5 นาที:

1. เปิดหน้าแรก บอกโจทย์: ข้อมูลเกษตรกระจัดกระจาย ทำรายงานช้า ตัดสินใจยาก
2. เข้า Situation Room: วันนี้ระบบชี้ 3 ประเด็นเร่งด่วน
3. คลิกอำเภอหนึ่ง: District 360 แสดงข้อมูลครบในหน้าเดียว
4. เปิด Smart Map: เห็นพื้นที่จริง layer และความเสี่ยง
5. ใช้ AI Report Builder: สร้าง brief ผู้บริหารจากข้อมูลจริง
6. เปิด Data Quality: ระบบไม่ได้แค่โชว์ข้อมูล แต่ตรวจคุณภาพและความสด
7. ปิดด้วย Impact: ลดเวลาทำรายงาน, เพิ่มความโปร่งใส, ตัดสินใจเร็วขึ้น

เวลา 10 นาที:

- เพิ่ม workflow คำขอข้อมูล
- เพิ่ม chatbot ถามข้อมูลเชิงลึก
- เพิ่ม public open data
- เพิ่ม governance/security story

## สิ่งที่ควรพูดบนเวที

ข้อความหลัก:

> ระบบนี้ไม่ได้เป็นเพียง dashboard แสดงผล แต่เป็นระบบ intelligence layer สำหรับการบริหารข้อมูลเกษตรจังหวัด ตั้งแต่การรวมข้อมูล ตรวจคุณภาพ วิเคราะห์เชิงพื้นที่ สร้างรายงานด้วย AI และสนับสนุนการตัดสินใจของผู้บริหาร

คำที่ควรย้ำ:

- decision support
- data governance
- real-time/freshness
- AI-assisted reporting
- geospatial intelligence
- public transparency
- field-to-executive workflow
- scalable provincial template

## สิ่งที่ไม่ควรปล่อยไว้ก่อนแข่ง

- CI fail ถี่
- key อยู่ใน source
- lint พังทั้ง repo
- หน้า map มือถือกดแล้วแปลก
- demo ต้องพึ่ง API ภายนอกแบบไม่มี fallback
- ไม่มีตัวเลข impact
- ไม่มีคำตอบเรื่องความปลอดภัยและสิทธิ์ข้อมูล
- AI ตอบโดยไม่มีแหล่งอ้างอิงตัวเลข
- ข้อมูล public/internal ปนกันไม่ชัด

## Checklist ก่อนส่งประกวด

Technical:

- [ ] `npm ci` ผ่าน
- [ ] `npm run build` ผ่าน
- [ ] unit tests ผ่าน
- [ ] lint source ผ่าน
- [ ] audit ที่แก้ได้ถูกแก้แล้ว
- [x] ไม่มี fallback secret ใน source (นำ fallback keys ออกแล้วและบันทึกใน docs/reference/ENVIRONMENT.md)
- [ ] CI บน GitHub ผ่าน
- [ ] smoke test demo flow ผ่าน
- [ ] mobile Smart Map ผ่าน

Product:

- [x] มี Executive Situation Room (พัฒนาที่ /dashboard/situation-room แล้ว)
- [ ] มี District 360
- [ ] มี Data Quality summary
- [x] มี AI Report Builder หรือ demo equivalent (มีระบบ AI Disease Forecast และ AI Chatbot สรุปข้อมูลวิเคราะห์)
- [ ] มี Impact Dashboard
- [ ] มี demo script
- [ ] มี screenshots สำรอง
- [ ] มี mock/fallback data

Governance:

- [x] role/permission matrix ชัด (มี role และ department mapping ชัดเจน)
- [x] public/private data แยกชัด (แยก Landing / Public views และ Protected Dashboard ชัดเจน)
- [x] audit log มีอย่างน้อยสำหรับ action สำคัญ (มีตาราง audit_logs และบันทึกประวัติผ่าน auditLog.js)
- [ ] data source/freshness แสดงชัด
- [ ] privacy note พร้อม

Presentation:

- [ ] opening problem ชัด
- [ ] live demo ไม่เกินเวลา
- [ ] มีตัวเลข before/after
- [ ] มี story ผู้บริหาร
- [ ] มี story เจ้าหน้าที่ภาคสนาม
- [ ] มี story ประชาชน/open data

## ข้อสรุป

ระบบนี้มีฐานที่แข็งมากสำหรับงานแข่งขัน เพราะมีทั้ง dashboard, map, AI, search, public portal, และข้อมูลเกษตรหลายมิติ จุดที่ต้องเร่งไม่ใช่การเพิ่มกราฟอีกหลายหน้า แต่คือทำให้ระบบ “ดูเป็นระบบราชการที่ใช้จริงได้” ผ่าน 4 แกน:

1. ใช้งานจริง: workflow, district view, report builder
2. เชื่อถือได้: CI, tests, audit, freshness, data quality
3. ปลอดภัย: RLS, secret management, role-based access, audit log
4. เล่าเรื่องชนะ: situation room, impact, demo mode

ถ้าต้องเลือกทำน้อยแต่แรงก่อนแข่ง แนะนำทำ 5 อย่างนี้:

1. Executive Situation Room
2. Data Quality Command Center
3. District 360
4. AI Report Builder แบบ MVP
5. CI/security cleanup ให้กรรมการมั่นใจ

ชุดนี้จะทำให้ระบบขยับจาก “เว็บ dashboard ที่มีหลายหน้า” เป็น “แพลตฟอร์ม intelligence สำหรับบริหารเกษตรจังหวัด” ซึ่งเป็น narrative ที่เหมาะกับงานแข่งขันระดับกรมมากกว่า
