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

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function TechinSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('programs'); // programs, skillDev, startups

  // Bar / Trend chart mode
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'trend'

  // Repo/directory mode: true = show only table with back button
  const [repoMode, setRepoMode] = useState(false);

  const openRepo = (view) => {
    setViewType(view);
    setRepoMode(true);
  };

  // Independent filter states for each view
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

  const [trendData, setTrendData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    programs: { types: [], associations: [] },
    skill_dev: { categories: [], associations: [] },
    startups: { domains: [], statuses: [] }
  });

  const [loading, setLoading] = useState({
    programs: false,
    skillDev: false,
    startups: false
  });
  const [error, setError] = useState(null);

  // Get current filters based on view type
  const getCurrentFilters = () => {
    switch (viewType) {
      case 'programs': return programFilters;
      case 'skillDev': return skillDevFilters;
      case 'startups': return startupFilters;
      default: return programFilters;
    }
  };

  // Handle filter change for current view
  const handleFilterChange = (field, value) => {
    switch (viewType) {
      case 'programs':
        setProgramFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'skillDev':
        setSkillDevFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'startups':
        setStartupFilters(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  // Clear filters for current view
  const handleClearFilters = () => {
    const defaultFilters = { type: 'All', association: 'All' };
    const defaultSkillFilters = { category: 'All', association: 'All' };
    const defaultStartupFilters = { domain: 'All', status: 'All' };

    switch (viewType) {
      case 'programs':
        setProgramFilters(defaultFilters);
        break;
      case 'skillDev':
        setSkillDevFilters(defaultSkillFilters);
        break;
      case 'startups':
        setStartupFilters(defaultStartupFilters);
        break;
    }
  };

  // Handle back navigation

  // Initial Data Load
  useEffect(() => {
    if (!token) return;
    const initialLoad = async () => {
      try {
        setLoading(prev => ({ ...prev, programs: true, skillDev: true, startups: true }));
        const [sumData, filterOps] = await Promise.all([
          fetchTechinSummary(token),
          fetchTechinFilterOptions(token)
        ]);
        if (sumData) setSummary(sumData);
        if (filterOps) setFilterOptions(filterOps);
      } catch (err) {
        setError(err.message || 'Failed to initialize TechIn data');
      } finally {
        setLoading(prev => ({ ...prev, programs: false, skillDev: false, startups: false }));
      }
    };
    initialLoad();
  }, [token, uploadVersion]);

  // Load programs data
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadProgramsData = async () => {
      setLoading(prev => ({ ...prev, programs: true }));
      setError(null);
      try {
        const result = await fetchTechinPrograms(programFilters, token);
        if (isMounted && result) {
          setTrendData(result.trend || []);
          setTableData(result.data || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load programs data');
      } finally {
        if (isMounted) setLoading(prev => ({ ...prev, programs: false }));
      }
    };

    if (viewType === 'programs') {
      loadProgramsData();
    }
    return () => { isMounted = false; };
  }, [token, viewType, programFilters, uploadVersion]);

  // Load skill development data
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadSkillDevData = async () => {
      setLoading(prev => ({ ...prev, skillDev: true }));
      setError(null);
      try {
        const result = await fetchTechinSkillDev(skillDevFilters, token);
        if (isMounted && result) {
          setTrendData(result.trend || []);
          setTableData(result.data || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load skill development data');
      } finally {
        if (isMounted) setLoading(prev => ({ ...prev, skillDev: false }));
      }
    };

    if (viewType === 'skillDev') {
      loadSkillDevData();
    }
    return () => { isMounted = false; };
  }, [token, viewType, skillDevFilters, uploadVersion]);

  // Load startups data
  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    const loadStartupsData = async () => {
      setLoading(prev => ({ ...prev, startups: true }));
      setError(null);
      try {
        const result = await fetchTechinStartups(startupFilters, token);
        if (isMounted && result) {
          setTrendData(result.trend || []);
          setTableData(result.data || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load startups data');
      } finally {
        if (isMounted) setLoading(prev => ({ ...prev, startups: false }));
      }
    };

    if (viewType === 'startups') {
      loadStartupsData();
    }
    return () => { isMounted = false; };
  }, [token, viewType, startupFilters, uploadVersion]);

  // Get loading state for current view
  const isLoading = () => {
    switch (viewType) {
      case 'programs': return loading.programs;
      case 'skillDev': return loading.skillDev;
      case 'startups': return loading.startups;
      default: return false;
    }
  };

  // Radio button configurations
  const radioButtons = [
    { id: 'programs', label: 'Programs Trend', color: '#667eea' },
    { id: 'skillDev', label: 'Skill Dev Trend', color: '#f093fb' },
    { id: 'startups', label: 'Startups Trend', color: '#43e97b' }
  ];

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
              Count: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get current view color for charts
  const getViewColor = () => {
    switch (viewType) {
      case 'programs': return '#667eea';
      case 'skillDev': return '#f093fb';
      case 'startups': return '#43e97b';
      default: return '#667eea';
    }
  };

  // Get current view label
  const getViewLabel = () => {
    switch (viewType) {
      case 'programs': return 'Programs Trend';
      case 'skillDev': return 'Skill Development Trend';
      case 'startups': return 'Startups Growth';
      default: return 'Trend';
    }
  };

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship')}>
            ← Back to Innovation & Entrepreneurship
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            {!isPublicView && <h1 style={{ margin: 0 }}>TechIn</h1>}
          </div>

          {/* Upload Buttons - At the Top */}
          {user && user.role_id === 3 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="upload-data-btn"
                onClick={() => { setActiveUploadTable('techin_program_table'); setIsUploadModalOpen(true); }}
                style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
              >
                📤 Upload Programs
              </button>
              <button
                className="upload-data-btn"
                onClick={() => { setActiveUploadTable('techin_skill_development_program'); setIsUploadModalOpen(true); }}
                style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
              >
                📤 Upload Skill Dev
              </button>
              <button
                className="upload-data-btn"
                onClick={() => { setActiveUploadTable('techin_startup_table'); setIsUploadModalOpen(true); }}
                style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
              >
                📤 Upload Startups
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message" style={{
          padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px'
        }}>{error}</div>}

        {/* First Row of Summary Cards - Larger Size - Keeping original colors */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '30px'
        }}>
          <div
            onClick={() => openRepo('programs')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 15px 30px rgba(102, 126, 234, 0.25)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease',
              cursor: 'pointer'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>📚</span>
                <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Total Programs</span>
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>{formatNumber(summary.total_programs)}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
            </div>
          </div>

          <div
            onClick={() => openRepo('skillDev')}
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 15px 30px rgba(240, 147, 251, 0.25)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease',
              cursor: 'pointer'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>🎯</span>
                <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Skill Dev Programs</span>
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>{formatNumber(summary.total_skill_dev_programs)}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
            </div>
          </div>

          <div
            onClick={() => openRepo('startups')}
            style={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 15px 30px rgba(67, 233, 123, 0.25)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.3s ease',
              cursor: 'pointer'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px' }}>🚀</span>
                <span style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Total Startups</span>
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>{formatNumber(summary.total_startups)}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>Click to view directory →</div>
            </div>
          </div>
        </div>

        {/* Revenue Summary Cards - Larger Size - Keeping original colors */}
        <h3 style={{ marginTop: '0', marginBottom: '20px', color: '#333', fontSize: '18px', fontWeight: '600' }}>Startup Revenue Metrics</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.2)',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>Total Revenue</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>₹{formatNumber(summary.total_startup_revenue)}</div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>Highest Revenue</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>₹{formatNumber(summary.highest_revenue)}</div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.2)',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>Average Revenue</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>₹{formatNumber(summary.average_revenue)}</div>
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)',
            color: 'white',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '12px' }}>Lowest Revenue</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>₹{formatNumber(summary.lowest_revenue)}</div>
            </div>
          </div>
        </div>

        {/* Styled Radio Buttons - Outside with White Background */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          {radioButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setViewType(btn.id)}
              style={{
                padding: '12px 28px',
                backgroundColor: viewType === btn.id ? btn.color : 'white',
                color: viewType === btn.id ? 'white' : '#333',
                border: viewType === btn.id ? `2px solid ${btn.color}` : '2px solid #dee2e6',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: viewType === btn.id ? '600' : '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: viewType === btn.id ? `0 6px 16px ${btn.color}40` : 'none'
              }}
            >
              <span style={{ fontSize: '18px' }}>
                {btn.id === 'programs' ? '📊' : btn.id === 'skillDev' ? '🎯' : '🚀'}
              </span>
              {btn.label}
            </button>
          ))}
        </div>

        {isLoading() ? (
          <div className="loading-container">
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

            {/* Dynamic View with Filters Inside */}
            <div style={{
              marginBottom: '30px',
              padding: '24px',
              backgroundColor: '#fff',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              {/* Filters for Current View */}
              <div className="filter-panel" style={{
                marginBottom: '24px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <div className="filter-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h4 style={{ margin: '0', color: '#333', fontSize: '16px', fontWeight: '600' }}>
                    Filters for {viewType === 'programs' ? 'Programs' : viewType === 'skillDev' ? 'Skill Development' : 'Startups'} View
                  </h4>
                  <button
                    className="clear-filters-btn"
                    onClick={handleClearFilters}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {viewType === 'programs' && (
                    <>
                      <div className="filter-group">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Type</label>
                        <select
                          value={programFilters.type}
                          onChange={(e) => handleFilterChange('type', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}
                        >
                          <option value="All">All Types</option>
                          {filterOptions.programs.types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Association</label>
                        <select
                          value={programFilters.association}
                          onChange={(e) => handleFilterChange('association', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}
                        >
                          <option value="All">All Associations</option>
                          {filterOptions.programs.associations.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {viewType === 'skillDev' && (
                    <>
                      <div className="filter-group">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Category</label>
                        <select
                          value={skillDevFilters.category}
                          onChange={(e) => handleFilterChange('category', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}
                        >
                          <option value="All">All Categories</option>
                          {filterOptions.skill_dev.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Association</label>
                        <select
                          value={skillDevFilters.association}
                          onChange={(e) => handleFilterChange('association', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}
                        >
                          <option value="All">All Associations</option>
                          {filterOptions.skill_dev.associations.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {viewType === 'startups' && (
                    <>
                      <div className="filter-group">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Domain</label>
                        <select
                          value={startupFilters.domain}
                          onChange={(e) => handleFilterChange('domain', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}
                        >
                          <option value="All">All Domains</option>
                          {filterOptions.startups.domains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>Status</label>
                        <select
                          value={startupFilters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #ced4da', backgroundColor: '#fff' }}
                        >
                          <option value="All">All Statuses</option>
                          {filterOptions.startups.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Active Filters Summary */}
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <strong>Active Filters:</strong>{' '}
                  {viewType === 'programs' && (
                    <>
                      {programFilters.type !== 'All' && <span style={{ marginRight: '10px' }}>📌 Type: {programFilters.type}</span>}
                      {programFilters.association !== 'All' && <span style={{ marginRight: '10px' }}>🏢 Assoc: {programFilters.association}</span>}
                      {programFilters.type === 'All' && programFilters.association === 'All' && <span>No filters applied</span>}
                    </>
                  )}
                  {viewType === 'skillDev' && (
                    <>
                      {skillDevFilters.category !== 'All' && <span style={{ marginRight: '10px' }}>📌 Category: {skillDevFilters.category}</span>}
                      {skillDevFilters.association !== 'All' && <span style={{ marginRight: '10px' }}>🏢 Assoc: {skillDevFilters.association}</span>}
                      {skillDevFilters.category === 'All' && skillDevFilters.association === 'All' && <span>No filters applied</span>}
                    </>
                  )}
                  {viewType === 'startups' && (
                    <>
                      {startupFilters.domain !== 'All' && <span style={{ marginRight: '10px' }}>🎯 Domain: {startupFilters.domain}</span>}
                      {startupFilters.status !== 'All' && <span style={{ marginRight: '10px' }}>✅ Status: {startupFilters.status}</span>}
                      {startupFilters.domain === 'All' && startupFilters.status === 'All' && <span>No filters applied</span>}
                    </>
                  )}
                </div>
              </div>

              {/* Bar/Trend Toggle + Chart */}
              {!repoMode && trendData.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <div className="chart-header" style={{ marginBottom: '12px' }}>
                    <h2 style={{ margin: '0 0 8px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px' }}>
                      <span style={{ fontSize: '28px' }}>
                        {viewType === 'programs' ? '📊' : viewType === 'skillDev' ? '🎯' : '🚀'}
                      </span>
                      {getViewLabel()}
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0', fontSize: '14px' }}>
                      Yearly trend of {viewType === 'programs' ? 'programs' : viewType === 'skillDev' ? 'skill development programs' : 'startups'} over time.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button onClick={() => setChartMode('bar')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'bar' ? getViewColor() : '#e9ecef', color: chartMode === 'bar' ? '#fff' : '#333', fontWeight: chartMode === 'bar' ? '600' : '400' }}>Bar</button>
                    <button onClick={() => setChartMode('trend')} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: chartMode === 'trend' ? getViewColor() : '#e9ecef', color: chartMode === 'trend' ? '#fff' : '#333', fontWeight: chartMode === 'trend' ? '600' : '400' }}>Trend</button>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    {chartMode === 'bar' ? (
                      <BarChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="count" name="Count" fill={getViewColor()} radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    ) : (
                      <LineChart data={trendData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="count" name="Count" stroke={getViewColor()} strokeWidth={3} dot={{ r: 6, fill: getViewColor(), strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>

                  {/* Chart Statistics */}
                  <div style={{
                    marginTop: '24px',
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    border: '1px solid #e0e0e0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: getViewColor(), fontWeight: 'bold', fontSize: '32px' }}>
                        {trendData.reduce((sum, item) => sum + item.count, 0)}
                      </div>
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '32px' }}>
                        {trendData.length}
                      </div>
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Years Covered</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '32px' }}>
                        {trendData.length > 0 ? Math.max(...trendData.map(d => d.count)) : 0}
                      </div>
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>Peak Year</div>
                    </div>
                  </div>
                </div>
              )}

              {!repoMode && trendData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                  <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>📈</span>
                  <p style={{ fontSize: '16px' }}>No trend data available for the selected filters.</p>
                </div>
              )}

              {/* Data Table - Scrollable */}
              <div style={{ marginTop: '30px' }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0', color: '#333', fontSize: '20px', fontWeight: '600' }}>Detailed Data</h3>
                  <p className="chart-description" style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
                    {tableData.length} records found
                  </p>
                </div>
                {tableData.length > 0 ? (
                  <div style={{
                    maxHeight: '550px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    backgroundColor: '#fff',
                    position: 'relative'
                  }}>
                    <table className="grievance-table" style={{
                      width: '100%',
                      minWidth: '800px',
                      borderCollapse: 'collapse',
                      backgroundColor: '#fff'
                    }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ backgroundColor: getViewColor(), color: 'white' }}>
                          {viewType === 'programs' && (
                            <>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Program Name</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Type</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Association</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Date</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Attendees</th>
                            </>
                          )}
                          {viewType === 'skillDev' && (
                            <>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Program Name</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Category</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Association</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Date</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Attendees</th>
                            </>
                          )}
                          {viewType === 'startups' && (
                            <>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Startup Name</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Domain</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Status</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Jobs</th>
                              <th style={{ padding: '14px 12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: getViewColor(), fontSize: '14px' }}>Revenue</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, idx) => (
                          <tr
                            key={idx}
                            style={{
                              backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                              borderBottom: '1px solid #e0e0e0'
                            }}
                          >
                            {viewType === 'programs' && (
                              <>
                                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{row.program_name}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.type}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.association}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.no_of_attendess || '0'}</td>
                              </>
                            )}
                            {viewType === 'skillDev' && (
                              <>
                                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{row.program_name}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.category}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.association}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.event_date || row.start_end ? new Date(row.event_date || row.start_end).toLocaleDateString() : 'N/A'}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.no_of_attendess || '0'}</td>
                              </>
                            )}
                            {viewType === 'startups' && (
                              <>
                                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>{row.startup_name}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.domain}</td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>
                                  <span style={{
                                    backgroundColor: row.status === 'Active' ? '#dcfce7' : '#fef3c7',
                                    color: row.status === 'Active' ? '#166534' : '#92400e',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-block'
                                  }}>
                                    {row.status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px', fontSize: '14px' }}>{row.number_of_jobs || '0'}</td>
                                <td style={{ padding: '12px', fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                                  {row.revenue ? `₹${formatNumber(row.revenue)}` : '-'}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                    <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>📋</span>
                    <p style={{ fontSize: '16px' }}>No records found for the selected filters.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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