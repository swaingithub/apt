import re

with open('static/app-dashboard.html', 'r') as f:
    content = f.read()

# Replace complex glassmorphism backgrounds with standard vars
content = re.sub(r'rgba\(255,255,255,0\.02\)', 'var(--bg-surface)', content)
content = re.sub(r'backdrop-filter:blur\(\d+px\);?', '', content)
content = re.sub(r'box-shadow:0 \d+px \d+px rgba\(0,0,0,0\.\d+\)[^;]*;?', '', content)
content = re.sub(r'border:1px solid rgba\(255,255,255,0\.05\)', 'border:1px solid var(--border)', content)
content = re.sub(r'background:linear-gradient\([^)]+\)', 'background:var(--bg-surface)', content)
content = re.sub(r'onmouseover="[^"]+"', '', content)
content = re.sub(r'onmouseout="[^"]+"', '', content)
content = re.sub(r'onfocus="[^"]+"', '', content)
content = re.sub(r'onblur="[^"]+"', '', content)
content = re.sub(r'transition:[^;]+;', '', content)
content = re.sub(r'rgba\(0,0,0,0\.2\)', 'var(--bg-input)', content)
content = re.sub(r'border:1px solid rgba\(255,255,255,0\.1\)', 'border:1px solid var(--border)', content)
content = re.sub(r'rgba\(255,255,255,0\.05\)', 'var(--bg-hover)', content)
content = re.sub(r'rgba\(255,255,255,0\.15\)', 'var(--border)', content)
content = re.sub(r'rgba\(255,255,255,0\.1\)', 'var(--border)', content)

# A few specific replacements
content = re.sub(r'color:#0ea5e9', 'color:var(--text)', content)
content = re.sub(r'color:#10b981', 'color:var(--text)', content)
content = re.sub(r'color:#818cf8', 'color:var(--primary)', content)
content = re.sub(r'background:-webkit-linear-gradient[^;]+;-webkit-background-clip:text;-webkit-text-fill-color:transparent;', 'color:var(--text);', content)
content = re.sub(r'<style>@keyframes[^<]+</style>', '', content)
content = re.sub(r'animation:[^;]+;', '', content)

with open('static/app-dashboard.html', 'w') as f:
    f.write(content)
