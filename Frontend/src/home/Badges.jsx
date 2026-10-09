import { useLastUpdated } from '../hooks/useLastUpdated';
import { PAGE_TABLES, timeAgo } from './pageSearch';
import { normalizePath } from './exploreMap';

const NONE = [];

/** "Updated 3 days ago" — newest change across the tables behind a page. Renders nothing if unknown. */
export function FreshnessBadge({ path, className = '' }) {
  const iso = useLastUpdated(PAGE_TABLES[normalizePath(path)] ?? NONE);
  const ago = iso ? timeAgo(iso) : null;
  if (!ago) return null;
  return <span className={`badge badge--fresh ${className}`}>Updated {ago}</span>;
}

/** Small pill, e.g. "NIRF #62" or "Popular". */
export function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
