import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  fetchFilterOptions,
  fetchSummary,
  fetchDepartmentBreakdown,
  fetchYearTrend,
  fetchTypeDistribution,
  fetchFacultyEngagementList
} from '../services/educationStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './DataUploadModal';
import './Page.css';
import './AcademicSection.css';
import { useNavigate } from 'react-router-dom';

const ENGAGEMENT_COLORS = {
  Adjunct: '#667eea',
  Honorary: '#764ba2',
  Visiting: '#f093fb',
  FacultyFellow: '#4facfe',
  PoP: '#00f2fe'
};

const ENGAGEMENT_LABELS = {
  Adjunct: 'Adjunct',
  Honorary: 'Honorary',
  Visiting: 'Visiting',
  // FacultyFellow: 'Faculty Fellow',
  PoP: 'PoP'
};

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

function EducationAdministrativeSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    departments: [],
    engagement_types: []
  });

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('summary'); // 'summary' | 'department' | 'trend' | 'distribution' | 'details' | 'honorary'

  // Independent filter states for each view
  const [summaryFilters, setSummaryFilters] = useState({
    year: 'All',
    department: 'All',
    engagement_type: 'All'
  });

  const [departmentFilters, setDepartmentFilters] = useState({
    year: 'All',
    department: 'All',
    engagement_type: 'All'
  });

  const [trendFilters, setTrendFilters] = useState({
    year: 'All',
    department: 'All',
    engagement_type: 'All'
  });

  const [distributionFilters, setDistributionFilters] = useState({
    year: 'All',
    department: 'All',
    engagement_type: 'All'
  });

  const [detailsFilters, setDetailsFilters] = useState({
    year: 'All',
    department: 'All',
    engagement_type: 'All'
  });

  const [honoraryFilters, setHonoraryFilters] = useState({
    year: 'All',
    department: 'All',
    engagement_type: 'All'
  });

  const [summary, setSummary] = useState({
    summary: [],
    overall_total: 0,
    overall_active: 0
  });

  const [departmentData, setDepartmentData] = useState([]);
  const [yearTrendData, setYearTrendData] = useState([]);
  const [typeDistributionData, setTypeDistributionData] = useState([]);
  const [engagementList, setEngagementList] = useState([]);

  const [loading, setLoading] = useState({
    summary: false,
    department: false,
    trend: false,
    distribution: false,
    details: false,
    honorary: false
  });
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  // Get current filters based on view type
  const getCurrentFilters = () => {
    switch(viewType) {
      case 'summary': return summaryFilters;
      case 'department': return departmentFilters;
      case 'trend': return trendFilters;
      case 'distribution': return distributionFilters;
      case 'details': return detailsFilters;
      case 'honorary': return honoraryFilters;
      default: return summaryFilters;
    }
  };

  // Handle filter change for current view
  const handleFilterChange = (field, value) => {
    switch(viewType) {
      case 'summary':
        setSummaryFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'department':
        setDepartmentFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'trend':
        setTrendFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'distribution':
        setDistributionFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'details':
        setDetailsFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'honorary':
        setHonoraryFilters(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  // Clear filters for current view
  const handleClearFilters = () => {
    const defaultFilters = {
      year: 'All',
      department: 'All',
      engagement_type: 'All'
    };
    
    switch(viewType) {
      case 'summary':
        setSummaryFilters(defaultFilters);
        break;
      case 'department':
        setDepartmentFilters(defaultFilters);
        break;
      case 'trend':
        setTrendFilters(defaultFilters);
        break;
      case 'distribution':
        setDistributionFilters(defaultFilters);
        break;
      case 'details':
        setDetailsFilters(defaultFilters);
        break;
      case 'honorary':
        setHonoraryFilters(defaultFilters);
        break;
    }
  };

  // Fetch filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      try {
        const options = await fetchFilterOptions(token);
        setFilterOptions({
          years: Array.isArray(options?.years) ? [...options.years].sort((a, b) => b - a) : [],
          departments: Array.isArray(options?.departments) ? options.departments : [],
          engagement_types: Array.isArray(options?.engagement_types) ? options.engagement_types : []
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
        setError(err.message || 'Failed to load filter options.');
      }
    };

    loadFilterOptions();
  }, [token, uploadVersion]);

  // Fetch summary data
  useEffect(() => {
    const loadSummaryData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, summary: true }));
        setError(null);

        const filterParams = {};
        if (summaryFilters.year !== 'All') filterParams.year = summaryFilters.year;
        if (summaryFilters.department !== 'All') filterParams.department = summaryFilters.department;
        if (summaryFilters.engagement_type !== 'All') filterParams.engagement_type = summaryFilters.engagement_type;

        const summaryResp = await fetchSummary(filterParams, token);

        setSummary({
          summary: Array.isArray(summaryResp?.data?.summary) ? summaryResp.data.summary : [],
          overall_total: summaryResp?.data?.overall_total || 0,
          overall_active: summaryResp?.data?.overall_active || 0
        });
      } catch (err) {
        console.error('Failed to load summary data:', err);
        setError(err.message || 'Failed to load summary data.');
      } finally {
        setLoading(prev => ({ ...prev, summary: false }));
      }
    };

    if (viewType === 'summary') {
      loadSummaryData();
    }
  }, [summaryFilters, token, viewType, uploadVersion]);

  // Fetch department data
  useEffect(() => {
    const loadDepartmentData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, department: true }));
        setError(null);

        const filterParams = {};
        if (departmentFilters.year !== 'All') filterParams.year = departmentFilters.year;
        if (departmentFilters.department !== 'All') filterParams.department = departmentFilters.department;
        if (departmentFilters.engagement_type !== 'All') filterParams.engagement_type = departmentFilters.engagement_type;

        const deptResp = await fetchDepartmentBreakdown(filterParams, token);
        setDepartmentData(Array.isArray(deptResp?.data) ? deptResp.data : []);
      } catch (err) {
        console.error('Failed to load department data:', err);
        setError(err.message || 'Failed to load department data.');
      } finally {
        setLoading(prev => ({ ...prev, department: false }));
      }
    };

    if (viewType === 'department') {
      loadDepartmentData();
    }
  }, [departmentFilters, token, viewType, uploadVersion]);

  // Fetch trend data
  useEffect(() => {
    const loadTrendData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, trend: true }));
        setError(null);

        const filterParams = {};
        if (trendFilters.year !== 'All') filterParams.year = trendFilters.year;
        if (trendFilters.department !== 'All') filterParams.department = trendFilters.department;
        if (trendFilters.engagement_type !== 'All') filterParams.engagement_type = trendFilters.engagement_type;

        const trendResp = await fetchYearTrend(filterParams, token);
        setYearTrendData(Array.isArray(trendResp?.data) ? trendResp.data : []);
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError(err.message || 'Failed to load trend data.');
      } finally {
        setLoading(prev => ({ ...prev, trend: false }));
      }
    };

    if (viewType === 'trend') {
      loadTrendData();
    }
  }, [trendFilters, token, viewType, uploadVersion]);

  // Fetch distribution data
  useEffect(() => {
    const loadDistributionData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, distribution: true }));
        setError(null);

        const filterParams = {};
        if (distributionFilters.year !== 'All') filterParams.year = distributionFilters.year;
        if (distributionFilters.department !== 'All') filterParams.department = distributionFilters.department;
        if (distributionFilters.engagement_type !== 'All') filterParams.engagement_type = distributionFilters.engagement_type;

        const distResp = await fetchTypeDistribution(filterParams, token);
        setTypeDistributionData(Array.isArray(distResp?.data) ? distResp.data : []);
      } catch (err) {
        console.error('Failed to load distribution data:', err);
        setError(err.message || 'Failed to load distribution data.');
      } finally {
        setLoading(prev => ({ ...prev, distribution: false }));
      }
    };

    if (viewType === 'distribution') {
      loadDistributionData();
    }
  }, [distributionFilters, token, viewType, uploadVersion]);

  // Fetch details list data
  useEffect(() => {
    const loadDetailsData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, details: true }));
        setError(null);

        const filterParams = {};
        // Use the appropriate filters based on view
        const currentFilters = viewType === 'honorary' ? honoraryFilters : detailsFilters;

        if (currentFilters.year !== 'All') filterParams.year = currentFilters.year;
        if (currentFilters.department !== 'All') filterParams.department = currentFilters.department;
        
        // Force Honorary if in honorary view and type is All
        if (viewType === 'honorary') {
          filterParams.engagement_type = currentFilters.engagement_type === 'All' ? 'Honorary' : currentFilters.engagement_type;
        } else if (currentFilters.engagement_type !== 'All') {
          filterParams.engagement_type = currentFilters.engagement_type;
        }

        const listResp = await fetchFacultyEngagementList(filterParams, token);
        setEngagementList(Array.isArray(listResp?.data) ? listResp.data : []);
      } catch (err) {
        console.error('Failed to load details list:', err);
        setError(err.message || 'Failed to load details list.');
      } finally {
        setLoading(prev => ({ ...prev, details: false }));
      }
    };

    if (viewType === 'details' || viewType === 'honorary') {
      loadDetailsData();
    }
  }, [detailsFilters, honoraryFilters, token, viewType, uploadVersion]);

  // Prepare summary cards data
  const summaryCards = useMemo(() => {
    return summary.summary.map((item) => ({
      type: item.engagement_type,
      total: Number(item.total) || 0,
      active: Number(item.active) || 0
    }));
  }, [summary.summary]);

  // Prepare department chart data
  const departmentChartData = useMemo(() => {
    if (!departmentData.length) return [];
    return departmentData.map((dept) => {
      const entry = { department: dept.department || 'Unknown' };
      summary.summary.forEach((item) => {
        const type = item.engagement_type;
        entry[type] = Number(dept[`${type}_total`]) || 0;
      });
      entry.total = Number(dept.total) || 0;
      return entry;
    });
  }, [departmentData, summary.summary]);

  // Prepare year trend chart data
  const yearTrendChartData = useMemo(() => {
    if (!yearTrendData.length) return [];
    return yearTrendData.map((entry) => {
      const item = { year: entry.year || 'Unknown' };
      summary.summary.forEach((sumItem) => {
        const type = sumItem.engagement_type;
        item[type] = Number(entry[type]) || 0;
      });
      return item;
    });
  }, [yearTrendData, summary.summary]);

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    if (!typeDistributionData.length) return [];
    return typeDistributionData.map((item) => ({
      name: item.engagement_type,
      value: Number(item.total) || 0
    }));
  }, [typeDistributionData]);

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '4px 0', color: entry.color }}>
              {`${entry.name}: ${formatNumber(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get loading state for current view
  const isLoading = () => {
    switch(viewType) {
      case 'summary': return loading.summary;
      case 'department': return loading.department;
      case 'trend': return loading.trend;
      case 'distribution': return loading.distribution;
      case 'details': return loading.details;
      case 'honorary': return loading.details;
      default: return false;
    }
  };

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/education')}>
            ← Back to Education
          </button>
        )}
        {!isPublicView && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1>Administrative Section - External Academic Engagement</h1>
            {user && user.role_id === 3 && (
              <button
                className="upload-data-btn"
                onClick={() => setIsUploadModalOpen(true)}
                style={{ padding: '0.65rem 1.4rem', fontSize: '0.9rem' }}
              >
                Upload Data
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Radio Buttons - Outside and Centered */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: viewType === 'summary' ? '#667eea' : '#f8f9fa',
            color: viewType === 'summary' ? 'white' : '#333',
            borderRadius: '30px',
            transition: 'all 0.3s ease',
            border: viewType === 'summary' ? '2px solid #667eea' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="viewType"
              value="summary"
              checked={viewType === 'summary'}
              onChange={(e) => setViewType(e.target.value)}
              style={{ accentColor: '#667eea', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: viewType === 'summary' ? 'bold' : 'normal', fontSize: '14px' }}>
              📊 Summary Indicators
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: viewType === 'department' ? '#22c55e' : '#f8f9fa',
            color: viewType === 'department' ? 'white' : '#333',
            borderRadius: '30px',
            transition: 'all 0.3s ease',
            border: viewType === 'department' ? '2px solid #22c55e' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="viewType"
              value="department"
              checked={viewType === 'department'}
              onChange={(e) => setViewType(e.target.value)}
              style={{ accentColor: '#22c55e', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: viewType === 'department' ? 'bold' : 'normal', fontSize: '14px' }}>
              🏢 Department-wise
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: viewType === 'trend' ? '#f97316' : '#f8f9fa',
            color: viewType === 'trend' ? 'white' : '#333',
            borderRadius: '30px',
            transition: 'all 0.3s ease',
            border: viewType === 'trend' ? '2px solid #f97316' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="viewType"
              value="trend"
              checked={viewType === 'trend'}
              onChange={(e) => setViewType(e.target.value)}
              style={{ accentColor: '#f97316', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: viewType === 'trend' ? 'bold' : 'normal', fontSize: '14px' }}>
              📈 Year-wise Trends
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: viewType === 'distribution' ? '#a855f7' : '#f8f9fa',
            color: viewType === 'distribution' ? 'white' : '#333',
            borderRadius: '30px',
            transition: 'all 0.3s ease',
            border: viewType === 'distribution' ? '2px solid #a855f7' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="viewType"
              value="distribution"
              checked={viewType === 'distribution'}
              onChange={(e) => setViewType(e.target.value)}
              style={{ accentColor: '#a855f7', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: viewType === 'distribution' ? 'bold' : 'normal', fontSize: '14px' }}>
              🥧 Type Distribution
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: viewType === 'details' ? '#0ea5e9' : '#f8f9fa',
            color: viewType === 'details' ? 'white' : '#333',
            borderRadius: '30px',
            transition: 'all 0.3s ease',
            border: viewType === 'details' ? '2px solid #0ea5e9' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="viewType" 
              value="details"
              checked={viewType === 'details'}
              onChange={(e) => setViewType(e.target.value)}
              style={{ accentColor: '#0ea5e9', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: viewType === 'details' ? 'bold' : 'normal', fontSize: '14px' }}>
              📋 Engagement Details
            </span>
          </label>


        </div>

        <div style={{ position: 'relative', minHeight: '400px' }}>
          {isLoading() && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '12px',
              backdropFilter: 'blur(2px)',
              transition: 'all 0.3s ease'
            }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Updating data...</p>
            </div>
          )}

          {/* Summary Indicators View */}
          <div style={{ display: viewType === 'summary' ? 'block' : 'none' }}>
              <div className="chart-section" style={{ marginTop: '0' }}>
                {/* Filters for Summary View */}
                <div className="filter-panel" style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e9ecef' 
                }}>
                  <div className="filter-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  }}>
                    <h4 style={{ margin: '0', color: '#333' }}>Filters for Summary View</h4>
                    <button 
                      className="clear-filters-btn" 
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

                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                      <select
                        value={summaryFilters.year}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-header">
                  <h2>Summary Indicators</h2>
                  <p className="chart-description">
                    Total counts by faculty engagement type
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                  marginTop: '1.5rem'
                }}>
                  {summaryCards.filter((card) => card.type !== 'FacultyFellow').map((card) => (
                    <div
                      key={card.type}
                      style={{
                        backgroundColor: '#fff',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.5rem',
                        fontWeight: '600'
                      }}>
                        {ENGAGEMENT_LABELS[card.type] || card.type}
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: ENGAGEMENT_COLORS[card.type] || '#667eea',
                        marginBottom: '0.25rem'
                      }}>
                        {formatNumber(card.total)}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)'
                      }}>
                        Active: {formatNumber(card.active)}
                      </div>
                    </div>
                  ))}
                  {summaryCards.length === 0 && (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--text-muted)'
                    }}>
                      No data available
                    </div>
                  )}
                </div>

                {summary.overall_total > 0 && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <strong style={{ fontSize: '1.1rem' }}>
                      Overall Total: {formatNumber(summary.overall_total)} | 
                      Active: {formatNumber(summary.overall_active)}
                    </strong>
                  </div>
                )}
              </div>
          </div>

          {/* Department-wise Breakdown View */}
          <div style={{ display: viewType === 'department' ? 'block' : 'none' }}>
              <div className="chart-section" style={{ marginTop: '0' }}>
                {/* Filters for Department View */}
                <div className="filter-panel" style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e9ecef' 
                }}>
                  <div className="filter-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  }}>
                    <h4 style={{ margin: '0', color: '#333' }}>Filters for Department-wise View</h4>
                    <button 
                      className="clear-filters-btn" 
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

                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                      <select
                        value={departmentFilters.year}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={departmentFilters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Engagement Type</label>
                      <select
                        value={departmentFilters.engagement_type}
                        onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.engagement_types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-header">
                  <h2>Department-wise Breakdown</h2>
                  <p className="chart-description">
                    Distribution of external academic engagement by department
                  </p>
                </div>

                {departmentChartData.length > 0 ? (
                  <div className="bar-chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={departmentChartData} margin={{ top: 20, right: 30, left: 60, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="department"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          stroke="#000000"
                          tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                          label={{ value: 'Department', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                        />
                        <YAxis
                          stroke="#000000"
                          tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }}
                          iconType="rect"
                        />
                        {summary.summary.map((item, index) => {
                          const type = item.engagement_type;
                          return (
                            <Bar
                              key={type}
                              dataKey={type}
                              name={ENGAGEMENT_LABELS[type] || type}
                              stackId="a"
                              fill={ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length]}
                              radius={index === summary.summary.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                            />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No department data available for the selected filters.</p>
                  </div>
                )}
              </div>
          </div>

          {/* Year-wise Trends View */}
          <div style={{ display: viewType === 'trend' ? 'block' : 'none' }}>
              <div className="chart-section" style={{ marginTop: '0' }}>
                {/* Filters for Trend View */}
                <div className="filter-panel" style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e9ecef' 
                }}>
                  <div className="filter-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  }}>
                    <h4 style={{ margin: '0', color: '#333' }}>Filters for Year-wise Trends</h4>
                    <button 
                      className="clear-filters-btn" 
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

                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                      <select
                        value={trendFilters.year}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={trendFilters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Engagement Type</label>
                      <select
                        value={trendFilters.engagement_type}
                        onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.engagement_types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-header">
                  <h2>Year-wise Trends</h2>
                  <p className="chart-description">
                    Growth in external academic engagement over time
                  </p>
                </div>

                {yearTrendChartData.length > 0 ? (
                  <div className="bar-chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={yearTrendChartData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="year"
                          stroke="#000000"
                          tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                          label={{ value: 'Year', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                        />
                        <YAxis
                          stroke="#000000"
                          tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                          label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }}
                          iconType="line"
                        />
                        {summary.summary.map((item, index) => {
                          const type = item.engagement_type;
                          return (
                            <Line
                              key={type}
                              type="monotone"
                              dataKey={type}
                              stroke={ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No year trend data available for the selected filters.</p>
                  </div>
                )}
              </div>
          </div>

          {/* Type Distribution View */}
          <div style={{ display: viewType === 'distribution' ? 'block' : 'none' }}>
              <div className="chart-section" style={{ marginTop: '0' }}>
                {/* Filters for Distribution View */}
                <div className="filter-panel" style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e9ecef' 
                }}>
                  <div className="filter-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  }}>
                    <h4 style={{ margin: '0', color: '#333' }}>Filters for Type Distribution</h4>
                    <button 
                      className="clear-filters-btn" 
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

                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                      <select
                        value={distributionFilters.year}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={distributionFilters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Engagement Type</label>
                      <select
                        value={distributionFilters.engagement_type}
                        onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.engagement_types.map((type) => (
                          <option key={type} value={type}>{ENGAGEMENT_LABELS[type] || type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-header">
                  <h2>Distribution by Faculty Type</h2>
                  <p className="chart-description">
                    Proportion of each engagement type
                  </p>
                </div>

                {pieChartData.length > 0 ? (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${ENGAGEMENT_LABELS[name] || name}: ${(percent * 100).toFixed(1)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={ENGAGEMENT_COLORS[entry.name] || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={(value) => ENGAGEMENT_LABELS[value] || value} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No distribution data available for the selected filters.</p>
                  </div>
                )}
              </div>
          </div>

          {/* Engagement Details View */}
          <div style={{ display: viewType === 'details' ? 'block' : 'none' }}>
              <div className="chart-section" style={{ marginTop: '0' }}>
                {/* Filters for Details View */}
                <div className="filter-panel" style={{ 
                  marginBottom: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px', 
                  border: '1px solid #e9ecef' 
                }}>
                  <div className="filter-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '15px' 
                  }}>
                    <h4 style={{ margin: '0', color: '#333' }}>Filters for Engagement Details</h4>
                    <button 
                      className="clear-filters-btn" 
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

                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                      <select
                        value={detailsFilters.year}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Department</label>
                      <select
                        value={detailsFilters.department}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Departments</option>
                        {filterOptions.departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Engagement Type</label>
                      <select
                        value={detailsFilters.engagement_type}
                        onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      >
                        <option value="All">All Types</option>
                        {filterOptions.engagement_types.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                <div className="chart-header">
                  <h2>External Academic Engagement Details</h2>
                  <p className="chart-description">
                    Detailed list of all external academic engagements
                  </p>
                </div>

                {engagementList.length > 0 ? (
                  <div className="table-responsive" style={{
                    height: '400px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse'
                    }}>
                      <thead style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backgroundColor: '#f8f9fa'
                      }}>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#555', fontSize: '13px', fontWeight: '600' }}>Sl No</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#555', fontSize: '13px', fontWeight: '600' }}>Name</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#555', fontSize: '13px', fontWeight: '600' }}>Academia or Industry</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#555', fontSize: '13px', fontWeight: '600' }}>Organisation Name</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#555', fontSize: '13px', fontWeight: '600' }}>Discipline</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engagementList.map((item, index) => {
                          const isAcademia = ['Honorary', 'Adjunct', 'FacultyFellow'].includes(item.std_type);
                          const sector = isAcademia ? 'Academia' : 'Industry';
                          const organisationName = item.remarks || `${ENGAGEMENT_LABELS[item.std_type] || item.engagement_type} Faculty`;
                          
                          return (
                            <tr key={item.engagement_code} style={{
                              borderBottom: '1px solid #f0f0f0',
                              backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa'
                            }}>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{index + 1}</td>
                              <td style={{ padding: '10px', fontSize: '13px', fontWeight: '500' }}>{item.faculty_name || '—'}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{sector}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{organisationName}</td>
                              <td style={{ padding: '10px', fontSize: '13px' }}>{item.department || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No engagement data available for the selected filters.</p>
                  </div>
                )}
              </div>
          </div>


        </div>

        {/* Upload Modal */}
        {!isPublicView && user && user.role_id === 3 && (
          <DataUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            tableName="faculty_engagement"
            token={token}
          />
        )}
      </div>
    </div>
  );
}

export default EducationAdministrativeSection;