# บทที่ 2 — จีโนมิกส์และ Pangenome ของข้าว

## สรุปบทนี้โดยย่อ

จีโนมอ้างอิง Nipponbare ที่ใช้มานานกว่าสองทศวรรษ ครอบคลุมความหลากหลายพันธุกรรมของข้าวเพียงส่วนเดียว การสร้าง **super-pangenome** ที่รวบรวมจีโนมข้าวหลายร้อยสายเข้าด้วยกัน เผยให้เห็น structural variation, transposable element (TE), และความหลากหลายของ centromere ที่ไม่เคยเห็นมาก่อน และกลายเป็นรากฐานของงานค้นหายีนใหม่ทั่วโลก[1][2][3][4] บทนี้รวบรวมความก้าวหน้าล่าสุดของจีโนมิกส์ข้าวปี 2024–2026

## 1. เหตุใดจีโนมอ้างอิงเดียวจึงไม่พอ?

### 1.1 ข้อจำกัดของ Nipponbare

จีโนม Nipponbare (japonica) เป็นจีโนมอ้างอิงหลักของข้าวมาตั้งแต่ปี 2002 แต่การศึกษาเชิงลึกพบว่า:

- ข้าวแต่ละสาย (โดยเฉพาะ indica และข้าวป่า) มี **ยีนที่ขาดหายไป** (gene presence/absence variation) จำนวนมาก
- **โครงสร้างโครโมโซมต่างกัน** ทั้งการกลับทิศ (inversion) การย้ายตำแหน่ง (translocation) และการซ้ำ
- เมื่อใช้จีโนมอ้างอิงเดียว งาน GWAS และ mapping จะพลาดตำแหน่งยีนที่อยู่บนส่วนจีโนมเฉพาะของแต่ละสาย[1]

### 1.2 แนวคิด super-pangenome

งานทบทวนของทีม Qian Qian / Shang Li (สถาบัน CAAS) ใน _Plant Communications_ 2025 อธิบายนิยามของ super-pangenome ว่าเป็นการรวม **ทั้งจีโนมของสปีชีส์หลัก (core + shell)** และ **จีโนมของสปีชีส์ป่า/ญาติ (Oryza spp.)** เข้าด้วยกันเป็นทรัพยากรเดียว[1] ประโยชน์หลัก:

- สร้าง "จีโนมอ้างอิงพหุ" สำหรับ mapping ยีนแม่นยำขึ้น
- ระบุยีนจากสายพันธุ์ป่าที่เข้าไม่ถึงด้วยวิธีเดิม
- ประเมินผลของโครงสร้างจีโนมต่อลักษณะทางเกษตร[1][2]

## 2. ผลงานสำคัญด้าน super-pangenome ข้าว (2024–2026)

### 2.1 แผนที่ centromere แรกของข้าวจาก super pan-genome

งานของ Lv และคณะ (JIPB, 2024) สร้าง **แผนที่ centromere** จาก super pan-genome และพบว่าโครงสร้าง centromere ของข้าวแต่ละสายแปรผันสูง ซึ่งมีผลต่อการสืบทอดลักษณะและเสถียรภาพของโครโมโซม[3]

### 2.2 eQTL + GWAS ร่วมกับ super pan-genome: ค้นยีนทนเค็ม

งานชิ้นสำคัญของ Wei และคณะ (National Science Review, 2024) ใช้ super pan-genome ร่วมกับการวิเคราะห์ eQTL และ GWAS เพื่อค้นหา **ตัวควบคุมความทนเค็ม** การผสมผสานข้อมูลการแสดงออกของยีน (expression) กับข้อมูลโครงสร้างจีโนม ทำให้สามารถแยกแยะยีนตัวจริงจากยีนที่มีเพียงความสัมพันธ์เชิงสถิติได้แม่นยำขึ้นมาก[2]

### 2.3 แผนที่ TE ทั่วทั้งข้าว (Pan-TE map)

Li และคณะ (National Science Review, 2024) สร้าง **pan-TE map** ของข้าวเอเชีย ซึ่งเป็นแผนที่ transposable element (TE) ครอบคลุมสายพันธุ์หลัก เผยให้เห็นบทบาทของ TE ต่อ:

- การปรับตัวในพื้นที่ต่างถิ่น (local adaptation)
- การเปลี่ยนแปลงการแสดงออกของยีนข้างเคียง
- กระบวนการ domestication[4]

### 2.4 TE จาก landrace สู่พันธุ์ปรับปรุง

Li และคณะ (Frontiers in Plant Science, 2025) วิเคราะห์ผ่าน pan-genome พบว่า TE บางตำแหน่งถูกคัดเลือกมาใช้ประโยชน์ในการปรับปรุงพันธุ์ตั้งแต่ระดับ landrace ไปจนถึงพันธุ์การค้า นั่นคือ TE ไม่ใช่แค่ "ดีเอ็นเอขยะ" แต่เป็นแหล่งความหลากหลายที่นักปรับปรุงพันธุ์ใช้จริง[5]

### 2.5 จีโนมิกส์ข้าวดำ: กลไก domestication ระดับ multi-omics

Zhou และคณะ (National Science Review, 2025) ใช้ multi-omics (จีโนม + ทรานสคริปโทม + เมทิลโลม) ศึกษา **ข้าวดำ (black rice)** ซึ่งหายากในธรรมชาติ (<1% ของประชากรข้าว) พบ **238 ตำแหน่งที่ถูกคัดเลือก (differentially selected regions)** ระหว่างข้าวดำและข้าวขาว ซึ่งควบคุมการสังเคราะห์แอนโทไซยานิน และให้ข้อมูลสำคัญสำหรับการปรับปรุงพันธุ์ข้าวมีสีเชิงฟังก์ชัน[6]

## 3. เครื่องมือและฐานข้อมูลที่เกี่ยวข้อง

### 3.1 จีโนมิกส์ระดับเซลล์เดียว (single-cell genomics)

งานของ Li H และคณะ (Genome Biology, 2026) ศึกษายีน **transporter ในโหนด (node) ของข้าว** ด้วยวิธี single-cell multi-omics ซึ่งช่วยไขปริศนาว่าข้าวกระจายธาตุอาหาร (ซิลิกอน เหล็ก แคดเมียม) ไปยังรวงอย่างไร และเป็นรากฐานการปรับปรุงพันธุ์ข้าวดูดธาตุอาหารเก่งและสะสมธาตุหนักน้อย[7]

### 3.2 Phenomics เชื่อมจีโนมิกส์

การระบุระยะการเจริญ (phenology) ของข้าว germplasm จำนวนมากด้วยการผสานข้อมูล remote sensing หลายมาตราส่วน (multi-scale spatio-temporal fusion) ช่วยให้การเชื่อมจีโนไทป์-ฟีโนไทป์ทำได้ในระดับแปลงใหญ่[8]

## 4. ตารางสรุปงานสำคัญ

| งาน                         | วารสาร/ปี               | ข้อมูลเชิงปริมาณ                   | นัยสำคัญ                      |
| --------------------------- | ----------------------- | ---------------------------------- | ----------------------------- |
| Super-pangenome รีวิว       | Plant Commun 2025[1]    | ครอบคลุมทั้ง core + wild relatives | กรอบแนวคิดระดับสากล           |
| eQTL+GWAS ทนเค็ม            | NSR 2024[2]             | ระบุ regulator ใหม่หลายตัว         | ค้นยีนแม่นขึ้น                |
| แผนที่ centromere           | JIPB 2024[3]            | centromere แปรผันข้ามสาย           | เสถียรภาพจีโนม/ปรับปรุงพันธุ์ |
| Pan-TE map                  | NSR 2024[4]             | ครอบคลุม TE ทั้งจีโนม              | TE = แหล่งยีนปรับตัว          |
| TE ในการปรับปรุงพันธุ์      | Front Plant Sci 2025[5] | TE จาก landrace→พันธุ์ใหม่         | ใช้ TE จริงใน breeding        |
| ข้าวดำ domestication        | NSR 2025[6]             | 238 selected regions               | พื้นฐานข้าวฟังก์ชันมีสี       |
| Transporter ระดับเซลล์เดียว | Genome Biol 2026[7]     | single-cell atlas ของโหนด          | การกระจายธาตุอาหารแม่นยำ      |

## 5. ผลกระทบและข้อจำกัด

**ผลกระทบ**

- ประเทศไทยสามารถใช้แนวทาง super-pangenome สร้าง **"Thai Rice Pangenome"** ที่ครอบคลุมข้าวหอม (ขาวดอกมะลิ 105), ข้าวเหนียว, ข้าวพื้นเมือง และข้าวทนเค็ม เพื่อค้นหายีนเฉพาะถิ่น[1][2]
- การรวม TE ในการวิเคราะห์ GWAS ลดอคติของจีโนมอ้างอิงเดียว[4][5]

**ข้อจำกัด**

- ต้นทุนการจัดลำดับจีโนมระดับ assembly เต็มคุณภาพยังสูงสำหรับหลายประเทศ
- ฐานข้อมูล super-pangenome หลายแห่งยังกระจัดกระจาย ไม่มีมาตรฐานเดียว[1]
- การแปลผล structural variation ต้องใช้บุคลากรด้านชีวสารสนเทศเฉพาะทาง

## อ้างอิง

[1] He W, Li X, Qian Q, Shang L. The developments and prospects of plant super-pangenomes: demands, approaches, and applications. Plant Commun. 2025;6(2):101230. https://doi.org/10.1016/j.xplc.2024.101230

[2] Wei H, Wang X, Zhang Z, et al. Uncovering key salt-tolerant regulators through a combined eQTL and GWAS analysis using the super pan-genome in rice. Natl Sci Rev. 2024;11(4):nwae043. https://doi.org/10.1093/nsr/nwae043

[3] Lv Y, Liu C, Li X, et al. A centromere map based on super pan-genome highlights the structure and function of rice centromeres. J Integr Plant Biol. 2024;66(2):196–207. https://doi.org/10.1111/jipb.13607

[4] Li X, Dai X, He H, et al. A pan-TE map highlights transposable elements underlying domestication and agronomic traits in Asian rice. Natl Sci Rev. 2024;11(6):nwae188. https://doi.org/10.1093/nsr/nwae188

[5] Li X, Dai X, He H, et al. Uncovering the breeding contribution of transposable elements from landraces to improved varieties through pan-genome-wide analysis in rice. Front Plant Sci. 2025;16:1573546. https://doi.org/10.3389/fpls.2025.1573546

[6] Zhou Z, Yang Z, Zhang Q, et al. Integrative multi-omics analysis reveals the domestication mechanism of black rice. Natl Sci Rev. 2025;13(10):nwaf497. https://doi.org/10.1093/nsr/nwaf497

[7] Li H, Jin H, Ning M, et al. Functional characterization of transporter genes in rice node at single-cell resolution through multi-omics technologies. Genome Biol. 2026;27(1). https://doi.org/10.1186/s13059-026-04046-6

[8] Wang H, Guo W, Mu Y, et al. Multi-scale spatial-temporal remote sensing fusion for phenology identification in rice germplasm resources. Plant Phenomics. 2026;8(3):100222. https://doi.org/10.1016/j.plaphe.2026.100222

[9] Osakina A, Goad D, Jia MH, et al. Identification of a major rice blast quantitative trait locus containing Pita/Pi39(t)/Ptr in U.S. black hull awn weedy rice. Phytopathology. 2026;116(2):277–284. https://doi.org/10.1094/PHYTO-02-25-0051-R
