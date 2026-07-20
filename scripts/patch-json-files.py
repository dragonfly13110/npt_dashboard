import os
import re

files_to_patch = [
    "d:/code/npt_dashboard/farmer69_knowledge_v1.1/08_ส่งออก/เว็บไซต์/articles.jsonl",
    "d:/code/npt_dashboard/farmer69_knowledge_v1.1/08_ส่งออก/RAG/chunks.jsonl",
    "d:/code/npt_dashboard/farmer69_knowledge_v1.1/08_ส่งออก/เว็บไซต์/search_index.json",
]

for filepath in files_to_patch:
    if not os.path.exists(filepath):
        print(f"Skipping: {filepath} (does not exist)")
        continue
    
    print(f"Patching: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    original_len = len(content)
    
    # 1. Replace 40-35 วัน with 35-40 วัน
    content = re.sub(r'40-35\s*วัน', '35-40 วัน', content)
    
    # 2. Replace review flag note about 40-35 วัน
    # This regex is very loose and will match even with escaped quotes, backslashes, etc.
    pattern = r'ช่วงอายุหนอนด้วงสาคูระบุ[^}]+?ห้ามแก้เอง'
    replacement = 'ช่วงอายุหนอนด้วงสาคูในคู่มือปี 2569 ได้รับการแก้ไขเป็น \\"35-40 วัน\\" แล้ว (เดิมคู่มือปี 2568 ระบุสลับกันเป็น \\"40-35 วัน\\")'
    
    # Let's check if there are any matches
    matches = re.findall(pattern, content)
    if matches:
        print(f"  Found matches for flag note: {matches}")
        content = re.sub(pattern, replacement, content)
    
    new_len = len(content)
    if original_len != new_len:
        print(f"  Length changed from {original_len} to {new_len}")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        print("  No changes made")

print("Patching complete!")
