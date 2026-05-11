# 06 การสร้าง Dashboard, Search และ AI Chatbot

ไฟล์นี้เป็นคู่มือการสร้างและปรับแต่ง 3 ส่วนสำคัญของระบบ `npt_dashboard` ได้แก่ Dashboard, Global Search และ AI Chatbot หลังจากติดตั้งโปรเจกต์และเชื่อม Supabase ตามบท 05 แล้ว

บทนี้เขียนจากโครงสร้างโค้ดจริงของโปรเจกต์ เพื่อให้ทีมพัฒนาหรือเจ้าหน้าที่ที่ดูแลระบบเข้าใจว่า “ข้อมูลจาก Supabase ไหลไปแสดงผลใน Dashboard ได้อย่างไร”, “Search ค้นหาข้ามตารางอย่างไร” และ “AI Chatbot ดึงข้อมูลจริงจากฐานข้อมูลไปตอบคำถามอย่างไร”

## 1. เป้าหมายของบทนี้

เมื่ออ่านและทำตามบทนี้จบ ควรทำได้ดังนี้

- เข้าใจภาพรวมของ Dashboard, Search และ AI Chatbot
- รู้ว่าไฟล์ใดรับผิดชอบส่วนใดของระบบ
- เพิ่มตารางใหม่เข้า Dashboard ได้
- เพิ่มตารางใหม่เข้า Global Search ได้
- เพิ่มตารางใหม่ให้ AI Chatbot อ่านและสรุปข้อมูลได้
- ตรวจสอบปัญหาข้อมูลไม่ขึ้น กราฟไม่แสดง Search ไม่เจอ หรือ AI ตอบไม่ตรงข้อมูลได้
- เข้าใจหลักการลดข้อมูลก่อนส่งเข้า AI เพื่อไม่ให้ส่งข้อมูลดิบเยอะเกินจำเป็น
- วางแนวทางพัฒนา Dashboard/Search/AI ต่อในอนาคตได้อย่างเป็นระบบ

## 2. ภาพรวมการทำงานทั้ง 3 ส่วน

ระบบนี้มี 3 ชั้นการใช้งานข้อมูลหลัก

```text
Supabase Database
  ↓
Service / Hook / Selector Layer
  ↓
Dashboard, Search, AI Chatbot
```

แยกตามโมดูลได้ดังนี้

| ส่วน | หน้าที่ | ไฟล์หลัก |
|---|---|---|
| Dashboard | แสดงภาพรวม กราฟ แผนที่ widget และข้อมูลรายอำเภอ | `src/pages/Dashboard.jsx`, `src/pages/InteractiveDashboard.jsx`, `src/hooks/useDashboardData.js` |
| Data Management | แสดงตาราง เพิ่ม แก้ ลบ import/export CSV/Excel | `src/components/DataTable/CrudTable.jsx`, `src/components/DataTable/CsvImportModal.jsx` |
| Global Search | ค้นหาข้ามหลายตารางในระบบ | `src/pages/SearchResults.jsx`, `src/services/globalSearchService.js` |
| AI Chatbot | วิเคราะห์คำถาม ดึงข้อมูลจากฐานข้อมูล และให้ AI ตอบจากข้อมูลจริง | `src/pages/Chatbot.jsx`, `src/services/chatbotDataService.js`, `src/services/aiService.js` |
| AI Proxy | รับคำขอจาก frontend แล้วส่งต่อไปยัง provider เช่น Gemini/OpenRouter/NVIDIA | `netlify/functions/ai-proxy.js` |
| Config กลาง | เก็บชื่อ table, field ค้นหา, field ตัวเลข, model และ system prompt | `src/utils/chatbotConstants.js` |

หลักคิดสำคัญคือ ข้อมูลหนึ่งชุดไม่ควรถูกผูกกับหน้าเดียวเท่านั้น แต่ควรออกแบบให้ใช้ซ้ำได้ทั้ง Dashboard, Search และ AI

ตัวอย่างเช่น ตาราง `large_plots` ควรใช้ได้ในหลายส่วน

```text
large_plots
  → หน้า Data Management ของแปลงใหญ่
  → Dashboard สรุปจำนวนแปลงใหญ่ พื้นที่ สมาชิก
  → Interactive Dashboard กราฟตามอำเภอหรือประเภทสินค้า
  → Search ค้นหาชื่อแปลง สินค้า หน่วยงาน
  → AI Chatbot ตอบคำถาม เช่น แปลงใหญ่มีกี่แปลง แยกตามสินค้า
```

## 3. ภาพรวม Dashboard ในระบบนี้

Dashboard มี 2 แบบหลัก

| หน้า | URL | ลักษณะ |
|---|---|---|
| Dashboard รวมภายใน | `/dashboard` | ใช้หลัง login แสดง widget, สรุปกลุ่มงาน, แผนที่, กราฟ และปุ่ม export PDF |
| Interactive Dashboard สาธารณะ | `/interactive-dashboard` | หน้า public ที่มีตัวกรองอำเภอ กราฟหลายรูปแบบ และใช้ข้อมูลสรุปจาก hook เดียวกัน |

ไฟล์สำคัญ

```text
src/pages/Dashboard.jsx
src/pages/InteractiveDashboard.jsx
src/hooks/useDashboardData.js
src/hooks/dashboard/config.js
src/hooks/dashboard/dataFetchers.js
src/hooks/dashboard/selectors.js
src/hooks/useApiCache.js
```

### 3.1 Flow การโหลด Dashboard

```text
ผู้ใช้เปิดหน้า Dashboard
  ↓
Dashboard.jsx หรือ InteractiveDashboard.jsx เรียก useDashboardData()
  ↓
useDashboardData() เรียก fetchDashboardData()
  ↓
fetchDashboardData() ดึงข้อมูลจาก Supabase หลายตาราง
  ↓
dataFetchers.js ดึง count, chart data, map data, community data
  ↓
selectors.js รวมยอดและจัดรูปข้อมูลรายอำเภอ
  ↓
Dashboard.jsx / InteractiveDashboard.jsx นำข้อมูลไปแสดงเป็น card, chart, map
```

### 3.2 จุดรวม config ของ Dashboard

ไฟล์

```text
src/hooks/dashboard/config.js
```

มีค่าหลัก

```js
DISTRICT_LIST
groupConfig
PIE_COLORS
allTables
normalizeDistrict()
createEmptyDistrictStats()
```

`groupConfig` คือรายการกลุ่มงานและตารางที่ Dashboard ใช้นับจำนวน

ตัวอย่างแนวคิด

```js
{
  group: 'ส่งเสริมการผลิต',
  tables: [
    { table: 'large_plots', label: 'แปลงใหญ่' },
    { table: 'certifications', label: 'มาตรฐาน GAP' },
    { table: 'crop_production', label: 'ผลผลิตพืช' },
  ]
}
```

ถ้าเพิ่มตารางใหม่และต้องการให้ขึ้นจำนวนรวมใน Dashboard ให้เริ่มจากตรวจ `groupConfig` ก่อน

### 3.3 ข้อควรระวังเรื่องชื่ออำเภอ

Dashboard ใช้ `DISTRICT_LIST` เป็นฐานในการสร้างสถิติรายอำเภอ

รายชื่ออำเภอควรตรงกันทุกจุด

```text
เมืองนครปฐม
กำแพงแสน
นครชัยศรี
ดอนตูม
บางเลน
สามพราน
พุทธมณฑล
```

ถ้าข้อมูลใน Supabase ใช้ชื่อไม่ตรงกับ `DISTRICT_LIST` กราฟรายอำเภออาจนับไม่เข้า bucket ของอำเภอนั้น

ตัวอย่างปัญหา

| ข้อมูลใน database | ค่าใน config | ผลที่เกิดขึ้น |
|---|---|---|
| `นครชัยศรี` | `นครชัยศริ` | นับข้อมูลไม่เข้าอำเภอ หรือกราฟแสดง 0 |
| `อ.เมืองนครปฐม` | `เมืองนครปฐม` | นับไม่ตรง ถ้าไม่มี normalize |
| `เมือง` | `เมืองนครปฐม` | ต้องใช้ `normalizeDistrict()` ช่วยแปลง |

แนวทางที่ควรใช้

- กำหนดชื่ออำเภอมาตรฐานในข้อมูลตั้งแต่ตอน clean ข้อมูล
- ตรวจ spelling ใน `DISTRICT_LIST`
- ใช้ `normalizeDistrict()` สำหรับกรณีชื่อย่อ เช่น `เมือง` → `เมืองนครปฐม`
- ถ้ามีหลายรูปแบบ ควรเพิ่ม mapping ใน `normalizeDistrict()` ไม่ควรแก้เฉพาะหน้าเดียว

## 4. การดึงข้อมูลเข้า Dashboard

ไฟล์ที่ทำหน้าที่ดึงข้อมูลหลักคือ

```text
src/hooks/dashboard/dataFetchers.js
```

มี function สำคัญ

| function | ใช้ทำอะไร |
|---|---|
| `fetchPublicCertificationsCount()` | ดึงจำนวน certification จาก API public ถ้าใช้ได้ |
| `fetchAllCounts(supabase)` | นับจำนวนแถวของทุกตารางใน `allTables` |
| `fetchChartData(supabase)` | ดึงข้อมูลที่ใช้ทำ pie chart และ chart หลัก |
| `fetchMapData(supabase)` | ดึงข้อมูลพิกัดจาก `gis_areas` และ `agri_tourism` |
| `fetchCommunityData(supabase)` | ดึงข้อมูลหลายตารางสำหรับสรุปรายอำเภอ |

### 4.1 การนับจำนวนข้อมูลทุกตาราง

Dashboard นับจำนวนแถวด้วย pattern นี้

```js
supabase
  .from(tbl.table)
  .select('*', { count: 'exact', head: true })
```

ข้อดี

- ได้เฉพาะจำนวน ไม่ต้องดึงข้อมูลทุกแถว
- เหมาะกับ card สรุปจำนวน
- ลด payload จาก Supabase

ข้อควรระวัง

- ถ้า RLS ไม่อนุญาตให้อ่าน ตารางนั้นจะนับเป็น 0 หรือ error
- ถ้าตารางยังไม่ถูกสร้าง จะ error และ Dashboard อาจแสดง 0
- ถ้า table name ใน config สะกดไม่ตรงกับ Supabase จะนับไม่ได้

### 4.2 การดึงข้อมูลสำหรับกราฟ

ตัวอย่างใน `fetchChartData()`

```js
supabase
  .from('agricultural_areas')
  .select('rice_in_season_rai, rice_off_season_rai, field_crops_rai, horticulture_rai, fruit_trees_rai, vegetables_rai, flowers_rai, herbs_spices_rai')
```

หลักคิดคือ ดึงเฉพาะคอลัมน์ที่จำเป็นสำหรับกราฟ ไม่ดึง `*` ถ้าไม่จำเป็น

ถ้าจะสร้างกราฟใหม่ ควรตอบคำถามก่อนว่า

1. กราฟต้องใช้ตารางใด
2. ต้องใช้ field ใดบ้าง
3. ต้องรวมผลแบบ sum, count, average หรือ group by
4. ต้องแยกตามอำเภอหรือไม่
5. ต้องใช้ข้อมูลทั้งหมดหรือเฉพาะตัวอย่างล่าสุด
6. field ตัวเลขมีค่าเป็น number จริงหรือยัง

### 4.3 การดึงข้อมูลพิกัดสำหรับแผนที่

`fetchMapData()` ดึงข้อมูลจากตารางที่มี latitude/longitude เช่น

```text
gis_areas
agri_tourism
```

แล้วแปลงเป็น object รูปแบบกลาง

```js
{
  name: r.area_name,
  district: r.district,
  lat: r.latitude,
  lon: r.longitude,
  type: 'gis',
  typeLabel: 'พื้นที่ GIS'
}
```

ถ้าจะเพิ่ม layer ใหม่บนแผนที่ เช่น ศูนย์เรียนรู้หรือแปลงพยากรณ์ ให้เพิ่มใน `fetchMapData()`

ตัวอย่างแนวทาง

```js
const [{ data: gis }, { data: tourMap }, { data: learningCenters }] = await Promise.all([
  supabase.from('gis_areas').select('area_name, district, latitude, longitude').not('latitude', 'is', null).limit(20),
  supabase.from('agri_tourism').select('spot_name, district, latitude, longitude').not('latitude', 'is', null).limit(20),
  supabase.from('learning_centers').select('name, district, latitude, longitude').not('latitude', 'is', null).limit(20),
]);
```

แล้ว push เข้า `mapPts`

```js
(learningCenters || []).forEach(r => {
  if (r.latitude && r.longitude) mapPts.push({
    name: r.name,
    district: r.district,
    lat: r.latitude,
    lon: r.longitude,
    type: 'learning_center',
    typeLabel: 'ศูนย์เรียนรู้'
  });
});
```

## 5. การแปลงข้อมูลสำหรับ Dashboard

ไฟล์ที่ใช้แปลงข้อมูลคือ

```text
src/hooks/dashboard/selectors.js
```

function สำคัญ

| function | ใช้ทำอะไร |
|---|---|
| `selectEnterpriseStats()` | นับวิสาหกิจชุมชนรายอำเภอ |
| `selectInstituteStats()` | รวมข้อมูลสถาบันเกษตรกร |
| `selectLargePlotStats()` | รวมแปลงใหญ่ สมาชิก พื้นที่ และประเภทสินค้า |
| `selectAgriStats()` | รวมพื้นที่เกษตร ครัวเรือน และประเภทพืช |
| `selectCenterCounts()` | นับศูนย์เรียนรู้ ศจช. ศดปช. รายอำเภอ |
| `createAgriPieData()` | สร้างข้อมูล pie chart พื้นที่พืช |
| `createLpPieData()` | สร้างข้อมูล pie chart แปลงใหญ่ตามกลุ่มสินค้า |

หลักคิดของ selector

```text
ข้อมูลดิบจาก Supabase
  ↓
แปลงเป็นตัวเลขที่แน่นอน
  ↓
รวมตามอำเภอหรือหมวด
  ↓
ส่งต่อให้ component แสดงผล
```

### 5.1 ข้อควรระวังเรื่องตัวเลข

เวลารวมตัวเลขต้องแปลงด้วย `Number()` หรือ `parseFloat()` เสมอ

```js
lMems += Number(row.member_count) || 0;
lArea += Number(row.area_rai) || 0;
```

ถ้าไม่แปลง อาจเกิดปัญหา string ต่อกัน เช่น

```text
'10' + '20' = '1020'
```

แทนที่จะได้

```text
10 + 20 = 30
```

### 5.2 การสร้างข้อมูลรายอำเภอ

Dashboard ใช้ `dStats` เป็น object กลาง

ตัวอย่างแนวคิด

```js
dStats['พุทธมณฑล'] = {
  ce: 0,
  lp: 0,
  area: 0,
  house: 0,
  lc: 0,
  pc: 0,
  sfc: 0
}
```

เมื่อวนข้อมูลแต่ละตาราง จะเพิ่มค่าเข้าอำเภอที่ตรงกัน

```js
let d = normalizeDistrict(row.district);
if (dStats[d]) dStats[d].lp += 1;
```

ถ้าชื่ออำเภอไม่ตรงกับ key ใน `dStats` ค่านั้นจะไม่ถูกนับ

## 6. การสร้างหน้า Dashboard รวมภายใน

ไฟล์

```text
src/pages/Dashboard.jsx
```

หน้านี้ใช้ข้อมูลจาก `useDashboardData()` แล้วแสดงเป็นหลาย section

| Section | เนื้อหา | Component/ข้อมูลที่ใช้ |
|---|---|---|
| Header | ชื่อหน้า จำนวนผู้เข้าชม ปุ่ม PDF | `site_statistics`, `increment_site_visit`, `html2canvas`, `jspdf` |
| Live Widgets | อากาศ AQI ราคาสินค้า | `WeatherWidget`, `AirQualityWidget`, `AgriPricesWidget` |
| Hotspot | จุดความร้อน | `HotspotWidget` |
| Group Summary | จำนวนข้อมูลตามกลุ่มงาน | `groupConfig`, `stats` |
| Map + Bento Cards | แผนที่และ card สรุปข้อมูล | `LandingMap`, `LandingBentoCards` |
| Charts | pie chart พื้นที่เกษตรและแปลงใหญ่ | `agriPie`, `lpPie` |

### 6.1 การเพิ่ม card ใหม่ใน Dashboard รวม

ตัวอย่าง ต้องการเพิ่ม card “จำนวน GAP”

ขั้นตอน

1. ตรวจว่ามี count ของ `certifications` ใน `stats` แล้วหรือไม่
2. หา count ใน component

```js
const gapCount = stats.find(s => s.table === 'certifications')?.count || 0;
```

3. เพิ่ม card ในตำแหน่งที่ต้องการ

```jsx
<Card title="มาตรฐาน GAP">
  {gapCount.toLocaleString()} รายการ
</Card>
```

4. ทดสอบทั้งกรณีมีข้อมูลและไม่มีข้อมูล
5. ตรวจว่าผู้ใช้ role ต่าง ๆ เห็นข้อมูลตาม RLS หรือไม่

### 6.2 การเพิ่ม chart ใหม่

หลักการเพิ่ม chart

1. ดึงข้อมูลที่ต้องใช้ใน `dataFetchers.js`
2. รวมข้อมูลใน `selectors.js` หรือ `useMemo` ในหน้า component
3. ส่งข้อมูลเข้า Recharts
4. ตรวจกรณีข้อมูลว่าง
5. ใส่ tooltip และหน่วยให้ชัด

ตัวอย่างโครงสร้างข้อมูลสำหรับ bar chart

```js
const districtBar = DISTRICT_LIST.map(d => ({
  name: d,
  value: districtStats[d]?.lp || 0
}));
```

ใช้กับ Recharts

```jsx
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={districtBar}>
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="value" />
  </BarChart>
</ResponsiveContainer>
```

## 7. การสร้าง Interactive Dashboard

ไฟล์

```text
src/pages/InteractiveDashboard.jsx
```

หน้านี้เป็น dashboard สาธารณะที่เน้นกรองข้อมูลตามอำเภอและแสดงกราฟหลายรูปแบบ

จุดเด่น

- ใช้ `useDashboardData()` เหมือน Dashboard ภายใน
- มี state `selectedDistrict`
- ใช้ `DISTRICT_LIST` สำหรับ dropdown
- ใช้ `useMemo()` สร้างข้อมูลกราฟจาก `districtStats`
- ใช้ Recharts หลายชนิด เช่น BarChart, PieChart, RadarChart, AreaChart, Treemap

### 7.1 Flow การกรองอำเภอ

```text
ผู้ใช้เลือกอำเภอใน Select
  ↓
setSelectedDistrict()
  ↓
useMemo() คำนวณ metrics ใหม่
  ↓
chart แสดงค่าของอำเภอนั้น
```

ตัวอย่าง pattern

```js
const metrics = useMemo(() => {
  if (selectedDistrict === 'ทั้งหมด') {
    return [/* ค่ารวมทั้งจังหวัด */];
  }
  const s = districtStats[selectedDistrict] || {};
  return [/* ค่าของอำเภอที่เลือก */];
}, [selectedDistrict, districtStats]);
```

### 7.2 สิ่งที่ควรระวังเมื่อเพิ่มกราฟใน Interactive Dashboard

- ต้องรองรับ `ทั้งหมด` และรายอำเภอ
- ถ้าข้อมูลอำเภอไม่มี ให้แสดง 0 ไม่ให้หน้า crash
- ใช้ `Number(value).toLocaleString()` เพื่อให้อ่านง่าย
- อย่าให้กราฟแน่นเกินไปบนมือถือ
- ถ้าใช้ `DISTRICT_LIST` ต้องตรวจ spelling ให้ตรงกับฐานข้อมูล
- ถ้า chart มีหลาย series ให้ระบุ legend และ tooltip ชัดเจน

## 8. การทำ Data Management ให้รองรับ Dashboard

หลายหน้าข้อมูลในระบบใช้ component กลาง

```text
src/components/DataTable/CrudTable.jsx
```

หน้าที่ของ `CrudTable`

| ความสามารถ | รายละเอียด |
|---|---|
| แสดงข้อมูล | query จาก Supabase พร้อม pagination |
| ค้นหาในตาราง | ใช้ `searchField` หรือ `searchFields` |
| filter | ใช้ `filterConfig` |
| sort | รองรับ sorter จาก Ant Design Table |
| เพิ่มข้อมูล | ใช้ formFields และ `createRecord()` |
| แก้ไขข้อมูล | ใช้ `updateRecord()` |
| ลบข้อมูล | ใช้ `deleteRecord()` เฉพาะ role ที่ลบได้ |
| Import CSV | เปิด `CsvImportModal` |
| Export CSV/Excel | export จากข้อมูลหน้าและข้อมูลทั้งหมด |
| จำกัดข้อมูล guest | ซ่อน field ชื่อบางประเภทสำหรับ guest |

### 8.1 โครงสร้างการสร้างหน้าข้อมูลใหม่

ถ้าจะสร้างหน้าข้อมูลใหม่ เช่น `OrganicFarms.jsx` ควรมีอย่างน้อย

```jsx
import { Form, Input } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';

export default function OrganicFarms() {
  const columns = [
    { title: 'ชื่อฟาร์ม', dataIndex: 'farm_name' },
    { title: 'อำเภอ', dataIndex: 'district' },
    { title: 'สินค้า', dataIndex: 'commodity' },
    { title: 'พื้นที่', dataIndex: 'area_rai' },
  ];

  const formFields = (
    <>
      <Form.Item name="farm_name" label="ชื่อฟาร์ม" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="district" label="อำเภอ">
        <Input />
      </Form.Item>
    </>
  );

  return (
    <CrudTable
      tableName="organic_farms"
      title="ข้อมูลฟาร์มอินทรีย์"
      columns={columns}
      formFields={formFields}
      searchFields={["farm_name", "district", "commodity"]}
    />
  );
}
```

จากนั้นต้องเพิ่ม route ใน `src/App.jsx`

```jsx
<Route path="production/organic-farms" element={<OrganicFarms />} />
```

และเพิ่มเมนูใน Layout ถ้าต้องให้ผู้ใช้กดเข้าได้

### 8.2 Import CSV

ไฟล์

```text
src/components/DataTable/CsvImportModal.jsx
```

รองรับ

- CSV UTF-8
- BOM
- comma หรือ semicolon
- header แถวแรก
- quoted cell
- ขึ้นบรรทัดใหม่ใน cell
- preview 5 แถวแรก
- map column CSV ไปยัง field ปลายทาง
- insert เป็น batch ขนาด 50 แถว

ข้อควรระวัง

- Import ปัจจุบันเป็น insert ใหม่ ไม่ใช่ upsert
- ต้องตรวจข้อมูลซ้ำก่อน import
- ถ้า field type ใน Supabase เป็น number แต่ CSV มีข้อความ อาจ insert fail
- ถ้า RLS ไม่อนุญาต insert ผู้ใช้จะ import ไม่ได้
- ถ้า header ตรงกับ `dataIndex` หรือ label ระบบจะ auto-map ให้บางส่วน

## 9. ภาพรวม Global Search

Global Search ใช้สำหรับค้นหาข้ามหลายตารางในระบบ

หน้าเว็บ

```text
/dashboard/search
```

ไฟล์หลัก

```text
src/pages/SearchResults.jsx
src/services/globalSearchService.js
src/utils/chatbotConstants.js
```

### 9.1 Flow การค้นหา

```text
ผู้ใช้พิมพ์คำค้นหา
  ↓
SearchResults.jsx อ่าน query จาก URL เช่น ?q=กำแพงแสน
  ↓
เรียก globalSearch(query, limitPerTable)
  ↓
globalSearchService.js ลองเรียก RPC global_search ก่อน
  ↓
ถ้า RPC สำเร็จ ใช้ผลลัพธ์จากฐานข้อมูลใน request เดียว
  ↓
ถ้า RPC fail ใช้ fallback query หลายตารางแบบ parallel
  ↓
แปลงผลลัพธ์ให้มี label, icon, group, route
  ↓
SearchResults.jsx แสดงผลเป็นกลุ่มตามตาราง
```

### 9.2 Config ที่ Search ใช้

อยู่ใน

```text
src/utils/chatbotConstants.js
```

ค่าหลัก

| config | ใช้ทำอะไร |
|---|---|
| `TABLE_CONFIG` | ชื่อไทย icon กลุ่ม และคำอธิบายของแต่ละ table |
| `TABLE_SEARCH_COLS` | field ที่ให้ Search ค้นหาในแต่ละ table |
| `DISTRICT_COLS` | field ที่ใช้แทนอำเภอ ถ้าตารางไม่ได้ใช้ `district` ตรง ๆ |
| `NUMERIC_COLS` | field ตัวเลขที่ AI ใช้ aggregate |
| `CATEGORY_COLS` | field หมวดหมู่ที่ AI ใช้นับ distribution |

Search โดยตรงใช้หลัก ๆ คือ

```text
TABLE_CONFIG
TABLE_SEARCH_COLS
DISTRICT_COLS
```

### 9.3 `TABLE_CONFIG`

ตัวอย่าง

```js
large_plots: {
  label: 'แปลงใหญ่',
  icon: '🌿',
  group: 'ส่งเสริมการผลิต',
  descTh: 'ข้อมูลแปลงใหญ่ (สินค้า, พื้นที่, สมาชิก)'
}
```

`label`, `icon`, `group` ใช้แสดงผลหน้า Search

`descTh` ใช้ช่วย AI เข้าใจว่าตารางนี้เก็บข้อมูลอะไร

### 9.4 `TABLE_SEARCH_COLS`

ตัวอย่าง

```js
large_plots: ['plot_name', 'commodity', 'secondary_commodity', 'agency']
```

ความหมายคือ ถ้าผู้ใช้ค้นคำว่า “มะพร้าว” ระบบจะค้นใน field เหล่านี้ของตาราง `large_plots`

ถ้า table ไม่มี `TABLE_SEARCH_COLS` หรือ array ว่าง ตารางนั้นอาจไม่ถูกค้นหาใน fallback search

### 9.5 `TABLE_ROUTES`

อยู่ใน

```text
src/services/globalSearchService.js
```

ใช้บอกว่าเมื่อผู้ใช้กด “ไปที่หน้าข้อมูล” จากผล Search ให้ไปหน้าใด

ตัวอย่าง

```js
large_plots: '/dashboard/production/large-plots'
```

ถ้าเพิ่ม table ใหม่แต่ไม่เพิ่ม `TABLE_ROUTES` ระบบอาจพาผู้ใช้กลับ `/dashboard` แทนหน้าข้อมูลที่ถูกต้อง

## 10. การเพิ่มตารางใหม่เข้า Global Search

สมมติเพิ่มตารางใหม่ชื่อ `organic_farms`

### 10.1 เพิ่มใน `TABLE_CONFIG`

ไฟล์

```text
src/utils/chatbotConstants.js
```

เพิ่ม

```js
organic_farms: {
  label: 'ฟาร์มอินทรีย์',
  icon: '🌱',
  group: 'ส่งเสริมการผลิต',
  descTh: 'ข้อมูลฟาร์มอินทรีย์ ชื่อฟาร์ม อำเภอ สินค้า พื้นที่ และสถานะการรับรอง'
},
```

### 10.2 เพิ่มใน `TABLE_SEARCH_COLS`

```js
organic_farms: ['farm_name', 'district', 'commodity', 'cert_status'],
```

### 10.3 เพิ่มใน `DISTRICT_COLS` ถ้าจำเป็น

ถ้าตารางใช้ field `district` อยู่แล้ว ไม่ต้องเพิ่ม

ถ้าใช้ field อื่น เช่น `farm_district` ให้เพิ่ม

```js
organic_farms: 'farm_district',
```

### 10.4 เพิ่ม route ใน `TABLE_ROUTES`

ไฟล์

```text
src/services/globalSearchService.js
```

เพิ่ม

```js
organic_farms: '/dashboard/production/organic-farms',
```

### 10.5 ตรวจหน้า Search

เปิด

```text
/dashboard/search?q=อินทรีย์
```

ตรวจว่า

- ตารางใหม่ขึ้นในผลค้นหา
- icon และ label ถูกต้อง
- กดไปที่หน้าข้อมูลถูกต้อง
- field ที่แสดงในตารางผลลัพธ์อ่านง่าย
- ไม่มีข้อมูลส่วนบุคคลหลุดในผล Search

## 11. RPC `global_search` และ fallback search

Search พยายามใช้ RPC ก่อน

```js
supabase.rpc('global_search', {
  search_term: searchTerm,
  result_limit: limitPerTable,
});
```

ข้อดีของ RPC

- ค้นหาหลายตารางได้ใน request เดียว
- ควบคุม logic ฝั่ง database ได้
- เร็วกว่า query หลายตารางทีละ request
- เหมาะกับ production

ถ้า RPC error ระบบจะ fallback ไป query หลายตารางด้วย `.or()`

```js
const orString = allCols.map(c => `${c}.ilike.%${searchTerm}%`).join(',');

supabase
  .from(table)
  .select('*', { count: 'exact' })
  .or(orString)
  .limit(limitPerTable);
```

ข้อควรระวังของ fallback

- ยิง request หลายตารางพร้อมกัน
- ถ้า RLS ไม่อนุญาต ตารางนั้นจะไม่ขึ้น
- ถ้า field ใน `TABLE_SEARCH_COLS` ไม่มีจริง จะ error เฉพาะตารางนั้น
- ถ้าข้อมูลเยอะมาก ควรทำ RPC ให้สมบูรณ์แทนการพึ่ง fallback

## 12. ภาพรวม AI Chatbot

หน้า Chatbot อยู่ที่

```text
/dashboard/chatbot
```

ไฟล์หลัก

```text
src/pages/Chatbot.jsx
src/services/chatbotDataService.js
src/services/aiService.js
src/utils/chatbotConstants.js
netlify/functions/ai-proxy.js
```

### 12.1 Flow การตอบคำถามของ AI

```text
ผู้ใช้ถามคำถามใน Chatbot
  ↓
Chatbot.jsx เก็บข้อความและ model ที่เลือก
  ↓
fetchDatabaseContext(query, modelKey, chatHistory)
  ↓
extractIntent() ใช้ AI แยกเจตนา เช่น ตาราง อำเภอ keyword ประเภทการวิเคราะห์
  ↓
เลือก table ที่เกี่ยวข้อง
  ↓
ดึง count, sample, aggregation, district distribution จาก Supabase
  ↓
buildContextForAI() แปลงข้อมูลเป็น JSON context
  ↓
callAI() ส่ง system prompt + context + คำถามไป AI proxy
  ↓
ai-proxy.js ส่งต่อไปยัง provider
  ↓
AI ตอบกลับ
  ↓
Chatbot.jsx แสดงคำตอบ
```

### 12.2 ส่วนที่เป็น UI ของ Chatbot

ไฟล์

```text
src/pages/Chatbot.jsx
```

ความสามารถหลัก

- เลือก model เช่น Gemini/Gemma/Qwen
- เปิด/ปิดโหมดต่อเน็ต
- เปิด/ปิดโหมดคิดเชิงลึก
- แนบ PDF ขนาดไม่เกิน 4MB
- ใช้ quick prompts
- เก็บประวัติสนทนาล่าสุดเพื่อถามต่อเนื่อง
- แสดง loading และ error จาก provider

ข้อควรระวัง

- guest ไม่ควรเข้า Chatbot ได้
- ถ้าแนบไฟล์ใหญ่เกิน 4MB ระบบจะปฏิเสธ
- ถ้าเปิด web search พร้อม deep thinking บาง model อาจไม่รองรับพร้อมกัน
- ถ้า provider timeout ควรแนะนำให้ปิดโหมดหนัก ๆ เช่น ต่อเน็ตหรือคิดเชิงลึก

## 13. Config ของ AI Chatbot

ไฟล์

```text
src/utils/chatbotConstants.js
```

มี 6 ส่วนสำคัญ

| ส่วน | ใช้ทำอะไร |
|---|---|
| `AI_MODELS` | รายชื่อ model ที่แสดงในหน้า Chatbot |
| `AI_PROXY_URL` | path ไปยัง Netlify Function |
| `GEMMA_MODEL`, `GEMINI_MODEL`, `QWEN_MODEL` | model identifier ที่ส่งให้ provider |
| `TABLE_CONFIG` | บอก AI ว่าแต่ละ table คือข้อมูลอะไร |
| `TABLE_SEARCH_COLS` | field ที่ใช้ค้นหา keyword |
| `NUMERIC_COLS`, `CATEGORY_COLS` | field ที่ใช้ aggregate และแจกแจงหมวดหมู่ |
| `SYSTEM_PROMPT` | บุคลิกและกฎการตอบของ AI |

### 13.1 เพิ่ม model ใหม่

ถ้าจะเพิ่ม model ใหม่ ต้องแก้หลายจุด

1. เพิ่มใน `AI_MODELS`
2. เพิ่ม constant model id ถ้าจำเป็น
3. เพิ่ม logic ใน `callAI()` ใน `src/services/aiService.js`
4. เพิ่ม provider handling ใน `netlify/functions/ai-proxy.js` ถ้าใช้ provider ใหม่
5. ตั้ง API key ใน Netlify environment variables
6. ทดสอบ streaming หรือ JSON response ให้ตรง format

ตัวอย่างโครงสร้างใน `AI_MODELS`

```js
newmodel: {
  key: 'newmodel',
  label: 'New Model',
  shortLabel: 'New',
  description: 'ชื่อ model ที่เข้าใจง่าย',
  provider: 'ProviderName',
  color: '#1890ff',
  icon: '🤖',
  badge: 'NEW',
  badgeColor: '#1890ff',
}
```

## 14. Intent Extraction ใน Chatbot

ไฟล์

```text
src/services/chatbotDataService.js
```

function

```js
extractIntent(query, modelKey, chatHistory)
```

หน้าที่คือให้ AI แยกคำถามเป็น JSON เช่น

```json
{
  "district": "พุทธมณฑล",
  "tables": ["large_plots"],
  "keyword": null,
  "analysis_type": "overview",
  "is_general_question": false
}
```

ความหมายของ field

| field | ความหมาย |
|---|---|
| `district` | อำเภอที่ผู้ใช้ถาม ถ้าไม่ระบุให้เป็น null |
| `tables` | ตารางที่เกี่ยวข้อง หรือ `['all']` สำหรับภาพรวม |
| `keyword` | คำค้นเฉพาะ เช่น ชื่อคน ชื่อกลุ่ม ชื่อสินค้าเฉพาะ |
| `analysis_type` | ประเภทการวิเคราะห์ เช่น overview, comparison, detail, ranking, correlation |
| `is_general_question` | true ถ้าเป็นคำถามทั่วไป ไม่ต้องดึง database |

### 14.1 กรณีคำถามทั่วไป

ถ้า `is_general_question` เป็น true ระบบจะไม่ดึงข้อมูลจาก Supabase แต่ส่งคำถามเข้า AI โดยตรง

เหมาะกับ

- ทักทาย
- ถามความรู้ทั่วไป
- ถามนโยบายแบบไม่ต้องอ้างตัวเลขในฐานข้อมูล
- ถามการใช้งานทั่วไป

### 14.2 กรณีคำถามอิงฐานข้อมูล

ถ้าเป็นคำถามเกี่ยวกับข้อมูลในระบบ จะเข้าสู่ `fetchDatabaseContext()` เพื่อดึงข้อมูลจริงจาก Supabase

ตัวอย่างคำถาม

| คำถาม | intent ที่ควรได้ |
|---|---|
| แปลงใหญ่มีกี่แปลง | `tables: ['large_plots']` |
| พุทธมณฑลมีวิสาหกิจชุมชนกี่แห่ง | `district: 'พุทธมณฑล', tables: ['community_enterprises']` |
| พื้นที่เกษตรกับครัวเรือนเกษตรกรสัมพันธ์กันไหม | `tables: ['agricultural_areas', 'farmer_registry'], analysis_type: 'correlation'` |
| สรุปภาพรวมทั้งจังหวัด | `tables: ['all'], analysis_type: 'overview'` |

## 15. การดึงข้อมูลให้ AI

function หลัก

```js
fetchDatabaseContext(query, modelKey, chatHistory)
```

ทำงานหลักดังนี้

1. เรียก `extractIntent()`
2. ตรวจว่าเป็นคำถามทั่วไปหรือไม่
3. เลือก table ที่เกี่ยวข้อง
4. ถ้า intent ไม่ชัด ใช้ heuristic จาก keyword ภาษาไทย
5. ถ้าเป็น comparison/correlation เพิ่มตารางที่เกี่ยวข้องให้เอง
6. ดึง count และ sample data จาก Supabase
7. คำนวณ aggregation สำหรับ field ตัวเลข
8. คำนวณ distribution รายอำเภอและหมวดหมู่
9. ส่งผลลัพธ์ให้ `buildContextForAI()`

### 15.1 Heuristic fallback

ถ้า intent extraction ไม่บอก table ระบบจะดู keyword ในคำถาม

ตัวอย่าง

| keyword | table ที่น่าจะเกี่ยวข้อง |
|---|---|
| พื้นที่, เกษตร, ไร่, ข้าว | `agricultural_areas` |
| ศูนย์เรียนรู้, ศพก | `learning_centers` |
| แปลงใหญ่, สินค้า | `large_plots` |
| GAP, มาตรฐาน, ใบรับรอง | `certifications` |
| วิสาหกิจ, ชุมชน | `community_enterprises` |
| PM2.5, ไฟ, เผา | `fire_hotspots` |
| งบ, โครงการ, แผนใช้จ่าย | `budgets` |

ถ้าเพิ่ม table ใหม่ ควรเพิ่ม keyword ใน fallback ด้วย ถ้าต้องการให้ AI จับเจตนาได้แม่นขึ้น

## 16. Aggregation สำหรับ AI

ระบบไม่ควรส่งข้อมูลดิบทั้งตารางเข้า AI เพราะเปลือง token และเสี่ยงข้อมูลหลุดมากเกินจำเป็น

จึงมี function

```js
computeAggregation(table, distCol, matchedDistrict, searchKeyword)
```

แนวคิด

```text
ดึง field ตัวเลขที่จำเป็น
  ↓
รวมผลเองใน frontend service
  ↓
ได้ totals, averages, by_district, district_percentages, rankings
  ↓
ส่งตัวเลขสรุปให้ AI แทนการส่ง raw data ทั้งหมด
```

ข้อมูลที่ได้ เช่น

```json
{
  "total_rows": 7,
  "totals": {
    "agri_crop_area_rai": 123456
  },
  "averages": {
    "agri_crop_area_rai": 17636.57
  },
  "by_district": {
    "พุทธมณฑล": {
      "count": 1,
      "agri_crop_area_rai": 1234
    }
  },
  "district_percentages": {
    "พุทธมณฑล": {
      "agri_crop_area_rai": 1.2
    }
  },
  "rankings": {
    "agri_crop_area_rai": {
      "top": { "district": "บางเลน", "value": 50000 },
      "bottom": { "district": "พุทธมณฑล", "value": 1234 }
    }
  }
}
```

ข้อดี

- AI ใช้ตัวเลขจากฐานข้อมูลทั้งหมด ไม่ใช่แค่ sample
- ลด token
- ตอบคำถามจัดอันดับและเปรียบเทียบได้ดีขึ้น
- ลดโอกาส AI นับข้อมูลผิดเอง

ข้อจำกัด

- ตอนนี้ aggregation ดึงข้อมูลสูงสุดประมาณ 10,000 แถวต่อ table เพื่อคำนวณ
- ถ้าตารางใหญ่กว่านั้นมาก ควรย้าย aggregation ไปทำฝั่ง SQL RPC
- ต้องเพิ่ม field ตัวเลขใน `NUMERIC_COLS` ให้ครบ ไม่เช่นนั้น AI จะไม่มีตัวเลขสำหรับรวมผล

## 17. `NUMERIC_COLS` และ `CATEGORY_COLS`

อยู่ใน

```text
src/utils/chatbotConstants.js
```

### 17.1 `NUMERIC_COLS`

ใช้บอกว่าแต่ละตารางมี field ตัวเลขใดที่ควรรวมผล

ตัวอย่าง

```js
large_plots: ['total_area_rai', 'member_count']
```

ถ้าต้องการให้ AI ตอบคำถาม “พื้นที่รวมเท่าไร” หรือ “สมาชิกกี่ราย” ต้องมี field เหล่านี้ใน `NUMERIC_COLS`

### 17.2 `CATEGORY_COLS`

ใช้บอก field หมวดหมู่ที่ AI ควรนับ distribution

ตัวอย่าง

```js
large_plots: ['commodity']
```

ถ้าผู้ใช้ถาม “แปลงใหญ่แยกตามสินค้า” AI จะใช้ category distribution ตอบได้ดีขึ้น

### 17.3 ตัวอย่างเพิ่มตารางใหม่ให้ AI วิเคราะห์ได้

สมมติมีตาราง `organic_farms`

เพิ่มใน `NUMERIC_COLS`

```js
organic_farms: ['area_rai', 'member_count'],
```

เพิ่มใน `CATEGORY_COLS`

```js
organic_farms: ['commodity', 'cert_status'],
```

เพิ่มใน `TABLE_SEARCH_COLS`

```js
organic_farms: ['farm_name', 'commodity', 'cert_status'],
```

เพิ่มใน `TABLE_CONFIG`

```js
organic_farms: {
  label: 'ฟาร์มอินทรีย์',
  icon: '🌱',
  group: 'ส่งเสริมการผลิต',
  descTh: 'ข้อมูลฟาร์มอินทรีย์ ชื่อฟาร์ม อำเภอ สินค้า พื้นที่ จำนวนสมาชิก และสถานะการรับรอง'
},
```

จากนั้นทดสอบคำถาม

```text
ฟาร์มอินทรีย์มีทั้งหมดกี่แห่ง
ฟาร์มอินทรีย์แยกตามอำเภอเป็นอย่างไร
ฟาร์มอินทรีย์สินค้าอะไรมากที่สุด
พุทธมณฑลมีฟาร์มอินทรีย์กี่แห่ง
```

## 18. การสร้าง context ให้ AI

function

```js
buildContextForAI(analysis)
```

ทำหน้าที่แปลงข้อมูลที่ดึงมาเป็น JSON string สำหรับส่งเข้า AI

ข้อมูลที่ส่งให้ AI ประกอบด้วย

| field | ความหมาย |
|---|---|
| `dataset` | ชื่อไทยของชุดข้อมูล |
| `table_name` | ชื่อตารางจริงใน Supabase |
| `total_records` | จำนวนรายการทั้งหมดที่ตรงเงื่อนไข |
| `filtered_by` | เงื่อนไขที่ใช้กรอง เช่น อำเภอหรือ keyword |
| `aggregated_stats` | ตัวเลขรวม ค่าเฉลี่ย แยกอำเภอ เปอร์เซ็นต์ ranking |
| `category_distribution` | การแจกแจงหมวดหมู่ |
| `district_distribution` | การแจกแจงตามอำเภอ |
| `sample_records` | ตัวอย่างข้อมูลบางส่วน |

จำนวน sample ที่ส่งเข้า AI จะต่างกันตามประเภทคำถาม

| analysis type | จำนวน sample โดยประมาณ | เหตุผล |
|---|---:|---|
| detail | มากกว่าแบบอื่น | ต้องดูรายละเอียดรายการ |
| comparison | น้อย | ใช้ aggregation เป็นหลัก |
| overview | น้อย | ใช้ total และ distribution เป็นหลัก |
| ranking | น้อย | ใช้ rankings เป็นหลัก |
| correlation | ปานกลาง | ต้องดูหลายตารางประกอบกัน |

หลักการสำคัญคือ AI ควรตอบจาก `aggregated_stats`, `category_distribution`, `district_distribution` ก่อน ไม่ควรนับจาก `sample_records`

## 19. AI Service และ AI Proxy

### 19.1 `src/services/aiService.js`

ทำหน้าที่แปลงข้อความจาก frontend ให้เป็น request ที่ส่งเข้า AI proxy

รองรับหลัก ๆ

| function | provider |
|---|---|
| `callGeminiAI()` | Gemini/Gemma ผ่าน Google endpoint |
| `callOpenRouterAI()` | OpenRouter |
| `callNvidiaAI()` | NVIDIA endpoint แบบ OpenAI-compatible |
| `callAI()` | entry point กลาง เลือก function ตาม model key |

### 19.2 `netlify/functions/ai-proxy.js`

ทำหน้าที่เป็นตัวกลางเพื่อไม่ให้ API key อยู่ใน frontend

รองรับ provider

| provider | env ที่ใช้ |
|---|---|
| `gemini` | `GEMINI_API_KEY` หรือ fallback `VITE_GEMINI_API_KEY` |
| `openrouter` | `OPENROUTER_API_KEY` หรือ fallback `VITE_OPENROUTER_API_KEY` |
| `nvidia` | `NVIDIA_API_KEY` หรือ fallback `VITE_NVIDIA_API_KEY` |

ข้อควรปฏิบัติ

- production ควรตั้ง key ใน Netlify environment variables
- ไม่ควรใส่ key จริงใน frontend env ที่มี prefix `VITE_` ถ้าเป็น key ลับ
- ถ้าต้องใช้ local function จริง ให้ใช้ Netlify CLI และตั้ง env ใน local ตามแนวทางของทีม
- ถ้า function ตอบ `API key not configured` ให้ตรวจ env ของ provider นั้น

## 20. การเพิ่มข้อมูลใหม่ให้ครบทั้ง Dashboard, Search และ AI

สมมติเพิ่มตารางใหม่ชื่อ `organic_farms`

ควรทำตามลำดับนี้

### 20.1 Supabase

- [ ] สร้าง table `organic_farms`
- [ ] มี `id`, `district`, `created_at`, `updated_at`
- [ ] มี field ที่จะใช้ dashboard เช่น `area_rai`, `member_count`, `commodity`
- [ ] เปิด RLS
- [ ] สร้าง policy สำหรับอ่าน/เขียน
- [ ] ใส่ข้อมูลตัวอย่างอย่างน้อย 3-5 แถว

### 20.2 Data Management

- [ ] สร้างหน้า `OrganicFarms.jsx`
- [ ] ใช้ `CrudTable`
- [ ] กำหนด `columns`
- [ ] กำหนด `formFields`
- [ ] กำหนด `searchFields`
- [ ] เพิ่ม route ใน `App.jsx`
- [ ] เพิ่มเมนูใน Layout
- [ ] ทดสอบเพิ่ม แก้ ลบ import/export

### 20.3 Dashboard

- [ ] เพิ่ม table ใน `groupConfig` ถ้าต้องให้ถูกนับใน card รวม
- [ ] เพิ่ม fetch logic ใน `dataFetchers.js` ถ้าต้องใช้ใน chart หรือ map
- [ ] เพิ่ม selector ใน `selectors.js` ถ้าต้องรวมข้อมูลรายอำเภอหรือรวมตัวเลข
- [ ] เพิ่ม component/chart ใน `Dashboard.jsx` หรือ `InteractiveDashboard.jsx`
- [ ] ตรวจข้อมูลว่างแล้วหน้าไม่ crash

### 20.4 Search

- [ ] เพิ่ม `TABLE_CONFIG`
- [ ] เพิ่ม `TABLE_SEARCH_COLS`
- [ ] เพิ่ม `DISTRICT_COLS` ถ้า district field ไม่ได้ชื่อ `district`
- [ ] เพิ่ม `TABLE_ROUTES`
- [ ] ถ้าใช้ RPC `global_search` ต้องเพิ่ม SQL ฝั่ง RPC ด้วย
- [ ] ทดสอบ search ด้วยชื่อ อำเภอ และสินค้า

### 20.5 AI Chatbot

- [ ] เพิ่ม `TABLE_CONFIG.descTh` ให้ AI เข้าใจตาราง
- [ ] เพิ่ม `TABLE_SEARCH_COLS`
- [ ] เพิ่ม `NUMERIC_COLS`
- [ ] เพิ่ม `CATEGORY_COLS`
- [ ] เพิ่ม keyword heuristic ใน `fetchDatabaseContext()` ถ้าจำเป็น
- [ ] ทดสอบคำถามภาพรวม รายอำเภอ จัดอันดับ และเปรียบเทียบ

## 21. รูปแบบคำถามที่ควรใช้ทดสอบ AI

หลังเพิ่มตารางหรือแก้ logic ควรทดสอบหลายแบบ

### 21.1 ทดสอบภาพรวม

```text
สรุปข้อมูลภาพรวมทั้งหมด
พื้นที่เกษตรทั้งหมดมีกี่ไร่
แปลงใหญ่มีกี่แปลง
วิสาหกิจชุมชนมีกี่แห่ง
```

### 21.2 ทดสอบรายอำเภอ

```text
พุทธมณฑลมีข้อมูลอะไรบ้าง
กำแพงแสนมีแปลงใหญ่กี่แปลง
บางเลนมีพื้นที่เกษตรเท่าไหร่
```

### 21.3 ทดสอบจัดอันดับ

```text
อำเภอไหนมีพื้นที่เกษตรมากที่สุด
จัดอันดับแปลงใหญ่รายอำเภอ
อำเภอไหนมีวิสาหกิจชุมชนมากที่สุด
```

### 21.4 ทดสอบเปรียบเทียบ

```text
เปรียบเทียบพุทธมณฑลกับสามพราน
เปรียบเทียบพื้นที่เกษตรทุกอำเภอ
แปลงใหญ่กับวิสาหกิจชุมชนกระจุกตัวที่อำเภอไหน
```

### 21.5 ทดสอบ follow-up

```text
แล้วพุทธมณฑลล่ะ
อำเภอนั้นมีสินค้าอะไรเด่น
เทียบกับบางเลนเป็นยังไง
```

### 21.6 ทดสอบคำถามทั่วไป

```text
สวัสดี
GAP คืออะไร
แนวทางส่งเสริมเกษตรกรรุ่นใหม่ควรทำยังไง
```

คำถามทั่วไปควรไม่ดึง database เกินจำเป็น

## 22. การตรวจความถูกต้องของคำตอบ AI

AI ควรใช้ตัวเลขจากฐานข้อมูล ไม่ควรเดาหรือนับเองจาก sample

เวลาตรวจคำตอบ ให้เทียบกับ Supabase โดยตรง

ตัวอย่าง SQL สำหรับตรวจจำนวนแปลงใหญ่

```sql
SELECT COUNT(*) FROM large_plots;
```

ตรวจแยกอำเภอ

```sql
SELECT district, COUNT(*)
FROM large_plots
GROUP BY district
ORDER BY COUNT(*) DESC;
```

ตรวจพื้นที่รวม

```sql
SELECT district, SUM(area_rai)
FROM large_plots
GROUP BY district
ORDER BY SUM(area_rai) DESC;
```

ถ้า AI ตอบไม่ตรง ให้ตรวจ 5 จุด

1. `NUMERIC_COLS` มี field นั้นหรือไม่
2. field ใน Supabase เป็นตัวเลขจริงหรือเป็น text
3. RLS ทำให้ AI อ่านไม่ครบหรือไม่
4. intent เลือก table ผิดหรือไม่
5. `buildContextForAI()` ส่งข้อมูลให้ AI ครบหรือไม่

## 23. ความปลอดภัยของ Search และ AI

Search และ AI เป็นส่วนที่อาจดึงข้อมูลหลายตาราง จึงต้องระวังเรื่องข้อมูลส่วนบุคคล

### 23.1 หลักการสำหรับ Search

- ไม่ควรใส่ field ส่วนบุคคลใน `TABLE_SEARCH_COLS` ถ้าไม่จำเป็น
- ถ้าต้องค้นชื่อบุคคลภายใน ต้องให้หน้า Search เป็น internal เท่านั้น
- ผลลัพธ์ Search ควรเคารพ RLS
- public route ไม่ควรเรียก Search ที่เปิดข้อมูลภายใน

### 23.2 หลักการสำหรับ AI

- ไม่ควรส่ง field อ่อนไหวเข้า `sample_records`
- ควรตัด field เช่น `id_card`, `phone`, `address_detail`, `bank_account` ถ้ามี
- ถ้าข้อมูลเป็น public summary ให้ส่งเฉพาะระดับอำเภอหรือภาพรวม
- ถ้าเป็นข้อมูลรายบุคคล ให้จำกัดเฉพาะ user ที่มีสิทธิ์
- อย่าใส่ service role key ใน frontend หรือ AI proxy request จาก client

### 23.3 field ที่ควรหลีกเลี่ยงใน AI context

```text
เลขบัตรประชาชน
เบอร์โทรศัพท์ส่วนตัว
ที่อยู่ละเอียดรายบุคคล
วันเดือนปีเกิด
เลขบัญชีธนาคาร
ข้อมูลรายได้หรือหนี้สินรายบุคคล
ข้อมูลสุขภาพหรือข้อมูลอ่อนไหวอื่น
```

ถ้าจำเป็นต้องเก็บในฐานข้อมูล ให้ RLS จำกัดสิทธิ์ และอย่าเพิ่ม field เหล่านี้ใน config ของ Search/AI

## 24. Performance และ cache

ระบบใช้ cache หลายจุด

| จุด | ใช้อะไร | ค่าโดยประมาณ |
|---|---|---|
| React Query | `useApiCache()` | stale 15 นาที, cache 60 นาที |
| Dashboard | query key `dashboard-overall-data` | cache ผ่าน `useApiCache` |
| CrudTable | query key ตาม table, page, search, filter, sort | cache ผ่าน `useApiCache` |
| Global Search | cache แบบ Map ใน service | TTL 60 วินาที |
| Recent Search | localStorage | เก็บคำค้นล่าสุด |

ข้อดี

- ลดการโหลดซ้ำ
- ลด request ไป Supabase
- หน้า dashboard เปิดซ้ำเร็วขึ้น
- Search คำเดิมภายในเวลาสั้น ๆ เร็วขึ้น

ข้อควรระวัง

- หลัง import ข้อมูลใหม่ ต้อง refetch ไม่เช่นนั้นหน้าอาจยังเห็นข้อมูลเก่า
- ถ้าแก้ข้อมูลใน Supabase โดยตรง อาจต้อง refresh หรือรอ cache หมด
- ถ้า query key ไม่ละเอียดพอ อาจได้ข้อมูลผิดชุด
- ถ้าข้อมูล realtime สำคัญมาก อาจต้องลด stale time หรือเพิ่มปุ่ม refresh

## 25. Troubleshooting: Dashboard

### 25.1 Dashboard แสดง 0 ทั้งหมด

ตรวจตามลำดับ

- `.env.local` ชี้ Supabase project ถูกหรือไม่
- ตารางใน Supabase มีข้อมูลจริงหรือไม่
- RLS อนุญาตให้ user อ่านหรือไม่
- table name ใน `groupConfig` ตรงกับ Supabase หรือไม่
- console มี error หรือไม่

### 25.2 กราฟบางอำเภอไม่ขึ้น

ตรวจ

- ชื่ออำเภอในข้อมูลตรงกับ `DISTRICT_LIST` หรือไม่
- มีช่องว่างหน้าหลังชื่ออำเภอหรือไม่
- มี `อ.` หรือ `อำเภอ` ปนในข้อมูลหรือไม่
- `normalizeDistrict()` รองรับรูปแบบนั้นหรือไม่

### 25.3 แผนที่ไม่แสดง marker

ตรวจ

- ตารางมี `latitude` และ `longitude` หรือไม่
- พิกัดเป็นตัวเลขจริงหรือไม่
- พิกัดสลับ latitude/longitude หรือไม่
- `fetchMapData()` ดึงตารางนั้นแล้วหรือยัง
- component map รับ key `lat` และ `lon` ถูกต้องหรือไม่

### 25.4 Export PDF ไม่ได้

ตรวจ

- browser console มี error จาก `html2canvas` หรือ `jspdf` หรือไม่
- รูปภาพภายนอกติด CORS หรือไม่
- element ที่ใช้ `dashRef` มีอยู่จริงหรือไม่
- chart หรือ map มีขนาดใหญ่เกินไปหรือไม่

## 26. Troubleshooting: Search

### 26.1 Search ไม่เจออะไรเลย

ตรวจ

- คำค้นยาวอย่างน้อย 2 ตัวอักษรหรือไม่
- `TABLE_CONFIG` มี table หรือไม่
- `TABLE_SEARCH_COLS` มี field หรือไม่
- field ใน `TABLE_SEARCH_COLS` มีอยู่จริงใน Supabase หรือไม่
- RLS อนุญาตให้อ่านหรือไม่
- RPC `global_search` error หรือ fallback error หรือไม่

### 26.2 Search เจอบางตารางแต่ไม่เจอตารางใหม่

ตรวจ checklist เพิ่มตารางใหม่

```text
TABLE_CONFIG
TABLE_SEARCH_COLS
TABLE_ROUTES
RPC global_search ถ้าใช้
RLS policy
```

### 26.3 กดผล Search แล้วไปผิดหน้า

แก้ที่

```text
src/services/globalSearchService.js
```

ตรวจ `TABLE_ROUTES`

```js
organic_farms: '/dashboard/production/organic-farms'
```

### 26.4 ผล Search แสดง field แปลก ๆ

หน้า `SearchResults.jsx` มี `COLUMN_LABELS` สำหรับแปลงชื่อ field เป็นชื่อไทย

ถ้าต้องการให้ field ใหม่อ่านง่าย ให้เพิ่มใน `COLUMN_LABELS`

```js
farm_name: 'ชื่อฟาร์ม',
cert_status: 'สถานะการรับรอง',
```

## 27. Troubleshooting: AI Chatbot

### 27.1 Chatbot บอก API key ไม่ได้ตั้งค่า

ตรวจ provider ที่ใช้

| provider | env |
|---|---|
| Gemini/Gemma | `GEMINI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| NVIDIA | `NVIDIA_API_KEY` |

ถ้าใช้งานบน production ให้ตั้งใน Netlify

ถ้าใช้งาน local ผ่าน deployed function ให้ตรวจว่า deployed Netlify site มี env แล้ว

### 27.2 AI ตอบว่าไม่พบข้อมูล ทั้งที่มีข้อมูล

ตรวจ

- intent เลือก table ผิดหรือไม่
- keyword กรองแคบเกินไปหรือไม่
- field ใน `TABLE_SEARCH_COLS` ถูกต้องหรือไม่
- RLS block table หรือไม่
- table มีข้อมูลแต่อำเภอสะกดไม่ตรงหรือไม่

### 27.3 AI ตอบตัวเลขไม่ตรง

ตรวจ

- `NUMERIC_COLS` มี field ที่ต้องรวมผลหรือไม่
- field เป็น numeric จริงหรือ text
- query มี filter district หรือ keyword ทำให้จำนวนเปลี่ยนหรือไม่
- AI นับจาก sample หรือใช้ aggregated_stats
- `SYSTEM_PROMPT` ย้ำให้ใช้ aggregated_stats ชัดพอหรือไม่

### 27.4 AI ตอบช้า

สาเหตุที่พบบ่อย

- ดึงหลายตารางพร้อมกัน
- เปิด web search
- เปิด deep thinking
- context ใหญ่เกินไป
- provider ช้า หรือ rate limit

แนวทางแก้

- ลดจำนวน sample
- เพิ่ม aggregation แทน raw rows
- จำกัด table ให้ตรง intent มากขึ้น
- ย้าย aggregation หนัก ๆ ไป SQL RPC
- ปิด web search ถ้าไม่จำเป็น

### 27.5 แนบ PDF แล้ว error

ตรวจ

- ไฟล์เป็น PDF จริงหรือไม่
- ขนาดไม่เกิน 4MB หรือไม่
- provider รองรับ inline PDF หรือไม่
- network timeout หรือไม่

## 28. Checklist ก่อนถือว่า Dashboard/Search/AI พร้อมใช้งาน

### 28.1 Dashboard

- [ ] หน้า `/dashboard` เปิดได้หลัง login
- [ ] หน้า `/interactive-dashboard` เปิดได้แบบ public
- [ ] card รวมจำนวนแสดงถูกต้อง
- [ ] กราฟแสดงข้อมูลถูกต้อง
- [ ] ตัวกรองอำเภอทำงาน
- [ ] แผนที่แสดง marker ถูกต้อง
- [ ] กรณีข้อมูลว่างไม่ทำให้หน้า crash
- [ ] export PDF ทำงาน ถ้าเปิดใช้

### 28.2 Search

- [ ] เปิด `/dashboard/search` ได้
- [ ] ค้นชื่ออำเภอได้
- [ ] ค้นชื่อสินค้าได้
- [ ] ค้นชื่อกลุ่มหรือชื่อแหล่งเรียนรู้ได้
- [ ] ผลลัพธ์แยกตาม table ถูกต้อง
- [ ] กดไปหน้าข้อมูลถูกต้อง
- [ ] ไม่แสดง field ที่ไม่ควรเปิดเผย

### 28.3 AI Chatbot

- [ ] เปิด `/dashboard/chatbot` ได้หลัง login
- [ ] เลือก model ได้
- [ ] ถามภาพรวมแล้วตอบจากฐานข้อมูล
- [ ] ถามรายอำเภอแล้วกรองถูกต้อง
- [ ] ถามจัดอันดับแล้วใช้ตัวเลขจริง
- [ ] ถามเปรียบเทียบแล้วตอบครบทุกอำเภอที่เกี่ยวข้อง
- [ ] ถามทั่วไปแล้วไม่ดึง database เกินจำเป็น
- [ ] provider key ตั้งค่าถูกต้อง
- [ ] ไม่มีข้อมูลส่วนบุคคลหลุดในคำตอบ

## 29. แนวทางพัฒนาต่อในอนาคต

### 29.1 Dashboard

- แยก chart config เป็นไฟล์กลาง เพื่อลด code ซ้ำใน `InteractiveDashboard.jsx`
- เพิ่ม dashboard เฉพาะกลุ่มงาน เช่น StrategyDashboard, ProductionDashboard ให้ใช้ selector กลาง
- เพิ่มตัวกรองปีงบประมาณ
- เพิ่มตัวกรองชนิดสินค้า
- เพิ่ม export เป็น Excel สำหรับข้อมูลสรุป
- เพิ่ม dashboard quality check สำหรับข้อมูลผิดรูปแบบ

### 29.2 Search

- ทำ RPC `global_search` ให้ครอบคลุมทุกตารางใหม่
- เพิ่ม full-text search สำหรับภาษาไทยถ้าจำเป็น
- เพิ่ม synonym เช่น `ศพก`, `ศูนย์เรียนรู้`, `learning center`
- เพิ่ม filter ตามกลุ่มงาน
- เพิ่ม permission-aware search result
- เพิ่ม search analytics เพื่อดูว่าผู้ใช้ค้นหาอะไรบ่อย

### 29.3 AI Chatbot

- ย้าย aggregation หนักไปทำใน Supabase RPC
- เพิ่ม table summary metadata แทนการ hardcode ใน prompt
- เพิ่ม mode อ้างอิงข้อมูล โดยแสดงตารางต้นทางและจำนวน record
- เพิ่ม guardrail ไม่ให้ตอบข้อมูลส่วนบุคคล
- เพิ่ม conversation memory เฉพาะ session
- เพิ่ม template คำตอบรายงานราชการ
- เพิ่ม export คำตอบเป็น PDF หรือ Word

## 30. ผลลัพธ์ที่ควรได้จากบทนี้

หลังจบบทนี้ ควรได้ความเข้าใจและแนวทางทำงานดังนี้

- รู้ว่า Dashboard ใช้ `useDashboardData()` เป็น hook กลาง
- รู้ว่า `dataFetchers.js` ใช้ดึงข้อมูล และ `selectors.js` ใช้รวมข้อมูล
- รู้ว่า Data Management ใช้ `CrudTable` และ `CsvImportModal`
- รู้ว่า Search ใช้ `globalSearchService.js` และ config จาก `chatbotConstants.js`
- รู้ว่า AI Chatbot ใช้ `extractIntent()`, `fetchDatabaseContext()`, `buildContextForAI()` และ `callAI()`
- รู้ว่าการเพิ่ม table ใหม่ต้องเพิ่มให้ครบทั้ง Supabase, Data Management, Dashboard, Search และ AI
- มี checklist สำหรับตรวจสอบก่อนเปิดใช้งานจริง

บทถัดไปคือบท 07 เรื่องความปลอดภัยและการ deploy ซึ่งควรต่อจากบทนี้โดยเน้น RLS, env key, Netlify, header, redirect, build, production checklist และแนวทางดูแลหลังเผยแพร่ระบบจริง
