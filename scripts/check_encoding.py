"""
Analyze hex patterns of corrupted Thai text and apply byte-level fixes.
"""
import sys
import io

# Force UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

filepath = r't:\web\npt_dashboard\src\pages\development\YoungFarmerGroupsDashboard.jsx'
data = open(filepath, 'rb').read()

# The corruption pattern analysis:
# Original Thai UTF-8 char e.g. กลุ่ม:
#   ก = e0 b8 81
#   ล = e0 b8 a5
#   ุ = e0 b8 b8
#   ่ = e0 b9 88 (sara mai ek = combining mark, but '่' = e0 b9 88)
# Wait, ่ in Thai = สระไม้เอก = U+0E48 = e0 b9 88
# ม = e0 b8 a1
#
# So กลุ่ม = e0 b8 81 e0 b8 a5 e0 b8 b8 e0 b9 88 e0 b8 a1
#
# Now the corruption: these bytes were read as ISO-8859-1/Latin-1 then re-encoded as UTF-8:
# e0 -> Latin-1 'à' -> UTF-8 c3 a0
# But we see ef bf bd instead of c3 a0, meaning it was treated as invalid
# and replaced with U+FFFD (ef bf bd)
#
# b8 -> Latin-1 '¸' -> UTF-8 c2 b8
# 81 -> Latin-1 control char -> UTF-8 c2 81
#
# So e0 b8 81 (ก) becomes:
#   ef bf bd (for e0) c2 b8 (for b8) c2 81 (for 81)
# or possibly:
#   ef bf bd c2 b8 ef bf bd (if 81 is also treated as invalid)
#
# Let's verify: Region 4 hex = 
# ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 a5 ef bf bd c2 b8 c2 b8 
# ef bf bd c2 b9 ef bf bd ef bf bd c2 b8 c2 a1 ef bf bd c2 b8 c2 a2 
# ef bf bd c2 b8 c2 b8 ef bf bd c2 b8 c2 a7 ef bf bd c2 b9 ef bf bd 
# ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 a9 ef bf bd c2 b8 ef bf bd 
# ef bf bd c2 b8 c2 a3 ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 a3
#
# Let's decode step by step:
# ef bf bd -> was e0 (first byte of Thai)
# c2 b8 -> was b8
# c2 81 -> was 81
# So first char: e0 b8 81 = ก ✓
#
# ef bf bd -> was e0
# c2 b8 -> was b8
# c2 a5 -> was a5
# So: e0 b8 a5 = ล ✓
#
# ef bf bd -> was e0
# c2 b8 -> was b8
# c2 b8 -> was b8
# So: e0 b8 b8 = ุ ✓
#
# ef bf bd -> was e0
# c2 b9 -> was b9
# ef bf bd -> was 88??? No... ef bf bd replaces bytes that are invalid.
# In Latin-1, bytes 80-9F are control chars (C1 controls), and some
# encoders replace them with U+FFFD.
# So 88 (0x88) being a C1 control -> ef bf bd
# So: e0 b9 88 = ่ ✓ (mai ek)
#
# So the pattern for the third byte is:
# - If third byte >= 0xA0: it's encoded as c2 XX (e.g., c2 a5 for 0xa5)
# - If third byte is 0x80-0x9F: it's replaced with ef bf bd (since C1 controls)
# - If third byte < 0x80: it stays as-is (ASCII)
#
# This means ef bf bd can represent EITHER:
# 1. The first byte (e0) of a Thai UTF-8 sequence
# 2. A third byte in range 0x80-0x9F
#
# We need to determine which by context.
# The pattern for a complete Thai char is always:
# [ef bf bd] [c2 b8|c2 b9] [c2 XX | ef bf bd]
# Where:
# - First ef bf bd = e0
# - c2 b8 or c2 b9 = second byte
# - c2 XX (XX >= a0) = third byte >= a0
# - ef bf bd = third byte in 80-9F range

def decode_corrupted_thai(hex_str):
    """Decode a corrupted hex string back to Thai text."""
    raw = bytes.fromhex(hex_str.replace(' ', ''))
    result = bytearray()
    i = 0
    chars = []
    
    while i < len(raw):
        # Look for pattern: ef bf bd [c2 b8 | c2 b9] [third_byte_encoding]
        if i + 2 < len(raw) and raw[i:i+3] == b'\xef\xbf\xbd':
            i += 3  # skip ef bf bd (= e0)
            first = 0xe0
            
            # Get second byte
            if i + 1 < len(raw) and raw[i] == 0xc2:
                second = raw[i+1]
                i += 2
            else:
                chars.append(f'?({first:02x})')
                continue
            
            # Get third byte
            if i + 2 < len(raw) and raw[i:i+3] == b'\xef\xbf\xbd':
                # Third byte was a C1 control (0x80-0x9F)
                # We need to figure out which one
                # For Thai, the third byte ranges:
                # - Sara/vowels: 0x80-0x8F (e.g., สระ อำ=b3, สระ เ=40)
                # Wait, the range for Thai in Unicode U+0E00-U+0E7F
                # UTF-8 encoding: e0 b8 80 to e0 b9 bf
                # Third bytes: 80 to bf for both b8 and b9
                # For b8: U+0E00 (80) to U+0E3F (bf)
                # For b9: U+0E40 (80) to U+0E7F (bf)
                #
                # Common Thai chars with third byte in 80-9F:
                # b8 80 = U+0E00 (undefined)
                # b8 81 = ก (81)
                # b8 82 = ข (82)
                # ...
                # b8 8a = ช (8a)
                # ...
                # b8 95 = ต (95)
                # ...
                # b9 80 = เ (80)
                # b9 81 = แ (81)
                # b9 82 = โ (82)
                # b9 83 = ใ (83)
                # b9 84 = ไ (84)
                # b9 85 = ฅ (85)
                # b9 86 = ฆ (86) - wait that's wrong
                # Actually b9 80-8f = U+0E40-U+0E4F
                # U+0E40 = เ, U+0E41 = แ, U+0E42 = โ, U+0E43 = ใ, U+0E44 = ไ
                # U+0E45 = ๅ, U+0E46 = ๆ, U+0E47 = ็, U+0E48 = ่, U+0E49 = ้
                # U+0E4A = ๊, U+0E4B = ๋, U+0E4C = ์, U+0E4D = ํ, U+0E4E = ฎ (wait)
                
                # We can't determine the exact byte without more context.
                # But we can use the KNOWN Thai words to figure it out.
                i += 3
                third = None  # unknown
                result.extend([first, second])
                chars.append(f'e0-{second:02x}-??')
                # We'll mark this and fix later
                continue
            elif i + 1 < len(raw) and raw[i] == 0xc2:
                third = raw[i+1]
                i += 2
            elif i + 1 < len(raw) and raw[i] == 0xc3:
                third = raw[i+1] + 0x40
                i += 2
            elif i < len(raw) and raw[i] < 0x80:
                # ASCII byte as third byte? Unusual for Thai
                third = raw[i]
                i += 1
            else:
                chars.append(f'e0-{second:02x}-?')
                continue
            
            result.extend([first, second, third])
            try:
                ch = bytes([first, second, third]).decode('utf-8')
                chars.append(ch)
            except:
                chars.append(f'e0-{second:02x}-{third:02x}')
        else:
            result.append(raw[i])
            if raw[i] < 0x80:
                chars.append(chr(raw[i]))
            i += 1
    
    return chars

# Region 4 (main title - should be กลุ่มยุวเกษตรกร):
r4_hex = "ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 a5 ef bf bd c2 b8 c2 b8 ef bf bd c2 b9 ef bf bd ef bf bd c2 b8 c2 a1 ef bf bd c2 b8 c2 a2 ef bf bd c2 b8 c2 b8 ef bf bd c2 b8 c2 a7 ef bf bd c2 b9 ef bf bd ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 a9 ef bf bd c2 b8 ef bf bd ef bf bd c2 b8 c2 a3 ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 a3"
chars4 = decode_corrupted_thai(r4_hex)
print("Region 4 decoded chars:", chars4)
# Expected: กลุ่มยุวเกษตรกร

# Region 5 (ปี):
r5_hex = "ef bf bd c2 b8 ef bf bd ef bf bd c2 b8 c2 b5"
chars5 = decode_corrupted_thai(r5_hex)
print("Region 5 decoded chars:", chars5)
# Expected: ปี

# Region 0 (จัดการ):
r0_hex = "ef bf bd c2 b8 ef bf bd ef bf bd c2 b8 c2 b1 ef bf bd c2 b8 ef bf bd ef bf bd c2 b8 c2 81 ef bf bd c2 b8 c2 b2 ef bf bd c2 b8 c2 a3"
chars0 = decode_corrupted_thai(r0_hex)
print("Region 0 decoded chars:", chars0)
# Expected: จัดการ

# Now let's understand the pattern better.
# For Region 4, expected is กลุ่มยุวเกษตรกร
# ก = e0 b8 81, ล = e0 b8 a5, ุ = e0 b8 b8, ่ = e0 b9 88
# ม = e0 b8 a1, ย = e0 b8 a2, ุ = e0 b8 b8, ว = e0 b8 a7
# เ = e0 b9 80, ก = e0 b8 81, ษ = e0 b8 a9, ต = e0 b8 95
# ร = e0 b8 a3, ก = e0 b8 81, ร = e0 b8 a3
#
# So all third bytes: 81 a5 b8 88 a1 a2 b8 a7 80 81 a9 95 a3 81 a3
# Bytes in 80-9F range: 81 88 a1? No, a1 >= a0 so it's fine.
# 80, 81, 88, 95 are in the 80-9F range -> will be ef bf bd
# a1, a2, a3, a5, a7, a9, b8 are >= a0 -> will be c2 XX

# So for ก (e0 b8 81):
# e0 -> ef bf bd
# b8 -> c2 b8
# 81 -> ef bf bd (C1 control)
# Combined: ef bf bd c2 b8 ef bf bd ✓ (matches region 4 start)
# But then the next Thai char ล (e0 b8 a5) starts with ef bf bd...
# The problem is consecutive ef bf bd could be:
# - end of one char (third byte 80-9F) 
# - start of next char (e0)
# They're the same bytes! So we can't tell them apart without knowing the expected text.

print("\n--- Since automatic decode can't resolve ambiguous ef bf bd ---")
print("--- We'll use known Thai text to do the replacement ---\n")

# The correct approach: just replace the known hex byte sequences with correct Thai UTF-8

# Let's build the replacement map of: corrupted_bytes -> correct_utf8_bytes
replacements = [
    # Region 0: จัดการ (line 345, action column title)
    # จ=e0 b8 88, ั=e0 b8 b1, ด=e0 b8 94, ก=e0 b8 81, า=e0 b8 b2, ร=e0 b8 a3
    (19759, 19803, 'จัดการ'),
    
    # Region 1: เลือกทั้งหมด (line 419, "select all" button)
    # เ=e0 b9 80, ล=e0 b8 a5, ื=e0 b8 b7, อ=e0 b8 ad, ก=e0 b8 81
    # ท=e0 b8 97, ั=e0 b8 b1, ้=e0 b9 89, ง=e0 b8 87, ห=e0 b8 ab
    # ม=e0 b8 a1, ด=e0 b8 94
    (23627, 23716, 'เลือกทั้งหมด'),
    
    # Region 2: ค่าเริ่มต้น (line 420, "defaults" button)
    # ค=e0 b8 84, ่=e0 b9 88, า=e0 b8 b2, เ=e0 b9 80, ร=e0 b8 a3
    # ิ=e0 b8 b4, ่=e0 b9 88, ม=e0 b8 a1, ต=e0 b8 95, ้=e0 b9 89, น=e0 b8 99
    (23833, 23917, 'ค่าเริ่มต้น'),
    
    # Region 3: หลักเท่านั้น (line 421, "required only" button)
    # ห=e0 b8 ab, ล=e0 b8 a5, ั=e0 b8 b1, ก=e0 b8 81, เ=e0 b9 80
    # ท=e0 b8 97, ่=e0 b9 88, า=e0 b8 b2, น=e0 b8 99, ั=e0 b8 b1, ้=e0 b9 89, น=e0 b8 99
    (24011, 24101, 'หลักเท่านั้น'),
    
    # Region 4: กลุ่มยุวเกษตรกร (line 471, main title)
    (26630, 26738, 'กลุ่มยุวเกษตรกร'),
    
    # Region 5: ปี (line 472, year tag)
    # ป=e0 b8 9b, ี=e0 b8 b5
    (26790, 26805, 'ปี'),
]

# Apply replacements
result = bytearray()
last_end = 0

for start, end, thai_text in replacements:
    result.extend(data[last_end:start])
    result.extend(thai_text.encode('utf-8'))
    last_end = end
    print(f"  Replaced [{start}:{end}] -> '{thai_text}'")

result.extend(data[last_end:])

# Verify
try:
    text = bytes(result).decode('utf-8')
    print("\nUTF-8 decode: OK!")
    
    lines = text.split('\n')
    for line_num in [345, 419, 420, 421, 471, 472]:
        if line_num <= len(lines):
            line = lines[line_num - 1].strip()
            if len(line) > 140:
                line = line[:140] + '...'
            print(f"  Line {line_num}: {line}")
except Exception as e:
    print(f"\nUTF-8 decode FAILED: {e}")

# Check for any remaining ef bf bd
remaining = bytes(result)
count = remaining.count(b'\xef\xbf\xbd')
print(f"\nRemaining replacement chars (U+FFFD): {count}")

# Save
open(filepath, 'wb').write(bytes(result))
print(f"File saved: {len(result)} bytes (was {len(data)} bytes)")
