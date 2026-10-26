import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import {
  fetchHomeGroundSummary,
  fetchHomeGroundStartups,
  fetchHomeGroundFilterOptions
} from '../services/homeGroundStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import './Page.css';
import './PeopleCampus.css';
import '../DesignSystem.css';
import './HomeGroundStartup.css';
import ExportMenu from './ExportMenu';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCompactCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  if (value >= 10000000) return '₹' + (value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  if (value >= 100000) return '₹' + (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  return '₹' + formatNumber(value);
};

const CONTENT_HEIGHT = 480;

const STYLE_ID = 'home-ground-styles';
const TRANSITION_STYLE = `
  @keyframes hg-fade-in {
    from { opacity: 0; transform: translateY(8px) scale(0.995); }
    to   { opacity: 1; transform: translateY(0)   scale(1);     }
  }
  .hg-anim {
    animation: hg-fade-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .hg-summary-card {
    border-radius: 20px;
    padding: 24px;
    color: white;
    transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s cubic-bezier(0.22,1,0.36,1);
    user-select: none;
  }
  .hg-summary-card:hover  { transform: translateY(-4px) scale(1.02); }
  .hg-summary-card:active { transform: scale(0.97); }
  /* hg-mode-btn styles moved to HomeGroundStartup.css */
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = TRANSITION_STYLE;
  document.head.appendChild(s);
}

const CHART_COLOR = '#087E8B';

/* ═══════════════════════════════════════════════════════════════════════════ */
function HomeGroundStartup({ user, isPublicView = false }) {
  const isRestricted = !user || user?.role_id === 0;
  injectStyle();

  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const [chartMode, setChartMode] = useState('bar');
  const [animKey, setAnimKey] = useState(0);
  const bump = useCallback(() => setAnimKey(k => k + 1), []);

  const [summary, setSummary] = useState({
    total_startups: 0,
    total_revenue: 0,
    highest_revenue: 0,
    average_revenue: 0,
    total_jobs: 0
  });

  const [startupsTrend, setStartupsTrend] = useState([]);
  const [startupsTable, setStartupsTable] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ domains: [], statuses: [] });
  const [filters, setFilters] = useState({ domain: 'All', status: 'All' });
  const [loadingStartups, setLoadingStartups] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumData, filterOps] = await Promise.all([
          fetchHomeGroundSummary(token),
          fetchHomeGroundFilterOptions(token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      }
    };
    load();
  }, [token, uploadVersion]);

  useEffect(() => {
    let active = true;
    setLoadingStartups(true);
    fetchHomeGroundStartups(filters, token)
      .then(r => {
        if (active && r) {
          setStartupsTrend(r.trend || []);
          setStartupsTable(r.data || []);
        }
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoadingStartups(false); });
    return () => { active = false; };
  }, [token, filters, uploadVersion]);

  const switchMode = (mode) => { setChartMode(mode); bump(); };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="hg-tooltip">
          <p className="hg-tooltip-label">Year: {label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="hg-tooltip-entry" style={{ color: entry.color }}>{entry.name}: {formatNumber(entry.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = (data) => (
    <div className="hg-chart-wrapper">
      {data.length === 0 && (
        <div className="hg-no-data-overlay">
          <DashboardIcon name="chart" className="hg-no-data-icon" />
          <p className="hg-no-data-text">No data available for the selected filters.</p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={CONTENT_HEIGHT} minWidth={0}>
        {chartMode === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="count" name="Startups Count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} barSize={28}>
              <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: CHART_COLOR }} />
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
            <YAxis stroke="#666" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="linear" dataKey="count" name="Startups Count" stroke={CHART_COLOR} strokeWidth={3} dot={{ r: 6, fill: CHART_COLOR, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }}>
              <LabelList offset={10} dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: CHART_COLOR }} />
            </Line>
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  const renderTable = () => {
    if (!startupsTable.length && !loadingStartups) {
      return (
        <div className="hg-table-empty">
          <DashboardIcon name="folder" className="hg-table-empty-icon" />
          <p className="hg-table-empty-text">No data available for the selected filters.</p>
        </div>
      );
    }
    return (
      <div className="hg-table-shell">
        <div className="hg-table-head">
          <div className="hg-col-1">Startup Name</div>
          <div className="hg-col-2">Domain</div>
          <div className="hg-col-3">Status</div>
          <div className="hg-col-4">Jobs</div>
          <div className="hg-col-5">Revenue (₹)</div>
        </div>
        <div className="hg-table-body">
          {startupsTable.map((row, idx) => (
            <div key={idx} className="hg-table-row" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <div className="hg-col-1 hg-td-name">{row.startup_name}</div>
              <div className="hg-col-2">{row.domain}</div>
              <div className="hg-col-3">
                <span className={`hg-status-badge ${row.status === 'Active' ? 'hg-status--active' : 'hg-status--inactive'}`}>{row.status}</span>
              </div>
              <div className="hg-col-4">{row.number_of_jobs || '0'}</div>
              <div className="hg-col-5">{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportData = chartMode === 'table' ? startupsTable : startupsTrend;
  const exportId = 'hg-chart-container';

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            &#8592; Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <h1 className="hg-page-h1">Home Grown Startups</h1>
        <p className="hg-page-sub">
          Internal startups incubated through IPTIF and TECHIN programs
        </p>

        {error && <div className="hg-error">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['iptif_startup_table', 'techin_startup_table']} />
          <ShareButton />
        </div>

        {/* ── Summary Cards ── */}
        <div className="hg-export-row">
          <ExportMenu
            elementId="hg-summary-cards-container"
            data={[summary]}
            headers={['Total Startups', 'Total Jobs']}
            keys={['total_startups', 'total_jobs']}
            filename="home_ground_summary"
            title="Home Ground Startups Summary"
          />
        </div>

        <div id="hg-summary-cards-container" className="hg-cards-row">
          {[
            {
              bg: 'linear-gradient(135deg, #087E8B 0%, #066A75 100%)',
              shadow: '0 10px 20px rgba(8, 126, 139,0.2)',
              label: 'Total Startups',
              value: formatNumber(summary.total_startups),
              sub: 'Internal origin (IPTIF + TECHIN)'
            },
            {
              bg: 'linear-gradient(135deg, #087E8B 0%, #066A75 100%)',
              shadow: '0 10px 20px rgba(14,165,233,0.2)',
              label: 'Total Jobs Created',
              value: formatNumber(summary.total_jobs),
              sub: 'Across all internal startups'
            },
          ].map(({ bg, shadow, label, value, sub }) => (
            <div key={label} className="hg-summary-card" style={{ background: bg, boxShadow: shadow }}>
              <h3 className="hg-summary-card-h3">{label}</h3>
              <div className="metric-value">{value}</div>
              <div className="hg-summary-card-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Revenue Cards ── */}
        { !isRestricted && (
          <>
            <div className="hg-revenue-header">
              <h3 className="hg-revenue-h3">Revenue Metrics</h3>
              <ExportMenu
                elementId="hg-revenue-container"
                data={[summary]}
                headers={['Total Revenue', 'Highest Revenue', 'Average Revenue']}
                keys={['total_revenue', 'highest_revenue', 'average_revenue']}
                filename="home_ground_revenue"
                title="Home Ground Revenue Metrics"
              />
            </div>

            <div id="hg-revenue-container" className="hg-revenue-cards">
              {[
                { bg: 'linear-gradient(135deg, #142D4E 0%, #066A75 100%)', shadow: '0 8px 20px rgba(6, 106, 117,0.2)', label: 'Total Revenue', value: summary.total_revenue },
                { bg: 'linear-gradient(135deg, #16A34A 0%, #15803d 100%)', shadow: '0 8px 20px rgba(22,163,74,0.2)', label: 'Highest Revenue', value: summary.highest_revenue },
                { bg: 'linear-gradient(135deg, #066A75 0%, #142D4E 100%)', shadow: '0 8px 20px rgba(8, 126, 139,0.2)', label: 'Average Revenue', value: summary.average_revenue }
              ].map(({ bg, shadow, label, value }) => (
                <div key={label} className="hg-revenue-card" style={{ background: bg, boxShadow: shadow }}>
                  <div className="hg-revenue-card-decor" />
                  <div className="hg-revenue-card-inner">
                    <div className="hg-revenue-card-label">{label}</div>
                    <div className="metric-value-sm" title={`₹${formatNumber(value)}`}>{formatCompactCurrency(value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════ STARTUP GROWTH PANEL ══════════════ */}
        <div className="hg-panel">

          <div className="cc-header">
            <div className="cc-header__tabs">
              {['bar', 'trend', 'table']
                .filter(mode => !isRestricted || mode !== 'table')
                .map(mode => {
                  const label = mode === 'bar' ? 'Bar' : mode === 'trend' ? 'Trend' : 'Table';
                  return (
                    <button
                      key={mode}
                      className={`cc-tab${chartMode === mode ? ' cc-tab--active' : ''}`}
                      onClick={() => switchMode(mode)}
                    >
                      {label}
                    </button>
                  );
                })}
            </div>
            <div className="cc-header__filters">
              <div className="cc-filter-pair">
                <span className="cc-filter-label">Domain</span>
                <select
                  value={filters.domain}
                  onChange={e => setFilters(prev => ({ ...prev, domain: e.target.value }))}
                  className="cc-filter-select"
                >
                  <option value="All">All Domains</option>
                  {filterOptions.domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="cc-filter-pair">
                <span className="cc-filter-label">Status</span>
                <select
                  value={filters.status}
                  onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="cc-filter-select"
                >
                  <option value="All">All Statuses</option>
                  {filterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="cc-subheader">
            <h2 className="cc-title">
              <DashboardIcon name="home" className="cc-title-icon" />
              Startup Growth
              <span style={{ fontSize: 11, fontWeight: 400, color: '#8A8A84', marginLeft: 4 }}>Yearly growth across IPTIF &amp; TECHIN</span>
            </h2>
            <div className="cc-subheader__right">
              <ExportMenu
                elementId={exportId}
                data={exportData}
                headers={chartMode === 'table'
                  ? ['Startup Name', 'Domain', 'Status', 'Jobs', 'Revenue']
                  : ['Year', 'Count']}
                keys={chartMode === 'table'
                  ? ['startup_name', 'domain', 'status', 'number_of_jobs', 'revenue']
                  : ['year', 'count']}
                filename={`home_ground_startups_${chartMode}`}
                title={`Startup Growth — ${chartMode === 'table' ? 'Directory' : chartMode === 'bar' ? 'Bar Chart' : 'Trend'}`}
              />
            </div>
          </div>

          <div key={animKey} className="hg-anim" id={exportId}>
            {(chartMode === 'table' && !isRestricted) ? renderTable() : renderChart(startupsTrend)}
          </div>

        </div>

      </div>
    </div>
  );
}

export default HomeGroundStartup;
