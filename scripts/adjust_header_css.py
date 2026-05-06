import sys

css_path = r"t:\web\npt_dashboard\src\pages\LandingPage.css"

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's target the exact CSS rules and replace them.
# We will use regex to replace the blocks to avoid newline issues.
import re

def replace_block(pattern, replacement, text):
    new_text, count = re.subn(pattern, replacement, text, flags=re.MULTILINE | re.DOTALL)
    if count == 0:
        print(f"Failed to match: {pattern[:50]}...")
    return new_text

# 1. Update .bento-header and .bento-header-bg
header_pattern = r"\.bento-header \{.*?\n\}\n\n/\* ---- Animated gradient overlay ---- \*/\n\.bento-header-bg \{.*?z-index: 1;\n\}"

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
    /* Darken the top slightly, and fade to the page background color (#f8fafc) at the bottom */
    background:
        radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15, 23, 42, 0.4) 0%, transparent 70%),
        linear-gradient(180deg,
            rgba(15, 23, 42, 0.4) 0%,
            rgba(15, 23, 42, 0.2) 40%,
            rgba(248, 250, 252, 0.6) 80%,
            rgba(248, 250, 252, 1) 100%);
    z-index: 1;
}"""

content = replace_block(header_pattern, header_replacement, content)

# 2. Update .bento-title
title_pattern = r"\.bento-title \{.*?\n\}"
title_replacement = """.bento-title {
    color: #ffffff;
    font-size: 52px;
    font-weight: 800;
    line-height: 1.2;
    padding-bottom: 8px;
    margin-bottom: 20px;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #dcfce7 40%, #ffffff 60%, #86efac 100%);
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: normal;
    word-break: keep-all;
    animation: titleSlideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both, titleShimmer 4s ease-in-out infinite 1.5s;
    filter: drop-shadow(0 4px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 40px rgba(34,197,94,0.4));
}"""
content = replace_block(title_pattern, title_replacement, content)

# 3. Update .bento-subtitle
subtitle_pattern = r"\.bento-subtitle \{.*?\n\}"
subtitle_replacement = """.bento-subtitle {
    color: #f1f5f9;
    font-size: 19px;
    font-weight: 500;
    line-height: 1.7;
    max-width: 800px;
    margin: 0 auto;
    word-break: keep-all;
    animation: subtitleFadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.6);
}"""
content = replace_block(subtitle_pattern, subtitle_replacement, content)

# 4. Update .bento-badge
badge_pattern = r"\.bento-badge \{.*?\n\}"
badge_replacement = """.bento-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(74, 222, 128, 0.4);
    color: #86efac;
    padding: 10px 24px;
    border-radius: 9999px;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 24px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
    animation: badgeFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    transition: all 0.3s ease;
}"""
content = replace_block(badge_pattern, badge_replacement, content)

badge_hover_pattern = r"\.bento-badge:hover \{.*?\n\}"
badge_hover_replacement = """.bento-badge:hover {
    background: rgba(15, 23, 42, 0.8);
    border-color: rgba(74, 222, 128, 0.8);
    box-shadow: 0 6px 32px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateY(-2px);
}"""
content = replace_block(badge_hover_pattern, badge_hover_replacement, content)

# Remove the old shimmer and bottom soft edge as we redefined the gradient
content = re.sub(r"/\* ---- Shimmer scan-line ---- \*/.*?@keyframes heroShimmer \{.*?\n\}", "", content, flags=re.MULTILINE | re.DOTALL)
content = re.sub(r"/\* ---- Bottom soft edge ---- \*/.*?\n\}", "", content, flags=re.MULTILINE | re.DOTALL)


with open(css_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print("SUCCESS: CSS updated for dark majestic theme!")
