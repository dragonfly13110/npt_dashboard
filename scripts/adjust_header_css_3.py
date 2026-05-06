import re

css_path = r"t:\web\npt_dashboard\src\pages\LandingPage.css"

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .bento-header and .bento-header-bg
header_pattern = r"\.bento-header\s*\{.*?\}\s*/\* ---- Animated gradient overlay ---- \*/\s*\.bento-header-bg\s*\{.*?\}"
header_replacement = """.bento-header {
    position: relative;
    padding: 180px 24px 200px; /* Increased bottom padding to show more of the image */
    text-align: center;
    background: url('https://res.cloudinary.com/dzksawh1d/image/upload/v1778061075/69fb0ad33f4be910d2a02784_yvto8z.png') center bottom/cover no-repeat;
    overflow: hidden;
    min-height: 700px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

/* ---- Animated gradient overlay ---- */
.bento-header-bg {
    position: absolute;
    inset: 0;
    /* Soften the overlay so the image is clearly visible, just a slight fade at the very bottom */
    background: linear-gradient(180deg, 
        rgba(248, 250, 252, 0.4) 0%, 
        rgba(248, 250, 252, 0.0) 30%, 
        rgba(248, 250, 252, 0.0) 70%, 
        rgba(248, 250, 252, 0.9) 100%);
    z-index: 1;
    pointer-events: none;
}"""

content, count = re.subn(header_pattern, header_replacement, content, flags=re.MULTILINE | re.DOTALL)
if count == 0:
    print("Failed to replace header background pattern!")

# 2. Update .bento-title
title_pattern = r"\.bento-title\s*\{.*?\n\}"
title_replacement = """.bento-title {
    color: #0f172a;
    font-size: 56px;
    font-weight: 900;
    line-height: 1.2;
    padding-bottom: 8px;
    margin-bottom: 20px;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #0f172a 0%, #166534 50%, #0f172a 100%);
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: normal;
    word-break: keep-all;
    animation: titleSlideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both, titleShimmer 4s ease-in-out infinite 1.5s;
    /* Clean shadow for light background */
    filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.8)) drop-shadow(0 2px 4px rgba(255, 255, 255, 0.9));
}"""
content, count = re.subn(title_pattern, title_replacement, content, flags=re.MULTILINE | re.DOTALL)
if count == 0:
    print("Failed to replace title pattern!")

# 3. Update .bento-subtitle
subtitle_pattern = r"\.bento-subtitle\s*\{.*?\n\}"
subtitle_replacement = """.bento-subtitle {
    color: #1e293b;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.7;
    max-width: 800px;
    margin: 0 auto;
    word-break: keep-all;
    animation: subtitleFadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
    text-shadow: 0 1px 4px rgba(255, 255, 255, 0.9), 0 0 10px rgba(255, 255, 255, 1);
}"""
content, count = re.subn(subtitle_pattern, subtitle_replacement, content, flags=re.MULTILINE | re.DOTALL)
if count == 0:
    print("Failed to replace subtitle pattern!")

# 4. Update .bento-badge
badge_pattern = r"\.bento-badge\s*\{.*?\n\}"
badge_replacement = """.bento-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(22, 163, 74, 0.3);
    color: #16a34a;
    padding: 10px 24px;
    border-radius: 9999px;
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 24px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1);
    animation: badgeFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    transition: all 0.3s ease;
}"""
content = re.sub(badge_pattern, badge_replacement, content, flags=re.MULTILINE | re.DOTALL, count=1)

badge_hover_pattern = r"\.bento-badge:hover\s*\{.*?\n\}"
badge_hover_replacement = """.bento-badge:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(22, 163, 74, 0.6);
    box-shadow: 0 6px 24px rgba(22, 163, 74, 0.15), inset 0 1px 0 rgba(255,255,255,1);
    transform: translateY(-2px);
}"""
content = re.sub(badge_hover_pattern, badge_hover_replacement, content, flags=re.MULTILINE | re.DOTALL, count=1)


with open(css_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print("SUCCESS: CSS updated to make image clear and text readable!")
