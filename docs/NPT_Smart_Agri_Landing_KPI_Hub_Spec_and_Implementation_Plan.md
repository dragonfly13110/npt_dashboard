# NPT Smart Agri Landing Page KPI Hub

## Technical Specification and Implementation Plan

> เอกสารนี้ใช้เป็นข้อกำหนดและแผนดำเนินงานสำหรับปรับ Landing Page ของระบบ NPT Smart Agri Dashboard  
> เป้าหมายคือเปลี่ยนหน้าแรกจากการแสดง Widget ขนาดใหญ่หลายตัวพร้อมกัน ให้เป็นหน้า KPI Hub ที่อ่านง่าย โหลดเร็ว และเปิด Widget รายละเอียดแบบ Lazy Loading เมื่อผู้ใช้กดดู

---

# 1. ภาพรวมแนวคิด

Landing Page ใหม่ต้องรองรับผู้ใช้งาน 3 กลุ่มพร้อมกัน โดยจัดลำดับข้อมูลตามความสำคัญ

## กลุ่มที่ 1 ประชาชนและเกษตรกร

เห็นข้อมูลประจำวันที่จำเป็นก่อน ได้แก่

- สภาพอากาศ
- คุณภาพอากาศและ PM2.5
- จุดความร้อน
- การเฝ้าระวังโรคและแมลง

## กลุ่มที่ 2 ผู้บริหาร

เห็นตัวเลขภาพรวมจังหวัดแบบกระชับ ได้แก่

- พื้นที่การเกษตร
- เกษตรกรหรือครัวเรือนเกษตรกร
- กลุ่มแปลงใหญ่
- วิสาหกิจชุมชน
- สถาบันเกษตรกร
- แหล่งท่องเที่ยวเชิงเกษตร

## กลุ่มที่ 3 เจ้าหน้าที่

เข้าถึงระบบและฐานข้อมูลได้สะดวก ได้แก่

- Dashboard
- Smart Map
- ระบบค้นหาข้อมูล
- Crop Cost Lab
- ฐานความรู้
- ระบบประเมิน
- Farmer Forum
- คู่มือการใช้งาน
- ระบบภายนอกที่เกี่ยวข้อง

แนวทางนี้ใช้ตัวเลือก D คือรองรับทุกกลุ่ม แต่จัดลำดับข้อมูลใหม่ให้ชัดเจน

---

# 2. ปัญหาปัจจุบัน

Landing Page ปัจจุบันมี Widget ขนาดใหญ่หลายตัวแสดงพร้อมกัน เช่น

- Weather Widget
- Air Quality Widget
- Agri Prices Widget
- Oil Price Widget
- Hotspot Widget
- Landing Map
- Soil Moisture Widget
- Dam and Reservoir Widget
- Disease Forecast
- Farmer Institutes
- Agricultural Areas
- Government News
- Agricultural Media News

ปัญหาที่เกิดขึ้น

1. หน้าแรกมีข้อมูลหนาแน่นและดูรก
2. ผู้ใช้ไม่ทราบว่าควรเริ่มดูข้อมูลส่วนใด
3. Widget หลายตัวถูก Mount พร้อมกัน
4. API หลายแหล่งถูกเรียกทันทีตั้งแต่เปิดหน้า
5. แผนที่ กราฟ และ JavaScript ขนาดใหญ่โหลดก่อนที่ผู้ใช้จะต้องการ
6. Mobile Page ยาวและเลื่อนมาก
7. Landing Page มีความรับผิดชอบมากเกินไป
8. CSS หลายชุดซ้อนทับกันและดูแลยาก
9. Widget บางตัวมี Mock หรือ Random Fallback ที่อาจทำให้ผู้ใช้เข้าใจว่าเป็นข้อมูลจริง
10. ข้อความแหล่งข้อมูลบางจุดไม่ตรงกับแหล่งข้อมูลจริง

---

# 3. เป้าหมายหลัก

1. เปลี่ยน Widget ขนาดใหญ่บนหน้าแรกเป็น KPI Card
2. แสดงเพียงค่าหลักที่จำเป็นต่อการตัดสินใจ
3. เปิด Widget รายละเอียดเมื่อผู้ใช้กด KPI Card
4. ใช้ `React.lazy` และ `Suspense`
5. ไม่โหลด Detail Widget ก่อนผู้ใช้กด
6. ลดจำนวน Initial API Requests
7. ใช้ Cache ร่วมกันระหว่าง KPI Card และ Detail Widget
8. แยก Landing Page เป็น Section Components
9. ลดการโหลด Leaflet, ECharts และ Library หนักจาก Initial Bundle
10. รองรับ Desktop, Tablet และ Mobile
11. รองรับ Keyboard และ Screen Reader
12. ไม่มี Random Mock Data ใน Production
13. แสดงชื่อแหล่งข้อมูลและเวลาอัปเดต
14. รักษา Route และระบบเดิมทั้งหมด
15. เพิ่ม Automated Tests และ Performance Verification

---

# 4. ขอบเขตงาน

## 4.1 อยู่ในขอบเขต

- ปรับโครงสร้าง Landing Page
- สร้าง Generic KPI Card
- สร้าง KPI Sections
- สร้าง Widget Detail Modal
- สร้าง Lazy Widget Registry
- แยก Summary Data Layer
- ปรับ React Query Cache
- ลดการโหลด Map และ News
- แยก Landing Page ออกจาก Widget Logic
- ปรับ Responsive Design
- ปรับ Accessibility
- เพิ่ม Unit, Integration และ E2E Tests
- ลบ Random Mock Fallback ใน Production
- แก้ข้อความแหล่งข้อมูลให้ถูกต้อง
- บันทึก Performance Before and After

## 4.2 ไม่อยู่ในขอบเขต

- ไม่เปลี่ยนระบบ Login
- ไม่เปลี่ยน Database Schema โดยไม่จำเป็น
- ไม่ติดตั้ง UI Framework ใหม่
- ไม่สร้าง Dashboard ใหม่
- ไม่ลบ Route เดิม
- ไม่ลบ Widget เดิม
- ไม่เปลี่ยน Supabase Table โดยไม่มีเหตุผล
- ไม่แก้ระบบอื่นที่ไม่เกี่ยวข้องกับ Landing Page
- ไม่ออกแบบระบบใหม่ทั้งหมด

---

# 5. โครงสร้างหน้า Landing Page ใหม่

ลำดับจาก Header ถึง Footer

```text
1. Header
2. Hero Section
3. สถานการณ์วันนี้
4. ภาพรวมการเกษตรจังหวัดนครปฐม
5. ดิน น้ำ ตลาด
6. เครื่องมือและฐานข้อมูล
7. Map Preview
8. ข่าวสารล่าสุด
9. บทความหรือองค์ความรู้
10. ติดต่อเรา
11. Footer
12. Widget Detail Host
```

---

# 6. Header

Header ต้องมี

- Logo และชื่อระบบ
- หน้าแรก
- สถานการณ์วันนี้
- ข้อมูลการเกษตร
- แผนที่
- ข้อมูลเปิด
- ข่าวสาร
- คู่มือ
- ระบบบริการ
- ปุ่มค้นหา
- ปุ่มเข้าสู่ระบบ

ข้อกำหนด

- Desktop ใช้ Horizontal Navigation
- Mobile ใช้ Hamburger Menu หรือ Bottom Navigation
- Route เดิมต้องยังทำงาน
- External Link ต้องเปิดอย่างปลอดภัย
- แสดง Active Navigation State
- รองรับ Keyboard Navigation

---

# 7. Hero Section

Hero Section ต้องมี

- ชื่อระบบ
- คำอธิบายสั้น
- Search Bar
- ปุ่มเข้าสู่ Dashboard
- ปุ่มเปิด Smart Map
- ภาพจังหวัดนครปฐมหรือภาพเกษตรที่เหมาะสม

ตัวอย่างข้อความ

```text
ศูนย์ข้อมูลเกษตรจังหวัดนครปฐม
ข้อมูลครบ รอบด้าน เพื่อการเกษตรที่ยั่งยืน
```

ข้อกำหนด Search

- ห้ามส่งผู้ใช้ไป Protected Route โดยไม่แจ้ง
- ถ้าต้อง Login ให้แสดงข้อความก่อน
- หากทำ Public Search ได้ ให้กรองเฉพาะข้อมูลเปิดเผย
- ต้องรองรับ Enter Key
- ต้องมี Accessible Label

---

# 8. Section สถานการณ์วันนี้

แสดง KPI Card 4 ใบ

1. สภาพอากาศ
2. คุณภาพอากาศ
3. จุดความร้อน
4. เฝ้าระวังโรคและแมลง

แต่ละ Card แสดง

- Icon
- ชื่อข้อมูล
- ค่าหลัก 1 ค่า
- หน่วย
- สถานะ
- ข้อมูลรองไม่เกิน 1 บรรทัด
- เวลาอัปเดต
- แหล่งข้อมูล
- ข้อความ “ดูรายละเอียด”

ตัวอย่าง

```text
สภาพอากาศ
31°C
อากาศร้อน
โอกาสฝน 60%
Open-Meteo
อัปเดต 10:30 น.
```

ข้อห้าม

- ห้ามใส่กราฟใน KPI Card
- ห้ามใส่แผนที่ใน KPI Card
- ห้ามใส่ตารางขนาดใหญ่
- ห้ามแสดงข้อมูลเกิน 2 ระดับ
- ห้ามโหลด Detail Widget ตั้งแต่ Initial Render

---

# 9. Section ภาพรวมการเกษตรจังหวัด

แสดง KPI Card 4 ถึง 6 ใบ

ตัวอย่างข้อมูล

- พื้นที่การเกษตร
- เกษตรกรหรือครัวเรือนเกษตรกร
- กลุ่มแปลงใหญ่
- วิสาหกิจชุมชน
- สถาบันเกษตรกร
- แหล่งท่องเที่ยวเชิงเกษตร

ข้อกำหนด

- ใช้ข้อมูลจริงที่ระบบมีอยู่
- ห้ามสร้างตัวเลขใหม่
- ห้ามสร้างชื่อ Table หรือ Field จากการเดา
- Card อาจ Link ไปหน้ารายละเอียด
- ไม่จำเป็นต้องเปิด Modal ทุก Card
- ถ้า Query บางตัวล้มเหลว Card อื่นต้องยังแสดงได้
- ห้ามโหลดทุก Table เพียงเพื่อแสดง KPI ไม่กี่ค่า

---

# 10. Section ดิน น้ำ ตลาด

แสดง KPI Card 4 ใบ

1. ความชื้นดิน
2. สถานการณ์น้ำ
3. ราคาสินค้าเกษตร
4. ราคาน้ำมัน

พฤติกรรม

- กดแล้วเปิด Detail Widget ใน Modal
- Detail Widget โหลดเมื่อเปิดเท่านั้น
- ใช้ Cache เดิมถ้ามีข้อมูล Summary อยู่แล้ว

ข้อกำหนดเฉพาะความชื้นดิน

หากข้อมูลมาจากแบบจำลอง ห้ามใช้คำว่า

```text
ข้อมูลจากเซ็นเซอร์ดิน
```

ให้ใช้ข้อความ

```text
ค่าประมาณความชื้นดินจากแบบจำลองสภาพอากาศ
```

หากมี Ground Sensor จริง จึงใช้คำว่า Sensor ได้

---

# 11. Section เครื่องมือและฐานข้อมูล

รวม Shortcut ที่กระจายอยู่ในหน้าเดิมมาไว้ใน Section เดียว

รายการตัวอย่าง

- Dashboard
- Smart Map
- ค้นหาข้อมูล
- Crop Cost Lab
- คลังความรู้
- ระบบประเมิน
- Farmer Forum
- คู่มือการใช้งาน
- ระบบภายนอกอื่น

แต่ละรายการมี

- Icon
- ชื่อระบบ
- คำอธิบายสั้น
- Route หรือ External URL เดิม

Responsive

- Desktop แสดง 6 ถึง 9 รายการต่อแถวตามพื้นที่
- Tablet แสดง 3 ถึง 4 คอลัมน์
- Mobile แสดง 2 คอลัมน์
- อาจมี Drawer “เครื่องมือทั้งหมด”

ห้ามลบระบบเดิม

---

# 12. Section Map Preview

ห้ามโหลด Leaflet และ `react-leaflet` ใน Initial Landing Bundle

แนวทางหลัก

- ใช้ Static Preview
- แสดงภาพแผนที่หรือ Lightweight Placeholder
- แสดงจำนวนข้อมูลสำคัญ
- แสดงคำอธิบาย
- มีปุ่ม “เปิด Smart Map”

ตัวอย่าง

```text
แผนที่การเกษตรจังหวัดนครปฐม
- พื้นที่เพาะปลูก
- แหล่งน้ำสำคัญ
- จุดความร้อน
- แหล่งท่องเที่ยวเชิงเกษตร
```

เมื่อกดให้ไป Route Smart Map เดิม

แนวทางสำรอง

- มีปุ่ม “เปิดตัวอย่างแผนที่”
- จึงค่อย Lazy Load `LandingMap`

---

# 13. Section ข่าวสารล่าสุด

แสดงข่าวล่าสุด 3 ถึง 5 รายการ

แต่ละรายการแสดง

- ภาพ
- หัวข้อ
- หน่วยงาน
- วันที่
- ลิงก์ต้นทาง

ข้อกำหนด

- ไม่โหลดข่าวจำนวนมากใน Initial Render
- จำกัดจำนวนข้อมูล
- Source หนึ่งล่มต้องไม่ทำให้ทั้ง Section พัง
- มีปุ่ม “ดูข่าวทั้งหมด”
- รักษา Link ต้นทาง

---

# 14. Section บทความหรือองค์ความรู้

แสดงบทความ 3 ถึง 4 รายการ

แต่ละรายการแสดง

- ภาพ
- ชื่อเรื่อง
- หมวดหมู่
- คำอธิบายสั้น
- ปุ่มอ่านต่อ

สามารถใช้ข้อมูลเดิมจากฐานความรู้หรือระบบบทความที่มีอยู่

---

# 15. Section ติดต่อเรา

แสดง

- ที่อยู่
- โทรศัพท์
- Email
- Line Official
- เวลาทำการ
- ภาพสำนักงาน
- Social Links

---

# 16. Footer

Footer ต้องมี

- Logo และชื่อระบบ
- เมนูหลัก
- บริการและเครื่องมือ
- หน่วยงานที่เกี่ยวข้อง
- Social Media
- Copyright
- Privacy Policy
- เงื่อนไขการใช้งาน

---

# 17. Generic KPI Card

สร้าง Component

```jsx
<LandingKpiCard />
```

Interface

```jsx
<LandingKpiCard
  id="weather"
  title="สภาพอากาศ"
  value="31"
  unit="°C"
  status="warning"
  statusLabel="อากาศร้อน"
  secondaryText="โอกาสฝน 60%"
  updatedAt="2026-07-13T10:30:00+07:00"
  sourceLabel="Open-Meteo"
  icon={<WeatherIcon />}
  loading={false}
  error={null}
  interactive
  onClick={handleOpen}
/>
```

Status Types

```js
normal;
success;
warning;
danger;
unavailable;
```

State ที่ต้องรองรับ

1. Loading
2. Success
3. Empty
4. Error

Error State

```text
ไม่สามารถเชื่อมต่อข้อมูล
```

ห้ามแสดงตัวเลขสุ่มแทนข้อมูลจริง

---

# 18. Lazy Loading Architecture

KPI Card และ Detail Widget ต้องแยกไฟล์กันจริง

ห้ามใช้วิธีนี้เป็นหลัก

```jsx
<WeatherWidget mini />
```

ถ้าไฟล์ `WeatherWidget` ยัง import กราฟ แผนที่ และโค้ดทั้งหมด

ให้สร้าง Registry

```js
import { lazy } from 'react';

export const widgetDetailRegistry = {
  weather: {
    title: 'รายละเอียดสภาพอากาศ',
    component: lazy(() => import('../../widgets/WeatherWidget')),
  },
  airQuality: {
    title: 'รายละเอียดคุณภาพอากาศ',
    component: lazy(() => import('../../widgets/AirQualityWidget')),
  },
  hotspots: {
    title: 'รายละเอียดจุดความร้อน',
    component: lazy(() => import('../../widgets/HotspotWidget')),
  },
  prices: {
    title: 'ราคาสินค้าเกษตร',
    component: lazy(() => import('../../widgets/AgriPricesWidget')),
  },
  soilMoisture: {
    title: 'รายละเอียดความชื้นดิน',
    component: lazy(() => import('../../widgets/SoilMoistureWidget')),
  },
  reservoir: {
    title: 'รายละเอียดสถานการณ์น้ำ',
    component: lazy(() => import('../../widgets/DamReservoirWidget')),
  },
};
```

Landing Page ใช้

```jsx
<WidgetDetailHost
  activeWidgetKey={activeWidgetKey}
  open={Boolean(activeWidgetKey)}
  onClose={closeWidget}
/>
```

`WidgetDetailHost` ต้อง

- อ่าน Component จาก Registry
- Mount เฉพาะ Widget ที่ถูกเปิด
- ใช้ `Suspense`
- แสดง Skeleton ระหว่างโหลด
- มี Error Boundary
- ปิดด้วยปุ่ม Close
- ปิดด้วย Escape
- คืน Focus ไป KPI Card เดิม
- Unmount Widget หลังปิด
- ไม่ Preload Widget อื่นโดยไม่จำเป็น

---

# 19. Data Architecture

สร้าง

```text
src/services/landing/landingSummaryService.js
src/hooks/landing/useLandingSummaries.js
```

Functions

```js
getWeatherSummary();
getAirQualitySummary();
getHotspotSummary();
getDiseaseForecastSummary();
getSoilMoistureSummary();
getReservoirSummary();
getMarketSummary();
getProvinceOverviewSummary();
```

Normalized Result

```js
{
  value: 31,
  unit: '°C',
  status: 'warning',
  statusLabel: 'อากาศร้อน',
  secondaryText: 'โอกาสฝน 60%',
  updatedAt: '2026-07-13T10:30:00+07:00',
  sourceLabel: 'Open-Meteo'
}
```

ข้อกำหนด

- แยก Fetch Logic ออกจาก UI
- ห้าม Copy Fetch Logic ซ้ำ
- ใช้ Service หรือ Query Function กลาง
- ใช้ API เดิม
- ใช้ Supabase Client เดิม
- ใช้ `Promise.allSettled` สำหรับ Query ที่เป็นอิสระ
- Error ของข้อมูลหนึ่งตัวต้องไม่ทำให้ทั้งหมดล้ม
- ห้ามใช้ Random Fallback ใน Production

---

# 20. React Query

ใช้ TanStack React Query

ตัวอย่าง

```js
useQuery({
  queryKey: ['landing-summary', 'weather', 'nakhon-pathom'],
  queryFn: getWeatherSummary,
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
  retry: 1,
});
```

ค่าแนะนำ

| ข้อมูล       |        staleTime |
| ------------ | ---------------: |
| สภาพอากาศ    |          30 นาที |
| PM2.5        |   15 ถึง 30 นาที |
| จุดความร้อน  |          30 นาที |
| โรคและแมลง   |  1 ถึง 6 ชั่วโมง |
| ความชื้นดิน  |   30 ถึง 60 นาที |
| สถานการณ์น้ำ |        1 ชั่วโมง |
| ราคาสินค้า   |  1 ถึง 6 ชั่วโมง |
| สถิติจังหวัด | 6 ถึง 24 ชั่วโมง |

Query Keys

```js
['landing-summary', 'weather', locationKey][
  ('landing-summary', 'air-quality', locationKey)
][('landing-summary', 'hotspots', period)][
  ('landing-summary', 'soil-moisture', locationKey)
][('landing-summary', 'reservoir')][('landing-summary', 'market', category)];
```

Detail Query

```js
enabled: open;
```

ห้ามใช้ Timestamp ใน Query Key

---

# 21. Widget Interaction Matrix

| Widget              | พฤติกรรม                            |
| ------------------- | ----------------------------------- |
| Weather             | เปิด Modal                          |
| Air Quality         | เปิด Modal                          |
| Hotspot Summary     | เปิด Modal                          |
| Hotspot Advanced    | ไปหน้าเต็ม                          |
| Disease Forecast    | Modal หรือหน้าเต็มตามข้อมูล         |
| Soil Moisture       | เปิด Modal                          |
| Reservoir           | เปิด Modal                          |
| Agricultural Prices | เปิด Modal                          |
| Oil Prices          | เปิด Modal                          |
| Smart Map           | ไปหน้าเต็ม                          |
| Dashboard           | ไปหน้าเต็ม                          |
| Search              | ไปหน้า Public Search หรือแจ้ง Login |
| News                | ไปหน้าข่าวหรือลิงก์ต้นทาง           |

---

# 22. Responsive Design

## Desktop ตั้งแต่ 1200px

- KPI Grid 4 คอลัมน์
- Province KPI 4 ถึง 6 คอลัมน์
- Modal กว้างไม่เกิน 960px หรือ 90vw
- Section มี White Space ชัดเจน

## Tablet 768px ถึง 1199px

- KPI Grid 2 คอลัมน์
- Tool Grid 3 ถึง 4 คอลัมน์
- Modal 90vw

## Mobile ต่ำกว่า 768px

- KPI Grid 2 คอลัมน์
- หน้าจอต่ำกว่า 360px ใช้ 1 คอลัมน์
- Modal เกือบเต็มหน้าจอ
- ปุ่ม Close ต้องชัด
- ไม่มี Horizontal Overflow
- Touch Target อย่างน้อย 44px

ขนาดแนะนำ

- KPI Value 26 ถึง 32px
- Card Title 14 ถึง 16px
- Secondary Text 12 ถึง 14px
- Card Height 120 ถึง 150px
- Mobile Card Height 108 ถึง 135px

---

# 23. Accessibility

KPI Card ที่กดได้ต้องเป็น `<button>`

ตัวอย่าง

```jsx
<button
  type="button"
  aria-haspopup="dialog"
  aria-label="ดูรายละเอียดสภาพอากาศ"
>
```

ต้องรองรับ

- Tab
- Enter
- Space
- Escape
- Focus Visible
- Focus Restoration
- Screen Reader
- Reduced Motion
- Contrast ที่อ่านได้

ห้ามใช้สีอย่างเดียวเพื่อสื่อสถานะ

---

# 24. Error Handling

แยก Error อย่างน้อย

1. Network Error
2. API Response Error
3. Empty Data
4. Invalid Data
5. Lazy Chunk Error
6. Location Permission Error
7. Timeout

Lazy Chunk Error Message

```text
ไม่สามารถโหลดรายละเอียดได้ กรุณาลองใหม่อีกครั้ง
```

ต้องมีปุ่ม Retry

Widget ตัวเดียวล้ม ห้ามทำให้ Landing Page ล้มทั้งหน้า

---

# 25. Mock Data Policy

ห้ามใช้ Random Mock Data ใน Production

ใช้ Mock Data ได้เฉพาะ

- Unit Test
- Integration Test
- Development Fixture
- Storybook ถ้ามี

ถ้าแสดงข้อมูลจำลอง ต้องมีคำว่า

```text
ข้อมูลจำลอง
```

ชัดเจน

Production Error Result

```js
{
  value: null,
  unit: '',
  status: 'unavailable',
  statusLabel: 'ไม่สามารถเชื่อมต่อข้อมูล',
  secondaryText: '',
  updatedAt: null,
  sourceLabel: 'GISTDA'
}
```

---

# 26. CSS Architecture

สร้าง

```text
src/components/landing/kpi/LandingKpiCard.css
src/components/landing/LandingSections.css
src/components/landing/details/WidgetDetailHost.css
```

หลีกเลี่ยง

- Inline Style จำนวนมาก
- Global Selector
- `!important`
- CSS ซ้ำ
- Class เก่าที่ไม่ใช้
- Selector ที่กระทบหน้าอื่น

หลังระบบใหม่ผ่าน Test แล้ว จึงลบ Dead CSS ทีละส่วน

---

# 27. Expected File Structure

```text
src/
├── components/
│   └── landing/
│       ├── kpi/
│       │   ├── LandingKpiCard.jsx
│       │   ├── LandingKpiCard.css
│       │   ├── LandingKpiGrid.jsx
│       │   └── LandingKpiSkeleton.jsx
│       ├── details/
│       │   ├── WidgetDetailHost.jsx
│       │   ├── WidgetDetailHost.css
│       │   ├── WidgetDetailErrorBoundary.jsx
│       │   └── widgetDetailRegistry.js
│       ├── sections/
│       │   ├── SituationKpiSection.jsx
│       │   ├── ProvinceOverviewSection.jsx
│       │   ├── ResourceMarketSection.jsx
│       │   ├── LandingToolsSection.jsx
│       │   ├── MapPreviewSection.jsx
│       │   ├── NewsPreviewSection.jsx
│       │   ├── KnowledgePreviewSection.jsx
│       │   └── ContactSection.jsx
│       └── LandingSections.css
├── hooks/
│   └── landing/
│       ├── useLandingWidgetController.js
│       └── useLandingSummaries.js
├── services/
│   └── landing/
│       └── landingSummaryService.js
├── config/
│   ├── landingWidgetCatalog.js
│   └── landingToolsCatalog.js
└── pages/
    └── LandingPage.jsx
```

Widget ตัวเต็มยังอยู่ใน

```text
src/components/widgets/
```

---

# 28. Performance Requirements

หลังปรับปรุงต้องได้ผล

1. ไม่มี Detail Widget Mount ตอน Initial Render
2. Detail Widget Bundle ไม่โหลดก่อนกด
3. Leaflet ไม่อยู่ใน Initial Landing Chunk
4. ECharts ไม่โหลดถ้า Initial View ไม่มีกราฟ
5. Initial API Request มีเฉพาะ Summary Data
6. ไม่มี API Request ซ้ำโดยไม่จำเป็น
7. ไม่มี Random Mock Data
8. API บางแหล่งล่ม หน้าแรกยังใช้งานได้
9. ไม่มี Horizontal Overflow
10. Build ไม่มี Error ใหม่

เป้าหมาย

- ลด Initial JavaScript อย่างน้อย 25%
- ลด Initial API Request อย่างน้อย 30%
- ลด DOM Nodes
- Lighthouse Accessibility อย่างน้อย 90
- Route เดิมไม่ Regression

ต้องบันทึก

- Initial JavaScript Transferred
- Number of Requests
- DOM Node Count
- Lighthouse Performance
- Lighthouse Accessibility

---

# 29. Testing Requirements

## Unit Tests

- KPI Loading State
- KPI Success State
- KPI Error State
- KPI Empty State
- Keyboard Interaction
- Registry Mapping
- Detail ไม่ Mount ก่อนเปิด
- Detail Mount เมื่อกด
- Detail Unmount เมื่อปิด
- Error ไม่กลายเป็น Random Mock
- Data Normalization

## Integration Tests

- Section แสดงตามลำดับ
- Weather Card เปิด Weather Detail
- Air Quality Card เปิด Air Quality Detail
- Focus กลับ Card หลังปิด
- เปิด Widget หนึ่งตัว อีกตัวไม่ Mount
- Cache ไม่ Request ซ้ำ

## Playwright Tests

Viewport

- 360 x 800
- 768 x 1024
- 1440 x 900

ตรวจ

- ไม่มี Horizontal Overflow
- KPI อ่านได้
- Modal เปิดและปิดได้
- Escape ปิด Modal
- Focus Restoration
- Smart Map Route
- Tool Shortcuts
- News ไม่เกิน 5 รายการ

---

# 30. Acceptance Criteria

งานเสร็จเมื่อ

- Landing Page ใช้โครงสร้างใหม่
- Widget ใหญ่ถูกแทนด้วย KPI Card
- Detail Widget ใช้ `React.lazy`
- Detail Widget ไม่โหลดก่อนกด
- Modal ใช้งานได้
- Mobile Responsive
- Keyboard Accessible
- ไม่มี Random Mock Data
- แหล่งข้อมูลถูกต้อง
- Soil Moisture ไม่อ้าง Sensor ถ้าไม่ใช่ Sensor
- Route เดิมทำงาน
- Unit Tests ผ่าน
- Integration Tests ผ่าน
- Playwright ผ่าน
- ESLint ผ่าน
- Production Build ผ่าน
- มี Performance Before and After
- มีรายการไฟล์ที่แก้ไข
- ไม่มี Dependency ใหม่โดยไม่จำเป็น

---

# 31. Implementation Plan

## Task 1: ตรวจสอบระบบเดิมและสร้าง Baseline

### ตรวจสอบ

- `src/pages/LandingPage.jsx`
- `src/App.jsx`
- `src/components/widgets/*.jsx`
- `useDashboardData`
- `useApiCache`
- Landing CSS
- Existing Tests
- `package.json`

### ขั้นตอน

- [ ] เปิด Landing Page
- [ ] บันทึก Widget ที่ Mount
- [ ] บันทึก Initial API Requests
- [ ] บันทึก JavaScript Transferred
- [ ] บันทึก Leaflet และ ECharts Chunks
- [ ] บันทึก DOM Node Count
- [ ] รัน Lighthouse
- [ ] สร้าง `docs/performance/landing-before.md`

### คำสั่ง

```bash
npm install
npm run lint:src
npm test
npm run build
```

### Commit

```bash
git add docs/performance/landing-before.md
git commit -m "docs: capture landing page performance baseline"
```

---

## Task 2: สร้าง Generic KPI Components

### สร้าง

```text
src/components/landing/kpi/LandingKpiCard.jsx
src/components/landing/kpi/LandingKpiCard.css
src/components/landing/kpi/LandingKpiGrid.jsx
src/components/landing/kpi/LandingKpiSkeleton.jsx
```

### Test ก่อน Implementation

- [ ] Loading State
- [ ] Success State
- [ ] Error State
- [ ] Empty State
- [ ] Interactive Card เป็น Button
- [ ] Enter เรียก `onClick`
- [ ] Space เรียก `onClick`
- [ ] Focus Visible
- [ ] Accessible Label

### คำสั่ง

```bash
npm test -- LandingKpiCard
npm run lint:src
```

### Commit

```bash
git add src/components/landing/kpi
git add <test-files>
git commit -m "feat: add reusable landing KPI card"
```

---

## Task 3: สร้าง Widget Detail Host

### สร้าง

```text
src/components/landing/details/WidgetDetailHost.jsx
src/components/landing/details/WidgetDetailHost.css
src/components/landing/details/WidgetDetailErrorBoundary.jsx
src/components/landing/details/widgetDetailRegistry.js
src/hooks/landing/useLandingWidgetController.js
```

### Controller

```js
const { activeWidgetKey, openWidget, closeWidget } =
  useLandingWidgetController();
```

### Test

- [ ] Detail ไม่ Mount เมื่อปิด
- [ ] Registry โหลด Key ที่ถูกต้อง
- [ ] Escape ปิด Modal
- [ ] ปิดแล้ว Unmount
- [ ] Focus กลับ Card
- [ ] Invalid Key แสดง Error
- [ ] Lazy Chunk Error มี Retry

### Commit

```bash
git add src/components/landing/details
git add src/hooks/landing/useLandingWidgetController.js
git add <test-files>
git commit -m "feat: add lazy landing widget detail host"
```

---

## Task 4: สร้าง Summary Data Layer

### สร้าง

```text
src/services/landing/landingSummaryService.js
src/hooks/landing/useLandingSummaries.js
src/config/landingWidgetCatalog.js
```

### Functions

```js
getWeatherSummary();
getAirQualitySummary();
getHotspotSummary();
getDiseaseForecastSummary();
getSoilMoistureSummary();
getReservoirSummary();
getMarketSummary();
getProvinceOverviewSummary();
```

### Test

- [ ] API Error คืน `unavailable`
- [ ] Invalid Data ไม่กลายเป็น Random
- [ ] Normalization ถูกต้อง
- [ ] Partial Failure ไม่ทำให้ทั้งหมดล้ม
- [ ] Query Key คงที่
- [ ] ไม่มี Timestamp ใน Query Key

### Commit

```bash
git add src/services/landing
git add src/hooks/landing
git add src/config/landingWidgetCatalog.js
git add <test-files>
git commit -m "refactor: add shared landing summary data layer"
```

---

## Task 5: ทำ Weather เป็น Reference Implementation

### แก้ไข

```text
src/components/widgets/WeatherWidget.jsx
src/pages/LandingPage.jsx
```

### สร้าง

```text
src/components/landing/sections/SituationKpiSection.jsx
```

### ขั้นตอน

- [ ] Weather Widget ใช้ Query กลาง
- [ ] สร้าง Weather KPI
- [ ] แสดง Temperature
- [ ] แสดง Rain Probability
- [ ] แสดง Source
- [ ] แสดง Updated Time
- [ ] กด Card เปิด Weather Detail
- [ ] Landing Page ไม่มี Direct Import
- [ ] Detail Chunk ไม่โหลดก่อนกด
- [ ] เปิดแล้วโหลดครั้งเดียว

### คำสั่ง

```bash
npm test -- Weather
npm run lint:src
npm run build
```

### Commit

```bash
git add src/components/widgets/WeatherWidget.jsx
git add src/components/landing/sections/SituationKpiSection.jsx
git add src/pages/LandingPage.jsx
git add <test-files>
git commit -m "feat: convert weather widget to lazy KPI detail flow"
```

---

## Task 6: เพิ่ม Air Quality, Hotspot และ Disease Forecast

### แก้ไข

```text
src/components/widgets/AirQualityWidget.jsx
src/components/widgets/HotspotWidget.jsx
src/components/landing/sections/SituationKpiSection.jsx
```

### ขั้นตอน

- [ ] เพิ่ม Air Quality KPI
- [ ] เพิ่ม Hotspot KPI
- [ ] เพิ่ม Disease Forecast KPI
- [ ] Desktop 4 Columns
- [ ] Tablet 2 Columns
- [ ] Mobile 2 Columns
- [ ] แสดง Source และ Updated Time
- [ ] Hotspot Error แสดง Unavailable
- [ ] ลบ Random Hotspot Fallback
- [ ] Air Quality Mock ต้องไม่แสดงเป็นข้อมูลจริง
- [ ] เพิ่ม Link ไปหน้าวิเคราะห์จุดความร้อนเดิม
- [ ] ทดสอบเปิด Widget ทีละตัว

### Commit

```bash
git add src/components/widgets/AirQualityWidget.jsx
git add src/components/widgets/HotspotWidget.jsx
git add src/components/landing/sections/SituationKpiSection.jsx
git add <disease-widget-path>
git add <test-files>
git commit -m "feat: add daily situation KPI cards"
```

---

## Task 7: สร้าง Province Overview Section

### สร้าง

```text
src/components/landing/sections/ProvinceOverviewSection.jsx
```

### ขั้นตอน

- [ ] ตรวจ Metrics ที่มีจริง
- [ ] เลือก 4 ถึง 6 Metrics
- [ ] สร้าง Focused Query
- [ ] ลด Sequential Query
- [ ] ใช้ Parallel Query เมื่อปลอดภัย
- [ ] ไม่โหลดทุก Dataset
- [ ] แสดง Partial Data ได้
- [ ] ผูก Route เดิม

### Commit

```bash
git add src/components/landing/sections/ProvinceOverviewSection.jsx
git add <dashboard-data-hook-path>
git add src/pages/LandingPage.jsx
git add <test-files>
git commit -m "feat: add lightweight province overview KPIs"
```

---

## Task 8: สร้าง Resource and Market Section

### สร้าง

```text
src/components/landing/sections/ResourceMarketSection.jsx
```

### แก้ไข

```text
src/components/widgets/AgriPricesWidget.jsx
src/components/widgets/SoilMoistureWidget.jsx
src/components/widgets/DamReservoirWidget.jsx
```

### ขั้นตอน

- [ ] Soil Moisture KPI
- [ ] Reservoir KPI
- [ ] Agricultural Price KPI
- [ ] Oil Price KPI
- [ ] เปิด Detail ผ่าน Lazy Modal
- [ ] แก้คำว่า Sensor ให้ถูกต้อง
- [ ] ลบ Random Soil Moisture Fallback
- [ ] แสดง Source
- [ ] Mobile Modal ใช้งานได้
- [ ] API Error ไม่สร้างค่าจำลอง

### Commit

```bash
git add src/components/landing/sections/ResourceMarketSection.jsx
git add src/components/widgets/AgriPricesWidget.jsx
git add src/components/widgets/SoilMoistureWidget.jsx
git add src/components/widgets/DamReservoirWidget.jsx
git add <test-files>
git commit -m "feat: add soil water and market KPI section"
```

---

## Task 9: สร้าง Tools, Map Preview, News และ Knowledge

### สร้าง

```text
src/components/landing/sections/LandingToolsSection.jsx
src/components/landing/sections/MapPreviewSection.jsx
src/components/landing/sections/NewsPreviewSection.jsx
src/components/landing/sections/KnowledgePreviewSection.jsx
```

### ขั้นตอน

- [ ] รวม Shortcut เดิม
- [ ] รักษา Route เดิม
- [ ] Mobile 2 Columns
- [ ] Map เป็น Lightweight Preview
- [ ] Leaflet ไม่โหลด Initial
- [ ] News ไม่เกิน 5 รายการ
- [ ] Knowledge ไม่เกิน 4 รายการ
- [ ] Source ล้มบางตัว หน้าไม่พัง
- [ ] Link ต้นทางยังทำงาน

### Commit

```bash
git add src/components/landing/sections
git add <test-files>
git commit -m "feat: simplify landing tools map news and knowledge sections"
```

---

## Task 10: สร้าง Contact Section และ Footer

### สร้างหรือแยก

```text
src/components/landing/sections/ContactSection.jsx
src/components/landing/LandingFooter.jsx
```

### ขั้นตอน

- [ ] แสดงข้อมูลติดต่อเดิม
- [ ] Link Social ทำงาน
- [ ] Footer Responsive
- [ ] External Link ปลอดภัย
- [ ] Keyboard Accessible

### Commit

```bash
git add src/components/landing/sections/ContactSection.jsx
git add src/components/landing/LandingFooter.jsx
git commit -m "refactor: organize landing contact and footer sections"
```

---

## Task 11: Refactor LandingPage

### แก้ไข

```text
src/pages/LandingPage.jsx
src/pages/LandingPage.css
src/pages/LandingPage.premium.css
src/pages/SaastyTheme.css
```

### Landing Page เป้าหมาย

```jsx
function LandingPage() {
  const widgetController = useLandingWidgetController();

  return (
    <>
      <LandingHeader />
      <LandingHero />
      <SituationKpiSection onOpenWidget={widgetController.openWidget} />
      <ProvinceOverviewSection />
      <ResourceMarketSection onOpenWidget={widgetController.openWidget} />
      <LandingToolsSection />
      <MapPreviewSection />
      <NewsPreviewSection />
      <KnowledgePreviewSection />
      <ContactSection />
      <LandingFooter />

      <WidgetDetailHost
        activeWidgetKey={widgetController.activeWidgetKey}
        open={Boolean(widgetController.activeWidgetKey)}
        onClose={widgetController.closeWidget}
      />
    </>
  );
}
```

### ขั้นตอน

- [ ] ลบ Direct Import ของ Detail Widgets
- [ ] ย้าย Modal Logic
- [ ] ย้าย Static Arrays ไป Config
- [ ] ย้าย Data Fetch Logic ออกจาก Landing Page
- [ ] ลบ State ที่ไม่ใช้
- [ ] ตรวจ Dead CSS
- [ ] ลบ CSS ทีละส่วน
- [ ] ห้ามเพิ่ม `!important`
- [ ] ตรวจ Responsive

### Commit

```bash
git add src/pages/LandingPage.jsx
git add src/components/landing
git add <landing-css-files>
git commit -m "refactor: compose landing page from lightweight sections"
```

---

## Task 12: Accessibility and E2E Tests

### Test Viewport

- [ ] 360 x 800
- [ ] 768 x 1024
- [ ] 1440 x 900

### Test Cases

- [ ] ไม่มี Horizontal Overflow
- [ ] KPI 4 ใบแรกแสดง
- [ ] Keyboard เปิด Weather Modal
- [ ] Escape ปิด Modal
- [ ] Focus Restoration
- [ ] Air Quality Modal
- [ ] Smart Map Navigation
- [ ] Tool Shortcuts
- [ ] News ไม่เกิน 5
- [ ] API Error State
- [ ] Lazy Chunk Error State

### คำสั่ง

```bash
npm run test:e2e
```

### Commit

```bash
git add <playwright-test-files>
git commit -m "test: cover KPI landing interactions and responsiveness"
```

---

## Task 13: Performance Verification

### ขั้นตอน

- [ ] รัน ESLint
- [ ] รัน Unit Tests
- [ ] รัน Playwright
- [ ] รัน Production Build
- [ ] ตรวจ Bundle
- [ ] ตรวจ Initial Requests
- [ ] ตรวจ Leaflet Chunk
- [ ] ตรวจ ECharts Chunk
- [ ] รัน Lighthouse
- [ ] เปรียบเทียบ Baseline
- [ ] สร้าง `docs/performance/landing-after.md`
- [ ] ระบุเป้าหมายที่ทำไม่ได้พร้อมเหตุผลจริง
- [ ] ตรวจ Random Mock Data
- [ ] ตรวจ Soil Source Label
- [ ] ตรวจ Route เดิม

### คำสั่ง

```bash
npm run lint:src
npm test
npm run test:e2e
npm run build
```

### ผลที่ต้องได้

```text
ESLint: PASS
Vitest: PASS
Playwright: PASS
Vite production build: PASS
```

### Commit

```bash
git add docs/performance/landing-after.md
git add .
git commit -m "perf: complete lightweight KPI landing page"
```

---

# 32. Development Rules สำหรับ AI

1. อ่านไฟล์เดิมก่อนแก้
2. ทำงานทีละ Task
3. เขียน Test ก่อน Behavior สำคัญ
4. Commit หลังแต่ละ Task
5. เริ่มจาก Weather เป็น Reference
6. ห้ามแก้ทุก Widget ใน Commit เดียว
7. ห้ามลบระบบเดิมก่อนระบบใหม่ผ่าน Test
8. ห้ามเปลี่ยน Production Data เพื่อให้ Test ผ่าน
9. ห้ามซ่อน Error ด้วย Mock Data
10. ห้ามสร้าง Route ใหม่จากการเดา
11. ห้ามสร้าง Table หรือ Field ใหม่จากการเดา
12. ห้ามติดตั้ง Dependency ใหม่โดยไม่จำเป็น
13. ทุก Task ต้องสรุปผลก่อนเริ่ม Task ถัดไป
14. ถ้า Test ล้ม ต้องแก้ก่อนดำเนินการต่อ
15. ถ้า Build ล้ม ห้ามรายงานว่างานเสร็จ

---

# 33. Final Report ที่ AI ต้องส่งกลับ

## 1. สิ่งที่เปลี่ยน

อธิบาย Architecture และ Sections ใหม่

## 2. ไฟล์ที่สร้าง

แสดง Path และหน้าที่

## 3. ไฟล์ที่แก้ไข

แสดง Path และเหตุผล

## 4. Widget ที่ใช้ Lazy Loading

แสดง Widget และ Chunk Behavior

## 5. Data Sources

แสดง Source ของ KPI ทุกใบ

## 6. Mock Data ที่ลบ

แสดงตำแหน่งที่เคยใช้ Random หรือ Simulated Fallback

## 7. Test Results

```text
npm run lint:src
npm test
npm run test:e2e
npm run build
```

## 8. Performance Before and After

เปรียบเทียบ

- JavaScript Transferred
- API Request Count
- DOM Node Count
- Lighthouse Performance
- Lighthouse Accessibility

## 9. ข้อจำกัดที่เหลือ

รายงานตามจริง

ห้ามอ้างว่างานผ่าน หากยังมี Test หรือ Build ล้มเหลว

---

# 34. คำสั่งเริ่มต้นสำหรับ AI Coding Agent

คัดลอกข้อความนี้ไปใช้ก่อนแนบเอกสาร

```text
อ่านเอกสาร NPT Smart Agri Landing Page KPI Hub Technical Specification and Implementation Plan ทั้งหมดก่อนเริ่มงาน

จากนั้นตรวจสอบ Repository จริงและเปรียบเทียบกับเอกสาร ห้ามเดา Path, Route, Export, API Field, Database Table หรือ Data Source

ดำเนินงานตาม Task 1 ถึง Task 13 ตามลำดับ ใช้ Test-Driven Development สำหรับพฤติกรรมสำคัญ ทำ Commit แยกตาม Task และหยุดแก้ไขทันทีถ้า Test หรือ Build ล้มเหลว โดยต้องแก้ให้ผ่านก่อนเริ่ม Task ถัดไป

จุดสำคัญที่สุดคือ
1. Initial Landing Page ต้องไม่โหลด Detail Widgets
2. Leaflet และ ECharts ต้องไม่อยู่ใน Initial Landing Bundle ถ้าไม่ได้ใช้บน Initial View
3. ไม่มี Random Mock Data ใน Production
4. KPI Card ต้องแสดง Source และ Updated Time
5. Widget รายละเอียดต้อง Lazy Load เมื่อกด
6. Route เดิมต้องไม่เสีย
7. Mobile และ Keyboard ต้องใช้งานได้
8. ต้องมี Performance Before and After
```
