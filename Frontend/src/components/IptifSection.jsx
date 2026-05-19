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
  fetchIptifSummary,
  fetchIptifProjects,
  fetchIptifPrograms,
  fetchIptifStartups,
  fetchIptifFacilities,
  fetchIptifFilterOptions
} from '../services/iptifStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import './Page.css';
import './PeopleCampus.css';
import './IptifSection.css';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const CONTENT_HEIGHT = 480;
const TABLE_BODY_HEIGHT = CONTENT_HEIGHT - 44;

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

const VIEWS = [
  { id: 'projects',   label: 'Projects Trend',    color: '#667eea', icon: '&#128202;' },
  { id: 'programs',   label: 'Programs Trend',    color: '#f093fb', icon: '&#127891;' },
  { id: 'startups',   label: 'Startups Growth',   color: '#43e97b', icon: '&#128640;' },
  { id: 'facilities', label: 'Facilities Revenue', color: '#f97316', icon: '&#127981;' },
];

function IptifSection({ user, isPublicView = false }) {
  injectStyle();

  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isRestricted = typeof user === 'undefined' || user?.role_id === 0;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 14;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [viewType, setViewType] = useState('projects');
  const [chartMode, setChartMode] = useState('bar');

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
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  const contentHeight = chartIsMobile ? 280 : 480;

  const [animKey, setAnimKey] = useState(0);
  const bump = useCallback(() => setAnimKey(k => k + 1), []);

  const serializedProjectFilters = JSON.stringify(projectFilters);
  useEffect(() => {
    const load = async () => {
      try {
        const [sumData, filterOps] = await Promise.all([
          fetchIptifSummary(token),
          fetchIptifFilterOptions(projectFilters, token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) { setError(err.message || 'Failed to initialize IPTIF data'); }
    };
    load();
  }, [serializedProjectFilters, projectFilters, token, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingProjects(true);
    fetchIptifProjects(projectFilters, token)
      .then(r => { if (m && r) { setProjectsTrend(r.trend || []); setProjectsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingProjects(false); });
    return () => { m = false; };
  }, [token, projectFilters, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingPrograms(true);
    fetchIptifPrograms(programFilters, token)
      .then(r => { if (m && r) { setProgramsTrend(r.trend || []); setProgramsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingPrograms(false); });
    return () => { m = false; };
  }, [token, programFilters, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingStartups(true);
    fetchIptifStartups(startupFilters, token)
      .then(r => { if (m && r) { setStartupsTrend(r.trend || []); setStartupsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingStartups(false); });
    return () => { m = false; };
  }, [token, startupFilters, uploadVersion]);

  useEffect(() => {
    let m = true;
    setLoadingFacilities(true);
    fetchIptifFacilities(facilityFilters, token)
      .then(r => { if (m && r) { setFacilitiesTrend(r.trend || []); setFacilitiesTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingFacilities(false); });
    return () => { m = false; };
  }, [token, facilityFilters, uploadVersion]);

  const handleFilterChange = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));
  const switchView = (id) => { setViewType(id); bump(); };
  const switchMode = (mode) => { setChartMode(mode); bump(); };

  const handleSummaryCard = (view) => {
    setViewType(view);
    setChartMode(isRestricted ? 'bar' : 'table');
    bump();
    setTimeout(() => {
      document.getElementById('iptif-content-region')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const IptifTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="iptif-tooltip">
          <p className="iptif-tooltip-year">Year: {label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="iptif-tooltip-entry" style={{ color: entry.color }}>{entry.name}: {formatNumber(entry.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = (data, color, name) => (
    <div
      className="clickable-chart iptif-chart-box"
      style={{ height: `${contentHeight}px` }}
      onClick={() => setExpandedChart({
        title: `${currentView?.label} Trend`,
        content: (
          <ResponsiveContainer width="100%" height={500}>
            {chartMode === 'bar' ? (
              <BarChart data={data} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                <Tooltip content={<IptifTooltip />} />
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
                <Tooltip content={<IptifTooltip />} />
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
        <div className="iptif-no-data-overlay">
          <span className="iptif-no-data-icon">&#128202;</span>
          <p className="iptif-no-data-text">No data available for the selected filters.</p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={contentHeight} minWidth={0}>
        {chartMode === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: chartIsMobile ? 20 : 40, bottom: chartIsMobile ? 50 : 20 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="year" stroke="#666" interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} tick={{ fontSize: 11 }} />
            <YAxis stroke="#666" tick={{ fontSize: 11 }} />
            <Tooltip content={<IptifTooltip />} />
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
            <Tooltip content={<IptifTooltip />} />
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
    if (viewType === 'projects') return (
      <div className="iptif-filter-grid">
        <div>
          <label className="iptif-filter-label">Scheme</label>
          <select value={projectFilters.scheme} onChange={e => handleFilterChange(setProjectFilters)('scheme', e.target.value)} className="iptif-filter-select">
            <option value="All">All Schemes</option>
            {filterOptions.projects.schemes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="iptif-filter-label">Status</label>
          <select value={projectFilters.status} onChange={e => handleFilterChange(setProjectFilters)('status', e.target.value)} className="iptif-filter-select">
            <option value="All">All Statuses</option>
            {filterOptions.projects.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="iptif-filter-label">Start Year</label>
          <select value={projectFilters.year} onChange={e => handleFilterChange(setProjectFilters)('year', e.target.value)} className="iptif-filter-select">
            <option value="All">All Years</option>
            {filterOptions.projects.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'programs') return (
      <div className="iptif-filter-grid">
        <div>
          <label className="iptif-filter-label">Type</label>
          <select value={programFilters.type} onChange={e => handleFilterChange(setProgramFilters)('type', e.target.value)} className="iptif-filter-select">
            <option value="All">All Types</option>
            {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="iptif-filter-label">Association</label>
          <select value={programFilters.association} onChange={e => handleFilterChange(setProgramFilters)('association', e.target.value)} className="iptif-filter-select">
            <option value="All">All Associations</option>
            {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'startups') return (
      <div className="iptif-filter-grid">
        <div>
          <label className="iptif-filter-label">Domain</label>
          <select value={startupFilters.domain} onChange={e => handleFilterChange(setStartupFilters)('domain', e.target.value)} className="iptif-filter-select">
            <option value="All">All Domains</option>
            {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="iptif-filter-label">Status</label>
          <select value={startupFilters.status} onChange={e => handleFilterChange(setStartupFilters)('status', e.target.value)} className="iptif-filter-select">
            <option value="All">All Statuses</option>
            {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    );
    if (viewType === 'facilities') return (
      <div>
        <label className="iptif-filter-label">Facility Type</label>
        <select value={facilityFilters.facility_type} onChange={e => handleFilterChange(setFacilityFilters)('facility_type', e.target.value)} className="iptif-filter-select iptif-filter-select--narrow">
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

  const TableShell = ({ headerBg, columns, children }) => (
    <div className="iptif-table-shell" style={{ height: `${contentHeight}px` }}>
      <div className="iptif-table-header" style={{ backgroundColor: headerBg, gridTemplateColumns: columns }}>
        {children[0]}
      </div>
      <div className="iptif-table-body">
        {children[1]}
      </div>
    </div>
  );

  const renderTable = () => {
    if (viewType === 'projects') {
      if (!projectsTable.length && !loadingProjects) return <EmptyState />;
      if (chartIsMobile) {
        return (
          <div className="iptif-mobile-list" style={{ maxHeight: `${contentHeight}px` }}>
            {projectsTable.map((row, idx) => (
              <div key={idx} className="iptif-mobile-card">
                <div className="iptif-mobile-card-title">{row.project_name}</div>
                <div className="iptif-mobile-card-fields">
                  <div><span className="iptif-field-label">Scheme:</span><br />{row.scheme}</div>
                  <div><span className="iptif-field-label">Status:</span><br /><span className={`iptif-status-badge iptif-status-badge--sm${row.status === 'Ongoing' ? ' iptif-status-badge--ongoing' : ' iptif-status-badge--other'}`}>{row.status}</span></div>
                  <div><span className="iptif-field-label">Start Date:</span><br />{row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <TableShell headerBg="#667eea" columns="2fr 1.5fr 1fr 1.2fr">
          {[
            <><div>Project Name</div><div>Scheme</div><div>Status</div><div>Start Date</div></>,
            <>
              {projectsTable.map((row, idx) => (
                <div key={idx} className="iptif-table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="iptif-table-row-name">{row.project_name}</div>
                  <div>{row.scheme}</div>
                  <div><span className={`iptif-status-badge iptif-status-badge--md${row.status === 'Ongoing' ? ' iptif-status-badge--ongoing' : ' iptif-status-badge--other'}`}>{row.status}</span></div>
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
      if (chartIsMobile) {
        return (
          <div className="iptif-mobile-list" style={{ maxHeight: `${contentHeight}px` }}>
            {programsTable.map((row, idx) => (
              <div key={idx} className="iptif-mobile-card">
                <div className="iptif-mobile-card-title">{row.program_name}</div>
                <div className="iptif-mobile-card-fields">
                  <div><span className="iptif-field-label">Type:</span><br />{row.type}</div>
                  <div><span className="iptif-field-label">Association:</span><br />{row.association}</div>
                  <div className="span-full"><span className="iptif-field-label">Target Audience:</span><br />{row.targetted_audi}</div>
                  <div><span className="iptif-field-label">Attendees:</span><br />{row.no_of_attendees}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <TableShell headerBg="#f093fb" columns="2fr 1.2fr 1.2fr 1.5fr 1fr">
          {[
            <><div>Program Name</div><div>Type</div><div>Association</div><div>Target Audience</div><div>Attendees</div></>,
            <>
              {programsTable.map((row, idx) => (
                <div key={idx} className="iptif-table-row" style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr 1fr', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="iptif-table-row-name">{row.program_name}</div>
                  <div>{row.type}</div><div>{row.association}</div><div>{row.targetted_audi}</div><div>{row.no_of_attendees}</div>
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
          <div className="iptif-mobile-list" style={{ maxHeight: `${contentHeight}px` }}>
            {startupsTable.map((row, idx) => (
              <div key={idx} className="iptif-mobile-card">
                <div className="iptif-mobile-card-title">{row.startup_name}</div>
                <div className="iptif-mobile-card-fields">
                  <div><span className="iptif-field-label">Domain:</span><br />{row.domain}</div>
                  <div><span className="iptif-field-label">Status:</span><br />{row.status}</div>
                  <div><span className="iptif-field-label">Jobs Created:</span><br />{row.number_of_jobs}</div>
                  <div><span className="iptif-field-label">Revenue:</span><br />{row.revenue ? `&#8377;${formatNumber(row.revenue)}` : '-'}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <TableShell headerBg="#43e97b" columns="1.8fr 1.5fr 1fr 1fr 1.2fr">
          {[
            <><div>Startup Name</div><div>Domain</div><div>Status</div><div>Jobs Created</div><div>Revenue (&#8377;)</div></>,
            <>
              {startupsTable.map((row, idx) => (
                <div key={idx} className="iptif-table-row" style={{ gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="iptif-table-row-name">{row.startup_name}</div>
                  <div>{row.domain}</div><div>{row.status}</div><div>{row.number_of_jobs}</div>
                  <div>{row.revenue ? `&#8377;${formatNumber(row.revenue)}` : '-'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
    if (viewType === 'facilities') {
      if (!facilitiesTable.length && !loadingFacilities) return <EmptyState />;
      if (chartIsMobile) {
        return (
          <div className="iptif-mobile-list" style={{ maxHeight: `${contentHeight}px` }}>
            {facilitiesTable.map((row, idx) => (
              <div key={idx} className="iptif-mobile-card">
                <div className="iptif-mobile-card-title">{row.facility_name}</div>
                <div className="iptif-mobile-card-fields">
                  <div><span className="iptif-field-label">Type:</span><br />{row.facility_type}</div>
                  <div><span className="iptif-field-label">Availability:</span><br />{row.availability_status}</div>
                  <div><span className="iptif-field-label">Financial Year:</span><br />{row.financial_year}</div>
                  <div><span className="iptif-field-label">Revenue:</span><br />{row.revenue_made ? `&#8377;${formatNumber(row.revenue_made)}` : '0'}</div>
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <TableShell headerBg="#f97316" columns="2fr 1.5fr 1.2fr 1.2fr 1.2fr">
          {[
            <><div>Facility Name</div><div>Type</div><div>Availability</div><div>Financial Year</div><div>Revenue (&#8377;)</div></>,
            <>
              {facilitiesTable.map((row, idx) => (
                <div key={idx} className="iptif-table-row" style={{ gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr 1.2fr', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <div className="iptif-table-row-name">{row.facility_name}</div>
                  <div>{row.facility_type}</div><div>{row.availability_status}</div><div>{row.financial_year}</div>
                  <div>{row.revenue_made ? formatNumber(row.revenue_made) : '0'}</div>
                </div>
              ))}
            </>
          ]}
        </TableShell>
      );
    }
  };

  const trendData = viewType === 'projects' ? projectsTrend : viewType === 'programs' ? programsTrend : viewType === 'startups' ? startupsTrend : facilitiesTrend;
  const trendLabel = viewType === 'projects' ? 'Projects Count' : viewType === 'programs' ? 'Programs Count' : viewType === 'startups' ? 'Startups Count' : 'Revenue (&#8377;)';
  const exportId = `iptif-${viewType}-chart-container`;
  const exportData = chartMode === 'table' ? (viewType === 'projects' ? projectsTable : viewType === 'programs' ? programsTable : viewType === 'startups' ? startupsTable : facilitiesTable) : trendData;

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            &#8592; Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <h1 className="iptif-h1">IIT Palakkad Technology IHub Foundation (IPTIF)</h1>

        {!isReadOnlyView && isAdmin && (
          <div className="iptif-upload-row">
            {[
              { label: 'Upload Projects',   table: 'iptif_projects_table' },
              { label: 'Upload Programs',   table: 'iptif_program_table' },
              { label: 'Upload Startups',   table: 'iptif_startup_table' },
              { label: 'Upload Facilities', table: 'iptif_facilities_table' },
            ].map(({ label, table }) => (
              <button key={table} className="page-upload-btn" onClick={() => { setActiveUploadTable(table); setIsUploadModalOpen(true); }}>
                &#128228; {label}
              </button>
            ))}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="iptif-export-row">
          <ExportMenu
            elementId="iptif-summary-cards-container"
            data={[summary]}
            headers={['Total Projects', 'Total Programs', 'Total Startups']}
            keys={['total_projects', 'total_programs', 'total_startups']}
            filename="iptif_summary"
            title="IPTIF Summary"
          />
        </div>

        <div id="iptif-summary-cards-container" className="iptif-cards-grid">
          {[
            { view: 'projects',  bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: '0 10px 20px rgba(102,126,234,0.2)', label: 'Total Projects',  value: summary.total_projects },
            { view: 'programs',  bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: '0 10px 20px rgba(240,147,251,0.2)', label: 'Total Programs',  value: summary.total_programs },
            { view: 'startups',  bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: '0 10px 20px rgba(67,233,123,0.2)',  label: 'Total Startups',  value: summary.total_startups },
          ].map(({ view, bg, shadow, label, value }) => (
            <div
              key={view}
              className="iptif-summary-card"
              onClick={() => handleSummaryCard(view)}
              style={{ background: bg, boxShadow: shadow }}
            >
              <h3>{label}</h3>
              <div className="metric-value">{formatNumber(value)}</div>
              <div className="iptif-summary-card-footer">Click to view directory &#8594;</div>
            </div>
          ))}
        </div>

        <div id="iptif-content-region" className="iptif-content-panel">
          <div className="iptif-filter-heading-row">
            <h4 className="iptif-filter-h4">Filters</h4>
          </div>

          <div className="iptif-tabs-row">
            {VIEWS.filter(v => !isRestricted || v.id !== 'facilities').map(({ id, label, color: c, icon }) => {
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
                  <span className="iptif-tab-icon" dangerouslySetInnerHTML={{ __html: icon }} />{label}
                </button>
              );
            })}
          </div>

          <div className="iptif-filter-panel">
            <div className="iptif-filter-inner">
              <div className="iptif-filter-end-row">
                <button onClick={clearFilters} className="iptif-clear-btn">Clear Filters</button>
              </div>
              {renderFilters()}
            </div>
          </div>

          <div className="iptif-divider" />

          <div className="iptif-chart-header-row">
            <div>
              <h2 className="iptif-chart-h2">
                <span className="iptif-chart-icon" dangerouslySetInnerHTML={{ __html: currentView?.icon }} />
                {currentView?.label}
              </h2>
              <p className="iptif-chart-desc">
                {viewType === 'projects'   && 'Yearly trend of projects by scheme and status'}
                {viewType === 'programs'   && 'Yearly trend of programs by type and association'}
                {viewType === 'startups'   && 'Yearly growth of startups by domain and status'}
                {viewType === 'facilities' && 'Yearly revenue trend from facilities by type'}
              </p>
            </div>
            <div className="iptif-mode-row">
              {['bar', 'trend', 'table']
                .filter(mode => !isRestricted || mode !== 'table')
                .map(mode => {
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
                  ? (viewType === 'projects'   ? ['Project Name', 'Scheme', 'Status', 'Start Date']
                    : viewType === 'programs'  ? ['Program Name', 'Type', 'Association', 'Target Audience', 'Attendees']
                    : viewType === 'startups'  ? ['Startup Name', 'Domain', 'Status', 'Jobs', 'Revenue']
                    : ['Facility Name', 'Type', 'Availability', 'Financial Year', 'Revenue'])
                  : ['Year', 'Count']}
                keys={chartMode === 'table'
                  ? (viewType === 'projects'   ? ['project_name', 'scheme', 'status', 'start_date']
                    : viewType === 'programs'  ? ['program_name', 'type', 'association', 'targetted_audi', 'no_of_attendees']
                    : viewType === 'startups'  ? ['startup_name', 'domain', 'status', 'number_of_jobs', 'revenue']
                    : ['facility_name', 'facility_type', 'availability_status', 'financial_year', 'revenue_made'])
                  : ['year', 'count']}
                filename={`iptif_${viewType}_${chartMode}`}
                title={`${currentView?.label} — ${chartMode === 'table' ? 'Directory' : chartMode === 'bar' ? 'Bar Chart' : 'Trend'}`}
              />
            </div>
          </div>

          <div key={animKey} className="iptif-anim" id={exportId}>
            {chartMode === 'table' && !isRestricted
              ? renderTable()
              : renderChart(trendData, color, trendLabel)
            }
          </div>
        </div>

        <div className="iptif-cta-banner">
          <div className="iptif-cta-left">
            <div>
              <h3 className="iptif-cta-h3">Explore More on IPTIF</h3>
              <p className="iptif-cta-p">Discover how IPTIF at IIT Palakkad is fostering innovation, incubation, and entrepreneurial excellence at IPTIF IIT Palakkad</p>
            </div>
          </div>
          <a
            href="https://iptif.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="iptif-cta-link"
          >
            Visit iptif.tech &#8594;
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
    <div className="iptif-empty-state" style={{ height: `${CONTENT_HEIGHT}px` }}>
      <span className="iptif-empty-icon">&#128193;</span>
      <p className="iptif-empty-text">{msg || 'No data available for the selected filters.'}</p>
    </div>
  );
}

export default IptifSection;
