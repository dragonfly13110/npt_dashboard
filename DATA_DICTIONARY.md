# NPT Dashboard Data Dictionary

เอกสารนี้สรุปตารางข้อมูลหลักที่ระบบ Dashboard, Search, Map และ AI Chatbot ใช้งานจริง โดยอิงจาก `src/domain/datasetCatalog.js`, `src/utils/chatbotConstants.js`, public API functions และนโยบาย privacy ใน `supabase/anon_column_privacy.sql`.

## Conventions

| Field                                 | Meaning                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `id`                                  | Primary key ของ record                               |
| `created_at`, `updated_at`            | เวลาสร้าง/แก้ไข record                               |
| `district`                            | อำเภอในจังหวัดนครปฐม ถ้าไม่ได้ระบุเป็นอย่างอื่น      |
| `subdistrict`                         | ตำบล                                                 |
| `data_year`, `year`                   | ปีข้อมูล มักเป็นปีงบประมาณหรือปี พ.ศ. ตามแหล่งข้อมูล |
| `*_rai`                               | พื้นที่ หน่วยไร่                                     |
| `*_kg`, `*_ton`                       | ผลผลิต หน่วยกิโลกรัม/ตัน                             |
| `*_baht`, `income`, `fund_management` | จำนวนเงิน หน่วยบาท                                   |
| `count`, `*_count`, `member_count`    | จำนวนรายการ/กลุ่ม/สมาชิก                             |

## Access And Privacy

| Audience            | Access                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `guest` / anonymous | อ่านเฉพาะ public-safe columns ผ่าน RLS, public RPC/API, และ `getDatasetSelectColumns(... purpose: 'ai')` |
| authenticated staff | อ่านข้อมูลตามสิทธิ์กลุ่มงาน                                                                              |
| admin/service role  | ใช้ใน sync, import, maintenance และ background jobs                                                      |

Public views/API ต้องไม่ส่งข้อมูลส่วนบุคคล เช่น ชื่อเต็ม เบอร์โทร ที่อยู่ อีเมล LINE/Facebook รายได้รายบุคคล เลขบัตร หรือชื่อเจ้าของแปลง เว้นแต่เป็นข้อมูลที่ระบบตั้งใจเปิดให้ผู้ใช้สิทธิ์เหมาะสมเท่านั้น.

## Core Dataset Catalog

| Table                          | Thai name                  | Group       | Route                                               | Search columns                                                                                                              | Numeric columns                                                                      | Category columns                                                                                     |
| ------------------------------ | -------------------------- | ----------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `agricultural_areas`           | พื้นที่การเกษตร            | Strategy    | `/dashboard/strategy/agricultural-areas`            | `district`                                                                                                                  | `total_area_rai`, `agri_crop_area_rai`, `farmer_households`, crop area columns       | -                                                                                                    |
| `farmer_registry`              | ทะเบียนเกษตรกร             | Strategy    | `/dashboard/strategy/farmer-registry`               | `main_crop`                                                                                                                 | `households_count`, `total_members`                                                  | -                                                                                                    |
| `learning_centers`             | ศูนย์เรียนรู้ (ศพก.)       | Strategy    | `/dashboard/strategy/learning-centers`              | `name`, `chairman_name`, `featured_product`                                                                                 | -                                                                                    | -                                                                                                    |
| `daily_weather`                | สภาพอากาศและน้ำฝน          | Strategy    | `/dashboard/strategy/daily-weather`                 | -                                                                                                                           | `tavg`, `tmin`, `tmax`, `prcp`, `wspd`, `pres`                                       | -                                                                                                    |
| `disasters`                    | ภัยพิบัติ                  | Development | `/dashboard/development/disasters`                  | `disaster_type`, `subdistrict`                                                                                              | `affected_area_rai`, `affected_households`, `damage_baht`                            | -                                                                                                    |
| `large_plots`                  | แปลงใหญ่                   | Production  | `/dashboard/production/large-plots`                 | `plot_name`, `commodity`, `secondary_commodity`, `agency`                                                                   | `total_area_rai`, `member_count`                                                     | `commodity`                                                                                          |
| `certifications`               | มาตรฐาน GAP                | Production  | `/dashboard/production/certifications`              | `farmer_name`, `crop_name`, `plot_code`                                                                                     | `area_rai`                                                                           | -                                                                                                    |
| `crop_production`              | ผลผลิตพืช                  | Production  | `/dashboard/production/crop-production`             | `crop_name`                                                                                                                 | `planted_area_rai`, `harvested_area_rai`, `yield_kg_per_rai`, `total_production_ton` | -                                                                                                    |
| `production_costs`             | ต้นทุนการผลิต              | Production  | `/dashboard/production/production-costs`            | `crop_name`                                                                                                                 | `yield_kg_per_rai`, `revenue_baht_per_rai`, cost columns, `total_cost_baht`          | `data_year`, `crop_name`                                                                             |
| `community_enterprises`        | วิสาหกิจชุมชน              | Development | `/dashboard/development/community-enterprises`      | `enterprise_name`, `enterprise_type`, `district`, `subdistrict`, `address`                                                  | `member_count`, `capital_baht`                                                       | `enterprise_type`                                                                                    |
| `smart_farmers`                | เกษตรกรรุ่นใหม่            | Development | `/dashboard/development/smart-farmers`              | `full_name`, `main_product`, `farmer_type`                                                                                  | -                                                                                    | `farmer_type`, `main_product`                                                                        |
| `smart_farmer_sf`              | Smart Farmer (SF)          | Development | `/dashboard/development/smart-farmer-sf`            | `registration_code`, `full_name`, `district`, `farmer_status`, `agricultural_activity`, `phone`, `education`                | `age`, `annual_agri_income`                                                          | `data_year`, `farmer_status`, `agricultural_activity`, `education`, `district`                       |
| `young_smart_farmer_ysf`       | Young Smart Farmer (YSF)   | Development | `/dashboard/development/young-smart-farmer-ysf`     | `record_code`, `full_name`, `district`, `farmer_status`, `agricultural_activity`, `education`, `main_activity_type`         | `farm_area_rai`, `annual_agri_income`                                                | `data_year`, `district`, `farmer_status`, `agricultural_activity`, `education`, `main_activity_type` |
| `agricultural_career_groups`   | กลุ่มส่งเสริมอาชีพการเกษตร | Development | `/dashboard/development/agricultural-career-groups` | `record_code`, `group_name`, `district`, `subdistrict`, `activity`, `main_activity`, `potential_level`                      | `member_count`, `fund_management`, `income`                                          | `data_year`, `district`, `subdistrict`, `community_enterprise_registration`                          |
| `housewife_farmer_groups`      | กลุ่มแม่บ้านเกษตรกร        | Development | `/dashboard/development/housewife-farmer-groups`    | see page/API select list                                                                                                    | `member_count`, `income`                                                             | `year`, `district`, `subdistrict`, `potential_level`, `model_group`                                  |
| `young_farmer_groups_detailed` | กลุ่มยุวเกษตรกร            | Development | `/dashboard/development/young-farmer-groups`        | `group_code`, `group_name`, `chairman_name`, `district`, `subdistrict`, `model_group`, `potential_level`, `main_activities` | `member_count`, `fund_management`, `income`, `activity_count`                        | `data_year`, `district`, `subdistrict`, `potential_level`, `model_group`                             |
| `farmer_institutes`            | สถาบันเกษตรกร              | Development | `/dashboard/development/farmer-institutes`          | -                                                                                                                           | `group_count`, `sf_count`, `ysf_count`                                               | -                                                                                                    |
| `agri_tourism`                 | ท่องเที่ยวเกษตร            | Development | `/dashboard/development/agri-tourism`               | `spot_name`, `contact_person`, `spot_type`                                                                                  | -                                                                                    | -                                                                                                    |
| `forecast_plots`               | แปลงพยากรณ์                | Protection  | `/dashboard/protection/pest-outbreaks`              | `owner_name`, `crop_type`, `variety`                                                                                        | -                                                                                    | -                                                                                                    |
| `ai_disease_forecasts`         | พยากรณ์โรคและแมลง          | Protection  | `/dashboard/protection/disease-forecast`            | -                                                                                                                           | -                                                                                    | -                                                                                                    |
| `pest_centers`                 | ศจช.                       | Protection  | `/dashboard/protection/pest-centers`                | `center_name`, `chairman`, `main_crop_type`                                                                                 | -                                                                                    | -                                                                                                    |
| `plant_doctors`                | หมอพืช                     | Protection  | `/dashboard/protection/plant-doctors`               | `full_name`, `district`, `subdistrict`, `contact_phone`                                                                     | -                                                                                    | -                                                                                                    |
| `soil_fertilizer_centers`      | ศดปช.                      | Protection  | `/dashboard/protection/soil-fertilizer`             | `center_name`, `chairman`, `main_crop_type`                                                                                 | -                                                                                    | -                                                                                                    |
| `soil_series`                  | ชุดดิน                     | Protection  | `/dashboard/protection/soil-series`                 | `soil_series_name`, `soil_series_code`, `soil_group`, `texture`, `fertility`, `ph_top`, `district`                          | `area_rai`                                                                           | -                                                                                                    |
| `fire_hotspots`                | จุดเฝ้าระวัง PM2.5         | Protection  | `/dashboard/protection/fire-hotspots`               | `spot_name`                                                                                                                 | `frp`, `bright_ti4`, `bright_ti5`                                                    | -                                                                                                    |
| `budgets`                      | งบประมาณ                   | Admin       | `/dashboard/admin/budgets`                          | `project_name`, `budget_source`, `status`, `notes`                                                                          | `budget_amount`, `spent_amount`                                                      | -                                                                                                    |

## Public API Shapes

| Endpoint                                   | Source tables                                                                                                                        | Public-safe behavior                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `/api/public-certifications`               | `certifications`                                                                                                                     | Returns crop/plot certification fields and masks `farmer_name`, `plot_code` with null/fallback keys |
| `/api/public-farmer-institutes-v2`         | `smart_farmer_sf`, `young_smart_farmer_ysf`, `housewife_farmer_groups`, `young_farmer_groups_detailed`, `agricultural_career_groups` | Selects only public columns needed for public dashboard views                                       |
| `/.netlify/functions/data-quality-stats`   | selected admin tables                                                                                                                | Requires allowed origin and admin token context                                                     |
| `/.netlify/functions/sync-farmer-registry` | `farmer_registry`, `farmer_registry_snapshots`                                                                                       | Admin/manual or scheduled sync only                                                                 |
| `/.netlify/functions/sync-weather`         | `daily_weather`                                                                                                                      | Manual/scheduled sync, writes Open-Meteo weather rows                                               |

## Sensitive Columns

These columns must stay out of guest/public/AI context unless a privileged workflow explicitly needs them:

| Table                           | Private columns                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smart_farmer_sf`               | `citizen_id`, `title`, `first_name`, `last_name`, `full_name`, `phone`, `annual_agri_income`                                                       |
| `young_smart_farmer_ysf`        | `title`, `first_name`, `last_name`, `full_name`, `address_no`, `moo`, `subdistrict`, `phone`, `line_id`, `email`, `facebook`, `annual_agri_income` |
| `agricultural_career_groups`    | `address_no`, `moo`, `mobile`                                                                                                                      |
| `young_farmer_groups_detailed`  | `address_no`, `moo`, `phone`, `mobile`                                                                                                             |
| `smart_farmers`                 | `full_name`, `phone`, `address`                                                                                                                    |
| `farmer_registry`               | `contact_person`, `phone`, `address`                                                                                                               |
| `certifications`                | `owner_name`, `phone`, `address`                                                                                                                   |
| `forecast_plots`                | `owner_name`, `phone`, `address`                                                                                                                   |
| `plant_doctors`                 | `full_name`, `address_no`, `village_no`, `contact_phone`, `notes`                                                                                  |
| `large_plots`                   | `contact_person`, `phone`, `address`                                                                                                               |
| `agri_tourism`                  | `contact_person`, `phone`, `address`                                                                                                               |
| `personnel`                     | `full_name`, `phone`, `email`, `address`, `appointed_date`, `current_position_start_date`, `education`, `highest_education`, `birth_date`          |
| `forum_posts`, `forum_comments` | `author_name`, `avatar`                                                                                                                            |

## AI And Search Notes

- AI context uses `getDatasetSelectColumns(table, { purpose: 'ai', role: 'guest' })`, so private columns are filtered before data is sent to a model.
- `TABLE_SEARCH_COLS` defines keyword matching fields; avoid adding private columns there unless `dataPrivacy` also filters them for guest/AI paths.
- `NUMERIC_COLS` drives aggregation, ranking and summary calculations in `chatbotAggregationService`.
- `DISTRICT_COLS` overrides the district field for tables where the location column is not exactly `district`, for example `certifications.plot_district`.
- `CATEGORY_COLS` drives group-by summaries and dashboard/chart suggestions.

## Maintenance Checklist

When adding or changing a dataset:

1. Add route in `src/domain/datasetCatalog.json`.
2. Add metadata/search/numeric/category fields in `src/utils/chatbotConstants.js`.
3. Add privacy rules in `src/utils/dataPrivacy.js` and `supabase/anon_column_privacy.sql` when the table contains PII.
4. Update public API select lists if the table is exposed to guest dashboards.
5. Update this file and run lint/tests.
