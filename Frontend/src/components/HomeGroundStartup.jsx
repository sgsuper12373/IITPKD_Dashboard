import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ExportMenu from './ExportMenu';

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
  .hg-mode-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .hg-mode-btn:hover  { transform: translateY(-1px); }
  .hg-mode-btn:active { transform: translateY(0); }
`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = TRANSITION_STYLE;
  document.head.appendChild(s);
}

const CHART_COLOR = '#f97316';

/* ═══════════════════════════════════════════════════════════════════════════ */
function HomeGroundStartup({ user, isPublicView = false }) {
  const isRestricted = typeof user === 'undefined' || user?.role_id === 0;
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

  /* ── load summary + filter options ── */
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

  /* ── load trend data when filters change ── */
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
        <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>Year: {label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ margin: '0', color: entry.color }}>{entry.name}: {formatNumber(entry.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = (data) => (
    <div style={{ position: 'relative', height: `${CONTENT_HEIGHT}px` }}>
      {data.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
          <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
          <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No data available for the selected filters.</p>
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

  const TableShell = ({ children }) => (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', height: `${CONTENT_HEIGHT}px`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: CHART_COLOR, color: 'white', display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr', gap: '8px', padding: '12px', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
        {children[0]}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {children[1]}
      </div>
    </div>
  );

  const renderTable = () => {
    if (!startupsTable.length && !loadingStartups) {
      return (
        <div style={{ height: `${CONTENT_HEIGHT}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <span style={{ fontSize: '36px', marginBottom: '10px' }}>🗂️</span>
          <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No data available for the selected filters.</p>
        </div>
      );
    }
    return (
      <TableShell>
        {[
          <><div>Startup Name</div><div>Domain</div><div>Status</div><div>Jobs</div><div>Revenue (₹)</div></>,
          <>
            {startupsTable.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                <div style={{ fontWeight: '500' }}>{row.startup_name}</div>
                <div>{row.domain}</div>
                <div>
                  <span style={{ backgroundColor: row.status === 'Active' ? '#dcfce7' : '#fef3c7', color: row.status === 'Active' ? '#166534' : '#92400e', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-block' }}>{row.status}</span>
                </div>
                <div>{row.number_of_jobs || '0'}</div>
                <div>{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>
              </div>
            ))}
          </>
        ]}
      </TableShell>
    );
  };

  const exportData = chartMode === 'table' ? startupsTable : startupsTrend;
  const exportId = 'hg-chart-container';

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>Home Grown Startups</h1>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
          Internal startups incubated through IPTIF and TechIn programs
        </p>

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>
        )}

        {/* ── Summary Cards Row 1: Total Startups + Total Jobs ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <ExportMenu
            elementId="hg-summary-cards-container"
            data={[summary]}
            headers={['Total Startups', 'Total Jobs']}
            keys={['total_startups', 'total_jobs']}
            filename="home_ground_summary"
            title="Home Ground Startups Summary"
          />
        </div>

        <div id="hg-summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {[
            {
              bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              shadow: '0 10px 20px rgba(249,115,22,0.2)',
              label: 'Total Startups',
              value: formatNumber(summary.total_startups),
              sub: 'Internal origin (IPTIF + TechIn)'
            },
            {
              bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              shadow: '0 10px 20px rgba(14,165,233,0.2)',
              label: 'Total Jobs Created',
              value: formatNumber(summary.total_jobs),
              sub: 'Across all internal startups'
            },
          ].map(({ bg, shadow, label, value, sub }) => (
            <div key={label} className="hg-summary-card" style={{ background: bg, boxShadow: shadow }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>{label}</h3>
              <div className="metric-value">{value}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Revenue Cards ── */}
        {(typeof user === 'undefined' || user?.role_id !== 0) && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#333', fontSize: '18px', fontWeight: '600' }}>Revenue Metrics</h3>
              <ExportMenu
                elementId="hg-revenue-container"
                data={[summary]}
                headers={['Total Revenue', 'Highest Revenue', 'Average Revenue']}
                keys={['total_revenue', 'highest_revenue', 'average_revenue']}
                filename="home_ground_revenue"
                title="Home Ground Revenue Metrics"
              />
            </div>

            <div id="hg-revenue-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              {[
                { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: '0 8px 20px rgba(59,130,246,0.2)', label: 'Total Revenue', value: summary.total_revenue },
                { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: '0 8px 20px rgba(16,185,129,0.2)', label: 'Highest Revenue', value: summary.highest_revenue },
                { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: '0 8px 20px rgba(245,158,11,0.2)', label: 'Average Revenue', value: summary.average_revenue }
              ].map(({ bg, shadow, label, value }) => (
                <div key={label} style={{ background: bg, borderRadius: '16px', padding: '24px 16px', boxShadow: shadow, color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>{label}</div>
                    <div className="metric-value-sm" title={`₹${formatNumber(value)}`}>{formatCompactCurrency(value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════ STARTUP GROWTH PANEL ══════════════ */}
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>

          {/* Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: 700 }}>Filters</h4>
            <button
              onClick={() => setFilters({ domain: 'All', status: 'All' })}
              style={{ padding: '5px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              Clear Filters
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Domain</label>
              <select
                value={filters.domain}
                onChange={e => setFilters(prev => ({ ...prev, domain: e.target.value }))}
                style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="All">All Domains</option>
                {filterOptions.domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="All">All Statuses</option>
                {filterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ height: '1px', background: '#e9ecef', margin: '16px 0' }} />

          {/* Chart header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <span style={{ fontSize: '22px' }}>🏠</span>
                Startup Growth
              </h2>
              <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
                Yearly growth of internal-origin startups across IPTIF and TechIn
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {['bar', 'trend', 'table']
                .filter(mode => !isRestricted || mode !== 'table')
                .map(mode => {
                  const active = chartMode === mode;
                  const label = mode === 'bar' ? 'Bar' : mode === 'trend' ? 'Trend' : 'Table';
                  return (
                    <button
                      key={mode}
                      className="hg-mode-btn"
                      onClick={() => switchMode(mode)}
                      style={{
                        backgroundColor: active ? CHART_COLOR : '#e9ecef',
                        color: active ? '#fff' : '#333',
                        boxShadow: active ? `0 4px 10px ${CHART_COLOR}40` : 'none',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
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

          {/* Chart / Table */}
          <div key={animKey} className="hg-anim" id={exportId}>
            {(chartMode === 'table' && !isRestricted) ? renderTable() : renderChart(startupsTrend)}
          </div>

        </div>

      </div>
    </div>
  );
}

export default HomeGroundStartup;
