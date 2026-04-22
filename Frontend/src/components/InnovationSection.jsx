import { useState, useEffect, useMemo } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import InnovationPublicView from './InnovationPublicView';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import {
  fetchInnovationSummary,
  fetchYearlyGrowth,
  fetchSectorDistribution,
  fetchStartups,
  fetchFilterOptions
} from '../services/innovationStats';
import './Page.css';
import './PeopleCampus.css';
import DataUploadModal from './DataUploadModal';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a'];
const SECTOR_COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#a855f7', '#facc15', '#fb7185', '#14b8a6'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

/**
 * Dashboard component for Innovation & Entrepreneurship.
 * Renders the admin view or delegates to InnovationPublicView.
 * @param {Object} props
 * @param {Object} props.user - The logged-in user object.
 * @param {boolean} props.isPublicView - Forces the public view.
 */
function InnovationSection({ user, isPublicView }) {
  if (isPublicView) {
    return <InnovationSectionContent user={user} isPublicView={true} />;
  }

  const [showPublicView, setShowPublicView] = useState(false);
  const roleId = user?.role_id;

  if (roleId === 1) {
    return <InnovationPublicView user={user} />;
  }

  if (showPublicView) {
    return (
      <div className="page-container">
        <div className="page-content">
          <button
            className="upload-data-btn"
            onClick={() => setShowPublicView(false)}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Admin View
          </button>

          <InnovationPublicView user={user} />
        </div>
      </div>
    );
  }

  // Default admin view
  return (
    <div className="page-container">
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1>Innovation & Entrepreneurship</h1>
            <p style={{ color: '#666', margin: 0 }}>
              Track incubatees, startups, and innovation projects at TECHIN and IPTIF.
            </p>
          </div>

          <div>
            <button
              className="upload-data-btn"
              onClick={() => setShowPublicView(true)}
            >
              View Public Page
            </button>
          </div>
        </div>

        <InnovationSectionContent user={user} isPublicView={false} />
      </div>
    </div>
  );
}

/**
 * Inner content component for InnovationSection. Handles data fetching and chart rendering.
 */
function InnovationSectionContent({ user, isPublicView }) {
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const token = localStorage.getItem('authToken');
  const [viewType, setViewType] = useState('yearlyGrowth');

  const roleId = user?.role_id;
  const allowedRoles = [3, 8]; // Super Admin and Innovation
  const isSuperAdmin = roleId === 3;
  const isAllowed = isSuperAdmin || (allowedRoles && allowedRoles.includes(roleId));

  const [summary, setSummary] = useState({
    total_incubatees: 0,
    total_startups: 0,
    total_innovation_projects: 0,
    startups_from_iitpkd: 0
  });

  const [yearlyGrowth, setYearlyGrowth] = useState([]);
  const [sectorDistribution, setSectorDistribution] = useState([]);
  const [startupsList, setStartupsList] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    sectors: [],
    years: []
  });

  const [filters, setFilters] = useState({
    status: 'All',
    sector: 'All',
    year: 'All',
    iitpkd_only: false,
    search: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load filter options on mount
  useEffect(() => {
    if (!token) return;
    const loadFilterOptions = async () => {
      try {
        const options = await fetchFilterOptions(token);
        setFilterOptions(options);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    loadFilterOptions();
  }, [token, uploadVersion]);

  useEffect(() => {
    if (!token) return;
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchInnovationSummary(token);
        setSummary(data);
      } catch (err) {
        setError(err.message || 'Failed to load summary data');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [token, uploadVersion]);

  useEffect(() => {
    if (!token) return;
    const loadYearlyGrowth = async () => {
      try {
        const result = await fetchYearlyGrowth(token);
        setYearlyGrowth(result.data || []);
      } catch (err) {
        console.error('Error loading yearly growth:', err);
      }
    };
    loadYearlyGrowth();
  }, [token, uploadVersion]);

  useEffect(() => {
    if (!token) return;
    const loadSectorDistribution = async () => {
      try {
        const result = await fetchSectorDistribution(token);
        setSectorDistribution(result.data || []);
      } catch (err) {
        console.error('Error loading sector distribution:', err);
      }
    };
    loadSectorDistribution();
  }, [token, uploadVersion]);

  useEffect(() => {
    if (!token) return;
    const loadStartups = async () => {
      try {
        const result = await fetchStartups(
          filters,
          pagination.page,
          pagination.per_page,
          token
        );
        setStartupsList(result.data || []);
        setPagination(result.pagination || pagination);
      } catch (err) {
        console.error('Error loading startups:', err);
      }
    };
    loadStartups();
  }, [filters, pagination.page, token, uploadVersion]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    if (field !== 'search') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'All',
      sector: 'All',
      year: 'All',
      iitpkd_only: false,
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Chart data
  const yearlyChartData = useMemo(() => {
    return yearlyGrowth.map(row => ({
      year: row.year,
      incubatees: row.incubatees || 0,
      startups: row.startups || 0,
      innovationProjects: row.innovation_projects || 0
    }));
  }, [yearlyGrowth]);

  const sectorPieData = useMemo(() => {
    return sectorDistribution
      .filter(s => s.startups > 0 || s.projects > 0)
      .map(s => ({
        name: s.sector,
        value: s.startups + s.projects,
        startups: s.startups,
        projects: s.projects
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [sectorDistribution]);

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
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{label || payload[0].name}</p>
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

  // Wrapper style when rendered in public view
  const contentStyle = isPublicView ? { padding: '2rem' } : {};

  return (
    <div style={contentStyle}>
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
        gap: '24px',
        marginBottom: '40px'
      }}>
        {/* Total Incubatees Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '12px'
              }}>🚀</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '16px',
                fontWeight: '500'
              }}>Total Incubatees</h3>
            </div>
            <div className="metric-value" style={{
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_incubatees)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#4ade80',
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Active incubatees
              </span>
            </div>
          </div>
        </div>

        {/* Total Startups Card */}
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 15px 35px rgba(240, 147, 251, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '12px'
              }}>💡</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '16px',
                fontWeight: '500'
              }}>Total Startups</h3>
            </div>
            <div className="metric-value" style={{
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_startups)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#4ade80',
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Registered startups
              </span>
            </div>
          </div>
        </div>

        {/* Innovation Projects Card */}
        <div style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 15px 35px rgba(67, 233, 123, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '12px'
              }}>🔬</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '16px',
                fontWeight: '500'
              }}>Innovation Projects</h3>
            </div>
            <div className="metric-value" style={{
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_innovation_projects)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#4ade80',
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                R&D projects
              </span>
            </div>
          </div>
        </div>

        {/* Startups from IITPKD Card */}
        <div style={{
          background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 15px 35px rgba(249, 115, 22, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <span style={{
                fontSize: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '12px'
              }}>🎓</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '16px',
                fontWeight: '500'
              }}>IITPKD Startups</h3>
            </div>
            <div className="metric-value" style={{
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.startups_from_iitpkd)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                background: '#4ade80',
                borderRadius: '50%'
              }} />
              <span style={{
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Founded by alumni
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel with Radio Buttons for View Selection */}
      <div className="filter-panel" style={{ 
        marginBottom: '20px', 
        padding: '20px', 
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
          <h3 style={{ margin: '0', color: '#333' }}>Filters & Visualization Options</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className="clear-filters-btn" 
              onClick={handleClearFilters}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#dc3545', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear Filters
            </button>
            {/* Only Super Admin can upload and only in admin view */}
            {isSuperAdmin && !isPublicView && (
              <button
                className="upload-data-btn"
                onClick={() => setIsUploadModalOpen(true)}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#28a745', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Upload Startups
              </button>
            )}
          </div>
        </div>
        
        {/* View Type Selection - Radio Buttons */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontWeight: '600', 
            color: '#333',
            fontSize: '14px'
          }}>
            Select View Type:
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: viewType === 'yearlyGrowth' ? '#667eea' : 'white',
              color: viewType === 'yearlyGrowth' ? 'white' : '#333',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              border: viewType === 'yearlyGrowth' ? '2px solid #667eea' : '2px solid #ced4da'
            }}>
              <input
                type="radio"
                name="viewType"
                value="yearlyGrowth"
                checked={viewType === 'yearlyGrowth'}
                onChange={(e) => setViewType(e.target.value)}
                style={{ 
                  accentColor: '#667eea',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: viewType === 'yearlyGrowth' ? 'bold' : 'normal' }}>
                📈 Yearly Growth
              </span>
            </label>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: viewType === 'sectorDistribution' ? '#4f46e5' : 'white',
              color: viewType === 'sectorDistribution' ? 'white' : '#333',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              border: viewType === 'sectorDistribution' ? '2px solid #4f46e5' : '2px solid #ced4da'
            }}>
              <input
                type="radio"
                name="viewType"
                value="sectorDistribution"
                checked={viewType === 'sectorDistribution'}
                onChange={(e) => setViewType(e.target.value)}
                style={{ 
                  accentColor: '#4f46e5',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: viewType === 'sectorDistribution' ? 'bold' : 'normal' }}>
                📊 Sector Distribution
              </span>
            </label>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              padding: '8px 12px',
              backgroundColor: viewType === 'startupsDirectory' ? '#f97316' : 'white',
              color: viewType === 'startupsDirectory' ? 'white' : '#333',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              border: viewType === 'startupsDirectory' ? '2px solid #f97316' : '2px solid #ced4da'
            }}>
              <input
                type="radio"
                name="viewType"
                value="startupsDirectory"
                checked={viewType === 'startupsDirectory'}
                onChange={(e) => setViewType(e.target.value)}
                style={{ 
                  accentColor: '#f97316',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontWeight: viewType === 'startupsDirectory' ? 'bold' : 'normal' }}>
                📋 Startups Directory
              </span>
            </label>
          </div>
        </div>

        <div className="filter-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px' 
        }}>
          <div className="filter-group">
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Status
            </label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="All">All Status</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Sector
            </label>
            <select
              className="filter-select"
              value={filters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="All">All Sectors</option>
              {filterOptions.sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Year
            </label>
            <select
              className="filter-select"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="All">All Years</option>
              {filterOptions.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.iitpkd_only}
                onChange={(e) => handleFilterChange('iitpkd_only', e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '600', color: '#555' }}>IIT Palakkad Only</span>
            </label>
          </div>

          <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search by startup name, founder, or innovation area..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-select"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
            />
          </div>
        </div>

        {/* Active Filters Summary */}
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Active Filters:</strong>{' '}
          {filters.status !== 'All' && <span style={{ marginRight: '10px' }}>📌 Status: {filters.status}</span>}
          {filters.sector !== 'All' && <span style={{ marginRight: '10px' }}>🏢 Sector: {filters.sector}</span>}
          {filters.year !== 'All' && <span style={{ marginRight: '10px' }}>📅 Year: {filters.year}</span>}
          {filters.iitpkd_only && <span style={{ marginRight: '10px' }}>🎓 IITPKD Only</span>}
          {filters.search && <span style={{ marginRight: '10px' }}>🔍 Search: "{filters.search}"</span>}
          {filters.status === 'All' && filters.sector === 'All' && filters.year === 'All' && !filters.iitpkd_only && !filters.search && 
            <span>No filters applied (showing all data)</span>
          }
        </div>
      </div>

      {/* Single View Section based on radio selection */}
      <div className="chart-section" style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#fff', 
        borderRadius: '10px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
      }}>
        {/* Yearly Growth Chart */}
        {viewType === 'yearlyGrowth' && (
          <div>
            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📈</span> Year-wise Growth
              </h2>
              <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                Growth of incubatees, startups, and innovation projects over time.
              </p>
            </div>

            {yearlyChartData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 12 }}
                      label={{ 
                        value: 'Year', 
                        position: 'insideBottom', 
                        offset: -10,
                        style: { fill: '#666', fontSize: 14, fontWeight: 'bold' }
                      }}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 12 }}
                      label={{ 
                        value: 'Count', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fill: '#666', fontSize: 14, fontWeight: 'bold' }
                      }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="plainline" />
                    <Line 
                      type="monotone" 
                      dataKey="incubatees" 
                      name="Incubatees" 
                      stroke="#667eea" 
                      strokeWidth={3} 
                      dot={{ r: 6, fill: '#667eea' }}
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="startups" 
                      name="Startups" 
                      stroke="#764ba2" 
                      strokeWidth={2} 
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="innovationProjects" 
                      name="Innovation Projects" 
                      stroke="#43e97b" 
                      strokeWidth={2} 
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Chart Statistics */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '15px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '24px' }}>
                      {yearlyChartData.reduce((sum, item) => sum + item.incubatees, 0)}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Incubatees</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#764ba2', fontWeight: 'bold', fontSize: '24px' }}>
                      {yearlyChartData.reduce((sum, item) => sum + item.startups, 0)}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Startups</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#43e97b', fontWeight: 'bold', fontSize: '24px' }}>
                      {yearlyChartData.reduce((sum, item) => sum + item.innovationProjects, 0)}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Projects</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                      {yearlyChartData.length}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Years Covered</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📈</span>
                <p style={{ color: '#666', fontSize: '16px' }}>No yearly growth data available.</p>
              </div>
            )}
          </div>
        )}

        {/* Sector Distribution Chart */}
        {viewType === 'sectorDistribution' && (
          <div>
            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📊</span> Sector-wise Innovation Distribution
              </h2>
              <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                Distribution of startups and innovation projects by sector.
              </p>
            </div>

            {sectorPieData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                    <Pie
                      data={sectorPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={{ stroke: '#666', strokeWidth: 1 }}
                    >
                      {sectorPieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => {
                        if (name === 'value') return `${value} total`;
                        return value;
                      }}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                    />
                    <Legend 
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{
                        paddingLeft: '20px',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Sector Statistics */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '15px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '24px' }}>
                      {sectorPieData.length}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Sectors</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>
                      {sectorPieData.reduce((sum, item) => sum + item.value, 0)}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Entities</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                      {sectorPieData.reduce((sum, item) => sum + (item.startups || 0), 0)}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Startups</div>
                  </div>
                </div>

                {/* Sector Details Cards */}
                <div style={{ 
                  marginTop: '20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '10px'
                }}>
                  {sectorPieData.map((sector, index) => (
                    <div key={sector.name} style={{
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '10px',
                      border: `1px solid ${SECTOR_COLORS[index % SECTOR_COLORS.length]}`,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{sector.name}</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: SECTOR_COLORS[index % SECTOR_COLORS.length] }}>
                        {sector.value}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {sector.startups} startups · {sector.projects} projects
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                <p style={{ color: '#666', fontSize: '16px' }}>No sector distribution data available.</p>
              </div>
            )}
          </div>
        )}

        {/* Startups Directory Table */}
        {viewType === 'startupsDirectory' && (
          <div>
            <div className="chart-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📋</span> Startups Directory
              </h2>
              <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                Search and filter through all startups and incubatees.
              </p>
            </div>

            {startupsList.length > 0 ? (
              <div>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="grievance-table" style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f97316', color: 'white' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Startup Name</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Founder</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Innovation / Focus Area</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Year</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Sector</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>IIT Palakkad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {startupsList.map((startup, index) => (
                        <tr 
                          key={startup.startup_id}
                          style={{ 
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                            borderBottom: '1px solid #e0e0e0'
                          }}
                        >
                          <td style={{ padding: '12px', fontWeight: '500' }}>{startup.startup_name}</td>
                          <td style={{ padding: '12px' }}>{startup.founder_name}</td>
                          <td style={{ padding: '12px' }}>{startup.innovation_focus_area || '—'}</td>
                          <td style={{ padding: '12px' }}>{startup.year_of_incubation}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ 
                              backgroundColor: startup.status === 'Active' ? '#dcfce7' : '#fee2e2',
                              color: startup.status === 'Active' ? '#166534' : '#991b1b',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {startup.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {startup.sector && (
                              <span style={{ 
                                backgroundColor: '#e0e7ff',
                                color: '#3730a3',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}>
                                {startup.sector}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span style={{ 
                              backgroundColor: startup.is_from_iitpkd ? '#dcfce7' : '#f3f4f6',
                              color: startup.is_from_iitpkd ? '#166534' : '#6b7280',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {startup.is_from_iitpkd ? '✓ Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Statistics */}
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '15px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                      {startupsList.length}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Showing</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>
                      {startupsList.filter(s => s.status === 'Active').length}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Active</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px' }}>
                      {startupsList.filter(s => s.is_from_iitpkd).length}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>IITPKD Startups</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '24px' }}>
                      {new Set(startupsList.map(s => s.sector).filter(Boolean)).size}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Sectors</div>
                  </div>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1rem',
                    marginTop: '2rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: pagination.page === 1 ? '#ccc' : '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      ← Previous
                    </button>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                      Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong> 
                      <span style={{ marginLeft: '8px', color: '#999' }}>
                        ({formatNumber(pagination.total)} total)
                      </span>
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.total_pages}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: pagination.page >= pagination.total_pages ? '#ccc' : '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: pagination.page >= pagination.total_pages ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data" style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
                <p style={{ color: '#666', fontSize: '16px' }}>No startups found for the selected filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Upload Modal - only in admin view */}
      {!isPublicView && (
        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="startups"
          token={token}
        />
      )}
    </div>
  );
}

export default InnovationSection;