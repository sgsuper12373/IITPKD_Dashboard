import os

components_dir = r'd:\IITPKD_Dashboard-1\Frontend\src\components'

wrappers = [
    'PeopleCampus.jsx', 'Research.jsx', 'OutreachExtension.jsx',
    'IndustryConnect.jsx', 'InnovationEntrepreneurship.jsx', 'Education.jsx',
    'InnovationSection.jsx'
]

for wf in wrappers:
    file_path = os.path.join(components_dir, wf)
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace:
    # if (!user || roleId === 0) {
    # with
    # if (!user || roleId === 0 || roleId === 1) {
    
    if 'if (!user || roleId === 0)' in content:
        content = content.replace('if (!user || roleId === 0)', 'if (!user || roleId === 0 || roleId === 1)')
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done!')
