import re
import sys

css_path = r"t:\web\npt_dashboard\src\pages\LandingPage.css"

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the mobile font size issue that happened during the previous replacement
# Inside @media (max-width: 768px) { ... .bento-title { ... }
mobile_pattern = r"(@media\s*\(max-width:\s*768px\)\s*\{.*?\.bento-title\s*\{).*?(\})"
def replacer(match):
    # We just want to replace the whole bento-title block inside media query
    return """@media (max-width: 768px) {
    .bento-header {
        padding: 140px 20px 100px;
        min-height: 400px;
    }
    .bento-title {
        font-size: 32px;
        white-space: normal;
        word-break: keep-all;
    }
}"""

content = re.sub(r"@media\s*\(max-width:\s*768px\)\s*\{\s*\.bento-header\s*\{.*?\.bento-title\s*\{.*?\}\s*\}", replacer, content, flags=re.MULTILINE | re.DOTALL)

with open(css_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print("SUCCESS: Mobile header CSS fixed!")
