import { useState, useEffect } from 'react';
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
  Legend
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

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function IptifSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [viewType, setViewType] = useState('projects');
  const [chartMode, setChartMode] = useState('bar');
  const [repoMode, setRepoMode] = useState(false);

  const openRepo = (view) => { setViewType(view); setRepoMode(true); };

  const [summary, setSummary] = useState({ total_projects: 0, total_programs: 0, total_startups: 0 });

  // Per-view data (always mounted)
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

  // Per-view filter states (preserved across view switches)
  const [projectFilters, setProjectFilters] = useState({ scheme: 'All', status: 'All', year: 'All' });
  const [programFilters, setProgramFilters] = useState({ type: 'All', association: 'All' });
  const [startupFilters, setStartupFilters] = useState({ domain: 'All', status: 'All' });
  const [facilityFilters, setFacilityFilters] = useState({ facility_type: 'All' });

  // Per-view loading states
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingStartups, setLoadingStartups] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const [error, setError] = useState(null);

  // Initial summary + filter options load
  useEffect(() => {
    if (!token) return;
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
    if (!token) return;
    let m = true;
    setLoadingProjects(true);
    fetchIptifProjects(projectFilters, token)
      .then(r => { if (m && r) { setProjectsTrend(r.trend || []); setProjectsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingProjects(false); });
    return () => { m = false; };
  }, [token, projectFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    let m = true;
    setLoadingPrograms(true);
    fetchIptifPrograms(programFilters, token)
      .then(r => { if (m && r) { setProgramsTrend(r.trend || []); setProgramsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingPrograms(false); });
    return () => { m = false; };
  }, [token, programFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    let m = true;
    setLoadingStartups(true);
    fetchIptifStartups(startupFilters, token)
      .then(r => { if (m && r) { setStartupsTrend(r.trend || []); setStartupsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingStartups(false); });
    return () => { m = false; };
  }, [token, startupFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    let m = true;
    setLoadingFacilities(true);
    fetchIptifFacilities(facilityFilters, token)
      .then(r => { if (m && r) { setFacilitiesTrend(r.trend || []); setFacilitiesTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingFacilities(false); });
    return () => { m = false; };
  }, [token, facilityFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));

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



  const barLineChart = (data, color, name) => (
    <div style={{ marginBottom: '40px', position: 'relative', minHeight: '380px' }}>
      {data.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
          <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
          <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No data available for the selected filters.</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? color : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
        <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? color : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
      </div>
      <ResponsiveContainer width="100%" height={350} minWidth={0}>
        {chartMode === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" stroke="#666" /><YAxis stroke="#666" />
            <Tooltip content={<CustomTooltip />} /><Legend />
            <Bar dataKey="count" name={name} fill={color} radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} /><YAxis stroke="#666" />
            <Tooltip content={<CustomTooltip />} /><Legend />
            <Line type="monotone" dataKey="count" name={name} stroke={color} strokeWidth={3} dot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <h1 style={{ marginBottom: '5px' }}>IPTIF</h1>

        {/* Upload Buttons */}
        {user && user.role_id === 3 && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => { setActiveUploadTable('iptif_projects_table'); setIsUploadModalOpen(true); }} style={{ padding: '8px 16px', backgroundColor: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Projects</button>
            <button onClick={() => { setActiveUploadTable('iptif_program_table'); setIsUploadModalOpen(true); }} style={{ padding: '8px 16px', backgroundColor: '#f093fb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Programs</button>
            <button onClick={() => { setActiveUploadTable('iptif_startup_table'); setIsUploadModalOpen(true); }} style={{ padding: '8px 16px', backgroundColor: '#43e97b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Startups</button>
            <button onClick={() => { setActiveUploadTable('iptif_facilities_table'); setIsUploadModalOpen(true); }} style={{ padding: '8px 16px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Facilities</button>
          </div>
        )}

        {error && <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          {[
            { view: 'projects', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: '0 10px 20px rgba(102,126,234,0.2)', label: 'Total Projects', value: summary.total_projects },
            { view: 'programs', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: '0 10px 20px rgba(240,147,251,0.2)', label: 'Total Programs', value: summary.total_programs },
            { view: 'startups', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: '0 10px 20px rgba(67,233,123,0.2)', label: 'Total Startups', value: summary.total_startups },
          ].map(({ view, bg, shadow, label, value }) => (
            <div key={view} onClick={() => openRepo(view)} style={{ background: bg, borderRadius: '20px', padding: '24px', boxShadow: shadow, color: 'white', cursor: 'pointer', transition: 'transform 0.2s' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>{label}</h3>
              <div className="metric-value">{formatNumber(value)}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
            </div>
          ))}
        </div>

        {/* View Selector Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {[
            { id: 'projects', label: 'Projects Trend', color: '#667eea', icon: '📊' },
            { id: 'programs', label: 'Programs Trend', color: '#f093fb', icon: '🎓' },
            { id: 'startups', label: 'Startups Growth', color: '#43e97b', icon: '🚀' },
            { id: 'facilities', label: 'Facilities Revenue', color: '#f97316', icon: '🏭' },
          ].map(({ id, label, color, icon }) => (
            <button key={id} onClick={() => setViewType(id)} style={{ padding: '12px 28px', backgroundColor: viewType === id ? color : 'white', color: viewType === id ? 'white' : '#333', border: viewType === id ? `2px solid ${color}` : '2px solid #dee2e6', borderRadius: '50px', cursor: 'pointer', fontSize: '15px', fontWeight: viewType === id ? '600' : '500', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: viewType === id ? `0 6px 16px ${color}40` : 'none' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* Repo back button */}
        {repoMode && (
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => setRepoMode(false)} style={{ padding: '8px 16px', backgroundColor: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>← Back to Dashboard</button>
          </div>
        )}

        {/* ── PERSISTENT VIEW CONTAINERS ── */}
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>

          {/* PROJECTS */}
          <div style={{ display: viewType === 'projects' ? 'block' : 'none', position: 'relative' }}>

            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '24px' }}>📊</span> Projects Trend</h2>
              <p style={{ color: '#666', margin: '0' }}>Yearly trend of projects by scheme and status</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                <button onClick={() => setProjectFilters({ scheme: 'All', status: 'All', year: 'All' })} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Scheme</label>
                  <select value={projectFilters.scheme} onChange={(e) => handleFilterChange(setProjectFilters)('scheme', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Schemes</option>
                    {filterOptions.projects.schemes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Status</label>
                  <select value={projectFilters.status} onChange={(e) => handleFilterChange(setProjectFilters)('status', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Statuses</option>
                    {filterOptions.projects.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Start Year</label>
                  <select value={projectFilters.year} onChange={(e) => handleFilterChange(setProjectFilters)('year', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Years</option>
                    {filterOptions.projects.years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select></div>
              </div>
            </div>
            {!repoMode && barLineChart(projectsTrend, '#667eea', 'Projects Count')}
            <div style={{ position: 'relative', minHeight: '60px' }}>
              {projectsTable.length === 0 && !loadingProjects && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                  <p style={{ color: '#888', fontWeight: 500 }}>No projects match the current filters.</p>
                </div>
              )}
              {projectsTable.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: '15px' }}>Projects Directory</h3>
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#667eea', color: 'white', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr', gap: '8px', padding: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                      <div>Project Name</div><div>Scheme</div><div>Status</div><div>Start Date</div>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {projectsTable.map((row, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                          <div style={{ fontWeight: '500' }}>{row.project_name}</div>
                          <div>{row.scheme}</div>
                          <div><span style={{ backgroundColor: row.status === 'Ongoing' ? '#e0f2fe' : '#f1f5f9', color: row.status === 'Ongoing' ? '#0284c7' : '#475569', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', display: 'inline-block' }}>{row.status}</span></div>
                          <div>{row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PROGRAMS */}
          <div style={{ display: viewType === 'programs' ? 'block' : 'none', position: 'relative' }}>

            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '24px' }}>🎓</span> Programs Trend</h2>
              <p style={{ color: '#666', margin: '0' }}>Yearly trend of programs by type and association</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                <button onClick={() => setProgramFilters({ type: 'All', association: 'All' })} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Type</label>
                  <select value={programFilters.type} onChange={(e) => handleFilterChange(setProgramFilters)('type', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Types</option>
                    {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Association</label>
                  <select value={programFilters.association} onChange={(e) => handleFilterChange(setProgramFilters)('association', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Associations</option>
                    {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
                  </select></div>
              </div>
            </div>
            {!repoMode && barLineChart(programsTrend, '#f093fb', 'Programs Count')}
            {programsTable.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '15px' }}>Programs Directory</h3>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f093fb', color: 'white', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr 1fr', gap: '8px', padding: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                    <div>Program Name</div><div>Type</div><div>Association</div><div>Target Audience</div><div>Attendees</div>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {programsTable.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr 1fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                        <div style={{ fontWeight: '500' }}>{row.program_name}</div><div>{row.type}</div><div>{row.association}</div><div>{row.targetted_audi}</div><div>{row.no_of_attendees}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STARTUPS */}
          <div style={{ display: viewType === 'startups' ? 'block' : 'none', position: 'relative' }}>

            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '24px' }}>🚀</span> Startups Growth</h2>
              <p style={{ color: '#666', margin: '0' }}>Yearly growth of startups by domain and status</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                <button onClick={() => setStartupFilters({ domain: 'All', status: 'All' })} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Domain</label>
                  <select value={startupFilters.domain} onChange={(e) => handleFilterChange(setStartupFilters)('domain', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Domains</option>
                    {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Status</label>
                  <select value={startupFilters.status} onChange={(e) => handleFilterChange(setStartupFilters)('status', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Statuses</option>
                    {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
            </div>
            {!repoMode && barLineChart(startupsTrend, '#43e97b', 'Startups Count')}
            {startupsTable.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '15px' }}>Startups Directory</h3>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#43e97b', color: 'white', display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr', gap: '8px', padding: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                    <div>Startup Name</div><div>Domain</div><div>Status</div><div>Jobs Created</div><div>Revenue (₹)</div>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {startupsTable.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                        <div style={{ fontWeight: '500' }}>{row.startup_name}</div><div>{row.domain}</div><div>{row.status}</div><div>{row.number_of_jobs}</div>
                        <div>{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FACILITIES */}
          <div style={{ display: viewType === 'facilities' ? 'block' : 'none', position: 'relative' }}>

            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '24px' }}>🏭</span> Facilities Revenue</h2>
              <p style={{ color: '#666', margin: '0' }}>Yearly revenue trend from facilities by type</p>
            </div>
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                <button onClick={() => setFacilityFilters({ facility_type: 'All' })} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Facility Type</label>
                  <select value={facilityFilters.facility_type} onChange={(e) => handleFilterChange(setFacilityFilters)('facility_type', e.target.value)} style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                    <option value="All">All Facility Types</option>
                    {filterOptions.facilities.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
            </div>
            {!repoMode && barLineChart(facilitiesTrend, '#f97316', 'Revenue (₹)')}
            {facilitiesTable.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '15px' }}>Facilities Directory</h3>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f97316', color: 'white', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr 1.2fr', gap: '8px', padding: '12px', fontWeight: 'bold', fontSize: '13px' }}>
                    <div>Facility Name</div><div>Type</div><div>Availability</div><div>Financial Year</div><div>Revenue (₹)</div>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {facilitiesTable.map((row, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr 1.2fr', gap: '8px', padding: '12px', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0', fontSize: '13px', alignItems: 'center' }}>
                        <div style={{ fontWeight: '500' }}>{row.facility_name}</div><div>{row.facility_type}</div><div>{row.availability_status}</div><div>{row.financial_year}</div>
                        <div>{row.revenue_made ? formatNumber(row.revenue_made) : '0'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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

export default IptifSection;