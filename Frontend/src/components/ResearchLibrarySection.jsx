import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import {
  fetchResearchFilterOptions,
  fetchPublicationSummary,
  fetchPublicationTrend,
  fetchPublicationDepartmentBreakdown,
  fetchPublicationTypeDistribution,
  fetchPublicationList
} from '../services/researchStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import DataUploadModal from './DataUploadModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './ResearchSection.css';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS = ['#6366f1', '#22d3ee', '#f97316', '#a855f7', '#14b8a6', '#facc15'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

const formatDateYear = (year) => {
  if (!year || Number.isNaN(Number(year))) return '—';
  return year;
};

function ResearchLibrarySection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    publication_departments: [],
    publication_years: [],
    publication_types: []
  });

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('trend'); // 'trend' | 'department' | 'type' | 'publicationsTable'

  // Bar / Trend chart mode for Publication Trend
  const [trendChartMode, setTrendChartMode] = useState('bar');

  const [filters, setFilters] = useState({
    department: 'All',
    publication_year: 'All',
    publication_type: 'All'
  });

  const [summary, setSummary] = useState({
    total: 0,
    by_type: {},
    latest_year: null,
    journal_count: 0,
    conference_count: 0
  });

  const [trendData, setTrendData] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [typeDistribution, setTypeDistribution] = useState([]);
  const [publicationList, setPublicationList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      try {
        const options = await fetchResearchFilterOptions(token);
        setFilterOptions({
          publication_departments: Array.isArray(options?.publication_departments)
            ? options.publication_departments
            : [],
          publication_years: Array.isArray(options?.publication_years)
            ? [...options.publication_years].sort((a, b) => b - a)
            : [],
          publication_types: Array.isArray(options?.publication_types)
            ? options.publication_types
            : []
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch publication filter options:', err);
        setError(err.message || 'Failed to load filter options.');
      }
    };

    loadFilterOptions();
  }, [token, uploadVersion]);

  useEffect(() => {
    const loadLibraryData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);

        const [summaryResp, trendResp, deptResp, typeResp, listResp] = await Promise.all([
          fetchPublicationSummary(filters, token),
          fetchPublicationTrend(filters, token),
          fetchPublicationDepartmentBreakdown(filters, token),
          fetchPublicationTypeDistribution(filters, token),
          fetchPublicationList(filters, token)
        ]);

        setSummary({
          total: summaryResp?.total || 0,
          by_type: summaryResp?.by_type || {},
          latest_year: summaryResp?.latest_year || null,
          journal_count: summaryResp?.journal_count || 0,
          conference_count: summaryResp?.conference_count || 0
        });
        setTrendData(trendResp?.data || []);
        setDepartmentBreakdown(deptResp?.data || []);
        setTypeDistribution(typeResp?.data || []);
        setPublicationList(listResp?.data || []);
      } catch (err) {
        console.error('Failed to load library analytics:', err);
        setError(err.message || 'Failed to load library analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadLibraryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, token, uploadVersion]);

  const trendChartData = useMemo(() => {
    if (!trendData.length) return [];
    return trendData.map((row) => ({
      year: row.year,
      publications: Number(row.total) || 0
    }));
  }, [trendData]);

  const departmentChartData = useMemo(() => {
    if (!departmentBreakdown.length) return [];
    return departmentBreakdown.map((row) => ({
      department: row.department || 'Unspecified',
      total: Number(row.total) || 0
    }));
  }, [departmentBreakdown]);

  const typePieData = useMemo(() => {
    if (!typeDistribution.length) return [];
    return typeDistribution
      .map((row) => ({ name: row.publication_type, value: Number(row.total) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [typeDistribution]);

  const participatingDepartments = useMemo(
    () => departmentBreakdown.filter((row) => (row.total || 0) > 0).length,
    [departmentBreakdown]
  );

  const journalVsConference = useMemo(() => {
    return `${formatNumber(summary.journal_count)} / ${formatNumber(summary.conference_count)}`;
  }, [summary.journal_count, summary.conference_count]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      department: 'All',
      publication_year: 'All',
      publication_type: 'All'
    });
  };

  // Custom Tooltip
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
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '0', color: entry.color }}>
              {entry.name}: {entry.value}
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
          <button className="page-back-btn" onClick={() => navigate('/research')}>
            ← Back to Research
          </button>
        )}
        {/* Upload Button */}
        {!isPublicView && user && user.role_id === 3 && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '0px'
          }}>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📤 Upload Publications
            </button>
          </div>
        )}
        {!isPublicView && <h1>Research · Library & Scholarly Outputs</h1>}
        {error && <div className="error-message" style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>{error}</div>}

        {/* Modern Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '30px'
        }}>
          {/* Total Publications Card */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>📚</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Total Publications</span>
              </div>
              <div style={{ fontSize: '38px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatNumber(summary.total)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Scholarly outputs</span>
              </div>
            </div>
          </div>

          {/* Journal / Conference Card */}
          <div style={{
            background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 16px rgba(34, 211, 238, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>📊</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Journal / Conference</span>
              </div>
              <div style={{ fontSize: '38px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {journalVsConference}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Journals/Conferences</span>
              </div>
            </div>
          </div>

          {/* Participating Departments Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 16px rgba(249, 115, 22, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>🏢</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Departments</span>
              </div>
              <div style={{ fontSize: '38px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {participatingDepartments}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Active departments</span>
              </div>
            </div>
          </div>

          {/* Publication Types Card */}
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 16px rgba(168, 85, 247, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              right: '-15px',
              width: '70px',
              height: '70px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>📋</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Publication Types</span>
              </div>
              <div style={{ fontSize: '38px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {typeDistribution.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Different formats</span>
              </div>
            </div>
          </div>
        </div>

        {/* Radio Buttons - Moved Outside with White Background and White Text */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '30px',
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: '#f8f9fa'
        }}>
          <button
            onClick={() => setViewType('trend')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'trend' ? '#6366f1' : 'white',
              color: viewType === 'trend' ? 'white' : '#333',
              border: viewType === 'trend' ? '2px solid #6366f1' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'trend' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📈 Publication Trend
          </button>
          <button
            onClick={() => setViewType('department')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'department' ? '#22c55e' : 'white',
              color: viewType === 'department' ? 'white' : '#333',
              border: viewType === 'department' ? '2px solid #22c55e' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'department' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            🏢 Department-wise
          </button>
          <button
            onClick={() => setViewType('type')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'type' ? '#f97316' : 'white',
              color: viewType === 'type' ? 'white' : '#333',
              border: viewType === 'type' ? '2px solid #f97316' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'type' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📊 Type Distribution
          </button>
          <button
            onClick={() => setViewType('publicationsTable')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'publicationsTable' ? '#a855f7' : 'white',
              color: viewType === 'publicationsTable' ? 'white' : '#333',
              border: viewType === 'publicationsTable' ? '2px solid #a855f7' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'publicationsTable' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📋 Publications Directory
          </button>
        </div>



        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading publication analytics…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Publication Trend Section */}
            {viewType === 'trend' && (
              <section className="chart-section" style={{
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📈</span> Publication Trend
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0', fontSize: '13px' }}>
                    Year-wise publication count
                  </p>
                </div>

                {/* Filters inside trend view */}
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
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={filters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.publication_departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Year</label>
                      <select
                        value={filters.publication_year}
                        onChange={(e) => handleFilterChange('publication_year', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.publication_years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Type</label>
                      <select
                        value={filters.publication_type}
                        onChange={(e) => handleFilterChange('publication_type', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.publication_types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                {/* Bar / Trend toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['bar', 'trend'].map((mode) => (
                    <button key={mode} onClick={() => setTrendChartMode(mode)} style={{
                      padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: 'none',
                      backgroundColor: trendChartMode === mode ? '#6366f1' : '#f1f5f9',
                      color: trendChartMode === mode ? '#fff' : '#555'
                    }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                  ))}
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    {trendChartMode === 'bar' ? (
                      <BarChart data={trendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="rect" wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="publications" name="Publications" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    ) : (
                      <LineChart data={trendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="plainline" wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="publications" name="Publications" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Department-wise Publications Section */}
            {viewType === 'department' && (
              <section className="chart-section" style={{
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🏢</span> Department-wise Publications
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0', fontSize: '13px' }}>
                    Publications by department
                  </p>
                </div>

                {/* Filters inside department view */}
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
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Year</label>
                      <select
                        value={filters.publication_year}
                        onChange={(e) => handleFilterChange('publication_year', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.publication_years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Type</label>
                      <select
                        value={filters.publication_type}
                        onChange={(e) => handleFilterChange('publication_type', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.publication_types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentChartData} margin={{ top: 10, right: 20, left: 40, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="department" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 10 }} interval={0} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Publications" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Publication Type Distribution Section */}
            {viewType === 'type' && (
              <section className="chart-section" style={{
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📊</span> Publication Types
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0', fontSize: '13px' }}>
                    Distribution by format
                  </p>
                </div>

                {/* Filters inside type distribution view */}
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
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={filters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.publication_departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Year</label>
                      <select
                        value={filters.publication_year}
                        onChange={(e) => handleFilterChange('publication_year', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.publication_years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={typePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {typePieData.map((e, i) => <Cell key={e.name} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Publications Directory Table Section */}
            {viewType === 'publicationsTable' && (
              <section className="chart-section" style={{
                marginBottom: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div className="chart-header" style={{ marginBottom: '15px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> Publications Directory
                  </h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
                    {publicationList.length} publications found
                  </p>
                </div>

                {/* Filters inside publications table view */}
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
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={filters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.publication_departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Year</label>
                      <select
                        value={filters.publication_year}
                        onChange={(e) => handleFilterChange('publication_year', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.publication_years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Publication Type</label>
                      <select
                        value={filters.publication_type}
                        onChange={(e) => handleFilterChange('publication_type', e.target.value)}
                        style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.publication_types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#a855f7', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '10px' }}>Title</th>
                        <th style={{ padding: '10px' }}>Faculty</th>
                        <th style={{ padding: '10px' }}>Dept</th>
                        <th style={{ padding: '10px' }}>Type</th>
                        <th style={{ padding: '10px' }}>Year</th>
                        <th style={{ padding: '10px' }}>Journal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {publicationList.map((p, i) => (
                        <tr key={p.publication_id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          <td style={{ padding: '8px' }}>{p.publication_title}</td>
                          <td style={{ padding: '8px' }}>{p.faculty_name}</td>
                          <td style={{ padding: '8px' }}>{p.department}</td>
                          <td style={{ padding: '8px' }}>{p.publication_type}</td>
                          <td style={{ padding: '8px' }}>{p.publication_year}</td>
                          <td style={{ padding: '8px' }}>{p.journal_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="research_publications"
        token={token}
      />
    </div>
  );
}

export default ResearchLibrarySection;