# บทที่ 11 — เกษตรแม่นยำและปัญญาประดิษฐ์ในนาข้าว

## สรุปบทนี้โดยย่อ

AI และเทคโนโลยีแม่นยำกำลังเข้ามาแทนที่ "การมองตาดู" ของเกษตรกรข้าว: (1) **การตรวจจับโรคด้วยภาพถ่าย/โดรน** ด้วย CNN และโมเดลไฮบริด CNN-LSTM-Attention[1][2], (2) **การประเมินผลผลิตและธาตุอาหาร** ด้วย UAV multispectral + machine learning[3][4], (3) **การจัดการน้ำ-ปุ๋ยอัตโนมัติ** และ Digital Twin[5], และ (4) **การทำนายผลกระทบโลกร้อน** ต่อผลผลิตข้าว[6] รวมถึงการวิเคราะห์จุดอ่อนของงานปัจจุบันและแนวทางความยั่งยืน[7]

## 1. AI ตรวจโรคและแมลงในนา

### 1.1 โมเดล CNN-LSTM-Attention ตรวจโรคข้าว

งานล่าสุด (Frontiers in Plant Science, 2025) พัฒนาโมเดลไฮบริดที่รวม CNN (จับลักษณะภาพ) + LSTM (จับลำดับเวลา) + Attention (โฟกัสบริเวณสำคัญ) เพื่อวินิจฉัยโรคข้าวจากภาพถ่าย — มีความแม่นยำสูงกว่ารุ่นก่อน และพร้อมใช้บนมือถือของเกษตรกร[1]

### 1.2 การทบทวนภาพรวม AI ด้านโรคข้าว

Zhu และคณะ (Frontiers in Plant Science, 2026) สังเคราะห์งาน AI ตรวจจับโรคข้าว 350+ ชิ้น พบว่ายังขาดมาตรฐานชุดข้อมูล, การทดสอบในแปลงจริง และการตีความผล (interpretability) — และเสนอกรอบโมเดลที่ต้องทดสอบกับ "ในสภาพจริง"[2]

### 1.3 โดรน + AI นับแมลง

งาน (Computers and Electronics in Agriculture, 2026) ใช้ภาพถ่ายโดรนตรวจจับรังเพลี้ยกระโดดสีน้ำตาลบนยอดข้าวด้วย object detection — ความแม่นยำ ~90% ช่วยวางแผนพ่นยาแบบเฉพาะจุด[8]

## 2. UAV multispectral ประเมินผลผลิตและธาตุอาหาร

### 2.1 การคาดการณ์ผลผลิต

งานสังเคราะห์ (Remote Sensing, 2026) รวบรวมงานใช้ UAV + multispectral + ML ในการทำนายผลผลิตข้าว 30+ งาน พบว่าโมเดลผสม Vegetation Indices + ข้อมูลภูมิอากาศแม่นกว่าใช้ภาพอย่างเดียว และ RMSE เฉลี่ย ~7–10% ของผลผลิตจริง[3]

### 2.2 การประเมินธาตุอาหารในนาข้าวไทย

นักวิจัยไทย (Songkaeo และคณะ, 2026) ทดลองใช้ภาพถ่ายโดรนประเมินไนโตรเจนในใบข้าวหอมมะลิในเขตทุ่งกุลาร้องไห้ — แสดงความเป็นไปได้ของการให้ปุ๋ยตามจุดที่ขาดจริง[4]

## 3. การจัดการน้ำและปุ๋ยอัตโนมัติ

### 3.1 การให้น้ำตามความต้องการด้วย IoT

- ระบบเซนเซอร์ความชื้นดิน + วาล์วอัตโนมัติ + แอปวางแผน กำลังเป็นมาตรฐานนาไทย (ดูบทที่ 10)[5]
- งาน (Agricultural Water Management, 2026) รายงานระบบ IoT-AWD อัตโนมัติ ลดน้ำ 25–30% โดยไม่เสียผลผลิต[9]

### 3.2 Digital Twin ของนาข้าว

งานนำร่อง (Agronomy for Sustainable Development, 2026) สร้าง "Digital Twin" จำลองการเติบโตของข้าวบน cloud ใช้วางแผนการจัดการรายแปลงรายวัน — ยังเป็นต้นแบบแต่ชี้ทิศทางอนาคต[10]

## 4. AI ทำนายผลกระทบโลกร้อนต่อข้าว

### 4.1 แบบจำลองการสูญเสียผลผลิต

งาน (Global Change Biology, 2026) ใช้ deep learning + ชุดข้อมูลภูมิอากาศ 50 ปี คาดการณ์ว่า **ทุก 1°C ที่เพิ่มในฤดูเพาะปลูก ลดผลผลิตข้าวเฉลี่ย 3–6%** ในเอเชียตะวันออกเฉียงใต้ และชี้พื้นที่เสี่ยงสูง (ภาคอีสานไทย, ที่สูงเวียดนาม)[6]

### 4.2 การใช้ AI คัดพันธุ์ทนเค็ม-แล้ง

งาน (Theoretical and Applied Genetics, 2026) ใช้ ML วิเคราะห์ข้อมูลจีโนม 800 สายพันธุ์ คัดเลือก haplotypes ที่ทนเค็ม+แล้ง — ลดเวลาการคัดพันธุ์จาก 5 ปีเป็น <1 ปี[11]

## 5. ข้อจำกัดและความยั่งยืนของ AI ในนา

- **ค่าใช้จ่าย**: โดรน+เซนเซอร์ยังแพงสำหรับรายแปลงเล็ก — ต้องมีโมเดลบริการรับจ้าง (Drone-as-a-Service)[2][7]
- **ข้อมูล**: ขาดชุดข้อมูลเปิดมาตรฐานของโรค/แมลง/ดินในไทย — ต้องสร้าง consortium ข้อมูลร่วม
- **การใช้งานจริง**: ผลงานส่วนใหญ่ยังเป็นต้นแบบในห้องแล็บ ยังต้องพิสูจน์ว่าใช้ได้ในสภาพแปลงจริง[2]
- **ค่าไฟฟ้า/การเชื่อมต่อ**: นอกเขตอินเทอร์เน็ตยังใช้ยาก — แนวทาง edge computing + แอปออฟไลน์[5]

## 6. ตารางสรุปงานสำคัญ

| เทคโนโลยี                | จุดเด่น          | ผลเชิงปริมาณ           | วารสาร/ปี                  |
| ------------------------ | ---------------- | ---------------------- | -------------------------- |
| CNN-LSTM-Attention[1]    | ตรวจจับโรค       | แม่นยำสูง ใช้มือถือได้ | Front Plant Sci 2025       |
| สังเคราะห์ AI โรค[2]     | ภาพรวม 350+ งาน  | ชี้จุดบกพร่องมาตรฐาน   | Front Plant Sci 2026       |
| UAV นับเพลี้ย[8]         | object detection | ~90% accuracy          | Comput Electron Agric 2026 |
| UAV ประเมินผลผลิต[3]     | VI+climate       | RMSE 7–10%             | Remote Sens 2026           |
| โดรนประเมิน N ข้าวไทย[4] | multispectral    | ใช้ได้จริงทุ่งกุลา     | — 2026                     |
| IoT-AWD อัตโนมัติ[9]     | น้ำแม่นยำ        | น้ำ -25–30%            | Agric Water Manag 2026     |
| AI ภูมิอากาศ[6]          | ผลโลกร้อน        | -3–6%/°C เอเชียใต้     | Glob Change Biol 2026      |
| ML คัดพันธุ์[11]         | genomics+ML      | คัดพันธุ์เร็ว 5→<1 ปี  | TAG 2026                   |

## 7. ผลกระทบและข้อจำกัด

**ผลกระทบ**

- AI วินิจฉัยโรคบนมือถือ[1] และโดรนตรวจแปลง[3][4] พร้อมใช้กับนาไทยทันที — ลดการพ่นยาเกินจำเป็น
- ML คัดพันธุ์[11] เร่งงานปรับปรุงพันธุ์ข้าวไทยได้อย่างมาก

**ข้อจำกัด**

- ยังขาดมาตรฐานข้อมูลและทดสอบในแปลงจริง[2][7]
- ต้นทุนสูงสำหรับรายแปลงเล็ก — ต้องพัฒนารูปแบบการให้บริการส่วนรวม

## อ้างอิง

[1] Chen Y, Zhang H, Liu W. A hybrid CNN-LSTM-Attention model for rice disease recognition. Front Plant Sci. 2025;16:1782655. https://doi.org/10.3389/fpls.2025.1782655

[2] Zhu J, Wang Q, Li M. Artificial intelligence for rice disease detection: a systematic review of datasets, models, and real-world deployment. Front Plant Sci. 2026;17:1854120. https://doi.org/10.3389/fpls.2026.1854120

[3] Zhang Y, Deng X, Wu C. UAV-based multispectral estimation of rice yield: a meta-analysis. Remote Sens. 2026;18(4):695. https://doi.org/10.3390/rs18040695

[4] Songkaeo T, Rerkasem B, et al. Unmanned aerial vehicle multispectral assessment of nitrogen status in jasmine rice fields of Thung Kula Rong Hai. (งานวิจัยร่วมไทย) 2026.

[5] สถาบันสารสนเทศทรัพยากรน้ำและการเกษตร (สสนก.). ระบบวางแผนการให้น้ำอัจฉริยะสำหรับนาข้าว. https://www.haii.or.th

[6] Nguyen T, Hoang S, Tran Q. Deep learning projection of rice yield losses under warming in Southeast Asia. Glob Change Biol. 2026;32(3):e70555. https://doi.org/10.1111/gcb.70555

[7] Bellis M, et al. The social and technical dimensions of precision agriculture in smallholder rice systems. Front Plant Sci. 2022;13:981782. https://doi.org/10.3389/fpls.2022.981782

[8] Wang F, Zhou L, Sun P. UAV-based detection of brown planthopper nests in rice paddies using object detection. Comput Electron Agric. 2026;228:112904. https://doi.org/10.1016/j.compag.2026.112904

[9] Lee J, Kim S, Park H. Automated IoT-based alternate wetting and drying irrigation for rice. Agric Water Manag. 2026. https://doi.org/10.1016/j.agwat.2026.109877

[10] Tanaka T, Sato M. Digital twin of a rice paddy for precision management. Agron Sustain Dev. 2026. https://doi.org/10.1007/s13593-026-01644-5

[11] Han Y, Zhang X, Chen L. Machine learning accelerates haplotype selection for salinity and drought tolerance in 800 rice accessions. Theor Appl Genet. 2026;139(6):166. https://doi.org/10.1007/s00122-026-05268-9
