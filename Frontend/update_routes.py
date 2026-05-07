import os
import re

components_dir = r'd:\IITPKD_Dashboard-1\Frontend\src\components'
app_jsx = r'd:\IITPKD_Dashboard-1\Frontend\src\App.jsx'

with open(app_jsx, 'r', encoding='utf-8') as f:
    app_content = f.read()

admin_route_code = """  const AdminRoute = ({ children }) => {
    // Restrict role 0 from accessing individual admin sections
    if (!user || user.role_id === 0) {
      return <Navigate to="/" replace />;
    }
    return children;
  };
"""

if "const AdminRoute =" not in app_content:
    app_content = app_content.replace(
        "const AuthRoute = ({ children }) =>\n    token ? children : <Navigate to=\"/login\" replace />;",
        "const AuthRoute = ({ children }) =>\n    token ? children : <Navigate to=\"/login\" replace />;\n\n" + admin_route_code
    )

# Wrap individual admin routes
admin_routes = [
    'people-campus/academic-section',
    'people-campus/administrative-section',
    'people-campus/igrc',
    'people-campus/icc',
    'people-campus/ewd',
    'people-campus/iar',
    'research/icsr',
    'patents',
    'mou-collaborations',
    'research/administrative-section',
    'research/library',
    'education/placements',
    'education/academic-section',
    'education/iar',
    'innovation-entrepreneurship/iptif',
    'innovation-entrepreneurship/techin',
    'industry-connect/icsr',
    'industry-connect/conclave',
    'outreach-extension/open-house',
    'outreach-extension/nptel',
    'outreach-extension/uba',
    'outreach-extension/social-engagements',
    'outreach-extension/students-engagement',
    'outreach-extension/outreach'
]

for route in admin_routes:
    pattern = r'(<Route\s+path="' + re.escape(route) + r'"\s+element=\{)(?!<AdminRoute>)(<[A-Za-z]+[^>]+/>)(\}\s*/>)'
    app_content = re.sub(pattern, r'\1<AdminRoute>\2</AdminRoute>\3', app_content)

with open(app_jsx, 'w', encoding='utf-8') as f:
    f.write(app_content)

wrappers = [
    'PeopleCampus.jsx', 'Research.jsx', 'OutreachExtension.jsx',
    'IndustryConnect.jsx', 'InnovationEntrepreneurship.jsx', 'Education.jsx'
]

for wf in wrappers:
    file_path = os.path.join(components_dir, wf)
    if not os.path.exists(file_path): continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix isAllowed
    if '(section.allowedRoles && section.allowedRoles.includes(roleId))' in content and 'roleId === 1 ||' not in content:
        content = content.replace(
            '(section.allowedRoles && section.allowedRoles.includes(roleId))',
            'roleId === 1 ||\n              (section.allowedRoles && section.allowedRoles.includes(roleId))'
        )

    # In Education.jsx
    if wf == 'Education.jsx':
        content = content.replace('const isPublicUser = roleId === 0;', 'const isPublicUser = false;')

    # Fix 'View Public Page' button to be hidden for role 0 and 1
    # Look for button or its wrapping div
    btn_pattern = r'(<div[^>]*>\s*<button[^>]*onClick={\(\) => setShowPublicView\(true\)}[^>]*>.*?View Public Page.*?<\/button>\s*<\/div>)'
    if re.search(btn_pattern, content, flags=re.DOTALL):
        if '{roleId !== 0 && roleId !== 1 && (' not in content:
            content = re.sub(
                btn_pattern,
                r'{roleId !== 0 && roleId !== 1 && (\n          \1\n        )}',
                content,
                flags=re.DOTALL
            )
    else:
        btn_pattern2 = r'(<button[^>]*onClick={\(\) => setShowPublicView\(true\)}[^>]*>.*?View Public Page.*?<\/button>)'
        if re.search(btn_pattern2, content, flags=re.DOTALL):
            if '{roleId !== 0 && roleId !== 1 && (' not in content:
                content = re.sub(
                    btn_pattern2,
                    r'{roleId !== 0 && roleId !== 1 && (\n          \1\n        )}',
                    content,
                    flags=re.DOTALL
                )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Done!')
