import re
import sys

css_path = r"t:\web\npt_dashboard\src\pages\SaastyTheme.css"

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Header Section overrides
header_override_pattern = r"/\* Header Section \*/.*?@media \(max-width: 768px\) \{\s*\.landing-page \.bento-title \{\s*font-size: 36px !important;\s*\}\s*\}"
content = re.sub(header_override_pattern, "/* Header Section overrides removed to allow LandingPage.css dark majestic theme */", content, flags=re.MULTILINE | re.DOTALL)

with open(css_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print("SUCCESS: SaastyTheme.css overrides removed!")
