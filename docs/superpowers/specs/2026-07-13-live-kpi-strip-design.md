# Live KPI Strip Design

## Goal

ปรับแถบ KPI หน้าแรกให้ดูเป็นระบบข้อมูลเกษตรสมัยใหม่ อ่านค่าหลักได้เร็ว และสื่อชัดว่าการ์ดคลิกเพื่อเปิดข้อมูลเต็มได้

## Visual direction

- ใช้ section พื้น mint อ่อนแบบโปร่งแทนการปล่อยการ์ดลอยเดี่ยว
- Header: `ข้อมูลสดจากพื้นที่` พร้อมจุดสถานะสีเขียว
- Supporting text: `ภาพรวมสภาพแวดล้อมและการเกษตร • คลิกการ์ดเพื่อดูข้อมูลแบบเต็ม`
- การ์ดพื้นเกือบขาว ใช้ accent เฉพาะเส้นบนและ icon tile ของแต่ละหมวด
- ตัวเลขหลัก 28px; หน่วยเล็กและวาง baseline เดียวกัน; metadata ไม่เกินหนึ่งบรรทัด
- Icon ใช้รูปแบบ tile ขนาดเท่ากันทุกการ์ด

## Layout

- Desktop: 5 คอลัมน์เท่ากัน
- Tablet: 3 คอลัมน์
- Mobile: 1–2 คอลัมน์ตามพื้นที่
- Card สูงใกล้เคียงกันและไม่บีบ label ให้แตกหลายบรรทัดโดยไม่จำเป็น

## Interaction and accessibility

- ทั้งการ์ดเป็น button และเปิด modal ข้อมูลเต็มเดิม
- Hover: ยก 2px, accent/border ชัดขึ้น, แสดงลูกศร
- Keyboard: `focus-visible` ring สี teal
- `prefers-reduced-motion` ปิดการยกการ์ด
- Loading ใช้เครื่องหมาย `—` และข้อความกำลังอัปเดต โดยไม่เปลี่ยนขนาดการ์ด

## Data behavior

- KPI ใช้ query/cache เดียวกับ widget เต็ม
- การเปิด modal ภายในช่วง stale time ต้องไม่ refetch ซ้ำ
- ไม่เพิ่ม API หรือ dependency ใหม่

## Verification

- Production build ผ่าน
- ตรวจ desktop, tablet และ mobile layout
- ตรวจการเปิด modal ทั้ง 5 การ์ดด้วย mouse และ keyboard
