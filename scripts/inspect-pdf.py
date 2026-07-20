import sys
from pypdf import PdfReader

pdf_path = "d:/code/npt_dashboard/farmer69_knowledge_v1.1/08_ส่งออก/เว็บไซต์/พร้อมใช้งาน/source/farmer69-watermark.pdf"
print(f"Reading PDF: {pdf_path}")
reader = PdfReader(pdf_path)
print(f"Total pages: {len(reader.pages)}")

output_file = "d:/code/npt_dashboard/tmp/pdf-inspection.txt"
import os
os.makedirs(os.path.dirname(output_file), exist_ok=True)

with open(output_file, "w", encoding="utf-8") as out:
    def inspect_page(page_num, label):
        out.write(f"\n=========================================\n")
        out.write(f"INSPECTING: {label} (PDF Page {page_num})\n")
        out.write(f"=========================================\n")
        if page_num < 1 or page_num > len(reader.pages):
            out.write(f"Page number {page_num} is out of range.\n")
            return
        page = reader.pages[page_num - 1]
        text = page.extract_text()
        out.write(text + "\n")

    # Inspect pages for different RFs
    # RF-001: PDF Page 8 (printed page 6)
    inspect_page(8, "RF-001 - น.ค. 3")

    # RF-008: PDF Page 25 and 38 (or 27 and 40)
    inspect_page(25, "RF-008 - Option 1")
    inspect_page(38, "RF-008 - Option 2")

    # RF-022: PDF Page 76
    inspect_page(76, "RF-022 - เกษตรกรรรม")

    # RF-031: PDF Page 87 (or 86)
    inspect_page(86, "RF-031 - ด้วงสาคู / พรอพอลิส")
    inspect_page(87, "RF-031 - ด้วงสาคู / พรอพอลิส")

print(f"Results written to {output_file}")
