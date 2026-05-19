import { useEffect, useMemo, useState, useCallback } from 'react';
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
  Line, LabelList} from 'recharts';
import {
  fetchFilterOptions,
  fetchSummary,
  fetchDepartmentBreakdown,
  fetchYearTrend,
  fetchTypeDistribution,
  fetchFacultyEngagementList
} from '../services/educationStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import '../DesignSystem.css';
import DataUploadModal from './LazyDataUploadModal';
import './Page.css';
import './AcademicSection.css';
import './EducationAdministrativeSection.css';
import { useNavigate } from 'react-router-dom';
import ChartExpandModal from './ChartExpandModal';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

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
  const [expandedChart, setExpandedChart] = useState(null);
  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);

  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle, { passive: true });
    return () => window.removeEventListener('resize', handle);
  }, []);

  // Drill-down states
  const [selectedCardType, setSelectedCardType] = useState(null);
  const [cardDetailsData, setCardDetailsData] = useState([]);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  // Get current filters based on view type
  const getCurrentFilters = () => {
    switch (viewType) {
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
  const handleFilterChange = useCallback((field, value) => {
    switch (viewType) {
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
  }, [viewType]);

  // Clear filters for current view
  const handleClearFilters = () => {
    const latestYear = filterOptions.years.length > 0 ? filterOptions.years[0].toString() : 'All';
    const defaultFilters = {
      year: latestYear,
      department: 'All',
      engagement_type: 'All'
    };

    switch (viewType) {
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

  const currentFilters = getCurrentFilters();
  const serializedFilters = JSON.stringify(currentFilters);

  // Fetch filter options â€" cross-filtering: refetch when current filters change
  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const parsedFilters = JSON.parse(serializedFilters);
        const options = await fetchFilterOptions(parsedFilters, token);
        if (!isMounted) return;
        const fetchedYears = Array.isArray(options?.years) ? [...options.years].sort((a, b) => b - a) : [];
        setFilterOptions({
          years: fetchedYears,
          departments: Array.isArray(options?.departments) ? options.departments : [],
          engagement_types: Array.isArray(options?.engagement_types) ? options.engagement_types : []
        });

        // Automatically set the latest year as default if currently 'All'
        if (fetchedYears.length > 0) {
          const latestYear = fetchedYears[0].toString();
          setSummaryFilters(prev => prev.year === 'All' ? { ...prev, year: latestYear } : prev);
          setDepartmentFilters(prev => prev.year === 'All' ? { ...prev, year: latestYear } : prev);
          setTrendFilters(prev => prev.year === 'All' ? { ...prev, year: latestYear } : prev);
          setDistributionFilters(prev => prev.year === 'All' ? { ...prev, year: latestYear } : prev);
          setDetailsFilters(prev => prev.year === 'All' ? { ...prev, year: latestYear } : prev);
          setHonoraryFilters(prev => prev.year === 'All' ? { ...prev, year: latestYear } : prev);
        }

        // Auto-correct invalid filter selections
        const corrections = {};
        let hasChanges = false;
        if (parsedFilters.year !== 'All' && parsedFilters.year && fetchedYears.length && !fetchedYears.map(String).includes(String(parsedFilters.year))) {
          corrections.year = 'All'; hasChanges = true;
        }
        if (parsedFilters.department !== 'All' && parsedFilters.department && options.departments && !options.departments.includes(parsedFilters.department)) {
          corrections.department = 'All'; hasChanges = true;
        }
        if (hasChanges) {
          Object.entries(corrections).forEach(([field, val]) => handleFilterChange(field, val));
        }

        setError(null);
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch filter options:', err);
          setError(err.message || 'Failed to load filter options.');
        }
      }
    };

    loadFilterOptions();
    return () => { isMounted = false; };
  }, [serializedFilters, token, uploadVersion, viewType, handleFilterChange]);

  // Fetch summary data
  useEffect(() => {
    const loadSummaryData = async () => {
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

  // Fetch drill-down details for summary cards
  useEffect(() => {
    const loadCardDetails = async () => {
      if (!selectedCardType) return;
      try {
        // setIsCardDetailsLoading(true);
        const filterParams = {
          engagement_type: selectedCardType
        };
        if (summaryFilters.year !== 'All') {
          filterParams.year = summaryFilters.year;
        }

        const response = await fetchFacultyEngagementList(filterParams, token);
        setCardDetailsData(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        console.error('Failed to load card details:', err);
      } finally {
        // setIsCardDetailsLoading(false);
      }
    };

    loadCardDetails();
  }, [selectedCardType, summaryFilters.year, token]);

  // Fetch department data
  useEffect(() => {
    const loadDepartmentData = async () => {
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

  // Using shared CustomTooltip from chartUtils



  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/education')}>
            â† Back to Education
          </button>
        )}
        {!isReadOnlyView && (
          <div className="chart-title-row">
            <h1>Administrative Section - External Academic Engagement</h1>
            {!isReadOnlyView && isAdmin && (
              <button
                className="page-upload-btn"
                onClick={() => setIsUploadModalOpen(true)}
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
        <div className="mode-toggle-row edu-adm-toggle-row">
          <label className={`view-radio-label edu-adm-radio edu-adm-radio--summary${viewType === 'summary' ? ' active' : ''}`}>
            <input type="radio" name="viewType" value="summary" checked={viewType === 'summary'} onChange={(e) => setViewType(e.target.value)} />
            <span>
              ðŸ"Š Summary Indicators
            </span>
          </label>

          <label className={`view-radio-label edu-adm-radio edu-adm-radio--dept${viewType === 'department' ? ' active' : ''}`}>
            <input type="radio" name="viewType" value="department" checked={viewType === 'department'} onChange={(e) => setViewType(e.target.value)} />
            <span>
              ðŸ¢ Department-wise
            </span>
          </label>

          <label className={`view-radio-label edu-adm-radio edu-adm-radio--trend${viewType === 'trend' ? ' active' : ''}`}>
            <input type="radio" name="viewType" value="trend" checked={viewType === 'trend'} onChange={(e) => setViewType(e.target.value)} />
            <span>
              ðŸ"ˆ Year-wise Trends
            </span>
          </label>

          <label className={`view-radio-label edu-adm-radio edu-adm-radio--dist${viewType === 'distribution' ? ' active' : ''}`}>
            <input type="radio" name="viewType" value="distribution" checked={viewType === 'distribution'} onChange={(e) => setViewType(e.target.value)} />
            <span>
              ðŸ¥§ Type Distribution
            </span>
          </label>

          <label className={`view-radio-label edu-adm-radio edu-adm-radio--details${viewType === 'details' ? ' active' : ''}`}>
            <input type="radio" name="viewType" value="details" checked={viewType === 'details'} onChange={(e) => setViewType(e.target.value)} />
            <span>
              ðŸ"‹ Engagement Details
            </span>
          </label>


        </div>

        <div className="edu-adm-panels">


          {/* Summary Indicators View */}
          <div className={viewType !== 'summary' ? 'edu-adm-hidden' : ''}>
            <div className="chart-section">
              {/* Filters for Summary View */}
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <h4 className="shared-filter-panel-title">Filters for Summary View</h4>
                  <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
                </div>

                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="shared-filter-label">Year</label>
                    <select
                      value={summaryFilters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Summary Indicators</h2>
                  <p className="chart-description">
                    Total counts by faculty engagement type
                  </p>
                </div>
                <ExportMenu 
                  elementId="education-summary-cards-container"
                  data={summaryCards}
                  headers={['Type', 'Total', 'Active']}
                  keys={['type', 'total', 'active']}
                  filename="faculty_engagement_summary"
                  title="Summary Indicators"
                />
              </div>

              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                <div id="education-summary-cards-container" className="engagement-cards-grid">
                  {summaryCards.filter((card) => card.type !== 'FacultyFellow').map((card) => (
                    <div
                      key={card.type}
                      className="engagement-card"
                      onClick={() => setSelectedCardType(card.type)}
                      style={{
                        border: selectedCardType === card.type ? `2px solid ${ENGAGEMENT_COLORS[card.type] || '#667eea'}` : undefined,
                        boxShadow: selectedCardType === card.type ? `0 8px 16px ${ENGAGEMENT_COLORS[card.type]}20` : undefined,
                        transform: selectedCardType === card.type ? 'translateY(-4px)' : undefined,
                      }}
                    >
                      <div className="engagement-card-label">{ENGAGEMENT_LABELS[card.type] || card.type}</div>
                      <div className="engagement-card-value" style={{ color: ENGAGEMENT_COLORS[card.type] || '#667eea' }}>
                        {formatNumber(card.total)}
                      </div>
                      <div className="engagement-card-subtitle">Active: {formatNumber(card.active)}</div>
                      {selectedCardType === card.type && (
                        <div className="engagement-card-indicator" style={{ backgroundColor: ENGAGEMENT_COLORS[card.type] || '#667eea' }} />
                      )}
                    </div>
                  ))}
                  {summaryCards.length === 0 && (
                    <div className="engagement-card-empty">No data available</div>
                  )}
                </div>
              )}</>

              {summary.overall_total > 0 && (
                <div className="overall-total-box">
                  <strong>Overall Total: {formatNumber(summary.overall_total)} | Active: {formatNumber(summary.overall_active)}</strong>
                </div>
              )}

              {/* Drill-down details list */}
              {selectedCardType && (
                <div className="drilldown-panel">
                  <div className="drilldown-panel-header">
                    <h3 className="edu-adm-drilldown-h3">
                      <span className="engagement-dot" style={{ backgroundColor: ENGAGEMENT_COLORS[selectedCardType] || '#667eea' }} />
                      {ENGAGEMENT_LABELS[selectedCardType] || selectedCardType} Faculty List
                      <span className="edu-adm-year-label">
                        ({summaryFilters.year === 'All' ? 'All Years' : `Year: ${summaryFilters.year}`})
                      </span>
                    </h3>
                    <div className="edu-adm-drilldown-actions">
                      <ExportMenu 
                        elementId="education-summary-drilldown-table"
                        data={cardDetailsData}
                        headers={['Faculty Name', 'Department']}
                        keys={['faculty_name', 'department']}
                        filename={`faculty_list_${selectedCardType}`}
                        title={`${ENGAGEMENT_LABELS[selectedCardType] || selectedCardType} Faculty List`}
                        exportType="table"
                      />
                      <button className="close-btn" onClick={() => setSelectedCardType(null)}>
                        âœ• Close
                      </button>
                    </div>
                  </div>

                    <div id="education-summary-drilldown-table">
                      {chartIsMobile ? (
                        <div className="faculty-card-list">
                          {cardDetailsData.length > 0 ? (
                            cardDetailsData.map((faculty, idx) => (
                              <div key={idx} className="faculty-card">
                                <div className="faculty-card-name">{faculty.faculty_name}</div>
                                <div className="faculty-card-dept">{faculty.department}</div>
                              </div>
                            ))
                          ) : (
                            <div className="engagement-card-empty">No faculty found for this category and year.</div>
                          )}
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>FACULTY NAME</th>
                                  <th>DEPARTMENT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cardDetailsData.length > 0 ? (
                                  cardDetailsData.map((faculty, idx) => (
                                    <tr key={idx}>
                                      <td>{faculty.faculty_name}</td>
                                      <td>{faculty.department}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="2">No faculty found for this category and year.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}</>
                        </div>
                      )}
                    </div>

                </div>
              )}
            </div>
          </div>

          {/* Department-wise Breakdown View */}
          <div className={viewType !== 'department' ? 'edu-adm-hidden' : ''}>
            <div className="chart-section">
              {/* Filters for Department View */}
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <h4 className="shared-filter-panel-title">Filters for Department-wise View</h4>
                  <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
                </div>

                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="shared-filter-label">Year</label>
                    <select
                      value={departmentFilters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="shared-filter-label">Department</label>
                    <select
                      value={departmentFilters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="shared-filter-label">Engagement Type</label>
                    <select
                      value={departmentFilters.engagement_type}
                      onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Types</option>
                      {filterOptions.engagement_types.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Department-wise Breakdown</h2>
                  <p className="chart-description">
                    Distribution of external academic engagement by department
                  </p>
                </div>
                <ExportMenu 
                  elementId="education-dept-chart-container"
                  data={departmentChartData}
                  headers={['Department', ...summary.summary.filter(item => item.engagement_type !== 'FacultyFellow').map(item => ENGAGEMENT_LABELS[item.engagement_type] || item.engagement_type), 'Total']}
                  keys={['department', ...summary.summary.filter(item => item.engagement_type !== 'FacultyFellow').map(item => item.engagement_type), 'total']}
                  filename="faculty_engagement_department_breakdown"
                  title="Department-wise Breakdown"
                />
              </div>

              <div id="education-dept-chart-container"
                className={`bar-chart-container clickable-chart edu-adm-chart-lg ${departmentChartData.length === 0 ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Department-wise Breakdown",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={departmentChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="department" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                        {summary.summary.map((item, index) => {
                          const type = item.engagement_type;
                          if (type === 'FacultyFellow') return null;
                          return (
                            <Bar key={type} dataKey={type} name={ENGAGEMENT_LABELS[type] || type} fill={ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length]} radius={[6, 6, 0, 0]}>
                              <LabelList dataKey={type} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length] }} />
                            </Bar>
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {departmentChartData.length === 0 && !loading.department && (
                  <div className="no-data-overlay">
                    <p>No department data available for the selected filters.</p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentChartData} margin={{ top: 20, right: 30, left: 60, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="department"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                      label={{ value: 'Department', position: 'insideBottom', offset: -70, style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                    />
                    <YAxis
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                      label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="center"
                      wrapperStyle={{ paddingBottom: '20px', fontWeight: 'bold' }}
                      iconType="rect"
                    />
                    {summary.summary.map((item, index) => {
                      const type = item.engagement_type;
                      if (type === 'FacultyFellow') return null;
                      return (
                        <Bar key={type}
                          dataKey={type}
                          name={ENGAGEMENT_LABELS[type] || type}
                          fill={ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length]}
                          animationDuration={800}
                          radius={[4, 4, 0, 0]}>
  <LabelList dataKey={type} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length] }} />
</Bar>
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Year-wise Trends View */}
          <div className={viewType !== 'trend' ? 'edu-adm-hidden' : ''}>
            <div className="chart-section">
              {/* Filters for Trend View */}
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <h4 className="shared-filter-panel-title">Filters for Year-wise Trends</h4>
                  <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
                </div>

                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="shared-filter-label">Year</label>
                    <select
                      value={trendFilters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="shared-filter-label">Department</label>
                    <select
                      value={trendFilters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="shared-filter-label">Engagement Type</label>
                    <select
                      value={trendFilters.engagement_type}
                      onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Types</option>
                      {filterOptions.engagement_types.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Year-wise Trends</h2>
                  <p className="chart-description">
                    Faculty engagement trends over multiple years
                  </p>
                </div>
                <ExportMenu 
                  elementId="education-trend-chart-container"
                  data={yearTrendChartData}
                  headers={['Year', ...summary.summary.filter(item => item.engagement_type !== 'FacultyFellow').map(item => ENGAGEMENT_LABELS[item.engagement_type] || item.engagement_type)]}
                  keys={['year', ...summary.summary.filter(item => item.engagement_type !== 'FacultyFellow').map(item => item.engagement_type)]}
                  filename="faculty_engagement_trends"
                  title="Year-wise Trends"
                />
              </div>

              <div id="education-trend-chart-container"
                className={`bar-chart-container clickable-chart edu-adm-chart-lg ${yearTrendChartData.length === 0 ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Year-wise Trends",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={yearTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                        {summary.summary.map((item, index) => {
                          const type = item.engagement_type;
                          if (type === 'FacultyFellow') return null;
                          return (
                            <Line key={type} type="linear" dataKey={type} name={ENGAGEMENT_LABELS[type] || type} stroke={ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }}>
                              <LabelList dataKey={type} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length] }} />
                            </Line>
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {yearTrendChartData.length === 0 && !loading.trend && (
                  <div className="no-data-overlay">
                    <p>No trend data available for the selected filters.</p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={yearTrendChartData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="year"
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                      label={{ value: 'Year', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                    />
                    <YAxis
                      stroke="#000000"
                      tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }}
                      label={{ value: 'Total Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000', fontSize: 14, fontWeight: 'bold' } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }}
                      iconType="rect"
                    />
                    {summary.summary.map((item, index) => {
                      const type = item.engagement_type;
                      if (type === 'FacultyFellow') return null;
                      return (
                        <Line key={type}
                          type="linear"
                          dataKey={type}
                          name={ENGAGEMENT_LABELS[type] || type}
                          stroke={ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 5 }}
                          activeDot={{ r: 8 }}
                          animationDuration={800}>
  <LabelList dataKey={type} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: ENGAGEMENT_COLORS[type] || COLORS[index % COLORS.length] }} />
</Line>
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Type Distribution View */}
          <div className={viewType !== 'distribution' ? 'edu-adm-hidden' : ''}>
            <div className="chart-section">
              {/* Filters for Distribution View */}
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <h4 className="shared-filter-panel-title">Filters for Type Distribution</h4>
                  <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
                </div>

                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="shared-filter-label">Year</label>
                    <select
                      value={distributionFilters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="shared-filter-label">Department</label>
                    <select
                      value={distributionFilters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="shared-filter-label">Engagement Type</label>
                    <select
                      value={distributionFilters.engagement_type}
                      onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Types</option>
                      {filterOptions.engagement_types.map((type) => (
                        <option key={type} value={type}>{ENGAGEMENT_LABELS[type] || type}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Type Distribution</h2>
                  <p className="chart-description">
                    Proportional breakdown by faculty engagement type
                  </p>
                </div>
                <ExportMenu 
                  elementId="education-distribution-chart-container"
                  data={pieChartData}
                  headers={['Type', 'Count']}
                  keys={['name', 'value']}
                  filename="faculty_engagement_distribution"
                  title="Type Distribution"
                />
              </div>

              <div id="education-distribution-chart-container"
                className={`bar-chart-container clickable-chart edu-adm-chart-lg ${pieChartData.length === 0 ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Type Distribution",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <PieChart>
                        <Pie data={pieChartData} cx="50%" cy="50%" labelLine={true} outerRadius={150} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ENGAGEMENT_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {pieChartData.length === 0 && !loading.distribution && (
                  <div className="no-data-overlay">
                    <p>No distribution data available for the selected filters.</p>
                  </div>
                )}
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      animationDuration={800}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={ENGAGEMENT_COLORS[entry.name] || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
)}</>
              </div>
            </div>
          </div>

          {/* Engagement Details View */}
          <div className={viewType !== 'details' ? 'edu-adm-hidden' : ''}>
            <div className="chart-section">
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <h4 className="shared-filter-panel-title">Filters for Engagement Details</h4>
                  <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
                </div>
                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="shared-filter-label">Year</label>
                    <select
                      value={detailsFilters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="shared-filter-label">Department</label>
                    <select
                      value={detailsFilters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="shared-filter-label">Engagement Type</label>
                    <select
                      value={detailsFilters.engagement_type}
                      onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Types</option>
                      {filterOptions.engagement_types.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>External Academic Engagement Details</h2>
                  <p className="chart-description">Detailed list of all external academic engagements</p>
                </div>
                <ExportMenu 
                  elementId="education-engagement-details-table"
                  data={engagementList}
                  headers={['Sl No', 'Name', 'Academia or Industry', 'Discipline', 'Remarks']}
                  keys={['sl_no', 'faculty_name', 'fc_bg_type', 'department', 'remarks']}
                  filename="faculty_engagement_details"
                  title="Engagement Details"
                  exportType="table"
                />
              </div>

              <div id="education-engagement-details-table">
                {chartIsMobile ? (
                  <div className="faculty-card-list">
                    {engagementList.map((item, index) => (
                      <div key={item.engagement_code || index} className="faculty-card">
                        <div className="edu-adm-mobile-top">
                          <div className="faculty-card-name">{item.faculty_name || '—'}</div>
                          <span className="sector-badge">#{index + 1}</span>
                        </div>
                        <div className="engagement-card-detail"><strong>Discipline:</strong> {item.department || '—'}</div>
                        <div className="engagement-card-detail"><strong>Background:</strong> {item.fc_bg_type || '—'}</div>
                        {item.remarks && <div className="engagement-remarks">{item.remarks}</div>}
                      </div>
                    ))}
                    {engagementList.length === 0 && (
                      <div className="engagement-card-empty">No engagement data available for the selected filters.</div>
                    )}
                  </div>
                ) : (
                  <div className="edu-details-wrap">
                    {engagementList.length === 0 && !loading.details && (
                      <div className="no-data-overlay">
                        <p>No engagement data available for the selected filters.</p>
                      </div>
                    )}
                    <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                      <table className="data-table">
                        <thead className="edu-adm-sticky-thead">
                          <tr>
                            <th>Sl No</th>
                            <th>Name</th>
                            <th>Academia or Industry</th>
                            <th>Discipline</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {engagementList.map((item, index) => (
                            <tr key={item.engagement_code || index} style={{ backgroundColor: index % 2 !== 0 ? '#fafafa' : undefined }}>
                              <td>{index + 1}</td>
                              <td>{item.faculty_name || '—'}</td>
                              <td>{item.fc_bg_type || '—'}</td>
                              <td>{item.department || '—'}</td>
                              <td>{item.remarks || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}</>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Honorary Professors View */}
          <div className={viewType !== 'honorary' ? 'edu-adm-hidden' : ''}>
            <div className="chart-section">
              <div className="filter-panel">
                <div className="filter-panel-header">
                  <h4 className="shared-filter-panel-title">Filters for Honorary Professors</h4>
                  <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
                </div>
                <div className="filter-grid">
                  <div className="filter-group">
                    <label className="shared-filter-label">Year</label>
                    <select
                      value={honoraryFilters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="shared-filter-label">Department</label>
                    <select
                      value={honoraryFilters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Departments</option>
                      {filterOptions.departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="shared-filter-label">Engagement Type</label>
                    <select
                      value={honoraryFilters.engagement_type}
                      onChange={(e) => handleFilterChange('engagement_type', e.target.value)}
                      className="filter-select"
                    >
                      <option value="All">All Types</option>
                      {filterOptions.engagement_types.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Honorary Professors</h2>
                  <p className="chart-description">List of honorary professors for the selected filters</p>
                </div>
                <ExportMenu
                  elementId="education-honorary-professors-table"
                  data={engagementList}
                  headers={['Sl No', 'Name', 'Academia or Industry', 'Discipline', 'Remarks']}
                  keys={['sl_no', 'faculty_name', 'fc_bg_type', 'department', 'remarks']}
                  filename="honorary_professors"
                  title="Honorary Professors"
                  exportType="table"
                />
              </div>

              {viewType === 'honorary' && (
                <div id="education-honorary-professors-table">
                  {chartIsMobile ? (
                    <div className="faculty-card-list">
                      {engagementList.map((item, index) => (
                        <div key={item.engagement_code || index} className="faculty-card">
                          <div className="edu-adm-mobile-top">
                            <div className="faculty-card-name">{item.faculty_name || '—'}</div>
                            <span className="sector-badge">#{index + 1}</span>
                          </div>
                          <div className="engagement-card-detail"><strong>Discipline:</strong> {item.department || '—'}</div>
                          {item.remarks && <div className="engagement-remarks">{item.remarks}</div>}
                        </div>
                      ))}
                      {engagementList.length === 0 && (
                        <div className="engagement-card-empty">No honorary professor data available.</div>
                      )}
                    </div>
                  ) : (
                    <div className="edu-details-wrap">
                      {engagementList.length === 0 && !loading.details && (
                        <div className="no-data-overlay">
                          <p>No honorary professor data available for the selected filters.</p>
                        </div>
                      )}
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <table className="data-table">
                          <thead className="edu-adm-sticky-thead">
                            <tr>
                              <th>Sl No</th>
                              <th>Name</th>
                              <th>Academia or Industry</th>
                              <th>Discipline</th>
                              <th>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {engagementList.map((item, index) => (
                              <tr key={item.engagement_code || index} style={{ backgroundColor: index % 2 !== 0 ? '#fafafa' : undefined }}>
                                <td>{index + 1}</td>
                                <td>{item.faculty_name || '—'}</td>
                                <td>{item.fc_bg_type || '—'}</td>
                                <td>{item.department || '—'}</td>
                                <td>{item.remarks || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}</>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={uploadVersion.refresh}
        />

        <ChartExpandModal
          isOpen={!!expandedChart}
          onClose={() => setExpandedChart(null)}
          title={expandedChart?.title}
        >
          {expandedChart?.content}
        </ChartExpandModal>
      </div>
    </div>
  );
}

export default EducationAdministrativeSection;
