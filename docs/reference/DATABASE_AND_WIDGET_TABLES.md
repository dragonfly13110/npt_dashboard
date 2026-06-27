# สรุปตารางข้อมูลและ Widget

นับข้อมูลจาก Supabase ด้วย Management API / Service Role ณ วันที่ตรวจสอบล่าสุด

## ตารางที่มีข้อมูล

| กลุ่ม           | ตาราง                          |                      ชื่อเต็ม | จำนวนข้อมูล | หมายเหตุ                                |
| --------------- | ------------------------------ | ----------------------------: | ----------: | --------------------------------------- |
| ระบบผู้ใช้      | `profiles`                     |                 โปรไฟล์ผู้ใช้ |           5 | ผู้ใช้/role/department                  |
| บริหาร          | `budgets`                      |                      งบประมาณ |         363 | ข้อมูลงบประมาณ ปี 2569                  |
| บริหาร          | `audit_logs`                   |         ประวัติการแก้ไขข้อมูล |          65 | log CREATE/UPDATE/DELETE                |
| บริหาร          | `personnel`                    |                       บุคลากร |         107 | รายชื่อเจ้าหน้าที่เกษตรประจำจังหวัด     |
| ระบบเว็บ        | `site_statistics`              |            สถิติผู้เข้าชมเว็บ |           1 | ใช้นับ total visits                     |
| ยุทธศาสตร์      | `learning_centers`             |            ศูนย์เรียนรู้ ศพก. |           7 | ศูนย์เรียนรู้รายอำเภอ                   |
| ยุทธศาสตร์      | `agricultural_areas`           |               พื้นที่การเกษตร |           7 | พื้นที่เกษตรรายอำเภอ                    |
| ยุทธศาสตร์      | `daily_weather`                |       สภาพอากาศและน้ำฝนรายวัน |         147 | อากาศ/ฝนจาก Meteostat                   |
| ยุทธศาสตร์      | `farmer_registry`              |                ทะเบียนเกษตรกร |           8 | ทะเบียนเกษตรกรรายอำเภอ                  |
| ส่งเสริมการผลิต | `large_plots`                  |                      แปลงใหญ่ |          71 | แปลงใหญ่/สินค้า/พื้นที่/สมาชิก          |
| ส่งเสริมการผลิต | `certifications`               |          มาตรฐาน GAP/ใบรับรอง |       1,963 | ข้อมูล GAP                              |
| พัฒนาเกษตรกร    | `community_enterprises`        |                 วิสาหกิจชุมชน |         344 | วิสาหกิจชุมชน                           |
| พัฒนาเกษตรกร    | `farmer_institutes`            |                 สถาบันเกษตรกร |           7 | กลุ่ม/สถาบันเกษตรกรรายอำเภอ             |
| พัฒนาเกษตรกร    | `smart_farmer_sf`              |       เกษตรกรปราดเปรื่อง (SF) |         506 | ข้อมูล SF รายบุคคล                      |
| พัฒนาเกษตรกร    | `young_smart_farmer_ysf`       |         เกษตรกรรุ่นใหม่ (YSF) |         120 | ข้อมูล YSF รายบุคคล                     |
| พัฒนาเกษตรกร    | `agricultural_career_groups`   |    กลุ่มส่งเสริมอาชีพการเกษตร |         445 | ข้อมูลกลุ่มอาชีพรายกลุ่ม                |
| พัฒนาเกษตรกร    | `housewife_farmer_groups`      |           กลุ่มแม่บ้านเกษตรกร |         254 | ข้อมูลกลุ่มแม่บ้านรายกลุ่ม              |
| พัฒนาเกษตรกร    | `young_farmer_groups_detailed` |               กลุ่มยุวเกษตรกร |         341 | ข้อมูลกลุ่มยุวเกษตรกรรายกลุ่ม           |
| อารักขาพืช      | `forecast_plots`               |                   แปลงพยากรณ์ |          62 | แปลงพยากรณ์/พื้นที่เสี่ยง               |
| อารักขาพืช      | `pest_centers`                 | ศูนย์จัดการศัตรูพืชชุมชน ศจช. |          46 | ศจช.                                    |
| อารักขาพืช      | `fire_hotspots`                |             จุดความร้อน/PM2.5 |         204 | จุดความร้อน                             |
| อารักขาพืช      | `soil_fertilizer_centers`      | ศูนย์จัดการดินปุ๋ยชุมชน ศดปช. |          20 | ศดปช.                                   |
| อารักขาพืช      | `ai_disease_forecasts`         |        พยากรณ์โรค & แมลง (AI) |           9 | ผลลัพธ์การวิเคราะห์พยากรณ์โรคพืชด้วย AI |
| อารักขาพืช      | `plant_doctors`                |                        หมอพืช |          34 | ทำเนียบแพทย์พืชชุมชน                    |

## ตารางที่ยังว่าง

| กลุ่ม           | ตาราง                      |              ชื่อเต็ม | จำนวนข้อมูล | หมายเหตุ                                                    |
| --------------- | -------------------------- | --------------------: | ----------: | ----------------------------------------------------------- |
| บริหาร          | `assets`                   |    ทรัพย์สิน/ครุภัณฑ์ |           0 |                                                             |
| ยุทธศาสตร์      | `gis_areas`                |           พื้นที่ GIS |           0 |                                                             |
| ยุทธศาสตร์      | `disasters`                |             ภัยพิบัติ |           0 |                                                             |
| ส่งเสริมการผลิต | `crop_production`          |             ผลผลิตพืช |           0 |                                                             |
| พัฒนาเกษตรกร    | `smart_farmers`            |      Smart Farmer Hub |           0 | ใช้ตาราง `smart_farmer_sf` และ `young_smart_farmer_ysf` แทน |
| พัฒนาเกษตรกร    | `farmer_groups`            |      กลุ่มเกษตรกร Hub |           0 | ใช้ตาราง `housewife_farmer_groups` แทน                      |
| พัฒนาเกษตรกร    | `young_farmer_groups`      |        ยุวเกษตรกร Hub |           0 | ใช้ตาราง `young_farmer_groups_detailed` แทน                 |
| พัฒนาเกษตรกร    | `agri_tourism`             |   ท่องเที่ยวเชิงเกษตร |           0 |                                                             |
| อารักขาพืช      | `pest_outbreaks`           |      การระบาดศัตรูพืช |           0 |                                                             |
| อารักขาพืช      | `biocontrol_stock`         |         สต็อกชีวภัณฑ์ |           0 |                                                             |
| คำขอข้อมูล      | `data_requests`            |            คำขอข้อมูล |           0 |                                                             |
| คำขอข้อมูล      | `data_request_assignments` |     มอบหมายคำขอข้อมูล |           0 |                                                             |
| คำขอข้อมูล      | `data_request_responses`   |       คำตอบคำขอข้อมูล |           0 |                                                             |
| ชุมชน           | `forum_posts`              |    กระดานสนทนา: โพสต์ |           0 |                                                             |
| ชุมชน           | `forum_comments`           | กระดานสนทนา: ความเห็น |           0 |                                                             |

## Widget ที่อ่านข้อมูลจาก DB

| Widget / ส่วนแสดงผล     | ตารางที่ใช้                                                                                                                                                                                                                                                                                                                                                                                                                          | ข้อมูลที่แสดง                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `RainfallSummaryWidget` | `daily_weather`                                                                                                                                                                                                                                                                                                                                                                                                                      | ฝน 7 วัน, อุณหภูมิ, ลม, ความกดอากาศ                 |
| Dashboard group summary | `agricultural_areas`, `learning_centers`, `disasters`, `large_plots`, `certifications`, `crop_production`, `community_enterprises`, `smart_farmer_sf`, `young_smart_farmer_ysf`, `housewife_farmer_groups`, `young_farmer_groups_detailed`, `agricultural_career_groups`, `farmer_institutes`, `agri_tourism`, `forecast_plots`, `pest_centers`, `soil_fertilizer_centers`, `fire_hotspots`, `ai_disease_forecasts`, `plant_doctors` | จำนวนข้อมูลแยกตามกลุ่มงาน                           |
| Dashboard charts        | `agricultural_areas`, `large_plots`, `farmer_institutes`                                                                                                                                                                                                                                                                                                                                                                             | กราฟพื้นที่เกษตร, แปลงใหญ่, สถาบันเกษตรกร           |
| `LandingBentoCards`     | `smart_farmer_sf`, `young_smart_farmer_ysf`, `community_enterprises`, `large_plots`, `agri_tourism`, `farmer_institutes`, `agricultural_areas`, `housewife_farmer_groups`, `young_farmer_groups_detailed`                                                                                                                                                                                                                            | การ์ดสรุปตัวเลขสำคัญ                                |
| `LandingMap`            | `gis_areas`, `agri_tourism`                                                                                                                                                                                                                                                                                                                                                                                                          | จุดพิกัดแผนที่                                      |
| Protection dashboard    | `forecast_plots`, `pest_centers`, `soil_fertilizer_centers`, `fire_hotspots`, `ai_disease_forecasts`, `plant_doctors`                                                                                                                                                                                                                                                                                                                | แปลงพยากรณ์, ศจช., ศดปช., จุดความร้อน, รายงานหมอพืช |

## Widget ที่ดึง API สด ไม่เก็บลง DB

| Widget                | แหล่งข้อมูล                                          | ข้อมูลที่แสดง                                      | การเก็บข้อมูล            |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------- | ------------------------ |
| `WeatherWidget`       | Open-Meteo                                           | อากาศวันนี้, อุณหภูมิ, ความชื้น, ลม, พยากรณ์ 5 วัน | cache ใน browser         |
| `AirQualityWidget`    | Open-Meteo Air Quality, BigDataCloud reverse geocode | AQI, PM2.5, PM10                                   | cache ใน browser         |
| `AgriPricesWidget`    | Netlify proxy -> MOC                                 | ราคาสินค้าเกษตร                                    | cache ใน browser         |
| `HotspotWidget`       | Netlify proxy -> GISTDA                              | จุดความร้อน VIIRS                                  | cache ใน browser         |
| `DamReservoirWidget`  | RID reservoir API                                    | น้ำในเขื่อน/อ่างเก็บน้ำ                            | cache ใน browser         |
| `SoilMoistureWidget`  | Open-Meteo                                           | ความชื้นดิน, อุณหภูมิดิน, ฝนรายจุด                 | cache ใน browser         |
| `AgriGovNewsWidget`   | DOAE/NPT/ESC/AgriTec/ICTC WP/RSS                     | ข่าวหน่วยงานรัฐ                                    | cache ใน browser         |
| `AgriMediaNewsWidget` | RSS ข่าวเกษตร                                        | ข่าวสื่อเกษตร                                      | cache ใน browser         |
| `DoaeNewsWidget`      | DOAE Nakhon Pathom WP                                | ข่าวประชาสัมพันธ์                                  | cache ใน browser         |
| `DoaeHqNewsWidget`    | DOAE HQ WP                                           | ข่าวกรมส่งเสริมการเกษตร                            | cache ใน browser         |
| `EscNewsWidget`       | ESC DOAE WP                                          | ข่าว ESC                                           | cache ใน browser         |
| `LandingChatbot`      | Netlify proxy -> KKU Chatbot API                     | แชทบอทตอบคำถามหน้าแรก                              | cache/session ใน browser |

## หมายเหตุ

- `useApiCache` ใช้ TanStack React Query เก็บ cache ใน memory ของ browser เท่านั้น
- API widget ส่วนใหญ่ไม่เขียนข้อมูลลง Supabase
- `budgets` และ `certifications` ต้องใช้สิทธิ์ service role หรือ user ที่ผ่าน RLS จึงเห็นข้อมูลครบ
