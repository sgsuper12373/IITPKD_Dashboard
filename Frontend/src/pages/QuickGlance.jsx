import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SettingOutlined, CloseOutlined } from '@ant-design/icons';
import {
  ChartCard,
  ComboChart,
  DonutChart,
  FunnelBars,
  PillarRadar,
  ProgressRow,
  RankedBars,
  VuMeter,
} from '../charts';
import { isFiniteNumber } from '../charts/format';
import { useInstitutePulse } from '../hooks/useInstitutePulse';
import { useGlanceWidgets } from '../hooks/useGlanceWidgets';
import { ayLabel } from '../utils/pulseModel';
import { DATA_KEYS } from '../utils/widgetCatalog';
import './QuickGlance.css';

const KPI_BANDS = [0.4, 0.7];

function niceMax(raw, series) {
  const nums = (series || []).filter(Number.isFinite);
  if (Number.isFinite(raw)) nums.push(raw);
  if (!nums.length) return 100;
  const m = Math.max(...nums);
  if (m <= 0) return 10;
  const t = m * 1.4;
  const mag = Math.pow(10, Math.floor(Math.log10(t)));
  return Math.ceil(t / mag) * mag;
}

const WidgetEditor = lazy(() => import('./WidgetEditor'));

/* ── Individual widget renderer ── */

function WidgetRenderer({ widget, data, year, loading }) {
  const { widget_type: type, data_key: dataKey, title } = widget;
  const def = DATA_KEYS[dataKey];
  if (!def && !loading) return null;

  const props = data && def ? def.extract(data, year, data.ay, ayLabel(year - 1), type) : {};

  switch (type) {
    case 'gauge': {
      const empty = !loading && props.value == null;
      return (
        <ChartCard title={title} to={props.to} compact expandable={false} loading={loading} empty={empty}>
          {() => <VuMeter {...props} />}
        </ChartCard>
      );
    }

    case 'kpi': {
      const raw = props.raw;
      const gaugeMax = niceMax(raw, props.series);
      const empty = !loading && !isFiniteNumber(raw);
      return (
        <ChartCard
          title={props.label ?? title}
          to={props.to}
          compact
          expandable={false}
          loading={loading}
          empty={empty}
        >
          {() => (
            <VuMeter
              value={raw}
              display={props.value}
              min={0}
              max={gaugeMax}
              bands={KPI_BANDS}
              sub={props.sub}
              delta={props.delta}
              deltaLabel={props.deltaLabel}
              invert={props.invert}
            />
          )}
        </ChartCard>
      );
    }

    case 'combo': {
      const { view, combo } = props;
      if (!view) return null;
      const empty = !loading && !combo?.hasData;
      return (
        <ChartCard
          title={title || view.title}
          subtitle={view.subtitle}
          to={view.to}
          loading={loading}
          empty={empty}
          height={300}
          footer={combo?.insight}
        >
          {({ chartIsMobile, height }) => (
            <ComboChart
              data={combo?.rows ?? []}
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
      );
    }

    case 'radar': {
      const empty = !loading && !props.current?.some((p) => p.value !== null);
      return (
        <ChartCard
          title={title}
          subtitle="Six pillars, scored 0–100 against the last seven years"
          loading={loading}
          empty={empty}
          height={300}
          footer="Each pillar averages its key metrics, scaled between the lowest (0) and highest (100) value of the last seven years."
        >
          {({ height }) => (
            <PillarRadar
              current={props.current ?? []}
              previous={props.previous ?? []}
              currentLabel={props.currentLabel}
              previousLabel={props.previousLabel}
              height={height}
            />
          )}
        </ChartCard>
      );
    }

    case 'funnel': {
      const empty = !loading && props.stages?.[0]?.value == null;
      return (
        <ChartCard title={title} subtitle={props.subtitle} to={props.to} loading={loading} empty={empty} expandable={false}>
          {() => <FunnelBars stages={props.stages ?? []} chips={props.chips ?? []} />}
        </ChartCard>
      );
    }

    case 'donut':
      return (
        <ChartCard title={title} subtitle={props.subtitle} to={props.to} loading={loading} empty={props.empty} expandable={false}>
          {() => <DonutChart data={props.data ?? []} centerLabel={props.centerLabel} centerSub={props.centerSub} />}
        </ChartCard>
      );

    case 'progress': {
      const rows = props.rows ?? [];
      const empty = !loading && !rows.some((r) => typeof r.value === 'number');
      return (
        <ChartCard title={title} subtitle={props.subtitle} to={props.to} loading={loading} empty={empty} expandable={false}>
          {() => (
            <div className="qg-bars">
              {rows.map((r) => (
                <ProgressRow key={r.key} label={r.label} value={r.value} highlight={props.topKey === r.key} />
              ))}
            </div>
          )}
        </ChartCard>
      );
    }

    case 'ranked': {
      const rows = props.rows ?? [];
      const empty = !loading && rows.length === 0;
      return (
        <ChartCard title={title} subtitle={props.subtitle} to={props.to} loading={loading} empty={empty} expandable={false}>
          {() => <RankedBars rows={rows} />}
        </ChartCard>
      );
    }

    default:
      return null;
  }
}

/* ── Paginate widgets into slides (max 3 column-units per slide) ── */

const SIZE_UNITS = { sm: 1, md: 2, lg: 3 };

function paginateWidgets(widgets) {
  const pages = [];
  let page = [];
  let units = 0;
  for (const w of widgets) {
    const u = SIZE_UNITS[w.size] ?? 1;
    if (units + u > 3 && page.length > 0) {
      pages.push(page);
      page = [];
      units = 0;
    }
    page.push(w);
    units += u;
  }
  if (page.length > 0) pages.push(page);
  return pages;
}

const SLIDE_MS = 6000;

/* ── Main page ── */

export default function QuickGlance({ user }) {
  const { status, partial, year, data } = useInstitutePulse(null);
  const { widgets, loading: widgetsLoading, addWidget, updateWidget, deleteWidget, reorder } = useGlanceWidgets();

  const loading = status === 'loading';
  const isAdmin = user?.role_id === 3;

  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const pages = useMemo(() => paginateWidgets(widgets ?? []), [widgets]);
  const totalPages = pages.length;

  const safePage = page >= totalPages ? 0 : page;

  const goTo = useCallback((p) => setPage(p), []);
  const prev = useCallback(() => setPage((p) => (p <= 0 ? totalPages - 1 : p - 1)), [totalPages]);
  const next = useCallback(() => setPage((p) => (p >= totalPages - 1 ? 0 : p + 1)), [totalPages]);

  useEffect(() => {
    if (totalPages <= 1 || paused) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    timerRef.current = setInterval(() => setPage((p) => (p >= totalPages - 1 ? 0 : p + 1)), SLIDE_MS);
    return () => clearInterval(timerRef.current);
  }, [totalPages, paused]);

  return (
    <div className="qg">
      <header className="qg-head">
        <div>
          <h1 className="qg-title">Quick Glance</h1>
        </div>
        <div className="qg-head-actions">
          {isAdmin && (
            <button type="button" className="qg-edit-btn" onClick={() => setEditing((e) => !e)}>
              {editing ? <><CloseOutlined /> Done</> : <><SettingOutlined /> Edit layout</>}
            </button>
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

      {editing && (
        <Suspense fallback={<p className="qg-note">Loading editor…</p>}>
          <WidgetEditor
            widgets={widgets ?? []}
            onAdd={addWidget}
            onUpdate={updateWidget}
            onDelete={deleteWidget}
            onReorder={reorder}
          />
        </Suspense>
      )}

      {widgetsLoading && <p className="qg-note" role="status">Loading layout…</p>}

      {!widgetsLoading && pages.length > 0 && (
        <div
          className="qg-slider"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <section className="qg-grid" aria-label="Dashboard widgets">
            {pages[safePage].map((w) => (
              <div key={w.id} className={`qg-cell qg-cell--${w.size}`}>
                <WidgetRenderer widget={w} data={data} year={year} loading={loading} />
              </div>
            ))}
          </section>

          {totalPages > 1 && (
            <nav className="qg-slider-nav" aria-label="Widget pages">
              <button type="button" className="qg-slider-arrow" onClick={prev} aria-label="Previous page">&lsaquo;</button>
              <div className="qg-slider-dots">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`qg-slider-dot${i === safePage ? ' is-active' : ''}`}
                    onClick={() => goTo(i)}
                    aria-label={`Page ${i + 1}`}
                    aria-current={i === safePage ? 'true' : undefined}
                  />
                ))}
              </div>
              <button type="button" className="qg-slider-arrow" onClick={next} aria-label="Next page">&rsaquo;</button>
            </nav>
          )}
        </div>
      )}

      {!widgetsLoading && widgets && widgets.length === 0 && (
        <p className="qg-note" role="status">
          No widgets configured.{isAdmin ? ' Click "Edit layout" to add widgets.' : ''}
        </p>
      )}
    </div>
  );
}
