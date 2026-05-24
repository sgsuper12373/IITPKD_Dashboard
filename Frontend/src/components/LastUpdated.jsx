import { useLastUpdated } from '../hooks/useLastUpdated';
import './LastUpdated.css';

/**
 * Subtle "Updated DD Mon YYYY" label.
 * Pass the table names whose data is shown nearby.
 *
 * Usage:
 *   <LastUpdated tables={['research_patents', 'research_mous']} />
 */
function LastUpdated({ tables }) {
  const ts = useLastUpdated(tables);
  if (!ts) return null;

  const label = new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <span className="last-updated" title={`Data last modified: ${new Date(ts).toLocaleString('en-IN')}`}>
      Updated {label}
    </span>
  );
}

export default LastUpdated;
