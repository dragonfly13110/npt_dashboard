# Roadmap งานหนักเร่งด่วน NPT Smart Agri Dashboard

> จัดทำจากรายงาน `NPT_Dashboard_Full_Code_and_Product_Review_2026-07-17.md`  
> ระยะดำเนินการ: 20 กรกฎาคม ถึง 11 กันยายน 2569 (8 สัปดาห์)  
> เป้าหมาย: ปิดความเสี่ยงที่กระทบ Production ก่อนทำฟีเจอร์และ refactor ขนาดใหญ่อื่น

## 1. เป้าหมายของรอบงาน

รอบนี้ทำเฉพาะงานที่มีผลต่อความปลอดภัย ความถูกต้องของสิทธิ์ ความน่าเชื่อถือของข้อมูล และความเร็วของ Dashboard:

1. ทำให้ schema และ RLS สร้างซ้ำจาก Git ได้อย่างเชื่อถือได้
2. ทำให้สิทธิ์ใน UI, Route, API และฐานข้อมูลตรงกัน
3. ทำให้ Data Request ใช้งานครบตั้งแต่จังหวัดสร้างงานถึงอำเภอส่งคำตอบ
4. แยก Guest ออกจากผู้ใช้ภายในและป้องกันข้อมูลส่วนบุคคลใน Public API
5. ทำให้ Dashboard โหลดข้อมูลสรุปเร็วขึ้นและไม่แสดงข้อผิดพลาดเป็นเลขศูนย์

## 2. หลักการดำเนินงาน

- ทำทีละ Workstream ตามลำดับ ห้ามแก้ Authorization ก่อนมี migration path ที่ทดสอบได้
- ทุก commit ต้อง build และ test ผ่าน และย้อนกลับได้โดยไม่พึ่ง commit ถัดไป
- การเปลี่ยนฐานข้อมูลต้องเป็น migration ใหม่ ห้ามแก้ไฟล์ SQL เก่าเพื่อให้ Production เปลี่ยนตาม
- ทดสอบพฤติกรรมที่ผู้ใช้เห็นและขอบเขตสิทธิ์ ไม่ผูก test กับรายละเอียด implementation
- ใช้ Staging ทดสอบ migration, RLS และ E2E ก่อน Production
- ก่อน migration ใหญ่ต้องมี backup และทดสอบ restore
- หาก schema จริงต่างจาก repository ให้บันทึก drift ก่อนออกแบบ migration

## 3. ลำดับ Roadmap

| ระยะ | สัปดาห์ | งานหลัก                           | ผลลัพธ์                                                 |
| ---- | ------: | --------------------------------- | ------------------------------------------------------- |
| 0    |       1 | Baseline และ Migration Foundation | สร้างฐานทดสอบจาก migration ได้                          |
| 1    |     2–3 | Authorization และ Data Request    | สิทธิ์ตรงกันและ flow ใช้งานครบ                          |
| 2    |     4–5 | Guest Boundary และ Public Privacy | Guest เข้า internal ไม่ได้และ Public API ใช้ allow-list |
| 3    |     6–7 | Dashboard Read Model              | KPI เร็วขึ้นและแยก error จาก zero                       |
| 4    |       8 | Hardening และ Release             | ผ่าน staging, E2E, backup/restore และ checklist         |

---

## 4. ระยะ 0 — Baseline และ Migration Foundation

### เป้าหมาย

ทำให้สถานะฐานข้อมูลมีแหล่งอ้างอิงเดียว และรองรับการเปลี่ยน RLS อย่างปลอดภัย

### งาน

1. สำรวจ schema, functions, triggers และ policies จาก Staging/Production
2. เปรียบเทียบสถานะจริงกับ SQL ใน repository และบันทึก drift
3. สำรองตารางหลัก profiles, audit logs และ Data Request
4. สร้าง baseline migration จากสถานะที่ทีมยืนยัน
5. เพิ่มคำสั่ง reset ฐานทดสอบและ apply migration ตั้งแต่ศูนย์
6. เพิ่ม smoke test ตรวจตารางสำคัญ, functions และ RLS หลัง reset
7. เพิ่ม migration check ใน CI
8. เขียน runbook สำหรับ apply, verify และ rollback

### ลำดับ Commit

1. `docs: record database schema and policy drift`
2. `test: add database baseline smoke checks`
3. `chore: establish ordered supabase migrations`
4. `ci: verify migrations from a clean database`
5. `docs: add migration and rollback runbook`

### เกณฑ์รับงาน

- สร้างฐานทดสอบใหม่จาก migration ได้โดยไม่รัน SQL ด้วยมือ
- ตารางและ policy สำคัญตรงกับ baseline ที่ยืนยัน
- CI ล้มเมื่อ migration apply ไม่ได้
- มี backup และขั้นตอน restore ที่ทดลองแล้ว

---

## 5. ระยะ 1 — Authorization และ Data Request

### เป้าหมาย

ทำให้ Guest, Viewer, Editor, District Editor และ Admin มีสิทธิ์ตรงกันทุกชั้น พร้อมใช้งาน Data Request จริง

### การตัดสินใจหลัก

- `admin`: จัดการผู้ใช้ นโยบาย คำขอ และตรวจรับข้อมูล
- `editor`: แก้ข้อมูลเฉพาะกลุ่มงานที่รับผิดชอบ
- `district_editor`: อ่าน assignment และแก้ response เฉพาะอำเภอตนเอง
- `viewer`: อ่านข้อมูลภายในตามนโยบาย แต่เขียนไม่ได้
- `guest`: ใช้เฉพาะ public routes และ public endpoints
- ฐานข้อมูลเป็นด่านบังคับสิทธิ์สุดท้าย UI ใช้นโยบายเดียวกันเพื่อไม่แสดง action ที่ทำไม่ได้

### งาน

1. สร้าง Authorization Matrix จาก dataset และ action ที่มีจริง
2. ระบุ capability ขั้นต่ำ เช่น read, write, delete, export และ respond
3. เพิ่ม consistency test ระหว่าง dataset policy, route และเมนู
4. สร้าง migration ใหม่ที่ลบ policy ชื่อเก่าที่ขัดกันแล้วสร้าง policy ชุดเดียว
5. แก้ route และ sidebar ให้ `district_editor` เข้า workspace ที่จำเป็นได้
6. บังคับ district scope ใน assignment และ response
7. เพิ่ม RLS integration test ด้วยบัญชีทุก role
8. เพิ่ม E2E: Admin สร้างและ publish → District Editor เปิดและบันทึกร่าง → submit → Admin review/accept
9. ตรวจ cross-district isolation และ audit trail

### ลำดับ Commit

1. `docs: define authorization matrix and capabilities`
2. `test: capture current route and dataset permissions`
3. `refactor: centralize frontend permission decisions`
4. `db: replace conflicting role policies`
5. `fix: allow district editors to access assigned requests`
6. `fix: enforce district scope for request responses`
7. `test: cover rls access for every role`
8. `test: verify data request workflow end to end`

### เกณฑ์รับงาน

- UI, Route และ RLS ให้ผลตรงกันทุก role
- ไม่มีปุ่มที่ผู้ใช้เห็นแต่กดแล้ว permission denied
- District Editor อ่านหรือแก้ข้อมูลอำเภออื่นไม่ได้
- Data Request ผ่านตั้งแต่สร้างจนตรวจรับ
- Policy test ทำงานใน CI

---

## 6. ระยะ 2 — Guest Boundary และ Public Privacy

### เป้าหมาย

Guest ต้องเป็น public context จริง ไม่ใช่ผู้ใช้ภายในจำลอง และ Public API ต้องเผยเฉพาะฟิลด์ที่อนุมัติ

### งาน

1. เขียน regression test สำหรับ forged/expired Guest cookie
2. บังคับ `GUEST_SESSION_SECRET` อย่างน้อย 32 bytes
3. ลบ fallback ไป service role และ anon key; ไม่มี secret ให้ตอบ 503
4. ให้ authenticated `user` หมายถึง Supabase user จริงเท่านั้น
5. ย้าย public pages ออกจาก ProtectedRoute และ internal shell
6. ทำรายการ Public API และ data classification ของทุก dataset ที่เปิดสาธารณะ
7. เปลี่ยน privacy จาก deny-list เป็น public-field allow-list ราย dataset
8. ให้ public endpoint ใช้ public view หรือ select เฉพาะ allow-list
9. ลด service-role usage ใน public endpoints และบันทึก exception ที่จำเป็น
10. เพิ่ม field snapshot test และ PII regression test ทุก public endpoint

### ลำดับ Commit

1. `test: reject forged and expired guest sessions`
2. `fix: require a dedicated guest session secret`
3. `refactor: separate public context from authenticated users`
4. `refactor: move public pages outside protected routes`
5. `docs: classify public and restricted datasets`
6. `refactor: define public fields by dataset`
7. `db: add restricted public data views`
8. `refactor: query public views from public endpoints`
9. `test: snapshot public endpoint field contracts`

### เกณฑ์รับงาน

- Cookie ที่ปลอม แก้ไข หรือหมดอายุใช้ไม่ได้
- Guest เข้า internal route และ internal shell ไม่ได้
- ไม่มี fake user เช่น `guest@example.com`
- เพิ่ม column ใหม่ในตารางแล้วไม่ถูกเผยสาธารณะอัตโนมัติ
- Public response ไม่มีชื่อบุคคล โทรศัพท์ อีเมล ที่อยู่ หรือ identifier ที่ไม่ได้อนุมัติ

---

## 7. ระยะ 3 — Dashboard Read Model

### เป้าหมาย

ลดจำนวนคำขอเริ่มต้นและทำให้ข้อมูลสำหรับผู้บริหารแยกสถานะจริงออกจาก error

### API Contract กลาง

ทุก KPI ต้องส่งข้อมูลอย่างน้อย:

- `value`
- `status`: `valid`, `stale`, `unavailable` หรือ `forbidden`
- `source`
- `updatedAt`

### งาน

1. วัด baseline จำนวน request, payload และเวลาโหลด Dashboard
2. เขียน contract test สำหรับ KPI และ partial failure
3. สร้าง RPC หรือ read model `get_dashboard_overview`
4. รวม count และ KPI ที่ใช้เหนือ fold ในคำขอเดียว
5. เปลี่ยน Dashboard ให้ใช้ read model โดยมี fallback ชั่วคราว
6. แยก UI ของศูนย์จริง, ไม่มีข้อมูล, ไม่มีสิทธิ์, stale และระบบขัดข้อง
7. เพิ่ม cache/freshness metadata
8. ลบ serial count path หลัง staging ผ่าน
9. เก็บ baseline ใหม่และเปรียบเทียบผล

### ลำดับ Commit

1. `test: record dashboard request and response budgets`
2. `refactor: define dashboard metric result states`
3. `db: add dashboard overview read model`
4. `feat: load dashboard overview in one request`
5. `fix: distinguish zero from unavailable metrics`
6. `feat: expose dashboard source and freshness`
7. `refactor: remove legacy serial dashboard counts`
8. `test: verify dashboard partial failure behavior`

### เกณฑ์รับงาน

- Initial Dashboard requests ไม่เกิน 8 คำขอ
- เวลาโหลดข้อมูลหลักดีขึ้นอย่างน้อย 30% จาก baseline
- Error และ forbidden ไม่แสดงเป็นเลขศูนย์
- Widget หนึ่งล้มไม่ทำให้ Dashboard ทั้งหน้าหาย
- ทุก KPI ระบุ source และเวลาข้อมูลล่าสุด

---

## 8. ระยะ 4 — Hardening และ Release

### งาน

1. Apply migration ทั้งหมดบน Staging ใหม่ตั้งแต่ศูนย์
2. รัน RLS integration tests และ Data Request E2E
3. รัน Public API privacy/contract tests
4. วัด Dashboard performance เทียบ baseline
5. ทดสอบ external API failure และ Supabase timeout
6. ทดสอบ backup และ restore
7. จัดทำ Production migration checklist และ rollback point
8. Deploy แบบมีผู้ตรวจรับและเฝ้าดู error/latency หลังปล่อย

### คำสั่งตรวจขั้นต่ำ

```bash
npm run lint:src
npm test
npm run build
npm run test:e2e
```

### เกณฑ์พร้อม Production

- Critical และ P0 ในขอบเขตรอบนี้ปิดครบ
- Test และ build ผ่านบน CI
- ไม่มี schema drift ที่ยังไม่อธิบาย
- Staging ผ่าน flow สำคัญด้วย role จริง
- Backup/restore ผ่านการทดลอง
- มี rollback plan และผู้รับผิดชอบระหว่าง deploy

## 9. แผนรายสัปดาห์

| สัปดาห์ | วันที่              | เป้าหมาย                                                         |
| ------- | ------------------- | ---------------------------------------------------------------- |
| 1       | 20–24 ก.ค. 2569     | DB inventory, drift report, backup และ baseline migration        |
| 2       | 27–31 ก.ค. 2569     | Authorization Matrix, frontend consistency และ RLS tests ตั้งต้น |
| 3       | 3–7 ส.ค. 2569       | RLS migration และ Data Request E2E                               |
| 4       | 10–14 ส.ค. 2569     | Guest secret, auth boundary และ public route separation          |
| 5       | 17–21 ส.ค. 2569     | Public views, allow-list และ privacy contract tests              |
| 6       | 24–28 ส.ค. 2569     | Dashboard baseline, result contract และ overview RPC             |
| 7       | 31 ส.ค.–4 ก.ย. 2569 | Dashboard integration, error states และ performance verification |
| 8       | 7–11 ก.ย. 2569      | Staging hardening, restore drill และ Production release          |

## 10. Definition of Done ของทุกงาน

- มี test ที่ล้มก่อนแก้และผ่านหลังแก้สำหรับ bug หรือ logic สำคัญ
- `npm run lint:src`, `npm test` และ `npm run build` ผ่าน
- E2E ที่เกี่ยวข้องผ่าน
- Migration ถูกทดสอบจากฐานว่างและฐานที่มีข้อมูล
- ไม่มี secret หรือ PII เพิ่มใน log, fixture หรือ response
- เอกสารสิทธิ์/API/runbook ถูกอัปเดตพร้อมโค้ด
- Commit มีขอบเขตเดียวและ rollback ได้
- รายงานความเสี่ยงและผลกระทบก่อน deploy

## 11. สิ่งที่ไม่ทำในรอบนี้

- Split `SmartMapScreen` และ Smart Map feature expansion
- TypeScript migration ทั้งโปรเจกต์
- Route refactor ที่ไม่เกี่ยวกับการแยก Public/Protected
- Role-based dashboard แบบออกแบบ UX ใหม่ทั้งหมด
- Data Request V2 เช่น notification, attachment, autosave ขั้นสูง และ template versioning
- CSP overhaul
- ระบบ multi-province
- Predictive analytics, AI recommendation และฟีเจอร์ใหม่

งานเหล่านี้เริ่มได้หลัง migration, authorization และ public privacy ผ่าน Production อย่างเสถียรแล้ว

## 12. จุดตัดสินใจที่ต้องยืนยันก่อนเริ่ม

1. Production database ใดเป็น source of truth สำหรับ baseline
2. ใครอนุมัติ Authorization Matrix และรายการ public fields
3. ใช้ Staging Supabase project ใดสำหรับ destructive migration tests
4. ใครเป็นผู้ตรวจรับ Data Request flow ในบทบาทจังหวัดและอำเภอ
5. Maintenance window และ rollback owner สำหรับ Production migration
