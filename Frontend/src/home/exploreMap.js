/**
 * Single source of truth for "where next?" navigation.
 *
 * Security: every path here is a static, same-origin route that a guest can open
 * (no AdminRoute). Nothing in the "keep exploring" layer is built from user input
 * or API data — query params and stored values are only ever used as lookup keys
 * against these tables.
 */

export const PAGES = [
  { path: '/quick-glance', title: 'Quick Glance', blurb: 'Key figures and trends across the Institute on one page.', keywords: 'overview dashboard summary kpi' },
  { path: '/people-campus', title: 'People & Campus', blurb: 'Faculty, staff, students, alumni and campus sustainability.', keywords: 'faculty staff alumni campus diversity' },
  { path: '/research', title: 'Research', blurb: 'Publications, patents, projects and research funding.', keywords: 'publications patents projects funding library icsr' },
  { path: '/education', title: 'Education', blurb: 'Programmes, student strength, placements and outcomes.', keywords: 'students programmes placements admissions academics' },
  { path: '/industry-connect', title: 'Industry Connect', blurb: 'Collaborations, consultancy and industry engagement.', keywords: 'industry consultancy collaboration conclave partners' },
  { path: '/innovation-entrepreneurship', title: 'Innovation & Entrepreneurship', blurb: 'Incubation, startups and the innovation ecosystem.', keywords: 'startup incubation techin iptif innovation' },
  { path: '/outreach-extension', title: 'Outreach & Extension', blurb: 'Social engagement, student programmes and community reach.', keywords: 'outreach community nptel open house uba' },
  { path: '/innovation-entrepreneurship/iptif/facilities', title: 'IPTIF Facilities', blurb: 'Labs and facilities open to startups, researchers and industry.', keywords: 'facilities labs equipment iptif' },
  { path: '/innovation-entrepreneurship/home-ground-startup', title: 'Home Ground Startup', blurb: 'Startups growing from the Institute.', keywords: 'startup home ground' },
  { path: '/innovation-entrepreneurship/startup-portfolio', title: 'Startup Portfolio', blurb: 'The startups incubated at the Institute.', keywords: 'startups portfolio companies incubated' },
  { path: '/outreach-extension/social-engagement', title: 'Social Engagement', blurb: 'UBA, Open House, institute visits and NSS.', keywords: 'social uba nss visits' },
  { path: '/outreach-extension/social-engagement/UBA', title: 'Unnat Bharat Abhiyan', blurb: 'Village adoption and rural outreach.', keywords: 'uba village rural' },
  { path: '/outreach-extension/social-engagement/OpenHouse', title: 'Open House', blurb: 'Annual open house and visitor numbers.', keywords: 'open house visitors' },
  { path: '/outreach-extension/social-engagement/InstituteVisits', title: 'Institute Visits', blurb: 'School and college visits to the campus.', keywords: 'visits schools colleges' },
  { path: '/outreach-extension/social-engagement/NSS', title: 'NSS Activities', blurb: 'National Service Scheme activities.', keywords: 'nss service' },
  { path: '/outreach-extension/students-engagement', title: 'Students Engagement', blurb: 'NPTEL, math circle, Pale Blue Dot and Science Quest.', keywords: 'students nptel pmc pbd science quest' },
  { path: '/outreach-extension/students-engagement/nptel', title: 'NPTEL', blurb: 'Enrolments and certifications through NPTEL.', keywords: 'nptel courses certification' },
  { path: '/outreach-extension/students-engagement/pmc', title: 'Palakkad Math Circle', blurb: 'Maths enrichment for school students.', keywords: 'math circle' },
  { path: '/outreach-extension/students-engagement/pbd', title: 'Pale Blue Dot', blurb: 'Astronomy and space outreach.', keywords: 'astronomy space pale blue dot' },
  { path: '/outreach-extension/students-engagement/sq', title: 'Science Quest', blurb: 'Science competitions and activities for students.', keywords: 'science quest' },
];

const PAGE_BY_PATH = new Map(PAGES.map((p) => [p.path, p]));

export function normalizePath(path) {
  if (typeof path !== 'string') return '';
  const p = path.split(/[?#]/)[0];
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

export const pageFor = (path) => PAGE_BY_PATH.get(normalizePath(path)) ?? null;
export const isKnownPath = (path) => PAGE_BY_PATH.has(normalizePath(path));

/* "You might also like" — hand-curated, 3 per page. */
const RELATED = {
  '/quick-glance': ['/research', '/education', '/industry-connect'],
  '/people-campus': ['/education', '/outreach-extension', '/quick-glance'],
  '/research': ['/industry-connect', '/innovation-entrepreneurship', '/innovation-entrepreneurship/iptif/facilities'],
  '/education': ['/research', '/industry-connect', '/outreach-extension/students-engagement'],
  '/industry-connect': ['/research', '/innovation-entrepreneurship/startup-portfolio', '/education'],
  '/innovation-entrepreneurship': ['/innovation-entrepreneurship/startup-portfolio', '/innovation-entrepreneurship/iptif/facilities', '/industry-connect'],
  '/outreach-extension': ['/outreach-extension/social-engagement', '/outreach-extension/students-engagement', '/people-campus'],
  '/innovation-entrepreneurship/iptif/facilities': ['/research', '/industry-connect', '/innovation-entrepreneurship/startup-portfolio'],
  '/innovation-entrepreneurship/home-ground-startup': ['/innovation-entrepreneurship/startup-portfolio', '/innovation-entrepreneurship/iptif/facilities', '/industry-connect'],
  '/innovation-entrepreneurship/startup-portfolio': ['/innovation-entrepreneurship/home-ground-startup', '/innovation-entrepreneurship/iptif/facilities', '/industry-connect'],
  '/outreach-extension/social-engagement': ['/outreach-extension/social-engagement/UBA', '/outreach-extension/social-engagement/OpenHouse', '/outreach-extension/students-engagement'],
  '/outreach-extension/social-engagement/UBA': ['/outreach-extension/social-engagement/NSS', '/outreach-extension/social-engagement/OpenHouse', '/people-campus'],
  '/outreach-extension/social-engagement/OpenHouse': ['/outreach-extension/social-engagement/InstituteVisits', '/education', '/outreach-extension/students-engagement'],
  '/outreach-extension/social-engagement/InstituteVisits': ['/outreach-extension/social-engagement/OpenHouse', '/education', '/outreach-extension/social-engagement/NSS'],
  '/outreach-extension/social-engagement/NSS': ['/outreach-extension/social-engagement/UBA', '/people-campus', '/outreach-extension/students-engagement'],
  '/outreach-extension/students-engagement': ['/outreach-extension/students-engagement/nptel', '/outreach-extension/students-engagement/sq', '/education'],
  '/outreach-extension/students-engagement/nptel': ['/outreach-extension/students-engagement/pmc', '/education', '/research'],
  '/outreach-extension/students-engagement/pmc': ['/outreach-extension/students-engagement/pbd', '/outreach-extension/students-engagement/sq', '/education'],
  '/outreach-extension/students-engagement/pbd': ['/outreach-extension/students-engagement/sq', '/outreach-extension/students-engagement/pmc', '/research'],
  '/outreach-extension/students-engagement/sq': ['/outreach-extension/students-engagement/pbd', '/outreach-extension/students-engagement/nptel', '/education'],
};

export function relatedFor(path) {
  return (RELATED[normalizePath(path)] ?? []).map(pageFor).filter(Boolean);
}

/* Guided journeys: ordered stops with a one-line reason for each. */
export const JOURNEYS = {
  student: {
    title: "I'm a prospective student",
    blurb: 'Programmes, life on campus and where graduates go.',
    steps: [
      { path: '/education', why: 'Start with what you can study and how students fare.' },
      { path: '/people-campus', why: 'Meet the faculty and community you would learn with.' },
      { path: '/outreach-extension/students-engagement', why: 'See the programmes beyond the classroom.' },
      { path: '/industry-connect', why: 'Finally, see how the Institute connects to industry.' },
    ],
  },
  industry: {
    title: "I'm an industry partner",
    blurb: 'Research strengths, facilities and startups to work with.',
    steps: [
      { path: '/industry-connect', why: 'Start with how the Institute works with industry.' },
      { path: '/research', why: 'Browse the research output and funded projects.' },
      { path: '/innovation-entrepreneurship/iptif/facilities', why: 'Facilities you can access.' },
      { path: '/innovation-entrepreneurship/startup-portfolio', why: 'Startups you could partner with.' },
    ],
  },
  researcher: {
    title: "I'm a researcher",
    blurb: 'Publications, facilities and collaboration routes.',
    steps: [
      { path: '/research', why: 'Start with publications, patents and funding.' },
      { path: '/innovation-entrepreneurship/iptif/facilities', why: 'Labs and facilities available.' },
      { path: '/industry-connect', why: 'Industry collaboration and consultancy.' },
      { path: '/quick-glance', why: 'Finish with the Institute-wide trends.' },
    ],
  },
};

export const journeyFor = (key) =>
  typeof key === 'string' && Object.prototype.hasOwnProperty.call(JOURNEYS, key) ? JOURNEYS[key] : null;

export const journeyHref = (key, path) => `${path}?journey=${key}`;

/* Public destination for each Quick Glance KPI (the KPI's own `to` may be an admin route). */
export const KPI_PUBLIC_PATH = {
  students: '/education',
  faculty: '/people-campus',
  publications: '/research',
  patents: '/research',
  funding: '/research',
  startups: '/innovation-entrepreneurship',
};
