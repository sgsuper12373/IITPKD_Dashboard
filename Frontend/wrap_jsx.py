import os
import re

def get_closing_tag(content, start_idx, tag_name):
    """Finds the matching closing tag index starting from start_idx which points to <tag_name..."""
    open_tag = f"<{tag_name}"
    close_tag = f"</{tag_name}>"
    self_closing = "/>"
    
    count = 0
    i = start_idx
    while i < len(content):
        # Handle self-closing tags
        if content.startswith(open_tag, i):
            # check if it's self closing by finding the end of the tag
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

    # Make sure we don't double-wrap
    if "isRole0" not in content and "user?.role_id" in content:
        # insert const isRole0 = user?.role_id === 0;
        content = re.sub(r'(const roleId = user\?\.role_id;)', r'\1\n  const isRole0 = user?.role_id === 0;', content)
    
    if "isRole0" not in content:
        # maybe roleId isn't defined?
        if "user?.role_id" not in content:
            # wait, if user?.role_id is not in content, we can just insert it
            # look for function ComponentName({ user
            content = re.sub(r'(function \w+\(.*user.*\)\s*{)', r'\1\n  const isRole0 = user?.role_id === 0;', content)
            
    # Tags to wrap
    tags_to_wrap = ['ResponsiveContainer', 'table', 'PieDistributionTable']
    
    for tag in tags_to_wrap:
        i = 0
        while True:
            # find next unwrapped tag
            idx = content.find(f"<{tag}", i)
            if idx == -1:
                break
                
            # check if already wrapped (simple check: looking back for isRole0 && ( )
            lookback = content[max(0, idx-20):idx]
            if "isRole0 && (" in lookback or "isRole0 &&" in lookback:
                i = idx + len(f"<{tag}")
                continue
                
            end_idx = get_closing_tag(content, idx, tag)
            if end_idx != -1:
                replacement = "{!isRole0 && (\n" + content[idx:end_idx] + "\n)}"
                content = content[:idx] + replacement + content[end_idx:]
                i = idx + len(replacement)
            else:
                i = idx + len(f"<{tag}")
                
    # Wrap grids (cards container)
    # They usually have id="...-cards-container" or className="...-grid"
    # Or we can look for style={{ display: 'grid' ... }}
    # Let's search for `<div id="[^"]*-cards-container"`
    i = 0
    while True:
        match = re.search(r'<div[^>]*id="[^"]*-cards-container"[^>]*>', content[i:])
        if not match:
            break
        idx = i + match.start()
        lookback = content[max(0, idx-20):idx]
        if "isRole0 && (" in lookback or "isRole0 &&" in lookback:
            i = idx + len(match.group(0))
            continue
            
        end_idx = get_closing_tag(content, idx, "div")
        if end_idx != -1:
            replacement = "{!isRole0 && (\n" + content[idx:end_idx] + "\n)}"
            content = content[:idx] + replacement + content[end_idx:]
            i = idx + len(replacement)
        else:
            i = idx + len(match.group(0))
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

import glob
files = glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\*Section.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\Patents.jsx') + \
        glob.glob(r'd:\IITPKD_Dashboard-1\Frontend\src\components\MoUCollaborations.jsx')

for f in files:
    if "PublicView" not in f and "AdminRoute" not in f:
        print(f"Processing {f}")
        try:
            process_file(f)
        except Exception as e:
            print(f"Failed {f}: {e}")
