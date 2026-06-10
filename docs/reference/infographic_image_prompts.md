# Prompt สร้างภาพ Infographic สำหรับพรีเซนต์ NPT Smart Agri Dashboard

เอกสารนี้เป็นชุด prompt สำหรับสร้างภาพ infographic แนวตั้ง จำนวน 5 ภาพ ใช้เล่าเรื่องระบบ NPT Smart Agri Dashboard ตั้งแต่ที่มาที่ไป สถาปัตยกรรมระบบ โมดูลงาน ฟังก์ชันสำคัญ และประโยชน์ของงาน

> แนะนำขนาดภาพ: แนวตั้ง 9:16 หรือ 1080 x 1920 px  
> สไตล์รวมทั้งชุด: modern government tech infographic, smart agriculture, clean data dashboard, Thai provincial agriculture, professional presentation  
> หมายเหตุ: prompt ทุกภาพตั้งใจให้ AI ใส่ข้อความไทยลงในภาพโดยตรง ทั้งหัวข้อ คำอธิบาย bullet และ callout ไม่ต้องแยกไปวางข้อความทับใน PowerPoint / Canva อีก เว้นแต่ต้องการแก้คำภายหลัง

## แนวทางใหม่สำหรับ Prompt แบบมีเนื้อหาไทยในภาพ

ใช้คำสั่งนี้ร่วมกับทุกภาพ เพื่อบังคับให้ AI ใส่เนื้อหาเชิงอธิบายลงไปใน infographic:

```text
ออกแบบเป็น infographic ภาษาไทยจริง มีหัวข้อใหญ่ หัวข้อย่อย คำอธิบายสั้น และ bullet point ที่อ่านได้ชัดเจน จัดลำดับข้อมูลเป็นส่วน ๆ เหมือนโปสเตอร์นำเสนอราชการ ใช้ตัวอักษรไทยคมชัด ถูกต้อง ไม่มั่ว ไม่ตัดคำแปลก ๆ เนื้อหาในภาพต้องอธิบายระบบได้ ไม่ใช่มีแค่ภาพประกอบ เว้นระยะหายใจดี มี hierarchy ของข้อความชัดเจน
```

ข้อกำหนดตัวอักษร:

```text
ใช้ฟอนต์ไทยแนวทางการ อ่านง่าย ทันสมัย เช่น Noto Sans Thai, IBM Plex Sans Thai, Prompt หรือ Sarabun, หัวข้อหนา ตัวเนื้อหาขนาดอ่านได้บนจอพรีเซนต์, ห้ามใช้ตัวหนังสือจิ๋ว, ห้ามสร้างข้อความมั่ว, ถ้าพื้นที่ไม่พอให้ลดจำนวนคำแต่คงสาระสำคัญ
```

## Global Style Prompt ใช้ร่วมกันทั้ง 5 ภาพ

ใช้ style นี้นำหน้าหรือท้าย prompt ทุกภาพเพื่อให้ภาพทั้งชุดไปในทิศทางเดียวกัน:

```text
vertical 9:16 infographic, modern Thai smart agriculture data platform, clean professional government presentation design, premium dashboard visual language, soft daylight, white and light gray background, accent colors emerald green, rice gold, sky blue, and deep navy, subtle agricultural textures, rice field pattern, map contour lines, clean vector illustration mixed with realistic dashboard mockup, crisp icons, thin connecting lines, balanced whitespace, high readability, no clutter, executive presentation quality, high resolution, sharp details, consistent visual system across a 5-slide infographic series
```

Negative prompt ใช้ร่วมกัน:

```text
no messy layout, no random unreadable text, no distorted Thai letters, no fake official logos, no dark cyberpunk style, no excessive neon, no cartoon mascot, no overloaded charts, no tiny text, no low resolution, no stock photo collage, no exaggerated futuristic sci-fi, no inaccurate map of Thailand, no watermark, no meaningless decorative text, no lorem ipsum
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
Include the Thai title, Thai subtitle, and Thai bullet points directly inside the infographic. Keep text areas large, readable, and well-spaced.

Include visual keywords:
Nakhon Pathom agriculture, provincial data center, dashboard, map, farmers, officers, database, AI assistant, public portal, internal dashboard, agriculture operations.

Aspect ratio 9:16, high resolution, presentation-ready, clean executive infographic.
```

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
Use meaningful Thai headings, Thai labels, and short Thai explanation blocks directly inside the infographic.
No messy technical overload. Clear hierarchy. High resolution.
```

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

4. AI Chatbot "น้องข้าวหลาม"
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
Include Thai feature headings and short Thai explanations directly inside each callout. Make dashboard UI believable and data-rich but not cluttered.

Aspect ratio 9:16, high resolution, presentation-ready.
```

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

Avoid fake statistics. Do not include exact percent numbers unless they are clearly presented as example KPI cards without claiming real measured results.
Leave clean space for Thai title and impact bullets.

Aspect ratio 9:16, high resolution, executive presentation quality.
```

---

## Prompt รวมสำหรับทำภาพทั้งชุดให้โทนเดียวกัน

## Prompt เวอร์ชันมีข้อความไทยในภาพ

ใช้ชุดนี้ถ้า AI ที่ใช้สร้างภาพรองรับภาษาไทยได้ดี และต้องการให้ภาพมีเนื้อหาอธิบายครบในตัว ไม่ใช่แค่ฉากหลังสำหรับวางข้อความ

### ภาพที่ 1 แบบมีข้อความ: ที่มาที่ไปของระบบ

```text
สร้าง infographic แนวตั้ง 9:16 ภาษาไทย สำหรับพรีเซนต์โครงการ "NPT Smart Agri Dashboard" สไตล์สีน้ำผสมเวกเตอร์ สวยงาม เป็นทางการ ทันสมัย อ่านง่าย

หัวข้อใหญ่ด้านบน:
"ที่มาของระบบ"

คำโปรยใต้หัวข้อ:
"รวมข้อมูลเกษตรจังหวัดนครปฐมที่เคยกระจัดกระจาย ให้กลายเป็นศูนย์ข้อมูลกลางที่ค้นหา วิเคราะห์ และใช้ตัดสินใจได้จากที่เดียว"

จัดภาพเป็น 3 ช่วงจากบนลงล่าง:

ช่วงที่ 1: "ก่อนมีระบบ: ข้อมูลกระจัดกระจาย"
ใส่ภาพไฟล์ Excel, Google Sheet, PDF, แฟ้มเอกสาร, ฐานข้อมูลแยกส่วน, เจ้าหน้าที่กำลังรวบรวมรายงาน
ใส่ bullet อ่านชัด:
- ข้อมูลอยู่หลายไฟล์ หลายกลุ่มงาน หลายแหล่ง
- ค้นหาข้อมูลย้อนหลังได้ยาก
- ต้องสรุปรายงานและทำกราฟซ้ำหลายรอบ
- ข้อมูลเชิงพื้นที่ ตาราง และข่าวสารไม่อยู่ใน workflow เดียวกัน

ช่วงที่ 2: "แนวคิดการพัฒนา"
วาดเป็นท่อข้อมูลหรือ data funnel ไหลเข้าสู่ศูนย์กลาง
ใส่คำสำคัญบนไอคอน:
"รวบรวมข้อมูล" "จัดระเบียบ" "ตรวจสอบ" "เชื่อมโยงแผนที่" "กำหนดสิทธิ์" "เตรียมข้อมูลให้ AI"

ช่วงที่ 3: "หลังมีระบบ: ศูนย์ข้อมูลเกษตรจังหวัด"
วาด dashboard กลางชื่อ "NPT Smart Agri Dashboard" มีแผนที่นครปฐม KPI cards กราฟ ตาราง และ AI chat
ใส่ bullet อ่านชัด:
- ดู Dashboard ภาพรวมจังหวัด
- ค้นหาข้ามหลายหมวดข้อมูล
- วิเคราะห์ด้วยแผนที่และกราฟ
- ใช้ AI ช่วยถามตอบและสรุปข้อมูล
- แยก Public Portal และ Internal Dashboard ชัดเจน

มุมล่างใส่กล่องสรุป:
"เป้าหมาย: ลดงาน manual เพิ่มความเร็วในการใช้ข้อมูล และทำให้ข้อมูลเกษตรจังหวัดพร้อมใช้สำหรับผู้บริหาร เจ้าหน้าที่ และประชาชน"

ดีไซน์:
สีน้ำผสมเวกเตอร์, พื้นหลังขาวครีม, เขียวมรกต, ทองรวงข้าว, ฟ้าอ่อน, น้ำเงินเข้ม, มีลายทุ่งนา เส้นแผนที่ เส้นข้อมูลเชื่อมโยง, clean government infographic, ตัวอักษรไทยคมชัด อ่านง่าย, ไม่รก, ไม่ใช้โลโก้ราชการปลอม, ไม่มี watermark
```

### ภาพที่ 2 แบบมีข้อความ: ระบบและเทคโนโลยีที่ใช้

```text
สร้าง infographic แนวตั้ง 9:16 ภาษาไทย สไตล์สีน้ำผสมเวกเตอร์ อธิบายสถาปัตยกรรมระบบ "NPT Smart Agri Dashboard" ให้ผู้บริหารและคณะกรรมการเข้าใจง่าย

หัวข้อใหญ่:
"ระบบและเทคโนโลยีที่ใช้"

คำโปรย:
"เว็บแอปศูนย์ข้อมูลเกษตรจังหวัด พัฒนาแบบ Single Page Application เชื่อมฐานข้อมูลกลาง AI และข้อมูลภายนอกผ่าน Proxy ที่ควบคุมได้"

จัดเป็นแผนภาพ layered architecture จากบนลงล่าง:

ชั้นที่ 1: "ผู้ใช้งาน"
ไอคอน 4 กลุ่ม พร้อม label:
- ประชาชน / ผู้สนใจ
- เจ้าหน้าที่
- ผู้บริหาร
- ผู้ดูแลระบบ

ชั้นที่ 2: "Frontend Web Application"
วาดหน้าจอเว็บ dashboard สวยงาม พร้อมข้อความ:
- React + Vite
- React Router
- Ant Design
- Dashboard / Map / Table / Search / Chatbot

ชั้นที่ 3: "App Logic"
วาดกล่องเชื่อมกัน:
- AuthContext: role, department, guest mode
- Protected Route / Admin Route
- React Query Cache
- Dashboard Aggregation Hooks
- Data Privacy Layer

ชั้นที่ 4: "Service Layer"
กล่องบริการ:
- Supabase Client
- Global Search Service
- Chatbot Data Service
- AI Service
- CSV Import / Export

ชั้นที่ 5: "Backend & Integration"
วาดเป็นฐานข้อมูลและ cloud functions:
- Supabase Auth + Database + RPC
- Netlify Functions / Proxy Gateway
- AI Proxy: Gemini, OpenRouter, NVIDIA-compatible endpoint
- External APIs: Open-Meteo, Meteostat, GISTDA VIIRS, MOC Prices, DOAE/RSS News, RID Reservoir, AQI

ชั้นล่าง: "Deploy & Quality"
ใส่ข้อความ:
- Netlify Hosting
- Vite Build → dist
- SPA Redirect
- Vitest / Playwright / ESLint

ใส่กล่องสรุปด้านข้าง:
"จุดเด่นเชิงเทคนิค"
- แยก Public กับ Internal ชัดเจน
- มี Role-based Access
- ใช้ Cache ลดการเรียกข้อมูลซ้ำ
- มี Proxy กลางสำหรับ AI และ API ภายนอก
- พร้อมทดสอบและ Deploy แบบ Web Application จริง

ดีไซน์:
สีน้ำผสมเวกเตอร์, clean architecture diagram, เส้นเชื่อมบาง ๆ, database cylinder, cloud function icon, AI node, shield, magnifying glass, map pin, พื้นหลังมี contour map จังหวัดนครปฐมแบบจาง ๆ, ตัวอักษรไทยคมชัด อ่านง่าย, เป็นทางการและสวยงาม
```

### ภาพที่ 3 แบบมีข้อความ: โครงสร้างโมดูลตามกลุ่มงาน

```text
สร้าง infographic แนวตั้ง 9:16 ภาษาไทย สไตล์สีน้ำผสมเวกเตอร์ แสดงโครงสร้างโมดูลของ "NPT Smart Agri Dashboard" ตามภารกิจสำนักงานเกษตรจังหวัด

หัวข้อใหญ่:
"ระบบงานหลักที่รองรับภารกิจเกษตรจังหวัด"

คำโปรย:
"ออกแบบข้อมูลตามกลุ่มงานจริง เพื่อให้เจ้าหน้าที่แต่ละฝ่ายดูแลข้อมูลของตนเอง และผู้บริหารเห็นภาพรวมจากศูนย์กลางเดียว"

วาง dashboard/data hub ตรงกลาง:
"NPT Smart Agri Dashboard"
ใส่ไอคอนกลาง: database, dashboard, map, chart, search, AI

รอบ ๆ ศูนย์กลางให้มี 6 โมดูล พร้อมหัวข้อและรายการย่อย:

1. "ฝ่ายบริหารทั่วไป"
- บุคลากร
- พัสดุ / ครุภัณฑ์
- งบประมาณ
- ผู้ใช้ระบบ
- Audit Log

2. "ยุทธศาสตร์และสารสนเทศ"
- ทะเบียนเกษตรกร
- GIS / พิกัดพื้นที่
- พื้นที่การเกษตร
- ศูนย์เรียนรู้
- สภาพอากาศ / น้ำฝน
- ภัยพิบัติ

3. "ส่งเสริมการผลิต"
- แปลงใหญ่
- มาตรฐาน GAP
- ผลผลิตพืช
- แบบเก็บข้อมูลมะพร้าวน้ำหอม

4. "ส่งเสริมและพัฒนาเกษตรกร"
- วิสาหกิจชุมชน
- Smart Farmer / YSF
- กลุ่มส่งเสริมอาชีพ
- กลุ่มแม่บ้านเกษตรกร
- สถาบันเกษตรกร
- ท่องเที่ยวเชิงเกษตร

5. "อารักขาพืช"
- แปลงพยากรณ์
- ศูนย์จัดการศัตรูพืชชุมชน
- ศูนย์จัดการดินปุ๋ยชุมชน
- จุด Hotspot / PM2.5

6. "คำขอข้อมูลและชุมชน"
- Data Request
- Assignment รายอำเภอ
- CSV / Excel Import
- Farmer Forum

กล่องสรุปด้านล่าง:
"ผลลัพธ์: ข้อมูลถูกแบ่งตามเจ้าของงาน แต่เชื่อมกลับสู่ Dashboard กลาง เพื่อวิเคราะห์ภาพรวมจังหวัดได้ทันที"

ดีไซน์:
radial module map หรือ grid 2 คอลัมน์, สีน้ำผสมเวกเตอร์, ใช้สีแยกกลุ่มงานแต่กลมกลืน, พื้นหลังทุ่งนาและแผนที่จังหวัดแบบจาง, เส้นข้อมูลเชื่อมทุกโมดูลเข้าสู่ศูนย์กลาง, ตัวอักษรไทยคมชัดและมี hierarchy ดี, ไม่รก
```

### ภาพที่ 4 แบบมีข้อความ: ฟังก์ชันเด่นของระบบ

```text
สร้าง infographic แนวตั้ง 9:16 ภาษาไทย สไตล์สีน้ำผสมเวกเตอร์ แสดงฟังก์ชันเด่นของ "NPT Smart Agri Dashboard" ให้ดูเหมือน product feature poster สำหรับพรีเซนต์

หัวข้อใหญ่:
"ฟังก์ชันเด่นของระบบ"

คำโปรย:
"เปลี่ยนข้อมูลดิบให้ใช้งานได้จริง ผ่าน Dashboard, แผนที่, การค้นหา, AI และระบบจัดการข้อมูล"

ตรงกลางเป็น mockup หน้าจอ dashboard ขนาดใหญ่:
มี sidebar, KPI cards, กราฟ, ตาราง, แผนที่นครปฐม, search bar, chat panel, widget สภาพอากาศ

รอบหน้าจอให้มี callout 8 ฟังก์ชัน พร้อมคำอธิบายสั้น:

1. "Dashboard รวมข้อมูล"
"สรุปตัวเลขสำคัญ กราฟ และสถานะข้อมูลตามกลุ่มงาน"

2. "Smart Map / GIS"
"ดูข้อมูลรายอำเภอ พิกัดพื้นที่ แผนที่สี และชั้นข้อมูลเชิงพื้นที่"

3. "Global Search"
"ค้นหาคำเดียว เจอข้อมูลข้ามหลายตารางและหลายหมวดงาน"

4. "AI Chatbot น้องข้าวหลาม"
"ถามข้อมูลด้วยภาษาธรรมชาติ ให้ AI ช่วยสรุป วิเคราะห์ และเสนอคำตอบจากบริบทฐานข้อมูล"

5. "CRUD + Import / Export"
"เพิ่ม แก้ไข ลบ ดูข้อมูล นำเข้า CSV/Excel และส่งออกข้อมูลเพื่อทำรายงาน"

6. "Live Widgets"
"เชื่อมข่าว อากาศ AQI ราคาเกษตร ราคาเชื้อเพลิง เขื่อน ความชื้นดิน และจุด Hotspot"

7. "Data Request Workflow"
"จังหวัดสร้างคำขอ อำเภอกรอกข้อมูล ระบบรวมผลกลับสู่ฐานข้อมูลกลาง"

8. "Executive Situation Room"
"มุมมองสำหรับผู้บริหาร รวม alert, risk ranking, งบประมาณ, คำขอค้าง และสรุปด้วย AI"

กล่องสรุปด้านล่าง:
"ระบบเดียว ครอบคลุมการดูข้อมูล วิเคราะห์ ค้นหา จัดการ และสื่อสารผล"

ดีไซน์:
premium watercolor + vector UI, หน้าจอ dashboard คม รายละเอียดพอดี ไม่แน่นเกิน, callout เส้นบาง, icon ชัด, ใช้สีเขียว ทอง ฟ้า น้ำเงิน, ตัวอักษรไทยอ่านง่ายมาก, ไม่ใช้ตัวหนังสือจิ๋ว, ไม่ใส่ข้อความมั่ว
```

### ภาพที่ 5 แบบมีข้อความ: ประโยชน์และผลลัพธ์ของงาน

```text
สร้าง infographic แนวตั้ง 9:16 ภาษาไทย สไตล์สีน้ำผสมเวกเตอร์ สรุปประโยชน์และผลลัพธ์ของ "NPT Smart Agri Dashboard" สำหรับปิดท้ายการพรีเซนต์

หัวข้อใหญ่:
"ประโยชน์ของระบบ"

คำโปรย:
"ศูนย์ข้อมูลเกษตรจังหวัดที่ช่วยให้ข้อมูลพร้อมใช้ ตัดสินใจเร็วขึ้น ทำงานร่วมกันง่ายขึ้น และต่อยอดเป็นต้นแบบได้"

จัดภาพเป็น 3 กลุ่มผู้ได้รับประโยชน์:

กลุ่มที่ 1: "ผู้บริหาร"
ภาพผู้บริหารดู Situation Room บนจอใหญ่ มีแผนที่และ alert
bullet:
- เห็นภาพรวมจังหวัดได้เร็ว
- ใช้ข้อมูลประกอบการตัดสินใจ
- จัดลำดับพื้นที่และประเด็นเร่งด่วน
- ติดตามงบประมาณ คำขอข้อมูล และความเสี่ยง

กลุ่มที่ 2: "เจ้าหน้าที่"
ภาพเจ้าหน้าที่ใช้ dashboard, table, search, AI
bullet:
- ลดเวลารวบรวมไฟล์และทำรายงานซ้ำ
- ค้นหาข้อมูลข้ามหมวดได้ในที่เดียว
- เพิ่ม / แก้ไข / นำเข้า / ส่งออกข้อมูลได้สะดวก
- ให้ AI ช่วยสรุปคำตอบและเตรียมข้อมูลประกอบงาน

กลุ่มที่ 3: "ประชาชนและภาคี"
ภาพมือถือเปิด Public Portal พร้อมแผนที่ ข่าว อากาศ ราคาเกษตร
bullet:
- เข้าถึงข้อมูลสาธารณะได้ง่าย
- เพิ่มความโปร่งใสของข้อมูลภาครัฐ
- เห็นข่าวสาร สภาพอากาศ AQI และข้อมูลเกษตรที่เกี่ยวข้อง
- สนับสนุนการมีส่วนร่วมของภาคีในพื้นที่

ด้านล่างเป็นแถบ "ผลลัพธ์เชิงระบบ":
ใส่ icon + short text:
- ข้อมูลรวมศูนย์
- ลดงาน Manual
- ตัดสินใจจากข้อมูลจริง
- เชื่อมแผนที่และพื้นที่
- ใช้ AI ช่วยวิเคราะห์
- พร้อมขยายผลสู่จังหวัดอื่น

กล่องสรุปปิดท้าย:
"NPT Smart Agri Dashboard ไม่ใช่แค่เว็บแสดงข้อมูล แต่เป็นโครงสร้างพื้นฐานด้านข้อมูลเกษตรระดับจังหวัด"

ดีไซน์:
อบอุ่น น่าเชื่อถือ เป็นทางการ สีน้ำผสมเวกเตอร์ มีทุ่งนา แผนที่นครปฐม เส้นข้อมูลเชื่อมจากอำเภอต่าง ๆ เข้าสู่ dashboard, แสงเช้าอ่อน ๆ, ตัวอักษรไทยสวย คม อ่านง่าย, composition โปร่ง ไม่รก, ไม่มีโลโก้ปลอม ไม่มี watermark
```

---

ถ้าเครื่องมือรองรับการสร้างทีละหลายภาพ ให้ใช้คำสั่งรวมนี้เป็นแนวกำกับ:

```text
Create a cohesive 5-image vertical 9:16 infographic series for a presentation about "NPT Smart Agri Dashboard", a smart agriculture data platform for Nakhon Pathom province, Thailand.

All images must share the same design system: modern government technology, clean smart agriculture infographic, white and light gray background, emerald green, rice gold, sky blue, deep navy accents, subtle rice field and province map motifs, professional dashboard UI, thin connecting lines, clean icons, high readability, executive presentation quality.

Image 1: origin story, scattered agricultural files and reports transformed into one central provincial data dashboard.
Image 2: system architecture, users -> React/Vite web app -> Auth/React Query/services -> Supabase/Netlify Functions/AI Proxy/external APIs -> Netlify deployment.
Image 3: module map, central data hub surrounded by Admin, Strategy, Production, Farmer Development, Plant Protection, Community/Data Request.
Image 4: key functions, dashboard, smart map/GIS, global search, AI chatbot, CRUD/import/export, live widgets, data request workflow, executive situation room.
Image 5: benefits and impact, faster decisions, less manual work, transparent public data, officer productivity, scalable provincial model.

All images must include meaningful Thai titles, Thai subtitles, Thai bullet points, and Thai callout labels directly inside the infographic. Avoid fake official logos, avoid unreadable Thai letters, avoid clutter, avoid cartoon mascot, avoid random numbers. High resolution, presentation-ready.
```

## คำแนะนำการใช้งานจริง

1. ถ้าใช้ Midjourney ให้เติมท้าย prompt แต่ละภาพด้วย:

```text
--ar 9:16 --style raw --v 6 --s 150
```

2. ถ้าใช้ DALL-E / ChatGPT Image ให้ระบุเพิ่ม:

```text
Create a clean infographic with Thai headings, Thai labels, and Thai bullet points directly inside the image. Text must be readable and not tiny.
```

3. ถ้าใช้ Canva / Firefly / Leonardo ให้ใช้ prompt แบบมีข้อความไทยในภาพได้เลย แล้วค่อยแก้คำเฉพาะจุดภายหลังถ้าต้องการความเนี้ยบระดับงานส่งประกวด

4. โทนภาพที่ควรคุม:
   - ภาพ 1: problem to solution
   - ภาพ 2: architecture
   - ภาพ 3: modules
   - ภาพ 4: product features
   - ภาพ 5: impact and benefits
