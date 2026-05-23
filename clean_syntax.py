import re

with open('static/app-dashboard.html', 'r') as f:
    content = f.read()

# Fix syntax errors left by previous script
content = re.sub(r'background:var\(--bg-surface\)[^;]+;', 'background:var(--bg-surface);', content)
content = re.sub(r'border-bottom:1px solid var\(--bg-hover\);', 'border-bottom:1px solid var(--border);', content)
content = re.sub(r'  >', '>', content) # clean up empty event handlers spaces

with open('static/app-dashboard.html', 'w') as f:
    f.write(content)
