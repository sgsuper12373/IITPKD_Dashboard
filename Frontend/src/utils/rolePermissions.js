export const SECTION_PERMISSIONS = {
  'people-campus/academic-section':        { modifyRoles: [3, 4] },
  'people-campus/administrative-section':  { modifyRoles: [3, 2] },
  'people-campus/igrc':                    { modifyRoles: [3, 7] },
  'people-campus/icc':                     { modifyRoles: [3, 8] },
  'people-campus/ewd':                     { modifyRoles: [3, 6] },
  'people-campus/iar':                     { modifyRoles: [3, 5] },
  'research/icsr':                         { modifyRoles: [3, 9] },
  'research/library':                      { modifyRoles: [3, 10] },
  'education/placements':                  { modifyRoles: [3, 11] },
  'education/academic-section':            { modifyRoles: [3, 4] },
  'education/iar':                         { modifyRoles: [3, 5] },
  'industry-connect/administrative':       { modifyRoles: [3, 2] },
  'industry-connect/icsr':                 { modifyRoles: [3, 9] },
  'industry-connect/conclave':             { modifyRoles: [3, 12] },
  'innovation/iptif':                      { modifyRoles: [3, 14] },
  'innovation/techin':                     { modifyRoles: [3, 13] },
  'outreach/open-house':                   { modifyRoles: [3, 15] },
  'outreach/nptel':                        { modifyRoles: [3, 16] },
  'outreach/uba':                          { modifyRoles: [3, 17] },
  'outreach/science-quest':               { modifyRoles: [3, 18] },
  'outreach/pmc':                          { modifyRoles: [3, 19] },
  'outreach/pbd':                          { modifyRoles: [3, 20] },
  'outreach/institute-visits':             { modifyRoles: [3, 21] },
  'outreach/nss':                          { modifyRoles: [3, 22] },
};

export const ROLE_NAMES = {
  0: 'Guest',
  1: 'Management View',
  2: 'Administration Section',
  3: 'Master Admin',
  4: 'Academic Section',
  5: 'IAR',
  6: 'EWD',
  7: 'IGRC',
  8: 'ICC',
  9: 'ICSR',
  10: 'Library',
  11: 'CDC',
  12: 'IAC',
  13: 'TechIn',
  14: 'IPTIF',
  15: 'Open House',
  16: 'CCE',
  17: 'UBA',
  18: 'Science Quest',
  19: 'PMC',
  20: 'PBD',
  21: 'Institute Visits',
  22: 'NSS',
};

export const getRoleName = (roleId) => ROLE_NAMES[roleId] ?? 'Unknown';

export const OUTREACH_PROGRAM_ROLES = {
  science_quest:        [3, 18],
  palakkad_math_circle: [3, 19],
  pale_blue_dot:        [3, 20],
  institute_visits:     [3, 21],
  nss_activities:       [3, 22],
};

export const canModifySection = (roleId, sectionKey) => {
  if (roleId === 3) return true;
  return SECTION_PERMISSIONS[sectionKey]?.modifyRoles.includes(roleId) ?? false;
};

export const canViewSection = (roleId, sectionKey) => {
  if (roleId === 0 || roleId === 1 || roleId === 3) return true;
  return SECTION_PERMISSIONS[sectionKey]?.modifyRoles.includes(roleId) ?? false;
};

const SECTION_LABELS = {
  'people-campus/academic-section':        'People & Campus → Academic Section',
  'people-campus/administrative-section':  'People & Campus → Administrative Section',
  'people-campus/igrc':                    'People & Campus → IGRC',
  'people-campus/icc':                     'People & Campus → ICC',
  'people-campus/ewd':                     'People & Campus → EWD',
  'people-campus/iar':                     'People & Campus → IAR',
  'research/icsr':                         'Research → ICSR',
  'research/library':                      'Research → Library',
  'education/placements':                  'Education → Placement Office',
  'education/academic-section':            'Education → Academic Section',
  'education/iar':                         'Education → IAR',
  'industry-connect/administrative':       'Industry Connect → Administrative Section',
  'industry-connect/icsr':                 'Industry Connect → ICSR',
  'industry-connect/conclave':             'Industry Connect → Industry-Academia Conclave',
  'innovation/iptif':                      'Innovation & Entrepreneurship → IPTIF',
  'innovation/techin':                     'Innovation & Entrepreneurship → TechIn',
  'outreach/open-house':                   'Outreach & Extension → Open House',
  'outreach/nptel':                        'Outreach & Extension → CCE',
  'outreach/uba':                          'Outreach & Extension → UBA',
  'outreach/science-quest':               'Outreach & Extension → Science Quest',
  'outreach/pmc':                          'Outreach & Extension → Palakkad Math Circle',
  'outreach/pbd':                          'Outreach & Extension → Pale Blue Dot',
  'outreach/institute-visits':             'Outreach & Extension → Institute Visits',
  'outreach/nss':                          'Outreach & Extension → NSS Activities',
};

const SECTION_ROUTES = {
  'people-campus/academic-section':        '/people-campus/academic-section',
  'people-campus/administrative-section':  '/people-campus/administrative-section',
  'people-campus/igrc':                    '/people-campus/igrc',
  'people-campus/icc':                     '/people-campus/icc',
  'people-campus/ewd':                     '/people-campus/ewd',
  'people-campus/iar':                     '/people-campus/iar',
  'research/icsr':                         '/research/icsr',
  'research/library':                      '/research/library',
  'education/placements':                  '/education/placements',
  'education/academic-section':            '/education/academic-section',
  'education/iar':                         '/education/iar',
  'industry-connect/administrative':       '/research/administrative-section',
  'industry-connect/icsr':                 '/industry-connect/icsr',
  'industry-connect/conclave':             '/industry-connect/conclave',
  'innovation/iptif':                      '/innovation-entrepreneurship/iptif',
  'innovation/techin':                     '/innovation-entrepreneurship/techin',
  'outreach/open-house':                   '/outreach-extension/open-house',
  'outreach/nptel':                        '/outreach-extension/nptel',
  'outreach/uba':                          '/outreach-extension/uba',
  'outreach/science-quest':               '/outreach-extension/outreach?program=science_quest',
  'outreach/pmc':                          '/outreach-extension/outreach?program=palakkad_math_circle',
  'outreach/pbd':                          '/outreach-extension/outreach?program=pale_blue_dot',
  'outreach/institute-visits':             '/outreach-extension/outreach?program=institute_visits',
  'outreach/nss':                          '/outreach-extension/outreach?program=nss_activities',
};

export const getRoleAccessibleSections = (roleId) => {
  if (!roleId || roleId === 0 || roleId === 1 || roleId === 3) return [];
  return Object.entries(SECTION_PERMISSIONS)
    .filter(([, perms]) => perms.modifyRoles.includes(roleId))
    .map(([key]) => ({ label: SECTION_LABELS[key], route: SECTION_ROUTES[key] }));
};

export const PAGE_ACCESS_ROLES = {
  'people-campus':               [3, 2, 4, 5, 6, 7, 8],
  'research':                    [3, 9, 10],
  'education':                   [3, 4, 5, 11],
  'industry-connect':            [3, 2, 9, 12],
  'innovation-entrepreneurship': [3, 13, 14],
  'outreach-extension':          [3, 15, 16, 17, 18, 19, 20, 21, 22],
};
