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
  LabelList} from 'recharts';
import {
  fetchInnovationSummary,
  fetchYearlyGrowth,
  fetchSectorDistribution,
  fetchStartups,
  fetchFilterOptions
} from '../services/innovationStats';
import './Page.css';
import './PeopleCampus.css';
import './InnovationSection.css';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';
import CustomTooltip from './CustomTooltip';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';


const SECTOR_COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#a855f7', '#facc15', '#fb7185', '#14b8a6'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function InnovationSection({ user, isPublicView }) {
  const [showPublicView, setShowPublicView] = useState(false);

  if (isPublicView) {
    return <InnovationSectionContent user={user} isPublicView={true} />;
  }
  const roleId = user?.role_id;

  if (roleId === 1) {
    return <InnovationPublicView user={user} />;
  }

  if (showPublicView) {
    return (
      <div className="page-container">
        <div className="page-content">
          <div className="inno-back-btn-wrap">
            <button className="page-upload-btn" onClick={() => setShowPublicView(false)}>
              ← Back to Admin View
            </button>
          </div>
          <InnovationPublicView user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="inno-admin-header">
          <div>
            <h1>Innovation & Entrepreneurship</h1>
            <p className="inno-admin-desc">
              Track incubatees, startups, and innovation projects at TECHIN and IPTIF.
            </p>
          </div>
          <div>
            <button className="page-upload-btn" onClick={() => setShowPublicView(true)}>
              View Public Page
            </button>
          </div>
        </div>
        <InnovationSectionContent user={user} isPublicView={false} />
      </div>
    </div>
  );
}

function InnovationSectionContent({ user, isPublicView }) {
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const [viewType, setViewType] = useState('yearlyGrowth');
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

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

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const serializedFilters = JSON.stringify({ status: filters.status, sector: filters.sector, year: filters.year });
  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const options = await fetchFilterOptions({ status: filters.status, sector: filters.sector, year: filters.year }, token);
        if (!isMounted) return;
        setFilterOptions(options);

        const corrections = {};
        if (filters.status !== 'All' && filters.status && options.statuses && !options.statuses.includes(filters.status)) {
          corrections.status = 'All';
        }
        if (filters.sector !== 'All' && filters.sector && options.sectors && !options.sectors.includes(filters.sector)) {
          corrections.sector = 'All';
        }
        if (filters.year !== 'All' && filters.year && options.years && !options.years.includes(filters.year) && !options.years.map(String).includes(String(filters.year))) {
          corrections.year = 'All';
        }
        if (Object.keys(corrections).length > 0) {
          setFilters(prev => ({ ...prev, ...corrections }));
        }
      } catch (err) {
        if (isMounted) console.error('Error loading filter options:', err);
      }
    };
    loadFilterOptions();
    return () => { isMounted = false; };
  }, [serializedFilters, token, uploadVersion, filters.sector, filters.status, filters.year]);

  useEffect(() => {
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
    const loadStartups = async () => {
      try {
        const result = await fetchStartups(
          filters,
          pagination.page,
          pagination.per_page,
          token
        );
        setStartupsList(result.data || []);
        setPagination(prev => result.pagination || prev);
      } catch (err) {
        console.error('Error loading startups:', err);
      }
    };
    loadStartups();
  }, [filters, pagination.page, pagination.per_page, token, uploadVersion]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    if (field !== 'search') {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleClearFilters = () => {
    setFilters({ status: 'All', sector: 'All', year: 'All', iitpkd_only: false, search: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

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

  const wrapClass = isPublicView ? 'inno-public-wrap' : '';

  return (
    <div className={wrapClass}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LastUpdated tables={['innovation_startups']} />
        <ShareButton />
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      <div className="inno-stats-grid">
        {/* Total Incubatees */}
        <div className="inno-stat-card inno-stat-card--incubatees">
          <div className="inno-stat-card-decor1" />
          <div className="inno-stat-card-decor2" />
          <div className="inno-stat-card-body">
            <div className="inno-stat-card-header">
              <span className="inno-stat-card-icon">🚀</span>
              <h3 className="inno-stat-card-label">Total Incubatees</h3>
            </div>
            <div className="metric-value inno-stat-card-value">{formatNumber(summary.total_incubatees)}</div>
            <div className="inno-stat-card-status">
              <span className="inno-stat-card-dot" />
              <span className="inno-stat-card-subtext">Active incubatees</span>
            </div>
          </div>
        </div>

        {/* Total Startups */}
        <div className="inno-stat-card inno-stat-card--startups">
          <div className="inno-stat-card-decor1" />
          <div className="inno-stat-card-decor2" />
          <div className="inno-stat-card-body">
            <div className="inno-stat-card-header">
              <span className="inno-stat-card-icon">💡</span>
              <h3 className="inno-stat-card-label">Total Startups</h3>
            </div>
            <div className="metric-value inno-stat-card-value">{formatNumber(summary.total_startups)}</div>
            <div className="inno-stat-card-status">
              <span className="inno-stat-card-dot" />
              <span className="inno-stat-card-subtext">Registered startups</span>
            </div>
          </div>
        </div>

        {/* Innovation Projects */}
        <div className="inno-stat-card inno-stat-card--projects">
          <div className="inno-stat-card-decor1" />
          <div className="inno-stat-card-decor2" />
          <div className="inno-stat-card-body">
            <div className="inno-stat-card-header">
              <span className="inno-stat-card-icon">🔬</span>
              <h3 className="inno-stat-card-label">Innovation Projects</h3>
            </div>
            <div className="metric-value inno-stat-card-value">{formatNumber(summary.total_innovation_projects)}</div>
            <div className="inno-stat-card-status">
              <span className="inno-stat-card-dot" />
              <span className="inno-stat-card-subtext">R&amp;D projects</span>
            </div>
          </div>
        </div>

        {/* IITPKD Startups */}
        <div className="inno-stat-card inno-stat-card--iitpkd">
          <div className="inno-stat-card-decor1" />
          <div className="inno-stat-card-decor2" />
          <div className="inno-stat-card-body">
            <div className="inno-stat-card-header">
              <span className="inno-stat-card-icon">🎓</span>
              <h3 className="inno-stat-card-label">IITPKD Startups</h3>
            </div>
            <div className="metric-value inno-stat-card-value">{formatNumber(summary.startups_from_iitpkd)}</div>
            <div className="inno-stat-card-status">
              <span className="inno-stat-card-dot" />
              <span className="inno-stat-card-subtext">Founded by alumni</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="inno-filter-panel">
        <div className="inno-filter-header">
          <h3>Filters &amp; Visualization Options</h3>
          <div className="inno-filter-actions">
            <button className="clear-filters-btn" onClick={handleClearFilters}>
              Clear Filters
            </button>
            {!isReadOnlyView && isAdmin && (
              <button className="inno-upload-btn page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                Upload Startups
              </button>
            )}
          </div>
        </div>

        {/* View Type Selection */}
        <div className="inno-view-selector">
          <span className="inno-view-selector-title">Select View Type:</span>
          <div className="inno-view-grid">
            <label className={`inno-view-label${viewType === 'yearlyGrowth' ? ' inno-view-label--active-yearly' : ''}`}>
              <input
                type="radio"
                name="viewType"
                value="yearlyGrowth"
                checked={viewType === 'yearlyGrowth'}
                onChange={(e) => setViewType(e.target.value)}
                className="inno-view-radio inno-view-radio--growth"
              />
              <span className={`inno-view-text${viewType === 'yearlyGrowth' ? ' inno-view-text--active' : ''}`}>
                📈 Yearly Growth
              </span>
            </label>

            <label className={`inno-view-label${viewType === 'sectorDistribution' ? ' inno-view-label--active-sector' : ''}`}>
              <input
                type="radio"
                name="viewType"
                value="sectorDistribution"
                checked={viewType === 'sectorDistribution'}
                onChange={(e) => setViewType(e.target.value)}
                className="inno-view-radio inno-view-radio--sector"
              />
              <span className={`inno-view-text${viewType === 'sectorDistribution' ? ' inno-view-text--active' : ''}`}>
                📊 Sector Distribution
              </span>
            </label>

            <label className={`inno-view-label${viewType === 'startupsDirectory' ? ' inno-view-label--active-directory' : ''}`}>
              <input
                type="radio"
                name="viewType"
                value="startupsDirectory"
                checked={viewType === 'startupsDirectory'}
                onChange={(e) => setViewType(e.target.value)}
                className="inno-view-radio inno-view-radio--directory"
              />
              <span className={`inno-view-text${viewType === 'startupsDirectory' ? ' inno-view-text--active' : ''}`}>
                📋 Startups Directory
              </span>
            </label>
          </div>
        </div>

        <div className="inno-filter-grid">
          <div className="inno-filter-group">
            <label className="inno-filter-label">Status</label>
            <select
              className="inno-filter-select filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="All">All Status</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="inno-filter-group">
            <label className="inno-filter-label">Sector</label>
            <select
              className="inno-filter-select filter-select"
              value={filters.sector}
              onChange={(e) => handleFilterChange('sector', e.target.value)}
            >
              <option value="All">All Sectors</option>
              {filterOptions.sectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>

          <div className="inno-filter-group">
            <label className="inno-filter-label">Year</label>
            <select
              className="inno-filter-select filter-select"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            >
              <option value="All">All Years</option>
              {filterOptions.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="inno-filter-group inno-checkbox-group">
            <label className="inno-checkbox-label">
              <input
                type="checkbox"
                checked={filters.iitpkd_only}
                onChange={(e) => handleFilterChange('iitpkd_only', e.target.checked)}
                className="inno-checkbox-input"
              />
              <span className="inno-checkbox-text">IIT Palakkad Only</span>
            </label>
          </div>

          <div className="inno-filter-group-full">
            <label className="inno-filter-label">Search</label>
            <input
              type="text"
              placeholder="Search by startup name, founder, or innovation area..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="inno-filter-select filter-select"
            />
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="inno-active-filters">
          <strong>Active Filters:</strong>{' '}
          {filters.status !== 'All' && <span className="inno-filter-tag">📌 Status: {filters.status}</span>}
          {filters.sector !== 'All' && <span className="inno-filter-tag">🏢 Sector: {filters.sector}</span>}
          {filters.year !== 'All' && <span className="inno-filter-tag">📅 Year: {filters.year}</span>}
          {filters.iitpkd_only && <span className="inno-filter-tag">🎓 IITPKD Only</span>}
          {filters.search && <span className="inno-filter-tag">🔍 Search: &quot;{filters.search}&quot;</span>}
          {filters.status === 'All' && filters.sector === 'All' && filters.year === 'All' && !filters.iitpkd_only && !filters.search &&
            <span>No filters applied (showing all data)</span>
          }
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="chart-section inno-main-section">

        {/* Yearly Growth Chart */}
        {viewType === 'yearlyGrowth' && (
          <div>
            <div className="inno-chart-header">
              <div>
                <h2>
                  <span className="inno-icon-span">📈</span> Year-wise Growth
                </h2>
                <p className="chart-description">
                  Growth of incubatees, startups, and innovation projects over time.
                </p>
              </div>
              <ExportMenu
                elementId="innovation-yearly-growth-container"
                data={yearlyChartData}
                headers={['Year', 'Incubatees', 'Startups', 'Innovation Projects']}
                keys={['year', 'incubatees', 'startups', 'innovationProjects']}
                filename="innovation_yearly_growth"
                title="Year-wise Growth"
              />
            </div>

            {yearlyChartData.length > 0 ? (
              <div
                id="innovation-yearly-chart"
                className="chart-container clickable-chart"
                onClick={() => setExpandedChart({
                  title: "Yearly Innovation Growth",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={yearlyChartData} margin={{ top: 40, right: 40, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                        <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '20px' }} />
                        <Line type="monotone" dataKey="incubatees" name="Incubatees" stroke="#667eea" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="monotone" dataKey="startups" name="Startups" stroke="#764ba2" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="monotone" dataKey="innovationProjects" name="Innovation Projects" stroke="#f093fb" strokeWidth={3} dot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: chartIsMobile ? 40 : 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis dataKey="year" stroke="#666" interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                    <YAxis stroke="#666" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="incubatees" name="Incubatees" stroke="#667eea" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }}>
                      <LabelList dataKey="incubatees" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} />
                    </Line>
                    <Line type="monotone" dataKey="startups" name="Startups" stroke="#764ba2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }}>
                      <LabelList dataKey="startups" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#764ba2' }} />
                    </Line>
                    <Line type="monotone" dataKey="innovationProjects" name="Innovation Projects" stroke="#f093fb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }}>
                      <LabelList dataKey="innovationProjects" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#f093fb' }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="inno-no-data">
                <span className="inno-no-data-icon">📈</span>
                <p className="inno-no-data-text">No yearly growth data available.</p>
              </div>
            )}
          </div>
        )}

        {/* Sector Distribution Chart */}
        {viewType === 'sectorDistribution' && (
          <div>
            <div className="inno-chart-header">
              <div>
                <h2>
                  <span className="inno-icon-span">📊</span> Sector-wise Innovation Distribution
                </h2>
                <p className="chart-description">
                  Distribution of startups and innovation projects by sector.
                </p>
              </div>
              <ExportMenu
                elementId="innovation-sector-dist-container"
                data={sectorPieData}
                headers={['Sector', 'Count', 'Startups', 'Projects']}
                keys={['name', 'value', 'startups', 'projects']}
                filename="innovation_sector_distribution"
                title="Sector-wise Innovation Distribution"
              />
            </div>

            {sectorPieData.length > 0 ? (
              <div
                id="innovation-sector-chart"
                className="chart-container clickable-chart"
                onClick={() => setExpandedChart({
                  title: "Sector Distribution",
                  content: (
                    <div className="inno-chart-expand-pad">
                      <ResponsiveContainer width="100%" height={500}>
                        <PieChart>
                          <Pie data={sectorPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={180} label={({ name, value }) => `${name}: ${value}`}>
                            {sectorPieData.map((_entry, index) => (
                              <Cell key={index} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={sectorPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={chartIsMobile ? 80 : 120} label={false}>
                      {sectorPieData.map((_entry, index) => (
                        <Cell key={index} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="inno-no-data">
                <span className="inno-no-data-icon">📊</span>
                <p className="inno-no-data-text">No sector distribution data available.</p>
              </div>
            )}
          </div>
        )}

        {/* Startups Directory Table */}
        {viewType === 'startupsDirectory' && (
          <div>
            <div className="chart-header">
              <h2>
                <span className="inno-icon-span">📋</span> Startups Directory
              </h2>
              <p className="chart-description">
                Search and filter through all startups and incubatees.
              </p>
            </div>

            {startupsList.length > 0 ? (
              <div>
                <div id="innovation-startups-directory">
                  {chartIsMobile ? (
                    <div className="inno-mobile-cards">
                      {startupsList.map((startup) => (
                        <div key={startup.startup_id} className="inno-mobile-card">
                          <div className="inno-mobile-card-header">
                            <div className="inno-mobile-card-name">{startup.startup_name}</div>
                            <span className={`inno-status-badge ${startup.status === 'Active' ? 'inno-status-badge--active' : 'inno-status-badge--inactive'}`}>
                              {startup.status}
                            </span>
                          </div>
                          <div className="inno-mobile-card-field">
                            <span className="inno-mobile-card-field-label">Founder:</span> {startup.founder_name}
                          </div>
                          <div className="inno-mobile-card-field">
                            <span className="inno-mobile-card-field-label">Sector:</span> {startup.sector || '—'}
                          </div>
                          <div className="inno-mobile-card-field inno-mobile-card-field--last">
                            <span className="inno-mobile-card-field-label">Area:</span> {startup.innovation_focus_area || '—'}
                          </div>
                          <div className="inno-mobile-card-footer">
                            <div className="inno-mobile-card-year">
                              Year: <strong>{startup.year_of_incubation}</strong>
                            </div>
                            {startup.is_from_iitpkd && (
                              <span className="inno-iitpkd-badge">IITPKD Alumnus</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="inno-startup-table">
                        <thead className="inno-startup-thead">
                          <tr>
                            <th>Startup Name</th>
                            <th>Founder</th>
                            <th>Innovation / Focus Area</th>
                            <th>Year</th>
                            <th>Status</th>
                            <th>Sector</th>
                            <th>IIT Palakkad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {startupsList.map((startup, index) => (
                            <tr key={startup.startup_id} className={index % 2 === 0 ? 'inno-tr-even' : 'inno-tr-odd'}>
                              <td>{startup.startup_name}</td>
                              <td>{startup.founder_name}</td>
                              <td>{startup.innovation_focus_area || '—'}</td>
                              <td>{startup.year_of_incubation}</td>
                              <td>
                                <span className={`inno-status-badge inno-status-badge-sm ${startup.status === 'Active' ? 'inno-status-badge--active' : 'inno-status-badge--inactive'}`}>
                                  {startup.status}
                                </span>
                              </td>
                              <td>
                                {startup.sector && (
                                  <span className="inno-sector-badge">{startup.sector}</span>
                                )}
                              </td>
                              <td>
                                <span className={`inno-bool-badge ${startup.is_from_iitpkd ? 'inno-bool-badge--yes' : 'inno-bool-badge--no'}`}>
                                  {startup.is_from_iitpkd ? '✓ Yes' : 'No'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Table Statistics */}
                <div className="inno-stats-bar">
                  <div>
                    <div className="inno-stat-num inno-stat-num--orange">{startupsList.length}</div>
                    <div className="inno-stat-label">Showing</div>
                  </div>
                  <div>
                    <div className="inno-stat-num inno-stat-num--green">{startupsList.filter(s => s.status === 'Active').length}</div>
                    <div className="inno-stat-label">Active</div>
                  </div>
                  <div>
                    <div className="inno-stat-num inno-stat-num--indigo">{startupsList.filter(s => s.is_from_iitpkd).length}</div>
                    <div className="inno-stat-label">IITPKD Startups</div>
                  </div>
                  <div>
                    <div className="inno-stat-num inno-stat-num--purple">{new Set(startupsList.map(s => s.sector).filter(Boolean)).size}</div>
                    <div className="inno-stat-label">Sectors</div>
                  </div>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="inno-pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="inno-page-btn"
                    >
                      ← Previous
                    </button>
                    <span className="inno-page-info">
                      Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong>
                      <span className="inno-page-total">({formatNumber(pagination.total)} total)</span>
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.total_pages}
                      className="inno-page-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="inno-no-data inno-no-data--lg">
                <span className="inno-no-data-icon">📋</span>
                <p className="inno-no-data-text">No startups found for the selected filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Upload Modal */}
      {!isReadOnlyView && (
        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="innovation_startups"
          token={token}
        />
      )}

      {/* Fullscreen Chart Modal */}
      <ChartExpandModal
        isOpen={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedChart?.title}
      >
        {expandedChart?.content}
      </ChartExpandModal>
    </div>
  );
}

export default InnovationSection;
