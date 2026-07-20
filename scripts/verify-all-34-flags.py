import re

pdf_text_path = "d:/code/npt_dashboard/tmp/farmer69-full-text.txt"
with open(pdf_text_path, "r", encoding="utf-8") as f:
    full_text = f.read()

# Split into pages
pages = re.split(r'--- PAGE \d+ ---', full_text)
# pages[0] is empty, pages[1] is PAGE 1, etc.

def search_on_page(page_num, pattern, case_sensitive=False):
    if page_num < 1 or page_num >= len(pages):
        return False, "Page out of bounds"
    text = pages[page_num]
    if not case_sensitive:
        text = text.lower()
        pattern = pattern.lower()
    found = pattern in text
    # Clean up spaces for a looser match
    clean_text = re.sub(r'\s+', '', text)
    clean_pattern = re.sub(r'\s+', '', pattern)
    clean_found = clean_pattern in clean_text
    
    return found or clean_found, text

rfs = [
    {"id": "RF-001", "page": 8, "query": "ทำประโยชน์ 13"},
    {"id": "RF-002", "page": 6, "query": "เครื่องสูบน้ำ หมายถึง บ่อบาดาล/บ่อตอก เครื่องสูบน้ำที่สูบน้ำจากน้ำใต้ดิน"},
    {"id": "RF-008_1", "page": 25, "query": "ไม่มีการปรับปรุงสถานภาพติดต่อกันเป็นเวลา 3 ปี"},
    {"id": "RF-008_2", "page": 38, "query": "ไม่มีการปรับปรุงกิจกรรมการเกษตร ติดต่อกันเกิน 3 ปี"},
    {"id": "RF-022", "page": 76, "query": "สัญญาอนุญาตให้ใช้ที่ดินเพื่อเกษตรกรรรม"},
    {"id": "RF-031_1", "page": 87, "query": "พรอพอลิส(ชัน) พรอพอริสเป็นสาร"},
    {"id": "RF-031_2", "page": 87, "query": "40-35 วัน"},
    {"id": "RF-031_3", "page": 87, "query": "35-40 วัน"},
    {"id": "RF-031_4", "page": 87, "query": "40-35"},
    {"id": "RF-031_5", "page": 87, "query": "35-40"},
]

print("=== CHECKING ALL CORE FLAGS AGAINST 2569 PDF ===")
for rf in rfs:
    found, text = search_on_page(rf["page"], rf["query"])
    print(f"{rf['id']} (Page {rf['page']}): Search for '{rf['query']}' -> FOUND: {found}")
    if not found and rf["id"] == "RF-031_2":
        # Print lines on page 87 containing "ด้วงสาคู" or "หนอน"
        print("  Page 87 text containing 'ด้วงสาคู' or 'หนอน' or '40':")
        for line in text.split('\n'):
            if any(k in line for k in ["ด้วงสาคู", "หนอน", "40", "35"]):
                print(f"    {line.strip()}")
