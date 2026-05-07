import os
import re

def get_closing_tag(content, start_idx, tag_name):
    open_tag = f"<{tag_name}"
    close_tag = f"</{tag_name}>"
    
    count = 0
    i = start_idx
    while i < len(content):
        if content.startswith(open_tag, i):
            j = i
            while j < len(content) and content[j] != '>':
                j += 1
            if content[j-1] == '/':
                if count == 0:
                    return j + 1
            else:
                count += 1
            i += len(open_tag)
        elif content.startswith(close_tag, i):
            count -= 1
            if count == 0:
                return i + len(close_tag)
            i += len(close_tag)
        else:
            i += 1
    return -1

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    tags_to_wrap = ['ResponsiveContainer', 'table', 'PieDistributionTable']
    
    for tag in tags_to_wrap:
        i = 0
        while True:
            idx = content.find(f"<{tag}", i)
            if idx == -1:
                break
                
            lookback = content[max(0, idx-40):idx]
            if "typeof user ===" in lookback or "isRole0" in lookback:
                i = idx + len(f"<{tag}")
                continue
                
            end_idx = get_closing_tag(content, idx, tag)
            if end_idx != -1:
                replacement = "<>{(typeof user === 'undefined' || user?.role_id !== 0) && (\n" + content[idx:end_idx] + "\n)}</>"
                content = content[:idx] + replacement + content[end_idx:]
                i = idx + len(replacement)
            else:
                i = idx + len(f"<{tag}")
                
    # Wrap grids (cards container)
    i = 0
    while True:
        match = re.search(r'<div[^>]*id="[^"]*-cards-container"[^>]*>', content[i:])
        if not match:
            break
        idx = i + match.start()
        lookback = content[max(0, idx-40):idx]
        if "typeof user ===" in lookback or "isRole0" in lookback:
            i = idx + len(match.group(0))
            continue
            
        end_idx = get_closing_tag(content, idx, "div")
        if end_idx != -1:
            replacement = "<>{(typeof user === 'undefined' || user?.role_id !== 0) && (\n" + content[idx:end_idx] + "\n)}</>"
            content = content[:idx] + replacement + content[end_idx:]
            i = idx + len(replacement)
        else:
            i = idx + len(match.group(0))
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

import glob
files = glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\*Section.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\Patents.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\MoUCollaborations.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\SocialEngagement.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\StudentsEngagement.jsx')

for f in files:
    if "PublicView" not in f and "AdminRoute" not in f:
        print(f"Processing {f}")
        try:
            process_file(f)
        except Exception as e:
            print(f"Failed {f}: {e}")
