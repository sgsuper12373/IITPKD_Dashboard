import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend, LabelList
} from 'recharts';

import {
  fetchResearchFilterOptions,
  fetchExternshipAnalytics
} from '../services/researchStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import DataUploadModal from './LazyDataUploadModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './ResearchSection.css';
import '../DesignSystem.css';
import './IndustryAdministrativeSection.css';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';
import CustomTooltip from './CustomTooltip';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

const TYPE_COLORS = ['#6366f1', '#22c55e', '#f97316', '#a855f7', '#14b8a6', '#0ea5e9', '#facc15'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '–';
  }
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short'
  });
};

const formatDuration = (days) => {
  const numeric = Number(days);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  if (numeric <= 0) return `${numeric} days`;
  const months = numeric / 30;
  if (months >= 1) {
    return `${(months).toFixed(1)} months`;
  }
  return `${numeric} days`;
};

function IndustryAdministrativeSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    externship_departments: [],
    externship_years: []
  });

  const [viewType, setViewType] = useState('yearly'); // 'yearly' | 'department' | 'externshipTable'
  const [deptChartType, setDeptChartType] = useState('bar'); // 'bar' | 'trend'

  const [filters, setFilters] = useState({
    department: 'All',
    externship_year: 'All'
  });

  const [summary, setSummary] = useState({
    total: 0,
    yearly: [],
    department: []
  });
  const [externshipList, setExternshipList] = useState([]);

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');
  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  const [expandedChart, setExpandedChart] = useState(null);

  useEffect(() => {
    const handleResize = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 2;

  const canViewDirectory = user !== undefined && user?.role_id !== 0;

  const serializedFilters = JSON.stringify(filters);
  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const options = await fetchResearchFilterOptions(filters, token);
        if (!isMounted) return;
        const externship_departments = Array.isArray(options?.externship_departments) ? options.externship_departments : [];
        const externship_years = Array.isArray(options?.externship_years) ? [...options.externship_years].sort((a, b) => b - a) : [];
        setFilterOptions({ externship_departments, externship_years });
        setError(null);

        const corrections = {};
        if (filters.department !== 'All' && filters.department && !externship_departments.includes(filters.department)) corrections.department = 'All';
        if (filters.externship_year !== 'All' && filters.externship_year && !externship_years.map(String).includes(String(filters.externship_year))) corrections.externship_year = 'All';
        if (Object.keys(corrections).length > 0) setFilters(prev => ({ ...prev, ...corrections }));
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch externship filter options:', err);
          setError(err.message || 'Failed to load filter options.');
        }
      }
    };
    loadFilterOptions();
    return () => { isMounted = false; };
  }, [serializedFilters, filters, token, uploadVersion]);

  useEffect(() => {
    const loadExternshipData = async () => {
      try {
        setLoading(true);
        setError(null);

        const analyticsResp = await fetchExternshipAnalytics(filters, token);

        setSummary({
          total: analyticsResp?.total || 0,
          yearly: Array.isArray(analyticsResp?.yearly) ? analyticsResp.yearly : [],
          department: Array.isArray(analyticsResp?.department) ? analyticsResp.department : []
        });
        setExternshipList(analyticsResp?.data || []);
      } catch (err) {
        console.error('Failed to load externship analytics:', err);
        setError(err.message || 'Failed to load externship analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadExternshipData();

  }, [filters, token, uploadVersion]);

  const externshipTypeKeys = useMemo(() => {
    const keys = new Set();
    summary.yearly.forEach((entry) => {
      Object.keys(entry).forEach((key) => {
        if (key !== 'year' && key !== 'total') {
          keys.add(key);
        }
      });
    });
    return Array.from(keys);
  }, [summary.yearly]);

  const yearlyChartData = useMemo(() => {
    if (!summary.yearly.length) return [];
    return summary.yearly.map((entry) => {
      const item = { year: entry.year, total: Number(entry.total) || 0 };
      externshipTypeKeys.forEach((key) => {
        item[key] = Number(entry[key]) || 0;
      });
      return item;
    });
  }, [summary.yearly, externshipTypeKeys]);

  const departmentYearlyTrendData = useMemo(() => {
    if (!summary.yearly.length) return { trendData: [], departments: [] };

    const departments = new Set();
    summary.yearly.forEach((yearData) => {
      Object.keys(yearData).forEach((key) => {
        if (key !== 'year' && key !== 'total') {
          departments.add(key);
        }
      });
    });

    const trendData = summary.yearly.map((yearData) => {
      const yearItem = { year: yearData.year };
      departments.forEach((dept) => {
        const cleanDept = dept.replace(/^Department of /i, '');
        yearItem[cleanDept] = Number(yearData[dept]) || 0;
      });
      return yearItem;
    });

    return {
      trendData,
      departments: Array.from(departments).map(d => d.replace(/^Department of /i, ''))
    };
  }, [summary.yearly]);

  const departmentComparisonData = useMemo(() => {
    if (!summary.department.length) return [];
    return summary.department.map(item => ({
      department: item.department.replace(/^Department of /i, ''),
      count: Number(item.total) || 0
    }));
  }, [summary.department]);

  const typeTotals = useMemo(() => {
    const totals = {};
    summary.yearly.forEach((entry) => {
      externshipTypeKeys.forEach((key) => {
        totals[key] = (totals[key] || 0) + (Number(entry[key]) || 0);
      });
    });
    return totals;
  }, [summary.yearly, externshipTypeKeys]);

  const topType = useMemo(() => {
    let leader = null;
    let maxValue = -Infinity;
    Object.entries(typeTotals).forEach(([type, total]) => {
      if (total > maxValue) {
        leader = type;
        maxValue = total;
      }
    });
    return leader ? `${leader} (${formatNumber(maxValue)})` : '—';
  }, [typeTotals]);

  const participatingDepartments = useMemo(
    () => summary.department.filter((item) => (item.total || 0) > 0).length,
    [summary.department]
  );

  const activeYears = useMemo(() => summary.yearly.length, [summary.yearly]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      department: 'All',
      externship_year: 'All'
    });
  };

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/industry-connect')}>
            &#8592; Back to Industry Connect
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Administrative Section (Industry Faculty Industry Stints)</h1>
            </div>

            {!isReadOnlyView && isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <span>&#128228;</span> Upload Externship Data
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['externship_info']} />
          <ShareButton />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="ias-export-row">
          <ExportMenu
            elementId="externship-summary-cards-container"
            data={[{
              total: summary.total,
              participating_departments: participatingDepartments,
              active_years: activeYears,
              top_type: topType
            }]}
            headers={['Total Faculty Industry Stints', 'Participating Departments', 'Timeline Coverage']}
            keys={['total', 'participating_departments', 'active_years', 'top_type']}
            filename="externship_summary"
            title="Faculty Industry Stint Summary"
          />
        </div>

        <div id="externship-summary-cards-container" className="stat-card-grid ias-stat-grid">
          <div className="ias-stat-card ias-stat-card--indigo">
            <div className="ias-stat-card-decor" />
            <div className="ias-stat-card-body">
              <div className="ias-stat-card-header">
                <span className="ias-stat-card-icon">&#128188;</span>
                <span className="ias-stat-card-label">Total Faculty Industry Stints</span>
              </div>
              <div className="stat-card-value ias-stat-card-value">
                {formatNumber(summary.total)}
              </div>
              <div className="ias-stat-card-status">
                <span className="ias-stat-dot" />
                <span className="ias-stat-subtext">Total industry engagements</span>
              </div>
            </div>
          </div>

          <div className="ias-stat-card ias-stat-card--green">
            <div className="ias-stat-card-decor" />
            <div className="ias-stat-card-body">
              <div className="ias-stat-card-header">
                <span className="ias-stat-card-icon">&#127962;</span>
                <span className="ias-stat-card-label">Departments</span>
              </div>
              <div className="stat-card-value ias-stat-card-value">
                {formatNumber(participatingDepartments)}
              </div>
              <div className="ias-stat-card-status">
                <span className="ias-stat-dot" />
                <span className="ias-stat-subtext">Active departments</span>
              </div>
            </div>
          </div>

          <div className="ias-stat-card ias-stat-card--orange">
            <div className="ias-stat-card-decor" />
            <div className="ias-stat-card-body">
              <div className="ias-stat-card-header">
                <span className="ias-stat-card-icon">&#128197;</span>
                <span className="ias-stat-card-label">Timeline Coverage</span>
              </div>
              <div className="stat-card-value ias-stat-card-value">
                {formatNumber(activeYears)}
              </div>
              <div className="ias-stat-card-status">
                <span className="ias-stat-dot" />
                <span className="ias-stat-subtext">Years of activity</span>
              </div>
            </div>
          </div>
        </div>

        <div className="contain-layout">
          <section className="chart-section">
            {/* Common Filters Section */}
            <div className="ias-filter-panel">
              <div className="filter-panel-header">
                <h4 className="ias-filter-h4">Dashboard Filters</h4>
                <button className="ias-clear-btn" onClick={handleClearFilters}>
                  Clear All Filters
                </button>
              </div>

              <div className="ias-filter-grid">

                {/* View Type Buttons */}
                <div className="filter-group">
                  <label className="ias-filter-label">View Type</label>
                  <div className="view-type-bar">
                    <button
                      onClick={() => setViewType('yearly')}
                      className={`view-type-btn${viewType === 'yearly' ? ' view-type-btn--yearly-active' : ''}`}
                    >
                      &#128202; Year
                    </button>
                    <button
                      onClick={() => setViewType('department')}
                      className={`view-type-btn${viewType === 'department' ? ' view-type-btn--dept-active' : ''}`}
                    >
                      &#127962; Dept
                    </button>
                    {canViewDirectory && (
                      <button
                        onClick={() => setViewType('externshipTable')}
                        className={`view-type-btn${viewType === 'externshipTable' ? ' view-type-btn--dir-active' : ''}`}
                      >
                        &#128203; Dir
                      </button>
                    )}
                  </div>
                </div>

                {/* Department Filter */}
                <div className="filter-group">
                  <label className="ias-filter-label">Department</label>
                  <select
                    className="filter-select"
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                  >
                    <option value="All">All Departments</option>
                    {filterOptions.externship_departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div className="filter-group">
                  <label className="ias-filter-label">Faculty Industry Stint Year</label>
                  <select
                    className="filter-select"
                    value={filters.externship_year}
                    onChange={(e) => handleFilterChange('externship_year', e.target.value)}
                  >
                    <option value="All">All Years</option>
                    {filterOptions.externship_years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* 1. Year-wise Externships */}
            <div className={`chart-view ${viewType === 'yearly' ? 'active' : 'inactive'}`}>
              <div className="ias-chart-header-row">
                <div>
                  <h2 className="ias-chart-h2">
                    <span className="ias-chart-icon">&#128202;</span> Year-wise Faculty Industry Stints
                  </h2>
                  <p className="chart-description">
                    Distribution by externship type across the chosen timeframe
                  </p>
                </div>
                <ExportMenu
                  elementId="externships-yearly-container"
                  data={yearlyChartData}
                  headers={['Year', ...externshipTypeKeys]}
                  keys={['year', ...externshipTypeKeys]}
                  filename="externships_yearly_trend"
                  title="Year-wise Faculty Industry Stints"
                />
              </div>
              <div
                id="externships-yearly-container"
                className="bar-chart-container clickable-chart ias-chart-container"
                style={{ height: chartIsMobile ? '240px' : '400px' }}
                onClick={() => setExpandedChart({
                  title: "Year-wise Faculty Industry Stints",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={yearlyChartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="year" stroke="#888" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {externshipTypeKeys.map((type, index) => (
                          <Bar key={type} dataKey={type} stackId="a" fill={TYPE_COLORS[index % TYPE_COLORS.length]}>
                            <LabelList dataKey={type} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyChartData} margin={{ top: 10, right: 30, left: chartIsMobile ? 10 : 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="year" stroke="#888" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {externshipTypeKeys.map((type, index) => (
                      <Bar
                        key={type} dataKey={type} stackId="a"
                        fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                        radius={index === externshipTypeKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        isAnimationActive={true} animationDuration={1000}
                      >
                        <LabelList dataKey={type} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Department-wise Analysis */}
            <div className={`chart-view ${viewType === 'department' ? 'active' : 'inactive'}`}>
              <div className="ias-chart-header-row ias-chart-header-row--top">
                <div>
                  <h2 className="ias-chart-h2">
                    <span className="ias-chart-icon">&#127962;</span> Department-wise Analysis
                  </h2>
                  <p className="chart-description">
                    {deptChartType === 'bar' ? 'Distribution across departments' : 'Yearly trend per department'}
                  </p>
                </div>
                <div className="ias-mode-toggle-wrap">
                  <div className="ias-mode-toggle">
                    {['bar', 'trend'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDeptChartType(mode)}
                        className={`ias-mode-btn${deptChartType === mode ? ' ias-mode-btn--active' : ''}`}
                      >
                        {mode === 'bar' ? '&#128202; Bar' : '&#128200; Trend'}
                      </button>
                    ))}
                  </div>
                  <ExportMenu
                    elementId="externships-dept-container"
                    data={deptChartType === 'bar' ? departmentComparisonData : departmentYearlyTrendData.trendData}
                    headers={deptChartType === 'bar' ? ['Department', 'Count'] : ['Year', ...departmentYearlyTrendData.departments]}
                    keys={deptChartType === 'bar' ? ['department', 'count'] : ['year', ...departmentYearlyTrendData.departments]}
                    filename={`externships_dept_${deptChartType}`}
                    title="Department-wise Analysis"
                  />
                </div>
              </div>
              <div
                id="externships-dept-container"
                className="bar-chart-container clickable-chart ias-chart-container"
                style={{ height: chartIsMobile ? '240px' : '400px' }}
                onClick={() => setExpandedChart({
                  title: deptChartType === 'bar' ? "Department-wise Externships" : "Department Yearly Trend",
                  content: (
                    <div className="ias-expanded-chart">
                      {deptChartType === 'bar' ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={departmentComparisonData} margin={{ top: 40, right: 30, left: 40, bottom: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="department" stroke="#888" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} interval={0} />
                            <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Externships" fill="#22c55e" radius={[4, 4, 0, 0]}>
                              <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={departmentYearlyTrendData.trendData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="year" stroke="#888" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            {departmentYearlyTrendData.departments.map((dept, index) => (
                              <Line key={dept} type="linear" dataKey={dept} stroke={TYPE_COLORS[index % TYPE_COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}>
                                <LabelList dataKey={dept} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                              </Line>
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )
                })}
              >
                <div className={`chart-wrapper ${deptChartType === 'bar' ? 'active' : 'inactive'}`}>
                  {departmentComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 240 : 400}>
                      <BarChart data={departmentComparisonData} margin={{ top: 30, right: 30, left: chartIsMobile ? 10 : 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="department" stroke="#888" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} interval={0} />
                        <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Externships" fill="#22c55e" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000}>
                          <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="ias-empty-chart" style={{ height: chartIsMobile ? '240px' : '400px' }}>
                      No department data available
                    </div>
                  )}
                </div>
                <div className={`chart-wrapper ${deptChartType === 'trend' ? 'active' : 'inactive'}`}>
                  {departmentYearlyTrendData.trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 240 : 400}>
                      <LineChart data={departmentYearlyTrendData.trendData} margin={{ top: 10, right: 30, left: chartIsMobile ? 10 : 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="year" stroke="#888" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#888" tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {departmentYearlyTrendData.departments.map((dept, index) => (
                          <Line
                            key={dept} type="linear" dataKey={dept}
                            stroke={TYPE_COLORS[index % TYPE_COLORS.length]}
                            strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            isAnimationActive={true} animationDuration={1000}
                          >
                            <LabelList dataKey={dept} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TYPE_COLORS[index % TYPE_COLORS.length] }} />
                          </Line>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="ias-empty-chart" style={{ height: chartIsMobile ? '240px' : '400px' }}>
                      No trend data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Externship Directory Table */}
            {canViewDirectory && viewType === 'externshipTable' && (
              <div className="chart-view active performance-render-auto">
                <div className="ias-dir-header-row">
                  <div className="chart-header">
                    <h2 className="ias-chart-h2">
                      <span>&#128203;</span> Faculty Industry Stint Directory
                    </h2>
                    <p className="chart-description">
                      Displaying {externshipList.length} total records
                    </p>
                  </div>
                  <ExportMenu
                    elementId="externship-directory-table"
                    data={externshipList}
                    headers={['Faculty', 'Department', 'Partner', 'Type', 'Start Date', 'End Date', 'Days']}
                    keys={['faculty_name', 'department', 'industry_name', 'type', 'startdate', 'enddate', 'duration_days']}
                    filename="externship_directory"
                    title="Faculty Industry Stint Directory"
                    exportType="table"
                  />
                </div>
                <div id="externship-directory-table">
                  {chartIsMobile ? (
                    <div className="ias-mobile-list">
                      {externshipList.length > 0 ? (
                        externshipList.map((e) => (
                          <div key={e.externship_id} className="ias-mobile-card">
                            <div className="ias-mobile-card-name">{e.faculty_name}</div>
                            <div className="ias-mobile-card-dept">{e.department}</div>
                            <div className="ias-mobile-card-partner">
                              <span className="ias-mobile-partner-label">Partner:</span> {e.industry_name}
                            </div>
                            <div className="ias-mobile-card-type">
                              <span className="ias-type-badge">{e.type}</span>
                            </div>
                            <div className="ias-mobile-card-footer">
                              <div className="ias-mobile-card-duration">
                                <strong>{formatDuration(e.duration_days)}</strong>
                              </div>
                              <div className="ias-mobile-card-dates">
                                {formatDate(e.startdate)} - {formatDate(e.enddate)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="ias-empty-msg">No externship records found</div>
                      )}
                    </div>
                  ) : (
                    <div className="table-responsive accelerated-scroll ias-table-wrapper">
                      <table className="performance-table ias-table">
                        <thead>
                          <tr>
                            {['Faculty', 'Dept', 'Partner', 'Type', 'Duration', 'Start', 'End'].map(header => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {externshipList.length > 0 ? (
                            externshipList.map((e, i) => (
                              <tr
                                key={e.externship_id}
                                className="table-row-hover"
                                style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}
                              >
                                <td>{e.faculty_name}</td>
                                <td>{e.department}</td>
                                <td>{e.industry_name}</td>
                                <td>
                                  <span className="ias-type-badge">{e.type}</span>
                                </td>
                                <td className="ias-td-strong">{formatDuration(e.duration_days)}</td>
                                <td className="ias-td-muted">{formatDate(e.startdate)}</td>
                                <td className="ias-td-muted">{formatDate(e.enddate)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="ias-td-empty">
                                No externship records found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </section>
        </div>

        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="externship_info"
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
    </div>
  );
}

export default IndustryAdministrativeSection;
