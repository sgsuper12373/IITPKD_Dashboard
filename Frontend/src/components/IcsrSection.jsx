import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import {
  fetchIcsrSummary,
  fetchIcsrYearlyDistribution,
  fetchIcsrEventTypes,
  fetchIcsrEvents,
  fetchIcsrFilterOptions
} from '../services/industryConnectStats';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import '../DesignSystem.css';

const EVENT_TYPE_COLORS = [
  '#4f46e5', '#22c55e', '#0ea5e9', '#f97316',
  '#a855f7', '#facc15', '#fb7185', '#14b8a6', '#ec4899', '#8b5cf6'
];

// Single source of truth — all three panels share this height
const VIEW_HEIGHT = 560;

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCompactCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  if (value >= 10000000)
    return '₹' + (value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  if (value >= 100000)
    return '₹' + (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  return '₹' + formatNumber(value);
};

// Injected once — all fluid animation rules live here
const GLOBAL_STYLES = `
  .icsr-view-panel {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
    transition: opacity 0.30s cubic-bezier(0.4,0,0.2,1),
                transform 0.30s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }
  .icsr-view-panel.active {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
  .icsr-table-row {
    transition: background-color 0.16s ease;
  }
  .icsr-stat-num {
    transition: color 0.22s ease;
  }
  .icsr-btn-view {
    transition: background-color 0.22s ease, color 0.22s ease,
                border-color 0.22s ease, box-shadow 0.22s ease;
  }
  .icsr-btn-view:hover {
    box-shadow: 0 2px 10px rgba(0,0,0,0.13);
  }
  .icsr-chart-toggle-btn {
    transition: background 0.18s ease, color 0.18s ease;
  }
  .icsr-clear-btn {
    transition: background-color 0.18s ease, opacity 0.18s ease;
  }
  .icsr-active-filter-pill {
    animation: pillIn 0.2s cubic-bezier(0.4,0,0.2,1) both;
  }
  @keyframes pillIn {
    from { opacity: 0; transform: scale(0.80); }
    to   { opacity: 1; transform: scale(1); }
  }
`;

function IcsrSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [summary, setSummary] = useState({ total_events: 0, total_funding: 0 });
  const [yearlyDistribution, setYearlyDistribution] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ event_types: [], departments: [], years: [] });

  const [viewType, setViewType] = useState('yearly');
  const [chartMode, setChartMode] = useState('bar');

  const [filters, setFilters] = useState({ event_type: 'All', department: 'All', year: 'All', search: '' });
  const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, total_pages: 0 });

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeUploadTable] = useState('industry_events');

  /* ── data loaders ───────────────────────────────────────────────── */
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setSummary(await fetchIcsrSummary(filters, token));
    } catch (err) {
      setError(err.message || 'Failed to load summary data');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const loadYearlyDistribution = useCallback(async () => {
    try {
      const r = await fetchIcsrYearlyDistribution(filters, token);
      setYearlyDistribution(r.data || []);
    } catch (err) { console.error(err); }
  }, [token, filters]);

  const loadEventTypes = useCallback(async () => {
    try {
      const r = await fetchIcsrEventTypes(filters, token);
      setEventTypes(r.data || []);
    } catch (err) { console.error(err); }
  }, [token, filters]);

  const loadEvents = useCallback(async () => {
    try {
      const r = await fetchIcsrEvents(filters, pagination.page, pagination.per_page, token);
      setEventsList(r.data || []);
      setPagination(prev => r.pagination || prev);
    } catch (err) { console.error(err); }
  }, [token, filters, pagination.page, pagination.per_page]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const o = await fetchIcsrFilterOptions({ event_type: filters.event_type, year: filters.year }, token);
      setFilterOptions({
        event_types: o?.event_types || [],
        departments: o?.departments || [],
        years: o?.years || []
      });
    } catch (err) { console.error(err); }
  }, [token, filters.event_type, filters.year]);

  const refreshData = () => {
    loadSummary(); loadYearlyDistribution();
    loadEventTypes(); loadEvents(); loadFilterOptions();
  };

  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions, uploadVersion]);
  useEffect(() => { loadSummary(); loadYearlyDistribution(); loadEventTypes(); },
    [loadSummary, loadYearlyDistribution, loadEventTypes, uploadVersion]);
  useEffect(() => { loadEvents(); }, [loadEvents, uploadVersion]);

  /* ── filter handlers ─────────────────────────────────────────────── */
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  const handlePageChange = (newPage) => setPagination(prev => ({ ...prev, page: newPage }));
  const handleClearFilters = () => {
    setFilters({ event_type: 'All', department: 'All', year: 'All', search: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  /* ── derived data ────────────────────────────────────────────────── */
  const yearlyChartData = useMemo(() =>
    yearlyDistribution.map(row => ({ year: row.year, events: row.event_count || 0 })),
    [yearlyDistribution]);

  const eventTypesPieData = useMemo(() => {
    const sorted = [...eventTypes].sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const othersCount = sorted.slice(5).reduce((s, i) => s + (i.count || 0), 0);
    const pie = top5.map(r => ({ name: r.event_type, value: r.count || 0 }));
    if (othersCount > 0) pie.push({ name: 'Others', value: othersCount });
    return pie;
  }, [eventTypes]);


  const hasActiveFilters =
    filters.event_type !== 'All' || filters.year !== 'All' || filters.search !== '';

  const viewButtons = [
    { key: 'yearly', label: '📊 Year-wise Trend', activeColor: '#667eea' },
    { key: 'eventTypes', label: '🥧 Event Type Distribution', activeColor: '#22c55e' },
    { key: 'eventsDirectory', label: '📋 Industry Event Directory', activeColor: '#f97316' },
  ];

  const inputStyle = {
    padding: '6px', fontSize: '13px', width: '100%',
    borderRadius: '4px', border: '1px solid #ced4da', boxSizing: 'border-box'
  };
  const labelStyle = {
    fontSize: '12px', fontWeight: '600', color: '#555',
    display: 'block', marginBottom: '4px'
  };

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className={isPublicView ? '' : 'page-container'}>
        <div className={isPublicView ? '' : 'page-content'}>

          {!isReadOnlyView && (
            <button className="page-back-btn" onClick={() => navigate('/industry-connect')}>
              ← Back to Industry Connect
            </button>
          )}

          {!isReadOnlyView && (
            <div className="page-header-row">
              <div className="page-header-left">
                <h1>ICSR Section - Industry Interaction Events</h1>
              </div>
              {isAdmin && (
                <div className="page-header-actions">
                  <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                    <span>📤</span> Upload Events Data
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* ── Summary Cards ─────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{
              textDecoration: 'underline',
              color: isPublicView ? '#000' : '#fff',
              textShadow: isPublicView
                ? '0 1px 2px rgba(255,255,255,0.6)'
                : '0 2px 6px rgba(0,0,0,0.5)',
              margin: 0, fontSize: '20px'
            }}>
              ICSR Summary
            </h2>
          </div>

          {/* ══════════════════════════════════════════════════════════
               UNIFIED CONTAINER
              ══════════════════════════════════════════════════════════ */}
          <div style={{ backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>

            {/* ── Filter Panel ─────────────────────────────────────── */}
            <div style={{ padding: '14px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>

              {/* Row 1: heading + clear */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#333' }}>Filters</h4>
                <button
                  className="icsr-clear-btn"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters}
                  style={{
                    padding: '5px 14px',
                    backgroundColor: hasActiveFilters ? '#dc3545' : '#adb5bd',
                    color: '#fff', border: 'none', borderRadius: '4px',
                    cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                    fontSize: '12px', fontWeight: '600',
                    opacity: hasActiveFilters ? 1 : 0.6
                  }}
                >
                  ✕ Clear Filters
                </button>
              </div>

              {/* Row 2: view-toggle — always visible */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {viewButtons.map(({ key, label, activeColor }) => (
                  <button
                    key={key}
                    className="icsr-btn-view"
                    onClick={() => setViewType(key)}
                    style={{
                      padding: '7px 16px',
                      backgroundColor: viewType === key ? activeColor : 'transparent',
                      color: viewType === key ? '#fff' : '#555',
                      border: `2px solid ${viewType === key ? activeColor : '#dee2e6'}`,
                      borderRadius: '8px', cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: viewType === key ? '700' : '500',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Row 3: conditional filter fields */}
              {viewType === 'yearly' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <label style={labelStyle}>Event Type</label>
                      <select value={filters.event_type} onChange={e => handleFilterChange('event_type', e.target.value)} style={inputStyle}>
                        <option value="All">All Types</option>
                        {filterOptions.event_types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Year</label>
                      <select value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} style={inputStyle}>
                        <option value="All">All Years</option>
                        {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Search Events</label>
                      <input type="text" placeholder="Search by title, industry partner..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                  {/* Bar / Trend toggle */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['bar', 'trend'].map(mode => (
                      <button key={mode} className="icsr-chart-toggle-btn" onClick={() => setChartMode(mode)}
                        style={{ padding: '5px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', background: chartMode === mode ? '#667eea' : '#e9ecef', color: chartMode === mode ? '#fff' : '#555' }}>
                        {mode === 'bar' ? '▦ Bar' : '📈 Trend'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {viewType === 'eventTypes' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <select value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} style={inputStyle}>
                      <option value="All">All Years</option>
                      {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Search Events</label>
                    <input type="text" placeholder="Search by title, industry partner..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              {viewType === 'eventsDirectory' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Event Type</label>
                    <select value={filters.event_type} onChange={e => handleFilterChange('event_type', e.target.value)} style={inputStyle}>
                      <option value="All">All Types</option>
                      {filterOptions.event_types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Year</label>
                    <select value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} style={inputStyle}>
                      <option value="All">All Years</option>
                      {filterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Search Events</label>
                    <input type="text" placeholder="Search by title, industry partner..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>
            {/* ── END Filter Panel ── */}

            {/* ── Content area ─────────────────────────────────────── */}
            <div style={{ padding: '18px 20px' }}>

              {/* View header — title + export, driven by viewType */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                {viewType === 'yearly' && (
                  <>
                    <div>
                      <h2 style={{ margin: '0 0 3px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px' }}>
                        <span>📈</span> Year-wise Event Distribution Trend
                      </h2>
                      <p style={{ color: '#666', margin: 0, fontSize: '12px' }}>Yearly trend of industry events over time</p>
                    </div>
                    <ExportMenu elementId="icsr-yearly-trend-container" data={yearlyChartData} headers={['Year', 'Events']} keys={['year', 'events']} filename="icsr_yearly_events" title="Year-wise Event Distribution Trend" />
                  </>
                )}
                {viewType === 'eventTypes' && (
                  <>
                    <div>
                      <h2 style={{ margin: '0 0 3px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px' }}>
                        <span>🥧</span> Event Type Distribution
                      </h2>
                      <p style={{ color: '#666', margin: 0, fontSize: '12px' }}>Distribution of different types of industry interaction events</p>
                    </div>
                    <ExportMenu elementId="icsr-event-type-dist-container" data={eventTypesPieData} headers={['Event Type', 'Count']} keys={['name', 'value']} filename="icsr_event_type_distribution" title="Event Type Distribution" />
                  </>
                )}
                {viewType === 'eventsDirectory' && (
                  <>
                    <div>
                      <h2 style={{ margin: '0 0 3px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '17px' }}>
                        <span>📋</span> Industry Event Directory
                      </h2>
                      <p style={{ color: '#666', margin: 0, fontSize: '12px' }}>List of industry interaction events with funding details</p>
                    </div>
                    <ExportMenu elementId="icsr-event-directory-table" data={eventsList} headers={['Date', 'Event Title', 'Partner', 'Type', 'Funding (₹)']} keys={['event_date', 'event_title', 'industry_partner', 'event_type', 'funding_amount']} filename="icsr_events_directory" title="Industry Event Directory" exportType="table" />
                  </>
                )}
              </div>

              {/* ════════════════════════════════════════════════════
                   All three panels ALWAYS mounted.
                   Active one fades + slides in; others are hidden via
                   opacity + pointer-events (no unmount = no flash).
                  ════════════════════════════════════════════════════ */}
              <div style={{ position: 'relative', height: `${VIEW_HEIGHT}px` }}>

                {/* ── PANEL 1 : Yearly Trend ── */}
                <div
                  id="icsr-yearly-trend-container"
                  className={`icsr-view-panel${viewType === 'yearly' ? ' active' : ''}`}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  {yearlyChartData.length === 0 ? (
                    <div className="section-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p>No yearly distribution data available for the selected filters</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: chartMode === 'bar' ? 'block' : 'none', flex: '1 1 auto' }}>
                        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={400}>
                          <BarChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: { fill: '#666', fontSize: 14, fontWeight: 'bold' } }} />
                            <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} label={{ value: 'Number of Events', angle: -90, position: 'insideLeft', style: { fill: '#666', fontSize: 14, fontWeight: 'bold' } }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                            <Bar dataKey="events" name="Events" fill="#667eea" radius={[4, 4, 0, 0]} barSize={28} isAnimationActive>
                              <LabelList dataKey="events" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
)}</>
                      </div>

                      <div style={{ display: chartMode === 'trend' ? 'block' : 'none', flex: '1 1 auto' }}>
                        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={400}>
                          <LineChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: { fill: '#666', fontSize: 14, fontWeight: 'bold' } }} />
                            <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} label={{ value: 'Number of Events', angle: -90, position: 'insideLeft', style: { fill: '#666', fontSize: 14, fontWeight: 'bold' } }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="circle" />
                            <Line type="linear" dataKey="events" name="Events" stroke="#667eea" strokeWidth={3} dot={{ r: 6, fill: '#667eea', strokeWidth: 2 }} activeDot={{ r: 8 }} isAnimationActive>
                              <LabelList dataKey="events" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
)}</>
                      </div>

                      {/* Chart Statistics */}
                      <div style={{ padding: '14px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div className="metric-value-sm" style={{ color: '#667eea' }}>{yearlyChartData.reduce((sum, item) => sum + item.events, 0)}</div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Total Events</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="metric-value-sm" style={{ color: '#22c55e' }}>{yearlyChartData.length > 0 ? Math.max(...yearlyChartData.map(item => item.events)) : 0}</div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Peak Events in Year</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div className="metric-value-sm" style={{ color: '#f97316' }}>{yearlyChartData.length}</div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Years Covered</div>
                        </div>
                        {Number(summary.total_funding) >= 0 && (
                          <div style={{ textAlign: 'center' }}>
                            <div className="metric-value-sm" style={{ color: '#f97316' }}>{formatCompactCurrency(summary.total_funding)}</div>
                            <div style={{ color: '#666', fontSize: '12px' }}>Total Fund Generated</div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* ── PANEL 2 : Event Types Pie ── */}
                <div
                  id="icsr-event-type-dist-container"
                  className={`icsr-view-panel${viewType === 'eventTypes' ? ' active' : ''}`}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  {eventTypesPieData.length === 0 ? (
                    <div className="section-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <p>No event distribution data available for the selected filters</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: '1 1 auto' }}>
                        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={440}>
                          <PieChart margin={{ top: 40, right: 20, left: 20, bottom: 10 }}>
                            <Pie data={eventTypesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={140} label={false} isAnimationActive>
                              {eventTypesPieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={EVENT_TYPE_COLORS[index % EVENT_TYPE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [`${v} events`, n]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                            <Legend layout="horizontal" align="center" verticalAlign="top" wrapperStyle={{ top: 0, left: 0, width: '100%', paddingBottom: '30px', fontWeight: 'bold', fontSize: '11px' }} iconType="circle" iconSize={10} />
                          </PieChart>
                        </ResponsiveContainer>
)}</>
                      </div>

                      <div style={{ marginTop: 'auto', padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                        {[
                          { label: 'Event Categories', val: eventTypesPieData.length, color: '#4f46e5' },
                          { label: 'Total Events', val: eventTypesPieData.reduce((s, i) => s + i.value, 0), color: '#22c55e' },
                          { label: 'Most Common', val: eventTypesPieData.length > 0 ? Math.max(...eventTypesPieData.map(i => i.value)) : 0, color: '#f97316' },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <div className="icsr-stat-num" style={{ color, fontWeight: 'bold', fontSize: '24px' }}>{val}</div>
                            <div style={{ color: '#666', fontSize: '12px' }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* ── PANEL 3 : Events Directory ── */}
                <div
                  className={`icsr-view-panel${viewType === 'eventsDirectory' ? ' active' : ''}`}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <div
                    id="icsr-event-directory-table"
                    style={{ height: '100%', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                  >
                    {eventsList.length > 0 ? (
                      <>
                        {/* Sticky header */}
                        <div style={{ backgroundColor: '#f97316', color: '#fff', display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.5fr 1fr 1.2fr 1.2fr', gap: '12px', padding: '12px', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
                          <div>Event Name</div>
                          <div>Type</div>
                          <div>Hosted By</div>
                          <div>Date</div>
                          <div>Target Audience</div>
                          <div>Funding By</div>
                        </div>

                        {/* Scrollable body */}
                        <div style={{ flex: '1 1 0', overflowY: 'auto', overflowX: 'auto' }}>
                          {eventsList.map((event, index) => (
                            <div
                              key={event.project_id || index}
                              className="icsr-table-row"
                              style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.5fr 1fr 1.2fr 1.2fr', gap: '12px', padding: '11px 12px', backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}
                            >
                              <div style={{ fontWeight: '500' }}>{event.event_name}</div>
                              <div><span style={{ color: '#333', fontSize: '11px', fontWeight: '600' }}>{event.event_type}</span></div>
                              <div>{event.hosted_by || '—'}</div>
                              <div>{event.date_of_event ? new Date(event.date_of_event).toLocaleDateString() : '—'}</div>
                              <div title={event.target_audience}>{event.target_audience || '—'}</div>
                              <div>{event.funding_by || '—'}</div>
                            </div>
                          ))}
                        </div>

                        {/* Footer stats */}
                        <div style={{ padding: '12px 14px', backgroundColor: '#f8f9fa', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
                          {[
                            { label: 'Showing', val: eventsList.length, color: '#f97316' },
                            { label: 'Event Types', val: new Set(eventsList.map(e => e.event_type)).size, color: '#667eea' },
                            { label: 'Distinct Hosts', val: new Set(eventsList.map(e => e.hosted_by).filter(Boolean)).size, color: '#22c55e' },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                              <div className="icsr-stat-num" style={{ color, fontWeight: 'bold', fontSize: '20px' }}>{val}</div>
                              <div style={{ color: '#666', fontSize: '12px' }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {pagination.total_pages > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '12px', backgroundColor: '#fff', borderTop: '1px solid #e0e0e0', flexShrink: 0 }}>
                            <button
                              onClick={() => handlePageChange(pagination.page - 1)}
                              disabled={pagination.page === 1}
                              style={{ padding: '7px 16px', backgroundColor: pagination.page === 1 ? '#ccc' : '#f97316', color: '#fff', border: 'none', borderRadius: '4px', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', transition: 'background-color 0.2s ease' }}
                            >
                              ← Previous
                            </button>
                            <span style={{ color: '#666', fontSize: '13px' }}>
                              Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong>
                              <span style={{ marginLeft: '8px', color: '#999' }}>({formatNumber(pagination.total)} total)</span>
                            </span>
                            <button
                              onClick={() => handlePageChange(pagination.page + 1)}
                              disabled={pagination.page >= pagination.total_pages}
                              style={{ padding: '7px 16px', backgroundColor: pagination.page >= pagination.total_pages ? '#ccc' : '#f97316', color: '#fff', border: 'none', borderRadius: '4px', cursor: pagination.page >= pagination.total_pages ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '500', transition: 'background-color 0.2s ease' }}
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', backgroundColor: '#f8f9fa' }}>
                        <span style={{ fontSize: '48px', marginBottom: '12px' }}>📋</span>
                        <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>No events found for the selected filters.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              {/* ── end always-mounted panels container ── */}

            </div>
            {/* ── end content area ── */}

          </div>
          {/* ── end unified container ── */}

          <DataUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            tableName={activeUploadTable}
            token={token}
            onUploadSuccess={refreshData}
          />

        </div>
      </div>
    </>
  );
}

export default IcsrSection;