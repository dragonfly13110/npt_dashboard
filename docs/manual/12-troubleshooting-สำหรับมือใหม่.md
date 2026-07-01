# Troubleshooting สำหรับมือใหม่

ไฟล์นี้รวบรวมปัญหาที่เจ้าหน้าที่หรือนักวิชาการเกษตรอาจเจอระหว่างติดตั้ง ทดลอง และเผยแพร่เว็บ `NPT Smart Agri Dashboard`

วิธีใช้ไฟล์นี้:

1. ดูอาการที่เจอ
2. อ่านความหมายแบบง่าย
3. ทำตามวิธีแก้ทีละข้อ
4. ถ้ายังไม่ได้ ให้คัดลอกข้อความ error แบบเต็มส่งให้ทีมเทคนิค

## หลักการแก้ปัญหา

อย่าแก้หลายอย่างพร้อมกัน ให้แก้ทีละจุดแล้วทดสอบใหม่

ลำดับตรวจพื้นฐาน

```text
อยู่ถูกโฟลเดอร์หรือไม่
-> ติดตั้ง dependencies แล้วหรือยัง
-> ตั้งค่า .env ถูกหรือไม่
-> Supabase พร้อมหรือไม่
-> Netlify มี env ครบหรือไม่
```

## 1. พิมพ์คำสั่งแล้วขึ้นว่า command not found หรือ not recognized

ตัวอย่าง

```text
'node' is not recognized as an internal or external command
```

หรือ

```text
pnpm : The term 'pnpm' is not recognized
```

ความหมาย: เครื่องยังไม่รู้จักโปรแกรมนั้น หรือเพิ่งติดตั้งแต่ยังไม่ได้เปิด PowerShell ใหม่

วิธีแก้

1. ปิด PowerShell
2. เปิด PowerShell ใหม่
3. ตรวจอีกครั้ง

```powershell
node -v
pnpm -v
git --version
```

ถ้า `pnpm` ยังไม่มี ให้ติดตั้ง

```powershell
npm install -g pnpm
```

แล้วปิด PowerShell เปิดใหม่

## 2. `git clone` ไม่ได้

อาการ

```text
fatal: repository not found
```

หรือ

```text
Authentication failed
```

สาเหตุที่พบบ่อย

- URL repo ผิด
- ยังไม่ได้ login GitHub
- บัญชีไม่มีสิทธิ์อ่าน repo
- อินเทอร์เน็ตมีปัญหา

วิธีแก้

1. ตรวจ URL ว่าถูก

```powershell
git clone https://github.com/dragonfly13110/npt_dashboard.git
```

2. เปิด URL repo ใน browser ว่าเข้าได้หรือไม่
3. login GitHub ด้วยบัญชีที่มีสิทธิ์
4. ลอง clone ใหม่

## 3. เข้าโฟลเดอร์ผิด

อาการ

```text
ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND
```

หรือ

```text
Cannot find package.json
```

ความหมาย: ตอนพิมพ์คำสั่งไม่ได้อยู่ในโฟลเดอร์โปรเจกต์

วิธีแก้

ตรวจตำแหน่งปัจจุบัน

```powershell
pwd
```

เข้าโฟลเดอร์โปรเจกต์

```powershell
cd D:\projects\npt_dashboard
```

ถ้าเก็บที่ C

```powershell
cd C:\projects\npt_dashboard
```

ตรวจว่ามี `package.json`

```powershell
dir package.json
```

ถ้าเห็นไฟล์ `package.json` แล้วค่อยรันคำสั่งต่อ

## 4. `pnpm install` ช้ามาก

สาเหตุที่พบบ่อย

- อินเทอร์เน็ตช้า
- package จำนวนมาก
- antivirus ตรวจไฟล์เยอะ
- เครื่อง RAM น้อย

แนวทาง

1. รออย่างน้อย 10-15 นาทีถ้ายังมีข้อความวิ่งอยู่
2. อย่าปิด PowerShell ถ้ายังไม่ error
3. ถ้าค้างนานมาก ให้กด `Ctrl + C` แล้วรันใหม่

```powershell
pnpm install
```

ถ้ายังมีปัญหา ให้ลอง

```powershell
pnpm store prune
pnpm install
```

## 5. `pnpm install` ขึ้น error

อาการ

```text
pnpm ERR!
```

วิธีดู error

- ดูบรรทัดแรก ๆ ที่มีคำว่า `ERR`
- ดูว่าพูดถึง package ไหน
- ดูว่าพูดถึง network หรือ permission หรือไม่

วิธีแก้เบื้องต้น

1. ตรวจ Node version

```powershell
node -v
```

ควรเป็น LTS เช่น 20 หรือ 22

2. ล้าง store

```powershell
pnpm store prune
```

3. ติดตั้งใหม่

```powershell
pnpm install
```

ถ้ายังไม่ได้ ให้ส่ง error เต็มให้ทีมเทคนิค

## 6. `pnpm dev` แล้ว port ถูกใช้

อาการ

```text
Port 5173 is already in use
```

ความหมาย: มีเว็บ dev server เปิดอยู่แล้ว หรือโปรแกรมอื่นใช้ port นี้

วิธีแก้แบบง่าย

ใช้ port ใหม่

```powershell
pnpm dev --port 5174
```

แล้วเปิด

```text
http://localhost:5174/
```

## 7. เปิดเว็บแล้วหน้าขาว

ตรวจตามลำดับ

1. เปิด Developer Tools ด้วย `F12`
2. ดูแท็บ `Console`
3. ดูข้อความสีแดง

สาเหตุที่พบบ่อย

- import ไฟล์ผิด
- dependency ยังไม่ติดตั้ง
- env ไม่ครบ
- Supabase URL หรือ key ผิด

วิธีแก้เบื้องต้น

1. หยุด dev server ด้วย `Ctrl + C`
2. รัน install ใหม่

```powershell
pnpm install
```

3. เปิดใหม่

```powershell
pnpm dev
```

4. ตรวจ `.env`

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 8. เว็บขึ้น แต่ข้อมูลไม่มา

สาเหตุที่พบบ่อย

- ยังไม่ได้สร้างตารางใน Supabase
- ตารางยังไม่มีข้อมูล
- `.env` ชี้ไปคนละ Supabase project
- RLS block การอ่านข้อมูล
- column ในฐานข้อมูลไม่ตรงกับ frontend

วิธีตรวจ

1. เปิด Supabase
2. เข้า `Table Editor`
3. ดูว่ามีตารางที่ต้องใช้หรือไม่
4. เปิดตาราง ดูว่ามี row ข้อมูลหรือไม่
5. ตรวจ `.env` ว่า URL ตรงกับ project ที่เปิดอยู่

ตรวจ URL ใน `.env`

```env
VITE_SUPABASE_URL=https://ชื่อโปรเจกต์.supabase.co
```

ถ้า URL ใน `.env` ไม่ตรงกับ project ที่มีข้อมูล เว็บจะไม่เห็นข้อมูล

## 9. Login ไม่ได้

อาการ

```text
Invalid login credentials
```

สาเหตุ

- email/password ผิด
- user ยังไม่ได้สร้างใน Supabase Auth
- เปิด email confirmation แต่ยังไม่ยืนยัน

วิธีแก้

1. เข้า Supabase
2. ไป `Authentication -> Users`
3. ตรวจว่ามี user นี้หรือไม่
4. ถ้าไม่มี ให้สร้างใหม่
5. ถ้ามีแล้ว ลอง reset password

## 10. Login ได้ แต่เข้า dashboard ไม่ได้

สาเหตุที่พบบ่อย

- ไม่มี row ในตาราง `profiles`
- role ว่าง
- department ว่างหรือสะกดไม่ตรง
- RLS policy ไม่อนุญาต

ตรวจใน Supabase SQL Editor

```sql
SELECT id, email, full_name, department, role
FROM profiles
WHERE email = 'your-email@example.com';
```

สิ่งที่ควรมี

- `email` ตรงกับ user
- `role` เป็น `admin`, `editor` หรือ `viewer`
- `department` มีค่าที่ระบบรู้จัก

## 11. Search ไม่เจอข้อมูล

สาเหตุที่พบบ่อย

- คำค้นสั้นเกินไป
- ตารางยังไม่มีข้อมูล
- RPC `global_search` ยังไม่ได้สร้าง
- fallback search ไม่ได้ตั้งค่าตารางนั้น
- RLS block

วิธีตรวจ

1. ลองคำค้นยาวกว่า 2 ตัวอักษร
2. เปิดตารางใน Supabase ดูว่ามีข้อมูลจริง
3. ตรวจบท `06-การสร้าง-dashboard-search-ai.md`
4. ตรวจ browser console ว่ามี error หรือไม่

## 12. Chatbot ไม่ตอบ

สาเหตุที่พบบ่อย

- ยังไม่ได้ตั้งค่า AI API key
- Netlify Function ไม่ทำงาน
- provider ที่ใช้ไม่มี key
- key ใส่ผิดที่
- function error

ใน local ให้ตรวจ `.env` หรือวิธีที่ project ใช้ตั้งค่า AI

บน Netlify ให้ตรวจ

```text
Site configuration -> Environment variables
```

ตัวอย่าง key ที่อาจใช้

```text
GEMINI_API_KEY
OPENROUTER_API_KEY
NVIDIA_API_KEY
```

หลังเพิ่ม key บน Netlify ต้อง deploy ใหม่

## 13. `pnpm build` fail

วิธีอ่าน error

1. ดูบรรทัดแรกที่มีคำว่า `error`
2. ดูชื่อไฟล์ที่ error ชี้ไป
3. ดูเลขบรรทัด
4. แก้จุดนั้นก่อน

สาเหตุที่พบบ่อย

- import path ผิดตัวพิมพ์เล็กใหญ่
- syntax JSX ผิด
- package ยังไม่ได้ install
- env ที่ build ต้องใช้ไม่มีค่า
- มีตัวแปรที่ประกาศซ้ำ

ลองแก้พื้นฐาน

```powershell
pnpm install
pnpm build
```

ถ้ายัง fail ให้ส่ง error เต็มให้ทีมเทคนิค

## 14. Netlify build fail

ตรวจ 5 จุด

1. Build command เป็น `pnpm build`
2. Publish directory เป็น `dist`
3. มี `pnpm-lock.yaml` ใน repo
4. Netlify ใช้ Node version ที่เหมาะสม
5. Environment variables ครบ

ถ้า error พูดถึง env ให้เพิ่มใน Netlify

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## 15. Deploy แล้วหน้าเว็บเปิดได้ แต่ refresh แล้ว 404

สาเหตุ: เว็บ React เป็น SPA ต้องมี redirect

ตรวจไฟล์ `netlify.toml`

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

ถ้าไฟล์มีอยู่แล้ว ให้ตรวจว่า Netlify ใช้ repo ล่าสุดหรือไม่ แล้ว deploy ใหม่

## 16. Deploy แล้ว login ไม่ได้ แต่ local login ได้

สาเหตุที่พบบ่อย

- Netlify env ไม่ตรงกับ local `.env`
- Supabase Auth redirect URL ยังไม่มี domain Netlify
- ใช้ key ของคนละ Supabase project

ตรวจ Netlify env

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

ตรวจ Supabase

```text
Authentication -> URL Configuration
```

เพิ่ม URL เว็บจริงถ้าระบบใช้ redirect

## 17. ข้อมูลส่วนบุคคลโผล่ในหน้า public

ให้หยุดเผยแพร่หรือแก้ทันที

สิ่งที่ต้องตรวจ

- เบอร์โทรส่วนตัว
- ที่อยู่ละเอียด
- เลขบัตรประชาชน
- เลขบัญชีธนาคาร
- รายชื่อเกษตรกรพร้อมข้อมูลติดต่อ

แนวทางแก้

1. ซ่อน field นั้นใน frontend
2. ทำ public view เฉพาะข้อมูลที่เผยแพร่ได้
3. ปรับ RLS
4. ตรวจ search และ export ด้วย

## 18. ควรส่งอะไรให้ทีมเทคนิคเมื่อแก้เองไม่ได้

ส่งข้อมูลเหล่านี้

- ทำขั้นตอนไหนอยู่
- คำสั่งที่พิมพ์
- ข้อความ error แบบเต็ม
- รูปหน้าจอ
- URL ที่เปิด
- ใช้ local หรือ Netlify
- เพิ่งแก้ไฟล์อะไรไป

ตัวอย่างข้อความส่งทีม

```text
กำลังทำขั้น pnpm build
อยู่ใน D:\projects\npt_dashboard
รันคำสั่ง pnpm build แล้ว error ตามรูป
local dev เปิดได้ แต่ build ไม่ผ่าน
ยังไม่ได้แก้ไฟล์อื่น นอกจาก .env
```

## Checklist ก่อนขอความช่วยเหลือ

- [ ] อยู่ในโฟลเดอร์ `npt_dashboard`
- [ ] รัน `pnpm install` แล้ว
- [ ] ตรวจ `.env` แล้ว
- [ ] ตรวจ Supabase project แล้ว
- [ ] ถ้าเป็น Netlify ตรวจ environment variables แล้ว
- [ ] ถ่ายรูปหรือคัดลอก error เต็มแล้ว
