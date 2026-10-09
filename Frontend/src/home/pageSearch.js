import { PAGES } from './exploreMap';

const score = (page, q) => {
  const title = page.title.toLowerCase();
  if (title.startsWith(q)) return 3;
  if (title.includes(q)) return 2;
  return `${page.blurb} ${page.keywords}`.toLowerCase().includes(q) ? 1 : 0;
};

/** Title matches first, then description/keyword matches. Empty query returns `fallback`. */
export function searchPages(query, limit = 8, fallback = PAGES) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return fallback.slice(0, limit);
  return PAGES.map((p) => ({ p, s: score(p, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((r) => r.p)
    .slice(0, limit);
}

/* Which data tables feed each page — used for the "Updated … ago" label. */
const PILLAR_TABLES = {
  people: ['employees', 'student_table', 'alumni', 'ewd_yearwise', 'iar_mous'],
  research: ['research_publications', 'research_patents', 'research_mous', 'icsr_sponsered_projects'],
  education: ['placement_summary', 'student_table', 'courses_table', 'nirf_ranking'],
  industry: ['industry_events', 'industry_conclave', 'icsr_consultancy_projects'],
  innovation: ['innovation_projects', 'iptif_startup_table', 'techin_startup_table'],
  outreach: ['outreach', 'open_house', 'nptel_courses', 'uba_events'],
};

export const PAGE_TABLES = {
  '/quick-glance': Object.values(PILLAR_TABLES).flat(),
  '/people-campus': PILLAR_TABLES.people,
  '/research': PILLAR_TABLES.research,
  '/education': PILLAR_TABLES.education,
  '/industry-connect': PILLAR_TABLES.industry,
  '/innovation-entrepreneurship': PILLAR_TABLES.innovation,
  '/outreach-extension': PILLAR_TABLES.outreach,
  '/innovation-entrepreneurship/iptif/facilities': ['iptif_facilities_table'],
  '/innovation-entrepreneurship/home-ground-startup': ['iptif_startup_table'],
  '/innovation-entrepreneurship/startup-portfolio': ['iptif_startup_table', 'techin_startup_table'],
  '/outreach-extension/social-engagement': ['outreach', 'uba_events', 'open_house'],
  '/outreach-extension/social-engagement/UBA': ['uba_events', 'uba_projects'],
  '/outreach-extension/social-engagement/OpenHouse': ['open_house'],
  '/outreach-extension/social-engagement/InstituteVisits': ['outreach'],
  '/outreach-extension/social-engagement/NSS': ['outreach'],
  '/outreach-extension/students-engagement': ['nptel_courses', 'outreach'],
  '/outreach-extension/students-engagement/nptel': ['nptel_courses'],
  '/outreach-extension/students-engagement/pmc': ['outreach'],
  '/outreach-extension/students-engagement/pbd': ['outreach'],
  '/outreach-extension/students-engagement/sq': ['outreach'],
};

export function timeAgo(iso, now = Date.now()) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now - t) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return 'over a year ago';
}
