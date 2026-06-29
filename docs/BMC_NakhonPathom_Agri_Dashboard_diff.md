# Business Model Canvas (BMC)

## NPT Smart Agri Dashboard

เอกสารฉบับนี้ปรับปรุงจากไฟล์ BMC เดิมให้สอดคล้องกับระบบจริงใน repository `npt_dashboard` โดยอ้างอิงจากโครงสร้าง route, dashboard module, dataset catalog, Supabase schema, Netlify Functions, คู่มือระบบ และเอกสาร reference ภายในโครงการ

> เป้าหมายของ BMC นี้ไม่ใช่การขายซอฟต์แวร์เชิงพาณิชย์เป็นหลัก แต่คือการอธิบาย "โมเดลคุณค่าและการขยายผล" ของศูนย์ข้อมูลเกษตรจังหวัดนครปฐม เพื่อใช้ประกอบการนำเสนอ การประกวด การขอสนับสนุนงบประมาณ และการวางแผนส่งมอบระบบให้หน่วยงานใช้งานจริง

---

## 1. Customer Segments

### 1.1 กลุ่มผู้ใช้หลัก

| กลุ่มผู้ใช้                                       | งานที่ต้องทำ                                                             | Pain Point เดิม                                                      | คุณค่าจากระบบ                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ผู้บริหารจังหวัด / ผู้บริหารสำนักงานเกษตร         | เห็นภาพรวมสถานการณ์เกษตรระดับจังหวัด ตัดสินใจเชิงนโยบาย วางแผนงบประมาณ   | ข้อมูลกระจายหลายฝ่าย ต้องรอรายงานรวม ใช้เวลาประชุมและรวบรวมข้อมูลนาน | ใช้ dashboard, Situation Room, แผนที่ และตัวเลขรวมเพื่อเห็นสถานการณ์เร็วขึ้น                                   |
| หัวหน้ากลุ่มงานและเจ้าหน้าที่สำนักงานเกษตรจังหวัด | ติดตามงานตามภารกิจ จัดการข้อมูลรายตาราง ทำรายงาน                         | ไฟล์ Excel/PDF หลายชุด โครงสร้างข้อมูลไม่สม่ำเสมอ ค้นหายาก           | มี CRUD table, Global Search, dashboard รายกลุ่มงาน และข้อมูลกลางบน Supabase                                   |
| เจ้าหน้าที่เกษตรอำเภอ                             | ตรวจสอบข้อมูลพื้นที่ เกษตรกร แปลง พยากรณ์โรค ศัตรูพืช และงานส่งเสริม     | ต้องส่งไฟล์ซ้ำหลายรอบ ข้อมูลพื้นที่กับตารางแยกกัน                    | เข้าถึงข้อมูลตามสิทธิ์ ใช้แผนที่และตารางร่วมกัน ลดงานประสาน                                                    |
| เจ้าหน้าที่ด้านอารักขาพืช                         | เฝ้าระวังโรค แมลง จุดความร้อน ศูนย์จัดการศัตรูพืช ศูนย์ดินปุ๋ย และหมอพืช | ข้อมูลสถานการณ์เปลี่ยนเร็ว ต้องรวมจากหลายแหล่ง                       | มี AI Disease Forecast, Fire Hotspots, forecast plots, pest centers, soil fertilizer centers และ plant doctors |
| เจ้าหน้าที่ด้านยุทธศาสตร์และสารสนเทศ              | ดูทะเบียนเกษตรกร พื้นที่เกษตร แหล่งเรียนรู้ อากาศ ราคา และตัวชี้วัด      | ข้อมูลหลายแหล่ง ไม่เชื่อมกับ dashboard หรือ GIS                      | มี Strategy module, SmartMap, agricultural areas, farmer registry, daily weather และ prices                    |

### 1.2 กลุ่มผู้ใช้สาธารณะและภาคี

| กลุ่มผู้ใช้                                                       | ความต้องการ                                                   | คุณค่าจากระบบ                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ประชาชนและเกษตรกรทั่วไป                                           | ดูข้อมูลสาธารณะ ข่าว ราคา อากาศ แผนที่ แปลงใหญ่ วิสาหกิจชุมชน | Public Portal, Interactive Dashboard, SmartMap, Landing Chatbot และ public detail pages  |
| วิสาหกิจชุมชน / กลุ่มเกษตรกร / แปลงใหญ่                           | แสดงตัวตนและศักยภาพของกลุ่ม ใช้ข้อมูลประกอบการพัฒนา           | public pages สำหรับ community enterprises, large plots, farmer institutes, smart farmers |
| หน่วยงานภาคี เช่น พาณิชย์จังหวัด อุตสาหกรรมจังหวัด สถาบันการศึกษา | ใช้ข้อมูลประกอบการบูรณาการโครงการและนโยบาย                    | เข้าถึงข้อมูลภาพรวมที่ sanitize แล้ว และขอข้อมูลเพิ่มเติมผ่าน data request workflow      |
| คณะกรรมการประกวด / ผู้ประเมินนวัตกรรม                             | เห็นปัญหา วิธีแก้ ผลกระทบ และความพร้อมของระบบ                 | มี story ชัด: data hub + dashboard + AI + map + security + deployable system             |

### 1.3 กลุ่มผู้ใช้อนาคต

- จังหวัดอื่นที่ต้องการต้นแบบศูนย์ข้อมูลเกษตรระดับจังหวัด
- นักวิจัยและมหาวิทยาลัยที่ต้องการข้อมูลเชิงพื้นที่และข้อมูลรวมที่ไม่เปิดเผย PII
- หน่วยงานกลางที่ต้องการเชื่อมข้อมูลผ่าน API หรือ data sharing agreement
- ผู้ประกอบการ AgriTech ที่ต้องการร่วมพัฒนาเครื่องมือวิเคราะห์หรือพยากรณ์

---

## 2. Value Propositions

### 2.1 คุณค่าหลัก

1. **Single Source of Truth ระดับจังหวัด**
   - รวมข้อมูลจากหลายกลุ่มงานไว้ใน Supabase
   - ครอบคลุมข้อมูลยุทธศาสตร์ การผลิต การพัฒนาเกษตรกร อารักขาพืช และงานบริหาร
   - ลดการส่งต่อไฟล์ซ้ำและลดความเสี่ยงจากข้อมูลหลายเวอร์ชัน

2. **Decision Support สำหรับผู้บริหาร**
   - มี dashboard ภาพรวม, Situation Room, chart, map และ KPI
   - เชื่อมข้อมูลเชิงตารางกับข้อมูลเชิงพื้นที่
   - เห็นแนวโน้มและพื้นที่เสี่ยงได้เร็วกว่า workflow รายงานแบบเดิม

3. **Public Transparency**
   - Public Portal เปิดเผยข้อมูลที่เหมาะสมต่อประชาชน
   - มีหน้า `/interactive-dashboard`, `/smart-map`, และ `/public/*`
   - ข้อมูลส่วนบุคคลถูกจำกัดผ่านแนวคิด public select columns, RLS และ endpoint ที่ sanitize ข้อมูล

4. **AI-Assisted Work**
   - Internal AI Chatbot ช่วยถามตอบจากข้อมูลฐานจริง
   - Landing Chatbot ช่วยผู้ใช้สาธารณะค้นหาเมนูและข้อมูลทั่วไป
   - AI Disease Forecast ช่วยประเมินความเสี่ยงโรคและแมลงจากข้อมูลแปลงและสภาพแวดล้อม

5. **Operational Efficiency**
   - CRUD table ช่วยให้เจ้าหน้าที่จัดการข้อมูลได้ในระบบเดียว
   - Global Search ค้นหาข้ามตาราง
   - Data Request workflow ช่วยรวบรวมคำขอข้อมูลและการตอบกลับอย่างเป็นระบบ

### 2.2 จุดต่างจาก dashboard ทั่วไป

- **เชื่อม public + internal ใน codebase เดียว**: หน้า public เปิดข้อมูลภาพรวม ส่วน `/dashboard/*` ป้องกันด้วย `ProtectedRoute`
- **จัดกลุ่มตามภารกิจสำนักงานเกษตร**: Admin, Strategy, Production, Development, Protection
- **มี GIS และ external feeds**: Leaflet, GeoJSON, Open-Meteo, GISTDA, MOC, RSS/WordPress proxy
- **มี security layer หลายชั้น**: Supabase Auth, role/department, AdminRoute, DataRequestRoute, RLS hardening, Netlify proxy
- **พร้อมนำเสนอและขยายผล**: มีคู่มือ `docs/manual`, architecture docs, test suite, Netlify deployment config

### 2.3 คุณค่าเชิงผลกระทบ

- ลดเวลารวบรวมข้อมูลเพื่อทำรายงาน
- ลดความคลาดเคลื่อนจากการคัดลอกไฟล์หลายชุด
- เพิ่มความโปร่งใสในการเผยแพร่ข้อมูลสาธารณะ
- เพิ่มความพร้อมในการรับมือโรคพืช ภัยพิบัติ จุดความร้อน และสถานการณ์ราคาสินค้าเกษตร
- สร้างต้นแบบที่จังหวัดอื่นสามารถศึกษาและปรับใช้ได้

---

## 3. Channels

### 3.1 ช่องทางหลักที่ระบบมีแล้ว

| Channel               | Route / Component                                                                         | กลุ่มเป้าหมาย               | บทบาท                              |
| --------------------- | ----------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------- |
| Landing Page          | `/`, `LandingPage.jsx`                                                                    | ประชาชน ภาคี ผู้ประเมิน     | ประตูแรกของระบบ สรุปข้อมูลและนำทาง |
| Interactive Dashboard | `/interactive-dashboard`                                                                  | ประชาชน ผู้บริหาร ภาคี      | Dashboard สาธารณะเชิงโต้ตอบ        |
| SmartMap              | `/smart-map`                                                                              | ประชาชน เจ้าหน้าที่         | แผนที่และข้อมูลเชิงพื้นที่         |
| Public Detail Pages   | `/public/large-plots`, `/public/community-enterprises`, `/public/agricultural-areas`, ฯลฯ | ประชาชน ภาคี                | เปิดข้อมูลเฉพาะเรื่อง              |
| Internal Dashboard    | `/dashboard/*`                                                                            | เจ้าหน้าที่ ผู้บริหาร       | ระบบภายในหลัง login                |
| Manual Portal         | `/manual`, `/manual/:slug`                                                                | ผู้ดูแลระบบ เจ้าหน้าที่ใหม่ | คู่มือใช้งานและสร้างระบบ           |
| AI Chatbot            | `/dashboard/chatbot` และ Landing Chatbot                                                  | เจ้าหน้าที่ / ผู้ใช้ public | ถามตอบ ค้นหา แนะนำข้อมูล           |

### 3.2 ช่องทางสนับสนุน

- Netlify Functions เป็น API gateway/proxy สำหรับบริการภายนอก
- LINE Webhook และ LINE AI Chatbot ใน `netlify/functions/line-webhook*.cjs` สำหรับต่อยอดช่องทางสนทนา
- RSS/WordPress proxies สำหรับข่าวจาก DOAE, ESC, AgriTec, ICTC และแหล่งข่าวเกษตร
- เอกสารคู่มือใน `docs/manual` สำหรับอบรมและส่งมอบระบบ
- GitHub/CI และ Playwright/Vitest สำหรับตรวจสอบคุณภาพก่อน deploy

### 3.3 ช่องทางอนาคต

- LINE OA เป็นช่องทางถามตอบและแจ้งเตือน
- API สำหรับ data sharing กับหน่วยงานภาคี
- Mobile-friendly public portal สำหรับเกษตรกรในพื้นที่
- Kiosk หรือจอ dashboard ในสำนักงาน/ศูนย์บริการ
- Export รายงาน PDF/CSV สำหรับประชุมและสื่อสารผู้บริหาร

---

## 4. Customer Relationships

### 4.1 รูปแบบความสัมพันธ์

| รูปแบบ                 | สิ่งที่ระบบรองรับ                                     | ความหมายเชิงปฏิบัติ                                       |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Self-service           | public portal, dashboard, search, manual              | ผู้ใช้ค้นหาและเรียนรู้เองได้                              |
| Assisted service       | chatbot, manual, data request workflow                | เจ้าหน้าที่มีตัวช่วยตอบคำถามและรับคำขอข้อมูล              |
| Role-based service     | role: admin/editor/viewer/guest, department filtering | ผู้ใช้เห็นเมนูและข้อมูลตามสิทธิ์                          |
| Continuous improvement | website evaluations, audit logs, recent activities    | เก็บ feedback และตรวจสอบการเปลี่ยนแปลง                    |
| Trust relationship     | RLS, public data sanitization, secrets isolation      | สร้างความเชื่อมั่นว่าข้อมูลอ่อนไหวไม่ถูกเปิดเผยผิดช่องทาง |

### 4.2 Onboarding และ adoption

- อบรมผู้ดูแลระบบก่อน: Admin, editor, viewer, data owner
- แยกคู่มือเป็นบท: ภาพรวม, รวบรวมข้อมูล, ทำความสะอาดข้อมูล, Supabase, install, dashboard/search/AI, security/deploy, operations
- เริ่มจากกลุ่มงานที่ข้อมูลพร้อม เช่น แปลงใหญ่ GAP วิสาหกิจชุมชน Smart Farmer และอารักขาพืช
- ใช้ public pages เป็นแรงจูงใจให้เจ้าของข้อมูลเห็นประโยชน์จากการอัปเดตข้อมูล

### 4.3 กลไกรักษาความสัมพันธ์ระยะยาว

- ตั้งรอบตรวจสอบข้อมูลรายเดือนหรือรายไตรมาส
- ใช้ audit log ตรวจการแก้ไขข้อมูลสำคัญ
- ใช้ website evaluation เก็บ feedback จากผู้ใช้
- ใช้ release note หรือ manual update เมื่อมี feature ใหม่
- ใช้ dashboard performance/KPI เพื่อรายงานผลต่อผู้บริหาร

---

## 5. Revenue Streams / Value Capture

ระบบนี้เหมาะกับโมเดล "value capture ภาครัฐ" มากกว่า revenue stream ตรงแบบเอกชน รายได้หลักจึงควรตีความเป็นงบประมาณที่ประหยัดได้ มูลค่าการตัดสินใจที่ดีขึ้น และโอกาสขยายผล

### 5.1 คุณค่าทางตรงในหน่วยงาน

- ลดเวลาการรวมรายงานจากหลายไฟล์
- ลดค่าใช้จ่ายแฝงจากงานซ้ำ เช่น คัดลอกข้อมูล ตรวจไฟล์หลายเวอร์ชัน ประสานงานรายอำเภอ
- เพิ่มความแม่นยำของข้อมูลประกอบการประชุมและตัดสินใจ
- ลดความเสี่ยงจากข้อมูลส่วนบุคคลรั่วไหลด้วย policy และ data sanitization

### 5.2 แหล่งงบประมาณที่เหมาะสม

| แหล่งสนับสนุน                                      | เหตุผล                                                |
| -------------------------------------------------- | ----------------------------------------------------- |
| งบพัฒนาระบบสารสนเทศของจังหวัด/สำนักงาน             | ระบบเป็น infrastructure ข้อมูลของหน่วยงาน             |
| งบโครงการนวัตกรรมภาครัฐ / Digital Government       | มี data hub, dashboard, AI, map, security             |
| งบส่งเสริมเกษตรอัจฉริยะ / BCG / Climate adaptation | ใช้ข้อมูลสภาพอากาศ โรคพืช จุดความร้อน และพื้นที่เกษตร |
| ความร่วมมือมหาวิทยาลัย                             | ต่อยอด analytics, GIS, AI forecast                    |
| ความร่วมมือหน่วยงานกลาง                            | เชื่อมข้อมูลมาตรฐานและขยายผลระดับจังหวัดอื่น          |

### 5.3 Revenue stream อนาคต ถ้าขยายเป็น platform

- ค่าบริการปรับใช้/อบรมสำหรับจังหวัดอื่น
- ค่าบริการ maintenance และ data operation
- API/data service สำหรับข้อมูล aggregate ที่ผ่านการ anonymize
- template dashboard สำหรับสำนักงานเกษตรจังหวัดอื่น
- consulting package ด้าน data governance และ dashboard implementation

### 5.4 ตัวชี้วัดมูลค่า

- ชั่วโมงทำงานที่ลดลงต่อรอบรายงาน
- จำนวนไฟล์ Excel/PDF ที่ถูกแทนด้วยฐานข้อมูลกลาง
- จำนวนผู้ใช้ภายในที่ใช้งานประจำ
- จำนวนหน้า public ที่มีข้อมูลพร้อมเผยแพร่
- จำนวนการค้นหา/ถามตอบผ่าน search และ chatbot
- จำนวนเคสตัดสินใจ/แจ้งเตือนที่อ้างอิงข้อมูลจากระบบ

---

## 6. Key Resources

### 6.1 Digital assets

| Resource        | รายละเอียดในระบบ                                                            |
| --------------- | --------------------------------------------------------------------------- |
| Frontend app    | React 19, Vite 7, React Router 7, Ant Design 6                              |
| Data platform   | Supabase Auth, Database, RPC, RLS policies                                  |
| Visualization   | ECharts, Leaflet, React-Leaflet, dashboard widgets                          |
| AI layer        | AI proxy, Gemini/OpenRouter integration, chatbot data service               |
| Proxy/API layer | Netlify Functions สำหรับ weather, AQI, news, prices, hotspots, LINE webhook |
| Public GIS      | `public/nakhon_pathom.geojson`, soil series GeoJSON                         |
| Documentation   | `docs/manual`, `docs/reference`, roadmap/spec/plans                         |
| Tests           | Vitest unit tests และ Playwright e2e tests                                  |

### 6.2 Data assets

ข้อมูลที่ระบบรองรับจริงแบ่งเป็น 5 กลุ่มหลัก:

1. **ยุทธศาสตร์และสารสนเทศ**
   - `farmer_registry`
   - `agricultural_areas`
   - `learning_centers`
   - `daily_weather`
   - `parcel_drawing_progress`

2. **ส่งเสริมและพัฒนาการผลิต**
   - `large_plots`
   - `certifications`
   - `crop_production`

3. **ส่งเสริมและพัฒนาเกษตรกร**
   - `community_enterprises`
   - `smart_farmer_sf`
   - `young_smart_farmer_ysf`
   - `agricultural_career_groups`
   - `housewife_farmer_groups`
   - `young_farmer_groups_detailed`
   - `farmer_institutes`
   - `agri_tourism`
   - `disasters`

4. **อารักขาพืช**
   - `forecast_plots`
   - `ai_disease_forecasts`
   - `pest_centers`
   - `plant_doctors`
   - `soil_fertilizer_centers`
   - `soil_series`
   - `fire_hotspots`

5. **บริหารทั่วไป**
   - `profiles`
   - `personnel`
   - `assets`
   - `budgets`
   - `audit_logs`
   - `data_requests`
   - `website_evaluations`

### 6.3 Human resources

- Project owner / product owner ฝั่งสำนักงานเกษตรจังหวัด
- Data owners ประจำกลุ่มงาน
- Admin ผู้ดูแลผู้ใช้ สิทธิ์ และข้อมูลระบบ
- Developer/maintainer สำหรับ frontend, Netlify Functions, Supabase schema
- Domain experts ด้านพืช อารักขาพืช GIS และข้อมูลเกษตร
- Trainer/support สำหรับอบรมและรับ feedback ผู้ใช้

---

## 7. Key Activities

### 7.1 งานสร้างและดูแลข้อมูล

- สำรวจแหล่งข้อมูลจากทุกกลุ่มงาน
- ทำความสะอาดข้อมูลและกำหนด schema
- import/seed ข้อมูลผ่าน scripts ใน `scripts/` และ SQL migrations ใน `supabase/`
- ตรวจคุณภาพข้อมูลก่อนเผยแพร่ public
- ตั้งเจ้าของข้อมูลและรอบอัปเดต

### 7.2 งานระบบและ feature

- พัฒนา dashboard, public views, CRUD table, map, widgets
- เชื่อม external API ผ่าน Netlify Functions
- ปรับ Global Search และ AI Chatbot ให้ตอบจากข้อมูลจริง
- เพิ่ม PDF/CSV export และรายงานประกอบการประชุม
- ดูแล performance, cache, responsive UI และ accessibility

### 7.3 งาน security และ governance

- ตั้ง Supabase Auth, profiles, role, department
- ใช้ `ProtectedRoute`, `AdminRoute`, `DataRequestRoute`, `NonGuestRoute`
- ตรวจ RLS, public column privacy, anon column privacy
- แยก secrets ไป Netlify/GitHub environment
- audit log การแก้ไขข้อมูลสำคัญ
- ปรับ policy สำหรับข้อมูล public/internal/PII

### 7.4 งาน operation

- deploy ผ่าน Netlify
- monitor build/test/e2e
- สำรองข้อมูล Supabase
- ตรวจ endpoint/proxy ที่เรียกบริการภายนอก
- จัดอบรมผู้ใช้และทำคู่มือ
- เก็บ feedback และจัดรอบปรับปรุง

---

## 8. Key Partners

### 8.1 หน่วยงานข้อมูลหลัก

| Partner                                   | บทบาท                                                |
| ----------------------------------------- | ---------------------------------------------------- |
| สำนักงานเกษตรจังหวัดนครปฐม                | เจ้าของระบบ เจ้าของข้อมูลหลัก และผู้ใช้ภายใน         |
| สำนักงานเกษตรอำเภอ                        | ส่งข้อมูลพื้นที่ ตรวจสอบข้อมูลรายอำเภอ ใช้งานภาคสนาม |
| กรมส่งเสริมการเกษตร                       | กรอบภารกิจ มาตรฐานข้อมูล ข่าวสาร และระบบส่วนกลาง     |
| GISTDA                                    | จุดความร้อน/ข้อมูลดาวเทียม                           |
| กรมอุตุนิยมวิทยา / Open-Meteo / Meteostat | สภาพอากาศและฝน                                       |
| กระทรวงพาณิชย์ (MOC)                      | ราคาสินค้าเกษตร                                      |
| กรมชลประทาน / แหล่งข้อมูลน้ำ              | ข้อมูลอ่างเก็บน้ำ/เขื่อน                             |
| พัฒนาที่ดิน                               | ชุดดินและข้อมูลดิน                                   |

### 8.2 ภาคีท้องถิ่น

- วิสาหกิจชุมชน กลุ่มแปลงใหญ่ กลุ่มแม่บ้านเกษตรกร ยุวเกษตรกร
- ศูนย์เรียนรู้การเพิ่มประสิทธิภาพการผลิตสินค้าเกษตร
- ศูนย์จัดการศัตรูพืชชุมชนและศูนย์จัดการดินปุ๋ยชุมชน
- มหาวิทยาลัยและสถาบันวิจัยในพื้นที่
- หน่วยงานจังหวัดที่ใช้ข้อมูลร่วม เช่น พาณิชย์จังหวัด อุตสาหกรรมจังหวัด ปภ. และองค์กรปกครองส่วนท้องถิ่น

### 8.3 Technology partners

- Supabase สำหรับ auth/database/RLS
- Netlify สำหรับ hosting และ serverless functions
- Open-source ecosystem: React, Vite, ECharts, Leaflet, Playwright, Vitest
- AI providers ผ่าน proxy เพื่อให้ควบคุม key, payload และ provider ได้

### 8.4 รูปแบบความร่วมมือ

- Data sharing agreement
- MOU ด้านข้อมูลและงานวิจัย
- Joint development สำหรับ AI/GIS
- Training partnership
- Open-source template หรือ reference implementation สำหรับจังหวัดอื่น

---

## 9. Cost Structure

### 9.1 ต้นทุนพัฒนาเริ่มต้น

| รายการ                          | รายละเอียด                                                    |
| ------------------------------- | ------------------------------------------------------------- |
| วิเคราะห์ข้อมูลและออกแบบ schema | mapping ตาราง, privacy policy, data owner                     |
| Frontend development            | public portal, internal dashboard, CRUD, search, chatbot, map |
| Backend/serverless              | Netlify Functions, proxy, LINE webhook, sync functions        |
| Supabase setup                  | schema, RLS, RPC, migrations, seed/import                     |
| Data cleaning/import            | Excel/CSV/GIS/raw data processing                             |
| Testing/QA                      | unit, integration, e2e, build verification                    |
| Documentation/training          | manual, architecture docs, user onboarding                    |

### 9.2 ต้นทุนดำเนินงานประจำ

| รายการ                       | ความถี่         | หมายเหตุ                         |
| ---------------------------- | --------------- | -------------------------------- |
| Hosting และ serverless usage | รายเดือน        | Netlify plan และ bandwidth       |
| Supabase database/storage    | รายเดือน        | ตามปริมาณข้อมูลและผู้ใช้         |
| AI provider/API usage        | ตามการใช้งาน    | chatbot, forecast, summarization |
| Data maintenance             | รายเดือน/ไตรมาส | อัปเดตข้อมูลรายตาราง             |
| Security review              | รายไตรมาส       | RLS, secrets, dependency audit   |
| Training/support             | รายรอบ          | onboarding เจ้าหน้าที่ใหม่       |
| Backup/monitoring            | ต่อเนื่อง       | ลดความเสี่ยงข้อมูลสูญหาย         |

### 9.3 ต้นทุนแฝงและความเสี่ยงต้นทุน

- ข้อมูลต้นทางไม่สม่ำเสมอ ทำให้เสียเวลาทำความสะอาด
- API ภายนอกเปลี่ยน format หรือจำกัด rate
- เจ้าของข้อมูลไม่อัปเดตตามรอบ
- ค่าใช้จ่าย AI เพิ่มตามจำนวนผู้ใช้และจำนวนคำถาม
- ค่า maintenance เพิ่มเมื่อจำนวน module และจังหวัดที่ใช้เพิ่มขึ้น

### 9.4 กลยุทธ์คุมต้นทุน

- ใช้ open-source stack เป็นหลัก
- ใช้ cache ผ่าน TanStack React Query และ browser cache
- ใช้ Netlify proxy เฉพาะ API ที่ต้องซ่อน key หรือแก้ CORS
- ทำ public data เป็น aggregated/sanitized เพื่อลดความเสี่ยง
- แยก data owner ต่อ dataset เพื่อลดภาระทีมกลาง
- ใช้ test automation เพื่อลดค่า regression หลังเพิ่ม feature

---

## SWOT Analysis

### Strengths

- มีระบบจริง ไม่ใช่แค่ mockup: React app, Supabase, Netlify Functions, tests, docs
- ครอบคลุมทั้ง public portal และ internal dashboard
- โครงสร้างข้อมูลแยกตามภารกิจเกษตรจังหวัดชัดเจน
- มี AI, search, GIS, dashboard, CRUD และ security อยู่ในแพลตฟอร์มเดียว
- มีเอกสารคู่มือและ architecture รองรับการส่งมอบ/ขยายผล

### Weaknesses

- ข้อมูลบางตารางยังว่างหรือเป็น seed/sample
- Logic aggregation บางส่วนรวมอยู่ใน hook/service กลาง อาจซับซ้อนเมื่อขยายระบบ
- คุณภาพข้อมูลขึ้นกับเจ้าของข้อมูลแต่ละกลุ่มงาน
- API ภายนอกบางตัวเป็น best-effort และอาจล่มหรือเปลี่ยน response
- ต้องตรวจ RLS ฝั่ง Supabase ให้ครบ ไม่พึ่ง UI route guard อย่างเดียว

### Opportunities

- ขยายเป็นต้นแบบ dashboard เกษตรจังหวัดอื่น
- เชื่อม LINE OA เพื่อให้เจ้าหน้าที่และเกษตรกรเข้าถึงง่ายขึ้น
- ต่อยอด AI forecast และ early warning
- ทำ data governance model สำหรับข้อมูลเกษตรระดับจังหวัด
- ใช้ข้อมูลรวมเพื่อสนับสนุนนโยบาย climate resilience, BCG, smart agriculture

### Threats

- ความเสี่ยง PDPA และข้อมูลส่วนบุคคลหาก public policy ไม่ชัด
- ค่าใช้จ่าย API/AI เพิ่มเมื่อ adoption สูง
- dependency หรือ package security issue เช่น library อ่าน spreadsheet
- ความเปลี่ยนแปลงของแหล่งข้อมูลราชการ/API ภายนอก
- บุคลากรผู้ดูแลระบบเปลี่ยน ทำให้ knowledge หายถ้าเอกสารไม่ถูกอัปเดต

---

## KPIs

### Adoption

| KPI                                              | เป้าหมายระยะ 6-12 เดือน |
| ------------------------------------------------ | ----------------------- |
| ผู้ใช้ภายในที่ login ใช้งานอย่างน้อยเดือนละครั้ง | 80% ของผู้เกี่ยวข้อง    |
| กลุ่มงานที่มี data owner ชัดเจน                  | 5 กลุ่มงานหลัก          |
| ตารางสำคัญที่มีข้อมูลพร้อมใช้งาน                 | อย่างน้อย 20 ตาราง      |
| หน้า public ที่เผยแพร่ข้อมูลจริง                 | อย่างน้อย 10 หน้า       |
| จำนวนคู่มือ/บทอบรมที่ใช้งานจริง                  | 8 บทหลัก                |

### Data Quality

| KPI                                            | เป้าหมาย                 |
| ---------------------------------------------- | ------------------------ |
| ตารางที่ระบุ owner และรอบอัปเดต                | 100% ของตาราง production |
| ข้อมูล public ผ่าน privacy checklist           | 100% ก่อนเผยแพร่         |
| จำนวน field PII ที่ถูกซ่อนจาก guest/AI context | ตรวจครบตาม policy        |
| ความสมบูรณ์ข้อมูล key datasets                 | มากกว่า 90%              |

### Performance & Reliability

| KPI                             | เป้าหมาย                        |
| ------------------------------- | ------------------------------- |
| `npm run build`                 | ผ่านทุก release                 |
| unit/e2e critical path          | ผ่านก่อน deploy                 |
| dashboard load time             | ต่ำกว่า 3 วินาทีในเครือข่ายปกติ |
| uptime public portal            | มากกว่า 99%                     |
| external proxy failure handling | มี fallback/error state         |

### Impact

| KPI                                    | เป้าหมาย                |
| -------------------------------------- | ----------------------- |
| เวลารวบรวมรายงานผู้บริหาร              | ลดลง 50-70%             |
| จำนวนคำถามที่ตอบได้ผ่าน search/chatbot | เพิ่มต่อเนื่องรายเดือน  |
| จำนวนเคสตัดสินใจที่ใช้ dashboard       | อย่างน้อย 1-2 เคส/เดือน |
| feedback satisfaction                  | มากกว่า 4/5             |

---

## Roadmap

### ระยะสั้น: 0-3 เดือน

- แก้ encoding เอกสารและข้อมูลภาษาไทยให้เป็น UTF-8 สม่ำเสมอ
- ตรวจตาราง public/internal/PII ทุก dataset
- ทำ dashboard demo story สำหรับผู้บริหารและเวทีประกวด
- เติมข้อมูล sample ที่ยังว่างในตารางสำคัญ เช่น crop production, disasters, data requests
- ตรวจ `npm run build`, `npm run test`, และ Playwright e2e
- ปรับ manual ให้ตรงกับระบบล่าสุด

### ระยะกลาง: 3-12 เดือน

- ตั้ง data owner และรอบอัปเดตทุกกลุ่มงาน
- เพิ่ม export PDF/CSV สำหรับรายงานประชุม
- เพิ่ม alert/notification สำหรับ disease forecast, hotspots, weather risk
- เชื่อม LINE OA workflow ให้ใช้งานจริง
- แยก service/aggregation ที่ซับซ้อนออกเป็น module ตาม domain
- ทำ dashboard usage analytics และ feedback loop

### ระยะยาว: 12-36 เดือน

- ทำ template สำหรับขยายผลไปจังหวัดอื่น
- ออกแบบ API/data sharing layer สำหรับหน่วยงานภาคี
- พัฒนา predictive analytics เพิ่มเติมจาก historical data
- สร้าง governance handbook สำหรับศูนย์ข้อมูลเกษตรจังหวัด
- ขยายสู่ regional/national agriculture data platform ถ้าหน่วยงานกลางสนับสนุน

---

## Critical Success Factors

1. ผู้บริหารสนับสนุนให้ใช้ระบบเป็นแหล่งข้อมูลกลางจริง
2. ทุกกลุ่มงานมีเจ้าของข้อมูลและรอบอัปเดตชัดเจน
3. ข้อมูล public/internal/PII ถูกแยกก่อนเปิดใช้งานจริง
4. ระบบผ่าน build/test/e2e ก่อน deploy
5. คู่มือและการอบรมทำให้เจ้าหน้าที่ใช้งานเองได้
6. Dashboard ตอบคำถามผู้บริหารได้ภายในเวลาใช้งานจริง ไม่ใช่แค่สวย
7. AI ตอบจากข้อมูลที่ตรวจสอบได้ และไม่เปิดเผยข้อมูลอ่อนไหว

---

## Executive Summary

NPT Smart Agri Dashboard คือแพลตฟอร์มศูนย์ข้อมูลเกษตรจังหวัดนครปฐมที่รวมข้อมูลกระจัดกระจายจากหลายกลุ่มงานให้อยู่ในระบบเดียว แสดงผลผ่าน public portal, internal dashboard, interactive map, chart, search และ AI assistant ระบบตอบโจทย์ทั้งประชาชน เจ้าหน้าที่ และผู้บริหาร โดยเน้น 3 คุณค่าหลัก: ลดภาระงานข้อมูล, เพิ่มความเร็วในการตัดสินใจ, และเผยแพร่ข้อมูลสาธารณะอย่างปลอดภัย

Business Model ที่เหมาะสมคือ public-sector value model: ใช้งบประมาณพัฒนาระบบกลางเพื่อสร้างผลลัพธ์เชิงประสิทธิภาพ ความโปร่งใส และความพร้อมด้านข้อมูล มากกว่าการหารายได้เชิงพาณิชย์โดยตรง เมื่อระบบนิ่งและ governance ชัด สามารถขยายผลเป็น template สำหรับจังหวัดอื่น API สำหรับภาคี และฐานข้อมูลสนับสนุน smart agriculture ระดับพื้นที่ได้

---

_ปรับปรุงล่าสุด: 29 มิถุนายน 2569_
_ผู้จัดทำ: ทีมพัฒนา NPT Smart Agri Dashboard_
