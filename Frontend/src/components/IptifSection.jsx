import { useState, useEffect, useRef, useCallback } from 'react';
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
  fetchIptifSummary,
  fetchIptifProjects,
  fetchIptifPrograms,
  fetchIptifStartups,
  fetchIptifFacilities,
  fetchIptifFilterOptions
} from '../services/iptifStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './DataUploadModal';
import './Page.css';
import './PeopleCampus.css';
import ExportMenu from './ExportMenu';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

/* ─── The ONE constant that controls height everywhere ─────────────────────── */
const CONTENT_HEIGHT = 480;
const TABLE_BODY_HEIGHT = CONTENT_HEIGHT - 44; // 44px = header row height

/* ─── fluid-transition CSS injected once ──────────────────────────────────── */
const TRANSITION_STYLE = `
  @keyframes iptif-fade-in {
    from { opacity: 0; transform: translateY(8px) scale(0.995); }
    to   { opacity: 1; transform: translateY(0)   scale(1);     }
  }
  .iptif-anim {
    animation: iptif-fade-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .iptif-filter-panel {
    overflow: hidden;
    transition: max-height 0.42s cubic-bezier(0.22, 1, 0.36, 1),
                opacity    0.30s cubic-bezier(0.22, 1, 0.36, 1),
                transform  0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .iptif-filter-panel.open  { max-height: 300px; opacity: 1; transform: translateY(0);    }
  .iptif-filter-panel.shut  { max-height: 0;     opacity: 0; transform: translateY(-6px); }
  .iptif-tab-btn {
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
  .iptif-tab-btn:hover  { transform: translateY(-1px); }
  .iptif-tab-btn:active { transform: translateY(0); }
  .iptif-mode-btn {
    padding: 6px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .iptif-mode-btn:hover  { transform: translateY(-1px); }
  .iptif-mode-btn:active { transform: translateY(0); }
  .iptif-summary-card {
    border-radius: 20px;
    padding: 24px;
    color: white;
    cursor: pointer;
    transition: transform 0.25s cubic-bezier(0.22,1,0.36,1),
                box-shadow 0.25s cubic-bezier(0.22,1,0.36,1);
    user-select: none;
  }
  .iptif-summary-card:hover  { transform: translateY(-4px) scale(1.02); }
  .iptif-summary-card:active { transform: scale(0.97); }
`;

function injectStyle() {
  if (document.getElementById('iptif-styles')) return;
  const s = document.createElement('style');
  s.id = 'iptif-styles';
  s.textContent = TRANSITION_STYLE;
  document.head.appendChild(s);
}

/* ─── view configs ─────────────────────────────────────────────────────────── */
const VIEWS = [
  { id: 'projects', label: 'Projects Trend', color: '#667eea', icon: '📊' },
  { id: 'programs', label: 'Programs Trend', color: '#f093fb', icon: '🎓' },
  { id: 'startups', label: 'Startups Growth', color: '#43e97b', icon: '🚀' },
  { id: 'facilities', label: 'Facilities Revenue', color: '#f97316', icon: '🏭' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
function IptifSection({ user, isPublicView = false }) {
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

  /* view / mode state */
  const [viewType, setViewType] = useState('projects');
  const [chartMode, setChartMode] = useState('bar');

  /* ── data ── */
  const [summary, setSummary] = useState({ total_projects: 0, total_programs: 0, total_startups: 0 });
  const [projectsTrend, setProjectsTrend] = useState([]);
  const [projectsTable, setProjectsTable] = useState([]);
  const [programsTrend, setProgramsTrend] = useState([]);
  const [programsTable, setProgramsTable] = useState([]);
  const [startupsTrend, setStartupsTrend] = useState([]);
  const [startupsTable, setStartupsTable] = useState([]);
  const [facilitiesTrend, setFacilitiesTrend] = useState([]);
  const [facilitiesTable, setFacilitiesTable] = useState([]);

  const [filterOptions, setFilterOptions] = useState({
    projects: { schemes: [], statuses: [], years: [] },
    programs: { types: [], associations: [] },
    startups: { domains: [], statuses: [] },
    facilities: { types: [] }
  });

  const [projectFilters, setProjectFilters] = useState({ scheme: 'All', status: 'All', year: 'All' });
  const [programFilters, setProgramFilters] = useState({ type: 'All', association: 'All' });
  const [startupFilters, setStartupFilters] = useState({ domain: 'All', status: 'All' });
  const [facilityFilters, setFacilityFilters] = useState({ facility_type: 'All' });

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStartups, setLoadingStartups] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const [error, setError] = useState(null);

  /* animation key */
  const [animKey, setAnimKey] = useState(0);
  const bump = useCallback(() => setAnimKey(k => k + 1), []);

  /* ── initial load ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [sumData, filterOps] = await Promise.all([
          fetchIptifSummary(token),
          fetchIptifFilterOptions(token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) { setError(err.message || 'Failed to initialize IPTIF data'); }
    };
    load();
  }, [token, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingProjects(true);
    fetchIptifProjects(projectFilters, token)
      .then(r => { if (m && r) { setProjectsTrend(r.trend || []); setProjectsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingProjects(false); });
    return () => { m = false; };
  }, [token, projectFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingPrograms(true);
    fetchIptifPrograms(programFilters, token)
      .then(r => { if (m && r) { setProgramsTrend(r.trend || []); setProgramsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingPrograms(false); });
    return () => { m = false; };
  }, [token, programFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingStartups(true);
    fetchIptifStartups(startupFilters, token)
      .then(r => { if (m && r) { setStartupsTrend(r.trend || []); setStartupsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingStartups(false); });
    return () => { m = false; };
  }, [token, startupFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let m = true;
    setLoadingFacilities(true);
    fetchIptifFacilities(facilityFilters, token)
      .then(r => { if (m && r) { setFacilitiesTrend(r.trend || []); setFacilitiesTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingFacilities(false); });
    return () => { m = false; };
  }, [token, facilityFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));

  const switchView = (id) => { setViewType(id); bump(); };
  const switchMode = (mode) => { setChartMode(mode); bump(); };

  const handleSummaryCard = (view) => {
    setViewType(view);
    setChartMode('table');
    bump();
    setTimeout(() => {
      document.getElementById('iptif-content-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
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

  /* ─────────────────────── FILTER PANEL CONTENT per view ─────────────────── */
  const renderFilters = () => {
    if (viewType === 'projects') return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Scheme</label>
          <select value={projectFilters.scheme} onChange={e => handleFilterChange(setProjectFilters)('scheme', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Schemes</option>
            {filterOptions.projects.schemes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Status</label>
          <select value={projectFilters.status} onChange={e => handleFilterChange(setProjectFilters)('status', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Statuses</option>
            {filterOptions.projects.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Start Year</label>
          <select value={projectFilters.year} onChange={e => handleFilterChange(setProjectFilters)('year', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd' }}>
            <option value="All">All Years</option>
            {filterOptions.projects.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    );
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
    if (viewType === 'facilities') return (
      <div>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Facility Type</label>
        <select value={facilityFilters.facility_type} onChange={e => handleFilterChange(setFacilityFilters)('facility_type', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%', maxWidth: '300px', borderRadius: '6px', border: '1px solid #ddd' }}>
          <option value="All">All Facility Types</option>
          {filterOptions.facilities.types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    );
  };

  const clearFilters = () => {
    if (viewType === 'projects') setProjectFilters({ scheme: 'All', status: 'All', year: 'All' });
    if (viewType === 'programs') setProgramFilters({ type: 'All', association: 'All' });
    if (viewType === 'startups') setStartupFilters({ domain: 'All', status: 'All' });
    if (viewType === 'facilities') setFacilityFilters({ facility_type: 'All' });
  };

  /* ─────────────────────── TABLE RENDERERS ─────────────────────────────── */
  /* Shared table shell — fixed total height, header pinned, body scrolls */
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

  const renderTable = () => {
    if (viewType === 'projects') {
      if (!projectsTable.length && !loadingProjects) return <EmptyState />;
      return (
        <TableShell headerBg="#667eea" columns="2fr 1.5fr 1fr 1.2fr">
          {[
            <><div>Project Name</div><div>Scheme</div><div>Status</div><div>Start Date</div></>,
            <>
              {projectsTable.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500' }}>{row.project_name}</div>
                  <div>{row.scheme}</div>
                  <div><span style={{ backgroundColor: row.status === 'Ongoing' ? '#e0f2fe' : '#f1f5f9', color: row.status === 'Ongoing' ? '#0284c7' : '#475569', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-block' }}>{row.status}</span></div>
                  <div>{row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
    if (viewType === 'programs') {
      if (!programsTable.length && !loadingPrograms) return <EmptyState />;
      return (
        <TableShell headerBg="#f093fb" columns="2fr 1.2fr 1.2fr 1.5fr 1fr">
          {[
            <><div>Program Name</div><div>Type</div><div>Association</div><div>Target Audience</div><div>Attendees</div></>,
            <>
              {programsTable.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr 1fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500' }}>{row.program_name}</div><div>{row.type}</div><div>{row.association}</div><div>{row.targetted_audi}</div><div>{row.no_of_attendees}</div>
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
            <><div>Startup Name</div><div>Domain</div><div>Status</div><div>Jobs Created</div><div>Revenue (₹)</div></>,
            <>
              {startupsTable.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500' }}>{row.startup_name}</div><div>{row.domain}</div><div>{row.status}</div><div>{row.number_of_jobs}</div>
                  <div>{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
    if (viewType === 'facilities') {
      if (!facilitiesTable.length && !loadingFacilities) return <EmptyState />;
      return (
        <TableShell headerBg="#f97316" columns="2fr 1.5fr 1.2fr 1.2fr 1.2fr">
          {[
            <><div>Facility Name</div><div>Type</div><div>Availability</div><div>Financial Year</div><div>Revenue (₹)</div></>,
            <>
              {facilitiesTable.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                  <div style={{ fontWeight: '500' }}>{row.facility_name}</div><div>{row.facility_type}</div><div>{row.availability_status}</div><div>{row.financial_year}</div>
                  <div>{row.revenue_made ? formatNumber(row.revenue_made) : '0'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
  };

  /* trend data & label for current view */
  const trendData = viewType === 'projects' ? projectsTrend : viewType === 'programs' ? programsTrend : viewType === 'startups' ? startupsTrend : facilitiesTrend;
  const trendLabel = viewType === 'projects' ? 'Projects Count' : viewType === 'programs' ? 'Programs Count' : viewType === 'startups' ? 'Startups Count' : 'Revenue (₹)';
  const exportId = `iptif-${viewType}-chart-container`;
  const exportData = chartMode === 'table' ? (viewType === 'projects' ? projectsTable : viewType === 'programs' ? programsTable : viewType === 'startups' ? startupsTable : facilitiesTable) : trendData;

  /* ─────────────────────────── RENDER ───────────────────────────────────── */
  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <h1 style={{ marginBottom: '5px' }}>IIT Palakkad Technology IHub Foundation (IPTIF)</h1>

        {/* Upload Buttons */}
        {!isReadOnlyView && isAdmin && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {[
              { label: 'Upload Projects', table: 'iptif_projects_table' },
              { label: 'Upload Programs', table: 'iptif_program_table' },
              { label: 'Upload Startups', table: 'iptif_startup_table' },
              { label: 'Upload Facilities', table: 'iptif_facilities_table' },
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
          <h2 style={{ textDecoration: 'underline', color: '#000', margin: 0, fontSize: '20px' }}>IPTIF Summary</h2>
          <ExportMenu
            elementId="iptif-summary-cards-container"
            data={[summary]}
            headers={['Total Projects', 'Total Programs', 'Total Startups']}
            keys={['total_projects', 'total_programs', 'total_startups']}
            filename="iptif_summary"
            title="IPTIF Summary"
          />
        </div>

        {/* ── Summary Cards ── */}
        <div id="iptif-summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          {[
            { view: 'projects', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: '0 10px 20px rgba(102,126,234,0.2)', label: 'Total Projects', value: summary.total_projects },
            { view: 'programs', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: '0 10px 20px rgba(240,147,251,0.2)', label: 'Total Programs', value: summary.total_programs },
            { view: 'startups', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: '0 10px 20px rgba(67,233,123,0.2)', label: 'Total Startups', value: summary.total_startups },
          ].map(({ view, bg, shadow, label, value }) => (
            <div
              key={view}
              className="iptif-summary-card"
              onClick={() => handleSummaryCard(view)}
              style={{ background: bg, boxShadow: shadow }}
            >
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>{label}</h3>
              <div className="metric-value">{formatNumber(value)}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
            </div>
          ))}
        </div>

        {/* ══════════════ UNIFIED CONTROL PANEL ══════════════ */}
        <div
          id="iptif-content-region"
          style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#333', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em' }}>
              Filters
            </h4>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {VIEWS.map(({ id, label, color: c, icon }) => {
              const active = viewType === id;
              return (
                <button
                  key={id}
                  className="iptif-tab-btn"
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

          <div className="iptif-filter-panel">
            <div style={{ padding: '0px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={clearFilters}
                  style={{ padding: '5px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'opacity 0.2s' }}
                >
                  Clear Filters
                </button>
              </div>
              {renderFilters()}
            </div>
          </div>

          <div style={{ height: '1px', background: '#e9ecef', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <span style={{ fontSize: '22px' }}>{currentView?.icon}</span>
                {currentView?.label}
              </h2>
              <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
                {viewType === 'projects' && 'Yearly trend of projects by scheme and status'}
                {viewType === 'programs' && 'Yearly trend of programs by type and association'}
                {viewType === 'startups' && 'Yearly growth of startups by domain and status'}
                {viewType === 'facilities' && 'Yearly revenue trend from facilities by type'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {['bar', 'trend', 'table'].map(mode => {
                const modeActive = chartMode === mode;
                const modeLabel = mode === 'bar' ? 'Bar' : mode === 'trend' ? 'Trend' : 'Table';
                return (
                  <button
                    key={mode}
                    className="iptif-mode-btn"
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
                  ? (viewType === 'projects' ? ['Project Name', 'Scheme', 'Status', 'Start Date']
                    : viewType === 'programs' ? ['Program Name', 'Type', 'Association', 'Target Audience', 'Attendees']
                      : viewType === 'startups' ? ['Startup Name', 'Domain', 'Status', 'Jobs', 'Revenue']
                        : ['Facility Name', 'Type', 'Availability', 'Financial Year', 'Revenue'])
                  : ['Year', 'Count']}
                keys={chartMode === 'table'
                  ? (viewType === 'projects' ? ['project_name', 'scheme', 'status', 'start_date']
                    : viewType === 'programs' ? ['program_name', 'type', 'association', 'targetted_audi', 'no_of_attendees']
                      : viewType === 'startups' ? ['startup_name', 'domain', 'status', 'number_of_jobs', 'revenue']
                        : ['facility_name', 'facility_type', 'availability_status', 'financial_year', 'revenue_made'])
                  : ['year', 'count']}
                filename={`iptif_${viewType}_${chartMode}`}
                title={`${currentView?.label} — ${chartMode === 'table' ? 'Directory' : chartMode === 'bar' ? 'Bar Chart' : 'Trend'}`}
              />
            </div>
          </div>

          {/* ── Animated content region ── */}
          <div key={animKey} className="iptif-anim" id={exportId}>
            {chartMode === 'table'
              ? renderTable()
              : renderChart(trendData, color, trendLabel)
            }
          </div>
        </div>
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

export default IptifSection;