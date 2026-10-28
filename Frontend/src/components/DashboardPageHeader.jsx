import { ArrowUpRight } from 'lucide-react';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';
import './DashboardPageHeader.css';

export default function DashboardPageHeader({
  title,
  subtitle,
  externalLabel,
  externalUrl,
  tables,
  children,
}) {
  return (
    <header className="dph">
      {title && <h1 className="dph__sr-title">{title}</h1>}

      <div className="dph__primary">
        {subtitle && <p className="dph__subtitle">{subtitle}</p>}
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="visit-ext-btn"
          >
            {externalLabel} <ArrowUpRight size={14} strokeWidth={2} />
          </a>
        )}
      </div>

      <div className="dph__meta">
        {tables?.length > 0 && <LastUpdated tables={tables} />}
        <ShareButton />
      </div>

      {children && <div className="dph__actions">{children}</div>}
    </header>
  );
}
