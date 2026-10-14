import { lazy, Suspense, useMemo, useState } from 'react';
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
} from '../charts';
import { useInstitutePulse } from '../hooks/useInstitutePulse';
import { useGlanceWidgets } from '../hooks/useGlanceWidgets';
import { ayLabel } from '../utils/pulseModel';
import { DATA_KEYS } from '../utils/widgetCatalog';
import './QuickGlance.css';

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
          {() => <GaugeChart {...props} />}
        </ChartCard>
      );
    }

    case 'kpi':
      return (
        <KpiSparkCard
          label={props.label ?? title}
          value={props.value}
          delta={props.delta}
          deltaLabel={props.deltaLabel}
          invert={props.invert}
          series={props.series}
          sub={props.sub}
          to={props.to}
          loading={loading}
        />
      );

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

/* ── Main page ── */

export default function QuickGlance({ user }) {
  const [pickedYear, setPickedYear] = useState(null);
  const { status, partial, year, years, data } = useInstitutePulse(pickedYear);
  const { widgets, loading: widgetsLoading, addWidget, updateWidget, deleteWidget, reorder } = useGlanceWidgets();

  const loading = status === 'loading';
  const yearOptions = useMemo(() => years.map((y) => ({ value: y, label: ayLabel(y) })), [years]);
  const isAdmin = user?.role_id === 3;

  const [editing, setEditing] = useState(false);

  return (
    <div className="qg">
      <header className="qg-head">
        <div>
          <h1 className="qg-title">Quick Glance</h1>
        </div>
        <div className="qg-head-actions">
          {isAdmin && (
            <button type="button" className="qg-edit-btn" onClick={() => setEditing((e) => !e)}>
              {editing ? '✕ Done' : '⚙ Edit layout'}
            </button>
          )}
          <div className="qg-year">
            <span className="ds-label">Academic year</span>
            {yearOptions.length > 0 && (
              <SegmentedControl label="Academic year" options={yearOptions} value={year} onChange={setPickedYear} />
            )}
          </div>
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

      {!widgetsLoading && widgets && widgets.length > 0 && (
        <section className="qg-grid" aria-label="Dashboard widgets">
          {widgets.map((w) => (
            <div key={w.id} className={`qg-cell qg-cell--${w.size}`}>
              <WidgetRenderer widget={w} data={data} year={year} loading={loading} />
            </div>
          ))}
        </section>
      )}

      {!widgetsLoading && widgets && widgets.length === 0 && (
        <p className="qg-note" role="status">
          No widgets configured.{isAdmin ? ' Click "Edit layout" to add widgets.' : ''}
        </p>
      )}
    </div>
  );
}
