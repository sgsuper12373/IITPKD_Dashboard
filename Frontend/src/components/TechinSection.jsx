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
  fetchTechinSummary,
  fetchTechinPrograms,
  fetchTechinSkillDev,
  fetchTechinStartups,
  fetchTechinFilterOptions
} from '../services/techinStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';
import './Page.css';
import './PeopleCampus.css';
import '../DesignSystem.css';
import './TechinSection.css';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCompactCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  if (value >= 10000000) return '₹' + (value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  if (value >= 100000) return '₹' + (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  return '₹' + formatNumber(value);
};

const CONTENT_HEIGHT = 480;

const TRANSITION_STYLE = `
  @keyframes techin-fade-in {
    from { opacity: 0; transform: translateY(8px) scale(0.995); }
    to   { opacity: 1; transform: translateY(0)   scale(1);     }
  }
  .techin-anim {
    animation: techin-fade-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .techin-tab-btn {
    padding: 9px 22px;
    border-radius: 50px;
    border: 2px solid transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: background 0.22s, color 0.22s, border-color 0.22s, box-shadow 0.22s, transform 0.15s;
  }
  .techin-tab-btn:hover  { transform: translateY(-1px); }
  .techin-tab-btn:active { transform: translateY(0); }
  .techin-mode-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .techin-mode-btn:hover  { transform: translateY(-1px); }
  .techin-mode-btn:active { transform: translateY(0); }
  .techin-summary-card {
    border-radius: 20px;
    padding: 24px;
    color: white;
    cursor: pointer;
    transition: transform 0.25s cubic-bezier(0.22,1,0.36,1),
                box-shadow 0.25s cubic-bezier(0.22,1,0.36,1);
    user-select: none;
  }
  .techin-summary-card:hover  { transform: translateY(-4px) scale(1.02); }
  .techin-summary-card:active { transform: scale(0.97); }
`;

function injectStyle() {
  if (document.getElementById('techin-styles')) return;
  const s = document.createElement('style');
  s.id = 'techin-styles';
  s.textContent = TRANSITION_STYLE;
  document.head.appendChild(s);
}

const VIEWS = [
  { id: 'programs',  label: 'Programs Trend',   color: '#667eea', icon: '📊' },
  { id: 'skillDev',  label: 'Skill Dev Trend',  color: '#f093fb', icon: '🎯' },
  { id: 'startups',  label: 'Startups Growth',  color: '#43e97b', icon: '🚀' },
];

function TechinSection({ user, isPublicView = false }) {
  injectStyle();

  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isRestricted = typeof user === 'undefined' || user?.role_id === 0;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 13;
  // Startup revenue metrics (total / highest / average) are hidden from guests only.
  const hideRevenue = isGuestUser || user?.role_id === 0;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [viewType, setViewType] = useState('programs');
  const [chartMode, setChartMode] = useState('bar');

  const [summary, setSummary] = useState({
    total_programs: 0, total_skill_dev_programs: 0, total_startups: 0,
    total_startup_revenue: 0, highest_revenue: 0, lowest_revenue: 0, average_revenue: 0
  });
  const [programsTrend, setProgramsTrend] = useState([]);
  const [programsTable, setProgramsTable] = useState([]);
  const [skillDevTrend, setSkillDevTrend] = useState([]);
  const [skillDevTable, setSkillDevTable] = useState([]);
  const [startupsTrend, setStartupsTrend] = useState([]);
  const [startupsTable, setStartupsTable] = useState([]);

  const [filterOptions, setFilterOptions] = useState({
    programs: { types: [], associations: [] },
    skill_dev: { categories: [], associations: [] },
    startups: { domains: [], statuses: [] }
  });

  const [programFilters, setProgramFilters] = useState({ type: 'All', association: 'All' });
  const [skillDevFilters, setSkillDevFilters] = useState({ category: 'All', association: 'All' });
  const [startupFilters, setStartupFilters] = useState({ domain: 'All', status: 'All' });

  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingSkillDev, setLoadingSkillDev] = useState(false);
  const [loadingStartups, setLoadingStartups] = useState(false);

  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const [animKey, setAnimKey] = useState(0);
  const bump = useCallback(() => setAnimKey(k => k + 1), []);

  const serializedProgramFilters = JSON.stringify(programFilters);
  useEffect(() => {
    const load = async () => {
      try {
        const [sumData, filterOps] = await Promise.all([
          fetchTechinSummary(token),
          fetchTechinFilterOptions(programFilters, token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) { setError(err.message || 'Failed to initialize TechIn data'); }
    };
    load();
  }, [serializedProgramFilters, programFilters, token, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingPrograms(true);
    fetchTechinPrograms(programFilters, token)
      .then(r => { if (m && r) { setProgramsTrend(r.trend || []); setProgramsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingPrograms(false); });
    return () => { m = false; };
  }, [token, programFilters, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingSkillDev(true);
    fetchTechinSkillDev(skillDevFilters, token)
      .then(r => { if (m && r) { setSkillDevTrend(r.trend || []); setSkillDevTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingSkillDev(false); });
    return () => { m = false; };
  }, [token, skillDevFilters, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingStartups(true);
    fetchTechinStartups(startupFilters, token)
      .then(r => { if (m && r) { setStartupsTrend(r.trend || []); setStartupsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingStartups(false); });
    return () => { m = false; };
  }, [token, startupFilters, uploadVersion]);

  const handleFilterChange = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));
  const switchView = (id) => { setViewType(id); bump(); };
  const switchMode = (mode) => { setChartMode(mode); bump(); };

  const handleSummaryCard = (view) => {
    setViewType(view);
    setChartMode(isRestricted ? 'bar' : 'table');
    bump();
    setTimeout(() => {
      document.getElementById('techin-content-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const clearFilters = () => {
    if (viewType === 'programs') setProgramFilters({ type: 'All', association: 'All' });
    if (viewType === 'skillDev') setSkillDevFilters({ category: 'All', association: 'All' });
    if (viewType === 'startups') setStartupFilters({ domain: 'All', status: 'All' });
  };

  const TechinTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="techin-tooltip">
          <p className="techin-tooltip-year">Year: {label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="techin-tooltip-entry" style={{ color: entry.color }}>{entry.name}: {formatNumber(entry.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = (data, color, name) => (
    <div
      className="clickable-chart techin-chart-box"
      style={{ height: `${CONTENT_HEIGHT}px` }}
      onClick={() => setExpandedChart({
        title: `${currentView?.label} Trend`,
        content: (
          <ResponsiveContainer width="100%" height={500}>
            {chartMode === 'bar' ? (
              <BarChart data={data} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                <Tooltip content={<TechinTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                <Bar dataKey="count" name={name} fill={color} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: color }} />
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                <Tooltip content={<TechinTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                <Line type="linear" dataKey="count" name={name} stroke={color} strokeWidth={3} dot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: color }} />
                </Line>
              </LineChart>
            )}
          </ResponsiveContainer>
        )
      })}
    >
      {data.length === 0 && (
        <div className="techin-no-data-overlay">
          <span className="techin-no-data-icon">&#128202;</span>
          <p className="techin-no-data-text">No data available for the selected filters.</p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={CONTENT_HEIGHT} minWidth={0}>
        {chartMode === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: chartIsMobile ? 20 : 40, bottom: chartIsMobile ? 50 : 20 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" stroke="#666" interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip content={<TechinTooltip />} />
            <Legend />
            <Bar dataKey="count" name={name} fill={color} radius={[4, 4, 0, 0]} barSize={28}>
              <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 20, right: 30, left: chartIsMobile ? 20 : 40, bottom: chartIsMobile ? 50 : 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" stroke="#666" interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip content={<TechinTooltip />} />
            <Legend />
            <Line type="linear" dataKey="count" name={name} stroke={color} strokeWidth={3} dot={{ r: 5, fill: color, strokeWidth: 0 }} activeDot={{ r: 7 }}>
              <LabelList offset={10} dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
            </Line>
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  const currentView = VIEWS.find(v => v.id === viewType);
  const color = currentView?.color || '#667eea';

  const renderFilters = () => {
    if (viewType === 'programs') return (
      <div className="techin-filter-grid">
        <div>
          <label className="techin-filter-label">Type</label>
          <select value={programFilters.type} onChange={e => handleFilterChange(setProgramFilters)('type', e.target.value)} className="techin-filter-select">
            <option value="All">All Types</option>
            {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="techin-filter-label">Association</label>
          <select value={programFilters.association} onChange={e => handleFilterChange(setProgramFilters)('association', e.target.value)} className="techin-filter-select">
            <option value="All">All Associations</option>
            {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'skillDev') return (
      <div className="techin-filter-grid">
        <div>
          <label className="techin-filter-label">Category</label>
          <select value={skillDevFilters.category} onChange={e => handleFilterChange(setSkillDevFilters)('category', e.target.value)} className="techin-filter-select">
            <option value="All">All Categories</option>
            {filterOptions.skill_dev.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="techin-filter-label">Association</label>
          <select value={skillDevFilters.association} onChange={e => handleFilterChange(setSkillDevFilters)('association', e.target.value)} className="techin-filter-select">
            <option value="All">All Associations</option>
            {filterOptions.skill_dev.associations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'startups') return (
      <div className="techin-filter-grid">
        <div>
          <label className="techin-filter-label">Domain</label>
          <select value={startupFilters.domain} onChange={e => handleFilterChange(setStartupFilters)('domain', e.target.value)} className="techin-filter-select">
            <option value="All">All Domains</option>
            {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="techin-filter-label">Status</label>
          <select value={startupFilters.status} onChange={e => handleFilterChange(setStartupFilters)('status', e.target.value)} className="techin-filter-select">
            <option value="All">All Statuses</option>
            {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    );
  };

  const TableShell = ({ headerBg, columns, children }) => (
    <div className="techin-table-shell" style={{ height: `${CONTENT_HEIGHT}px` }}>
      <div className="techin-table-header" style={{ backgroundColor: headerBg, gridTemplateColumns: columns }}>
        {children[0]}
      </div>
      <div className="techin-table-body">
        {children[1]}
      </div>
    </div>
  );

  const renderTable = () => {
    if (viewType === 'programs') {
      if (!programsTable.length && !loadingPrograms) return <EmptyState />;
      if (chartIsMobile) {
        return (
          <div className="techin-mobile-list" style={{ maxHeight: `${CONTENT_HEIGHT}px` }}>
            {programsTable.map((row, idx) => (
              <div key={idx} className="techin-mobile-card">
                <div className="techin-mobile-card-title">{row.program_name}</div>
                <div className="techin-mobile-card-fields">
                  <div><span className="techin-field-label">Type:</span><br />{row.type}</div>
                  <div><span className="techin-field-label">Association:</span><br />{row.association}</div>
                  <div><span className="techin-field-label">Date:</span><br />{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</div>
                  <div><span className="techin-field-label">Attendees:</span><br />{row.no_of_attendess || '0'}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <TableShell headerBg="#667eea" columns="2fr 1.2fr 1.2fr 1fr 1fr">
          {[
            <><div>Program Name</div><div>Type</div><div>Association</div><div>Date</div><div>Attendees</div></>,
            <>
              {programsTable.map((row, idx) => (
                <div key={idx} className="techin-table-row" style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 1fr', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="techin-table-row-name">{row.program_name}</div>
                  <div>{row.type}</div>
                  <div>{row.association}</div>
                  <div>{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</div>
                  <div>{row.no_of_attendess || '0'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
    if (viewType === 'skillDev') {
      if (!skillDevTable.length && !loadingSkillDev) return <EmptyState />;
      if (chartIsMobile) {
        return (
          <div className="techin-mobile-list" style={{ maxHeight: `${CONTENT_HEIGHT}px` }}>
            {skillDevTable.map((row, idx) => (
              <div key={idx} className="techin-mobile-card">
                <div className="techin-mobile-card-title">{row.program_name}</div>
                <div className="techin-mobile-card-fields">
                  <div><span className="techin-field-label">Category:</span><br />{row.category}</div>
                  <div><span className="techin-field-label">Association:</span><br />{row.association}</div>
                  <div><span className="techin-field-label">Date:</span><br />{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</div>
                  <div><span className="techin-field-label">Attendees:</span><br />{row.no_of_attendess || '0'}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <TableShell headerBg="#f093fb" columns="2fr 1.2fr 1.2fr 1fr 1fr">
          {[
            <><div>Program Name</div><div>Category</div><div>Association</div><div>Date</div><div>Attendees</div></>,
            <>
              {skillDevTable.map((row, idx) => (
                <div key={idx} className="techin-table-row" style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 1fr', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="techin-table-row-name">{row.program_name}</div>
                  <div>{row.category}</div>
                  <div>{row.association}</div>
                  <div>{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</div>
                  <div>{row.no_of_attendess || '0'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
    if (viewType === 'startups') {
      if (!startupsTable.length && !loadingStartups) return <EmptyState />;
      if (chartIsMobile) {
        return (
          <div className="techin-mobile-list" style={{ maxHeight: `${CONTENT_HEIGHT}px` }}>
            {startupsTable.map((row, idx) => (
              <div key={idx} className="techin-mobile-card">
                <div className="techin-mobile-card-title">{row.startup_name}</div>
                <div className="techin-mobile-card-fields">
                  <div><span className="techin-field-label">Domain:</span><br />{row.domain}</div>
                  <div><span className="techin-field-label">Status:</span><br /><span className={`techin-status-badge techin-status-badge--sm${row.status === 'Active' ? ' techin-status-badge--active' : ' techin-status-badge--other'}`}>{row.status}</span></div>
                  <div><span className="techin-field-label">Jobs:</span><br />{row.number_of_jobs || '0'}</div>
                  {!hideRevenue && <div><span className="techin-field-label">Revenue:</span><br />{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      }
      const startupCols = hideRevenue ? '1.8fr 1.5fr 1fr 1fr' : '1.8fr 1.5fr 1fr 1fr 1.2fr';
      return (
        <TableShell headerBg="#43e97b" columns={startupCols}>
          {[
            <><div>Startup Name</div><div>Domain</div><div>Status</div><div>Jobs</div>{!hideRevenue && <div>Revenue (₹)</div>}</>,
            <>
              {startupsTable.map((row, idx) => (
                <div key={idx} className="techin-table-row" style={{ gridTemplateColumns: startupCols, backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="techin-table-row-name">{row.startup_name}</div>
                  <div>{row.domain}</div>
                  <div>
                    <span className={`techin-status-badge techin-status-badge--md${row.status === 'Active' ? ' techin-status-badge--active' : ' techin-status-badge--other'}`}>{row.status}</span>
                  </div>
                  <div>{row.number_of_jobs || '0'}</div>
                  {!hideRevenue && <div>{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>}
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
  };

  const trendData = viewType === 'programs' ? programsTrend : viewType === 'skillDev' ? skillDevTrend : startupsTrend;
  const trendLabel = viewType === 'programs' ? 'Programs Count' : viewType === 'skillDev' ? 'Skill Dev Count' : 'Startups Count';
  const exportId = `techin-${viewType}-chart-container`;
  const exportData = chartMode === 'table'
    ? (viewType === 'programs' ? programsTable : viewType === 'skillDev' ? skillDevTable : startupsTable)
    : trendData;

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            &#8592; Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <h1 className="techin-h1">TechIn</h1>

        {!isReadOnlyView && isAdmin && (
          <div className="techin-upload-row">
            {[
              { label: 'Upload Programs',  table: 'techin_program_table' },
              { label: 'Upload Skill Dev', table: 'techin_skill_development_program' },
              { label: 'Upload Startups',  table: 'techin_startup_table' },
            ].map(({ label, table }) => (
              <button key={table} className="page-upload-btn" onClick={() => { setActiveUploadTable(table); setIsUploadModalOpen(true); }}>
                &#128228; {label}
              </button>
            ))}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['techin_program_table', 'techin_skill_development_program', 'techin_startup_table']} />
          <ShareButton />
        </div>

        <div className="techin-export-row">
          <ExportMenu
            elementId="techin-summary-cards-container"
            data={[summary]}
            headers={['Total Programs', 'Skill Dev Programs', 'Total Startups']}
            keys={['total_programs', 'total_skill_dev_programs', 'total_startups']}
            filename="techin_summary"
            title="TechIn Summary"
          />
        </div>

        <div id="techin-summary-cards-container" className="techin-cards-grid">
          {[
            { view: 'programs', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: '0 10px 20px rgba(102,126,234,0.2)', label: 'Total Programs',     value: summary.total_programs },
            { view: 'skillDev', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: '0 10px 20px rgba(240,147,251,0.2)', label: 'Skill Dev Programs', value: summary.total_skill_dev_programs },
            { view: 'startups', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: '0 10px 20px rgba(67,233,123,0.2)',  label: 'Total Startups',     value: summary.total_startups },
          ].map(({ view, bg, shadow, label, value }) => (
            <div
              key={view}
              className="techin-summary-card"
              onClick={() => handleSummaryCard(view)}
              style={{ background: bg, boxShadow: shadow }}
            >
              <h3>{label}</h3>
              <div className="metric-value">{formatNumber(value)}</div>
              <div className="techin-summary-card-footer">Click to view directory &#8594;</div>
            </div>
          ))}
        </div>

        {!hideRevenue && (
          <>
            <div className="techin-revenue-header">
              <h3 className="techin-revenue-h3">Startup Revenue Metrics</h3>
              <ExportMenu
                elementId="techin-revenue-metrics-container"
                data={[summary]}
                headers={['Total Revenue', 'Highest Revenue', 'Average Revenue']}
                keys={['total_startup_revenue', 'highest_revenue', 'average_revenue']}
                filename="techin_revenue_metrics"
                title="Startup Revenue Metrics"
              />
            </div>
            <div id="techin-revenue-metrics-container" className="techin-revenue-grid">
              {[
                { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: '0 8px 20px rgba(59,130,246,0.2)',  label: 'Total Revenue',   value: summary.total_startup_revenue },
                { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: '0 8px 20px rgba(16,185,129,0.2)',  label: 'Highest Revenue', value: summary.highest_revenue },
                { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: '0 8px 20px rgba(245,158,11,0.2)',  label: 'Average Revenue', value: summary.average_revenue }
              ].map(({ bg, shadow, label, value }) => (
                <div key={label} className="techin-revenue-card" style={{ background: bg, boxShadow: shadow }}>
                  <div className="techin-revenue-card-decor" />
                  <div className="techin-revenue-card-body">
                    <div className="techin-revenue-card-label">{label}</div>
                    <div className="metric-value-sm" title={`₹${formatNumber(value)}`}>{formatCompactCurrency(value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div id="techin-content-region" className="techin-content-panel">
          <div className="techin-filter-heading-row">
            <h4 className="techin-filter-h4">Filters</h4>
          </div>

          <div className="techin-tabs-row">
            {VIEWS.map(({ id, label, color: c, icon }) => {
              const active = viewType === id;
              return (
                <button
                  key={id}
                  className="techin-tab-btn"
                  onClick={() => switchView(id)}
                  style={{
                    backgroundColor: active ? c : 'white',
                    color: active ? 'white' : '#333',
                    borderColor: active ? c : '#dee2e6',
                    boxShadow: active ? `0 6px 16px ${c}40` : 'none',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span className="techin-tab-icon">{icon}</span>{label}
                </button>
              );
            })}
          </div>

          <div className="techin-filter-wrap">
            <div className="techin-filter-end-row">
              <button onClick={clearFilters} className="techin-clear-btn">Clear Filters</button>
            </div>
            {renderFilters()}
          </div>

          <div className="techin-divider" />

          <div className="techin-chart-header-row">
            <div>
              <h2 className="techin-chart-h2">
                <span className="techin-chart-icon">{currentView?.icon}</span>
                {currentView?.label}
              </h2>
              <p className="techin-chart-desc">
                {viewType === 'programs' && 'Yearly trend of programs by type and association'}
                {viewType === 'skillDev' && 'Yearly trend of skill development programs'}
                {viewType === 'startups' && 'Yearly growth of startups by domain and status'}
              </p>
            </div>
            <div className="techin-mode-row">
              {['bar', 'trend', 'table']
                .filter(mode => !isRestricted || mode !== 'table')
                .map(mode => {
                  const modeActive = chartMode === mode;
                  const modeLabel = mode === 'bar' ? 'Bar' : mode === 'trend' ? 'Trend' : 'Table';
                  return (
                    <button
                      key={mode}
                      className="techin-mode-btn"
                      onClick={() => switchMode(mode)}
                      style={{
                        backgroundColor: modeActive ? color : '#e9ecef',
                        color: modeActive ? '#fff' : '#333',
                        boxShadow: modeActive ? `0 4px 10px ${color}40` : 'none',
                      }}
                    >
                      {modeLabel}
                    </button>
                  );
                })}
              <ExportMenu
                elementId={exportId}
                data={exportData}
                headers={chartMode === 'table'
                  ? (viewType === 'startups'
                    ? (hideRevenue ? ['Startup Name', 'Domain', 'Status', 'Jobs'] : ['Startup Name', 'Domain', 'Status', 'Jobs', 'Revenue'])
                    : ['Program Name', viewType === 'skillDev' ? 'Category' : 'Type', 'Association', 'Date', 'Attendees'])
                  : ['Year', 'Count']}
                keys={chartMode === 'table'
                  ? (viewType === 'startups'
                    ? (hideRevenue ? ['startup_name', 'domain', 'status', 'number_of_jobs'] : ['startup_name', 'domain', 'status', 'number_of_jobs', 'revenue'])
                    : ['program_name', viewType === 'skillDev' ? 'category' : 'type', 'association', 'event_date', 'no_of_attendess'])
                  : ['year', 'count']}
                filename={`techin_${viewType}_${chartMode}`}
                title={`${currentView?.label} — ${chartMode === 'table' ? 'Directory' : chartMode === 'bar' ? 'Bar Chart' : 'Trend'}`}
              />
            </div>
          </div>

          <div key={animKey} className="techin-anim" id={exportId}>
            {chartMode === 'table' && !isRestricted
              ? renderTable()
              : renderChart(trendData, color, trendLabel)
            }
          </div>
        </div>

        <div className="techin-cta-banner">
          <div className="techin-cta-left">
            <div>
              <h3 className="techin-cta-h3">Explore More on TechIn</h3>
              <p className="techin-cta-p">Visit our website to explore our services and solutions.</p>
            </div>
          </div>
          <a
            href="https://techin-iitpkd.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="techin-cta-link"
          >
            Visit Techin.com &#8594;
          </a>
        </div>
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />

      <ChartExpandModal
        isOpen={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedChart?.title}
      >
        {expandedChart?.content}
      </ChartExpandModal>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="techin-empty-state" style={{ height: `${CONTENT_HEIGHT}px` }}>
      <span className="techin-empty-icon">&#128193;</span>
      <p className="techin-empty-text">{msg || 'No data available for the selected filters.'}</p>
    </div>
  );
}

export default TechinSection;
