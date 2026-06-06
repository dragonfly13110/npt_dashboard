# รีวิวโปรเจค NPT Smart Agri Dashboard แบบเต็มรูปแบบ

## 📌 สรุปภาพรวม

**NPT Smart Agri Dashboard** คือระบบศูนย์ข้อมูลการเกษตรจังหวัดนครปฐม ที่พัฒนาเป็นเว็บแอปพลิเคชันเพื่อรวมข้อมูลที่กระจัดกระจายจากหลายแหล่ง (Excel, Google Sheet, รายงาน PDF, ระบบส่วนกลาง) ให้อยู่ในระบบเดียว สามารถใช้งานได้ทั้งแบบสาธารณะ (Public Portal) และแบบภายในหน่วยงาน (Internal Dashboard)

---

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────────┐
│                         ผู้ใช้งาน                                │
│        ประชาชน / เจ้าหน้าที่ / ผู้บริหาร / Admin                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Web Application                         │
│              (Vite + React Router + Ant Design)                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Public      │  │ Internal     │  │ AI Chatbot              │ │
│  │ Portal      │  │ Dashboard    │  │ (น้องข้าวหอม)           │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│   Supabase      │ │  Netlify        │ │  External APIs          │
│   (Auth + DB)   │ │  Functions      │ │  - ข่าวเกษตร            │
│                 │ │  (Proxy)        │ │  - สภาพอากาศ            │
│ - PostgreSQL    │ │                 │ │  - ราคาสินค้า           │
│ - Row Level     │ │ - AI Proxy      │ │  - จุด Hotspot         │
│   Security      │ │ - RSS Proxy     │ │  - GISTDA              │
│ - RPC Functions │ │ - Price Proxy   │ │  - WordPress           │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

---

## 🎯 ระบบย่อยทั้งหมดในโปรเจค

### 1. **Public Data Portal** (门户สาธารณะ)
เผยแพร่ข้อมูลเกษตรให้ประชาชนเข้าถึงได้โดยไม่ต้องล็อกอิน

**หน้าเว็บหลัก:**
- `/` - Landing Page หน้าแรก
- `/interactive-dashboard` - Dashboard แบบ interactive
- `/public/large-plots` - ข้อมูลแปลงใหญ่
- `/public/smart-farmer-sf` - Smart Farmer
- `/public/young-smart-farmer-ysf` - Young Smart Farmer
- `/public/agricultural-career-groups` - กลุ่มส่งเสริมอาชีพ
- `/public/young-farmer-groups` - กลุ่มยุวเกษตรกร
- `/public/community-enterprises` - วิสาหกิจชุมชน
- `/public/agri-tourism` - ท่องเที่ยวเชิงเกษตร
- `/public/farmer-institutes` - สถาบันเกษตรกร
- `/public/agricultural-areas` - พื้นที่การเกษตร

**Widget ข้อมูลภายนอก:**
- ข่าวเกษตร (RSS, WordPress, กรมส่งเสริมการเกษตร)
- สภาพอากาศรายวัน
- AQI / คุณภาพอากาศ
- ราคาสินค้าเกษตร (MOC)
- ราคาน้ำมัน (Bangchak)
- จุดความร้อน/Hotspot (GISTDA)
- แผนที่เชิงพื้นที่

---

### 2. **Internal Dashboard** (ระบบภายใน)
สำหรับเจ้าหน้าที่หลังเข้าสู่ระบบ แบ่งตามกลุ่มงาน 5 กลุ่ม

#### 2.1 **ฝ่ายบริหารทั่วไป (Admin)**
**เส้นทาง:** `/dashboard/admin/*`

| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| Dashboard | `AdminDashboard.jsx` | ภาพรวมฝ่ายบริหาร |
| บุคลากร | `Personnel.jsx` | จัดการข้อมูลเจ้าหน้าที่ |
| พัสดุ/ครุภัณฑ์ | `Assets.jsx` | ติดตามทรัพย์สิน |
| งบประมาณ | `Budgets.jsx` | วางแผนและติดตามงบประมาณ |
| จัดการผู้ใช้ | `UserManagement.jsx` | กำหนดสิทธิ์ผู้ใช้ |
| Audit Log | `AuditLog.jsx` | ประวัติการแก้ไขข้อมูล |
| กิจกรรมล่าสุด | `RecentActivities.jsx` | ติดตามการใช้งานระบบ |

---

#### 2.2 **กลุ่มยุทธศาสตร์และสารสนเทศ (Strategy)**
**เส้นทาง:** `/dashboard/strategy/*`

| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| Dashboard | `StrategyDashboard.jsx` | ภาพรวมกลุ่มยุทธศาสตร์ |
| ทะเบียนเกษตรกร | `FarmerRegistry.jsx` | ข้อมูลเกษตรกรรายบุคคล |
| GIS | - | ข้อมูลเชิงพื้นที่ พิกัดแปลง |
| พื้นที่การเกษตร | `AgriculturalAreas.jsx` | จำแนกพื้นที่เพาะปลูก |
| ศูนย์เรียนรู้ | `LearningCenters.jsx` | ศูนย์เรียนรู้การเกษตร |
| สภาพอากาศ/น้ำฝน | `DailyWeather.jsx` | ข้อมูลสภาพอากาศรายวัน |
| ภัยพิบัติ | `Disasters.jsx` | ติดตามภัยพิบัติทางการเกษตร |
| ราคาสินค้าเกษตร | `AgriculturalPrices.jsx` | วิเคราะห์ราคาตลาด |

---

#### 2.3 **กลุ่มส่งเสริมและพัฒนาการผลิต (Production)**
**เส้นทาง:** `/dashboard/production/*`

| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| Dashboard | `ProductionDashboard.jsx` | ภาพรวมกลุ่มการผลิต |
| แปลงใหญ่ | `LargePlots.jsx` | จัดการแปลงใหญ่เกษตร |
| มาตรฐาน GAP | `Certifications.jsx` | ใบรับรองมาตรฐานเกษตร |
| ผลผลิตพืช | `CropProduction.jsx` | ข้อมูลผลผลิตทางการเกษตร |
| มะพร้าวน้ำหอม | `CoconutAromaticSurvey.jsx` | สำรวจมะพร้าวน้ำหอม |

---

#### 2.4 **กลุ่มส่งเสริมและพัฒนาเกษตรกร (Development)**
**เส้นทาง:** `/dashboard/development/*`

| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| Dashboard | `DevelopmentDashboard.jsx` | ภาพรวมกลุ่มพัฒนาเกษตรกร |
| วิสาหกิจชุมชน | `CommunityEnterprises.jsx` | จัดกลุ่มวิสาหกิจชุมชน |
| Smart Farmer | `SmartFarmerSf.jsx` | เกษตรกรอัจฉริยะ |
| Young Smart Farmer | `YoungSmartFarmerYsf.jsx` | เกษตรกรรุ่นใหม่ |
| กลุ่มส่งเสริมอาชีพ | `AgriculturalCareerGroups.jsx` | กลุ่มอาชีพการเกษตร |
| กลุ่มแม่บ้านเกษตรกร | `FarmerGroups.jsx` | กลุ่มแม่บ้านเกษตรกร |
| กลุ่มยุวเกษตรกร | `YoungFarmerGroupsDashboard.jsx` | ยุวเกษตรกร |
| สถาบันเกษตรกร | `FarmerInstitutes.jsx` | สถาบัน/สหกรณ์การเกษตร |
| ท่องเที่ยวเชิงเกษตร | `AgriTourism.jsx` | ส่งเสริมการท่องเที่ยว |
| ภัยพิบัติ | - | มุมมองงานพัฒนา |

---

#### 2.5 **กลุ่มอารักขาพืช (Protection)**
**เส้นทาง:** `/dashboard/protection/*`

| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| Dashboard | `ProtectionDashboard.jsx` | ภาพรวมกลุ่มอารักขาพืช |
| แปลงพยากรณ์ | `PestOutbreaks.jsx` | พยากรณ์การระบาดศัตรูพืช |
| ศูนย์จัดการศัตรูพืช | `PestCenters.jsx` | ศจช. ในชุมชน |
| ศูนย์จัดการดินปุ๋ย | `SoilFertilizerCenters.jsx` | ศดป. ในชุมชน |
| จุด Hotspot | `FireHotspots.jsx` | จุดความร้อนจาก GISTDA |
| แพทย์พืช | `PlantDoctors.jsx` | ทีมแพทย์พืช |
| AI พยากรณ์โรค | `AiDiseaseForecast.jsx` | ใช้ AI ทำนายโรคพืช |

---

#### 2.6 **ชุมชนเกษตรกร (Community)**
**เส้นทาง:** `/dashboard/community/*`

| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| Farmer Forum | `FarmerForum.jsx` | กระดานข่าวถามตอบ |

---

### 3. **AI Chatbot "น้องข้าวหอม"**
**เส้นทาง:** `/dashboard/chatbot`

**ความสามารถ:**
- ถามตอบข้อมูลเกษตรด้วยภาษาธรรมชาติ
- ดึงข้อมูลจริงจากฐานข้อมูล Supabase
- สรุปข้อมูลข้ามหลายตาราง
- แนะนำ schema จาก Google Sheet/CSV
- รองรับหลาย AI Provider (Gemini, OpenRouter, NVIDIA)

**ไฟล์หลัก:**
- `src/pages/Chatbot.jsx`
- `src/services/chatbotDataService.js`
- `src/services/aiService.js`
- `src/utils/chatbotConstants.js`
- `netlify/functions/ai-proxy.js`

---

### 4. **Global Search** (ค้นหาข้ามระบบ)
**เส้นทาง:** `/dashboard/search`

**ความสามารถ:**
- ค้นหาข้อมูลข้ามหลายตารางพร้อมกัน
- ใช้ Supabase RPC `global_search`
- Fallback query หลายตารางแบบขนาน
- เก็บประวัติการค้นหา (recent searches)

**ไฟล์หลัก:**
- `src/pages/SearchResults.jsx`
- `src/components/Search/GlobalSearch.jsx`
- `src/services/globalSearchService.js`

---

### 5. **Data Requests** (ระบบขอข้อมูล)
**เส้นทาง:** `/dashboard/data-requests`

**ความสามารถ:**
- บันทึกคำขอข้อมูลจากหน่วยงาน
- นำเข้าข้อมูลจาก Google Sheet / CSV URL
- ใช้ AI แนะนำ schema จากหัวตาราง
- จำกัดสิทธิ์เฉพาะ admin และ editor

**ไฟล์หลัก:**
- `src/pages/dataRequests/DataRequests.jsx`
- `src/utils/dataRequestGrid.js`

---

### 6. **Data Management System** (ระบบจัดการข้อมูล)

**ความสามารถ:**
- ตาราง CRUD (เพิ่ม/แก้ไข/ลบ/ดู)
- Import/Export CSV
- Audit log ติดตามการแก้ไข
- ใช้ซ้ำได้หลายหน้าผ่าน component กลาง

**ไฟล์หลัก:**
- `src/components/DataTable/CrudTable.jsx`
- `src/components/DataTable/CsvImportModal.jsx`
- `src/utils/auditLog.js`

---

### 7. **Map & GIS System** (ระบบแผนที่)

**ความสามารถ:**
- แสดงแผนที่จังหวัดนครปฐม
- แสดงข้อมูลเชิงพื้นที่ (แปลงเกษตร, ศูนย์เรียนรู้, ฯลฯ)
- ใช้ Leaflet และ React-Leaflet
- รองรับข้อมูล GeoJSON

**ไฟล์หลัก:**
- `src/pages/SmartMap.jsx`
- `src/components/Map/ForecastMap.jsx`
- `src/components/widgets/LandingMap.jsx`
- `src/utils/geo.js`
- `src/data/nakhon_pathom_districts.json`

---

## 🔧 Netlify Functions (Serverless Proxy)

| Function | ไฟล์ | หน้าที่ |
|----------|------|--------|
| AI Proxy | `ai-proxy.js` | เรียก AI providers (Gemini, OpenRouter) |
| RSS Proxy | `rss-proxy.js` | ดึง RSS feeds ข่าวเกษตร |
| WordPress Proxy | `wp-proxy.js` | proxy WordPress APIs |
| MOC Price Proxy | `moc-price-proxy.js` | ราคาสินค้าเกษตรจากพาณิชย์ |
| Bangchak Oil Price | `bangchak-oil-price-proxy.js` | ราคาน้ำมันบางจาก |
| GISTDA Proxy | `gistda-proxy.js` | ข้อมูลจุดความร้อนจาก GISTDA |
| Sync Hotspots | `sync-hotspots.js` | sync hotspot เข้า Supabase |
| Sync Weather | `sync-weather.js` | sync สภาพอากาศเข้า Supabase |
| Sync Farmer Registry | `sync-farmer-registry.js` | sync ทะเบียนเกษตรกร |
| Public Certifications | `public-certifications.js` | endpoint public สำหรับ certification |
| Public Farmer Institutes v2 | `public-farmer-institutes-v2.js` | endpoint public สำหรับสถาบันเกษตรกร |
| DOAE HQ Proxy | `doae-hq-proxy.js` | proxy กรมส่งเสริมการเกษตร |
| DOAE NPT Proxy | `doae-npt-proxy.js` | proxy เกษตรจังหวัดนครปฐม |
| DOAE ESC Proxy | `doae-esc-proxy.js` | proxy เกษตรอำเภอ |
| KKU Proxy | `kku-proxy.js` | proxy มหาวิทยาลัยขอนแก่น |
| ICTC Proxy | `ictc-proxy.js` | proxy ICTC |
| Agritec Proxy | `agritec-proxy.js` | proxy Agritec |
| Forecast Disease Insect | `forecast-disease-insect.js` | พยากรณ์โรคและแมลง |
| Forecast Disease Insect Daily | `forecast-disease-insect-daily.js` | พยากรณ์รายวัน |

---

## 👥 ระบบสิทธิ์และการเข้าถึง

### Role หลัก

| Role | ความสามารถ |
|------|-----------|
| `guest` | ดู dashboard บางส่วน ไม่ใช้ chatbot และ data requests |
| `viewer` | ดูข้อมูลตามกลุ่มงานตนเอง |
| `editor` | ดูและแก้ไขข้อมูล ใช้ data requests ได้ |
| `admin` | เห็นทุกเมนู จัดการผู้ใช้ ดู audit log ลบข้อมูลได้ |

### Department Mapping

| Department | Group Key | เส้นทาง Dashboard |
|------------|-----------|------------------|
| ฝ่ายบริหารทั่วไป | `admin` | `/dashboard/admin/*` |
| กลุ่มยุทธศาสตร์ฯ | `strategy` | `/dashboard/strategy/*` |
| กลุ่มส่งเสริมการผลิต | `production` | `/dashboard/production/*` |
| กลุ่มส่งเสริมเกษตรกร | `development` | `/dashboard/development/*` |
| กลุ่มอารักขาพืช | `protection` | `/dashboard/protection/*` |

### กลไกควบคุมสิทธิ์

- `AuthContext.jsx` - เก็บ session, role, department
- `ProtectedRoute` - กันหน้า `/dashboard/*`
- `AdminRoute` - กันหน้า admin เฉพาะบางส่วน
- `NonGuestRoute` - กัน guest เข้า chatbot
- `DataRequestRoute` - จำกัด data requests ให้ admin/editor
- Sidebar กรองเมนูตาม role และ department
- Helper functions: `canAccessGroup`, `canAccessTable`

---

## 📁 โครงสร้างโปรเจค

```
/workspace
├── src/
│   ├── App.jsx                      # Route, provider, lazy loading
│   ├── main.jsx                     # Entry point
│   ├── supabaseClient.js            # Supabase config
│   │
│   ├── components/
│   │   ├── Chatbot/                 # AI chatbot components
│   │   ├── DataTable/               # CRUD table components
│   │   ├── Layout/                  # Sidebar, Header, AppLayout
│   │   ├── Map/                     # Map components
│   │   ├── Search/                  # Global search components
│   │   └── widgets/                 # News, Weather, Price, AQI widgets
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx          # Authentication & authorization
│   │
│   ├── hooks/
│   │   ├── useDashboardData.js      # Dashboard data fetching
│   │   ├── useProductionData.js     # Production group data
│   │   ├── useDevelopmentData.js    # Development group data
│   │   ├── useProtectionData.js     # Protection group data
│   │   ├── useSupabase.js           # Supabase helper
│   │   ├── useApiCache.js           # API caching
│   │   └── dashboard/
│   │       ├── config.js            # Dashboard configuration
│   │       ├── dataFetchers.js      # Data fetching logic
│   │       └── selectors.js         # Data selectors
│   │
│   ├── pages/
│   │   ├── admin/                   # Admin group pages
│   │   ├── strategy/                # Strategy group pages
│   │   ├── production/              # Production group pages
│   │   ├── development/             # Development group pages
│   │   ├── protection/              # Protection group pages
│   │   ├── community/               # Community pages
│   │   ├── dataRequests/            # Data request workflow
│   │   ├── Chatbot.jsx              # AI chatbot page
│   │   ├── Dashboard.jsx            # Main dashboard
│   │   ├── InteractiveDashboard.jsx # Public interactive dashboard
│   │   ├── LandingPage.jsx          # Public landing page
│   │   ├── Login.jsx                # Login page
│   │   ├── SearchResults.jsx        # Search results page
│   │   └── SmartMap.jsx             # Smart map page
│   │
│   ├── services/
│   │   ├── aiService.js             # AI API calls
│   │   ├── chatbotDataService.js    # Chatbot data context
│   │   └── globalSearchService.js   # Global search logic
│   │
│   ├── utils/
│   │   ├── auditLog.js              # Audit logging
│   │   ├── chatbotConstants.js      # Chatbot constants
│   │   ├── coconutAromatic.js       # Coconut survey utilities
│   │   ├── csv.js                   # CSV utilities
│   │   ├── dataPrivacy.js           # Data privacy helpers
│   │   ├── dataRequestGrid.js       # Data request grid logic
│   │   ├── farmerInstitutesV2.js    # Farmer institutes utilities
│   │   ├── geo.js                   # Geographic utilities
│   │   └── soilMoistureUtils.js     # Soil moisture utilities
│   │
│   ├── domain/
│   │   └── datasetCatalog.js        # Dataset catalog
│   │
│   ├── styles/                      # Global styles
│   └── __tests__/                   # Unit tests
│
├── netlify/
│   └── functions/                   # Serverless functions (20 files)
│
├── scripts/
│   ├── downloadGeojson.js           # Download GeoJSON
│   ├── local_scheduler.js           # Local scheduler
│   ├── prerender.js                 # Prerendering
│   ├── run_migration.js             # Database migration
│   └── *.py                         # Python utility scripts
│
├── docs/
│   ├── manual/                      # คู่มือการใช้งาน (8 ไฟล์)
│   │   ├── 01-ภาพรวมและเป้าหมายระบบ.md
│   │   ├── 02-การรวบรวมข้อมูลจากจังหวัด.md
│   │   ├── 03-การทำความสะอาดและเตรียมข้อมูล.md
│   │   ├── 04-การออกแบบฐานข้อมูลและตั้งค่า-supabase.md
│   │   ├── 05-การติดตั้งและตั้งค่าโปรเจกต์.md
│   │   ├── 06-การสร้าง-dashboard-search-ai.md
│   │   ├── 07-ความปลอดภัยและการ-deploy.md
│   │   └── 08-การดูแลระบบและอบรมผู้ใช้งาน.md
│   │
│   └── reference/                   # เอกสารอ้างอิง (9 ไฟล์)
│       ├── ARCHITECTURE.md
│       ├── SYSTEM_OVERVIEW.md
│       ├── DATABASE_AND_WIDGET_TABLES.md
│       ├── ENVIRONMENT.md
│       ├── SECURITY_NOTES.md
│       ├── COMPETITION_SYSTEM_REVIEW.md
│       ├── CONTEST_PLAN.md
│       ├── CONTEST_APPLICATION_DRAFT.md
│       └── INFOGRAPHIC_4_PART_CONTENT.md
│
├── tests/
│   ├── e2e/                         # E2E tests (Playwright)
│   └── scrape_dry_run.js            # Test scraping
│
├── supabase/                        # Database schema & migrations
├── public/                          # Static assets
├── .agents/                         # Agent skills & documentation
├── package.json                     # Dependencies & scripts
├── vite.config.js                   # Vite configuration
├── eslint.config.js                 # ESLint configuration
├── playwright.config.js             # Playwright configuration
└── README.md                        # Project overview
```

---

## 🛠️ Tech Stack

| หมวดหมู่ | เทคโนโลยี | เวอร์ชัน |
|----------|----------|---------|
| **Frontend Framework** | React | 19.2.0 |
| **Build Tool** | Vite | 7.3.1 |
| **Routing** | React Router DOM | 7.13.1 |
| **UI Library** | Ant Design | 6.3.1 |
| **Icons** | @ant-design/icons | 6.1.0 |
| **State Management** | TanStack React Query | 5.95.2 |
| **Backend-as-a-Service** | Supabase | 2.97.0 |
| **Database** | PostgreSQL (via Supabase) | - |
| **Maps** | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| **Charts** | ECharts | 6.1.0 |
| **PDF Export** | jsPDF + html2canvas | 4.2.0 / 1.4.1 |
| **Excel/CSV** | xlsx | 0.18.5 |
| **Date Utility** | dayjs | 1.11.19 |
| **Geo Utility** | utm | 1.1.1 |
| **Serverless** | Netlify Functions | 5.2.0 |
| **Testing (Unit)** | Vitest + Testing Library | 4.1.4 |
| **Testing (E2E)** | Playwright | 1.59.1 |
| **Linting** | ESLint | 9.39.1 |

---

## 📊 ข้อมูลที่ระบบรองรับ

### ข้อมูลหลัก (Core Data)
- ทะเบียนเกษตรกร
- พื้นที่การเกษตร
- แปลงใหญ่
- ศูนย์เรียนรู้การเกษตร
- Smart Farmer / Young Smart Farmer
- วิสาหกิจชุมชน
- กลุ่มเกษตรกร (แม่บ้าน, ยุวเกษตรกร, อาชีพ)
- สถาบันเกษตรกร/สหกรณ์
- ท่องเที่ยวเชิงเกษตร

### ข้อมูลการผลิต
- ผลผลิตพืช
- ใบรับรองมาตรฐาน (GAP, Organic)
- สำรวจมะพร้าวน้ำหอม

### ข้อมูลอารักขาพืช
- แปลงพยากรณ์การระบาด
- ศูนย์จัดการศัตรูพืชชุมชน (ศจช.)
- ศูนย์จัดการดินปุ๋ยชุมชน (ศดป.)
- จุดความร้อน (Hotspot)
- คลังชีวภัณฑ์

### ข้อมูลสนับสนุน
- สภาพอากาศรายวัน
- ภัยพิบัติทางการเกษตร
- ราคาสินค้าเกษตร
- ราคาน้ำมัน
- ข่าวเกษตร
- คุณภาพอากาศ (AQI)
- ระดับน้ำในเขื่อน
- ความชื้นในดิน

### ข้อมูลบริหาร
- บุคลากร
- พัสดุ/ครุภัณฑ์
- งบประมาณ
- ผู้ใช้ระบบ
- Audit log

---

## 🚀 คำสั่งที่ใช้บ่อย

```bash
# พัฒนา (Development)
npm run dev

# Build สำหรับ Production
npm run build

# Build สำหรับ Netlify
npm run build:netlify

# รัน Preview หลัง Build
npm run preview

# รัน Unit Tests
npm run test

# รัน Unit Tests แบบ Watch Mode
npm run test:watch

# รัน E2E Tests
npm run test:e2e

# รัน E2E Tests แบบ UI Mode
npm run test:e2e:ui

# Lint Code
npm run lint

# Lint เฉพาะ src folder
npm run lint:src

# Prerender Pages
npm run prerender
```

---

## 🌐 Environment Variables

ไฟล์ `.env.local` ต้องมี:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AI_PROVIDER=gemini|openrouter|nvidia
VITE_GEMINI_API_KEY=your_gemini_key (ถ้าใช้ Gemini)
VITE_OPENROUTER_API_KEY=your_openrouter_key (ถ้าใช้ OpenRouter)
VITE_NVIDIA_API_KEY=your_nvidia_key (ถ้าใช้ NVIDIA)
```

---

## ✅ จุดแข็งของโปรเจค

### 1. **รวมข้อมูลศูนย์กลาง**
- ลดปัญหาข้อมูลกระจัดกระจายใน Excel, Google Sheet, PDF
- ฐานข้อมูลเดียว ใช้ร่วมกันทุกหน้า

### 2. **แยก Public/Internal ชัดเจน**
- ประชาชนเข้าถึงข้อมูลเผยแพร่ได้ไม่ต้องล็อกอิน
- เจ้าหน้าที่เห็นข้อมูลเชิงลึกหลังล็อกอิน

### 3. **Role-Based Access Control**
- ควบคุมสิทธิ์ตามบทบาท (guest, viewer, editor, admin)
- แบ่งตามกลุ่มงาน (admin, strategy, production, development, protection)

### 4. **AI Chatbot ผู้ช่วย**
- ถามตอบด้วยภาษาธรรมชาติ
- ดึงข้อมูลจริงจากฐานข้อมูล
- สรุปข้อมูลข้ามตาราง

### 5. **Global Search**
- ค้นหาข้อมูลข้ามหลายตารางพร้อมกัน
- ลดขั้นตอนการเปิดหลายเมนู

### 6. **Serverless Architecture**
- ใช้ Netlify Functions proxy external APIs
- ซ่อน API keys และ logic สำคัญไว้ฝั่ง server

### 7. **เอกสารครบถ้วน**
- คู่มือการใช้งาน 8 บท
- เอกสารอ้างอิง 9 ไฟล์
- README อธิบายภาพรวม

### 8. **ทดสอบได้**
- Unit tests ด้วย Vitest
- E2E tests ด้วย Playwright
- Linting ด้วย ESLint

---

## ⚠️ ข้อควรระวัง

1. **Supabase RLS Policies** - ต้องตรวจสอบ Row Level Security ให้รอบคอบ
2. **API Rate Limits** - External APIs อาจมี limit การเรียก
3. **Data Privacy** - ข้อมูลเกษตรกรต้องปกป้องความเป็นส่วนตัว
4. **Performance** - Dashboard โหลดข้อมูลมากอาจช้า ต้องใช้ cache
5. **Deployment** - ต้องตรวจสอบ environment variables ก่อน deploy

---

## 📈 แนวทางต่อยอด

1. **Data Request Workflow** - ระบบขอข้อมูลจากอำเภอผ่าน Excel-like interface
2. **Mobile App** - พัฒนาแอปมือถือสำหรับเกษตรกร
3. **API Gateway** - เปิด API ให้หน่วยงานอื่นใช้งาน
4. **Advanced Analytics** - เพิ่ม predictive analytics ด้วย ML
5. **Multi-Province** - ขยายผลให้จังหวัดอื่นใช้ได้

---

## 📞 สรุปสั้นสำหรับนำเสนอ

> **NPT Smart Agri Dashboard** เป็นแพลตฟอร์มศูนย์ข้อมูลเกษตรจังหวัดนครปฐมที่รวมข้อมูลจาก 5 กลุ่มงานไว้ในระบบเดียว แสดงผลผ่าน Dashboard, แผนที่, ตาราง และกราฟ พร้อมผู้ช่วย AI "น้องข้าวหอม" สำหรับถามตอบและสรุปข้อมูล ช่วยให้เจ้าหน้าที่และผู้บริหารเข้าถึงข้อมูลได้เร็วขึ้น ลดขั้นตอนการรวบรวมรายงาน และต่อยอดเป็นระบบข้อมูลเกษตรระดับจังหวัดที่ขยายผลได้ในอนาคต

---

## 📂 สถิติโปรเจค

- **จำนวนไฟล์โค้ดหลัก:** 152+ ไฟล์
- **Netlify Functions:** 20 functions
- **หน้าเว็บหลัก:** 50+ หน้า
- **เอกสารคู่มือ:** 8 บท (350+ KB)
- **เอกสารอ้างอิง:** 9 ไฟล์ (200+ KB)
- **Tests:** Unit tests + E2E tests
- **Dependencies:** 35+ packages

---

*ไฟล์นี้สร้างจากการรีวิวโปรเจค NPT Smart Agri Dashboard อย่างละเอียด*
*วันที่: 2025*
