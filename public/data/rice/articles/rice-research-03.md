# บทที่ 3 — CRISPR และการปรับปรุงพันธุ์ข้าวระดับโมเลกุล

## สรุปบทนี้โดยย่อ

ระบบ CRISPR/Cas กลายเป็นเครื่องยนต์หลักของการปรับปรุงพันธุ์ข้าว จากยุคแรกที่เน้นทำลายยีน negative regulator ทีละตัว มาสู่ยุคปัจจุบันที่แก้ไขหลายตำแหน่งพร้อมกัน (multiplex), เพิ่มการแสดงออกยีนดี (knockup), แก้ไขลำดับใน intron, สร้างการกลายแบบ heterozygous ในยีนจำเป็น และใช้เครื่องมือที่มีขนาดเล็กลงหรือแก้ไขแบบ prime editing[1][2][3][4][5][6] บทนี้รวบรวมความก้าวหน้าล่าสุดปี 2024–2026 พร้อมผลเชิงปริมาณ

## 1. ปรัชญาใหม่: "ลบตัวรั้ง" และ "เร่งตัวดี"

### 1.1 ลบตัวรั้ง (knockout negative regulators)

งานทบทวนล่าสุดของ Wu และคณะ (Plant Biotechnology Journal, 2026) สรุปอย่างเป็นระบบว่า **negative regulator** ของลักษณะทางเกษตร (yield, quality, stress tolerance) คือเป้าหมายหลักของ CRISPR เพราะการทำลายยีนชนิดนี้ให้ผลเชิงบวกโดยตรง ตัวอย่างยีนสำคัญ: Gn1a (จำนวนเมล็ดต่อรวง), DEP1 (สถาปัตยกรรมรวง), GS3 (ขนาดเมล็ด), IPA1 (สถาปัตยกรรมต้น), OsSD1 (ความสูง), และยีนต้านทานเชิงลบ เช่น Pi21 (โรคไหม้)[1]

### 1.2 เร่งตัวดี (knockup / promoter editing)

นอกจากลบตัวรั้ง งานล่าสุดหันมาปรับเพิ่มการแสดงออกของยีนบวก เช่น:

- **OsDREB1C knockup** ด้วย CRISPR ต่อโปรโมเตอร์ในข้าวการค้า เพิ่มผลผลิตโดยไม่ลดคุณภาพหุงต้ม[2]
- การแก้โปรโมเตอร์ของยีนต้านทานหรือยีนคุณภาพเพื่อให้แสดงออกมากขึ้น[1][2]

## 2. งานวิจัยเด่นด้านเครื่องมือและกลยุทธ์ (2024–2026)

### 2.1 เครื่องมือขนาดจิ๋ว: enOsCas12f1

Wang และคณะ (Plants, 2025) ประยุกต์ใช้ **Cas12f1 ขนาดจิ๋ว** (miniature Cas จากสกุล _Oscillibacter_) ในการแก้ไขจีโนมข้าวได้สำเร็จ เครื่องมือขนาดเล็ก (~400–700 อะมิโนแอซิด เทียบกับ SpCas9 ~1,300) เอื้อต่อการส่งเข้าสู่เซลล์ผ่านวิธีที่ไม่ใช้ Agrobacterium และเปิดทางสำหรับการบรรจุหลายเครื่องมือในเวกเตอร์เดียว[3]

### 2.2 TKC-MC: แก้ยีนจำเป็นแบบ heterozygous

ปัญหาใหญ่ของ CRISPR ในข้าวคือยีนจำเป็น (essential gene) ที่ knockout แบบ homozygous ตายได้ Xu และคณะ (Plant Biotechnology Journal, 2026) เสนอเทคนิค **TKC-MC** ซึ่งสร้างการกลายแบบ heterozygous ที่สืบทอดได้ในยีนจำเป็น ช่วยให้สามารถศึกษาหน้าที่และนำยีนจำเป็นมาปรับปรุงได้โดยไม่ฆ่าต้น[4]

### 2.3 การแก้ไข intron: RISBZ1

Li และคณะ (JIPB, 2026) แก้ไขบริเวณ **intron ของ RISBZ1** ซึ่งเป็น transcription factor ควบคุมการสะสมแป้งและโปรตีน พบว่าการแก้ intron (ไม่ใช่ exon) ให้ผลด้านความทนร้อนช่วง grain filling โดยไม่รบกวนการทำงานปกติของยีน — เป็นแนวทาง "ละเอียดอ่อน" ที่ไม่ทำลายยีนทั้งตัว[5]

### 2.4 Prime editing สำหรับ cleistogamy

Shim และคณะ (Plant Physiology, 2026) ใช้ prime editing แก้ยีน SNB และ MIR172b เพื่อสร้างข้าวแบบ **cleistogamy** (ดอกปิด) ซึ่งลดการถ่ายละอองเรณูข้ามต้น — เป็นกลไกควบคุมการแพร่กระจายของยีนดัดแปลงที่สำคัญต่อความปลอดภัยทางชีวภาพ[6]

### 2.5 การแก้ไขแบบ multiplex เพื่อคุณค่าทางโภชนาการ

Fathy และคณะ (J Plant Physiology, 2026) ทบทวนและทดลอง **multiplexed genome editing** เพื่อปรับองค์ประกอบธัญพืชข้าวหลายลักษณะพร้อมกัน (แป้ง โปรตีน ไฟโตนิวเทรียนท์) ภายใต้กรอบ "แก้ไขความหิวซ่อนเร้น (hidden hunger)"[7]

### 2.6 แก้ไขข้าวพื้นเมือง (landrace) ให้ได้ผลผลิต

Yousuf และคณะ (Transgenic Research, 2025) เริ่มจากข้าวพื้นเมืองอินเดีย Chittimuthyalu ซึ่งนิยมเพราะคุณภาพแต่ผลผลิตต่ำ ใช้ tissue culture ร่วมกับ genome editing แก้ยีนผลผลิตโดยรักษาคุณภาพเดิมของ landrace[8]

### 2.7 แก้ SWEET เพื่อต้านแบคทีเรีย

Jun และคณะ (BMC Plant Biology, 2025) แก้ไขยีน **OsSWEET14** ในข้าว Samkwang (เกาหลี) ซึ่งเป็นเป้าหมายของ effector TALE จากแบคทีเรีย _Xanthomonas_ ที่ทำให้เกิดโรคขอบใบแห้ง ได้ข้าวต้านทานเพิ่มขึ้น พร้อมตรวจ transcriptome ยืนยันว่าไม่รบกวนการทำงานปกติของต้น — ตัวอย่างของการใช้ CRISPR เพื่อต้านโรคโดยตรง (รายละเอียดบทที่ 7)[9]

## 3. ตารางสรุปงานสำคัญ

| งาน/เครื่องมือ              | วารสาร/ปี               | ผลเชิงปริมาณ/จุดเด่น                         |
| --------------------------- | ----------------------- | -------------------------------------------- |
| ทบทวน negative regulators   | PBJ 2026[1]             | รวบรวมยีนเป้าหมายทั้งหมด + แนวทางเชิงพาณิชย์ |
| OsDREB1C knockup            | Plant Commun 2025[2]    | ผลผลิตเพิ่มโดยไม่เสียคุณภาพเมล็ด             |
| enOsCas12f1                 | Plants 2025[3]          | เครื่องมือเล็ก แก้จีโนมข้าวได้จริง           |
| TKC-MC                      | PBJ 2026[4]             | สร้าง heterozygous mutation ในยีนจำเป็น      |
| RISBZ1 intron editing       | JIPB 2026[5]            | ทนร้อนช่วง grain filling ผ่านการแก้ intron   |
| SNB/MIR172b prime editing   | Plant Physiol 2026[6]   | ข้าว cleistogamy ลดการแพร่ยีน                |
| Multiplex ทางโภชนาการ       | J Plant Physiol 2026[7] | ปรับหลายลักษณะในสายเดียว                     |
| แก้ landrace Chittimuthyalu | Transgenic Res 2025[8]  | เพิ่มผลผลิต รักษาคุณภาพ                      |
| OsSWEET14 editing           | BMC Plant Biol 2025[9]  | ต้านขอบใบแห้ง ไม่กระทบการเจริญ               |

## 4. ทิศทางอนาคตของการใช้ CRISPR กับข้าว

1. **แก้หลายลักษณะพร้อมกันในพันธุ์การค้าตัวเดียว** — งาน multiplex จะรวม yield + aroma + disease + heat tolerance ในรุ่นเดียว[1][7]
2. **เครื่องมือพกง่าย** (compact Cas) และ **วิธีส่งแบบใหม่** (ไร้ Agrobacterium) ลดต้นทุนและเวลาการสร้างสายพันธุ์[3]
3. **การควบคุมการแพร่ยีน** ผ่าน cleistogamy + terminator ทางชีวภาพ จะเป็นเงื่อนไขสำคัญของการขออนุญาตเชิงพาณิชย์[6]
4. **กฎระเบียบ SDN-1/SDN-2** (transgene-free) — งาน knockup OsDREB1C[2] และการแก้ intron[5] เป็นกรณีที่ไม่มี DNA แปลกปลอมหลงเหลือ จึงเข้าเกณฑ์ได้รับการยกเว้นในหลายประเทศ

## 5. ข้อจำกัด

- การแก้ไขในยีนผลผลิตหลายตำแหน่งพร้อมกันอาจมี **epistasis** หรือผลข้างเคียงที่มองไม่เห็นในเรือนทดลอง แต่เห็นในแปลงจริง
- ข้อมูลผลผลิตของหลายงานยังจากแปลงทดลองขนาดเล็ก ยังไม่ผ่านการทดสอบหลายพื้นที่หลายปี
- งานที่ใช้ promoter editing หรือ intron editing ยังมีน้อยและต้องการการยืนยันซ้ำในหลายพันธุ์

## อ้างอิง

[1] Wu W, Jin F, Xu H, et al. Negative regulators of rice agronomic traits: functional insights and applications in genome editing-based breeding. Plant Biotechnol J. 2026;24(8):4984–5001. https://doi.org/10.1111/pbi.70684

[2] Luo Y, Zhan X, Zhang Y, et al. CRISPR-Cas9-mediated knockup of OsDREB1C enhances rice yield without compromising grain quality. Plant Commun. 2025;6(10):101433. https://doi.org/10.1016/j.xplc.2025.101433

[3] Wang J, Xuan Q, Cheng B, et al. Miniature enOsCas12f1 enables targeted genome editing in rice. Plants. 2025;14(14):2100. https://doi.org/10.3390/plants14142100

[4] Xu M, Yan L, Zhu M, et al. TKC-MC: an effective strategy for generating heritable heterozygous mutations in essential genes in rice. Plant Biotechnol J. 2026;24(4):2092–2104. https://doi.org/10.1111/pbi.70472

[5] Li L, Zhou L, Jiang H, et al. Intron editing of RISBZ1 confers thermotolerance for grain filling in rice. J Integr Plant Biol. 2026. https://doi.org/10.1111/jipb.70274

[6] Shim SH, Piao R, Seo DY, et al. Loss-of-function of MIR172b and prime editing of SNB reveal a regulatory module underlying cleistogamy in rice. Plant Physiol. 2026;201(3):kiag435. https://doi.org/10.1093/plphys/kiag435

[7] Fathy K, Bharti J, Khan Sony S, et al. Triumphing over hidden hunger: redesigning rice (Oryza sativa L.) for enhanced nutraceutical grain composition utilizing multiplexed genome editing. J Plant Physiol. 2026;316:154667. https://doi.org/10.1016/j.jplph.2025.154667

[8] Yousuf F, Solanki M, Singh SS, et al. Tissue culture optimization and genome editing for yield improvement of an Indian rice landrace Chittimuthyalu. Transgenic Res. 2025;34(1):54. https://doi.org/10.1007/s11248-025-00474-5

[9] Jun Y, Han J, Kim Y, et al. Phenotypic and transcriptomic characterization of OsSWEET14-edited rice (cv. Samkwang) with enhanced bacterial blight resistance. BMC Plant Biol. 2025;25(1):1771. https://doi.org/10.1186/s12870-025-07899-4

[10] Abbas W, Xu L, Zhu Y. The molecular regulation of rice grain size: pathways and prospects for precision breeding. Plant Sci. 2026;364:112882. https://doi.org/10.1016/j.plantsci.2025.112882
