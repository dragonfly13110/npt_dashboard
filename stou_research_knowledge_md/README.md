# คลังงานวิจัย STOU

ชุดนี้เป็นบทสรุปภาษาไทยจาก `D:\code\Knowledge\STOU_Research_Library` จำนวน 172 เรื่อง แบ่งตามปีเอกสาร พ.ศ. 2567, 2568 และ 2569

- `articles/` บทสรุป Markdown ที่ปรับชื่อไฟล์ด้วย Handle ID เพื่อให้ใช้บนเว็บได้ปลอดภัย
- `metadata/` metadata ที่ผูกกับบทความและลิงก์กลับ STOU Research Library/PDF ต้นฉบับ
- `manifest.json` หลักฐานจำนวนไฟล์ที่นำเข้า
- `public/data/stou-research/` ผลลัพธ์ที่หน้าเว็บและบอทใช้ค้น

## สร้างข้อมูลใหม่

นำเข้าจากคลังต้นฉบับแล้วสร้างผลลัพธ์เว็บ:

```powershell
node scripts/build-stou-research.mjs --import --source "D:\code\Knowledge\STOU_Research_Library"
```

เมื่อมีไฟล์ normalized อยู่แล้ว ให้สร้างผลลัพธ์เว็บอย่างเดียว:

```powershell
npm.cmd run build:stou-research
```

PDF ต้นฉบับไม่ได้คัดลอกเข้า repository เพราะมีขนาดรวมมากกว่า 400 MB หน้าเว็บจึงใช้ลิงก์ต้นฉบับจาก metadata แทน
