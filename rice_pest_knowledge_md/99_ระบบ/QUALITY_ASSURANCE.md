---
title: 'QUALITY_ASSURANCE'
slug: 'rice-pest-system-quality_assurance'
category: 'ระบบประกอบ'
subcategory: 'ศัตรูข้าวและการป้องกันกำจัด'
status: 'system'
source_year: 2562
source_pages: 'PDF 1.pdf-4.pdf; ระบบประกอบโครงการ'
source_pdf_pages: 'PDF 1.pdf-4.pdf'
sections_count: 3
last_reviewed: '2026-08-03'
source_document: 'ศัตรูข้าว และการป้องกันกำจัด'
---

# QUALITY_ASSURANCE

## ผลตรวจหลังสร้าง

- จำนวนบทความ: 8
- จำนวนหน้าที่มี source marker: 221
- YAML Front Matter: ตรวจครบทุกบทความและไฟล์ระบบ Markdown
- ชื่อไฟล์บทความ: slug ASCII, ไม่มีอักขระต้อง escape
- Markdown Table: ตรวจ delimiter/header ของตารางที่สร้าง
- ลิงก์ภายในระบบ: ใช้ลิงก์ relative ใน INDEX และตรวจ target แล้ว
- ความซ้ำ: ลบ running header/footer ซ้ำจาก PDF แล้ว; เนื้อหาที่ซ้ำในต้นฉบับ/คำบรรยายภาพคงไว้
- ไฟล์เสีย: ตรวจว่าไฟล์ UTF-8 อ่านได้และ JSONL parse ได้
- RAG source refs: ทุก chunk มี source page reference

## ข้อจำกัดที่บันทึกไว้

ดู `REVIEW_FLAGS.md` สำหรับความคลุมเครือจากฟอนต์ PDF ตารางแถบสี และจำนวนหน้าที่ metadata ระบุไม่ตรงกับจำนวนหน้า PDF
