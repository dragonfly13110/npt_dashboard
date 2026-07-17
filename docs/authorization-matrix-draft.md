# Authorization Matrix — Draft for Approval

> วันที่: 17 กรกฎาคม 2569  
> สถานะ: ร่างจาก source code และ SQL ใน repository ต้องยืนยันกับเจ้าของระบบก่อนใช้สร้าง RLS migration

## หลักการ

- ฐานข้อมูลเป็นด่านสุดท้ายของสิทธิ์; route, menu และปุ่มต้องสะท้อน policy เดียวกัน
- Guest เป็น public context ไม่ใช่ authenticated user
- สิทธิ์เขียนต้องระบุทั้ง dataset และขอบเขตข้อมูล (department หรือ district)
- `admin` เป็นผู้เดียวที่ลบหรือจัดการ policy/user

## Role และ Capability ที่เสนอ

| Capability | Guest | Viewer | Editor | District Editor | Admin |
| --- | :---: | :---: | :---: | :---: | :---: |
| ใช้ public routes / public API | ✓ | ✓ | ✓ | ✓ | ✓ |
| เข้า internal shell | – | ✓ | ✓ | ✓ | ✓ |
| อ่านข้อมูลภายใน | – | ✓ | ✓ | ตาม assignment | ✓ |
| แก้ข้อมูลกลุ่มงาน | – | – | เฉพาะ department | `personnel` และ `budgets` ของขอบเขตที่กำหนด | ✓ |
| อ่าน Data Request ที่ได้รับมอบหมาย | – | – | ตามนโยบายจังหวัด | เฉพาะอำเภอตน | ✓ |
| บันทึกร่าง/ส่ง Data Request response | – | – | ตามนโยบายจังหวัด | เฉพาะอำเภอตน | ✓ |
| ตรวจรับ/ปิด Data Request | – | – | – | – | ✓ |
| Export ข้อมูล | public export เท่านั้น | ตาม policy dataset | ตาม policy dataset | เฉพาะ assignment | ✓ |
| จัดการผู้ใช้, roles, policies และ audit | – | – | – | – | ✓ |
| ลบข้อมูล | – | – | – | – | ✓ |

## ขอบเขต Dataset ที่เสนอ

| Role | ขอบเขตอ่าน | ขอบเขตเขียน |
| --- | --- | --- |
| Guest | public views และ endpoint ที่ allow-list แล้ว | ไม่มี |
| Viewer | datasets ภายในที่องค์กรอนุมัติ | ไม่มี |
| Editor | datasets ภายในตาม policy | เฉพาะ datasets ของ department ตน |
| District Editor | assignment และข้อมูล district-scoped ที่จังหวัดเปิดให้ | response ของ assignment ใน district ตน รวมถึง `personnel` และ `budgets` ตามขอบเขตที่กำหนด |
| Admin | ทุก dataset | ทุก dataset รวม delete/restore |

## ความขัดกันที่พบในโค้ดปัจจุบัน

| จุด | หลักฐาน | ความขัดกัน |
| --- | --- | --- |
| Data Request route | `DataRequestRoute` อนุญาต `admin` และ `editor` | `district_editor` เข้า `/dashboard/data-requests` ไม่ได้ |
| Data Request RLS | `data_requests.sql` ตรวจ role `editor` สำหรับ assignment/response | role ของผู้ใช้อำเภอใน UI คือ `district_editor` |
| RLS helper | `is_viewer()` ใน `rls_role_hardening.sql` มี admin/editor/viewer | `district_editor` ไม่ได้สิทธิ์อ่านตาม helper นี้ |
| Sidebar | `editor` และ `district_editor` เห็น menu ทั้งหมด | ผู้ใช้อำเภออาจเห็นเมนูที่ RLS ไม่อนุญาต |
| Write policy | hardening ใช้ `is_editor()` แบบกว้าง; group policy ใช้ `can_write_table()` ตาม department | ผลสิทธิ์เขียนขึ้นกับ SQL ที่รันล่าสุด |
| Guest | `AuthContext` สร้าง user จำลองสำหรับ guest | Guest สามารถผ่าน `ProtectedRoute` ได้ |

## ข้อตัดสินใจที่ต้องอนุมัติ

1. `district_editor` เขียน Data Request response เฉพาะอำเภอตน และแก้ `personnel`/`budgets` ได้ตาม policy เก่า **(อนุมัติ 18 กรกฎาคม 2569)**
2. `editor` ที่อยู่สำนักงานจังหวัดควรตอบ Data Request แทนอำเภอได้หรือไม่
3. Viewer อ่านข้อมูลทุกกลุ่มงานหรือเฉพาะกลุ่มที่องค์กรระบุ
4. Dataset ใดอนุญาตให้ export สำหรับแต่ละ role
5. การลบข้อมูลใช้ hard delete, soft delete หรือ admin restore flow
6. รายชื่อ department และ district ที่เป็น canonical values

## เกณฑ์ก่อนนำ Matrix ไปสร้าง RLS

- เจ้าของผลิตภัณฑ์อนุมัติ role/capability และขอบเขตข้อมูล
- มีรายชื่อ test users ครบทุก role รวมอย่างน้อยสองอำเภอ
- Staging schema/policies ถูก export และเทียบกับ repository แล้ว
- มี test case สำหรับ allow และ deny ของทุก capability สำคัญ
