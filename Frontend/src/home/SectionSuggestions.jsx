import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartCard, ComboChart, KpiSparkCard, SegmentedControl } from '../charts';
import { useInstitutePulse } from '../hooks/useInstitutePulse';
import { COMBO_VIEWS, isComboKey } from '../utils/comboViews';
import { KPI_PUBLIC_PATH, pageFor } from './exploreMap';
import { SUGGESTIONS } from './suggestions';
import { FreshnessBadge } from './Badges';
import './SectionSuggestions.css';

/**
 * "Where to next?" panel shown under an opened section card: live related trends,
 * suggested chart combinations (switchable, with a plain-language insight), the sibling
 * sections of the same page, and related pages. Everything links to static public routes.
 *
 * props: pillar (page key), sectionId, siblings [{id,title,icon}], onOpen(id)
 */
export default function SectionSuggestions({ pillar, sectionId, siblings = [], onOpen }) {
  const cfg = SUGGESTIONS[`${pillar}/${sectionId}`];
  const { status, year, data } = useInstitutePulse(null);
  const comboKeys = (cfg?.combos ?? []).filter(isComboKey);
  const [picked, setPicked] = useState(null);

  if (!cfg) return null;

  const loading = status === 'loading';
  const comboKey = comboKeys.includes(picked) ? picked : comboKeys[0];
  const view = comboKey ? COMBO_VIEWS[comboKey] : null;
  const combo = comboKey ? data?.combos?.[comboKey] : null;
  const trends = cfg.trends.map((key) => data?.kpis?.find((k) => k.key === key)).filter(Boolean);
  const pages = cfg.pages.map(pageFor).filter(Boolean);
  const showTrends = loading ? cfg.trends.length > 0 : trends.length > 0;
  const showCombo = view && status !== 'error' && (loading || combo?.hasData);

  if (!showTrends && !showCombo && siblings.length === 0 && pages.length === 0) return null;

  return (
    <aside className="sg" aria-labelledby={`sg-${pillar}-${sectionId}`}>
      <h2 id={`sg-${pillar}-${sectionId}`} className="sg__title">Where to next?</h2>

      {showTrends && (
        <section className="sg__block" aria-label="Related trends">
          <h3 className="sg__h3">Related trends</h3>
          <div className="sg__grid">
            {(loading ? cfg.trends.map((key) => ({ key })) : trends).map((k) => (
              <div key={k.key} data-track="suggest-trend">
                <KpiSparkCard
                  label={k.label ?? ' '}
                  value={k.value}
                  delta={k.delta}
                  deltaLabel={k.deltaLabel}
                  invert={k.invert}
                  series={k.series}
                  sub={k.sub}
                  to={KPI_PUBLIC_PATH[k.key] ?? '/quick-glance'}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {showCombo && (
        <section className="sg__block" aria-label="Suggested combination">
          <h3 className="sg__h3">Try this combination</h3>
          <ChartCard
            title={view.title}
            subtitle={view.subtitle}
            to={`/quick-glance?combo=${comboKey}`}
            loading={loading}
            height={240}
            footer={
              <>
                {combo?.insight}{' '}
                <Link to={`/quick-glance?combo=${comboKey}`} className="sg__more" data-track="suggest-combo-open">
                  Open the full comparison →
                </Link>
              </>
            }
            actions={
              comboKeys.length > 1 ? (
                <div data-track="suggest-combo-switch">
                  <SegmentedControl
                    label="Suggested combinations"
                    options={comboKeys.map((value) => ({ value, label: COMBO_VIEWS[value].option }))}
                    value={comboKey}
                    onChange={setPicked}
                  />
                </div>
              ) : null
            }
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
        </section>
      )}

      {siblings.length > 0 && (
        <section className="sg__block" aria-label="Also in this section">
          <h3 className="sg__h3">Also in this section</h3>
          <ul className="sg__list">
            {siblings.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="sg__card"
                  onClick={() => { onOpen(s.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  data-track="suggest-section"
                >
                  <span className="sg__card-icon" aria-hidden="true">{s.icon}</span>
                  <span className="sg__card-title">{s.title}</span>
                  <span className="sg__card-go" aria-hidden="true">Open →</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pages.length > 0 && (
        <section className="sg__block" aria-label="Related pages">
          <h3 className="sg__h3">Related pages</h3>
          <ul className="sg__list">
            {pages.map((p) => (
              <li key={p.path}>
                <Link to={p.path} className="sg__card" data-track="suggest-page">
                  <span className="sg__card-title">{p.title}</span>
                  <span className="sg__card-blurb">{p.blurb}</span>
                  <FreshnessBadge path={p.path} />
                  <span className="sg__card-go" aria-hidden="true">Explore →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
