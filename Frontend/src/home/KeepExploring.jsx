import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { journeyFor, journeyHref, normalizePath, relatedFor } from './exploreMap';
import './Explore.css';

/** "You might also like" strip shown at the end of every public page. */
export function KeepExploring() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const items = relatedFor(pathname);
  if (pathname === '/' || items.length === 0) return null;

  // Carry an active journey through the strip so the guided path isn't lost.
  const journeyKey = journeyFor(params.get('journey')) ? params.get('journey') : null;

  return (
    <section className="ke" aria-labelledby="ke-title">
      <h2 id="ke-title" className="ke__title">Keep exploring</h2>
      <ul className="ke__grid">
        {items.map((p) => (
          <li key={p.path}>
            <Link to={journeyKey ? journeyHref(journeyKey, p.path) : p.path} className="ke__card">
              <span className="ke__card-title">{p.title}</span>
              <span className="ke__card-blurb">{p.blurb}</span>
              <span className="ke__card-go" aria-hidden="true">Explore →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Progress + back/next controls while a guided journey (?journey=key) is active. */
export function JourneyBar() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const key = params.get('journey');
  const journey = journeyFor(key);
  if (!journey) return null;

  const here = normalizePath(pathname);
  const i = journey.steps.findIndex((s) => s.path === here);
  if (i === -1) return null;

  const prev = journey.steps[i - 1];
  const next = journey.steps[i + 1];

  return (
    <aside className="jb" aria-label={`Guided journey: ${journey.title}`}>
      <div className="jb__info">
        <span className="jb__tag">Step {i + 1} of {journey.steps.length} · {journey.title}</span>
        <span className="jb__why">{journey.steps[i].why}</span>
      </div>
      <div className="jb__actions">
        {prev && <Link className="jb__btn" to={journeyHref(key, prev.path)}>← Back</Link>}
        {next ? (
          <Link className="jb__btn jb__btn--primary" to={journeyHref(key, next.path)}>Next stop →</Link>
        ) : (
          <Link className="jb__btn jb__btn--primary" to="/">Finish</Link>
        )}
        <Link className="jb__btn jb__btn--ghost" to={here}>End journey</Link>
      </div>
    </aside>
  );
}
