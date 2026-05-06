import re
import sys

css_path = r"t:\web\npt_dashboard\src\pages\LandingPage.css"

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace .bento-header and .bento-header-bg
header_pattern = r"\.bento-header\s*\{.*?\}\s*\.bento-header-bg\s*\{.*?\}"
header_replacement = """.bento-header {
    position: relative;
    padding: 200px 24px 140px;
    text-align: center;
    background: url('https://res.cloudinary.com/dzksawh1d/image/upload/v1778061075/69fb0ad33f4be910d2a02784_yvto8z.png') center top/cover no-repeat;
    overflow: hidden;
    min-height: 560px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* ---- Animated gradient overlay ---- */
.bento-header-bg {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15, 23, 42, 0.4) 0%, transparent 70%),
        linear-gradient(180deg,
            rgba(15, 23, 42, 0.4) 0%,
            rgba(15, 23, 42, 0.2) 40%,
            rgba(248, 250, 252, 0.6) 80%,
            rgba(248, 250, 252, 1) 100%);
    z-index: 1;
}"""

content, count = re.subn(header_pattern, header_replacement, content, flags=re.MULTILINE | re.DOTALL)
if count == 0:
    print("Failed to replace header!")

with open(css_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print("SUCCESS: Header updated!")
