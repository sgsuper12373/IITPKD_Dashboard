import { useMemo, useState } from 'react';
import {
  ChartCard,
  ComboChart,
  DonutChart,
  FunnelBars,
  GaugeChart,
  KpiSparkCard,
  PillarRadar,
  ProgressRow,
  RankedBars,
  SegmentedControl,
  GAUGE_BANDS,
  NIRF_RANK_RANGE,
  SOURCE_ROUTES,
  fmtInt,
  fmtNum,
} from '../charts';
import { useInstitutePulse } from '../hooks/useInstitutePulse';
import { ayLabel } from '../utils/pulseModel';
import './QuickGlance.css';

const COMBO_VIEWS = {
  funding: {
    option: 'Funding vs publications',
    title: 'Research funding vs publications',
    subtitle: 'Sponsored funding (ICSR) against publications (Library)',
    to: SOURCE_ROUTES.funding,
    barKey: 'fundingCr',
    barName: 'Sponsored funding (₹ Cr)',
    barFormat: (v) => fmtNum(v, 1),
    lineKey: 'publications',
    lineName: 'Publications',
    lineFormat: (v) => fmtInt(v),
    headers: ['Academic year', 'Sponsored funding (Cr)', 'Publications'],
    filename: 'funding_vs_publications',
  },
  enrolment: {
    option: 'Enrolment vs placement',
    title: 'Enrolment vs placement',
    subtitle: 'Student intake (Academic) against placement rate (Placement)',
    to: SOURCE_ROUTES.placement,
    barKey: 'intake',
    barName: 'Student intake',
    barFormat: (v) => fmtInt(v),
    lineKey: 'placementPct',
    lineName: 'Placement %',
    lineFormat: (v) => `${fmtNum(v, 0)}%`,
    headers: ['Academic year', 'Student intake', 'Placement %'],
    filename: 'enrolment_vs_placement',
  },
};

export default function QuickGlance() {
  const [pickedYear, setPickedYear] = useState(null);
  const [comboView, setComboView] = useState('funding');
  const { status, partial, year, years, data } = useInstitutePulse(pickedYear);

  const loading = status === 'loading';
  const view = COMBO_VIEWS[comboView];
  const yearOptions = useMemo(() => years.map((y) => ({ value: y, label: ayLabel(y) })), [years]);

  const combo = data?.combos[comboView];
  const genderRows = data?.gender ?? [];
  const topGender = genderRows.reduce(
    (best, r) => (typeof r.value === 'number' && (best === null || r.value > best.value) ? r : best),
    null
  );

  return (
    <div className="qg">
      {/* Row 1 — title + academic year */}
      <header className="qg-head">
        <div>
          <p className="ds-label qg-eyebrow">Quick Glance</p>
          <h1 className="qg-title">Institute Pulse</h1>
        </div>
        <div className="qg-year">
          <span className="ds-label">Academic year</span>
          {yearOptions.length > 0 && (
            <SegmentedControl label="Academic year" options={yearOptions} value={year} onChange={setPickedYear} />
          )}
        </div>
      </header>

      {status === 'error' && (
        <p className="qg-note qg-note--danger" role="alert">
          Data could not be loaded at the moment. Please try again later.
        </p>
      )}
      {partial && status === 'ready' && (
        <p className="qg-note" role="status">
          Some sources are currently unavailable; affected widgets show no information.
        </p>
      )}

      {/* Row 2 — gauges */}
      <section className="qg-gauges" aria-label="Headline indicators">
        <ChartCard
          title="Placement rate"
          to={SOURCE_ROUTES.placement}
          compact
          expandable={false}
          loading={loading}
          empty={!loading && data?.gauges.placement.value == null}
        >
          {() => (
            <GaugeChart
              label="Placed / registered"
              value={data.gauges.placement.value}
              min={0}
              max={100}
              bands={GAUGE_BANDS.placement}
              format={(v) => `${fmtNum(v, 1)}%`}
              delta={data.gauges.placement.delta}
              deltaUnit="pp"
              deltaLabel="vs previous year"
              sub={data.gauges.placement.sub}
            />
          )}
        </ChartCard>

        <ChartCard
          title="NIRF engineering rank"
          to={SOURCE_ROUTES.nirf}
          compact
          expandable={false}
          loading={loading}
          empty={!loading && data?.gauges.nirf.value == null}
        >
          {() => (
            <GaugeChart
              label="Rank (lower is better)"
              value={data.gauges.nirf.value}
              min={NIRF_RANK_RANGE.min}
              max={NIRF_RANK_RANGE.max}
              invert
              bands={GAUGE_BANDS.nirf}
              format={(v) => `#${fmtInt(v)}`}
              delta={data.gauges.nirf.delta}
              deltaUnit=" places"
              deltaLabel="vs previous edition"
              sub={data.gauges.nirf.sub}
            />
          )}
        </ChartCard>
      </section>

      {/* Row 3 — KPI cards */}
      <section className="qg-kpis" aria-label="Key figures">
        {(data?.kpis ?? Array.from({ length: 6 }, (_, i) => ({ key: i }))).map((k) => (
          <KpiSparkCard
            key={k.key}
            label={k.label ?? ' '}
            value={k.value}
            delta={k.delta}
            deltaLabel={k.deltaLabel}
            invert={k.invert}
            series={k.series}
            sub={k.sub}
            to={k.to}
            loading={loading}
          />
        ))}
      </section>

      {/* Row 4 — combo (2/3) + pillar radar (1/3) */}
      <section className="qg-split" aria-label="Cross-section analysis">
        <ChartCard
          title={view.title}
          subtitle={view.subtitle}
          to={view.to}
          loading={loading}
          empty={!loading && !combo?.hasData}
          height={300}
          actions={
            <SegmentedControl
              label="Combined chart view"
              options={Object.entries(COMBO_VIEWS).map(([value, v]) => ({ value, label: v.option }))}
              value={comboView}
              onChange={setComboView}
            />
          }
          exportData={
            combo && {
              data: combo.rows,
              headers: view.headers,
              keys: ['label', view.barKey, view.lineKey],
              filename: view.filename,
            }
          }
          footer={combo?.insight}
        >
          {({ chartIsMobile, height }) => (
            <ComboChart
              data={combo.rows}
              barKey={view.barKey}
              lineKey={view.lineKey}
              barName={view.barName}
              lineName={view.lineName}
              barFormat={view.barFormat}
              lineFormat={view.lineFormat}
              selectedYear={year}
              dualAxis
              isMobile={chartIsMobile}
              height={height}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Pillar index"
          subtitle="Six pillars, scored 0–100 against the last seven years"
          to={SOURCE_ROUTES.pillars}
          loading={loading}
          empty={!loading && !data?.pillars.current.some((p) => p.value !== null)}
          height={300}
          footer="Each pillar averages its key metrics, scaled between the lowest (0) and highest (100) value of the last seven years. The index is relative to the institute’s own history, not a benchmark."
        >
          {({ height }) => (
            <PillarRadar
              current={data.pillars.current}
              previous={data.pillars.previous}
              currentLabel={data.ay}
              previousLabel={ayLabel(year - 1)}
              height={height}
            />
          )}
        </ChartCard>
      </section>

      {/* Row 5 — funnel | donut | female share */}
      <section className="qg-trio" aria-label="Placement, alumni and gender">
        <ChartCard
          title="Placement funnel"
          subtitle={data ? `Academic year ${data.ay}` : undefined}
          to={SOURCE_ROUTES.placement}
          loading={loading}
          empty={!loading && data?.placement.registered == null}
          expandable={false}
        >
          {() => (
            <FunnelBars
              stages={[
                { label: 'Registered', value: data.placement.registered },
                { label: 'Placed', value: data.placement.placed },
              ]}
              chips={[
                { label: 'Companies', value: data.placement.companies },
                { label: 'Offers', value: data.placement.offers },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Alumni outcomes"
          subtitle={data ? `Graduating class of ${data.alumni.year}` : undefined}
          to={SOURCE_ROUTES.alumni}
          loading={loading}
          empty={!loading && !(data?.alumni.slices.length > 0)}
          expandable={false}
          exportData={
            data && {
              data: data.alumni.slices,
              headers: ['Outcome', 'Alumni'],
              keys: ['name', 'value'],
              filename: 'alumni_outcomes',
            }
          }
        >
          {() => (
            <DonutChart data={data.alumni.slices} centerLabel={fmtInt(data.alumni.total)} centerSub="Alumni" />
          )}
        </ChartCard>

        <ChartCard
          title="Female share"
          subtitle={data ? `Intake ${data.ay} · faculty at year end` : undefined}
          to={SOURCE_ROUTES.students}
          loading={loading}
          empty={!loading && !genderRows.some((r) => typeof r.value === 'number')}
          expandable={false}
          exportData={
            data && {
              data: genderRows,
              headers: ['Group', 'Female share (%)'],
              keys: ['label', 'value'],
              filename: 'female_share',
            }
          }
        >
          {() => (
            <div className="qg-bars">
              {genderRows.map((r) => (
                <ProgressRow key={r.key} label={r.label} value={r.value} highlight={topGender?.key === r.key} />
              ))}
            </div>
          )}
        </ChartCard>
      </section>

      {/* Row 6 — publications by department */}
      <section aria-label="Publications by department">
        <ChartCard
          title="Publications by department"
          subtitle={data ? `Calendar year ${data.year} · seven-year trend per department` : undefined}
          to={SOURCE_ROUTES.publications}
          loading={loading}
          empty={!loading && !(data?.pubDepts.length > 0)}
          expandable={false}
          exportData={
            data && {
              data: data.pubDepts,
              headers: ['Department', 'Publications', 'YoY change (%)'],
              keys: ['label', 'value', 'delta'],
              filename: 'publications_by_department',
            }
          }
        >
          {() => <RankedBars rows={data.pubDepts} />}
        </ChartCard>
      </section>
    </div>
  );
}
