import re

text_path = "d:/code/npt_dashboard/tmp/farmer69-full-text.txt"
with open(text_path, "r", encoding="utf-8") as f:
    full_text = f.read()

# Split text into pages
pages = re.split(r'--- PAGE \d+ ---', full_text)
# pages[0] is empty, pages[1] is PAGE 1, etc.

def get_page_text(page_num):
    if page_num < 1 or page_num >= len(pages):
        return ""
    return pages[page_num]

print("=== VERIFYING RFs ===")

# RF-001: PDF Page 8
p8 = get_page_text(8)
if "ทำประโยชน์ 13" in p8 or "ทำประโยชน์13" in p8:
    print("RF-001: YES - 'ทำประโยชน์ 13' is present on PDF Page 8.")
else:
    print("RF-001: NO - 'ทำประโยชน์ 13' is NOT present.")

# RF-008: PDF Page 25 and 38
p25 = get_page_text(25)
p38 = get_page_text(38)
has_3_years = "3 ปี" in p25 or "สามปี" in p25
has_over_3_years = "เกิน 3 ปี" in p38 or "เกินสามปี" in p38
print(f"RF-008: p25 has '3 ปี': {has_3_years}, p38 has 'เกิน 3 ปี': {has_over_3_years}")

# RF-022: PDF Page 76 (printed page 74)
p76 = get_page_text(76)
has_wrong_spelling = "เกษตรกรรรม" in p76
print(f"RF-022: p76 has 'เกษตรกรรรม': {has_wrong_spelling}")

# RF-031: PDF Page 87 (printed page 85)
p87 = get_page_text(87)
has_40_35 = "40-35" in p87 or "40 -35" in p87
has_35_40 = "35-40" in p87 or "35 -40" in p87
has_propolis = "พรอพอลิส" in p87
has_proporis = "พรอพอริส" in p87
print(f"RF-031: p87 has '40-35': {has_40_35}, has '35-40': {has_35_40}, 'พรอพอลิส': {has_propolis}, 'พรอพอริส': {has_proporis}")
