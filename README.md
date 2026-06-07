# NPT Smart Agri Dashboard 🌾

ศูนย์ข้อมูลการเกษตรอัจฉริยะจังหวัดนครปฐม (ระบบบูรณาการข้อมูลการเกษตรระดับจังหวัด)

---

## 📌 ที่มาที่ไป (Background)

งานข้อมูลการเกษตรระดับจังหวัดมักเผชิญปัญหาข้อมูลกระจัดกระจายอยู่ในหลายไฟล์ (Excel, PDF, Word) และกระจายอยู่ตามกลุ่มงานต่าง ๆ ทำให้การประมวลผลสรุปภาพรวมจังหวัดใช้เวลานานและซ้ำซ้อน ระบบ **NPT Smart Agri Dashboard** จึงถูกพัฒนาขึ้นเพื่อบูรณาการข้อมูลการเกษตรทั้งหมดเข้าสู่ระบบเดียวกัน ทำให้เป็น "ศูนย์กลางข้อมูลหนึ่งเดียว" ที่มีประสิทธิภาพ ปลอดภัย และนำไปใช้ประโยชน์ต่อยอดได้จริง

## 🎯 เป้าหมาย (Goals)

1. **บูรณาการข้อมูลกลาง**: รวมข้อมูลเชิงสถิติ บุคลากร สินทรัพย์ ทะเบียนเกษตรกร และข้อมูลเชิงพื้นที่ (GIS) ของจังหวัดนครปฐม
2. **ขับเคลื่อนด้วยแดชบอร์ด**: แสดงผลข้อมูลเป็นกราฟเชิงโต้ตอบ (Interactive Charts) และแผนที่พิกัดเชิงรุกสำหรับผู้บริหารและเจ้าหน้าที่
3. **ระบบผู้ช่วย AI & การค้นหาอัจฉริยะ**: ใช้ AI Chatbot (น้องข้าวหอม) ช่วยสืบค้นและตอบคำถามจากข้อมูลจริง รวมถึงค้นหาข้ามตารางได้อย่างรวดเร็ว
4. **ความปลอดภัยของข้อมูล**: บังคับใช้นโยบายสิทธิ์แบบระบุบทบาท (RBAC) และนโยบายระดับแถวข้อมูล (Row-Level Security - RLS) เพื่อความปลอดภัยสูงสุด

## 🖥️ ภาพรวมระบบและฟีเจอร์เด่น (System Overview)

ระบบแบ่งออกเป็น 2 ส่วนหลักเพื่อตอบโจทย์ผู้ใช้แต่ละกลุ่ม:

### 1. สาธารณะ (Public Portal)

- **Interactive Dashboard**: สรุปข้อมูลสถิติพื้นที่พืชและการเกษตรภาพรวมจังหวัดนครปฐม
- **SmartMap (แผนที่อัจฉริยะ)**: แผนที่แสดงเลเยอร์ข้อมูลพิกัดภูมิสารสนเทศ (GIS), แปลงใหญ่, แหล่งท่องเที่ยวเชิงเกษตร
- **AI Disease Forecast & Hotspots**: รายงานทำนายเตือนภัยระบาดศัตรูพืชล่วงหน้า 7 วันด้วย AI และพิกัดจุดความร้อนประจำวัน
- **แชทบอทน้องข้าวหอม (Landing Chatbot)**: อำนวยความสะดวกในการค้นหาและแนะนำเมนูเด่นประจำเว็บไซต์

### 2. ระบบภายในเจ้าหน้าที่ (Internal Dashboard)

- **Executive Situation Room**: ห้องปฏิบัติการผู้บริหารเพื่อวิเคราะห์ เปรียบเทียบข้อมูลสถิติรายอำเภอเชิงลึก
- **Data Management (CRUD)**: จัดการตารางข้อมูลกลุ่มงานต่าง ๆ ได้แก่:
  - _บริหารทั่วไป_: บุคลากร (`personnel`), สินทรัพย์ (`assets`), งบประมาณ (`budgets`), บันทึกการแก้ไข (`audit_logs`)
  - _ยุทธศาสตร์_: ทะเบียนเกษตรกร (`farmer_registry`), พื้นที่เกษตร (`agricultural_areas`), แหล่งเรียนรู้ (`learning_centers`)
  - _ส่งเสริมการผลิต_: แปลงใหญ่ (`large_plots`), มาตรฐาน GAP (`certifications`), ผลผลิตพืช (`crop_production`)
  - _ส่งเสริมเกษตรกร_: วิสาหกิจชุมชน (`community_enterprises`), Smart Farmer (`smart_farmer_sf`, `young_smart_farmer_ysf`), ท่องเที่ยวเกษตร
  - _อารักขาพืช_: แปลงพยากรณ์ (`forecast_plots`), ศูนย์จัดการศัตรูพืช (`pest_centers`), ศูนย์ดินปุ๋ย (`soil_fertilizer_centers`)
- **Data Requests Workflows**: ระบบสร้างคำขอข้อมูลและเชื่อมต่อข้อมูลดิบภายนอกผ่าน Google Sheets/CSV
- **Internal AI Chatbot**: ผู้ช่วยตอบคำถามวิเคราะห์ข้อมูลเชิงตัวเลขและจัดอันดับที่คำนวณจาก database จริง

---

## 🛠️ แนะนำการติดตั้งและขั้นตอนสร้างระบบ (How to Build from Scratch)

หากต้องการติดตั้งโปรเจกต์นี้เพื่อพัฒนาต่อ หรือต้องการสร้างระบบข้อมูลแบบเดียวกันนี้จากเริ่มต้น ให้ศึกษาตามคู่มือการสร้างระบบแบบเป็นขั้นตอนใน [docs/manual/](file:///e:/coding/npt_dashboard/docs/manual/) ดังนี้:

| ขั้นตอนหลัก                       | เอกสารคู่มือและขั้นตอนการทำ                                                                                                         | รายละเอียดสำคัญ                                                                        |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **Step 1: ศึกษาภาพรวม**           | [01 ภาพรวมและเป้าหมายระบบ](file:///e:/coding/npt_dashboard/docs/manual/01-ภาพรวมและเป้าหมายระบบ.md)                                 | ทำความเข้าใจโจทย์ ขอบเขตการทำงาน และการแบ่งกลุ่มงานของจังหวัด                          |
| **Step 2: สำรวจและเก็บข้อมูล**    | [02 การรวบรวมข้อมูลจากจังหวัด](file:///e:/coding/npt_dashboard/docs/manual/02-การรวบรวมข้อมูลจากจังหวัด.md)                         | วิธีการรวบรวมข้อมูลดิบจากหน่วยงานต่าง ๆ และโครงสร้างแบบฟอร์มจัดเก็บ                    |
| **Step 3: ทำความสะอาดข้อมูล**     | [03 การทำความสะอาดและเตรียมข้อมูล](file:///e:/coding/npt_dashboard/docs/manual/03-การทำความสะอาดและเตรียมข้อมูล.md)                 | การคลีนข้อมูล จัดฟิลด์ ลบข้อมูลซ้ำซ้อน และแปลงข้อมูลบุคคลให้อยู่ในรูปนิรนาม            |
| **Step 4: ตั้งค่าฐานข้อมูล**      | [04 การออกแบบฐานข้อมูลและตั้งค่า Supabase](file:///e:/coding/npt_dashboard/docs/manual/04-การออกแบบฐานข้อมูลและตั้งค่า-supabase.md) | การสร้างตารางบน Supabase Database, ออกแบบ Schema, และตั้งค่า RLS เบื้องต้น             |
| **Step 5: ติดตั้งโปรเจกต์**       | [05 การติดตั้งและตั้งค่าโปรเจกต์](file:///e:/coding/npt_dashboard/docs/manual/05-การติดตั้งและตั้งค่าโปรเจกต์.md)                   | การ Clone Repo, ตั้งค่าไฟล์ Env, การรัน Dev Server และชุดคำสั่งสั่งการผ่าน `pnpm`      |
| **Step 6: พัฒนาฟังก์ชันเด่น**     | [06 การสร้าง Dashboard, Search และ AI Chatbot](file:///e:/coding/npt_dashboard/docs/manual/06-การสร้าง-dashboard-search-ai.md)      | การเขียนแผนภูมิด้วย ECharts, เชื่อมต่อ Global Search และการทำ context injection ให้ AI |
| **Step 7: ความปลอดภัยและเผยแพร่** | [07 ความปลอดภัยและการ Deploy](file:///e:/coding/npt_dashboard/docs/manual/07-ความปลอดภัยและการ-deploy.md)                           | การทำ RLS Role Hardening, การ deploy ฟังก์ชัน proxy บน Netlify และขั้นตอนเปิดใช้จริง   |
| **Step 8: ส่งมอบและดูแลระบบ**     | [08 การดูแลระบบและอบรมผู้ใช้งาน](file:///e:/coding/npt_dashboard/docs/manual/08-การดูแลระบบและอบรมผู้ใช้งาน.md)                     | แผนการสำรองข้อมูล (Backup), การติดตาม Log และการจัดอบรมขยายผล                          |

---

## 🚀 สรุป Tech Stack ที่สำคัญ

- **Frontend**: React 19, Vite 7, Ant Design 6, React Router DOM 7
- **Database & Auth**: Supabase Database, Custom Database Functions (RPC), RLS Role Hardening
- **Data Visualizations**: Apache ECharts (ผ่าน EChart Component Wrapper), Leaflet & React Leaflet (แผนที่)
- **Package Manager**: `pnpm` (จัดการ dependency ในรูปแบบ Monorepo Workspace)
- **Deployment**: Netlify Host, Serverless Functions (19 Services สำหรับ Proxy และ Tasks)

## 📌 เอกสารเชิงลึกอื่น ๆ (References)

สำหรับนักพัฒนาหรือวิศวกรข้อมูลที่ต้องการศึกษาความเชื่อมโยงระดับระบบอย่างละเอียด:

- [SYSTEM_OVERVIEW.md](file:///e:/coding/npt_dashboard/docs/reference/SYSTEM_OVERVIEW.md) - ภาพรวมสรุปของระบบ (รวมรายละเอียดจากไฟล์ PROJECT_REVIEW_FULL และ SECURITY_NOTES เดิม)
- [ARCHITECTURE.md](file:///e:/coding/npt_dashboard/docs/reference/ARCHITECTURE.md) - สถาปัตยกรรมและการไหลเวียนของข้อมูล (Data Flow) ในระบบ
- [DATABASE_AND_WIDGET_TABLES.md](file:///e:/coding/npt_dashboard/docs/reference/DATABASE_AND_WIDGET_TABLES.md) - รายละเอียดตารางและแหล่งที่มาของ Widget แต่ละตัว
- [ENVIRONMENT.md](file:///e:/coding/npt_dashboard/docs/reference/ENVIRONMENT.md) - การจัดการและคู่มือความปลอดภัยด้าน Secrets หมุนเวียนคีย์
- [COMPETITION_SYSTEM_REVIEW.md](file:///e:/coding/npt_dashboard/docs/reference/COMPETITION_SYSTEM_REVIEW.md) - รายงานผลการประเมินและการปรับปรุงระบบเพื่อเตรียมประกวด
- [infographic_image_prompts.md](file:///e:/coding/npt_dashboard/docs/reference/infographic_image_prompts.md) - ชุดคำสั่ง (Prompts) สำหรับสร้างรูปภาพอินโฟกราฟิกของระบบ
