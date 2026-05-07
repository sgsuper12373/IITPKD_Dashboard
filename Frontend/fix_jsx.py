import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to find `{!isRole0 && (\n`
    # and match it to its `\n)}`
    
    # A robust way is to find `{!isRole0 && (\n`
    i = 0
    while True:
        idx = content.find('{!isRole0 && (\n', i)
        if idx == -1:
            break
            
        # We want to replace `{!isRole0 && (\n` with `<>{!isRole0 && (\n`
        # But wait, what if it's already `<>{!isRole0 && (\n` ?
        if idx >= 2 and content[idx-2:idx] == '<>':
            i = idx + 1
            continue
            
        # Find the matching `)}`
        # We count braces `{` and `}` and parenthesis `(` and `)`
        # Actually, counting braces is enough. The start is `{`.
        count = 0
        j = idx
        while j < len(content):
            if content[j] == '{':
                count += 1
            elif content[j] == '}':
                count -= 1
                if count == 0:
                    break
            j += 1
            
        end_idx = j # index of the matching `}`
        # The text around end_idx should be `\n)}`
        # Let's verify
        if content[end_idx-2:end_idx+1] == ')}':
            # Replace
            content = content[:idx] + '<>' + content[idx:end_idx+1] + '</>' + content[end_idx+1:]
            i = end_idx + 6 # advance past the new '</>'
        else:
            i = idx + 1 # fallback

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

import glob
files = glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\*Section.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\Patents.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\MoUCollaborations.jsx')

for f in files:
    if "PublicView" not in f and "AdminRoute" not in f:
        try:
            fix_file(f)
        except Exception as e:
            print(f"Failed {f}: {e}")
            
print("Fix complete!")
