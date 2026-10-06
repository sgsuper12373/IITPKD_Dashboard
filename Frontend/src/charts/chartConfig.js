/**
 * Shared chart configuration — the single source for colours, margins, font
 * sizes, animation and the mobile rule used by every chart in src/charts.
 *
 * COLOURS mirror src/styles/ds-shared.css (SVG attributes and html2canvas
 * export need literal values, CSS variables are not reliable there). Keep the
 * two files in step; status colours mirror the global.css semantic tokens.
 *
 * Palette rule: one orange highlight per chart, slate for everything else,
 * success / warning / danger for status only.
 */

export const COLORS = {
  accent: '#FF6B35',
  slate: '#475569',
  slateSoft: 'rgba(71, 85, 105, 0.35)',
  slateFaint: 'rgba(71, 85, 105, 0.15)',
  grid: 'rgba(71, 85, 105, 0.12)',
  success: '#22c55e',
  warning: '#f97316',
  danger: '#ef4444',
  surface: '#FFFFFF',
  textStrong: '#1e293b',
};

/** Opacity ladder for ranked slate series (donut slices, secondary bars). */
export const SLATE_STEPS = [1, 0.7, 0.5, 0.35, 0.22, 0.14];

export const FONT = {
  tick: 11,
  label: 12,
  small: 10,
};

export const MARGINS = {
  cartesian: { top: 12, right: 8, bottom: 4, left: 0 },
  combo: { top: 12, right: 8, bottom: 4, left: 0 },
  spark: { top: 4, right: 2, bottom: 2, left: 2 },
  radar: { top: 8, right: 24, bottom: 8, left: 24 },
};

export const ANIMATION = {
  duration: 750, // 700–800 ms range
  easing: 'ease-out',
};

/** Recharts animation props, switched off for prefers-reduced-motion. */
export const animationProps = () => {
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    isAnimationActive: !reduce,
    animationDuration: ANIMATION.duration,
    animationEasing: ANIMATION.easing,
  };
};

/** Mobile rule: at or below this width, trend charts show only the last N years. */
export const MOBILE = {
  maxWidth: 640,
  years: 3,
};

export const limitYears = (rows, isMobile) =>
  isMobile && Array.isArray(rows) ? rows.slice(-MOBILE.years) : rows;

/** Years shown in sparklines, combos and the year selector window. */
export const TREND_YEARS = 7;

/* ───────────────────────── Gauge zones ─────────────────────────
 * bands = [lowerEdge, upperEdge] on a 0–1 "goodness" scale:
 *   goodness < lowerEdge          → danger
 *   lowerEdge ≤ goodness < upper  → warning
 *   goodness ≥ upperEdge          → success
 * For invert gauges (lower is better) goodness = 1 − position, so rank 1 is
 * fully good and the max rank is fully bad.
 */
export const GAUGE_BANDS = {
  default: [0.6, 0.8],
  placement: [0.6, 0.8], // <60 % danger, 60–80 % warning, ≥80 % success
  nirf: [0.5, 0.7], // rank 1–150 inverted: >75 danger, 46–75 warning, ≤45 success
};

export const NIRF_RANK_RANGE = { min: 1, max: 150 };

/* ───────────────────────── Year basis ─────────────────────────
 * Section APIs key their data differently. Everything is aligned on the
 * START calendar year of an academic year ("2024-25" → 2024):
 *   placement_year  '2024-25'        → 2024
 *   admission_year / publication_year / patent filing year / project start
 *   year / incubation year / EWD year / ICSR event year / Open House year /
 *   NPTEL offering year / faculty headcount year   → used as-is (calendar
 *                                                     year ≙ AY starting then)
 *   NIRF ranking year                → used as-is (edition year)
 *   alumni graduation year           → year − 1 (graduating in 2025 closes
 *                                                 AY 2024-25)
 */
export const YEAR_BASIS = {
  alumniGraduationShift: -1,
};

/* ───────────────────────── Pillar index ─────────────────────────
 * Six pillars (matching the six dimensions on the home page). Each pillar
 * averages the normalised score of its key metrics:
 *
 *   norm(metric, y)  = 100 × (v_y − min) / (max − min)
 *                      min / max taken over the same TREND_YEARS window that
 *                      ends at the selected year (both "current" and
 *                      "previous" use the SAME bounds so they are comparable)
 *   if invert        → norm = 100 − norm          (lower is better)
 *   if max === min   → norm = 50                  (no spread to rank against)
 *   pillar(y)        = mean of norm over metrics that have a value at y
 *                      (null when none do — plotted as 0, tooltip says "No data")
 *
 * The index is therefore RELATIVE to the institute's own recent history
 * (100 = best year in the window), not an absolute or benchmarked score.
 * Metric keys refer to series built in src/utils/pulseModel.js.
 */
export const PILLARS = [
  {
    key: 'people',
    label: 'People & Campus',
    short: 'People',
    to: '/people-campus',
    metrics: [
      { series: 'faculty', label: 'Faculty strength' },
      { series: 'femaleShareUG', label: 'Female share of UG intake' },
      { series: 'perCapitaElectricity', label: 'Electricity per capita', invert: true },
    ],
  },
  {
    key: 'research',
    label: 'Research',
    short: 'Research',
    to: '/research',
    metrics: [
      { series: 'publications', label: 'Publications' },
      { series: 'patentsFiled', label: 'Patents filed' },
      { series: 'fundingCr', label: 'Sponsored funding' },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    short: 'Education',
    to: '/education',
    metrics: [
      { series: 'placementPct', label: 'Placement %' },
      { series: 'nirfRank', label: 'NIRF rank', invert: true },
      { series: 'intake', label: 'Student intake' },
    ],
  },
  {
    key: 'industry',
    label: 'Industry Connect',
    short: 'Industry',
    to: '/industry-connect',
    metrics: [
      { series: 'icsrEvents', label: 'Industry events' },
      { series: 'consultancyCr', label: 'Consultancy revenue' },
    ],
  },
  {
    key: 'innovation',
    label: 'Innovation & Entrepreneurship',
    short: 'Innovation',
    to: '/innovation-entrepreneurship',
    metrics: [
      { series: 'startups', label: 'Startups incubated' },
      { series: 'innovationProjects', label: 'Innovation projects' },
    ],
  },
  {
    key: 'outreach',
    label: 'Outreach & Extension',
    short: 'Outreach',
    to: '/outreach-extension',
    metrics: [
      { series: 'openHouseVisitors', label: 'Open House visitors' },
      { series: 'nptelEnrollments', label: 'NPTEL enrolments' },
    ],
  },
];

/* ───────────────────────── Click-through targets ─────────────────────────
 * Static, internal routes only (never built from API data).
 */
export const SOURCE_ROUTES = {
  placement: '/education/placements',
  nirf: '/',
  students: '/people-campus/academic-section',
  faculty: '/people-campus/administrative-section',
  publications: '/research/library',
  patents: '/patents',
  funding: '/research/icsr',
  startups: '/innovation-entrepreneurship',
  alumni: '/people-campus/iar',
  pillars: '/',
};

export const EMPTY_MESSAGE = 'No information available for the selected filter';
