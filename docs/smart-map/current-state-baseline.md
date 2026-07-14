# Smart Map baseline — 2026-07-14

## วิธีตรวจ

- เปิด `/smart-map` แบบไม่ login บน local development server
- เก็บภาพที่ 1440x900, 768x1024 และ 390x844 (ไฟล์ชั่วคราวอยู่ใน `output/playwright/`)
- รัน `node scripts/audit_smart_map_layers.mjs` ด้วย service-role credentials แบบ read-only

## สรุปพฤติกรรมปัจจุบัน

- `src/pages/SmartMap.jsx` ใช้ `useDashboardData()` และ query Point layers จาก browser โดยตรง
- เปิดหน้าเรียก weather และ air-quality แยกทั้ง 7 อำเภอ และพบคำขอซ้ำใน development mode
- browser trace พบคำขอ dynamic อย่างน้อย 104 รายการ (ไม่นับ static 113 รายการที่ CLI ซ่อนไว้); รวม `guest-session` ที่ตอบ 500 สองครั้ง
- Leaflet render แล้วหลังโหลดข้อมูล; navigation timing ของเอกสารอยู่ที่ 714ms แต่ไม่ใช่ตัววัดความพร้อมของข้อมูลทั้งหมด
- Google และ Hybrid basemap ยังเลือกได้ ทั้งที่ยังไม่มีการยืนยันสิทธิ์ใช้ tile
- หน้าจอมือถือ 390x844 เริ่มต้นด้วยมุมมองกว้างจนพื้นที่จังหวัดมีขนาดเล็กมาก

## ผลตรวจชั้นข้อมูลจริง

พิกัด `valid` คืออยู่ใน bounding box กว้างของนครปฐม; `outside` คือเป็นพิกัดไทยที่อยู่นอกขอบเขตดังกล่าว. จำนวนพิกัดซ้ำไม่นับแถวแรกของพิกัดเดียวกัน.

| Layer / table                  | ทั้งหมด | พิกัดพร้อม | valid | invalid | outside | ซ้ำ | ข้อสรุป                                                      |
| ------------------------------ | ------: | ---------: | ----: | ------: | ------: | --: | ------------------------------------------------------------ |
| `young_farmer_groups_detailed` |     341 |        341 |   333 |       4 |       4 | 250 | เปิดได้พร้อมป้ายพิกัดซ้ำสูง                                  |
| `agricultural_career_groups`   |     445 |        445 |   441 |       0 |       4 | 336 | เปิดได้พร้อมป้ายพิกัดซ้ำสูง                                  |
| `housewife_farmer_groups`      |     254 |        254 |   249 |       2 |       3 | 186 | เปิดได้พร้อมป้ายพิกัดซ้ำสูง                                  |
| `forecast_plots` (UTM 47N)     |      62 |         62 |    62 |       0 |       0 |   0 | เปิดได้                                                      |
| `fire_hotspots`                |     222 |        222 |   222 |       0 |       0 |   0 | เปิดได้                                                      |
| `agri_tourism`                 |      23 |          5 |     5 |       0 |       0 |   0 | ยังไม่เปิด: พิกัดมีเพียง 5/23 แถว                            |
| `gis_areas`                    |       0 |          0 |     0 |       0 |       0 |   0 | ปิดไว้                                                       |
| `soil_series`                  |      53 |          — |     — |       — |       — |   — | Polygon มีข้อมูล; ยังไม่ได้ตรวจ geometry เชิงลึกใน audit นี้ |

## ข้อมูลสรุปที่มีจริง

| table                                                                             |         จำนวนแถว |
| --------------------------------------------------------------------------------- | ---------------: |
| `agricultural_areas`                                                              |                7 |
| `farmer_registry_subdistricts`                                                    |              102 |
| `geoplots_parcel_progress`                                                        |                7 |
| `geoplots_parcel_subdistrict_progress`                                            |              106 |
| `community_enterprises`                                                           |              344 |
| `large_plots`                                                                     |               71 |
| `smart_farmer_sf` / `young_smart_farmer_ysf`                                      |        506 / 120 |
| `certifications`                                                                  |            1,963 |
| `learning_centers` / `pest_centers` / `soil_fertilizer_centers` / `plant_doctors` | 7 / 46 / 20 / 34 |
| `disasters` / `pest_outbreaks` / `crop_production` / `ai_disease_forecasts`       | 626 / 0 / 0 / 48 |

## ข้อสรุปสำหรับงานถัดไป

1. แก้ data flow ก่อน: Summary และ Layer Status API ต้องแทน `useDashboardData()` บน Smart Map
2. เปิด `fire_hotspots`, `forecast_plots` และ `soil_series` ได้ก่อน; Point group ต้องบอกจำนวนพิกัดซ้ำและตัดพิกัดผิด/นอกจังหวัด
3. `gis_areas`, `pest_outbreaks` และ `crop_production` ต้อง disabled ตามข้อมูลจริง
4. แก้ mobile fit-bounds, ปิด basemap ที่ไม่ได้อนุมัติ และแยก weather/AQI เป็น server-side cached request ในงานถัดไป
