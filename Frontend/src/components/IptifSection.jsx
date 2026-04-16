import { useState, useEffect, useMemo } from 'react';
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

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('projects'); // projects, programs, startups, facilities

  // Bar / Trend chart mode (shared across all views)
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'trend'

  // Repo/directory mode: true = show only table with back button
  const [repoMode, setRepoMode] = useState(false);

  const openRepo = (view) => {
    setViewType(view);
    setRepoMode(true);
  };

  const [summary, setSummary] = useState({
    total_projects: 0,
    total_programs: 0,
    total_startups: 0
  });

  const [trendData, setTrendData] = useState([]);
  const [tableData, setTableData] = useState([]);

  const [filterOptions, setFilterOptions] = useState({
    projects: { schemes: [], statuses: [], years: [] },
    programs: { types: [], associations: [] },
    startups: { domains: [], statuses: [] },
    facilities: { types: [] }
  });

  // Filters state broken down by view to preserve state across views
  const [projectFilters, setProjectFilters] = useState({ scheme: 'All', status: 'All', year: 'All' });
  const [programFilters, setProgramFilters] = useState({ type: 'All', association: 'All' });
  const [startupFilters, setStartupFilters] = useState({ domain: 'All', status: 'All' });
  const [facilityFilters, setFacilityFilters] = useState({ facility_type: 'All' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initial Data Load
  useEffect(() => {
    if (!token) return;
    const initialLoad = async () => {
      try {
        setLoading(true);
        const [sumData, filterOps] = await Promise.all([
          fetchIptifSummary(token),
          fetchIptifFilterOptions(token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) {
        setError(err.message || 'Failed to initialize IPTIF data');
      } finally {
        setLoading(false);
      }
    };
    initialLoad();
  }, [token, uploadVersion]);

  // Load specific view data
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadViewData = async () => {
      setLoading(true);
      setError(null);
      try {
        let result;
        if (viewType === 'projects') {
          result = await fetchIptifProjects(projectFilters, token);
        } else if (viewType === 'programs') {
          result = await fetchIptifPrograms(programFilters, token);
        } else if (viewType === 'startups') {
          result = await fetchIptifStartups(startupFilters, token);
        } else if (viewType === 'facilities') {
          result = await fetchIptifFacilities(facilityFilters, token);
        }

        if (isMounted && result) {
          setTrendData(result.trend || []);
          setTableData(result.data || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || `Failed to load ${viewType} data`);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadViewData();
    return () => { isMounted = false; };
  }, [token, viewType, projectFilters, programFilters, startupFilters, facilityFilters, uploadVersion]);

  // Handlers
  const handleFilterChange = (setter) => (field, value) => {
    setter(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    if (viewType === 'projects') setProjectFilters({ scheme: 'All', status: 'All', year: 'All' });
    if (viewType === 'programs') setProgramFilters({ type: 'All', association: 'All' });
    if (viewType === 'startups') setStartupFilters({ domain: 'All', status: 'All' });
    if (viewType === 'facilities') setFacilityFilters({ facility_type: 'All' });
  };

  // Custom Line Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>Year: {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '0', color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation & Entrepreneurship
          </button>
        )}

        <h1 style={{ marginBottom: '5px' }}>IPTIF</h1>

        {/* Upload Buttons - Moved to Top */}
        {user && user.role_id === 3 && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '20px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => { setActiveUploadTable('iptif_projects_table'); setIsUploadModalOpen(true); }}
              style={{ padding: '8px 16px', backgroundColor: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              📤 Upload Projects
            </button>
            <button
              onClick={() => { setActiveUploadTable('iptif_program_table'); setIsUploadModalOpen(true); }}
              style={{ padding: '8px 16px', backgroundColor: '#f093fb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              📤 Upload Programs
            </button>
            <button
              onClick={() => { setActiveUploadTable('iptif_startup_table'); setIsUploadModalOpen(true); }}
              style={{ padding: '8px 16px', backgroundColor: '#43e97b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              📤 Upload Startups
            </button>
            <button
              onClick={() => { setActiveUploadTable('iptif_facilities_table'); setIsUploadModalOpen(true); }}
              style={{ padding: '8px 16px', backgroundColor: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              📤 Upload Facilities
            </button>
          </div>
        )}

        {error && <div className="error-message" style={{
          padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px'
        }}>{error}</div>}

        {/* Summary Cards - Keeping original colors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          <div
            onClick={() => openRepo('projects')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px', padding: '24px', boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)', color: 'white',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>Total Projects</h3>
            <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{formatNumber(summary.total_projects)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
          </div>
          <div
            onClick={() => openRepo('programs')}
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '20px', padding: '24px', boxShadow: '0 10px 20px rgba(240, 147, 251, 0.2)', color: 'white',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>Total Programs</h3>
            <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{formatNumber(summary.total_programs)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
          </div>
          <div
            onClick={() => openRepo('startups')}
            style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: '20px', padding: '24px', boxShadow: '0 10px 20px rgba(67, 233, 123, 0.2)', color: 'white',
              cursor: 'pointer', transition: 'transform 0.2s'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', opacity: 0.9 }}>Total Startups</h3>
            <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{formatNumber(summary.total_startups)}</div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
          </div>
        </div>

        {/* Radio Buttons - Keeping original styling */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '30px',
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'transparent',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setViewType('projects')}
            style={{
              padding: '12px 28px',
              backgroundColor: viewType === 'projects' ? '#667eea' : 'white',
              color: viewType === 'projects' ? 'white' : '#333',
              border: viewType === 'projects' ? '2px solid #667eea' : '2px solid #dee2e6',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: viewType === 'projects' ? '600' : '500',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewType === 'projects' ? `0 6px 16px #667eea40` : 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>📊</span>
            Projects Trend
          </button>
          <button
            onClick={() => setViewType('programs')}
            style={{
              padding: '12px 28px',
              backgroundColor: viewType === 'programs' ? '#f093fb' : 'white',
              color: viewType === 'programs' ? 'white' : '#333',
              border: viewType === 'programs' ? '2px solid #f093fb' : '2px solid #dee2e6',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: viewType === 'programs' ? '600' : '500',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewType === 'programs' ? `0 6px 16px #f093fb40` : 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>🎓</span>
            Programs Trend
          </button>
          <button
            onClick={() => setViewType('startups')}
            style={{
              padding: '12px 28px',
              backgroundColor: viewType === 'startups' ? '#43e97b' : 'white',
              color: viewType === 'startups' ? 'white' : '#333',
              border: viewType === 'startups' ? '2px solid #43e97b' : '2px solid #dee2e6',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: viewType === 'startups' ? '600' : '500',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewType === 'startups' ? `0 6px 16px #43e97b40` : 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>🚀</span>
            Startups Growth
          </button>
          <button
            onClick={() => setViewType('facilities')}
            style={{
              padding: '12px 28px',
              backgroundColor: viewType === 'facilities' ? '#f97316' : 'white',
              color: viewType === 'facilities' ? 'white' : '#333',
              border: viewType === 'facilities' ? '2px solid #f97316' : '2px solid #dee2e6',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: viewType === 'facilities' ? '600' : '500',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: viewType === 'facilities' ? `0 6px 16px #f9731640` : 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>🏭</span>
            Facilities Revenue
          </button>
        </div>

        {/* Dynamic Views: Charts and Tables - Keeping original styling */}
        <div style={{ padding: '20px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loading-spinner" />
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {/* Repo mode back button */}
              {repoMode && (
                <div style={{ marginBottom: '16px' }}>
                  <button
                    onClick={() => setRepoMode(false)}
                    style={{
                      padding: '8px 16px', backgroundColor: '#667eea', color: '#fff',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                    }}
                  >
                    ← Back to Dashboard
                  </button>
                </div>
              )}

              {/* Projects View */}
              {viewType === 'projects' && (
                <div>
                  <div className="chart-header" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>📊</span> Projects Trend
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Yearly trend of projects by scheme and status
                    </p>
                  </div>

                  {/* Filters inside projects view */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                      <button
                        onClick={handleClearFilters}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="filter-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '12px'
                    }}>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Scheme</label>
                        <select
                          value={projectFilters.scheme}
                          onChange={(e) => handleFilterChange(setProjectFilters)('scheme', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Schemes</option>
                          {filterOptions.projects.schemes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Status</label>
                        <select
                          value={projectFilters.status}
                          onChange={(e) => handleFilterChange(setProjectFilters)('status', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Statuses</option>
                          {filterOptions.projects.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Start Year</label>
                        <select
                          value={projectFilters.year}
                          onChange={(e) => handleFilterChange(setProjectFilters)('year', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Years</option>
                          {filterOptions.projects.years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>Active Filters:</strong>{' '}
                      {projectFilters.scheme !== 'All' && <span style={{ marginRight: '8px' }}>📌 {projectFilters.scheme}</span>}
                      {projectFilters.status !== 'All' && <span style={{ marginRight: '8px' }}>⚡ {projectFilters.status}</span>}
                      {projectFilters.year !== 'All' && <span style={{ marginRight: '8px' }}>📅 {projectFilters.year}</span>}
                      {projectFilters.scheme === 'All' && projectFilters.status === 'All' && projectFilters.year === 'All' &&
                        <span>No filters applied</span>
                      }
                    </div>
                  </div>

                  {/* Bar/Trend Toggle + Chart */}
                  {!repoMode && trendData.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? '#667eea' : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
                        <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? '#667eea' : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        {chartMode === 'bar' ? (
                          <BarChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="count" name="Projects Count" fill="#667eea" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        ) : (
                          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="Projects Count" stroke="#667eea" strokeWidth={3} dot={{ r: 6, fill: '#667eea', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Scrollable Projects Table */}
                  {tableData.length > 0 && (
                    <div>
                      <h3 style={{ marginBottom: '15px' }}>Projects Directory</h3>
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#fff'
                      }}>
                        <div style={{
                          backgroundColor: '#667eea',
                          color: 'white',
                          display: 'grid',
                          gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr',
                          gap: '8px',
                          padding: '12px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10
                        }}>
                          <div>Project Name</div>
                          <div>Scheme</div>
                          <div>Status</div>
                          <div>Start Date</div>
                        </div>
                        <div style={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'auto'
                        }}>
                          {tableData.map((row, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1fr 1.2fr',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                                borderBottom: '1px solid #e0e0e0',
                                fontSize: '13px',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ fontWeight: '500' }}>{row.project_name}</div>
                              <div>{row.scheme}</div>
                              <div>
                                <span style={{
                                  backgroundColor: row.status === 'Ongoing' ? '#e0f2fe' : '#f1f5f9',
                                  color: row.status === 'Ongoing' ? '#0284c7' : '#475569',
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  display: 'inline-block'
                                }}>
                                  {row.status}
                                </span>
                              </div>
                              <div>{row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Programs View */}
              {viewType === 'programs' && (
                <div>
                  <div className="chart-header" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🎓</span> Programs Trend
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Yearly trend of programs by type and association
                    </p>
                  </div>

                  {/* Filters inside programs view */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                      <button
                        onClick={handleClearFilters}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="filter-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px'
                    }}>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Type</label>
                        <select
                          value={programFilters.type}
                          onChange={(e) => handleFilterChange(setProgramFilters)('type', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Types</option>
                          {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Association</label>
                        <select
                          value={programFilters.association}
                          onChange={(e) => handleFilterChange(setProgramFilters)('association', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Associations</option>
                          {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>Active Filters:</strong>{' '}
                      {programFilters.type !== 'All' && <span style={{ marginRight: '8px' }}>📌 {programFilters.type}</span>}
                      {programFilters.association !== 'All' && <span style={{ marginRight: '8px' }}>🤝 {programFilters.association}</span>}
                      {programFilters.type === 'All' && programFilters.association === 'All' &&
                        <span>No filters applied</span>
                      }
                    </div>
                  </div>

                  {/* Bar/Trend Toggle + Chart */}
                  {!repoMode && trendData.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? '#f093fb' : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
                        <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? '#f093fb' : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        {chartMode === 'bar' ? (
                          <BarChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="count" name="Programs Count" fill="#f093fb" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        ) : (
                          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="Programs Count" stroke="#f093fb" strokeWidth={3} dot={{ r: 6, fill: '#f093fb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Scrollable Programs Table */}
                  {tableData.length > 0 && (
                    <div>
                      <h3 style={{ marginBottom: '15px' }}>Programs Directory</h3>
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#fff'
                      }}>
                        <div style={{
                          backgroundColor: '#f093fb',
                          color: 'white',
                          display: 'grid',
                          gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr 1fr',
                          gap: '8px',
                          padding: '12px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10
                        }}>
                          <div>Program Name</div>
                          <div>Type</div>
                          <div>Association</div>
                          <div>Target Audience</div>
                          <div>Attendees</div>
                        </div>
                        <div style={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'auto'
                        }}>
                          {tableData.map((row, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.2fr 1.2fr 1.5fr 1fr',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                                borderBottom: '1px solid #e0e0e0',
                                fontSize: '13px',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ fontWeight: '500' }}>{row.program_name}</div>
                              <div>{row.type}</div>
                              <div>{row.association}</div>
                              <div>{row.targetted_audi}</div>
                              <div>{row.no_of_attendees}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Startups View */}
              {viewType === 'startups' && (
                <div>
                  <div className="chart-header" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🚀</span> Startups Growth
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Yearly growth of startups by domain and status
                    </p>
                  </div>

                  {/* Filters inside startups view */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                      <button
                        onClick={handleClearFilters}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="filter-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px'
                    }}>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Domain</label>
                        <select
                          value={startupFilters.domain}
                          onChange={(e) => handleFilterChange(setStartupFilters)('domain', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Domains</option>
                          {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Status</label>
                        <select
                          value={startupFilters.status}
                          onChange={(e) => handleFilterChange(setStartupFilters)('status', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Statuses</option>
                          {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>Active Filters:</strong>{' '}
                      {startupFilters.domain !== 'All' && <span style={{ marginRight: '8px' }}>🌐 {startupFilters.domain}</span>}
                      {startupFilters.status !== 'All' && <span style={{ marginRight: '8px' }}>⚡ {startupFilters.status}</span>}
                      {startupFilters.domain === 'All' && startupFilters.status === 'All' &&
                        <span>No filters applied</span>
                      }
                    </div>
                  </div>

                  {/* Bar/Trend Toggle + Chart */}
                  {!repoMode && trendData.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? '#43e97b' : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
                        <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? '#43e97b' : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        {chartMode === 'bar' ? (
                          <BarChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="count" name="Startups Count" fill="#43e97b" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        ) : (
                          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="Startups Count" stroke="#43e97b" strokeWidth={3} dot={{ r: 6, fill: '#43e97b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Scrollable Startups Table */}
                  {tableData.length > 0 && (
                    <div>
                      <h3 style={{ marginBottom: '15px' }}>Startups Directory</h3>
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#fff'
                      }}>
                        <div style={{
                          backgroundColor: '#43e97b',
                          color: 'white',
                          display: 'grid',
                          gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr',
                          gap: '8px',
                          padding: '12px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10
                        }}>
                          <div>Startup Name</div>
                          <div>Domain</div>
                          <div>Status</div>
                          <div>Jobs Created</div>
                          <div>Revenue (₹)</div>
                        </div>
                        <div style={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'auto'
                        }}>
                          {tableData.map((row, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1.8fr 1.5fr 1fr 1fr 1.2fr',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                                borderBottom: '1px solid #e0e0e0',
                                fontSize: '13px',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ fontWeight: '500' }}>{row.startup_name}</div>
                              <div>{row.domain}</div>
                              <div>{row.status}</div>
                              <div>{row.number_of_jobs}</div>
                              <div>{row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Facilities View */}
              {viewType === 'facilities' && (
                <div>
                  <div className="chart-header" style={{ marginBottom: '20px' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🏭</span> Facilities Revenue
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Yearly revenue trend from facilities by type
                    </p>
                  </div>

                  {/* Filters inside facilities view */}
                  <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                      <button
                        onClick={handleClearFilters}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="filter-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '12px'
                    }}>
                      <div className="filter-group">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Facility Type</label>
                        <select
                          value={facilityFilters.facility_type}
                          onChange={(e) => handleFilterChange(setFacilityFilters)('facility_type', e.target.value)}
                          style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                        >
                          <option value="All">All Facility Types</option>
                          {filterOptions.facilities.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <strong>Active Filters:</strong>{' '}
                      {facilityFilters.facility_type !== 'All' && <span style={{ marginRight: '8px' }}>🏢 {facilityFilters.facility_type}</span>}
                      {facilityFilters.facility_type === 'All' &&
                        <span>No filters applied</span>
                      }
                    </div>
                  </div>

                  {/* Bar/Trend Toggle + Chart */}
                  {!repoMode && trendData.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? '#f97316' : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
                        <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? '#f97316' : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        {chartMode === 'bar' ? (
                          <BarChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="count" name="Revenue (₹)" fill="#f97316" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        ) : (
                          <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" stroke="#666" padding={{ left: 30, right: 30 }} />
                            <YAxis stroke="#666" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="Revenue (₹)" stroke="#f97316" strokeWidth={3} dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Scrollable Facilities Table */}
                  {tableData.length > 0 && (
                    <div>
                      <h3 style={{ marginBottom: '15px' }}>Facilities Directory</h3>
                      <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#fff'
                      }}>
                        <div style={{
                          backgroundColor: '#f97316',
                          color: 'white',
                          display: 'grid',
                          gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr 1.2fr',
                          gap: '8px',
                          padding: '12px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10
                        }}>
                          <div>Facility Name</div>
                          <div>Type</div>
                          <div>Availability</div>
                          <div>Financial Year</div>
                          <div>Revenue (₹)</div>
                        </div>
                        <div style={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          overflowX: 'auto'
                        }}>
                          {tableData.map((row, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1.5fr 1.2fr 1.2fr 1.2fr',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                                borderBottom: '1px solid #e0e0e0',
                                fontSize: '13px',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ fontWeight: '500' }}>{row.facility_name}</div>
                              <div>{row.facility_type}</div>
                              <div>{row.availability_status}</div>
                              <div>{row.financial_year}</div>
                              <div>{row.revenue_made ? formatNumber(row.revenue_made) : '0'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No Data Message */}
              {trendData.length === 0 && tableData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                  <p>No data available for the selected filters.</p>
                </div>
              )}
            </>
          )}
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