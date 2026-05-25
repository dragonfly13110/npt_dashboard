# Prompt สร้างภาพ Infographic สำหรับพรีเซนต์ NPT Smart Agri Dashboard

เอกสารนี้เป็นชุด prompt สำหรับสร้างภาพ infographic แนวตั้ง จำนวน 5 ภาพ ใช้เล่าเรื่องระบบ NPT Smart Agri Dashboard ตั้งแต่ที่มาที่ไป สถาปัตยกรรมระบบ โมดูลงาน ฟังก์ชันสำคัญ และประโยชน์ของงาน

> แนะนำขนาดภาพ: แนวตั้ง 9:16 หรือ 1080 x 1920 px  
> สไตล์รวมทั้งชุด: modern government tech infographic, smart agriculture, clean data dashboard, Thai provincial agriculture, professional presentation  
> หมายเหตุ: เครื่องมือสร้างภาพมักทำตัวอักษรไทยเพี้ยน ถ้าต้องการความคมชัดระดับพรีเซนต์ ให้สร้างภาพแบบมีพื้นที่ว่างสำหรับหัวข้อ แล้วใส่ข้อความจริงใน PowerPoint / Canva ภายหลัง

## Global Style Prompt ใช้ร่วมกันทั้ง 5 ภาพ

ใช้ style นี้นำหน้าหรือท้าย prompt ทุกภาพเพื่อให้ภาพทั้งชุดไปในทิศทางเดียวกัน:

```text
vertical 9:16 infographic, modern Thai smart agriculture data platform, clean professional government presentation design, premium dashboard visual language, soft daylight, white and light gray background, accent colors emerald green, rice gold, sky blue, and deep navy, subtle agricultural textures, rice field pattern, map contour lines, clean vector illustration mixed with realistic dashboard mockup, crisp icons, thin connecting lines, balanced whitespace, high readability, no clutter, executive presentation quality, high resolution, sharp details, consistent visual system across a 5-slide infographic series
```

Negative prompt ใช้ร่วมกัน:

```text
no messy layout, no random unreadable text, no distorted Thai letters, no fake official logos, no dark cyberpunk style, no excessive neon, no cartoon mascot, no overloaded charts, no tiny text, no low resolution, no stock photo collage, no exaggerated futuristic sci-fi, no inaccurate map of Thailand, no watermark
```

---

## ภาพที่ 1: ที่มาที่ไปของระบบ

### ชื่อภาพ

จากข้อมูลเกษตรที่กระจัดกระจาย สู่ศูนย์ข้อมูลกลางจังหวัดนครปฐม

### เป้าหมายภาพ

เล่า pain point ก่อนมีระบบ: ข้อมูลอยู่หลายไฟล์ หลายกลุ่มงาน หลายแหล่ง ทำให้ค้นหา สรุป และตัดสินใจช้า แล้วค่อยเปลี่ยนภาพไปสู่ระบบกลาง NPT Smart Agri Dashboard

### Prompt

```text
Create a vertical 9:16 infographic for a Thai government agriculture presentation titled "จากข้อมูลกระจัดกระจาย สู่ศูนย์ข้อมูลกลางเกษตรนครปฐม".

Scene composition:
The infographic should show a clear before-to-after transformation from top to bottom.

Top section: "ก่อนมีระบบ"
Visualize scattered agricultural information across many disconnected sources:
- Excel sheets, Google Sheet-like grids, PDF reports, paper folders, local officer notebooks, isolated databases
- small icons for farmer registry, agricultural land, large plots, GAP certification, community enterprises, Smart Farmer, learning centers, disaster data, fire hotspots, weather, AQI, agri prices, news
- each data source is floating separately with broken dotted lines
- officers are manually collecting reports, comparing files, making pivot tables, and preparing charts
- visual mood: slightly busy but still professional, not chaotic

Middle section:
A funnel or data pipeline labeled conceptually as "รวบรวม / ตรวจสอบ / จัดระเบียบ / เชื่อมโยงข้อมูล"
Show data streams flowing into one central hub.
Use icons for cleaning data, standardizing fields, role-based access, map coordinates, dashboard metrics, AI context.

Bottom section: "หลังมีระบบ"
Visualize one clean central web dashboard named "NPT Smart Agri Dashboard".
Show a large tablet or desktop dashboard with:
- province map of Nakhon Pathom style outline
- KPI cards
- charts
- table
- map pin layer
- AI assistant chat bubble
- public portal and internal dashboard as two connected doors

Key visual story:
Data scattered in many places becomes one trusted provincial agriculture data center.
Make the central dashboard feel reliable, official, and practical for real government work.

Design details:
Use modern clean vector infographic style, Thai smart agriculture theme, rice field and canal motifs, soft green and gold accents, white background, deep navy headings.
Use clear section separation: Before, Data Integration, After.
Keep text areas large and readable. Use minimal Thai labels only, or leave blank text bands for later editing.

Include visual keywords:
Nakhon Pathom agriculture, provincial data center, dashboard, map, farmers, officers, database, AI assistant, public portal, internal dashboard, agriculture operations.

Aspect ratio 9:16, high resolution, presentation-ready, clean executive infographic.
```

### ข้อความแนะนำสำหรับวางทับในสไลด์

- หัวข้อใหญ่: `ที่มาของระบบ`
- ข้อความสั้น: `รวมข้อมูลเกษตรจังหวัดที่เคยกระจายอยู่หลายไฟล์ หลายกลุ่มงาน และหลายแหล่งข้อมูล ให้กลายเป็นศูนย์กลางเดียว`
- จุดเน้น 3 ข้อ:
  - `ลดเวลารวบรวมรายงาน`
  - `ค้นหาข้อมูลข้ามหมวดได้เร็วขึ้น`
  - `เห็นภาพรวมจังหวัดจาก Dashboard / Map / AI`

---

## ภาพที่ 2: ระบบและเทคโนโลยีที่ใช้

### ชื่อภาพ

สถาปัตยกรรม NPT Smart Agri Dashboard

### เป้าหมายภาพ

อธิบายว่าเว็บแอปนี้ทำงานอย่างไร ตั้งแต่ผู้ใช้ Frontend, Auth, Cache, Service Layer, Supabase, AI Proxy, External APIs และ Netlify Deployment

### Prompt

```text
Create a vertical 9:16 system architecture infographic for "NPT Smart Agri Dashboard", a smart agriculture data platform for Nakhon Pathom province.

Layout:
Use a clean layered architecture diagram from top to bottom with connected modules.

Top layer: Users
Show four user groups as professional icons:
- Public citizen / guest
- Government officer / staff
- Executive / decision maker
- Admin / system manager

Second layer: Web Application
Show a modern responsive web app screen labeled conceptually:
- React 19
- Vite
- React Router
- Ant Design
Visualize public portal, internal dashboard, dashboard charts, table CRUD, map, chatbot, global search.

Third layer: App Logic
Show connected blocks:
- AuthContext: role, department, guest mode
- Protected routes and admin routes
- React Query cache
- Dashboard aggregation hooks
- Data privacy / public columns

Fourth layer: Service Layer
Show service modules:
- Supabase client
- globalSearchService
- chatbotDataService
- aiService
- CSV / import / export utilities
Represent these as clean API cards connected by thin lines.

Fifth layer: Backend and Integration
Show:
- Supabase Auth, Database, RPC, profiles, role-based access
- Netlify Functions as proxy gateway
- AI Proxy connected to Gemini, OpenRouter, NVIDIA-compatible endpoint
- External data feeds: Open-Meteo weather, Meteostat daily weather, GISTDA VIIRS hotspots, MOC agri prices, Bangchak oil prices, DOAE/RSS news, RID reservoir data, air quality API

Bottom layer: Deployment and Quality
Show:
- Netlify hosting
- dist build
- SPA redirect
- security headers
- Vitest, Playwright, ESLint

Visual style:
Modern official tech architecture infographic, clean white canvas, emerald green and navy system blocks, gold highlights for agriculture data, subtle map contour background of Nakhon Pathom, thin arrows, database cylinder icon, cloud function icon, AI node icon, shield icon for access control, magnifying glass for search, map pin for GIS.

Make it presentation-ready and understandable without reading code.
Use minimal text; reserve empty title and caption areas for Thai overlay.
No messy technical overload. Clear hierarchy. High resolution.
```

### ข้อความแนะนำสำหรับวางทับในสไลด์

- หัวข้อใหญ่: `ระบบที่ใช้และสถาปัตยกรรม`
- ข้อความสั้น: `React + Vite เชื่อม Supabase เป็นฐานข้อมูลหลัก ใช้ Netlify Functions เป็นชั้น Proxy สำหรับ AI และข้อมูลภายนอก`
- ชุดเทคโนโลยี:
  - `Frontend: React, Vite, Ant Design, React Router`
  - `Data: Supabase Auth / Database / RPC`
  - `Visualization: Recharts, Leaflet, React-Leaflet`
  - `AI: Gemini / OpenRouter / NVIDIA ผ่าน AI Proxy`
  - `Deploy: Netlify`

---

## ภาพที่ 3: โครงสร้างโมดูลตามกลุ่มงาน

### ชื่อภาพ

ระบบงานหลักและฐานข้อมูลที่รองรับภารกิจเกษตรจังหวัด

### เป้าหมายภาพ

แสดงว่าระบบไม่ได้เป็นแค่ dashboard เดียว แต่แบ่งเป็นหลาย domain ตามงานจริงของสำนักงานเกษตรจังหวัด

### Prompt

```text
Create a vertical 9:16 modular infographic showing the main functional domains of "NPT Smart Agri Dashboard".

Main visual metaphor:
A central provincial agriculture data hub in the middle, surrounded by six domain modules like a clean radial map or structured grid.

Center:
Large clean data hub / dashboard core labeled conceptually "NPT Smart Agri Dashboard".
Show database, map, charts, search, AI assistant, public portal, internal dashboard.

Surrounding modules:
1. ฝ่ายบริหารทั่วไป / Admin
Visual icons: personnel, assets, budget, users, audit log, recent activity.
Data examples: profiles, personnel, assets, budgets, audit_logs.

2. ยุทธศาสตร์และสารสนเทศ / Strategy
Visual icons: farmer registry, GIS map pins, agricultural area, learning center, daily weather, disaster monitoring.
Data examples: farmer_registry, gis_areas, agricultural_areas, learning_centers, daily_weather, disasters.

3. ส่งเสริมการผลิต / Production
Visual icons: large plots, GAP certification, crop production, aromatic coconut survey, farm plots.
Data examples: large_plots, certifications, crop_production, coconut_aromatic_surveys.

4. ส่งเสริมและพัฒนาเกษตรกร / Farmer Development
Visual icons: community enterprise shop, Smart Farmer, Young Smart Farmer, agricultural career groups, housewife farmer groups, young farmer groups, farmer institutes, agri tourism.
Data examples: community_enterprises, smart_farmer_sf, young_smart_farmer_ysf, agricultural_career_groups, farmer_institutes, agri_tourism.

5. อารักขาพืช / Plant Protection
Visual icons: pest forecast plot, pest center, soil and fertilizer center, fire hotspot, PM2.5 alert, satellite.
Data examples: forecast_plots, pest_centers, soil_fertilizer_centers, fire_hotspots.

6. Community and Data Request
Visual icons: forum board, data request form, district assignments, CSV/Excel import, workflow status.
Data examples: farmer forum, data_requests, assignments, import/export.

Show each module as a clean card connected to the central hub with data lines.
Use distinct but harmonious colors:
- Admin: slate blue
- Strategy: sky blue
- Production: rice gold
- Development: emerald green
- Protection: warm red/orange accent
- Community/Data Request: violet or teal accent, not dominant

Background:
Subtle province map, rice fields, canal lines, and official document texture.

Design:
Professional government operations infographic, not marketing, not cartoonish. Icons should be clean and recognizable. Keep enough space for Thai headings. High-resolution vertical poster.
```

### ข้อความแนะนำสำหรับวางทับในสไลด์

- หัวข้อใหญ่: `ระบบงานที่รองรับ`
- ข้อความสั้น: `แบ่งข้อมูลตามภารกิจจริงของสำนักงานเกษตรจังหวัด เพื่อให้ค้นหา จัดการ และสรุปผลได้เป็นระบบ`
- โมดูลที่ควรใส่:
  - `บริหารทั่วไป`
  - `ยุทธศาสตร์ฯ`
  - `ส่งเสริมการผลิต`
  - `ส่งเสริมเกษตรกร`
  - `อารักขาพืช`
  - `คำขอข้อมูล / Community`

---

## ภาพที่ 4: ฟังก์ชันเด่นของระบบ

### ชื่อภาพ

ฟังก์ชันสำคัญที่ทำให้ข้อมูลใช้งานได้จริง

### เป้าหมายภาพ

โชว์ feature ที่คนดูเข้าใจง่าย: Dashboard, Map/GIS, Global Search, AI Chatbot, CRUD/Import/Export, Live Widgets, Data Request, Executive Situation Room

### Prompt

```text
Create a vertical 9:16 feature infographic for a smart agriculture web platform named "NPT Smart Agri Dashboard".

Composition:
Use a premium product-feature infographic layout, with one large dashboard mockup in the center and feature callouts around it.

Center visual:
A realistic but stylized web dashboard screen showing:
- KPI cards for agricultural data
- province map with district colors
- bar chart, pie chart, trend chart
- data table
- weather and AQI widget
- search bar
- AI chat panel
- sidebar menu grouped by departments

Feature callouts around the dashboard:
1. Dashboard รวมข้อมูล
Show KPI cards, charts, bento cards, district summary.

2. Smart Map / GIS
Show map pins, choropleth district map, layers for young farmers, career groups, forecast plots, hotspots, live weather and PM2.5.

3. Global Search
Show one search box sending rays into multiple tables and returning grouped results.

4. AI Chatbot "น้องข้าวหอม"
Show an AI assistant chat window that reads database context first, then summarizes answers with table/chart suggestions. Do not make it cartoon; use a clean assistant bubble or AI node.

5. CRUD + CSV Import/Export
Show editable table, plus/edit/delete icons, CSV/Excel upload, export report.

6. Live Widgets
Show weather, air quality, agri prices, oil prices, news, reservoir, soil moisture, GISTDA hotspot.

7. Data Request Workflow
Show province creates a request, districts fill spreadsheet-like grid, system aggregates responses into central database.

8. Executive Situation Room
Show an executive view with alerts, risk ranking, budget signal, pending request status, AI summary.

Visual language:
Clean high-end UI infographic, official but modern, light background, green/gold/blue palette, consistent Ant Design-like interface, sharp dashboard components, thin connector lines, small icon badges, professional public-sector technology.

Important:
Do not create fake unreadable paragraphs. Use icon labels sparingly and leave clear blank caption areas for Thai overlay. Make dashboard UI believable and data-rich but not cluttered.

Aspect ratio 9:16, high resolution, presentation-ready.
```

### ข้อความแนะนำสำหรับวางทับในสไลด์

- หัวข้อใหญ่: `ฟังก์ชันเด่น`
- ข้อความสั้น: `จากข้อมูลดิบ สู่ Dashboard, Map, Search และ AI ที่ช่วยให้เจ้าหน้าที่ใช้ข้อมูลได้เร็วขึ้น`
- Feature list:
  - `Dashboard รวมข้อมูล`
  - `Smart Map / GIS`
  - `Global Search`
  - `AI Chatbot น้องข้าวหอม`
  - `CRUD + CSV Import/Export`
  - `Live Widgets`
  - `Data Request Workflow`
  - `Executive Situation Room`

---

## ภาพที่ 5: ประโยชน์และผลลัพธ์ของงาน

### ชื่อภาพ

ผลลัพธ์ที่เกิดขึ้นกับจังหวัด เจ้าหน้าที่ และประชาชน

### เป้าหมายภาพ

ปิดเรื่องด้วย impact: ลดงาน manual, เพิ่มความเร็วในการตัดสินใจ, เพิ่มความโปร่งใส, ใช้ข้อมูลจริง, พร้อมต่อยอดเป็นต้นแบบจังหวัดอื่น

### Prompt

```text
Create a vertical 9:16 impact infographic for "NPT Smart Agri Dashboard", showing the benefits of a provincial smart agriculture data platform.

Main narrative:
Show a clean journey from "ข้อมูล" to "การตัดสินใจ" to "ผลลัพธ์ต่อพื้นที่".

Top section:
Show unified agriculture data flowing from many sources into one reliable dashboard:
- Supabase database
- district data
- GIS map
- weather and risk data
- farmer development data
- production and certification data
- public widgets

Middle section:
Show three main user impact zones:

1. ผู้บริหาร
Visual: executive viewing situation room dashboard, risk ranking, alerts, budget status, province map.
Benefit: faster overview, evidence-based decisions, area prioritization.

2. เจ้าหน้าที่
Visual: officer using dashboard table, search, AI summary, import/export, data request workflow.
Benefit: less manual report preparation, faster search, easier data maintenance.

3. ประชาชนและภาคี
Visual: public portal on mobile phone, public map, weather, AQI, news, agri prices.
Benefit: easier access to public agricultural information, transparency, data service.

Bottom section:
Show measurable outcome icons:
- ลดเวลารวบรวมข้อมูล
- ลดไฟล์ซ้ำซ้อน
- ค้นหาข้อมูลเร็วขึ้น
- เห็นภาพรวมรายอำเภอ
- ใช้ AI ช่วยสรุป
- พร้อมขยายผลเป็นต้นแบบจังหวัดอื่น

Visual metaphor:
Use Nakhon Pathom province map glowing softly at the bottom, with rice fields and data lines reaching districts. Show a clean upward arrow from scattered data to integrated decision support.

Style:
Professional, hopeful, official, clean government innovation infographic. Use light background, emerald green, rice gold, sky blue, deep navy, subtle warm sunlight. Human-centered but not cartoonish. Include realistic Thai agriculture context: rice fields, orchards, district map, officials, dashboard screens.

Avoid fake statistics unless left as placeholders. Do not include exact percent numbers unless shown as blank editable KPI placeholders.
Leave clean space for Thai title and impact bullets.

Aspect ratio 9:16, high resolution, executive presentation quality.
```

### ข้อความแนะนำสำหรับวางทับในสไลด์

- หัวข้อใหญ่: `ประโยชน์ของระบบ`
- ข้อความสั้น: `เปลี่ยนข้อมูลเกษตรจังหวัดให้เป็นเครื่องมือสนับสนุนการตัดสินใจ การบริการข้อมูล และการทำงานร่วมกัน`
- Impact bullets:
  - `ผู้บริหารเห็นภาพรวมเร็วขึ้น`
  - `เจ้าหน้าที่ลดงานรวบรวมและค้นหาไฟล์`
  - `ประชาชนเข้าถึงข้อมูลสาธารณะได้ง่าย`
  - `ระบบรองรับข้อมูลจริงและต่อยอดได้`
  - `ใช้เป็นต้นแบบศูนย์ข้อมูลเกษตรระดับจังหวัด`

---

## Prompt รวมสำหรับทำภาพทั้งชุดให้โทนเดียวกัน

ถ้าเครื่องมือรองรับการสร้างทีละหลายภาพ ให้ใช้คำสั่งรวมนี้เป็นแนวกำกับ:

```text
Create a cohesive 5-image vertical 9:16 infographic series for a presentation about "NPT Smart Agri Dashboard", a smart agriculture data platform for Nakhon Pathom province, Thailand.

All images must share the same design system: modern government technology, clean smart agriculture infographic, white and light gray background, emerald green, rice gold, sky blue, deep navy accents, subtle rice field and province map motifs, professional dashboard UI, thin connecting lines, clean icons, high readability, executive presentation quality.

Image 1: origin story, scattered agricultural files and reports transformed into one central provincial data dashboard.
Image 2: system architecture, users -> React/Vite web app -> Auth/React Query/services -> Supabase/Netlify Functions/AI Proxy/external APIs -> Netlify deployment.
Image 3: module map, central data hub surrounded by Admin, Strategy, Production, Farmer Development, Plant Protection, Community/Data Request.
Image 4: key functions, dashboard, smart map/GIS, global search, AI chatbot, CRUD/import/export, live widgets, data request workflow, executive situation room.
Image 5: benefits and impact, faster decisions, less manual work, transparent public data, officer productivity, scalable provincial model.

Keep all images text-light and leave clean blank bands for Thai overlay text. Avoid fake official logos, avoid unreadable Thai letters, avoid clutter, avoid cartoon mascot, avoid random numbers. High resolution, presentation-ready.
```

## คำแนะนำการใช้งานจริง

1. ถ้าใช้ Midjourney ให้เติมท้าย prompt แต่ละภาพด้วย:

```text
--ar 9:16 --style raw --v 6 --s 150
```

2. ถ้าใช้ DALL-E / ChatGPT Image ให้ระบุเพิ่ม:

```text
Create a clean infographic without small text. Leave editable blank areas for Thai headings and labels.
```

3. ถ้าใช้ Canva / Firefly / Leonardo ให้ใช้ prompt หลัก แล้วนำข้อความจากหัวข้อ "ข้อความแนะนำสำหรับวางทับในสไลด์" ไปจัดวางเอง เพื่อให้ภาษาไทยคมและอ่านง่าย

4. โทนภาพที่ควรคุม:
   - ภาพ 1: problem to solution
   - ภาพ 2: architecture
   - ภาพ 3: modules
   - ภาพ 4: product features
   - ภาพ 5: impact and benefits

