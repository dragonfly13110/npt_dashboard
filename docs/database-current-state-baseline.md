# Database Current-State Baseline — Repository Snapshot

> วันที่ตรวจ: 17 กรกฎาคม 2569  
> ขอบเขต: SQL ใน repository เท่านั้น ยังไม่ได้เชื่อมต่อ Staging หรือ Production  
> สถานะ: ใช้เป็นรายการตรวจสอบก่อนสร้าง baseline migration ไม่ใช่คำยืนยันสถานะฐานข้อมูลจริง

## สรุป

- ยังไม่มี `supabase/migrations/`; SQL ถูกเก็บเป็นไฟล์อิสระใน `supabase/` และมีคำสั่งให้รันผ่าน SQL Editor
- ลำดับการ apply จึงไม่ถูกบังคับ และ policy/function เดียวกันถูกนิยามมากกว่าหนึ่งไฟล์
- Data Request มี policy สำหรับ `editor` ในไฟล์หนึ่ง แต่ไฟล์ hardening เหลือ Admin-only ในอีกไฟล์หนึ่ง
- RLS ของตารางหลักมีทั้งแบบ broad role และแบบ department-specific; ผลลัพธ์ขึ้นอยู่กับไฟล์ที่รันล่าสุด

## ความขัดกันที่ต้องแก้ใน Migration Programme

| หัวข้อ | หลักฐานใน repository | ผลกระทบ | สิ่งที่ต้องยืนยันจากฐานจริง |
| --- | --- | --- | --- |
| ไม่มี migration chain | ไม่มี directory `supabase/migrations/` | สร้างฐานใหม่และ rollback ซ้ำไม่ได้ | ประวัติ SQL ที่ apply ในแต่ละ environment |
| `current_profile_role()` | `data_requests.sql` และ `rls_role_hardening.sql` นิยามซ้ำ | semantics และ security options อาจต่างกันตามลำดับรัน | function body, owner และ privileges ปัจจุบัน |
| `current_profile_department()` | `data_requests.sql` และ `group_and_district_user_access.sql` นิยามซ้ำ | district scope อาจหายหรือเปลี่ยน | function body และ role/department ของผู้ใช้จริง |
| Data Request RLS | `data_requests.sql` ให้ `editor` อ่านและตอบตาม district; `rls_role_hardening.sql` สร้าง Admin-only policies | ผู้ใช้อำเภออาจเปิดหรือส่งคำตอบไม่ได้ | รายชื่อ policy ปัจจุบันของ 3 ตาราง Data Request |
| การเขียนตามกลุ่มงาน | `rls_role_hardening.sql` ใช้ `is_editor()` กว้าง; `group_and_district_user_access.sql` ใช้ `can_write_table()` ตาม department | UI/SQL อาจให้สิทธิ์ไม่ตรงกัน | policy ที่ active ของแต่ละ dataset สำคัญ |
| Public read | `schema.sql`, feature SQL และ `rls_role_hardening.sql` เปิด anon read หลายตาราง | เสี่ยงเผย field ใหม่โดยไม่ตั้งใจ | RLS policies, grants, views และ public endpoint response จริง |

## ไฟล์ที่เป็นแหล่งความเสี่ยงหลัก

| ไฟล์ | บทบาทปัจจุบัน | ข้อสังเกต |
| --- | --- | --- |
| `schema.sql` | สร้างโครงสร้างและ RLS ตั้งต้น | เป็น baseline เก่าและมี policy public read จำนวนมาก |
| `data_requests.sql` | สร้าง Data Request และ policy สำหรับ `editor` | ระบุให้ copy ไป SQL Editor; ไม่รองรับ `district_editor` ตาม role ที่ UI ใช้ |
| `rls_role_hardening.sql` | เขียน function และ policy ใหม่แบบกว้าง | ทับ Data Request ด้วย Admin-only policy |
| `group_and_district_user_access.sql` | กำหนด write scope ตาม department | นิยาม `current_profile_department()` และ policy ชุดเดียวกันซ้ำ |
| `migration_rbac_audit.sql` | RBAC/audit ในยุคก่อน | ต้องตรวจ interaction กับ function และ policy ปัจจุบัน |
| feature SQL อื่น ๆ | ตาราง/column/index/policy ราย feature | ต้องเรียงตาม dependency ก่อนทำ baseline |

## ข้อมูลที่ต้องเก็บจาก Staging ก่อนเขียน Baseline Migration

1. รายการ extensions, schemas, tables, columns, indexes, constraints และ triggers
2. `pg_policies` ของ schema `public` พร้อม command, roles, qual และ with_check
3. function definitions, owners, security definer และ execute grants โดยเฉพาะ role helpers
4. grants ของ `anon`, `authenticated` และ `service_role`
5. ตาราง/view/function ที่ public endpoint ใช้จริง
6. จำนวนแถวและ sample ที่ไม่ใช่ PII ของ `profiles` และ 3 ตาราง Data Request
7. สถานะ RLS enabled/forced ทุกตารางที่รับข้อมูลจากผู้ใช้
8. รายชื่อ role และ department ที่ใช้งานจริง รวม mapping ชื่ออำเภอ
9. export schema จาก Staging และ Production เพื่อนำมา diff กับ Git
10. backup และผล restore drill ก่อน apply migration ที่เปลี่ยน policy

## ขอบเขต Baseline Migration รุ่นแรก

Baseline รุ่นแรกต้องทำให้สร้าง environment ทดสอบได้ แต่ยังไม่เปลี่ยนนโยบายธุรกิจ:

1. จัด SQL เดิมตาม dependency และบันทึกลำดับอย่างชัดเจน
2. ใช้ migration ใหม่สำหรับการแก้ policy/function ที่ชนกัน ห้ามแก้ประวัติ migration ที่ apply แล้ว
3. เพิ่ม smoke checks สำหรับ profiles, Data Request และ role helper functions
4. เปรียบเทียบ schema ที่สร้างใหม่กับ Staging หลัง apply

## ห้ามทำก่อนมีหลักฐานจาก Staging

- ลบหรือ replace policy ที่ Production ใช้งานอยู่
- เดา role/department ของผู้ใช้อำเภอ
- เปลี่ยน public read เป็น private โดยไม่มี inventory ของ frontend และ Netlify functions
- สร้าง baseline จาก `schema.sql` เพียงไฟล์เดียว

