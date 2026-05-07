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

/* ─── The ONE constant that controls height everywhere ─────────────────────── */
const CONTENT_HEIGHT = 480;

/* ─── CSS injected once ────────────────────────────────────────────────────── */
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

/* ─── view configs ─────────────────────────────────────────────────────────── */
const VIEWS = [
  { id: 'programs', label: 'Programs Trend', color: '#667eea', icon: '📊' },
  { id: 'skillDev', label: 'Skill Dev Trend', color: '#f093fb', icon: '🎯' },
  { id: 'startups', label: 'Startups Growth', color: '#43e97b', icon: '🚀' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
function TechinSection({ user, isPublicView = false }) {
  injectStyle();

  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  /* modal */
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  /* view / mode */
  const [viewType, setViewType] = useState('programs');
  const [chartMode, setChartMode] = useState('bar');

  /* ── data ── */
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

  /* animation key */
  const [animKey, setAnimKey] = useState(0);
  const bump = useCallback(() => setAnimKey(k => k + 1), []);

  /* ── initial load ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [sumData, filterOps] = await Promise.all([
          fetchTechinSummary(token),
          fetchTechinFilterOptions(token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) { setError(err.message || 'Failed to initialize TechIn data'); }
    };
    load();
  }, [token, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingPrograms(true);
    fetchTechinPrograms(programFilters, token)
      .then(r => { if (m && r) { setProgramsTrend(r.trend || []); setProgramsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingPrograms(false); });
    return () => { m = false; };
  }, [token, programFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingSkillDev(true);
    fetchTechinSkillDev(skillDevFilters, token)
      .then(r => { if (m && r) { setSkillDevTrend(r.trend || []); setSkillDevTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingSkillDev(false); });
    return () => { m = false; };
  }, [token, skillDevFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingStartups(true);
    fetchTechinStartups(startupFilters, token)
      .then(r => { if (m && r) { setStartupsTrend(r.trend || []); setStartupsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingStartups(false); });
    return () => { m = false; };
  }, [token, startupFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));

  const switchView = (id) => { setViewType(id); bump(); };
  const switchMode = (mode) => { setChartMode(mode); bump(); };

  const handleSummaryCard = (view) => {
    setViewType(view);
    setChartMode('table');
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

  /* ── custom tooltip ── */
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

  /* ── chart renderer — fixed pixel height so Recharts renders correctly ── */
  const renderChart = (data, color, name) => (
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
            <Bar dataKey="count" name={name} fill={color} radius={[4, 4, 0, 0]} barSize={28}>
              <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
            <YAxis stroke="#666" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="linear" dataKey="count" name={name} stroke={color} strokeWidth={3} dot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }}>
              <LabelList offset={10} dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
            </Line>
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  /* ── current view config ── */
  const currentView = VIEWS.find(v => v.id === viewType);
  const color = currentView?.color || '#667eea';

  /* ── filter dropdowns per view ── */
  const renderFilters = () => {
    if (viewType === 'programs') return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Type</label>
          <select value={programFilters.type} onChange={e => handleFilterChange(setProgramFilters)('type', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Types</option>
            {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Association</label>
          <select value={programFilters.association} onChange={e => handleFilterChange(setProgramFilters)('association', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Associations</option>
            {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'skillDev') return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Category</label>
          <select value={skillDevFilters.category} onChange={e => handleFilterChange(setSkillDevFilters)('category', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Categories</option>
            {filterOptions.skill_dev.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Association</label>
          <select value={skillDevFilters.association} onChange={e => handleFilterChange(setSkillDevFilters)('association', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Associations</option>
            {filterOptions.skill_dev.associations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'startups') return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Domain</label>
          <select value={startupFilters.domain} onChange={e => handleFilterChange(setStartupFilters)('domain', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Domains</option>
            {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Status</label>
          <select value={startupFilters.status} onChange={e => handleFilterChange(setStartupFilters)('status', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Statuses</option>
            {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    );
  };

  /* ── shared table shell — fixed height, header pinned, body scrolls ── */
  const TableShell = ({ headerBg, columns, children }) => (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', height: `${CONTENT_HEIGHT}px`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: headerBg, color: 'white', display: 'grid', gridTemplateColumns: columns, gap: '8px', padding: '12px', fontWeight: 'bold', fontSize: '13px', flexShrink: 0 }}>
        {children[0]}
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {children[1]}
      </div>
    </div>
  );

  /* ── table renderers ── */
  const renderTable = () => {
    if (viewType === 'programs') {
      if (!programsTable.length && !loadingPrograms) return <EmptyState />;
      return (
        <TableShell headerBg="#667eea" columns="2fr 1.2fr 1.2fr 1fr 1fr">
          {[
            <><div>Program Name</div><div>Type</div><div>Association</div><div>Date</div><div>Attendees</div></>,
            <>
              {programsTable.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 1fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500' }}>{row.program_name}</div>
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
      return (
        <TableShell headerBg="#f093fb" columns="2fr 1.2fr 1.2fr 1fr 1fr">
          {[
            <><div>Program Name</div><div>Category</div><div>Association</div><div>Date</div><div>Attendees</div></>,
            <>
              {skillDevTable.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr 1fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500' }}>{row.program_name}</div>
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
      return (
        <TableShell headerBg="#43e97b" columns="1.8fr 1.5fr 1fr 1fr 1.2fr">
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
    }
  };

  /* trend data & label for current view */
  const trendData = viewType === 'programs' ? programsTrend : viewType === 'skillDev' ? skillDevTrend : startupsTrend;
  const trendLabel = viewType === 'programs' ? 'Programs Count' : viewType === 'skillDev' ? 'Skill Dev Count' : 'Startups Count';
  const exportId = `techin-${viewType}-chart-container`;
  const exportData = chartMode === 'table'
    ? (viewType === 'programs' ? programsTable : viewType === 'skillDev' ? skillDevTable : startupsTable)
    : trendData;

  /* ─────────────────────────── RENDER ───────────────────────────────────── */
  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation &amp; Entrepreneurship
          </button>
        )}
        

        <h1 style={{ marginTop: '20px' ,  marginBottom: '10px' }}>TechIn</h1>

        {/* Upload Buttons */}
        {!isReadOnlyView && isAdmin && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              { label: 'Upload Programs', table: 'techin_program_table' },
              { label: 'Upload Skill Dev', table: 'techin_skill_development_program' },
              { label: 'Upload Startups', table: 'techin_startup_table' },
            ].map(({ label, table }) => (
              <button key={table} className="page-upload-btn" onClick={() => { setActiveUploadTable(table); setIsUploadModalOpen(true); }}>
                📤 {label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>
        )}

        {/* Summary header + export */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
          
          <ExportMenu
            elementId="techin-summary-cards-container"
            data={[summary]}
            headers={['Total Programs', 'Skill Dev Programs', 'Total Startups']}
            keys={['total_programs', 'total_skill_dev_programs', 'total_startups']}
            filename="techin_summary"
            title="TechIn Summary"
          />
        </div>

        {/* ── Summary Cards ── */}
        <div id="techin-summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '15px' }}>
          {[
            { view: 'programs', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: '0 10px 20px rgba(102,126,234,0.2)', label: 'Total Programs', value: summary.total_programs },
            { view: 'skillDev', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: '0 10px 20px rgba(240,147,251,0.2)', label: 'Skill Dev Programs', value: summary.total_skill_dev_programs },
            { view: 'startups', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: '0 10px 20px rgba(67,233,123,0.2)', label: 'Total Startups', value: summary.total_startups },
          ].map(({ view, bg, shadow, label, value }) => (
            <div
              key={view}
              className="techin-summary-card"
              onClick={() => handleSummaryCard(view)}
              style={{ background: bg, boxShadow: shadow }}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>{label}</h3>
              <div className="metric-value">{formatNumber(value)}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
            </div>
          ))}
        </div>

        {/* ── Revenue Metrics ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px', fontWeight: '600' }}>Startup Revenue Metrics</h3>
          <ExportMenu
            elementId="techin-revenue-metrics-container"
            data={[summary]}
            headers={['Total Revenue', 'Highest Revenue', 'Average Revenue']}
            keys={['total_startup_revenue', 'highest_revenue', 'average_revenue']}
            filename="techin_revenue_metrics"
            title="Startup Revenue Metrics"
          />
        </div>
        <div id="techin-revenue-metrics-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {[
            { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: '0 8px 20px rgba(59,130,246,0.2)', label: 'Total Revenue', value: summary.total_startup_revenue },
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

        {/* ══════════════ UNIFIED CONTROL PANEL ══════════════ */}
        <div
          id="techin-content-region"
          style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          {/* Filter heading */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em', marginBottom: '10px' }}>Filters</h4>
          </div>

          {/* View-tab buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                  <span style={{ fontSize: '16px' }}>{icon}</span>{label}
                </button>
              );
            })}
          </div>

          {/* Filter dropdowns + clear */}
          <div style={{ padding: '0 6px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={clearFilters}
                style={{ padding: '5px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
              >
                Clear Filters
              </button>
            </div>
            {renderFilters()}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: '#e9ecef', margin: '16px 0' }} />

          {/* Chart header: title + mode buttons + export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <span style={{ fontSize: '22px' }}>{currentView?.icon}</span>
                {currentView?.label}
              </h2>
              <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
                {viewType === 'programs' && 'Yearly trend of programs by type and association'}
                {viewType === 'skillDev' && 'Yearly trend of skill development programs'}
                {viewType === 'startups' && 'Yearly growth of startups by domain and status'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {['bar', 'trend', 'table'].map(mode => {
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
                    ? ['Startup Name', 'Domain', 'Status', 'Jobs', 'Revenue']
                    : ['Program Name', viewType === 'skillDev' ? 'Category' : 'Type', 'Association', 'Date', 'Attendees'])
                  : ['Year', 'Count']}
                keys={chartMode === 'table'
                  ? (viewType === 'startups'
                    ? ['startup_name', 'domain', 'status', 'number_of_jobs', 'revenue']
                    : ['program_name', viewType === 'skillDev' ? 'category' : 'type', 'association', 'event_date', 'no_of_attendess'])
                  : ['year', 'count']}
                filename={`techin_${viewType}_${chartMode}`}
                title={`${currentView?.label} — ${chartMode === 'table' ? 'Directory' : chartMode === 'bar' ? 'Bar Chart' : 'Trend'}`}
              />
            </div>
          </div>

          {/* Animated content region */}
          <div key={animKey} className="techin-anim" id={exportId}>
            {chartMode === 'table'
              ? renderTable()
              : renderChart(trendData, color, trendLabel)
            }
          </div>
        </div>
        {/* end unified panel */}

      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </div>
  );
}

/* ── small helper ── */
function EmptyState({ msg }) {
  return (
    <div style={{ height: `${CONTENT_HEIGHT}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <span style={{ fontSize: '36px', marginBottom: '10px' }}>🗂️</span>
      <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>{msg || 'No data available for the selected filters.'}</p>
    </div>
  );
}

export default TechinSection;