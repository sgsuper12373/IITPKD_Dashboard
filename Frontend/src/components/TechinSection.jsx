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
  fetchTechinSummary,
  fetchTechinPrograms,
  fetchTechinSkillDev,
  fetchTechinStartups,
  fetchTechinFilterOptions
} from '../services/techinStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './DataUploadModal';
import './Page.css';
import './PeopleCampus.css';
import '../DesignSystem.css';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function TechinSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [viewType, setViewType] = useState('programs');
  const [chartMode, setChartMode] = useState('bar');
  const [repoMode, setRepoMode] = useState(false);

  const openRepo = (view) => { setViewType(view); setRepoMode(true); };

  // Independent filter states per view
  const [programFilters, setProgramFilters] = useState({ type: 'All', association: 'All' });
  const [skillDevFilters, setSkillDevFilters] = useState({ category: 'All', association: 'All' });
  const [startupFilters, setStartupFilters] = useState({ domain: 'All', status: 'All' });

  const [summary, setSummary] = useState({
    total_programs: 0,
    total_skill_dev_programs: 0,
    total_startups: 0,
    total_startup_revenue: 0,
    highest_revenue: 0,
    lowest_revenue: 0,
    average_revenue: 0
  });

  // Per-view data (always mounted)
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

  // Per-view loading states
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingSkillDev, setLoadingSkillDev] = useState(false);
  const [loadingStartups, setLoadingStartups] = useState(false);

  const [error, setError] = useState(null);

  // Initial load
  useEffect(() => {
    if (!token) return;
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

  // Programs data
  useEffect(() => {
    if (!token) return;
    let m = true;
    setLoadingPrograms(true);
    fetchTechinPrograms(programFilters, token)
      .then(r => { if (m && r) { setProgramsTrend(r.trend || []); setProgramsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingPrograms(false); });
    return () => { m = false; };
  }, [token, programFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Skill Dev data
  useEffect(() => {
    if (!token) return;
    let m = true;
    setLoadingSkillDev(true);
    fetchTechinSkillDev(skillDevFilters, token)
      .then(r => { if (m && r) { setSkillDevTrend(r.trend || []); setSkillDevTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingSkillDev(false); });
    return () => { m = false; };
  }, [token, skillDevFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Startups data
  useEffect(() => {
    if (!token) return;
    let m = true;
    setLoadingStartups(true);
    fetchTechinStartups(startupFilters, token)
      .then(r => { if (m && r) { setStartupsTrend(r.trend || []); setStartupsTable(r.data || []); } })
      .catch(err => { if (m) setError(err.message); })
      .finally(() => { if (m) setLoadingStartups(false); });
    return () => { m = false; };
  }, [token, startupFilters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));

  const getViewColor = () => {
    if (viewType === 'programs') return '#667eea';
    if (viewType === 'skillDev') return '#f093fb';
    return '#43e97b';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>Year: {label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ margin: '0', color: entry.color }}>Count: {formatNumber(entry.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };




  const barLineChart = (data, color, name) => (
    <div style={{ marginBottom: '40px', position: 'relative', minHeight: '400px' }}>
      {data.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
          <span style={{ fontSize: '40px', marginBottom: '10px' }}>📈</span>
          <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No data available for the selected filters.</p>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? color : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
        <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? color : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
      </div>
      <ResponsiveContainer width="100%" height={400} minWidth={0}>
        {chartMode === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} /><XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} /><YAxis stroke="#666" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="count" name={name} fill={color} radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} /><XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} /><YAxis stroke="#666" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="count" name={name} stroke={color} strokeWidth={3} dot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Chart Stats */}
      <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}><div style={{ color, fontWeight: 'bold', fontSize: '32px' }}>{data.reduce((s, d) => s + d.count, 0)}</div><div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Total</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '32px' }}>{data.length}</div><div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Years Covered</div></div>
        <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '32px' }}>{data.length > 0 ? Math.max(...data.map(d => d.count)) : 0}</div><div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Peak Year</div></div>
      </div>
    </div>
  );

  const renderTable = (tableData, viewId) => {
    const color = viewId === 'programs' ? '#667eea' : viewId === 'skillDev' ? '#f093fb' : '#43e97b';
    const headers = viewId === 'startups'
      ? ['Startup Name', 'Domain', 'Status', 'Jobs', 'Revenue']
      : ['Program Name', viewId === 'skillDev' ? 'Category' : 'Type', 'Association', 'Date', 'Attendees'];

    return (
      <div style={{ marginTop: '30px', position: 'relative', minHeight: '80px' }}>
        {tableData.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '12px', pointerEvents: 'none' }}>
            <p style={{ color: '#888', fontWeight: 500, fontSize: '15px' }}>No records found for the selected filters.</p>
          </div>
        )}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0', color: '#333', fontSize: '20px', fontWeight: '600' }}>Detailed Data</h3>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>{tableData.length} records found</p>
        </div>
        <div style={{ maxHeight: '550px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: '12px', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: color, color: 'white' }}>
                {headers.map(h => <th key={h} style={{ padding: '14px 12px', textAlign: 'left', fontSize: '14px' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                  {viewId === 'programs' && (
                    <>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{row.program_name}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.type}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.association}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.no_of_attendess || '0'}</td>
                    </>
                  )}
                  {viewId === 'skillDev' && (
                    <>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{row.program_name}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.category}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.association}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.no_of_attendess || '0'}</td>
                    </>
                  )}
                  {viewId === 'startups' && (
                    <>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{row.startup_name}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.domain}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{ backgroundColor: row.status === 'Active' ? '#dcfce7' : '#fef3c7', color: row.status === 'Active' ? '#166534' : '#92400e', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'inline-block' }}>{row.status}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>{row.number_of_jobs || '0'}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#059669', fontWeight: '600' }}>{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className="page-content performance-render-auto">
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation &amp; Entrepreneurship
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>{!isPublicView && <h1 style={{ margin: 0 }}>TechIn</h1>}</div>
          {user && user.role_id === 3 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setActiveUploadTable('techin_program_table'); setIsUploadModalOpen(true); }} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Programs</button>
              <button onClick={() => { setActiveUploadTable('techin_skill_development_program'); setIsUploadModalOpen(true); }} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Skill Dev</button>
              <button onClick={() => { setActiveUploadTable('techin_startup_table'); setIsUploadModalOpen(true); }} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>📤 Upload Startups</button>
            </div>
          )}
        </div>

        {error && <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

        {/* Summary Cards – Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '30px' }}>
          {[
            { view: 'programs', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: '0 15px 30px rgba(102,126,234,0.25)', icon: '📚', label: 'Total Programs', value: summary.total_programs },
            { view: 'skillDev', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', shadow: '0 15px 30px rgba(240,147,251,0.25)', icon: '🎯', label: 'Skill Dev Programs', value: summary.total_skill_dev_programs },
            { view: 'startups', bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', shadow: '0 15px 30px rgba(67,233,123,0.25)', icon: '🚀', label: 'Total Startups', value: summary.total_startups },
          ].map(({ view, bg, shadow, icon, label, value }) => (
            <div key={view} onClick={() => openRepo(view)} style={{ background: bg, borderRadius: '20px', padding: '28px', boxShadow: shadow, color: 'white', cursor: 'pointer', transition: 'transform 0.3s ease', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>{icon}</span>
                  <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>{label}</span>
                </div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>{formatNumber(value)}</div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue Cards – Row 2 */}
        <h3 style={{ marginTop: '0', marginBottom: '20px', color: '#333', fontSize: '18px', fontWeight: '600' }}>Startup Revenue Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
          {[
            { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: '0 8px 20px rgba(59,130,246,0.2)', label: 'Total Revenue', value: `₹${formatNumber(summary.total_startup_revenue)}` },
            { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: '0 8px 20px rgba(16,185,129,0.2)', label: 'Highest Revenue', value: `₹${formatNumber(summary.highest_revenue)}` },
            { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', shadow: '0 8px 20px rgba(245,158,11,0.2)', label: 'Average Revenue', value: `₹${formatNumber(summary.average_revenue)}` },
            { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', shadow: '0 8px 20px rgba(239,68,68,0.2)', label: 'Lowest Revenue', value: `₹${formatNumber(summary.lowest_revenue)}` },
          ].map(({ bg, shadow, label, value }) => (
            <div key={label} style={{ background: bg, borderRadius: '16px', padding: '24px', boxShadow: shadow, color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>{label}</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* View Selector */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {[
            { id: 'programs', label: 'Programs Trend', color: '#667eea', icon: '📊' },
            { id: 'skillDev', label: 'Skill Dev Trend', color: '#f093fb', icon: '🎯' },
            { id: 'startups', label: 'Startups Trend', color: '#43e97b', icon: '🚀' },
          ].map(({ id, label, color, icon }) => (
            <button key={id} onClick={() => setViewType(id)} style={{ padding: '12px 28px', backgroundColor: viewType === id ? color : 'white', color: viewType === id ? 'white' : '#333', border: viewType === id ? `2px solid ${color}` : '2px solid #dee2e6', borderRadius: '50px', cursor: 'pointer', fontSize: '15px', fontWeight: viewType === id ? '600' : '500', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: viewType === id ? `0 6px 16px ${color}40` : 'none' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* Repo back */}
        {repoMode && (
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => setRepoMode(false)} style={{ padding: '8px 16px', backgroundColor: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>← Back to Dashboard</button>
          </div>
        )}

        {/* ── PERSISTENT VIEW PANELS ── */}
        <div style={{ marginBottom: '30px', padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>

          {/* PROGRAMS */}
          <div style={{ display: viewType === 'programs' ? 'block' : 'none', position: 'relative' }}>

            {/* Filters */}
            <div className="filter-panel" style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: '0', color: '#333', fontSize: '16px', fontWeight: '600' }}>Filters for Programs View</h4>
                <button onClick={() => setProgramFilters({ type: 'All', association: 'All' })} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Type</label>
                  <select value={programFilters.type} onChange={(e) => handleFilterChange(setProgramFilters)('type', e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}>
                    <option value="All">All Types</option>
                    {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Association</label>
                  <select value={programFilters.association} onChange={(e) => handleFilterChange(setProgramFilters)('association', e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}>
                    <option value="All">All Associations</option>
                    {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
                  </select></div>
              </div>
            </div>
            {/* Chart header */}
            <div className="chart-header" style={{ marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px' }}><span style={{ fontSize: '28px' }}>📊</span> Programs Trend</h2>
              <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Yearly trend of programs over time.</p>
            </div>
            {!repoMode && barLineChart(programsTrend, '#667eea', 'Count')}
            {renderTable(programsTable, 'programs')}
          </div>

          {/* SKILL DEV */}
          <div style={{ display: viewType === 'skillDev' ? 'block' : 'none', position: 'relative' }}>

            <div className="filter-panel" style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: '0', color: '#333', fontSize: '16px', fontWeight: '600' }}>Filters for Skill Development View</h4>
                <button onClick={() => setSkillDevFilters({ category: 'All', association: 'All' })} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Category</label>
                  <select value={skillDevFilters.category} onChange={(e) => handleFilterChange(setSkillDevFilters)('category', e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}>
                    <option value="All">All Categories</option>
                    {filterOptions.skill_dev.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Association</label>
                  <select value={skillDevFilters.association} onChange={(e) => handleFilterChange(setSkillDevFilters)('association', e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}>
                    <option value="All">All Associations</option>
                    {filterOptions.skill_dev.associations.map(a => <option key={a} value={a}>{a}</option>)}
                  </select></div>
              </div>
            </div>
            <div className="chart-header" style={{ marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px' }}><span style={{ fontSize: '28px' }}>🎯</span> Skill Development Trend</h2>
              <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Yearly trend of skill development programs over time.</p>
            </div>
            {!repoMode && barLineChart(skillDevTrend, '#f093fb', 'Count')}
            {renderTable(skillDevTable, 'skillDev')}
          </div>

          {/* STARTUPS */}
          <div style={{ display: viewType === 'startups' ? 'block' : 'none', position: 'relative' }}>

            <div className="filter-panel" style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: '0', color: '#333', fontSize: '16px', fontWeight: '600' }}>Filters for Startups View</h4>
                <button onClick={() => setStartupFilters({ domain: 'All', status: 'All' })} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Clear Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Domain</label>
                  <select value={startupFilters.domain} onChange={(e) => handleFilterChange(setStartupFilters)('domain', e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}>
                    <option value="All">All Domains</option>
                    {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Status</label>
                  <select value={startupFilters.status} onChange={(e) => handleFilterChange(setStartupFilters)('status', e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}>
                    <option value="All">All Statuses</option>
                    {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
            </div>
            <div className="chart-header" style={{ marginBottom: '12px' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px' }}><span style={{ fontSize: '28px' }}>🚀</span> Startups Growth</h2>
              <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Yearly trend of startups over time.</p>
            </div>
            {!repoMode && barLineChart(startupsTrend, '#43e97b', 'Count')}
            {renderTable(startupsTable, 'startups')}
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

export default TechinSection;