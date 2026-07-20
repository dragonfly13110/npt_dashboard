from pypdf import PdfReader

pdf_path = "d:/code/npt_dashboard/farmer69_knowledge_v1.1/08_ส่งออก/เว็บไซต์/พร้อมใช้งาน/source/farmer69-watermark.pdf"
output_path = "d:/code/npt_dashboard/tmp/farmer69-full-text.txt"

print(f"Extracting all text from {pdf_path}...")
reader = PdfReader(pdf_path)

with open(output_path, "w", encoding="utf-8") as f:
    for i, page in enumerate(reader.pages):
        page_num = i + 1
        f.write(f"\n\n--- PAGE {page_num} ---\n\n")
        text = page.extract_text()
        f.write(text)

print(f"Extraction complete! Saved to {output_path}")
