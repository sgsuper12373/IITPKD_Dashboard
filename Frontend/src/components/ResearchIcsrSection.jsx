import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Bar, LabelList
} from 'recharts';

import {
  fetchResearchFilterOptions,
  fetchIcsrSummary,
  fetchIcsrProjectTrend,

  fetchIcsrProjectList,
  fetchPatentStats,

  fetchMouTrend,
  fetchMouList,
} from '../services/researchStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

import DataUploadModal from './LazyDataUploadModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './ResearchSection.css';

const PATENT_STATUS_ORDER = ['Filed', 'Published', 'Granted'];
const PATENT_COLORS = {
  Filed: '#6366f1',
  Published: '#a855f7',
  Granted: '#22c55e',
};

const MOU_COLOR = '#a855f7';

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(numeric);
};

const formatCompactCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return '₹0';
  if (numeric >= 10000000) {
    return '₹' + (numeric / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  } else if (numeric >= 100000) {
    return '₹' + (numeric / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  }
  return '₹' + formatNumber(numeric);
};

const buildPatentBreakdown = (source = {}) => ({
  Filed: Number(source?.Filed) || 0,
  Granted: Number(source?.Granted) || 0,
});

function ResearchIcsrSection({ user, isPublicView = false, mouOnly = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [filterOptions, setFilterOptions] = useState({
    project_departments: [],
    project_years: [],
    project_statuses: [],
    project_types: [],
    patent_years: [],
    patent_statuses: []
  });

  // Graph type selection with radio buttons — init from router state if provided
  const [viewType, setViewType] = useState(mouOnly ? 'mou' : (location.state?.view || 'projects'));

  // Bar / Trend chart mode per section
  const [projectsChartMode, setProjectsChartMode] = useState('bar');
  const [patentsChartMode, setPatentsChartMode] = useState('bar');

  const [filters, setFilters] = useState({
    department: 'All',
    project_year: 'All',
    project_type: 'All',
    status: 'All',
    patent_year: 'All',
    patent_status: 'All'
  });

  const [summary, setSummary] = useState({
    funded_projects: 0,
    consultancy_projects: 0,
    sanctioned_projects: 0,
    total_projects: 0,
    total_patents: 0,
    consultancy_revenue: 0,
    patent_breakdown: buildPatentBreakdown()
  });

  const [projectTrend, setProjectTrend] = useState([]);
  const [projectList, setProjectList] = useState([]);
  const [patentStats, setPatentStats] = useState({ overall: buildPatentBreakdown(), yearly: [] });


  // MoU state
  const [mouFilters, setMouFilters] = useState({ mou_year: 'All' });
  const [totalMous, setTotalMous] = useState(0);
  const [mouTrend, setMouTrend] = useState([]);
  const [mouList, setMouList] = useState([]);
  const [mouViewType, setMouViewType] = useState('trend'); // 'trend' | 'directory'
  const [mouChartMode, setMouChartMode] = useState('bar');

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const selectStyle = {
    padding: '8px',
    fontSize: '13px',
    width: '100%',
    borderRadius: '6px',
    border: '1px solid #ddd',
    outline: 'none'
  };

  const tabStyle = (type) => ({
    padding: '5px 12px',
    borderRadius: '6px',

    // Border (always visible, stronger when selected)
    border: viewType === type ? '2px solid #f97316' : '1px solid #e2e8f0',

    // Background
    backgroundColor: viewType === type ? '#fff7ed' : '#f8fafc',

    // Text color
    color: viewType === type ? '#9a3412' : '#475569',

    // Typography
    fontSize: '14px',
    fontWeight: '600',

    // Interaction
    cursor: 'pointer',
    whiteSpace: 'nowrap',

    // Effects
    boxShadow: viewType === type
      ? '0 4px 10px rgba(249, 115, 22, 0.25)'
      : '0 1px 2px rgba(0,0,0,0.04)',

    transform: viewType === type ? 'translateY(-1px)' : 'none',

    // Smooth transition
    transition: 'all 0.2s ease'
  });

  const serializedFilters = JSON.stringify(filters);
  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const options = await fetchResearchFilterOptions(filters, token);
        if (!isMounted) return;
        setFilterOptions({
          project_departments: Array.isArray(options?.project_departments) ? options.project_departments : [],
          project_years: Array.isArray(options?.project_years)
            ? [...options.project_years].sort((a, b) => b - a)
            : [],
          project_statuses: Array.isArray(options?.project_statuses) ? options.project_statuses : [],
          project_types: Array.isArray(options?.project_types) ? options.project_types : [],
          mou_years: Array.isArray(options?.mou_years) ? [...options.mou_years].sort((a, b) => b - a) : [],
          patent_years: Array.isArray(options?.patent_years)
            ? [...options.patent_years].sort((a, b) => b - a)
            : [],
          patent_statuses: Array.isArray(options?.patent_statuses) ? options.patent_statuses : []
        });
        setError(null);
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load research filter options:', err);
          setError(err.message || 'Failed to load filter options.');
        }
      }
    };
    loadFilterOptions();
    return () => { isMounted = false; };
  }, [serializedFilters, filters, token, uploadVersion]);

  useEffect(() => {
    const loadData = async () => {
      if (mouOnly) return;
      try {
        setLoading(true);
        setError(null);

        const [
          summaryResp,
          projectTrendResp,
          projectListResp,
          patentStatsResp
        ] = await Promise.all([
          fetchIcsrSummary(filters, token),
          fetchIcsrProjectTrend(filters, token),
          fetchIcsrProjectList(filters, token),
          fetchPatentStats(
            {
              patent_year: filters.patent_year,
              patent_status: filters.patent_status
            },
            token
          )
        ]);

        setSummary({
          funded_projects: summaryResp?.funded_projects || 0,
          consultancy_projects: summaryResp?.consultancy_projects || 0,
          sanctioned_projects:
            summaryResp?.sanctioned_projects ?? summaryResp?.total_projects ?? 0,
          total_projects: summaryResp?.total_projects ?? summaryResp?.sanctioned_projects ?? 0,
          total_patents: summaryResp?.total_patents || 0,
          consultancy_revenue: summaryResp?.total_sanctioned_revenue || summaryResp?.consultancy_revenue || 0,
          patent_breakdown: buildPatentBreakdown(summaryResp?.patent_breakdown)
        });

        setProjectTrend(projectTrendResp?.data || []);
        setProjectList(projectListResp?.data || []);
        setPatentStats({
          overall: buildPatentBreakdown(patentStatsResp?.overall),
          yearly: Array.isArray(patentStatsResp?.yearly) ? patentStatsResp.yearly : []
        });

      } catch (err) {
        console.error('Failed to load ICSR analytics:', err);
        setError(err.message || 'Failed to load ICSR analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, filters.patent_year, filters.patent_status, token, uploadVersion, mouOnly]);

  // MoU data loading
  useEffect(() => {
    const loadMouData = async () => {
      try {
        const [trendResp, listResp] = await Promise.all([
          fetchMouTrend({ mou_year: mouFilters.mou_year }, token),
          fetchMouList({ mou_year: mouFilters.mou_year }, token),
        ]);
        const trend = trendResp?.data || [];
        setMouTrend(trend);
        setMouList(listResp?.data || []);
        setTotalMous(trend.reduce((sum, row) => sum + (Number(row.total) || 0), 0));
      } catch (err) {
        console.error('Failed to load MoU data:', err);
      }
    };
    loadMouData();
  }, [mouFilters, token, uploadVersion]);

  const projectTrendChartData = useMemo(() => {
    if (!projectTrend.length) return [];
    return projectTrend.map((row) => ({
      year: row.year,
      funded: Number(row.funded) || 0,
      consultancy: Number(row.consultancy) || 0
    }));
  }, [projectTrend]);



  const patentTrendChartData = useMemo(() => {
    if (!patentStats.yearly.length) return [];
    return patentStats.yearly.map((row) => {
      const filedCount = Number(row.Filed) || 0;
      const grantedCount = Number(row.Granted) || 0;
      const publishedCount = Number(row.Published) || 0;

      // As per user request: Filed bar = Filed + Granted + Published
      const entry = {
        year: row.year,
        Filed: filedCount + grantedCount + publishedCount,
        Published: publishedCount,
        Granted: grantedCount,
      };

      entry.total = entry.Filed; // Total is now represented by the "Filed" bar
      return entry;
    });
  }, [patentStats.yearly]);

  const mouTrendChartData = useMemo(() =>
    mouTrend.map((row) => ({ year: row.year, total: Number(row.total) || 0 })),
    [mouTrend]
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMouFilterChange = (field, value) =>
    setMouFilters((prev) => ({ ...prev, [field]: value }));
  const handleClearMouFilters = () => setMouFilters({ mou_year: 'All' });

  const handleClearFilters = () => {
    setFilters({
      department: 'All',
      project_year: 'All',
      project_type: 'All',
      status: 'All',
      patent_year: 'All',
      patent_status: 'All'
    });
  };

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button
            className="page-back-btn"
            onClick={() => navigate('/research')}
          >
            ← Back to Research
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>
                {mouOnly
                  ? 'Industry Collaboration'
                  : 'Industrial Consultancy & Sponsored Research'}
              </h1>
            </div>

            {!isReadOnlyView && isAdmin && (
              <div className="section-header-actions">
                {!mouOnly && (
                  <>
                    <button
                      className="page-upload-btn"
                      onClick={() => {
                        setActiveUploadTable('icsr_consultancy_projects');
                        setIsUploadModalOpen(true);
                      }}
                    >
                      <span>📤</span> Consultancy
                    </button>

                    <button
                      className="page-upload-btn"
                      onClick={() => {
                        setActiveUploadTable('icsr_sponsered_projects');
                        setIsUploadModalOpen(true);
                      }}
                    >
                      <span>📤</span> Sponsored
                    </button>

                    <button
                      className="page-upload-btn"
                      onClick={() => {
                        setActiveUploadTable('research_patents');
                        setIsUploadModalOpen(true);
                      }}
                    >
                      <span>📤</span> Patents
                    </button>
                  </>
                )}

                <button
                  className="page-upload-btn"
                  onClick={() => {
                    setActiveUploadTable('research_mous');
                    setIsUploadModalOpen(true);
                  }}
                >
                  <span>📤</span> MoUs
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message" style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
          <ExportMenu
            elementId="icsr-summary-cards-container"
            data={[{
              total_projects: summary.total_projects,
              funded_projects: summary.funded_projects,
              consultancy_projects: summary.consultancy_projects,
              total_revenue: summary.consultancy_revenue,
              patents_filed: summary.patent_breakdown.Filed,
              patents_granted: summary.patent_breakdown.Granted,
              total_patents: summary.total_patents,
              total_mous: totalMous
            }]}
            headers={['Total Projects', 'Funded', 'Consultancy', 'Revenue', 'Patents Filed', 'Patents Granted', 'Total MoUs']}
            keys={['total_projects', 'funded_projects', 'consultancy_projects', 'total_revenue', 'patents_filed', 'patents_granted', 'total_mous']}
            filename="icsr_summary"
            title="ICSR Impact Summary"
          />
        </div>

        {/* Modern Summary Cards */}
        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
          <div id="icsr-summary-cards-container" style={{
            display: 'grid',
            gridTemplateColumns: mouOnly ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '10px'
          }}>
            {!mouOnly && (
              <>
                {/* Total Sanctioned Projects Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(79, 70, 229, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📊</span>
                      <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '500' }}>Total Projects</h3>
                    </div>
                    <div className="metric-value" style={{ color: 'white' }}>
                      {formatNumber(summary.total_projects)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Sponsored + Consultancy</span>
                    </div>
                  </div>
                </div>

                {/* Externally Funded Projects Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🎯</span>
                      <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '500' }}>Sponsored Projects</h3>
                    </div>
                    <div className="metric-value" style={{ color: 'white' }}>
                      {formatNumber(summary.funded_projects)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Active + completed</span>
                    </div>
                  </div>
                </div>

                {/* Consultancy Projects Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(249, 115, 22, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>💼</span>
                      <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '500' }}>Consultancy</h3>
                    </div>
                    <div className="metric-value" style={{ color: 'white' }}>
                      {formatNumber(summary.consultancy_projects)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Active + Completed</span>
                    </div>
                  </div>
                </div>

                {/* Consultancy Revenue Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(20, 184, 166, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>💰</span>
                      <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '500' }}>Total Project Value</h3>
                    </div>
                    <div className="metric-value-sm" style={{ color: 'white' }} title={`₹${formatNumber(summary.consultancy_revenue)}`}>
                      {formatCompactCurrency(summary.consultancy_revenue)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}> Sponsored + Consultancy  </span>
                    </div>
                  </div>
                </div>

                {/* Patents Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 10px 25px rgba(236, 72, 153, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📝</span>
                      <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '500' }}>Total Patents</h3>
                    </div>
                    <div className="metric-value-sm" style={{ color: 'white' }}>
                      {formatNumber(summary.total_patents)} <span style={{ fontSize: '0.5em', opacity: 0.8 }}>Filed</span> / {formatNumber(summary.patent_breakdown.Granted)} <span style={{ fontSize: '0.5em', opacity: 0.8 }}>Granted</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Research IP stats</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MoU Summary Card */}
            {(!isReadOnlyView || mouOnly) && (
              <div style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 10px 25px rgba(168, 85, 247, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🤝</span>
                    <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: '500' }}>Total MoUs</h3>
                  </div>
                  <div className="metric-value" style={{ color: 'white' }}>
                    {formatNumber(totalMous)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>External collaborations</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}</>

        {/* ✅ GLOBAL FILTER BLOCK — hidden when MoU view (MoU has its own unified container) */}
        {viewType !== 'mou' && (
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
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '15px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                </div>

                {/* ✅ BUTTONS JUST AFTER HEADING */}
                {!mouOnly && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <button style={tabStyle('projects')} onClick={() => setViewType('projects')}>📊 Projects Trend</button>
                    <button style={tabStyle('patents')} onClick={() => setViewType('patents')}>📝 Patents Trend</button>
                    <button style={tabStyle('projectsTable')} onClick={() => setViewType('projectsTable')}>📋 Projects Directory</button>
                    <button style={tabStyle('mou')} onClick={() => setViewType('mou')}>🤝 MoUs</button>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  handleClearFilters();
                  handleClearMouFilters();
                }}
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

            <div
              className="filter-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}
            >
              {/* ✅ PROJECT FILTERS */}
              {(viewType === 'projects' || viewType === 'projectsTable') && (
                <>
                  <div className="filter-group">
                    <label>Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Departments</option>
                      {filterOptions.project_departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Project Year</label>
                    <select
                      value={filters.project_year}
                      onChange={(e) => handleFilterChange('project_year', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Years</option>
                      {filterOptions.project_years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Project Type</label>
                    <select
                      value={filters.project_type}
                      onChange={(e) => handleFilterChange('project_type', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Types</option>
                      {filterOptions.project_types.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Statuses</option>
                      {filterOptions.project_statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ✅ PATENT FILTERS */}
              {viewType === 'patents' && (
                <>
                  <div className="filter-group">
                    <label>Patent Year</label>
                    <select
                      value={filters.patent_year}
                      onChange={(e) => handleFilterChange('patent_year', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Years</option>
                      {filterOptions.patent_years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Patent Status</label>
                    <select
                      value={filters.patent_status}
                      onChange={(e) => handleFilterChange('patent_status', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Statuses</option>
                      {filterOptions.patent_statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Active Filters Summary */}
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Active Filters:</strong>{' '}
              {(viewType === 'projects' || viewType === 'projectsTable') && (
                <>
                  {filters.department !== 'All' && <span>🏢 {filters.department}</span>}
                  {filters.project_year !== 'All' && <span> 📅 {filters.project_year}</span>}
                  {filters.project_type !== 'All' && <span> 📋 {filters.project_type}</span>}
                  {filters.status !== 'All' && <span> ⚡ {filters.status}</span>}
                </>
              )}

              {viewType === 'patents' && (
                <>
                  {filters.patent_year !== 'All' && <span>📅 {filters.patent_year}</span>}
                  {filters.patent_status !== 'All' && <span> 📌 {filters.patent_status}</span>}
                </>
              )}
            </div>
          </div>
        )}

        <>
          {/* Projects Trend Section */}
          {viewType === 'projects' && (
            <section className="chart-section" style={{
              marginBottom: '0px',
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="chart-header">
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📊</span> Projects Trend
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                    Annual count of sponsored and consultancy projects.
                  </p>
                </div>
                <ExportMenu
                  elementId="research-projects-trend-container"
                  data={projectTrendChartData}
                  headers={['Year', 'Sponsored Projects', 'Consultancy Projects']}
                  keys={['year', 'funded', 'consultancy']}
                  filename="research_projects_trend"
                  title="Projects Trend"
                />
              </div>

              {/* Bar / Trend toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['bar', 'trend'].map((mode) => (
                  <button key={mode} onClick={() => setProjectsChartMode(mode)} style={{
                    padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: 'none',
                    backgroundColor: projectsChartMode === mode ? '#4f46e5' : '#f1f5f9',
                    color: projectsChartMode === mode ? '#fff' : '#555'
                  }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                ))}
              </div>

              <div id="research-projects-trend-container" className={`chart-container ${!projectTrendChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${projectTrendChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <ResponsiveContainer width="100%" height={350}>
                    {projectsChartMode === 'bar' ? (
                      <BarChart data={projectTrendChartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis
                          stroke="#666"
                          tick={{ fontSize: 11 }}
                          domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                        <Bar dataKey="funded" name="Sponsored Projects" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={18}>
                          <LabelList dataKey="funded" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                        </Bar>
                        <Bar dataKey="consultancy" name="Consultancy Projects" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={18}>
                          <LabelList dataKey="consultancy" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                        </Bar>
                      </BarChart>
                    ) : (
                      <LineChart data={projectTrendChartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis
                          stroke="#666"
                          tick={{ fontSize: 11 }}
                          domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="linear" dataKey="funded" name="Sponsored Projects" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }}>
                          <LabelList dataKey="funded" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                        </Line>
                        <Line type="linear" dataKey="consultancy" name="Consultancy Projects" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }}>
                          <LabelList dataKey="consultancy" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                        </Line>
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}</>
              </div>
            </section>
          )}

          {/* Patents Trend Section */}
          {viewType === 'patents' && (
            <section className="chart-section" style={{
              marginBottom: '0px',
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="chart-header">
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📝</span> Knwoledge Transfer
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                    Year-wise patent filings, grants, and publications.
                  </p>
                </div>
                <ExportMenu
                  elementId="research-patents-trend-container"
                  data={patentTrendChartData}
                  headers={['Year', 'Filed', 'Granted', 'Total']}
                  keys={['year', 'Filed', 'Granted', 'total']}
                  filename="research_patents_trend"
                  title="Patents Trend"
                />
              </div>

              {/* Bar / Trend toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['bar', 'trend'].map((mode) => (
                  <button key={mode} onClick={() => setPatentsChartMode(mode)} style={{
                    padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: 'none',
                    backgroundColor: patentsChartMode === mode ? '#f97316' : '#f1f5f9',
                    color: patentsChartMode === mode ? '#fff' : '#555'
                  }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                ))}
              </div>

              <div id="research-patents-trend-container" className={`chart-container ${!patentTrendChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${patentTrendChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <ResponsiveContainer width="100%" height={350}>
                    {patentsChartMode === 'bar' ? (
                      <BarChart data={patentTrendChartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis
                          stroke="#666"
                          tick={{ fontSize: 11 }}
                          domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                        />
                        <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                        {PATENT_STATUS_ORDER.map((status) => (
                          <Bar key={status} dataKey={status} name={status} fill={PATENT_COLORS[status]} radius={[4, 4, 0, 0]} barSize={18}>
                            <LabelList dataKey={status} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[status] }} />
                          </Bar>
                        ))}
                      </BarChart>
                    ) : (
                      <LineChart data={patentTrendChartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis
                          stroke="#666"
                          tick={{ fontSize: 11 }}
                          domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                        />
                        <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                        {PATENT_STATUS_ORDER.map((status) => (
                          <Line key={status} type="linear" dataKey={status} name={status} stroke={PATENT_COLORS[status]} strokeWidth={2.5} dot={{ r: 5, fill: PATENT_COLORS[status] }} activeDot={{ r: 7 }}>
                            <LabelList dataKey={status} offset={10} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[status] }} />
                          </Line>
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}</>
              </div>
            </section>
          )}

          {/* Projects Directory Table */}
          {viewType === 'projectsTable' && (
            <section className="chart-section" style={{
              marginBottom: '0px',
              padding: '20px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="chart-header">
                  <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📋</span> Projects Directory
                  </h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
                    {projectList.length} projects found
                  </p>
                </div>
                <ExportMenu
                  elementId="research-projects-directory-table"
                  data={projectList}
                  headers={['Title', 'PI', 'Type', 'Dept', 'Amount (₹)', 'Status']}
                  keys={['project_title', 'principal_investigator', 'project_type', 'department', 'amount_sanctioned', 'status']}
                  filename="research_projects_directory"
                  title="Projects Directory"
                  exportType="table"
                />
              </div>

              <div id="research-projects-directory-table" className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#0ea5e9', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '10px' }}>Title</th>
                        <th style={{ padding: '10px' }}>PI</th>
                        <th style={{ padding: '10px' }}>Type</th>
                        <th style={{ padding: '10px' }}>Dept</th>
                        <th style={{ padding: '10px' }}>Amount</th>
                        <th style={{ padding: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectList.map((p, i) => (
                        <tr key={p.project_id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          <td style={{ padding: '8px' }}>{p.project_title}</td>
                          <td style={{ padding: '8px' }}>{p.principal_investigator}</td>
                          <td style={{ padding: '8px' }}>{p.project_type}</td>
                          <td style={{ padding: '8px' }}>{p.department}</td>
                          <td style={{ padding: '8px' }}>{formatCurrency(p.amount_sanctioned)}</td>
                          <td style={{ padding: '8px' }}>{p.status}</td>
                        </tr>
                      ))}
                      {!projectList.length && (
                        <tr>
                          <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#6c757d', fontWeight: 500 }}>
                            No information available for the selected filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}</>
              </div>
            </section>
          )}

          {/* =====================================================================
              MoU Section — Unified single container: filter + chart/table together
          ====================================================================== */}
          {viewType === 'mou' && (
            <section className="chart-section" style={{
              marginBottom: '0px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>

              {/* ── Top filter bar ─────────────────────────────────────────────── */}
              <div style={{
                padding: '16px 20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #e9ecef'
              }}>
                {/* Row 1: Filters heading + nav tabs + Clear Filters */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>

                    {/* View-type nav tabs (only shown when not mouOnly) */}
                    {!mouOnly && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <button style={tabStyle('projects')} onClick={() => setViewType('projects')}>📊 Projects Trend</button>
                        <button style={tabStyle('patents')} onClick={() => setViewType('patents')}>📝 Patents Trend</button>
                        <button style={tabStyle('projectsTable')} onClick={() => setViewType('projectsTable')}>📋 Projects Directory</button>
                        <button style={tabStyle('mou')} onClick={() => setViewType('mou')}>🤝 MoUs</button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      handleClearFilters();
                      handleClearMouFilters();
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Clear Filters
                  </button>
                </div>

                {/* Row 2: MoU Trend / Directory toggle + Year dropdown */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  alignItems: 'flex-end'
                }}>
                  {/* Sub-view toggle */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setMouViewType('trend')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '5px',
                        border: mouViewType === 'trend' ? '2px solid #a855f7' : '1px solid #e2e8f0',
                        backgroundColor: mouViewType === 'trend' ? '#faf5ff' : '#f8fafc',
                        color: mouViewType === 'trend' ? '#6b21a8' : '#475569',
                        fontWeight: 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📈 MoUs Trend
                    </button>

                    <button
                      onClick={() => setMouViewType('directory')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '5px',
                        border: mouViewType === 'directory' ? '2px solid #ec4899' : '1px solid #e2e8f0',
                        backgroundColor: mouViewType === 'directory' ? '#fdf2f8' : '#f8fafc',
                        color: mouViewType === 'directory' ? '#9d174d' : '#475569',
                        fontWeight: 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      📋 MoUs Directory
                    </button>
                  </div>

                  {/* Year filter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: '#555' }}>MoU Year</label>
                    <select
                      value={mouFilters.mou_year}
                      onChange={(e) => handleMouFilterChange('mou_year', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="All">All Years</option>
                      {(filterOptions.mou_years || []).map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Chart / Table body ──────────────────────────────────────────── */}
              <div style={{ padding: '20px' }}>

                {/* Header row: title + Export */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                      <span>🤝</span>
                      {mouViewType === 'trend' ? 'MoUs Trend' : 'MoUs Directory'}
                    </h2>
                    {mouViewType === 'directory' && (
                      <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
                        {mouList.length} MoUs found
                      </p>
                    )}
                  </div>
                  <ExportMenu
                    elementId={mouViewType === 'trend' ? "research-mou-trend-container" : "research-mou-directory-table"}
                    data={mouViewType === 'trend' ? mouTrendChartData : mouList}
                    headers={mouViewType === 'trend' ? ['Year', 'MoUs Signed'] : ['Partner', 'Focus', 'Signed', 'Valid Till']}
                    keys={mouViewType === 'trend' ? ['year', 'total'] : ['partner_name', 'collaboration_nature', 'date_signed', 'validity_end']}
                    filename={`research_mous_${mouViewType}`}
                    title={mouViewType === 'trend' ? "MoUs Trend" : "MoUs Directory"}
                  />
                </div>

                {/* ── Trend view ── */}
                {mouViewType === 'trend' && (
                  <>
                    {/* Bar / Trend mode toggle */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      {['bar', 'trend'].map((mode) => (
                        <button key={mode} onClick={() => setMouChartMode(mode)} style={{
                          padding: '6px 16px', fontSize: '13px', fontWeight: 600,
                          borderRadius: '6px', cursor: 'pointer', border: 'none',
                          backgroundColor: mouChartMode === mode ? MOU_COLOR : '#f1f5f9',
                          color: mouChartMode === mode ? '#fff' : '#555'
                        }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                      ))}
                    </div>

                    <div
                      id="research-mou-trend-container"
                      className={`chart-container ${!mouTrendChartData.length ? 'chart-has-empty' : ''}`}
                      style={{ position: 'relative', height: '450px' }}
                    >
                      <div className={`section-empty-state ${mouTrendChartData.length ? 'hidden' : ''}`}>
                        <p>No information available for the selected filter</p>
                      </div>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={450}>
                          {mouChartMode === 'bar' ? (
                            <BarChart data={mouTrendChartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                              <YAxis
                                stroke="#666"
                                tick={{ fontSize: 11 }}
                                domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                              />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                              <Bar dataKey="total" name="MoUs Signed" fill={MOU_COLOR} radius={[4, 4, 0, 0]} barSize={28}>
                                <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: MOU_COLOR }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <LineChart data={mouTrendChartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                              <YAxis
                                stroke="#666"
                                tick={{ fontSize: 11 }}
                                domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]}
                              />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                              <Line type="linear" dataKey="total" name="MoUs Signed"
                                stroke={MOU_COLOR} strokeWidth={3}
                                dot={{ r: 6, fill: MOU_COLOR }} activeDot={{ r: 8 }}>
                                <LabelList dataKey="total" offset={10} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: MOU_COLOR }} />
                              </Line>
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      )}</>
                    </div>
                  </>
                )}

                {/* ── Directory view ── */}
                {mouViewType === 'directory' && (
                  <div
                    id="research-mou-directory-table"
                    className="table-responsive"
                    style={{ height: '450px', maxHeight: '450px', overflowY: 'auto' }}
                  >
                    <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: MOU_COLOR, color: 'white' }}>
                          <tr>
                            <th style={{ padding: '10px' }}>Partner</th>
                            <th style={{ padding: '10px' }}>Focus</th>
                            <th style={{ padding: '10px' }}>Signed</th>
                            <th style={{ padding: '10px' }}>Valid Till</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mouList.map((m, i) => (
                            <tr key={m.mou_id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                              <td style={{ padding: '8px' }}>{m.partner_name}</td>
                              <td style={{ padding: '8px' }}>{m.collaboration_nature}</td>
                              <td style={{ padding: '8px' }}>{formatDate(m.date_signed)}</td>
                              <td style={{ padding: '8px' }}>{formatDate(m.validity_end)}</td>
                            </tr>
                          ))}
                          {!mouList.length && (
                            <tr>
                              <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#6c757d', fontWeight: 500 }}>
                                No information available for the selected filter
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}</>
                  </div>
                )}

              </div>
            </section>
          )}

        </>
      </div>

      {/* Upload Modal */}
      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </div>
  );
}

export default ResearchIcsrSection;