# แผนพัฒนา NPT Smart Map รุ่นปรับโครงสร้าง

> **สำหรับ AI ผู้ลงมือทำ:** ให้อ่านเอกสารนี้ทั้งหมดก่อนแก้โค้ด ดำเนินงานตามลำดับทีละงาน ห้ามเพิ่มฟีเจอร์ลงใน `src/pages/SmartMap.jsx` เดิมต่อโดยไม่แยกส่วน ห้ามลบความสามารถเดิมที่ระบุว่าให้คงไว้ และต้องรันการทดสอบหลังจบทุกงาน

**เป้าหมาย:** ปรับหน้า `/smart-map` ให้เป็นแผนที่ข้อมูลเกษตรจังหวัดนครปฐมที่โหลดเร็ว ข้อมูลถูกระดับพื้นที่ แสดงเฉพาะข้อมูลที่มีตำแหน่งหรือขอบเขตที่เชื่อถือได้ บอกแหล่งข้อมูลและวันที่อัปเดต และดูแลโค้ดต่อได้ง่าย

**แนวทางสถาปัตยกรรม:** ใช้ Leaflet และ React Leaflet เดิม แต่แยกหน้าแผนที่ออกเป็นโมดูลย่อย ใช้ Layer Catalog เป็นศูนย์กลางกำหนดชั้นข้อมูล ใช้ React Query จัดการข้อมูลจาก API เฉพาะของ Smart Map และโหลดแต่ละชั้นเมื่อผู้ใช้เปิดใช้งาน แยกข้อมูลแบบจุด ขอบเขต และข้อมูลสรุประดับพื้นที่ออกจากกัน

**เทคโนโลยีเดิมที่ต้องใช้ต่อ:** React 19, Vite 7, React Router, TanStack React Query, Supabase, Netlify Functions, Leaflet 1.9, React Leaflet 5, Vitest, Testing Library และ Playwright

## ข้อกำหนดร่วม

- คงเส้นทางสาธารณะ `/smart-map`
- ห้ามเปลี่ยนฐานข้อมูลด้วยการแก้ `supabase/schema.sql` อย่างเดียว ต้องสร้าง migration ใหม่
- ห้ามเปิดเผยเลขบัตรประชาชน เบอร์โทร อีเมล ที่อยู่บ้าน ชื่อเจ้าของแปลง หรือข้อมูลส่วนบุคคลในแผนที่สาธารณะ
- ห้ามสร้างหมุดจากจุดกึ่งกลางอำเภอให้กับรายการที่ไม่มีพิกัดจริง
- ข้อมูลที่มีเพียงชื่ออำเภอหรือตำบลให้แสดงเป็นการระบายสีหรือยอดรวมตามขอบเขต
- ทุกชั้นข้อมูลต้องมีสถานะโหลด ว่าง ผิดพลาด จำนวนรายการ แหล่งข้อมูล และวันที่อัปเดต
- ทุกค่าที่แทรกลง Tooltip แบบ HTML ต้องผ่านการ escape
- ห้ามใช้ `select('*')` ใน API สาธารณะ
- ห้ามกลืน Supabase error แล้วแสดงเป็นข้อมูลว่าง
- OSM เป็นแผนที่พื้นหลังเริ่มต้น
- ห้ามใช้ Google tile endpoint ที่ไม่ได้อยู่ในสัญญาหรือเงื่อนไขการใช้งานที่ทีมอนุมัติ
- ฟีเจอร์หลักต้องใช้งานได้ที่ความกว้างหน้าจอ 360 พิกเซลขึ้นไป
- ต้องผ่าน `npm run lint:src`, `npm test`, `npm run build` และ `npm run test:e2e`

---

## 1. บริบทของระบบปัจจุบัน

โปรเจกต์เป็น React SPA ที่มีทั้งหน้าสาธารณะ ระบบเจ้าหน้าที่ ระบบจัดการข้อมูล และ AI โดยใช้ Supabase เป็นฐานข้อมูลหลัก ใช้ Netlify Functions เป็นชั้น proxy และ sync ข้อมูลภายนอก และใช้ React Query เป็น cache ฝั่งหน้าเว็บ

หน้า Smart Map ปัจจุบันรวมความรับผิดชอบจำนวนมากไว้ในไฟล์เดียว ได้แก่

- โหลด Leaflet และ GeoJSON
- ดึงข้อมูล Dashboard ทั้งระบบ
- วาดขอบเขตอำเภอและตำบล
- ระบายสีตามตัวชี้วัด
- ดึงพิกัดหลายตาราง
- ดึงอากาศและ PM2.5
- ดึงชั้นชุดดิน
- ค้นหาอำเภอ
- แสดงรายละเอียดพื้นที่
- เปรียบเทียบอำเภอ
- คำนวณสถานการณ์สมมติ
- เรียก AI Insight

ผลคือหน้าใช้งานได้และมีฟีเจอร์มาก แต่โหลดข้อมูลเกินความจำเป็น โค้ดแก้ยาก และบางสถานะทำให้ผู้ใช้เข้าใจระดับข้อมูลผิด

---

## 2. สิ่งที่ทำดีอยู่แล้วและต้องคงไว้

1. **Lazy loading ของเส้นทาง Smart Map**  
   คงการโหลดหน้าแยกจาก Bundle หลัก

2. **Dynamic import ของ Leaflet และ React Leaflet**  
   คงไว้เพื่อไม่ให้ Leaflet ถูกโหลดก่อนเข้าหน้าแผนที่

3. **ขอบเขตอำเภอและตำบลจาก GeoJSON**  
   ใช้ไฟล์เดิมต่อ และใช้ตัวช่วยใน `src/utils/geojsonBoundaries.js`

4. **Choropleth ระดับอำเภอ**  
   คงตัวชี้วัดเดิม ได้แก่ พื้นที่เกษตร ครัวเรือน วิสาหกิจชุมชน และแปลงใหญ่

5. **การเลือกอำเภอจากแผนที่และช่องค้นหา**

6. **รายละเอียดอำเภอแบบ Side Panel และ Bottom Sheet บนมือถือ**

7. **การเลือก Basemap โดยให้ OSM เป็นค่าเริ่มต้น**

8. **การโหลดชุดดินเมื่อเปิดชั้นข้อมูลเท่านั้น**

9. **ระบบ Fit Bounds, Fly To และ Resize Observer**

10. **Tooltip ของจุดความร้อนและแปลงพยากรณ์**

11. **การเปรียบเทียบอำเภอ**  
    คงไว้ แต่ย้ายเป็นโมดูลแยกและลดข้อมูลซ้ำ

12. **AI Insight และ What-If**  
    คงไว้ในส่วนรองของแผงรายละเอียด โดยแก้เรื่องแหล่งอ้างอิงและคำอธิบายสมมติฐาน

---

## 3. ปัญหาที่ต้องแก้

### 3.1 ระดับข้อมูลไม่ตรงกับพื้นที่ที่เลือก

เมื่อเลือกตำบล ส่วนหัวแสดงชื่อตำบล แต่ตัวเลขยังมาจาก `districtStats` ระดับอำเภอทั้งหมด ต้องแก้ให้ข้อมูลในแผงเปลี่ยนตาม `province`, `district` หรือ `subdistrict` จริง

### 3.2 Smart Map ใช้ `useDashboardData()` ชุดใหญ่

หน้าแผนที่รอข้อมูลที่ไม่ได้ใช้หลายตาราง ทำให้โหลดช้าและล้มเหลวตามส่วนอื่นของ Dashboard ได้ ต้องสร้าง Data Hook และ API เฉพาะ Smart Map

### 3.3 ช่องเลือกชั้นข้อมูลกับพฤติกรรมไม่ตรงกัน

UI เป็น Checkbox แต่โค้ดเปิดได้ทีละชั้นเหมือน Radio Button ให้แก้เป็น Checkbox ที่เปิดหลายชั้นพร้อมกันได้ และมีปุ่มปิดทั้งหมด

### 3.4 ข้อมูลอากาศถูกเรียกจาก Browser จำนวนมาก

ปัจจุบันเรียกอากาศและ PM2.5 แยกกันทุกอำเภอ รวมหลายคำขอเมื่อเปิดหน้า ให้รวมผ่าน Netlify Function และ Cache 10 ถึง 15 นาที

### 3.5 สูตร What-If ไม่มีแหล่งที่มา

ค่าประหยัดน้ำ รายได้เพิ่ม การลดจุดความร้อน และ CO2e เป็นค่าคงที่ในโค้ด ต้องย้ายเป็น Config ที่มีชื่อสมมติฐาน รุ่น แหล่งอ้างอิง หน่วย และวันที่ตรวจสอบ

### 3.6 Supabase error ถูกตีความเป็นข้อมูลว่าง

ทุก Query ต้องตรวจ `error` และส่งสถานะรายชั้นกลับหน้าเว็บ

### 3.7 ไม่มีข้อมูลแหล่งที่มาและความสด

ชั้นข้อมูลทุกชั้นต้องมี Source Badge และ `updatedAt`, `snapshotDate` หรือ `cutoffDate`

### 3.8 ไม่มีระบบตรวจคุณภาพพิกัดโดยเฉพาะ

ต้องตรวจพิกัดหาย พิกัด 0,0 พิกัดอยู่นอกจังหวัด พิกัดซ้ำ และการแปลง UTM ที่ผิดปกติ

### 3.9 Tooltip บางส่วนสร้างจาก HTML String โดยไม่ Escape

ใช้ตัวช่วย `escapeHtml()` กลางสำหรับทุกชั้น หรือใช้ React Component แทน HTML String

---

## 4. หลักการตัดสินใจว่าข้อมูลใดควรอยู่บนแผนที่

ข้อมูลจะถูกนำขึ้นแผนที่ได้เมื่ออยู่ในหนึ่งในสามรูปแบบนี้

### 4.1 จุดจริง

ต้องมี Latitude/Longitude จริง หรือมี UTM ที่ระบุ Zone และ Hemisphere ชัดเจน

เหมาะกับ

- กลุ่มเกษตรกร
- แปลงพยากรณ์
- จุดความร้อน
- แหล่งท่องเที่ยวเกษตร
- ศูนย์หรือสถานที่ที่เก็บพิกัดจริง

### 4.2 ขอบเขตจริง

ต้องมี Polygon หรือ MultiPolygon จริง

เหมาะกับ

- ขอบเขตอำเภอและตำบล
- ชุดดิน
- แปลงเกษตรดิจิทัลในอนาคต
- พื้นที่ภัยพิบัติหรือพื้นที่ระบาด เมื่อมี Geometry

### 4.3 ค่าสรุปตามหน่วยปกครอง

มีอำเภอหรือตำบล แต่ไม่มีตำแหน่งจริง ให้รวมค่าตามขอบเขตและระบายสี

เหมาะกับ

- ครัวเรือนเกษตรกร
- ความคืบหน้าการขึ้นทะเบียน
- ความคืบหน้า GEOPLOTS
- จำนวนกลุ่ม ศูนย์ หรือมาตรฐาน
- พื้นที่เสียหาย
- จำนวนเหตุการณ์ในช่วงเวลา

### 4.4 สิ่งที่ห้ามทำ

- ห้ามนำ Smart Farmer หรือ Young Smart Farmer ไปปักที่จุดกึ่งกลางอำเภอ
- ห้ามนำศูนย์หรือกลุ่มที่ไม่มีพิกัดไปปักแบบสุ่ม
- ห้ามใช้ที่อยู่บ้านของบุคคลเป็นหมุดสาธารณะ
- ห้ามแสดงจุดที่ผ่านการ Geocode โดยไม่บอกระดับความแม่นยำ
- ห้ามเปิด Layer ที่ไม่มีข้อมูลจริงแล้วปล่อยให้ผู้ใช้คิดว่าระบบเสีย

---

## 5. บัญชีชั้นข้อมูลที่แนะนำ

### 5.1 ชั้นข้อมูลพื้นฐาน

| ชั้นข้อมูล         | รูปแบบ  |            สถานะ | การตัดสินใจ                                                           |
| ------------------ | ------- | ---------------: | --------------------------------------------------------------------- |
| ขอบเขตจังหวัด      | Polygon | มีจากชุด GeoJSON | เพิ่มเป็นเส้นขอบหลัก                                                  |
| ขอบเขตอำเภอ        | Polygon |       ใช้งานอยู่ | คงไว้                                                                 |
| ขอบเขตตำบล         | Polygon |       ใช้งานอยู่ | คงไว้และเชื่อมข้อมูลตำบลจริง                                          |
| ป้ายชื่ออำเภอ      | Label   |       ใช้งานอยู่ | คงไว้ แต่ซ่อนตามระดับซูม                                              |
| OSM                | Tile    |       ใช้งานอยู่ | คงเป็นค่าเริ่มต้น                                                     |
| Google Road/Hybrid | Tile    |       ใช้งานอยู่ | ปิดไว้จนตรวจเงื่อนไขการใช้ หรือเปลี่ยนเป็นผู้ให้บริการที่ได้รับอนุญาต |

### 5.2 ชั้นข้อมูลระบายสีระดับอำเภอ

| ตัวชี้วัด              | แหล่งข้อมูล                                            |             ค่าเริ่มต้น |
| ---------------------- | ------------------------------------------------------ | ----------------------: |
| พื้นที่เกษตร           | `agricultural_areas`                                   |                    เปิด |
| ครัวเรือนเกษตรกร       | `agricultural_areas` หรือทะเบียนล่าสุดตามนิยามที่กำหนด |                     ปิด |
| วิสาหกิจชุมชน          | `community_enterprises`                                |                     ปิด |
| แปลงใหญ่               | `large_plots`                                          |                     ปิด |
| Smart Farmer           | `smart_farmer_sf` รวมตามอำเภอ                          |                     ปิด |
| Young Smart Farmer     | `young_smart_farmer_ysf` รวมตามอำเภอ                   |                     ปิด |
| พื้นที่ประสบภัย        | `disasters` เมื่อมีข้อมูล                              | ปิดและ Disable หากไม่มี |
| จุดความร้อนตามช่วงเวลา | `fire_hotspots`                                        |                     ปิด |
| ความคืบหน้า GEOPLOTS   | `geoplots_parcel_progress`                             |                     ปิด |

หมายเหตุ: เปิด Choropleth ได้ครั้งละหนึ่งตัวชี้วัดเพื่อไม่ให้ความหมายของสีซ้อนกัน

### 5.3 ชั้นข้อมูลระบายสีระดับตำบล

| ตัวชี้วัด                  | แหล่งข้อมูล                            | วิธีแสดง                                      |
| -------------------------- | -------------------------------------- | --------------------------------------------- |
| ครัวเรือนเกษตรกร           | `farmer_registry_subdistricts`         | จำนวนหรือความหนาแน่น                          |
| ความคืบหน้าปรับปรุงทะเบียน | `farmer_registry_subdistricts`         | ร้อยละจาก `total_updated_households / target` |
| พื้นที่ทะเบียนเกษตร        | `farmer_registry_subdistricts`         | ไร่                                           |
| ความคืบหน้า GEOPLOTS       | `geoplots_parcel_subdistrict_progress` | `progress_percent`                            |
| จำนวนกลุ่มแม่บ้าน          | `housewife_farmer_groups`              | นับรายการตามตำบล                              |
| จำนวนกลุ่มยุวเกษตรกร       | `young_farmer_groups_detailed`         | นับรายการตามตำบล                              |
| จำนวนกลุ่มส่งเสริมอาชีพ    | `agricultural_career_groups`           | นับรายการตามตำบล                              |
| จำนวน ศจช.                 | `pest_centers`                         | นับรายการตามตำบล                              |
| จำนวน ศดปช.                | `soil_fertilizer_centers`              | นับรายการตามตำบล                              |
| จำนวนหมอพืช                | `plant_doctors`                        | นับรายการตามตำบล                              |
| จุดความร้อน                | `fire_hotspots`                        | นับตามตำบลและช่วงวันที่                       |
| การระบาดศัตรูพืช           | `pest_outbreaks` เมื่อมีข้อมูล         | พื้นที่ระบาดหรือจำนวนเหตุการณ์                |
| ภัยพิบัติ                  | `disasters` เมื่อมีข้อมูล              | พื้นที่เสียหายหรือจำนวนเกษตรกร                |

ทุกแถวต้องจับคู่ตำบลด้วย `tam_code` ก่อน หากไม่มีรหัสให้ใช้ชื่ออำเภอและตำบลผ่าน `findSubdistrictFeature()` ห้ามรวมรายการที่จับคู่ไม่ได้เข้าตำบลใดโดยอัตโนมัติ

### 5.4 ชั้นข้อมูลแบบจุดที่เปิดใช้ได้ทันที

| Layer ID              | ตาราง                          | พิกัด                                  | สิ่งที่แสดงใน Tooltip                                             |
| --------------------- | ------------------------------ | -------------------------------------- | ----------------------------------------------------------------- |
| `young_farmer_groups` | `young_farmer_groups_detailed` | `lat`, `lon`                           | ชื่อกลุ่ม สมาชิก กิจกรรม ตำบล อำเภอ ปีข้อมูล                      |
| `career_groups`       | `agricultural_career_groups`   | `lat`, `lon`                           | ชื่อกลุ่ม สมาชิก กิจกรรมหลัก ระดับศักยภาพ ตำบล อำเภอ              |
| `housewife_groups`    | `housewife_farmer_groups`      | `lat`, `lon`                           | ชื่อกลุ่ม สมาชิก กิจกรรม มาตรฐาน ระดับศักยภาพ ตำบล อำเภอ          |
| `forecast_plots`      | `forecast_plots`               | `coord_x`, `coord_y` แปลง UTM Zone 47N | พืช พันธุ์ พื้นที่ ประเภทแปลง สถานะ ตำบล อำเภอ                    |
| `fire_hotspots`       | `fire_hotspots`                | `latitude`, `longitude`                | วันที่ เวลา ความเชื่อมั่น FRP การใช้ที่ดิน ตำบล อำเภอ แหล่งข้อมูล |

ข้อกำหนดเฉพาะแปลงพยากรณ์: หน้า Public ห้ามส่ง `owner_name`

### 5.5 ชั้น Polygon ที่เปิดใช้ได้ทันที

| Layer ID               | แหล่ง                  | Geometry             | การตัดสินใจ                                          |
| ---------------------- | ---------------------- | -------------------- | ---------------------------------------------------- |
| `soil_series`          | `soil_series.geometry` | Polygon/MultiPolygon | ใช้ข้อมูลจาก Supabase เป็นแหล่งหลัก                  |
| `soil_series_fallback` | ไฟล์ GeoJSON ภายนอก    | Polygon/MultiPolygon | ใช้เฉพาะเมื่อ DB ไม่พร้อม และต้องบอกว่าเป็น fallback |

Tooltip ชุดดินแสดงชื่อชุดดิน รหัส กลุ่ม เนื้อดิน ความอุดมสมบูรณ์ pH พื้นที่ อำเภอ และแหล่งข้อมูล

### 5.6 ชั้นที่เตรียมรองรับ แต่ยังไม่เปิดจนมีข้อมูล

| ตาราง                  | เหตุผล                                                             | เงื่อนไขเปิด                                                           |
| ---------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `gis_areas`            | Schema มี Latitude/Longitude แต่เอกสารตรวจล่าสุดระบุว่ายังไม่มีแถว | มีข้อมูลและพิกัดผ่านเกณฑ์อย่างน้อย 80%                                 |
| `agri_tourism`         | Schema มี Latitude/Longitude แต่เอกสารตรวจล่าสุดระบุว่ายังไม่มีแถว | มีข้อมูลจริงและผ่านการตรวจ Public fields                               |
| `disasters`            | มีอำเภอ/ตำบลแต่ไม่มีพิกัด                                          | เปิดเป็น Choropleth เมื่อมีข้อมูล                                      |
| `pest_outbreaks`       | มีอำเภอแต่ไม่มีพิกัด                                               | เปิดเป็น Choropleth เมื่อมีข้อมูล                                      |
| `crop_production`      | มีอำเภอแต่เอกสารตรวจล่าสุดระบุว่ายังไม่มีข้อมูล                    | เปิดเป็น Choropleth เมื่อมีข้อมูล                                      |
| `ai_disease_forecasts` | เป็นผลรวมรายวันใน JSON ไม่ใช่พิกัดโดยตรง                           | แสดงเป็น Alert หรือ Risk Overlay เมื่อ JSON มีรหัสพื้นที่ที่ตรวจสอบได้ |

### 5.7 ข้อมูลที่ใช้แบบสรุปเท่านั้น

| ตาราง                     | เหตุผล                                   |
| ------------------------- | ---------------------------------------- |
| `smart_farmer_sf`         | ไม่มีพิกัดและมีข้อมูลบุคคล               |
| `young_smart_farmer_ysf`  | มีที่อยู่แต่ไม่มีพิกัดและเป็นข้อมูลบุคคล |
| `community_enterprises`   | ไม่มีพิกัดใน Schema ปัจจุบัน             |
| `large_plots`             | มีอำเภอ/ตำบลแต่ไม่มีพิกัดแปลง            |
| `certifications`          | ไม่มี Geometry และมีข้อมูลแปลงจำนวนมาก   |
| `learning_centers`        | ไม่มีพิกัด                               |
| `pest_centers`            | ไม่มีพิกัด                               |
| `soil_fertilizer_centers` | ไม่มีพิกัด                               |
| `plant_doctors`           | เป็นข้อมูลบุคคลและไม่มีพิกัด             |

รายการเหล่านี้ให้แสดงเป็นยอดรวมในพื้นที่ที่เลือก หรือ Choropleth จากจำนวนต่ออำเภอ/ตำบล

---

## 6. รูปแบบหน้าจอใหม่

### 6.1 สถานะเริ่มต้น

เมื่อเปิดหน้าให้เห็น

- แผนที่เต็มหน้าจอ
- ขอบเขตอำเภอ
- Choropleth พื้นที่เกษตร
- KPI จังหวัด 4 ค่า
- ช่องค้นหาพื้นที่
- ปุ่มชั้นข้อมูล
- แถบสถานะข้อมูลด้านล่าง
- ไม่มี Point Layer เปิดโดยอัตโนมัติ
- ไม่โหลดชุดดินหรือจุดหลายร้อยจุดจนกว่าผู้ใช้เปิด

### 6.2 แผงชั้นข้อมูล

แบ่งเป็น 5 หมวด

1. **พื้นที่และทะเบียน**
   - พื้นที่เกษตร
   - ครัวเรือน
   - ทะเบียนเกษตรกร
   - GEOPLOTS

2. **กลุ่มและเครือข่าย**
   - กลุ่มแม่บ้าน
   - กลุ่มยุวเกษตรกร
   - กลุ่มส่งเสริมอาชีพ
   - จำนวนศูนย์และเครือข่ายแบบระบายสี

3. **การผลิตและมาตรฐาน**
   - แปลงพยากรณ์
   - แปลงใหญ่แบบสรุป
   - GAP แบบสรุป

4. **ความเสี่ยงและเฝ้าระวัง**
   - จุดความร้อน
   - ภัยพิบัติ
   - ศัตรูพืช
   - การพยากรณ์โรคและแมลง

5. **ทรัพยากรธรรมชาติ**
   - ชุดดิน
   - ขอบเขตตำบล
   - ข้อมูลอากาศของพื้นที่ที่เลือก

แต่ละ Layer แสดง

- Toggle
- จำนวนรายการพร้อมแสดง
- วันที่อัปเดต
- สถานะ `พร้อมใช้`, `ไม่มีข้อมูล`, `ข้อมูลพิกัดไม่ครบ`, `โหลดผิดพลาด`
- ปุ่มข้อมูลแหล่งที่มา

### 6.3 การค้นหา

ค้นหาได้จาก

- อำเภอ
- ตำบล
- ชื่อกลุ่มเกษตรกรที่มีพิกัด
- ชื่อแปลงพยากรณ์หรือชนิดพืช
- วันที่หรือประเภทจุดความร้อนผ่านตัวกรอง ไม่ต้องใช้ช่องค้นหาหลัก

ผลค้นหาต้องบอกประเภท เช่น `พื้นที่`, `กลุ่ม`, `แปลง`, `จุดเฝ้าระวัง`

### 6.4 แผงรายละเอียดพื้นที่

ใช้โครงสร้างเดียวสำหรับทุกระดับ

```text
ระดับ: จังหวัด | อำเภอ | ตำบล
ชื่อพื้นที่
ข้อมูล ณ วันที่
แหล่งข้อมูลหลัก
แท็บ:
  1. ภาพรวม
  2. การผลิต
  3. เครือข่าย
  4. ความเสี่ยง
  5. วิเคราะห์
```

เมื่อเลือกตำบล ตัวเลขทุกแท็บต้องมาจากตำบลนั้น หรือระบุชัดว่าไม่มีข้อมูลระดับตำบล ห้ามแสดงยอดอำเภอใต้หัวข้อตำบลโดยไม่มีคำเตือน

### 6.5 การเลือกจุด

คลิกจุดแล้วเปิด Popup ขนาดเล็ก พร้อมปุ่ม `ดูรายละเอียดในแผง`

Popup แสดงเฉพาะข้อมูลสำคัญ 3 ถึง 6 รายการ ส่วนรายละเอียดมากกว่านั้นย้ายไปแผงด้านข้าง

### 6.6 ตัวกรองเวลา

จุดความร้อนต้องมี

- 24 ชั่วโมงล่าสุด
- 7 วัน
- 30 วัน
- ช่วงวันที่กำหนดเอง

แปลงพยากรณ์ควรกรองตาม

- ชนิดพืช
- สถานะแปลง
- ประเภทแปลง

### 6.7 การใช้งานมือถือ

- แผงชั้นข้อมูลเป็น Bottom Sheet สูงไม่เกิน 70vh
- แผงรายละเอียดเป็น Bottom Sheet แยกจาก Layer Sheet
- ปุ่มควบคุมมีพื้นที่กดอย่างน้อย 44x44 พิกเซล
- KPI ย่อเป็นแถบเลื่อนแนวนอน
- ซ่อนข้อความรองที่ไม่จำเป็น แต่ไม่ซ่อน Source และ Updated Date

---

## 7. โมเดลข้อมูลกลางของ Smart Map

สร้าง Selection Model เดียว

```js
export const EMPTY_AREA_SELECTION = {
  level: 'province',
  provinceCode: '73',
  provinceName: 'นครปฐม',
  districtCode: null,
  districtName: null,
  subdistrictCode: null,
  subdistrictName: null,
};
```

สร้าง Layer Model

```js
{
  id: 'housewife_groups',
  label: 'กลุ่มแม่บ้านเกษตรกร',
  group: 'farmer_networks',
  geometryType: 'point',
  sourceTable: 'housewife_farmer_groups',
  sourceLabel: 'สำนักงานเกษตรจังหวัดนครปฐม',
  defaultVisible: false,
  minZoom: 9,
  publicFields: [
    'id',
    'year',
    'group_name',
    'subdistrict',
    'district',
    'member_count',
    'activity',
    'production_standard',
    'potential_level',
    'lat',
    'lon',
    'updated_at'
  ],
  freshnessField: 'updated_at',
  availability: 'active'
}
```

Response มาตรฐานสำหรับ Point/Polygon

```json
{
  "data": {
    "type": "FeatureCollection",
    "features": []
  },
  "meta": {
    "layerId": "housewife_groups",
    "count": 0,
    "validCoordinateCount": 0,
    "invalidCoordinateCount": 0,
    "updatedAt": null,
    "source": "สำนักงานเกษตรจังหวัดนครปฐม",
    "scope": {
      "level": "province",
      "district": null,
      "subdistrict": null
    },
    "truncated": false
  }
}
```

Response มาตรฐานสำหรับ Summary

```json
{
  "scope": {
    "level": "district",
    "districtCode": "7307",
    "districtName": "พุทธมณฑล",
    "subdistrictCode": null,
    "subdistrictName": null
  },
  "metrics": {
    "farmAreaRai": 0,
    "farmerHouseholds": 0,
    "communityEnterprises": 0,
    "largePlots": 0,
    "smartFarmers": 0,
    "youngSmartFarmers": 0,
    "hotspotCount": 0
  },
  "cropAreas": [],
  "networkCounts": {},
  "riskMetrics": {},
  "sources": [],
  "updatedAt": null
}
```

---

## 8. โครงสร้างไฟล์เป้าหมาย

```text
src/
  pages/
    SmartMap.jsx
  features/
    smart-map/
      SmartMapPage.jsx
      SmartMapPage.css
      config/
        layerCatalog.js
        basemapCatalog.js
        scenarioAssumptions.js
      components/
        SmartMapCanvas.jsx
        MapTopBar.jsx
        MapKpiBar.jsx
        LayerControlPanel.jsx
        LayerControlItem.jsx
        MapLegend.jsx
        MapStatusBar.jsx
        AreaDetailDrawer.jsx
        AreaOverviewTab.jsx
        ProductionTab.jsx
        NetworkTab.jsx
        RiskTab.jsx
        AnalysisTab.jsx
        FeaturePopup.jsx
        DataSourceBadge.jsx
        DistrictComparisonDialog.jsx
        PolicyScenarioPanel.jsx
        AiAreaInsight.jsx
      hooks/
        useSmartMapSummary.js
        useSmartMapLayerAvailability.js
        useSmartMapPointLayer.js
        useSmartMapBoundaryMetrics.js
        useSmartMapSoilLayer.js
        useSmartMapWeather.js
        useMapSelection.js
      layers/
        DistrictBoundaryLayer.jsx
        SubdistrictBoundaryLayer.jsx
        ChoroplethLayer.jsx
        PointFeatureLayer.jsx
        SoilSeriesLayer.jsx
        DistrictLabelLayer.jsx
      services/
        smartMapApi.js
      utils/
        coordinateValidation.js
        featureAdapters.js
        spatialMatching.js
        mapSanitizers.js
        formatters.js
      __tests__/
        coordinateValidation.test.js
        featureAdapters.test.js
        spatialMatching.test.js
        layerCatalog.test.js
        SmartMapPage.test.jsx
        AreaDetailDrawer.test.jsx

netlify/
  functions/
    public-smart-map-summary.js
    public-smart-map-layer-status.js
    public-smart-map-points.js
    public-smart-map-soil.js
    public-smart-map-weather.js
    lib/
      smart-map/
        layer-policy.js
        summary-builders.js
        feature-builders.js
        validators.js

supabase/
  smart_map_public_views.sql
  smart_map_coordinate_quality.sql

tests/
  e2e/
    smart-map.spec.js
```

หน้าที่ของ `src/pages/SmartMap.jsx` หลังปรับต้องเหลือเพียงการ Import และ Render `SmartMapPage`

---

## 9. API ที่ต้องสร้าง

### 9.1 `GET /api/public-smart-map-summary`

Query Parameters

```text
level=province|district|subdistrict
districtCode=
districtName=
subdistrictCode=
subdistrictName=
hotspotFrom=
hotspotTo=
```

หน้าที่

- คืนข้อมูลสรุปเฉพาะระดับพื้นที่ที่เลือก
- รวมตัวเลขด้วย SQL/RPC หรือ Query ที่น้อยที่สุด
- ส่งแหล่งข้อมูลและวันที่อัปเดตแยกตาม Metric
- เมื่อข้อมูลระดับตำบลไม่มี ให้คืน `availability: "district_only"` แทนการใช้ค่าระดับอำเภอเงียบ ๆ

### 9.2 `GET /api/public-smart-map-layer-status`

คืนสถานะทุก Layer โดยไม่ส่ง Feature ทั้งหมด

```json
{
  "layers": [
    {
      "id": "career_groups",
      "rowCount": 445,
      "validGeometryCount": 320,
      "invalidGeometryCount": 125,
      "updatedAt": "2026-07-13T00:00:00Z",
      "availability": "active"
    }
  ]
}
```

หน้าเว็บใช้ข้อมูลนี้ Disable Layer ที่ไม่มีข้อมูลจริง

### 9.3 `GET /api/public-smart-map-points`

Query Parameters

```text
layer=young_farmer_groups|career_groups|housewife_groups|forecast_plots|fire_hotspots|gis_areas|agri_tourism
bbox=minLon,minLat,maxLon,maxLat
district=
subdistrict=
from=
to=
limit=1000
```

กติกา

- `layer` ต้องอยู่ใน Allowlist
- Limit สูงสุด 1,000 จุดต่อคำขอ
- คัดเฉพาะ Public fields
- กรองพิกัดไม่ถูกต้องก่อนคืน
- ใช้ `bbox` เมื่อส่งมา
- Hotspot ต้องรองรับช่วงวันที่
- Response ต้องแจ้ง `truncated`
- ห้ามส่งชื่อเจ้าของแปลง เบอร์โทร หรือที่อยู่

### 9.4 `GET /api/public-smart-map-soil`

Query Parameters

```text
district=
soilGroup=
bbox=
limit=2000
```

คืน FeatureCollection จาก `soil_series.geometry`

### 9.5 `GET /api/public-smart-map-weather`

หน้าที่

- ดึงอากาศและ PM2.5 ของจุดตัวแทน 7 อำเภอ
- Cache ฝั่ง Server 10 ถึง 15 นาที
- หน้าเว็บเรียกครั้งเดียว
- Response ระบุว่าเป็นค่าจากจุดตัวแทนของอำเภอ ไม่ใช่ค่าเฉลี่ยทั้งพื้นที่

---

## 10. ความปลอดภัยและความเป็นส่วนตัว

### 10.1 Public Point Layer Allowlist

อนุญาตเฉพาะข้อมูลระดับกลุ่ม สถานที่ แปลงที่ไม่เปิดชื่อเจ้าของ และเหตุการณ์จากดาวเทียม

### 10.2 ห้ามส่งฟิลด์เหล่านี้

```text
citizen_id
phone
mobile
email
line_id
facebook
address_no
owner_name
chairman
contact_person
manager
full_name ของบุคคล
```

ชื่อกลุ่มและชื่อสถานที่สามารถแสดงได้

### 10.3 พิกัดบุคคล

- `smart_farmer_sf` และ `young_smart_farmer_ysf` ห้ามทำ Point Layer สาธารณะ
- หากต้องการแสดงแหล่งเรียนรู้ของเกษตรกรในอนาคต ให้สร้างตารางสถานที่สาธารณะแยกจากตารางบุคคล
- ต้องมี `is_public_location`, `coordinate_source`, `coordinate_accuracy_m` และการยินยอม

### 10.4 HTML Sanitization

สร้างฟังก์ชันกลาง

```js
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
```

ห้ามประกอบ HTML จากค่าฐานข้อมูลโดยไม่ผ่านฟังก์ชันนี้

---

## 11. การตรวจคุณภาพพิกัด

สร้าง `coordinateValidation.js`

กฎตรวจ Point

1. Parse เป็น Number ได้
2. Latitude อยู่ระหว่าง -90 ถึง 90
3. Longitude อยู่ระหว่าง -180 ถึง 180
4. ไม่ใช่ 0,0
5. อยู่ภายใน Bounding Box กว้างของประเทศไทย
6. ตรวจซ้ำด้วย Polygon จังหวัดนครปฐมเมื่อโหลด GeoJSON แล้ว
7. พิกัดซ้ำหลายรายการต้องถูก Flag แต่ไม่ลบทันที
8. UTM ต้องระบุ Zone 47N และผลแปลงต้องอยู่ในจังหวัดหรือพื้นที่ใกล้เคียง
9. แถวที่ไม่ผ่านต้องไม่นำขึ้นแผนที่ และนับใน `invalidGeometryCount`

เพิ่มหน้า Data Quality ให้มีคอลัมน์

- จำนวนแถวทั้งหมด
- มีพิกัด
- พิกัดถูกต้อง
- พิกัดอยู่นอกจังหวัด
- พิกัดซ้ำ
- ร้อยละความพร้อมขึ้นแผนที่
- อัปเดตล่าสุด

Layer พร้อมใช้เมื่อ

- มีข้อมูลอย่างน้อย 1 รายการ
- พิกัดถูกต้องอย่างน้อย 80% สำหรับ Layer ใหม่
- ไม่มีการเปิดเผยข้อมูลส่วนบุคคล
- มีแหล่งข้อมูลและวันที่อัปเดต

Layer เดิมที่ต่ำกว่า 80% ให้เปิดได้พร้อมป้าย `ข้อมูลพิกัดยังไม่ครบ` และต้องแสดงจำนวนที่แสดงจริงเทียบกับทั้งหมด

---

## 12. การจำลองนโยบายและ AI

### 12.1 What-If

ย้ายค่าคงที่ไป `scenarioAssumptions.js`

```js
export const SCENARIO_ASSUMPTIONS = {
  riceConversion: {
    waterSavedM3PerRai: 600,
    incomeAddedBahtPerRai: 12000,
    version: '1.0',
    status: 'illustrative',
    label: 'ค่าประมาณเพื่อสาธิต',
    sourceLabel: 'ต้องตรวจสอบกับแหล่งวิชาการก่อนใช้ตัดสินใจจริง',
  },
  residueManagement: {
    hotspotReductionFactor: 0.8,
    co2eReducedTonPerRai: 0.35,
    version: '1.0',
    status: 'illustrative',
    label: 'ค่าประมาณเพื่อสาธิต',
    sourceLabel: 'ต้องตรวจสอบกับแหล่งวิชาการก่อนใช้ตัดสินใจจริง',
  },
};
```

จนกว่าจะมีแหล่งอ้างอิงที่ทีมอนุมัติ ต้องใช้คำว่า

> ผลประมาณการตามสมมติฐานเพื่อการทดลอง ไม่ใช่ผลคาดการณ์อย่างเป็นทางการ

### 12.2 AI Insight

- เรียกเมื่อผู้ใช้กดเท่านั้น
- Prompt ต้องมีระดับพื้นที่และวันที่ข้อมูล
- ห้ามให้ AI อ้างว่าข้อมูลตำบลหาก Input เป็นอำเภอ
- Cache ด้วย Query Key ที่ประกอบด้วยพื้นที่ วันที่ข้อมูล และ Version ของ Prompt
- แสดงรายการตัวเลขที่ส่งให้ AI
- แสดง Disclaimer ว่าเป็นการวิเคราะห์จากข้อมูลที่มีในระบบ
- หากข้อมูลไม่ครบ ให้ AI ระบุข้อจำกัด
- ย้าย AI ไปแท็บ `วิเคราะห์` ไม่ให้แย่งพื้นที่แผนที่หลัก

---

# แผนดำเนินงาน

## งานที่ 0: สร้าง Baseline และรายงานสถานะข้อมูลจริง

**ไฟล์ที่สร้าง**

- `docs/smart-map/current-state-baseline.md`
- `scripts/audit_smart_map_layers.mjs`

**ขั้นตอน**

- [ ] สร้าง Branch `refactor/smart-map-v2`
- [ ] บันทึกภาพหน้าจอ Desktop 1440x900, Tablet 768x1024 และ Mobile 390x844
- [ ] บันทึกจำนวน Network requests เมื่อเปิดหน้า
- [ ] บันทึกเวลาจาก Navigation Start ถึงแผนที่โต้ตอบได้
- [ ] รัน Script ตรวจจำนวนแถวและพิกัดทุกตารางในบัญชี Layer
- [ ] บันทึกจำนวนพิกัดถูกต้อง ไม่ถูกต้อง ซ้ำ และอยู่นอกจังหวัด
- [ ] ระบุวันที่ตรวจสอบจริงในรายงาน
- [ ] Commit

```bash
git add docs/smart-map/current-state-baseline.md scripts/audit_smart_map_layers.mjs
git commit -m "docs: capture smart map baseline and spatial data audit"
```

**เกณฑ์ผ่าน**

- รายงานแยกทุก Layer
- ไม่ใช้จำนวนจากเอกสารเก่าแทนการ Query ฐานข้อมูลจริง
- ระบุ Layer ที่เปิดได้ ปิดชั่วคราว และต้องปรับข้อมูล

---

## งานที่ 1: สร้าง Domain Model และ Layer Catalog

**ไฟล์ที่สร้าง**

- `src/features/smart-map/config/layerCatalog.js`
- `src/features/smart-map/utils/coordinateValidation.js`
- `src/features/smart-map/utils/mapSanitizers.js`
- `src/features/smart-map/utils/spatialMatching.js`
- Unit tests ที่เกี่ยวข้อง

**ขั้นตอน**

- [ ] เขียน Test ของ Layer ID ที่ห้ามซ้ำ
- [ ] เขียน Test ว่าทุก Public Point Layer มี Public Field Allowlist
- [ ] เขียน Test ตรวจพิกัด 0,0 ค่าที่ Parse ไม่ได้ และพิกัดนอกจังหวัด
- [ ] เขียน Test จับคู่ตำบลจาก `subdistrict_code` และชื่อพื้นที่
- [ ] Implement Layer Catalog ตามตารางในเอกสารนี้
- [ ] Reuse `normalizePlaceName`, `findSubdistrictFeature` และ `countRowsBySubdistrict`
- [ ] รัน Test และ Commit

```bash
npm test -- src/features/smart-map/__tests__/layerCatalog.test.js
npm test -- src/features/smart-map/__tests__/coordinateValidation.test.js
npm test -- src/features/smart-map/__tests__/spatialMatching.test.js
git add src/features/smart-map
git commit -m "refactor: add smart map layer domain model"
```

**เกณฑ์ผ่าน**

- Catalog เป็นแหล่งเดียวของชื่อ สี ไอคอน ประเภท Geometry แหล่งข้อมูล และ Public fields
- Component ไม่ประกาศรายการ Layer ซ้ำเอง

---

## งานที่ 2: สร้าง Summary API เฉพาะ Smart Map

**ไฟล์ที่สร้าง**

- `supabase/smart_map_public_views.sql`
- `netlify/functions/public-smart-map-summary.js`
- `netlify/functions/lib/smart-map/summary-builders.js`
- Tests

**ขั้นตอน**

- [ ] สร้าง View สรุประดับอำเภอจากข้อมูลที่ระบบใช้อยู่จริง
- [ ] สร้าง View สรุประดับตำบลจาก `farmer_registry_subdistricts`, GEOPLOTS และตารางที่มีตำบล
- [ ] ทำ Normalization ชื่ออำเภอและตำบลที่ชั้น SQL หรือ Builder เดียว
- [ ] สร้าง Endpoint ตามสัญญาในหัวข้อ 9.1
- [ ] จำกัด Select fields
- [ ] ส่ง Source และ Freshness Metadata
- [ ] Test Province, District, Subdistrict และ Not Found
- [ ] Test ว่าตำบลไม่รับค่ารวมอำเภอแทนโดยเงียบ ๆ
- [ ] Commit

```bash
npm test -- netlify/functions/__tests__/public-smart-map-summary.test.js
git add supabase/smart_map_public_views.sql netlify/functions
git commit -m "feat: add scoped public smart map summary API"
```

**เกณฑ์ผ่าน**

- หน้า Smart Map ไม่ต้องเรียก `useDashboardData()`
- การเลือกตำบลคืนข้อมูลตำบลหรือสถานะ `district_only`
- Initial summary ใช้คำขอเดียว

---

## งานที่ 3: สร้าง Layer Status และ Point API

**ไฟล์ที่สร้าง**

- `supabase/smart_map_coordinate_quality.sql`
- `netlify/functions/public-smart-map-layer-status.js`
- `netlify/functions/public-smart-map-points.js`
- `netlify/functions/lib/smart-map/layer-policy.js`
- `netlify/functions/lib/smart-map/feature-builders.js`
- Tests

**ขั้นตอน**

- [ ] สร้าง Allowlist ของ Layer และฟิลด์ที่ส่งได้
- [ ] สร้าง View หรือ Function นับคุณภาพพิกัด
- [ ] สร้าง Endpoint สถานะ Layer
- [ ] สร้าง Endpoint จุดแบบ BBox Filter
- [ ] รองรับ UTM ของ `forecast_plots`
- [ ] รองรับ Date Range ของ `fire_hotspots`
- [ ] ส่ง GeoJSON FeatureCollection
- [ ] Test ว่าไม่มี PII ใน Response
- [ ] Test Invalid Layer ID, Limit เกินกำหนด และ BBox ผิด
- [ ] Commit

```bash
npm test -- netlify/functions/__tests__/public-smart-map-layer-status.test.js
npm test -- netlify/functions/__tests__/public-smart-map-points.test.js
git add supabase/smart_map_coordinate_quality.sql netlify/functions
git commit -m "feat: add safe smart map point layer APIs"
```

**เกณฑ์ผ่าน**

- ไม่ส่งชื่อเจ้าของแปลงหรือข้อมูลติดต่อ
- Query Error คืน HTTP Error ที่มีข้อความ
- Response แจ้งจำนวนจุดที่ตัดทิ้งและจำนวนที่ถูก Truncate

---

## งานที่ 4: สร้าง Soil และ Weather API

**ไฟล์ที่สร้าง**

- `netlify/functions/public-smart-map-soil.js`
- `netlify/functions/public-smart-map-weather.js`
- Tests

**ขั้นตอน**

- [ ] อ่าน Polygon จาก `soil_series.geometry`
- [ ] รองรับ District, Soil Group และ BBox
- [ ] Escape ข้อมูล Tooltip ฝั่ง Client
- [ ] รวม Weather และ Air Quality ของ 7 อำเภอในคำขอเดียว
- [ ] Cache 10 ถึง 15 นาที
- [ ] ใส่ Source และ Updated Time
- [ ] Test กรณี External API ล่ม โดยคืนข้อมูลเดิมหรือสถานะเฉพาะส่วน
- [ ] Commit

```bash
npm test -- netlify/functions/__tests__/public-smart-map-soil.test.js
npm test -- netlify/functions/__tests__/public-smart-map-weather.test.js
git add netlify/functions
git commit -m "feat: add cached soil and weather map APIs"
```

---

## งานที่ 5: แยก Smart Map Monolith โดยไม่เปลี่ยนหน้าตาใหญ่

**ไฟล์ที่แก้**

- `src/pages/SmartMap.jsx`
- `src/pages/SmartMap.css`

**ไฟล์ที่สร้าง**

- ไฟล์ใน `src/features/smart-map/` ตามหัวข้อ 8

**ขั้นตอน**

- [ ] สร้าง `SmartMapPage`
- [ ] ย้าย Map Canvas
- [ ] ย้าย Layer Panel
- [ ] ย้าย KPI Bar
- [ ] ย้าย Area Detail Drawer
- [ ] ย้าย Comparison Dialog
- [ ] ย้าย What-If และ AI
- [ ] ให้ `src/pages/SmartMap.jsx` เหลือ Wrapper
- [ ] รักษา CSS และพฤติกรรมเดิมก่อน
- [ ] เพิ่ม Error Boundary ระดับแผนที่และระดับ Layer
- [ ] รัน Test, Lint, Build และ Commit

```bash
npm run lint:src
npm test
npm run build
git add src/pages/SmartMap.jsx src/pages/SmartMap.css src/features/smart-map
git commit -m "refactor: split smart map into focused modules"
```

**เกณฑ์ผ่าน**

- ไม่มี Component หลักเกินประมาณ 400 บรรทัด
- ไม่มีไฟล์เดียวรับผิดชอบ Data Fetch, Map Render, Drawer, AI และ Simulation พร้อมกัน
- หน้าตาและฟีเจอร์เดิมยังใช้งานได้

---

## งานที่ 6: เปลี่ยน Data Flow มาใช้ API ใหม่

**ไฟล์ที่สร้างหรือแก้**

- `src/features/smart-map/services/smartMapApi.js`
- Hooks ใน `src/features/smart-map/hooks/`
- `SmartMapPage.jsx`

**ขั้นตอน**

- [ ] ลบการใช้ `useDashboardData()` จาก Smart Map
- [ ] สร้าง Query Keys แบบคงที่
- [ ] Initial load เรียก Summary, Layer Status และ Weather
- [ ] Point Layer โหลดเมื่อเปิดเท่านั้น
- [ ] Soil โหลดเมื่อเปิดเท่านั้น
- [ ] เปลี่ยนพื้นที่แล้วใช้ Query Key ใหม่ตาม Scope
- [ ] Abort Query เก่าที่ไม่ใช้
- [ ] แสดง Error แยก Layer
- [ ] Commit

**Query Key ตัวอย่าง**

```js
['smart-map', 'summary', selection][('smart-map', 'layer-status')][
  ('smart-map', 'points', layerId, bbox, filters)
][('smart-map', 'soil', district, soilGroup, bbox)][('smart-map', 'weather')];
```

**เกณฑ์ผ่าน**

- Initial app data requests ไม่เกิน 3 คำขอ ไม่นับ Map Tiles
- หน้าแผนที่แสดงได้แม้ Weather ล่ม
- Layer หนึ่งล้มไม่ทำให้ทั้งหน้าหาย

---

## งานที่ 7: แก้ข้อมูลระดับตำบลและเพิ่ม Choropleth ใหม่

**ขั้นตอน**

- [ ] สร้าง Area Selection State เดียว
- [ ] เลือกตำบลแล้วโหลด Summary ระดับตำบล
- [ ] แสดง `ข้อมูลระดับอำเภอ` เฉพาะเมื่อ API ระบุ `district_only`
- [ ] เพิ่ม Farmer Registry Choropleth
- [ ] เพิ่ม GEOPLOTS Choropleth
- [ ] เพิ่ม Group Count Choropleth
- [ ] เพิ่ม Hotspot Count Choropleth ตามช่วงเวลา
- [ ] สร้าง Legend ที่เปลี่ยนตาม Metric และหน่วย
- [ ] Test Scope Switching
- [ ] Commit

**เกณฑ์ผ่าน**

- ชื่อพื้นที่ ตัวเลข Source และ Updated Date อยู่ระดับเดียวกัน
- เลือกตำบลหนึ่งแล้วไม่เห็นตัวเลขอำเภอโดยไม่มีคำอธิบาย
- Toggle ขอบเขตตำบลไม่ทำให้ Summary เปลี่ยนเอง

---

## งานที่ 8: ปรับ Point Layers และ Layer Control

**ขั้นตอน**

- [ ] เปลี่ยน Toggle ให้เปิดหลาย Point Layer พร้อมกันได้
- [ ] เพิ่มปุ่ม `ปิดจุดทั้งหมด`
- [ ] เพิ่มกลุ่มแม่บ้าน
- [ ] คงกลุ่มยุวเกษตรกร
- [ ] คงกลุ่มส่งเสริมอาชีพ
- [ ] คงแปลงพยากรณ์
- [ ] คงจุดความร้อน
- [ ] แสดงจำนวนจุด `แสดง X จาก Y`
- [ ] Disable GIS และท่องเที่ยวเมื่อไม่มีข้อมูล
- [ ] ใช้ Stable ID เป็น React Key
- [ ] ตั้ง `preferCanvas` บน MapContainer
- [ ] โหลดใหม่เมื่อ BBox เปลี่ยนหลังหยุดเลื่อนแผนที่ 250 ถึง 400 ms
- [ ] Test Toggle หลาย Layer และ Error State
- [ ] Commit

**เกณฑ์ผ่าน**

- Checkbox และพฤติกรรมตรงกัน
- ไม่มี Layer ว่างที่ดูเหมือนระบบเสีย
- จุดหลายประเภทแยกสีและ Legend ได้
- แผนที่ยังตอบสนองได้เมื่อเปิด Layer ที่มีข้อมูลมาก

---

## งานที่ 9: ปรับ UX, Search และ Accessibility

**ขั้นตอน**

- [ ] เพิ่มค้นหาตำบล
- [ ] เพิ่มผลค้นหากลุ่มและแปลงจาก Layer ที่เปิด
- [ ] เพิ่ม Keyboard navigation ใน Search Suggestions
- [ ] เพิ่ม `aria-label` ให้ปุ่ม Icon
- [ ] เพิ่ม Focus State ที่มองเห็นได้
- [ ] เพิ่ม `prefers-reduced-motion`
- [ ] ปรับ Bottom Sheet บนมือถือ
- [ ] ป้องกัน Chatbot บดบังแผงสำคัญบน Desktop
- [ ] เพิ่ม Map Status Bar
- [ ] Test ที่ 390x844, 768x1024 และ 1440x900
- [ ] Commit

---

## งานที่ 10: ปรับ What-If, AI และ Comparison

**ขั้นตอน**

- [ ] ย้าย What-If ไปแท็บวิเคราะห์
- [ ] ใช้ `scenarioAssumptions.js`
- [ ] แสดงสมมติฐานและสถานะ `เพื่อสาธิต`
- [ ] แสดง Input ที่ใช้คำนวณ
- [ ] ป้องกันการคำนวณเมื่อข้อมูลพื้นที่ไม่พร้อม
- [ ] AI Prompt ใช้ Scope และ Data Date ที่ถูกต้อง
- [ ] AI Response Cache ตาม Scope
- [ ] Comparison ใช้ Summary API ของสองพื้นที่
- [ ] Comparison ไม่ Fetch ข้อมูล Dashboard ทั้งระบบ
- [ ] Test สูตรและ Scope
- [ ] Commit

---

## งานที่ 11: เพิ่ม Spatial Data Quality

**ไฟล์ที่แก้**

- `src/pages/admin/DataQuality.jsx`
- `netlify/functions/data-quality-stats.js`

**ไฟล์ที่สร้างได้**

- `netlify/functions/spatial-data-quality.js`

**ขั้นตอน**

- [ ] เพิ่มตารางตรวจพิกัดราย Layer
- [ ] เพิ่มร้อยละพิกัดพร้อมใช้
- [ ] เพิ่มจำนวนพิกัดนอกจังหวัด
- [ ] เพิ่มจำนวนพิกัดซ้ำ
- [ ] เพิ่มรายการตัวอย่างแถวผิด
- [ ] เพิ่ม Export CSV สำหรับแก้ข้อมูล
- [ ] เชื่อม Layer Status กับผลตรวจนี้
- [ ] Commit

---

## งานที่ 12: ทดสอบ End-to-End และเปิดใช้งาน

**ไฟล์**

- `tests/e2e/smart-map.spec.js`

**กรณีทดสอบที่ต้องมี**

- [ ] เปิด `/smart-map` โดยไม่ Login
- [ ] เห็น Choropleth และ KPI
- [ ] ค้นหาอำเภอ
- [ ] ค้นหาตำบล
- [ ] เลือกอำเภอและตรวจชื่อ Scope
- [ ] เลือกตำบลและตรวจว่า Summary เปลี่ยน
- [ ] เปิดกลุ่มแม่บ้านและกลุ่มยุวพร้อมกัน
- [ ] เปิดแปลงพยากรณ์
- [ ] กรองจุดความร้อน 7 วัน
- [ ] เปิดชุดดิน
- [ ] เปลี่ยน Basemap ที่อนุญาต
- [ ] เปิด Comparison
- [ ] เปิด What-If
- [ ] กด AI Insight โดย Mock API
- [ ] จำลอง Weather API ล้ม
- [ ] จำลอง Point Layer API ล้ม
- [ ] ตรวจ Mobile Bottom Sheets
- [ ] ตรวจว่า Response Public ไม่มี PII

**คำสั่งตรวจขั้นสุดท้าย**

```bash
npm run lint:src
npm test
npm run build
npm run test:e2e
```

**Commit**

```bash
git add .
git commit -m "test: verify smart map v2 end to end"
```

---

## 13. เกณฑ์สำเร็จของงานทั้งหมด

### ความถูกต้อง

- เลือกตำบลแล้วแสดงข้อมูลตำบลจริง
- ไม่มีหมุดที่สร้างจากการเดาตำแหน่ง
- จุดทุกจุดผ่านการตรวจพิกัด
- Layer แสดง Source และ Updated Date
- What-If ระบุสมมติฐาน
- AI ระบุข้อจำกัดข้อมูล

### ประสิทธิภาพ

- ไม่ใช้ `useDashboardData()` ใน Smart Map
- Initial app data requests ไม่เกิน 3 คำขอ ไม่นับ Map Tiles
- Point และ Soil โหลดตามการเปิดใช้งาน
- Request จุดใช้ BBox และ Limit
- เวลาแสดงแผนที่และโต้ตอบได้ดีขึ้นจาก Baseline อย่างน้อย 30%
- การ Pan และ Zoom ไม่ค้างจากการ Render จุดทั้งหมดใหม่ทันที

### การดูแลโค้ด

- `src/pages/SmartMap.jsx` เป็น Wrapper
- Layer Config อยู่ที่เดียว
- Data Fetch อยู่ใน Hooks/Service
- Pure transformations มี Unit Test
- Component ไม่มีหน้าที่เกินขอบเขตของตน
- ไม่มี HTML String ที่แทรกค่าฐานข้อมูลโดยไม่ Escape

### ความปลอดภัย

- Endpoint Public ใช้ Field Allowlist
- ไม่มี PII ใน Point Feature
- ไม่มี Service Role Key อยู่ใน Client Bundle
- RLS และ Endpoint Policy ผ่านการทดสอบ
- Google tiles ไม่ถูกใช้จนกว่าจะมีการอนุมัติ

### ประสบการณ์ผู้ใช้

- Desktop, Tablet และ Mobile ใช้งานได้
- Layer ที่ไม่มีข้อมูลถูก Disable พร้อมเหตุผล
- Loading, Empty และ Error แยกแต่ละ Layer
- Search ใช้ Keyboard ได้
- Popup สั้นและรายละเอียดอยู่ใน Drawer
- ผู้ใช้รู้ว่ากำลังดูข้อมูลระดับจังหวัด อำเภอ หรือตำบล

---

## 14. สิ่งที่ยังไม่ควรทำในรอบนี้

- ไม่ย้ายจาก Leaflet ไป Mapbox หรือ MapLibre
- ไม่เพิ่ม 3D Map
- ไม่สร้าง Heatmap ก่อนข้อมูลจุดผ่านการตรวจคุณภาพ
- ไม่สร้างแปลง Polygon จากจุดเดียว
- ไม่ Geocode ข้อมูลบุคคลอัตโนมัติแล้วเปิดสาธารณะ
- ไม่สร้างระบบแก้พิกัดบนแผนที่ก่อน Data Quality พร้อม
- ไม่เพิ่ม Dependency สำหรับ Clustering จนกว่าจะวัดแล้วว่า Canvas และ BBox ยังไม่พอ
- ไม่รวมหน้า SoilSeries, ForecastMap และ LandingMap เข้าด้วยกันแบบคัดลอกโค้ด ให้แชร์ Adapter และ Layer Component แทน
- ไม่เปลี่ยน Design System ทั้งระบบในงานนี้

---

## 15. แผนพัฒนาข้อมูลระยะถัดไป

หลัง Smart Map V2 ทำงานเสถียร ให้พัฒนาการเก็บตำแหน่งของข้อมูลสถานที่

### ตารางที่ควรเพิ่มพิกัด

- `learning_centers`
- `pest_centers`
- `soil_fertilizer_centers`
- `large_plots`
- `community_enterprises`
- `agri_tourism`
- `gis_areas`

ฟิลด์มาตรฐาน

```text
latitude NUMERIC
longitude NUMERIC
coordinate_source TEXT
coordinate_accuracy_m NUMERIC
coordinate_verified BOOLEAN DEFAULT FALSE
coordinate_verified_at TIMESTAMPTZ
is_public_location BOOLEAN DEFAULT FALSE
```

### ตารางที่ไม่ควรเพิ่มพิกัดบ้านเพื่อแสดง Public

- `smart_farmer_sf`
- `young_smart_farmer_ysf`
- `plant_doctors`

หากต้องแสดงแหล่งเรียนรู้ ให้สร้างตาราง `public_agri_locations` แยกจากข้อมูลบุคคล และให้เจ้าของข้อมูลเลือกเปิดเผย

---

## 16. คำสั่งสำหรับ AI ผู้ลงมือทำ

1. อ่าน `README.md`, `docs/reference/ARCHITECTURE.md`, `docs/reference/DATABASE_INVENTORY_AND_LIVE_DATA.md`, `src/domain/datasetCatalog.js`, `src/pages/SmartMap.jsx`, `src/pages/SmartMap.css` และไฟล์ SQL ที่อ้างในแผนก่อนเริ่ม
2. ตรวจฐานข้อมูลจริงก่อนเชื่อจำนวนแถวในเอกสาร
3. ทำงานทีละ Task และ Commit แยก
4. เขียน Test ก่อนแก้ Pure Logic และ API
5. รักษาความสามารถเดิมที่ระบุให้คงไว้
6. ห้ามเพิ่มข้อมูลตัวอย่างลง Production DB เพื่อทำให้ Layer ดูมีข้อมูล
7. เมื่อพบ Schema ต่างจากเอกสาร ให้บันทึกความต่างใน `docs/smart-map/current-state-baseline.md` และปรับ Adapter โดยไม่เดาชื่อฟิลด์
8. หลังแต่ละ Task ให้รายงานไฟล์ที่แก้ Test ที่รัน และสิ่งที่ยังไม่ทำ
9. หาก Build หรือ Test ล้ม ต้องแก้ก่อนเริ่ม Task ถัดไป
10. เมื่อครบทุก Task ให้เปรียบเทียบกับ Baseline และแนบผลใน Pull Request
