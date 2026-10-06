import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ChartExpandModal from '../components/ChartExpandModal';
import ExportMenu from '../components/ExportMenu';
import { EMPTY_MESSAGE } from './chartConfig';
import { useChartIsMobile } from './hooks';
import './charts.css';

// Elements inside the card that must keep their own click behaviour instead of
// triggering the whole-card click-through.
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="radio"], [role="tab"], .em-wrapper';

/**
 * Common wrapper for every chart on the dashboard. Owns:
 *   - header (title, subtitle, caller-supplied `actions`)
 *   - ExportMenu (PNG of the body + CSV of `exportData`)
 *   - fullscreen expand modal
 *   - the mobile flag (`chartIsMobile`) handed to the chart
 *   - empty / loading states
 *   - click-through to the source section (`to`, a static internal route)
 *
 * `children` is a render function `({ chartIsMobile, isExpanded, height }) => node`
 * (or a plain node for non-chart content). New cross-cutting chart features
 * belong here, once.
 */
export default function ChartCard({
  title,
  subtitle,
  to,
  actions,
  exportData,
  empty = false,
  loading = false,
  expandable = true,
  compact = false,
  height = 260,
  footer,
  className = '',
  children,
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const navigate = useNavigate();
  const chartIsMobile = useChartIsMobile();
  const [expanded, setExpanded] = useState(false);

  const onCardClick = (e) => {
    if (!to) return;
    // Portalled content (the expand modal) bubbles through React but is not a DOM child.
    if (!e.currentTarget.contains(e.target)) return;
    if (e.target.closest(INTERACTIVE)) return;
    if (window.getSelection && String(window.getSelection()).length > 0) return;
    navigate(to);
  };

  const render = (ctx) => (typeof children === 'function' ? children(ctx) : children);

  let body;
  if (loading) {
    body = <div className="ds-skeleton" style={{ height }} aria-busy="true" aria-label="Loading" />;
  } else if (empty) {
    body = (
      <div className="ds-empty" style={{ minHeight: compact ? undefined : height }}>
        {EMPTY_MESSAGE}
      </div>
    );
  } else {
    body = render({ chartIsMobile, isExpanded: false, height });
  }

  const canExpand = expandable && !empty && !loading;

  return (
    <>
      <section
        className={`ds-card${compact ? ' ds-card--compact' : ''}${to ? ' ds-card--link' : ''} ${className}`.trim()}
        aria-labelledby={titleId}
        onClick={onCardClick}
      >
        <header className="ds-card__head">
          <div className="ds-card__titles">
            <h3 id={titleId} className="ds-card__title">
              {to ? <Link to={to}>{title}</Link> : title}
            </h3>
            {subtitle && <p className="ds-card__sub">{subtitle}</p>}
          </div>
          <div className="ds-card__actions">
            {actions}
            {exportData && !empty && !loading && <ExportMenu elementId={bodyId} {...exportData} />}
            {canExpand && (
              <button
                type="button"
                className="ds-icon-btn"
                aria-label={`Expand ${title}`}
                title="Expand"
                onClick={() => setExpanded(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            )}
          </div>
        </header>
        <div className="ds-card__body" id={bodyId}>{body}</div>
        {footer && !loading && !empty && <footer className="ds-card__foot">{footer}</footer>}
      </section>

      {canExpand && (
        <ChartExpandModal isOpen={expanded} onClose={() => setExpanded(false)} title={title}>
          <div className="ds-expanded">
            {render({ chartIsMobile: false, isExpanded: true, height: '100%' })}
          </div>
        </ChartExpandModal>
      )}
    </>
  );
}
