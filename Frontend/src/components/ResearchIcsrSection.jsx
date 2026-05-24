import { useState, useEffect, useMemo, useCallback } from 'react';
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
import ChartExpandModal from './ChartExpandModal';
import LastUpdated from './LastUpdated';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './ResearchSection.css';
import './ResearchIcsrSection.css';

const PATENT_STATUS_ORDER = ['Filed', 'Granted'];
const PATENT_COLORS = {
  Filed: '#6366f1',
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
  if (!Number.isFinite(numeric)) return '₹0';
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
  const token = localStorage.getItem('authToken');
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

  const isRestrictedUser = typeof user === 'undefined' || user?.role_id === 0;

  const [viewType, setViewType] = useState(mouOnly ? 'mou' : (location.state?.view || 'projects'));

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

  const [mouFilters, setMouFilters] = useState({ mou_year: 'All' });
  const [totalMous, setTotalMous] = useState(0);
  const [mouTrend, setMouTrend] = useState([]);
  const [mouList, setMouList] = useState([]);
  // Guest users can only ever see 'trend' — never 'directory'
  const [mouViewType, setMouViewType] = useState('trend');
  const [mouChartMode, setMouChartMode] = useState('bar');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const loadData = useCallback(async () => {
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
          { patent_year: filters.patent_year, patent_status: filters.patent_status },
          token
        )
      ]);

      setSummary({
        funded_projects: summaryResp?.funded_projects || 0,
        consultancy_projects: summaryResp?.consultancy_projects || 0,
        sanctioned_projects: summaryResp?.sanctioned_projects ?? summaryResp?.total_projects ?? 0,
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
  }, [filters, token, mouOnly]);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 9;

  const safeSetViewType = (type) => {
    if (isRestrictedUser && type !== 'projects' && !(mouOnly && type === 'mou')) return;
    setViewType(type);
  };

  // Safely switch MoU sub-view — guest users are locked to 'trend'
  const safeSetMouViewType = (type) => {
    if (isRestrictedUser && type === 'directory') return;
    setMouViewType(type);
  };

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
    loadData();
  }, [loadData, uploadVersion]);

  // MoU data — runs for guest users only in mouOnly mode (trend-only), full for non-restricted
  useEffect(() => {
    if (!mouOnly && isRestrictedUser) return;

    const loadMouData = async () => {
      try {
        // Guest users never need the list (directory is hidden), so skip that fetch
        const trendResp = await fetchMouTrend({ mou_year: mouFilters.mou_year }, token);
        const trend = trendResp?.data || [];
        setMouTrend(trend);
        setTotalMous(trend.reduce((sum, row) => sum + (Number(row.total) || 0), 0));

        // Only fetch the directory list for non-restricted users
        if (!isRestrictedUser) {
          const listResp = await fetchMouList({ mou_year: mouFilters.mou_year }, token);
          setMouList(listResp?.data || []);
        }
      } catch (err) {
        console.error('Failed to load MoU data:', err);
      }
    };
    loadMouData();
  }, [mouFilters, token, uploadVersion, mouOnly, isRestrictedUser]);

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
    return patentStats.yearly.map((row) => ({
      year: row.year,
      Filed: Number(row.Filed) || 0,
      Granted: Number(row.Granted) || 0,
    }));
  }, [patentStats.yearly]);

  const mouTrendChartData = useMemo(() =>
    mouTrend.map((row) => ({ year: row.year, total: Number(row.total) || 0 })),
    [mouTrend]
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
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
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <>
            {!isReadOnlyView && (
              <button className="page-back-btn" onClick={() => navigate('/research')}>
                &larr; Back to Research
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
                  <LastUpdated tables={['icsr_consultancy_projects', 'icsr_sponsered_projects', 'icsr_csr', 'research_patents', 'research_mous']} />
                </div>

                {!isReadOnlyView && isAdmin && (
                  <div className="section-header-actions">
                    {!mouOnly && (
                      <>
                        <button
                          className="page-upload-btn"
                          onClick={() => { setActiveUploadTable('icsr_consultancy_projects'); setIsUploadModalOpen(true); }}
                        >
                          <span>&#128228;</span> Consultancy
                        </button>
                        <button
                          className="page-upload-btn"
                          onClick={() => { setActiveUploadTable('icsr_sponsered_projects'); setIsUploadModalOpen(true); }}
                        >
                          <span>&#128228;</span> Sponsored
                        </button>
                        <button
                          className="page-upload-btn"
                          onClick={() => { setActiveUploadTable('research_patents'); setIsUploadModalOpen(true); }}
                        >
                          <span>&#128228;</span> Patents
                        </button>
                      </>
                    )}
                    <button
                      className="page-upload-btn"
                      onClick={() => { setActiveUploadTable('research_mous'); setIsUploadModalOpen(true); }}
                    >
                      <span>&#128228;</span> MoUs
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="icsr-error">{error}</div>
            )}

            <div className="icsr-export-row">
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
                headers={['Total Projects', 'Sponsored', 'Consultancy', 'Revenue', 'Patents Filed', 'Patents Granted', 'Total MoUs']}
                keys={['total_projects', 'funded_projects', 'consultancy_projects', 'total_revenue', 'patents_filed', 'patents_granted', 'total_mous']}
                filename="icsr_summary"
                title="ICSR Impact Summary"
              />
            </div>

            {/* Summary Cards */}
            <div id="icsr-summary-cards-container" className="icsr-cards-grid">
              {!mouOnly && (
                <>
                  <div className="icsr-stat-card icsr-stat-card--indigo">
                    <div className="icsr-stat-card-body">
                      <div className="icsr-stat-card-header">
                        <span className="icsr-stat-card-icon">&#128202;</span>
                        <h3 className="icsr-stat-card-label">Total Projects</h3>
                      </div>
                      <div className="metric-value">{formatNumber(summary.total_projects)}</div>
                      <div className="icsr-stat-card-status">
                        <span className="icsr-stat-card-dot" />
                        <span className="icsr-stat-card-subtext">Sponsored + Consultancy</span>
                      </div>
                    </div>
                  </div>

                  <div className="icsr-stat-card icsr-stat-card--blue">
                    <div className="icsr-stat-card-body">
                      <div className="icsr-stat-card-header">
                        <span className="icsr-stat-card-icon">&#127919;</span>
                        <h3 className="icsr-stat-card-label">Sponsored Projects</h3>
                      </div>
                      <div className="metric-value">{formatNumber(summary.funded_projects)}</div>
                      <div className="icsr-stat-card-status">
                        <span className="icsr-stat-card-dot" />
                        <span className="icsr-stat-card-subtext">Active + completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="icsr-stat-card icsr-stat-card--orange">
                    <div className="icsr-stat-card-body">
                      <div className="icsr-stat-card-header">
                        <span className="icsr-stat-card-icon">&#128188;</span>
                        <h3 className="icsr-stat-card-label">Consultancy</h3>
                      </div>
                      <div className="metric-value">{formatNumber(summary.consultancy_projects)}</div>
                      <div className="icsr-stat-card-status">
                        <span className="icsr-stat-card-dot" />
                        <span className="icsr-stat-card-subtext">Active + Completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="icsr-stat-card icsr-stat-card--teal">
                    <div className="icsr-stat-card-body">
                      <div className="icsr-stat-card-header">
                        <span className="icsr-stat-card-icon">&#128176;</span>
                        <h3 className="icsr-stat-card-label">Total Project Value</h3>
                      </div>
                      <div className="metric-value-sm" title={'₹' + formatNumber(summary.consultancy_revenue)}>
                        {formatCompactCurrency(summary.consultancy_revenue)}
                      </div>
                      <div className="icsr-stat-card-status">
                        <span className="icsr-stat-card-dot" />
                        <span className="icsr-stat-card-subtext">Sponsored + Consultancy</span>
                      </div>
                    </div>
                  </div>
                  {/* Patent summary card removed per request */}
                </>
              )}

              {(mouOnly || !isReadOnlyView) && (
                <div className="icsr-stat-card icsr-stat-card--purple">
                  <div className="icsr-stat-card-body">
                    <div className="icsr-stat-card-header">
                      <span className="icsr-stat-card-icon">&#129309;</span>
                      <h3 className="icsr-stat-card-label">Total Research MoUs</h3>
                    </div>
                    <div className="metric-value">{formatNumber(totalMous)}</div>
                    <div className="icsr-stat-card-status">
                      <span className="icsr-stat-card-dot" />
                      <span className="icsr-stat-card-subtext">External collaborations</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Global filter block — hidden when MoU view */}
            {viewType !== 'mou' && (
              <div className="icsr-filter-block">
                <div className="filter-panel-header">
                  <div className="icsr-filter-col">
                    <h4 className="icsr-filter-h4">Filters</h4>
                    {!mouOnly && (
                      <div className="icsr-nav-tabs">
                        <button
                          className={`icsr-nav-tab${viewType === 'projects' ? ' icsr-nav-tab--active' : ''}`}
                          onClick={() => safeSetViewType('projects')}
                        >
                          &#128202; Projects Trend
                        </button>
                        {/* Patents Trend, Projects Directory, MoUs tabs removed per request */}
                      </div>
                    )}
                  </div>
                  <button
                    className="clear-filters-btn"
                    onClick={() => { handleClearFilters(); handleClearMouFilters(); }}
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="icsr-filter-grid">
                  {(viewType === 'projects' || viewType === 'projectsTable') && (
                    <>
                      <div className="filter-group">
                        <label>Department</label>
                        <select
                          value={filters.department}
                          onChange={(e) => handleFilterChange('department', e.target.value)}
                          className="icsr-select"
                        >
                          <option value="All">All Departments</option>
                          {filterOptions.project_departments.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Project Year</label>
                        <select
                          value={filters.project_year}
                          onChange={(e) => handleFilterChange('project_year', e.target.value)}
                          className="icsr-select"
                        >
                          <option value="All">All Years</option>
                          {filterOptions.project_years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Project Type</label>
                        <select
                          value={filters.project_type}
                          onChange={(e) => handleFilterChange('project_type', e.target.value)}
                          className="icsr-select"
                        >
                          <option value="All">All Types</option>
                          {filterOptions.project_types.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="icsr-select"
                        >
                          <option value="All">All Statuses</option>
                          {filterOptions.project_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {viewType === 'patents' && !isRestrictedUser && (
                    <>
                      <div className="filter-group">
                        <label>Patent Year</label>
                        <select
                          value={filters.patent_year}
                          onChange={(e) => handleFilterChange('patent_year', e.target.value)}
                          className="icsr-select"
                        >
                          <option value="All">All Years</option>
                          {filterOptions.patent_years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Patent Status</label>
                        <select
                          value={filters.patent_status}
                          onChange={(e) => handleFilterChange('patent_status', e.target.value)}
                          className="icsr-select"
                        >
                          <option value="All">All Statuses</option>
                          {filterOptions.patent_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="icsr-active-filters">
                  <strong>Active Filters:</strong>{' '}
                  {(viewType === 'projects' || viewType === 'projectsTable') && (
                    <>
                      {filters.department !== 'All' && <span>&#127970; {filters.department}</span>}
                      {filters.project_year !== 'All' && <span> &#128197; {filters.project_year}</span>}
                      {filters.project_type !== 'All' && <span> &#128203; {filters.project_type}</span>}
                      {filters.status !== 'All' && <span> &#9889; {filters.status}</span>}
                    </>
                  )}
                  {viewType === 'patents' && !isRestrictedUser && (
                    <>
                      {filters.patent_year !== 'All' && <span>&#128197; {filters.patent_year}</span>}
                      {filters.patent_status !== 'All' && <span> &#128204; {filters.patent_status}</span>}
                    </>
                  )}
                </div>
              </div>
            )}

            <>
              {/* Projects Trend */}
              {viewType === 'projects' && (
                <section className="icsr-chart-section">
                  <div className="icsr-chart-header-row">
                    <div className="chart-header">
                      <h2 className="icsr-chart-title">
                        <span className="icsr-chart-icon">&#128202;</span> Projects Trend
                      </h2>
                      <p className="chart-description">
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

                  <div className="icsr-mode-btns">
                    {['bar', 'trend'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setProjectsChartMode(mode)}
                        className={`icsr-mode-btn${projectsChartMode === mode ? ' icsr-mode-btn--active-indigo' : ''}`}
                      >
                        {mode === 'bar' ? 'Bar' : 'Trend'}
                      </button>
                    ))}
                  </div>

                  <div
                    id="research-projects-trend-container"
                    className={`chart-container clickable-chart icsr-chart-area${!projectTrendChartData.length ? ' chart-has-empty' : ''}`}
                    onClick={() => setExpandedChart({
                      title: "Projects Trend",
                      content: (
                        <ResponsiveContainer width="100%" height={500}>
                          {projectsChartMode === 'bar' ? (
                            <BarChart data={projectTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Bar dataKey="funded" name="Sponsored Projects" fill="#6366f1" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="funded" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#6366f1" }} />
                              </Bar>
                              <Bar dataKey="consultancy" name="Consultancy Projects" fill="#22c55e" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="consultancy" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#22c55e" }} />
                              </Bar>
                            </BarChart>
                          ) : (
                            <LineChart data={projectTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip />} />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Line type="linear" dataKey="funded" name="Sponsored Projects" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} />
                              <Line type="linear" dataKey="consultancy" name="Consultancy Projects" stroke="#22c55e" strokeWidth={3} dot={{ r: 6 }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      )
                    })}
                  >
                    <div className={`section-empty-state ${projectTrendChartData.length ? 'hidden' : ''}`}>
                      <p>No information available for the selected filter</p>
                    </div>
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                      {projectsChartMode === 'bar' ? (
                        <BarChart data={projectTrendChartData} margin={{ top: 30, right: 10, left: chartIsMobile ? 0 : 20, bottom: chartIsMobile ? 60 : 50 }} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} width={32} />
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
                        <LineChart data={projectTrendChartData} margin={{ top: 30, right: 10, left: chartIsMobile ? 0 : 20, bottom: chartIsMobile ? 60 : 50 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
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
                  </div>
                </section>
              )}

              {/* Patents Trend */}
              {viewType === 'patents' && !isRestrictedUser && (
                <section className="icsr-chart-section">
                  <div className="icsr-chart-header-row">
                    <div className="chart-header">
                      <h2 className="icsr-chart-title">
                        <span className="icsr-chart-icon">&#128221;</span> Knowledge Transfer
                      </h2>
                      <p className="chart-description">
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

                  <div className="icsr-mode-btns">
                    {['bar', 'trend'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPatentsChartMode(mode)}
                        className={`icsr-mode-btn${patentsChartMode === mode ? ' icsr-mode-btn--active-orange' : ''}`}
                      >
                        {mode === 'bar' ? 'Bar Chart' : 'Trend Line'}
                      </button>
                    ))}
                  </div>

                  <div
                    id="research-patents-trend-container"
                    className={`chart-container clickable-chart icsr-chart-area${!patentTrendChartData.length ? ' chart-has-empty' : ''}`}
                    onClick={() => setExpandedChart({
                      title: "Knowledge Transfer (Patents)",
                      content: (
                        <ResponsiveContainer width="100%" height={500}>
                          {patentsChartMode === 'bar' ? (
                            <BarChart data={patentTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }} barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                              {PATENT_STATUS_ORDER.map((status) => (
                                <Bar key={status} dataKey={status} name={status} fill={PATENT_COLORS[status]} radius={[6, 6, 0, 0]}>
                                  <LabelList dataKey={status} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: PATENT_COLORS[status] }} />
                                </Bar>
                              ))}
                            </BarChart>
                          ) : (
                            <LineChart data={patentTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                              {PATENT_STATUS_ORDER.map((status) => (
                                <Line key={status} type="linear" dataKey={status} name={status}
                                  stroke={PATENT_COLORS[status]} strokeWidth={3}
                                  dot={{ r: 6, fill: PATENT_COLORS[status] }} activeDot={{ r: 8 }}>
                                  <LabelList dataKey={status} offset={10} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: PATENT_COLORS[status] }} />
                                </Line>
                              ))}
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      )
                    })}
                  >
                    <div className={`section-empty-state ${patentTrendChartData.length ? 'hidden' : ''}`}>
                      <p>No information available for the selected filter</p>
                    </div>
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                      {patentsChartMode === 'bar' ? (
                        <BarChart data={patentTrendChartData} margin={{ top: 30, right: 10, left: chartIsMobile ? 0 : 20, bottom: chartIsMobile ? 60 : 30 }} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                          <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                          {PATENT_STATUS_ORDER.map((status) => (
                            <Bar key={status} dataKey={status} name={status} fill={PATENT_COLORS[status]} radius={[4, 4, 0, 0]} barSize={18}>
                              <LabelList dataKey={status} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[status] }} />
                            </Bar>
                          ))}
                        </BarChart>
                      ) : (
                        <LineChart data={patentTrendChartData} margin={{ top: 30, right: 10, left: chartIsMobile ? 0 : 20, bottom: chartIsMobile ? 60 : 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                          <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                          {PATENT_STATUS_ORDER.map((status) => (
                            <Line key={status} type="linear" dataKey={status} name={status}
                              stroke={PATENT_COLORS[status]} strokeWidth={2.5}
                              dot={{ r: 5, fill: PATENT_COLORS[status] }} activeDot={{ r: 7 }}>
                              <LabelList dataKey={status} offset={10} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[status] }} />
                            </Line>
                          ))}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Projects Directory */}
              {viewType === 'projectsTable' && !isRestrictedUser && (
                <section className="icsr-chart-section">
                  <div className="icsr-chart-header-row">
                    <div className="chart-header">
                      <h2 className="icsr-dir-title">
                        <span>&#128203;</span> Projects Directory
                      </h2>
                      <p className="icsr-dir-count">
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

                  <div id="research-projects-directory-table">
                    {chartIsMobile ? (
                      <div className="icsr-mobile-cards">
                        {projectList.map((p, i) => (
                          <div key={p.project_id || i} className="icsr-proj-card">
                            <div className="icsr-proj-card-title">{p.project_title}</div>
                            <div className="icsr-proj-card-badges">
                              <span className="icsr-proj-badge-type">{p.project_type}</span>
                              <span className="icsr-proj-badge-dept">{p.department}</span>
                              <span className={p.status === 'Ongoing' ? 'icsr-proj-badge-ongoing' : 'icsr-proj-badge-completed'}>
                                {p.status}
                              </span>
                            </div>
                            <div className="icsr-proj-card-stats">
                              <div>
                                <div className="icsr-proj-stat-label">Investigator</div>
                                <div className="icsr-proj-stat-value">{p.principal_investigator}</div>
                              </div>
                              <div>
                                <div className="icsr-proj-stat-label">Sanctioned Amount</div>
                                <div className="icsr-proj-stat-amount">{formatCurrency(p.amount_sanctioned)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!projectList.length && (
                          <div className="icsr-empty-state">
                            No projects found for the selected filter
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="table-responsive icsr-proj-table-wrap">
                        <table className="icsr-proj-table">
                          <thead className="icsr-proj-thead">
                            <tr>
                              <th>Title</th>
                              <th>PI</th>
                              <th>Type</th>
                              <th>Dept</th>
                              <th>Amount</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectList.map((p, i) => (
                              <tr key={p.project_id || i} className="ricsr-tr" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                <td>{p.project_title}</td>
                                <td>{p.principal_investigator}</td>
                                <td>{p.project_type}</td>
                                <td>{p.department}</td>
                                <td>{formatCurrency(p.amount_sanctioned)}</td>
                                <td>
                                  <span className={p.status === 'Ongoing' ? 'icsr-proj-status--ongoing' : 'icsr-proj-status--completed'}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {!projectList.length && (
                              <tr>
                                <td colSpan={6} className="icsr-table-empty-cell">
                                  No information available for the selected filter
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* MoU Section */}
              {viewType === 'mou' && (!isRestrictedUser || mouOnly) && (
                <section className="icsr-mou-section">
                  {/* Top filter bar */}
                  <div className="icsr-mou-filter-bar">
                    <div className="icsr-mou-filter-top">
                      <div className="icsr-mou-filter-left">
                        <h4 className="icsr-filter-h4">Filters</h4>

                        {/* Nav tabs — only for non-restricted, non-mouOnly users */}
                        {!mouOnly && !isRestrictedUser && (
                          <div className="icsr-nav-tabs">
                            <button
                              className={`icsr-nav-tab${viewType === 'projects' ? ' icsr-nav-tab--active' : ''}`}
                              onClick={() => safeSetViewType('projects')}
                            >
                              &#128202; Projects Trend
                            </button>
                            {/* Patents Trend, Projects Directory, MoUs tabs removed per request */}
                          </div>
                        )}
                      </div>

                      <button
                        className="clear-filters-btn"
                        onClick={() => { handleClearFilters(); handleClearMouFilters(); }}
                      >
                        Clear Filters
                      </button>
                    </div>

                    <div className="icsr-mou-filter-bottom">
                      {/* Sub-view toggle — Directory button hidden for guest users */}
                      <div className="icsr-mou-sub-btns">
                        <button
                          className={`icsr-mou-tab${mouViewType === 'trend' ? ' icsr-mou-tab--active-trend' : ''}`}
                          onClick={() => safeSetMouViewType('trend')}
                        >
                          &#128200; MoUs Trend
                        </button>

                        {/* Directory button hidden for guest/restricted users */}
                        {!isRestrictedUser && (
                          <button
                            className={`icsr-mou-tab${mouViewType === 'directory' ? ' icsr-mou-tab--active-directory' : ''}`}
                            onClick={() => safeSetMouViewType('directory')}
                          >
                            &#128203; MoUs Directory
                          </button>
                        )}
                      </div>

                      {/* MoU Year filter hidden for guest/restricted users */}
                      {!isRestrictedUser && (
                        <div className="icsr-mou-year-filter">
                          <label className="icsr-mou-year-label">MoU Year</label>
                          <select
                            value={mouFilters.mou_year}
                            onChange={(e) => handleMouFilterChange('mou_year', e.target.value)}
                            className="icsr-select"
                          >
                            <option value="All">All Years</option>
                            {(filterOptions.mou_years || []).map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chart / Table body */}
                  <div className="icsr-mou-body">
                    <div className="icsr-mou-header-row">
                      <div>
                        <h2 className="icsr-mou-title">
                          <span>&#129309;</span>
                          {mouViewType === 'trend' ? 'MoUs Trend' : 'MoUs Directory'}
                        </h2>
                        {mouViewType === 'directory' && !isRestrictedUser && (
                          <p className="icsr-mou-count">
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

                    {/* Trend view — always visible */}
                    {mouViewType === 'trend' && (
                      <>
                        <div className="icsr-mode-btns">
                          {['bar', 'trend'].map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setMouChartMode(mode)}
                              className={`icsr-mode-btn${mouChartMode === mode ? ' icsr-mode-btn--active-purple' : ''}`}
                            >
                              {mode === 'bar' ? 'Bar' : 'Trend'}
                            </button>
                          ))}
                        </div>

                        <div
                          id="research-mou-trend-container"
                          className={`chart-container clickable-chart icsr-mou-chart${!mouTrendChartData.length ? ' chart-has-empty' : ''}`}
                          onClick={() => setExpandedChart({
                            title: "MoUs Trend",
                            content: (
                              <ResponsiveContainer width="100%" height={500}>
                                {mouChartMode === 'bar' ? (
                                  <BarChart data={mouTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                                    <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                                    <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="total" name="MoUs Signed" fill={MOU_COLOR} radius={[6, 6, 0, 0]}>
                                      <LabelList dataKey="total" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: MOU_COLOR }} />
                                    </Bar>
                                  </BarChart>
                                ) : (
                                  <LineChart data={mouTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                                    <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                                    <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="linear" dataKey="total" name="MoUs Signed" stroke={MOU_COLOR} strokeWidth={3} dot={{ r: 6 }} />
                                  </LineChart>
                                )}
                              </ResponsiveContainer>
                            )
                          })}
                        >
                          <div className={`section-empty-state ${mouTrendChartData.length ? 'hidden' : ''}`}>
                            <p>No information available for the selected filter</p>
                          </div>
                          <ResponsiveContainer width="100%" height={chartIsMobile ? 260 : 450}>
                            {mouChartMode === 'bar' ? (
                              <BarChart data={mouTrendChartData} margin={{ top: 30, right: 10, left: chartIsMobile ? 0 : 40, bottom: chartIsMobile ? 60 : 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                                <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
                                <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                                <Bar dataKey="total" name="MoUs Signed" fill={MOU_COLOR} radius={[4, 4, 0, 0]} barSize={28}>
                                  <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: MOU_COLOR }} />
                                </Bar>
                              </BarChart>
                            ) : (
                              <LineChart data={mouTrendChartData} margin={{ top: 30, right: 10, left: chartIsMobile ? 0 : 40, bottom: chartIsMobile ? 60 : 30 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                                <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (dataMax) => Math.ceil(dataMax * 1.2)]} />
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
                        </div>
                      </>
                    )}

                    {/* Directory view — only rendered for non-restricted users */}
                    {mouViewType === 'directory' && !isRestrictedUser && (
                      <div id="research-mou-directory-table">
                        {chartIsMobile ? (
                          <div className="icsr-mobile-cards">
                            {mouList.map((m, i) => (
                              <div key={m.mou_id ?? i} className="icsr-mou-card">
                                <div className="icsr-mou-card-partner">{m.partner_name}</div>
                                <div className="icsr-mou-card-nature">{m.collaboration_nature}</div>
                                <div className="icsr-mou-card-stats">
                                  <div>
                                    <div className="icsr-proj-stat-label">Date Signed</div>
                                    <div className="icsr-proj-stat-value">{formatDate(m.date_signed)}</div>
                                  </div>
                                  <div>
                                    <div className="icsr-proj-stat-label">Valid Till</div>
                                    <div className="icsr-proj-stat-value">{formatDate(m.validity_end)}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {!mouList.length && (
                              <div className="icsr-empty-state">
                                No MoUs found for the selected filter
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="table-responsive icsr-mou-table-wrap">
                            <table className="icsr-mou-table">
                              <thead className="icsr-mou-thead">
                                <tr>
                                  <th>Partner</th>
                                  <th>Focus</th>
                                  <th>Signed</th>
                                  <th>Valid Till</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mouList.map((m, i) => (
                                  <tr key={m.mou_id ?? i} className="ricsr-tr" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                    <td>{m.partner_name}</td>
                                    <td>{m.collaboration_nature}</td>
                                    <td>{formatDate(m.date_signed)}</td>
                                    <td>{formatDate(m.validity_end)}</td>
                                  </tr>
                                ))}
                                {!mouList.length && (
                                  <tr>
                                    <td colSpan={4} className="icsr-table-empty-cell">
                                      No information available for the selected filter
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>

            <DataUploadModal
              isOpen={isUploadModalOpen}
              onClose={() => setIsUploadModalOpen(false)}
              tableName={activeUploadTable}
              token={token}
              onUploadSuccess={loadData}
            />

            {/* Fullscreen Chart Modal */}
            <ChartExpandModal
              isOpen={!!expandedChart}
              onClose={() => setExpandedChart(null)}
              title={expandedChart?.title}
            >
              {expandedChart?.content}
            </ChartExpandModal>
          </>
        )}
      </div>
    </div>
  );
}

export default ResearchIcsrSection;
