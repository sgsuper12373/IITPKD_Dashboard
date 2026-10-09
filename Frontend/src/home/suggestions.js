/**
 * What to suggest after a visitor opens a section card. Hand-curated, keyed `pillar/sectionId`.
 *   trends : Quick Glance figure keys to show as live sparkline cards
 *   combos : keys of COMBO_VIEWS (utils/comboViews.js) worth comparing, in priority order
 *   pages  : public page paths worth visiting next
 * Sibling sections of the same page are added automatically.
 */
export const SUGGESTIONS = {
  'research/icsr': { trends: ['funding', 'publications'], combos: ['funding', 'patents', 'industry'], pages: ['/industry-connect', '/innovation-entrepreneurship'] },
  'research/library': { trends: ['publications', 'patents'], combos: ['funding', 'faculty'], pages: ['/education', '/quick-glance'] },
  'research/icsr-mous': { trends: ['funding'], combos: ['industry', 'funding'], pages: ['/industry-connect'] },
  'research/patents': { trends: ['patents', 'publications'], combos: ['patents', 'funding'], pages: ['/innovation-entrepreneurship'] },

  'education/placements': { trends: ['students'], combos: ['enrolment'], pages: ['/industry-connect', '/quick-glance'] },
  'education/academic': { trends: ['students', 'faculty'], combos: ['enrolment', 'faculty'], pages: ['/people-campus', '/research'] },
  'education/iar': { trends: ['students'], combos: ['enrolment'], pages: ['/people-campus'] },

  'people-campus/academic': { trends: ['students', 'faculty'], combos: ['enrolment', 'faculty'], pages: ['/education'] },
  'people-campus/administrative': { trends: ['faculty'], combos: ['faculty'], pages: ['/research'] },
  'people-campus/grievances': { trends: [], combos: [], pages: ['/outreach-extension', '/quick-glance'] },
  'people-campus/ewd': { trends: [], combos: [], pages: ['/outreach-extension', '/quick-glance'] },
  'people-campus/iar': { trends: ['students'], combos: ['enrolment'], pages: ['/education', '/industry-connect'] },

  'industry-connect/administrative': { trends: ['funding'], combos: ['industry', 'funding'], pages: ['/research'] },
  'industry-connect/icsr': { trends: ['funding'], combos: ['industry', 'funding'], pages: ['/research', '/innovation-entrepreneurship'] },
  'industry-connect/conclave': { trends: ['funding', 'startups'], combos: ['industry', 'innovation'], pages: ['/innovation-entrepreneurship'] },

  'innovation/home-ground-startup': { trends: ['startups'], combos: ['innovation'], pages: ['/innovation-entrepreneurship/startup-portfolio', '/industry-connect'] },
  'innovation/startups': { trends: ['startups', 'funding'], combos: ['innovation', 'funding'], pages: ['/innovation-entrepreneurship/iptif/facilities'] },
  'innovation/innovation-hub': { trends: ['startups'], combos: ['innovation'], pages: ['/innovation-entrepreneurship/startup-portfolio'] },
  'innovation/startup-portfolio': { trends: ['startups'], combos: ['innovation', 'funding'], pages: ['/innovation-entrepreneurship/iptif/facilities', '/industry-connect'] },
};
