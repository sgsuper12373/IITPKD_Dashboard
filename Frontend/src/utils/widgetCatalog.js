/**
 * Widget catalog for the admin-editable Quick Glance page.
 *
 * WIDGET_TYPES  — the available chart components and which sizes they support.
 * DATA_KEYS     — every metric the admin can place on the page, with an
 *                 `extract(data, year, ay, prevAy)` that returns the props the
 *                 corresponding chart component needs. `data` is the object
 *                 returned by buildPulse().
 */
import { GAUGE_BANDS, NIRF_RANK_RANGE, SOURCE_ROUTES } from '../charts/chartConfig';
import { fmtInt, fmtNum } from '../charts/format';
import { COMBO_VIEWS } from './comboViews';
import { ayLabel } from './pulseModel';

/* ── Widget types ── */

export const WIDGET_TYPES = {
  gauge:    { label: 'Gauge',         icon: '⊙', sizes: ['sm', 'md'] },
  kpi:      { label: 'KPI Card',      icon: '▤', sizes: ['sm'] },
  combo:    { label: 'Combo Chart',   icon: '⊞', sizes: ['md', 'lg'] },
  donut:    { label: 'Donut Chart',   icon: '◎', sizes: ['sm', 'md'] },
  funnel:   { label: 'Funnel',        icon: '▽', sizes: ['md'] },
  ranked:   { label: 'Ranked Bars',   icon: '▥', sizes: ['md', 'lg'] },
  progress: { label: 'Progress Bars', icon: '▬', sizes: ['sm', 'md', 'lg'] },
  radar:    { label: 'Radar',         icon: '⬡', sizes: ['md', 'lg'] },
};

/* ── Data key extractors ──
 *
 * Each extractor receives the full `data` object from buildPulse() plus the
 * selected `year`. It returns the props object that the widget renderer will
 * spread into the chart component (or pass to ChartCard).
 *
 * The `forType` field restricts which widget_type(s) a data_key is compatible
 * with — shown in the editor dropdown.
 */

export const DATA_KEYS = {
  /* ── Gauges ── */
  placementRate: {
    label: 'Placement Rate',
    forType: ['gauge'],
    extract: (data) => ({
      label: 'Placed / registered',
      value: data.gauges.placement.value,
      min: 0,
      max: 100,
      bands: GAUGE_BANDS.placement,
      format: (v) => `${fmtNum(v, 1)}%`,
      delta: data.gauges.placement.delta,
      deltaUnit: 'pp',
      deltaLabel: 'vs previous year',
      sub: data.gauges.placement.sub,
      to: SOURCE_ROUTES.placement,
    }),
  },
  nirfRank: {
    label: 'NIRF Rank',
    forType: ['gauge'],
    extract: (data) => ({
      label: 'Rank (lower is better)',
      value: data.gauges.nirf.value,
      min: NIRF_RANK_RANGE.min,
      max: NIRF_RANK_RANGE.max,
      invert: true,
      bands: GAUGE_BANDS.nirf,
      format: (v) => `#${fmtInt(v)}`,
      delta: data.gauges.nirf.delta,
      deltaUnit: ' places',
      deltaLabel: 'vs previous edition',
      sub: data.gauges.nirf.sub,
      to: SOURCE_ROUTES.nirf,
    }),
  },

  /* ── KPIs ── */
  students: {
    label: 'Students on Roll',
    forType: ['kpi'],
    extract: (data) => data.kpis.find((k) => k.key === 'students') ?? {},
  },
  faculty: {
    label: 'Faculty Strength',
    forType: ['kpi'],
    extract: (data) => data.kpis.find((k) => k.key === 'faculty') ?? {},
  },
  publications: {
    label: 'Publications',
    forType: ['kpi'],
    extract: (data) => data.kpis.find((k) => k.key === 'publications') ?? {},
  },
  patents: {
    label: 'Patents Filed',
    forType: ['kpi'],
    extract: (data) => data.kpis.find((k) => k.key === 'patents') ?? {},
  },
  funding: {
    label: 'Sponsored Funding',
    forType: ['kpi', 'combo'],
    extract: (data, _year, _ay, _prevAy, widgetType) => {
      if (widgetType === 'combo') {
        const view = COMBO_VIEWS.funding;
        const combo = data.combos.funding;
        return { view, combo };
      }
      return data.kpis.find((k) => k.key === 'funding') ?? {};
    },
  },
  startups: {
    label: 'Startups Incubated',
    forType: ['kpi'],
    extract: (data) => data.kpis.find((k) => k.key === 'startups') ?? {},
  },

  /* ── Combos ── */
  enrolment: {
    label: 'Enrolment vs Placement',
    forType: ['combo'],
    extract: (data) => ({ view: COMBO_VIEWS.enrolment, combo: data.combos.enrolment }),
  },
  facultyCombo: {
    label: 'Faculty vs Publications',
    forType: ['combo'],
    extract: (data) => ({ view: COMBO_VIEWS.faculty, combo: data.combos.faculty }),
  },
  patentsCombo: {
    label: 'Funding vs Patents',
    forType: ['combo'],
    extract: (data) => ({ view: COMBO_VIEWS.patents, combo: data.combos.patents }),
  },
  industry: {
    label: 'Industry Events vs Consultancy',
    forType: ['combo'],
    extract: (data) => ({ view: COMBO_VIEWS.industry, combo: data.combos.industry }),
  },
  innovation: {
    label: 'Startups vs Innovation',
    forType: ['combo'],
    extract: (data) => ({ view: COMBO_VIEWS.innovation, combo: data.combos.innovation }),
  },

  /* ── Radar ── */
  pillarIndex: {
    label: 'Pillar Index',
    forType: ['radar'],
    extract: (data, year) => ({
      current: data.pillars.current,
      previous: data.pillars.previous,
      currentLabel: data.ay,
      previousLabel: ayLabel(year - 1),
    }),
  },

  /* ── Funnel ── */
  placementFunnel: {
    label: 'Placement Funnel',
    forType: ['funnel'],
    extract: (data) => ({
      stages: [
        { label: 'Registered', value: data.placement.registered },
        { label: 'Placed', value: data.placement.placed },
      ],
      chips: [
        { label: 'Companies', value: data.placement.companies },
        { label: 'Offers', value: data.placement.offers },
      ],
      subtitle: `Academic year ${data.ay}`,
      to: SOURCE_ROUTES.placement,
    }),
  },

  /* ── Donut ── */
  alumniOutcomes: {
    label: 'Alumni Outcomes',
    forType: ['donut'],
    extract: (data) => ({
      data: data.alumni.slices,
      centerLabel: fmtInt(data.alumni.total),
      centerSub: 'Alumni',
      subtitle: data.alumni.year ? `Graduating class of ${data.alumni.year}` : undefined,
      to: SOURCE_ROUTES.alumni,
      empty: !(data.alumni.slices.length > 0),
    }),
  },

  /* ── Progress ── */
  femaleShare: {
    label: 'Female Share',
    forType: ['progress'],
    extract: (data) => {
      const rows = data.gender ?? [];
      const top = rows.reduce(
        (best, r) => (typeof r.value === 'number' && (best === null || r.value > best.value) ? r : best),
        null,
      );
      return {
        rows,
        topKey: top?.key,
        subtitle: `Intake ${data.ay} · faculty at year end`,
        to: SOURCE_ROUTES.students,
      };
    },
  },

  /* ── Ranked ── */
  pubByDept: {
    label: 'Publications by Department',
    forType: ['ranked'],
    extract: (data) => ({
      rows: data.pubDepts,
      subtitle: `Calendar year ${data.year} · seven-year trend per department`,
      to: SOURCE_ROUTES.publications,
    }),
  },
};

export const dataKeysForType = (widgetType) =>
  Object.entries(DATA_KEYS)
    .filter(([, def]) => def.forType.includes(widgetType))
    .map(([key, def]) => ({ key, label: def.label }));
