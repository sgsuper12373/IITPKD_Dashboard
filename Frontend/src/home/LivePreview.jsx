import { Link } from 'react-router-dom';
import { KpiSparkCard } from '../charts';
import './LivePreview.css';

const PREVIEW_KEYS = ['students', 'faculty', 'publications', 'funding'];

/**
 * Four live headline figures with sparklines. Every card (and the link) leads
 * to the full Quick Glance page. Renders nothing if all data sources fail.
 */
export default function LivePreview({ status, data }) {
  if (status === 'error') return null;

  const loading = status === 'loading';
  const kpis = loading
    ? PREVIEW_KEYS.map((key) => ({ key }))
    : PREVIEW_KEYS.map((key) => data?.kpis.find((k) => k.key === key)).filter(Boolean);

  return (
    <section className="lp" aria-label="Live headline figures" data-tour="preview">
      <header className="lp__head">
        <h2 className="lp__title">The Institute right now</h2>
        <Link to="/quick-glance" className="lp__more">
          Open Quick Glance <span aria-hidden="true">→</span>
        </Link>
      </header>
      <div className="lp__grid">
        {kpis.map((k) => (
          <KpiSparkCard
            key={k.key}
            label={k.label ?? ' '}
            value={k.value}
            delta={k.delta}
            deltaLabel={k.deltaLabel}
            invert={k.invert}
            series={k.series}
            sub={k.sub}
            to="/quick-glance"
            loading={loading}
          />
        ))}
      </div>
    </section>
  );
}
