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
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

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

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('yearly'); // 'yearly' | 'department' | 'externshipTable'
  const [deptChartType, setDeptChartType] = useState('bar'); // 'bar' | 'trend' for department view

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

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  // Whether the current user can see the Directory tab
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

        // Auto-correct invalid selections
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

  // Process data for department-wise yearly trend line graph
  const departmentYearlyTrendData = useMemo(() => {
    if (!summary.yearly.length) return { trendData: [], departments: [] };

    // Get all departments from the data
    const departments = new Set();
    summary.yearly.forEach((yearData) => {
      Object.keys(yearData).forEach((key) => {
        if (key !== 'year' && key !== 'total') {
          departments.add(key);
        }
      });
    });

    // Transform data for line chart
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

  // Comparison data for Department Bar Chart (X-axis = Department)
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

  // Using shared CustomTooltip from chartUtils

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/industry-connect')}>
            ← Back to Industry Connect
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
                  <span>📤</span> Upload Externship Data
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
        {/* Modern Summary Cards */}
        <div id="externship-summary-cards-container" style={{
          display: 'grid',
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Total Externships Card */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>💼</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Faculty Industry Stints</span>
              </div>
              <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                {formatNumber(summary.total)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Total industry engagements</span>
              </div>
            </div>
          </div>

          {/* Participating Departments Card */}
          <div style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 20px rgba(34, 197, 94, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>🏢</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Departments</span>
              </div>
              <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                {formatNumber(participatingDepartments)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Active departments</span>
              </div>
            </div>
          </div>

          {/* Timeline Coverage Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📅</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Timeline Coverage</span>
              </div>
              <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                {formatNumber(activeYears)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Years of activity</span>
              </div>
            </div>
          </div>
        </div>

        <div className="contain-layout" style={{ position: 'relative', minHeight: '520px', transition: 'opacity 0.3s ease' }}>
          {/* Main Chart Section - Persistently Mounted */}
          <section className="chart-section" style={{
            marginBottom: '30px',
            backgroundColor: '#fff',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            border: '1px solid #f0f0f0',
            position: 'relative',
            overflow: 'hidden',
            padding: '24px'  // added padding to contain inner elements nicely
          }}>
            {/* Common Filters Section */}
            <div style={{
              marginBottom: '20px', padding: '15px',
              backgroundColor: '#f8f9fa', borderRadius: '12px',
              border: '1px solid #e9ecef', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: '600' }}>Dashboard Filters</h4>
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff',
                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '500', transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                >
                  Clear All Filters
                </button>
              </div>

              <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>

                {/* View Type Buttons — leftmost */}
                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px', display: 'block' }}>View Type</label>
                  <div style={{ display: 'flex', gap: '6px', background: '#e9ecef', padding: '4px', borderRadius: '8px' }}>
                    <button
                      onClick={() => setViewType('yearly')}
                      style={{
                        flex: 1, padding: '7px 8px',
                        backgroundColor: viewType === 'yearly' ? '#6366f1' : 'transparent',
                        color: viewType === 'yearly' ? 'white' : '#475569',
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                      }}
                    >
                      <span>📊</span> Year
                    </button>
                    <button
                      onClick={() => setViewType('department')}
                      style={{
                        flex: 1, padding: '7px 8px',
                        backgroundColor: viewType === 'department' ? '#22c55e' : 'transparent',
                        color: viewType === 'department' ? 'white' : '#475569',
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                      }}
                    >
                      <span>🏢</span> Dept
                    </button>
                    {/* Dir button — hidden for role_id 0 or undefined */}
                    {canViewDirectory && (
                      <button
                        onClick={() => setViewType('externshipTable')}
                        style={{
                          flex: 1, padding: '7px 8px',
                          backgroundColor: viewType === 'externshipTable' ? '#f97316' : 'transparent',
                          color: viewType === 'externshipTable' ? 'white' : '#475569',
                          border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                        }}
                      >
                        <span>📋</span> Dir
                      </button>
                    )}
                  </div>
                </div>

                {/* Department Filter */}
                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px', display: 'block' }}>Department</label>
                  <select
                    className="filter-select"
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    style={{ padding: '8px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                  >
                    <option value="All">All Departments</option>
                    {filterOptions.externship_departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px', display: 'block' }}>Faculty Industry Stint Year</label>
                  <select
                    className="filter-select"
                    value={filters.externship_year}
                    onChange={(e) => handleFilterChange('externship_year', e.target.value)}
                    style={{ padding: '8px', fontSize: '13px', width: '100%', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                  >
                    <option value="All">All Years</option>
                    {filterOptions.externship_years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* 1. Year-wise Externships (Always Mounted) */}
            <div className={`chart-view ${viewType === 'yearly' ? 'active' : 'inactive'}`}>
              <div className="chart-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
                    <span style={{ fontSize: '28px' }}>📊</span> Year-wise Faculty Industry Stints
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0', fontSize: '14px' }}>
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
              <div id="externships-yearly-container" className="bar-chart-container" style={{ position: 'relative', height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyChartData} margin={{ top: 10, right: 30, left: 40, bottom: 30 }}>
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

            {/* 2. Department-wise Analysis (Always Mounted) */}
            <div className={`chart-view ${viewType === 'department' ? 'active' : 'inactive'}`}>
              <div className="chart-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '24px' }}>
                    <span style={{ fontSize: '28px' }}>🏢</span> Department-wise Analysis
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0', fontSize: '14px' }}>
                    {deptChartType === 'bar' ? 'Distribution across departments' : 'Yearly trend per department'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', background: '#f0f0f0', padding: '4px', borderRadius: '8px' }}>
                    {['bar', 'trend'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDeptChartType(mode)}
                        style={{
                          padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          fontSize: '13px', fontWeight: '600',
                          backgroundColor: deptChartType === mode ? '#fff' : 'transparent',
                          color: deptChartType === mode ? '#22c55e' : '#666',
                          boxShadow: deptChartType === mode ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        {mode === 'bar' ? '📊 Bar' : '📈 Trend'}
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
              <div id="externships-dept-container" className="bar-chart-container" style={{ position: 'relative', height: '400px' }}>
                <div className={`chart-wrapper ${deptChartType === 'bar' ? 'active' : 'inactive'}`}>
                  {departmentComparisonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={departmentComparisonData} margin={{ top: 10, right: 30, left: 40, bottom: 80 }}>
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
                    <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
                      No department data available
                    </div>
                  )}
                </div>
                <div className={`chart-wrapper ${deptChartType === 'trend' ? 'active' : 'inactive'}`}>
                  {departmentYearlyTrendData.trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={departmentYearlyTrendData.trendData} margin={{ top: 10, right: 30, left: 40, bottom: 30 }}>
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
                    <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
                      No trend data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Externship Directory Table — hidden for role_id 0 or undefined */}
            {canViewDirectory && viewType === 'externshipTable' && (
              <div className="chart-view active performance-render-auto">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="chart-header">
                    <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>📋</span> Faculty Industry Stint Directory
                    </h2>
                    <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
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
                <div id="externship-directory-table" className="table-responsive accelerated-scroll" style={{ maxHeight: '600px', overflowY: 'auto', borderRadius: '12px', border: '1px solid #eee' }}>
                  <table className="performance-table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: '#f97316' }}>
                        {['Faculty', 'Dept', 'Partner', 'Type', 'Duration', 'Start', 'End'].map(header => (
                          <th key={header} style={{ padding: '16px 12px', textAlign: 'left', color: 'white', fontWeight: '600', borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {externshipList.length > 0 ? (
                        externshipList.map((e, i) => (
                          <tr
                            key={e.externship_id}
                            style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', transition: 'background-color 0.2s' }}
                            className="table-row-hover"
                          >
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{e.faculty_name}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{e.department}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{e.industry_name}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '600' }}>
                                {e.type}
                              </span>
                            </td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: '500' }}>{formatDuration(e.duration_days)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#666' }}>{formatDate(e.startdate)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#666' }}>{formatDate(e.enddate)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            No externship records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
      </div>
    </div>
  );
}

export default IndustryAdministrativeSection;