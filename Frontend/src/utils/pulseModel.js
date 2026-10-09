/**
 * Pure data model behind the Quick Glance page. Takes the raw responses of the
 * existing section APIs, aligns every series on the START calendar year of an
 * academic year (see YEAR_BASIS in src/charts/chartConfig.js) and derives
 * gauges, KPIs, cross-section combos, the pillar index and ranked tables for a
 * selected year. No I/O and no React — everything here is deterministic.
 */
import { PILLARS, SOURCE_ROUTES, TREND_YEARS, YEAR_BASIS } from '../charts/chartConfig';
import { fmtCr, fmtDelta, fmtInt, fmtNum } from '../charts/format';

/* ───────────── helpers ───────────── */

/** Number or null — null/undefined/''/NaN never become 0. */
export const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 2024 → '2024-25'. */
export const ayLabel = (y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;

/** 2024 | '2024' | '2024-25' → 2024 (otherwise null). */
export const startYear = (v) => {
  const m = /^(\d{4})/.exec(String(v ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1900 && y <= 2200 ? y : null;
};

/** Accepts [..] or { data: [..] } (or a named key) and always returns an array. */
export const rowsOf = (payload, key = 'data') => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload[key])) return payload[key];
  return [];
};

const toSeries = (rows, yearOf, valueOf) => {
  const out = {};
  rows.forEach((r) => {
    const y = yearOf(r);
    const v = valueOf(r);
    if (y !== null && v !== null) out[y] = v;
  });
  return out;
};

const share = (part, whole) => {
  const p = num(part);
  const w = num(whole);
  return p !== null && w ? (p / w) * 100 : null;
};

export const windowYears = (year, n = TREND_YEARS) =>
  Array.from({ length: n }, (_, i) => year - (n - 1) + i);

const valuesFor = (series, years) => years.map((y) => (series && y in series ? series[y] : null));

/** Year-on-year % change; null when either year is missing or the base is 0. */
export const yoy = (series, year) => {
  const cur = series?.[year];
  const prev = series?.[year - 1];
  if (cur === undefined || prev === undefined || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

/** Absolute change (percentage points / rank places). */
const diff = (series, year) => {
  const cur = series?.[year];
  const prev = series?.[year - 1];
  return cur === undefined || prev === undefined ? null : cur - prev;
};

/* ───────────── series ───────────── */

export function buildSeries(raw = {}) {
  const placementRows = rowsOf(raw.placementTrend);
  const recruiterRows = rowsOf(raw.recruiters);
  const nirfRows = rowsOf(raw.nirf);
  const groupRows = Array.isArray(raw.programTrends?.gender_by_group) ? raw.programTrends.gender_by_group : [];
  const facultyRows = rowsOf(raw.facultyStrength);
  const patentRows = Array.isArray(raw.patents?.yearly) ? raw.patents.yearly : [];
  const revenueRows = rowsOf(raw.revenue);
  const innovationRows = rowsOf(raw.innovation);
  const ewdRows = rowsOf(raw.ewd);
  const alumniRows = Array.isArray(raw.iar?.data?.trend) ? raw.iar.data.trend : [];
  const nptelRows = Array.isArray(raw.nptelTrend?.trend) ? raw.nptelTrend.trend : [];
  const openHouseRows = Array.isArray(raw.openHouse?.timeline) ? raw.openHouse.timeline : [];
  const yr = (r) => startYear(r.year);
  const grad = (r) => {
    const y = startYear(r.year);
    return y === null ? null : y + YEAR_BASIS.alumniGraduationShift;
  };

  return {
    // Education
    placementPct: toSeries(placementRows, yr, (r) => num(r.placement_percentage)),
    placementRegistered: toSeries(placementRows, yr, (r) => num(r.registered)),
    placementPlaced: toSeries(placementRows, yr, (r) => num(r.placed)),
    companies: toSeries(recruiterRows, yr, (r) => num(r.companies)),
    offers: toSeries(recruiterRows, yr, (r) => num(r.offers)),
    nirfRank: toSeries(nirfRows, yr, (r) => num(r.rank)),
    intake: toSeries(groupRows, yr, (r) => num(r.Total)),
    intakeUG: toSeries(groupRows, yr, (r) => num(r.UG_Total)),
    femaleShareUG: toSeries(groupRows, yr, (r) => share(r.UG_Female, r.UG_Total)),
    femaleSharePG: toSeries(groupRows, yr, (r) => share(r.PG_Female, r.PG_Total)),
    femaleShareResearch: toSeries(groupRows, yr, (r) => share(r.Research_Female, r.Research_Total)),
    // People & campus
    faculty: toSeries(facultyRows, yr, (r) => num(r.Total)),
    facultyFemaleShare: toSeries(facultyRows, yr, (r) => share(r.Female, r.Total)),
    perCapitaElectricity: toSeries(ewdRows, (r) => startYear(r.ewd_year), (r) => num(r.per_capita_electricity_consumption)),
    alumniTotal: toSeries(alumniRows, grad, (r) => num(r.total)),
    alumniHigher: toSeries(alumniRows, grad, (r) => num(r.higher)),
    alumniCorporate: toSeries(alumniRows, grad, (r) => num(r.corporate)),
    // Research
    publications: toSeries(rowsOf(raw.pubTrend), yr, (r) => num(r.total)),
    patentsFiled: toSeries(patentRows, yr, (r) => num(r.Filed)),
    fundingCr: toSeries(revenueRows, yr, (r) => (num(r.funded_revenue) === null ? null : num(r.funded_revenue) / 1e7)),
    consultancyCr: toSeries(revenueRows, yr, (r) => (num(r.consultancy_revenue) === null ? null : num(r.consultancy_revenue) / 1e7)),
    // Industry / innovation / outreach
    icsrEvents: toSeries(rowsOf(raw.icsrYearly), yr, (r) => num(r.event_count)),
    startups: toSeries(innovationRows, yr, (r) => num(r.startups)),
    innovationProjects: toSeries(innovationRows, yr, (r) => num(r.innovation_projects)),
    openHouseVisitors: toSeries(openHouseRows, (r) => startYear(r.event_year), (r) => num(r.total_visitors)),
    nptelEnrollments: toSeries(nptelRows, yr, (r) => num(r.enrollments)),
  };
}

/** Sorted academic-year start years that have data in at least one series. */
export function availableYears(series) {
  const set = new Set();
  Object.values(series).forEach((s) => Object.keys(s).forEach((k) => set.add(Number(k))));
  return [...set].sort((a, b) => a - b);
}

/**
 * Default selection: the latest year with placement data (the most complete
 * year-end indicator), else the latest year with any data.
 */
export function defaultYear(series) {
  const placed = Object.keys(series.placementPct || {}).map(Number).sort((a, b) => a - b);
  if (placed.length) return placed[placed.length - 1];
  const all = availableYears(series);
  return all.length ? all[all.length - 1] : null;
}

/* ───────────── pillar index ───────────── */

/**
 * Applies the formula documented at PILLARS in chartConfig.js.
 * Returns [{ key, label, short, value|null }] for `year`, with min/max bounds
 * taken from the TREND_YEARS window ending at `boundsEndYear`.
 */
export function pillarScores(series, year, boundsEndYear = year) {
  const years = windowYears(boundsEndYear);
  return PILLARS.map((p) => {
    const parts = [];
    p.metrics.forEach((m) => {
      const s = series[m.series];
      if (!s) return;
      const window = valuesFor(s, years).filter((v) => v !== null);
      const v = s[year];
      if (v === undefined || window.length === 0) return;
      const lo = Math.min(...window);
      const hi = Math.max(...window);
      let norm = hi === lo ? 50 : ((v - lo) / (hi - lo)) * 100;
      norm = Math.min(100, Math.max(0, norm));
      parts.push(m.invert ? 100 - norm : norm);
    });
    return {
      key: p.key,
      label: p.label,
      short: p.short,
      to: p.to,
      value: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null,
    };
  });
}

/* ───────────── per-year view ───────────── */

const kpi = ({ key, label, value, text, delta, deltaLabel, series, years, sub, to, invert }) => ({
  key,
  label,
  value: value === null || value === undefined ? '–' : text,
  delta,
  deltaLabel,
  invert,
  series: valuesFor(series, years),
  sub,
  to,
});

/**
 * @param {object} series  from buildSeries
 * @param {number} year    selected academic-year start year
 * @param {object} extras  { onroll, deptByYear: {year: [{department,total}]} }
 */
export function buildPulse(series, year, extras = {}) {
  if (year === null || year === undefined) return null;
  const years = windowYears(year);
  const ay = ayLabel(year);
  const prevAy = ayLabel(year - 1);
  const at = (key, y = year) => (series[key] && y in series[key] ? series[key][y] : null);

  /* gauges */
  const nirfYears = Object.keys(series.nirfRank).map(Number).filter((y) => y <= year).sort((a, b) => a - b);
  const nirfYear = nirfYears.length ? nirfYears[nirfYears.length - 1] : null;
  const nirfValue = nirfYear === null ? null : series.nirfRank[nirfYear];
  const nirfPrev = nirfYear === null ? null : series.nirfRank[nirfYear - 1];

  const registered = at('placementRegistered');
  const placed = at('placementPlaced');
  const gauges = {
    placement: {
      value: at('placementPct'),
      delta: diff(series.placementPct, year),
      sub: registered !== null && placed !== null ? `${fmtInt(placed)} of ${fmtInt(registered)} registered placed · ${ay}` : ay,
    },
    nirf: {
      value: nirfValue,
      delta: nirfValue !== null && nirfPrev !== undefined && nirfPrev !== null ? nirfValue - nirfPrev : null,
      sub: nirfYear === null ? '' : nirfYear === year ? `NIRF ${nirfYear} · Engineering` : `Latest edition: NIRF ${nirfYear} · Engineering`,
    },
  };

  /* KPIs */
  // fetchOnrollSummary() masks a failed request as all-zeros; treat 0 as unavailable.
  const onrollRaw = num(extras.onroll?.total_onroll);
  const onroll = onrollRaw && onrollRaw > 0 ? onrollRaw : null;
  const intakeNow = at('intake');
  const kpis = [
    kpi({
      key: 'students',
      label: 'Students on roll',
      value: onroll,
      text: fmtInt(onroll),
      delta: yoy(series.intake, year),
      deltaLabel: 'Intake YoY',
      series: series.intake,
      years,
      sub: intakeNow === null ? 'Current strength' : `Current strength · intake ${ay}: ${fmtInt(intakeNow)}`,
      to: SOURCE_ROUTES.students,
    }),
    kpi({
      key: 'faculty',
      label: 'Faculty strength',
      value: at('faculty'),
      text: fmtInt(at('faculty')),
      delta: yoy(series.faculty, year),
      series: series.faculty,
      years,
      sub: 'Teaching staff, year end',
      to: SOURCE_ROUTES.faculty,
    }),
    kpi({
      key: 'publications',
      label: 'Publications',
      value: at('publications'),
      text: fmtInt(at('publications')),
      delta: yoy(series.publications, year),
      series: series.publications,
      years,
      sub: `Published in ${year}`,
      to: SOURCE_ROUTES.publications,
    }),
    kpi({
      key: 'patents',
      label: 'Patents filed',
      value: at('patentsFiled'),
      text: fmtInt(at('patentsFiled')),
      delta: yoy(series.patentsFiled, year),
      series: series.patentsFiled,
      years,
      sub: `Filed in ${year}`,
      to: SOURCE_ROUTES.patents,
    }),
    kpi({
      key: 'funding',
      label: 'Sponsored funding',
      value: at('fundingCr'),
      text: fmtCr(at('fundingCr')),
      delta: yoy(series.fundingCr, year),
      series: series.fundingCr,
      years,
      sub: 'Sanctioned, by project start',
      to: SOURCE_ROUTES.funding,
    }),
    kpi({
      key: 'startups',
      label: 'Startups incubated',
      value: at('startups'),
      text: fmtInt(at('startups')),
      delta: yoy(series.startups, year),
      series: series.startups,
      years,
      sub: `Incubated in ${year}`,
      to: SOURCE_ROUTES.startups,
    }),
  ];

  /* cross-section combos */
  const comboRows = (barKey, lineKey) =>
    years.map((y) => ({
      year: y,
      label: ayLabel(y),
      [barKey]: at(barKey, y),
      [lineKey]: at(lineKey, y),
    }));

  const funding = at('fundingCr');
  const pubs = at('publications');
  const prevFunding = at('fundingCr', year - 1);
  const prevPubs = at('publications', year - 1);
  let fundingInsight = 'Insufficient data to relate funding and publications for the selected year.';
  if (funding && pubs !== null) {
    const ratio = pubs / funding;
    fundingInsight = `${fmtNum(ratio, 1)} publications per ₹ Cr sanctioned in ${ay}`;
    if (prevFunding && prevPubs !== null) {
      fundingInsight += ` (${fmtNum(prevPubs / prevFunding, 1)} in ${prevAy}).`;
    } else {
      fundingInsight += '.';
    }
  }

  const intakeChange = yoy(series.intake, year);
  const placementChange = diff(series.placementPct, year);
  let enrolInsight = 'Insufficient data to relate intake and placement for the selected year.';
  if (intakeChange !== null || placementChange !== null) {
    const parts = [];
    if (placementChange !== null) parts.push(`placement rate ${fmtDelta(placementChange, 'pp')}`);
    if (intakeChange !== null) parts.push(`intake ${fmtDelta(intakeChange)}`);
    enrolInsight = `${ay} vs ${prevAy}: ${parts.join(', ')}.`;
  }

  // "x per y" insight for a (denominator bar, numerator line) pair, with last year for context.
  const pairInsight = (denKey, numKey, phrase, digits = 1) => {
    const den = at(denKey);
    const num = at(numKey);
    if (!den || num === null) return 'Insufficient data to relate these two measures for the selected year.';
    let text = `${fmtNum(num / den, digits)} ${phrase} in ${ay}`;
    const pd = at(denKey, year - 1);
    const pn = at(numKey, year - 1);
    text += pd && pn !== null ? ` (${fmtNum(pn / pd, digits)} in ${prevAy}).` : '.';
    return text;
  };
  const hasPair = (a, b) => years.some((y) => at(a, y) !== null || at(b, y) !== null);

  const combos = {
    faculty: {
      rows: comboRows('faculty', 'publications'),
      insight: pairInsight('faculty', 'publications', 'publications per faculty member'),
      hasData: hasPair('faculty', 'publications'),
    },
    patents: {
      rows: comboRows('fundingCr', 'patentsFiled'),
      insight: pairInsight('fundingCr', 'patentsFiled', 'patents filed per ₹ Cr sanctioned', 2),
      hasData: hasPair('fundingCr', 'patentsFiled'),
    },
    industry: {
      rows: comboRows('icsrEvents', 'consultancyCr'),
      insight: pairInsight('icsrEvents', 'consultancyCr', '₹ Cr consultancy revenue per industry event', 2),
      hasData: hasPair('icsrEvents', 'consultancyCr'),
    },
    innovation: {
      rows: comboRows('startups', 'innovationProjects'),
      insight: pairInsight('startups', 'innovationProjects', 'innovation projects per startup'),
      hasData: hasPair('startups', 'innovationProjects'),
    },
    funding: {
      rows: comboRows('fundingCr', 'publications'),
      insight: fundingInsight,
      hasData: years.some((y) => at('fundingCr', y) !== null || at('publications', y) !== null),
    },
    enrolment: {
      rows: comboRows('intake', 'placementPct'),
      insight: enrolInsight,
      hasData: years.some((y) => at('intake', y) !== null || at('placementPct', y) !== null),
    },
  };

  /* pillars */
  const pillars = {
    current: pillarScores(series, year, year),
    previous: pillarScores(series, year - 1, year),
  };

  /* placement funnel */
  const placement = {
    registered,
    placed,
    companies: at('companies'),
    offers: at('offers'),
    pct: at('placementPct'),
  };

  /* alumni donut (graduation year = AY end year) */
  const alumniTotal = at('alumniTotal');
  const alumniHigher = at('alumniHigher');
  const alumniCorporate = at('alumniCorporate');
  const alumni = {
    total: alumniTotal,
    year: year - YEAR_BASIS.alumniGraduationShift,
    slices:
      alumniTotal
        ? [
            { name: 'Higher studies', value: alumniHigher ?? 0 },
            { name: 'Corporate & other', value: alumniCorporate ?? 0 },
          ]
        : [],
  };

  /* female share */
  const gender = [
    { key: 'ug', label: 'UG intake', value: at('femaleShareUG') },
    { key: 'pg', label: 'PG intake', value: at('femaleSharePG') },
    { key: 'research', label: 'Research intake', value: at('femaleShareResearch') },
    { key: 'faculty', label: 'Faculty', value: at('facultyFemaleShare') },
  ];

  /* publications by department */
  const deptByYear = extras.deptByYear || {};
  const lookup = (y) => {
    const map = {};
    (deptByYear[y] || []).forEach((r) => {
      const t = num(r.total);
      if (t !== null && r.department) map[r.department] = (map[r.department] || 0) + t;
    });
    return map;
  };
  const cur = lookup(year);
  const prev = lookup(year - 1);
  const windowMaps = years.map((y) => ({ y, map: deptByYear[y] ? lookup(y) : null }));
  const pubDepts = Object.entries(cur).map(([department, value]) => ({
    id: department,
    label: department,
    value,
    series: windowMaps.map(({ map }) => (map ? map[department] ?? 0 : null)),
    delta: department in prev && prev[department] !== 0 ? ((value - prev[department]) / prev[department]) * 100 : null,
  }));

  return { year, ay, years, gauges, kpis, combos, pillars, placement, alumni, gender, pubDepts };
}
