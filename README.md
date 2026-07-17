# NPT Smart Agri Dashboard

ศูนย์ข้อมูลการเกษตรอัจฉริยะจังหวัดนครปฐม สำหรับรวบรวมข้อมูลเกษตรระดับจังหวัด แสดงผลเป็นแดชบอร์ด แผนที่ ระบบค้นหา ระบบนำเข้าข้อมูล และผู้ช่วย AI/LINE chatbot

## ภาพรวม

โปรเจกต์นี้เป็นเว็บแอป React + Vite ที่เชื่อม Supabase และ Netlify Functions เพื่อใช้เป็นทั้งหน้าสาธารณะและระบบเจ้าหน้าที่ภายใน

- หน้าสาธารณะ: landing page, dashboard สรุป, Smart Map, BMC, คู่มือออนไลน์
- ระบบภายใน: dashboard เจ้าหน้าที่, situation room, data dictionary, data requests, CRUD ตามกลุ่มงาน
- ข้อมูล GIS: แผนที่นครปฐม, ชั้นข้อมูลชุดดิน, แปลง/พิกัด และข้อมูลพื้นที่เกษตร
- AI/Search: global search, chatbot หน้าเว็บ, LINE AI chatbot, proxy สำหรับ model/API ภายนอก
- งานระบบ: Supabase schema/RLS/RPC, Netlify Functions, audit log, visitor analytics, data quality

## Tech Stack

- Frontend: React 19, Vite 7, React Router 7, Ant Design 6
- Data/API: Supabase, Netlify Functions, TanStack Query
- Visualization: ECharts, Leaflet/React Leaflet
- Testing: Vitest, Playwright, Testing Library
- Tooling: ESLint, Prettier, Husky, lint-staged

## เริ่มใช้งานในเครื่อง

ต้องมี Node.js เวอร์ชันใหม่ที่รองรับ Vite 7 และแนะนำให้ใช้ pnpm ตาม lockfile ของโปรเจกต์

```bash
pnpm install
cp .env.example .env
pnpm dev
```

เปิดเว็บที่ Vite แสดงใน terminal ปกติคือ `http://localhost:5173`

ถ้าใช้ npm ก็รันได้เช่นกัน:

```bash
npm install
npm run dev
```

## Environment Variables

คัดลอก `.env.example` เป็น `.env` แล้วเติมค่าที่จำเป็น

ค่าหลักสำหรับ frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LANDING_CHATBOT_API_URL`
- `VITE_LANDING_CHATBOT_API_KEY`
- `VITE_SOIL_LAYER_URL`

ค่าสำหรับ Netlify Functions/server เท่านั้น:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`
- `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_AI_*`
- API keys/credentials ของแหล่งข้อมูลภายนอก เช่น DOAE, GISTDA, Meteostat

### LINE knowledge rollout

LINE Bot ค้นข้อมูลในระบบก่อนเสมอ โดยใช้ชุดข้อมูล หน้า และคู่มือที่ลงทะเบียนใน `src/domain/datasetCatalog.json` เท่านั้น ผู้ใช้ทั่วไปเห็นข้อมูลแบบตัด PII; เจ้าหน้าที่เชื่อมบัญชีด้วยรหัสใช้ครั้งเดียวจากหน้าโปรไฟล์

เมื่อไม่มีข้อมูลในระบบและเปิด `LINE_AI_GROUNDING_ENABLED=true` บอทจึงค้นอินเทอร์เน็ต พร้อมแจ้งว่าเป็นคำตอบจากอินเทอร์เน็ตและส่งแหล่งอ้างอิง การ deploy migration ให้ทำตามลำดับ:

1. Apply `supabase/line_account_linking.sql`.
2. Apply `supabase/global_search.sql`.
3. ตั้งค่า `LINE_AI_ENABLED=true`, Gemini key slots, LINE secret/token, Supabase service role และ `LINE_AI_GROUNDING_ENABLED=true` บน Netlify
4. รัน `npm run build:line-knowledge`
5. รัน focused tests และ build
6. ทดสอบ staff pilot ก่อนเปิด public

อย่าใส่ service role key หรือ secret ใดๆ ด้วย prefix `VITE_` เพราะค่ากลุ่มนี้จะถูก bundle ไปฝั่ง browser

## คำสั่งที่ใช้บ่อย

```bash
pnpm dev          # เปิด dev server
pnpm build        # build production
pnpm preview      # preview dist หลัง build
pnpm lint         # ตรวจ lint ทั้งโปรเจกต์
pnpm lint:src     # ตรวจ lint เฉพาะ src
pnpm test         # unit/integration tests
pnpm test:e2e     # Playwright e2e
pnpm prerender    # สร้างไฟล์ prerender ด้วย scripts/prerender.js
```

## โครงสร้างโปรเจกต์

```text
src/
  pages/          หน้าเว็บและหน้าระบบภายใน
  components/     reusable UI, chatbot, widgets, maps, tables
  hooks/          data hooks และ dashboard selectors
  services/       search, AI, monitoring, guest session, chatbot services
  utils/          helpers, privacy, CSV, geo, markdown
  domain/         dataset catalog
  data/           seed/static data

netlify/functions/  serverless APIs, proxy, sync jobs, LINE webhook
supabase/           schema, migrations, RLS, RPC/search SQL
docs/manual/        คู่มือทำระบบและดูแลระบบ
docs/reference/     เอกสารสถาปัตยกรรม ฐานข้อมูล และรีวิวระบบ
tests/e2e/          Playwright specs
public/             static assets, GIS, sitemap, robots
scripts/            import/sync/migration/prerender scripts
```

## เส้นทางสำคัญ

Public:

- `/`
- `/interactive-dashboard`
- `/smart-map`
- `/manual`
- `/manual/:slug`
- `/bmc`
- `/login`

Internal หลัง login:

- `/dashboard`
- `/dashboard/situation-room`
- `/dashboard/chatbot`
- `/dashboard/data-dictionary`
- `/dashboard/search`
- `/dashboard/data-requests`
- `/dashboard/admin/*`
- `/dashboard/strategy/*`
- `/dashboard/production/*`
- `/dashboard/development/*`
- `/dashboard/protection/*`

## ฐานข้อมูลและข้อมูลตั้งต้น

ไฟล์ SQL อยู่ใน `supabase/` โดยมี `schema.sql` เป็นฐานหลัก และไฟล์เสริมสำหรับ RLS, RBAC, global search, data requests, LINE AI, visitor events และตารางเฉพาะกลุ่มงาน

สคริปต์ import/sync อยู่ใน `scripts/` เช่น:

- `run_sql_file.mjs`
- `run_migration.js`
- `apply_global_search.mjs`
- `seed_fallback_data.mjs`
- `seed_forecast_plots.mjs`
- `sync_geoplots_progress.js`
- `import_*.mjs`

อ่านรายละเอียด field/table เพิ่มที่ `docs/DATA_DICTIONARY.md` และ `docs/reference/DATABASE_AND_WIDGET_TABLES.md`

## Netlify Deploy

โปรเจกต์ตั้งค่าไว้ใน `netlify.toml`

- build command: `npm run build:netlify`
- publish directory: `dist`
- functions directory: `netlify/functions`
- SPA fallback: `/* -> /index.html`

ก่อน deploy ให้ตั้งค่า environment variables บน Netlify ให้ครบ โดยเฉพาะ secret ฝั่ง server และ allowed origins

## เอกสารเพิ่มเติม

- `docs/manual/00-เริ่มต้นสำหรับมือใหม่-ทำเว็บตั้งแต่ศูนย์จนออนไลน์.md`
- `docs/manual/05-การติดตั้งและตั้งค่าโปรเจกต์.md`
- `docs/manual/07-ความปลอดภัยและการ-deploy.md`
- `docs/manual/10-คู่มือนำเข้าข้อมูล-csv-สำหรับเจ้าหน้าที่.md`
- `docs/manual/11-sop-ผู้ดูแลระบบ.md`
- `docs/manual/12-troubleshooting-สำหรับมือใหม่.md`
- `docs/reference/ARCHITECTURE.md`
- `docs/reference/SYSTEM_OVERVIEW.md`
- `docs/reference/ENVIRONMENT.md`
- `docs/ROADMAP.md`

## หมายเหตุสำหรับผู้ดูแล

- เก็บ secrets ไว้ใน `.env` หรือ Netlify Environment Variables เท่านั้น
- ตรวจ RLS/role ทุกครั้งก่อนเปิดข้อมูลภายในสู่ public route
- หลังแก้ Netlify Functions หรือ SQL ให้รัน test ที่เกี่ยวข้องก่อน deploy
- ถ้าแก้ข้อมูลที่แสดงใน dashboard ให้ตรวจทั้งหน้าสาธารณะและหน้า internal เพราะหลาย widget ใช้ source เดียวกัน
