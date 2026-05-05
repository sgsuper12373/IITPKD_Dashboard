import os
import re

components = {
    '/people-campus': [
        'AcademicSection.jsx', 'AdministrativeSection.jsx', 'IgrcSection.jsx', 'IccSection.jsx', 'EwdSection.jsx', 'IarSection.jsx'
    ],
    '/research': [
        'ResearchIcsrSection.jsx', 'ResearchAdministrativeSection.jsx', 'ResearchLibrarySection.jsx'
    ],
    '/education': [
        'PlacementSection.jsx', 'EducationAcademicSection.jsx'
    ],
    '/innovation-entrepreneurship': [
        'IptifSection.jsx', 'TechinSection.jsx'
    ],
    '/industry-connect': [
        'IcsrSection.jsx', 'ConclaveSection.jsx'
    ],
    '/outreach-extension': [
        'OpenHouseSection.jsx', 'NptelSection.jsx', 'UbaSection.jsx', 'SocialEngagements.jsx', 'StudentsEngagement.jsx', 'OutreachSection.jsx'
    ]
}

labels = {
    '/people-campus': 'Back to People & Campus',
    '/research': 'Back to Research',
    '/education': 'Back to Education',
    '/innovation-entrepreneurship': 'Back to Innovation & Entrepreneurship',
    '/industry-connect': 'Back to Industry Connect',
    '/outreach-extension': 'Back to Outreach Extension',
}

path = 'Frontend/src/components'

for route_path, files in components.items():
    for f in files:
        filepath = os.path.join(path, f)
        if not os.path.exists(filepath):
            print(f'Missing {f}')
            continue
            
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
            
        if '<button className="page-back-btn"' in content:
            print(f'Already has back btn: {f}')
            continue

        label = labels[route_path]
        button_code = f"""
        {{!isPublicView && (
          <button className="page-back-btn" onClick={{() => navigate('{route_path}')}}>
            ← {label}
          </button>
        )}}
"""

        # 1. Add import for useNavigate if not exists
        if 'useNavigate' not in content:
            if 'react-router-dom' in content:
                content = re.sub(r"import(\s+{[^}]*?)\s*} from 'react-router-dom';", r"import\g<1>, useNavigate } from 'react-router-dom';", content)
            else:
                lines = content.split('\n')
                last_import_index = 0
                for i, line in enumerate(lines):
                    if line.startswith('import ') or line.startswith('"use client"'):
                        last_import_index = i
                lines.insert(last_import_index + 1, "import { useNavigate } from 'react-router-dom';")
                content = '\n'.join(lines)

        # 2. Add const navigate = useNavigate();
        comp_name = f.replace('.jsx', '')
        if comp_name == 'SocialEngagements': comp_name = 'SocialEngagementsSection'
        if comp_name == 'StudentsEngagement': comp_name = 'StudentsEngagementSection'

        func_regex = r"(const\s+" + comp_name + r"\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{|function\s+" + comp_name + r"\s*\([^)]*\)\s*{)"
        if 'const navigate = useNavigate();' not in content:
            content = re.sub(func_regex, r"\g<1>\n  const navigate = useNavigate();\n", content, count=1)

        # 3. Add the button after page-content div
        content = re.sub(r'(<div className={isPublicView \? "" : "page-content"}[\s\S]*?>)(\s*)', lambda m: m.group(1) + m.group(2) + button_code.strip() + m.group(2), content, count=1)
        content = re.sub(r'(<div className="page-content"[\s\S]*?>)(\s*)', lambda m: m.group(1) + m.group(2) + button_code.strip() + m.group(2), content, count=1)

        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Updated {f}')
