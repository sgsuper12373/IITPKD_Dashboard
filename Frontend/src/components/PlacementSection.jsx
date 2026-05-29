import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useDebounce from '../utils/useDebounce';
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
  Bar, LabelList
} from 'recharts';

import {
  fetchPlacementFilterOptions,
  fetchPlacementSummary,
  fetchPlacementTrend,
  fetchPlacementGenderBreakdown,
  fetchPlacementProgramStatus,
  fetchPlacementRecruiters,
  fetchPlacementSectorDistribution,
  fetchPlacementPackageTrend,
  fetchTopRecruiters
} from '../services/placementStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './PlacementSection.css';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

const GENDER_COLORS = ['#6366f1', '#ec4899', '#f97316'];
const SECTOR_COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#a855f7', '#facc15', '#fb7185', '#14b8a6'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '&#8211;';
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric === 0) return '&#8211;';
  return `${numeric.toFixed(2)} LPA`;
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0%';
  return `${numeric.toFixed(2)}%`;
};

const VIEW_FILTER_FIELDS = {
  placementTrend: ['year', 'program', 'gender', 'branch'],
  genderWise: ['year', 'program', 'gender', 'branch'],
  programWise: ['year', 'program', 'gender', 'branch'],
  recruiters: ['year', 'sector'],
  sectorWise: ['year', 'sector'],
  packageTrend: ['year', 'program', 'sector'],
  topRecruiters: ['year', 'program', 'sector'],
};

const DEFAULT_FILTERS = { year: 'All', program: 'All', gender: 'All', branch: 'All', sector: 'All' };

const RESTRICTED_VIEWS = new Set(['placementTrend', 'topRecruiters', 'packageTrend', 'genderWise']);

function PlacementSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 11;
  const isRestrictedUser = typeof user === 'undefined' || !user || user?.role_id === 0;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle, { passive: true });
    return () => window.removeEventListener('resize', handle);
  }, []);

  const [filterOptions, setFilterOptions] = useState({
    years: [],
    programs: [],
    genders: [],
    branches: [],
    sectors: []
  });

  const [viewType, setViewType] = useState(isRestrictedUser ? 'programWise' : 'placementTrend');
  const [trendChartMode, setTrendChartMode] = useState('bar');

  const [trendFilters, setTrendFilters] = useState({ ...DEFAULT_FILTERS });
  const [genderFilters, setGenderFilters] = useState({ ...DEFAULT_FILTERS });
  const [programFilters, setProgramFilters] = useState({ ...DEFAULT_FILTERS });
  const [recruitersFilters, setRecruitersFilters] = useState({ ...DEFAULT_FILTERS });
  const [sectorFilters, setSectorFilters] = useState({ ...DEFAULT_FILTERS });
  const [packageFilters, setPackageFilters] = useState({ ...DEFAULT_FILTERS });
  const [topRecruitersFilters, setTopRecruitersFilters] = useState({ ...DEFAULT_FILTERS });

  const [summaryFilters] = useState({ ...DEFAULT_FILTERS });

  const [summary, setSummary] = useState({
    registered: 0, placed: 0, placement_percentage: 0,
    highest_package: null, lowest_package: null, average_package: null
  });

  const [trendData, setTrendData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [programStatus, setProgramStatus] = useState([]);
  const [recruiterStats, setRecruiterStats] = useState([]);
  const [sectorDistribution, setSectorDistribution] = useState([]);
  const [packageTrend, setPackageTrend] = useState([]);
  const [topRecruiters, setTopRecruiters] = useState([]);
  const [_loading, setLoading] = useState({
    summary: false, trend: false, gender: false, program: false,
    recruiters: false, sector: false, package: false, topRecruiters: false
  });

  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const latestYear = useMemo(() => {
    if (!filterOptions.years?.length) return null;
    return [...filterOptions.years].sort((a, b) =>
      parseInt(b.split('-')[0]) - parseInt(a.split('-')[0])
    )[0];
  }, [filterOptions.years]);

  const token = localStorage.getItem('authToken');

  const getCurrentFilters = useCallback(() => {
    switch (viewType) {
      case 'placementTrend': return trendFilters;
      case 'genderWise': return genderFilters;
      case 'programWise': return programFilters;
      case 'recruiters': return recruitersFilters;
      case 'sectorWise': return sectorFilters;
      case 'packageTrend': return packageFilters;
      case 'topRecruiters': return topRecruitersFilters;
      default: return trendFilters;
    }
  }, [viewType, trendFilters, genderFilters, programFilters, recruitersFilters, sectorFilters, packageFilters, topRecruitersFilters]);

  const handleFilterChange = useCallback((field, value) => {
    const updater = prev => ({ ...prev, [field]: value });
    switch (viewType) {
      case 'placementTrend': setTrendFilters(updater); break;
      case 'genderWise': setGenderFilters(updater); break;
      case 'programWise': setProgramFilters(updater); break;
      case 'recruiters': setRecruitersFilters(updater); break;
      case 'sectorWise': setSectorFilters(updater); break;
      case 'packageTrend': setPackageFilters(updater); break;
      case 'topRecruiters': setTopRecruitersFilters(updater); break;
    }
  }, [viewType]);

  const handleClearFilters = () => {
    const reset = { ...DEFAULT_FILTERS };
    switch (viewType) {
      case 'placementTrend': setTrendFilters(reset); break;
      case 'genderWise': setGenderFilters(reset); break;
      case 'programWise': setProgramFilters(reset); break;
      case 'recruiters': setRecruitersFilters(reset); break;
      case 'sectorWise': setSectorFilters(reset); break;
      case 'packageTrend': setPackageFilters(reset); break;
      case 'topRecruiters': setTopRecruitersFilters(reset); break;
    }
  };

  const currentFilters = getCurrentFilters();
  const serializedFilters = JSON.stringify(currentFilters);
  const debouncedFilters = useDebounce(serializedFilters, 300);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const options = await fetchPlacementFilterOptions(currentFilters, token);
        if (!isMounted) return;
        const rawGenders = Array.isArray(options?.genders) ? options.genders : [];
        setFilterOptions({
          years: Array.isArray(options?.years) ? options.years : [],
          programs: Array.isArray(options?.programs) ? options.programs : [],
          genders: rawGenders.length > 0 ? rawGenders : ['Male', 'Female', 'Transgender'],
          branches: Array.isArray(options?.branches) ? options.branches : [],
          sectors: Array.isArray(options?.sectors) ? options.sectors : []
        });

        let hasChanges = false;
        const activeFields = VIEW_FILTER_FIELDS[viewType] || [];
        const corrections = {};

        if (activeFields.includes('year') && currentFilters.year !== 'All' && options.years && !options.years.includes(currentFilters.year)) {
          corrections.year = 'All'; hasChanges = true;
        }
        if (activeFields.includes('program') && currentFilters.program !== 'All' && options.programs && !options.programs.includes(currentFilters.program)) {
          corrections.program = 'All'; hasChanges = true;
        }
        if (activeFields.includes('gender') && currentFilters.gender !== 'All' && options.genders && !options.genders.includes(currentFilters.gender)) {
          corrections.gender = 'All'; hasChanges = true;
        }
        if (activeFields.includes('branch') && currentFilters.branch !== 'All' && options.branches && !options.branches.includes(currentFilters.branch)) {
          corrections.branch = 'All'; hasChanges = true;
        }
        if (activeFields.includes('sector') && currentFilters.sector !== 'All' && options.sectors && !options.sectors.includes(currentFilters.sector)) {
          corrections.sector = 'All'; hasChanges = true;
        }

        if (hasChanges) {
          Object.entries(corrections).forEach(([field, val]) => handleFilterChange(field, val));
        }

      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch placement filter options:', err);
          setError(err.message || 'Failed to load placement filter options.');
        }
      }
    };
    load();
    return () => { isMounted = false; };
  }, [debouncedFilters, token, uploadVersion, viewType, handleFilterChange]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, summary: true }));
        const resolvedFilters = { ...summaryFilters };
        if (resolvedFilters.year === 'All' && latestYear) {
          resolvedFilters.year = latestYear;
        }
        const summaryResp = await fetchPlacementSummary(resolvedFilters, token);
        if (!isMounted) return;
        setSummary(summaryResp?.data || {
          registered: 0, placed: 0, placement_percentage: 0,
          highest_package: null, lowest_package: null, average_package: null
        });
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load summary data:', err);
          setError(err.message || 'Failed to load placement summary.');
        }
      } finally {
        if (isMounted) setLoading(p => ({ ...p, summary: false }));
      }
    };
    load();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, uploadVersion, latestYear, JSON.stringify(summaryFilters)]);

  useEffect(() => {
    if (viewType !== 'placementTrend') return;
    if (isRestrictedUser) return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, trend: true }));
        setError(null);
        const trendResp = await fetchPlacementTrend(trendFilters, token);
        setTrendData(trendResp?.data || []);
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError(err.message || 'Failed to load placement statistics.');
      } finally {
        setLoading(p => ({ ...p, trend: false }));
      }
    };
    load();
  }, [trendFilters, token, viewType, uploadVersion, isRestrictedUser]);

  useEffect(() => {
    if (viewType !== 'genderWise') return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, gender: true }));
        setError(null);
        const resp = await fetchPlacementGenderBreakdown(genderFilters, token);
        setGenderData(resp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load gender statistics.');
      } finally {
        setLoading(p => ({ ...p, gender: false }));
      }
    };
    load();
  }, [genderFilters, token, viewType, uploadVersion]);

  useEffect(() => {
    if (viewType !== 'programWise') return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, program: true }));
        setError(null);
        const resp = await fetchPlacementProgramStatus(programFilters, token);
        setProgramStatus(resp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load program statistics.');
      } finally {
        setLoading(p => ({ ...p, program: false }));
      }
    };
    load();
  }, [programFilters, token, viewType, uploadVersion]);

  useEffect(() => {
    if (viewType !== 'recruiters') return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, recruiters: true }));
        setError(null);
        const resp = await fetchPlacementRecruiters(recruitersFilters, token);
        setRecruiterStats(resp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load recruiters statistics.');
      } finally {
        setLoading(p => ({ ...p, recruiters: false }));
      }
    };
    load();
  }, [recruitersFilters, token, viewType, uploadVersion]);

  useEffect(() => {
    if (viewType !== 'sectorWise') return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, sector: true }));
        setError(null);
        const resp = await fetchPlacementSectorDistribution(sectorFilters, token);
        setSectorDistribution(resp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load sector statistics.');
      } finally {
        setLoading(p => ({ ...p, sector: false }));
      }
    };
    load();
  }, [sectorFilters, token, viewType, uploadVersion]);

  useEffect(() => {
    if (viewType !== 'packageTrend') return;
    if (isRestrictedUser) return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, package: true }));
        setError(null);
        const resp = await fetchPlacementPackageTrend(packageFilters, token);
        setPackageTrend(resp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load package statistics.');
      } finally {
        setLoading(p => ({ ...p, package: false }));
      }
    };
    load();
  }, [packageFilters, token, viewType, uploadVersion, isRestrictedUser]);

  useEffect(() => {
    if (viewType !== 'topRecruiters') return;
    if (isRestrictedUser) return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, topRecruiters: true }));
        setError(null);
        const resp = await fetchTopRecruiters(topRecruitersFilters, token);
        setTopRecruiters(resp?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load top recruiters statistics.');
      } finally {
        setLoading(p => ({ ...p, topRecruiters: false }));
      }
    };
    load();
  }, [topRecruitersFilters, token, viewType, uploadVersion, isRestrictedUser]);

  const placementTrendChartData = useMemo(() => {
    const data = trendData.map(row => ({
      year: row.year,
      percentage: row.placement_percentage || 0,
      registered: row.registered || 0,
      placed: row.placed || 0
    }));
    return chartIsMobile && data.length > 3 ? data.slice(-3) : data;
  }, [trendData, chartIsMobile]);

  const genderBarData = useMemo(() =>
    genderData.map(row => ({
      gender: row.gender,
      registered: row.registered || 0,
      placed: row.placed || 0
    })), [genderData]);

  const programStatusChartData = useMemo(() =>
    programStatus
      .filter(row => {
        if (!isRestrictedUser) return true;
        const cat = row.program_category?.toLowerCase() || '';
        return !(cat.includes('ms') && cat.includes('phd')) &&
          cat !== 'ms' &&
          cat !== 'phd' &&
          !cat.includes('ms/phd');
      })
      .map(row => ({
        program: row.program_category,
        registered: row.registered || 0,
        placed: row.placed || 0,
        percentage: row.placement_percentage || 0
      })), [programStatus, isRestrictedUser]);

  const recruiterChartData = useMemo(() => {
    const data = recruiterStats.map(row => ({
      year: row.year,
      companies: row.companies || 0,
      offers: row.offers || 0
    }));
    return chartIsMobile && data.length > 3 ? data.slice(-3) : data;
  }, [recruiterStats, chartIsMobile]);

  const sectorPieData = useMemo(() =>
    sectorDistribution.map(row => ({
      sector: row.sector,
      companies: row.companies || 0,
      offers: row.offers || 0
    })), [sectorDistribution]);

  const packageTrendChartData = useMemo(() => {
    const data = packageTrend.map(row => ({
      year: row.year,
      highest: row.highest && row.highest !== 0 ? row.highest : null,
      lowest: row.lowest && row.lowest !== 0 ? row.lowest : null,
      average: row.average && row.average !== 0 ? row.average : null,
    }));
    return chartIsMobile && data.length > 3 ? data.slice(-3) : data;
  }, [packageTrend, chartIsMobile]);

  const ALL_RADIO_BUTTONS = [
    { id: 'placementTrend', label: 'Placement Trend', color: '#6366f1' },
    { id: 'genderWise', label: 'Gender Breakdown', color: '#ec4899' },
    { id: 'programWise', label: 'Program-wise', color: '#f97316' },
    { id: 'recruiters', label: 'Recruiters', color: '#f59e0b' },
    { id: 'sectorWise', label: 'Sector-wise', color: '#4f46e5' },
    { id: 'packageTrend', label: 'Package Trends', color: '#10b981' },
    { id: 'topRecruiters', label: 'Top Recruiters', color: '#8b5cf6' },
  ];

  const radioButtons = ALL_RADIO_BUTTONS.filter(
    btn => !isRestrictedUser || !RESTRICTED_VIEWS.has(btn.id)
  );

  const activeFields = VIEW_FILTER_FIELDS[viewType] || [];

  const renderFilterPanel = () => (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h4 className="shared-filter-panel-title">&#128269; Filters</h4>
        <button className="btn-danger" onClick={handleClearFilters}>Clear Filters</button>
      </div>

      <div className="mode-toggle-row" style={{
        marginBottom: activeFields.length ? 'var(--space-4)' : 0,
        paddingBottom: activeFields.length ? 'var(--space-4)' : 0,
        borderBottom: activeFields.length ? '1px solid var(--color-border)' : 'none'
      }}>
        {radioButtons.map((btn) => (
          <label
            key={btn.id}
            className="view-radio-label"
            style={{
              backgroundColor: viewType === btn.id ? btn.color : 'transparent',
              color: viewType === btn.id ? 'white' : '#555',
              border: `2px solid ${viewType === btn.id ? btn.color : '#d1d5db'}`,
              boxShadow: viewType === btn.id ? `0 3px 10px ${btn.color}40` : 'none',
            }}
          >
            <input
              type="radio"
              name="viewType"
              value={btn.id}
              checked={viewType === btn.id}
              onChange={(e) => setViewType(e.target.value)}
              style={{ accentColor: btn.color, width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: viewType === btn.id ? '600' : '500', fontSize: '13px' }}>
              {btn.label}
            </span>
          </label>
        ))}
      </div>

      {activeFields.length > 0 && (
        <div className="filter-grid">
          {activeFields.includes('year') && (
            <div className="shared-filter-item">
              <label className="shared-filter-label">Year</label>
              <select
                className="filter-select"
                value={currentFilters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
              >
                <option value="All">All Years</option>
                {filterOptions.years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('program') && (
            <div className="shared-filter-item">
              <label className="shared-filter-label">Program</label>
              <select
                className="filter-select"
                value={currentFilters.program}
                onChange={(e) => handleFilterChange('program', e.target.value)}
              >
                <option value="All">All Programs</option>
                {filterOptions.programs.map((program) => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('gender') && (
            <div className="shared-filter-item">
              <label className="shared-filter-label">Gender</label>
              <select
                className="filter-select"
                value={currentFilters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
              >
                <option value="All">All Genders</option>
                {filterOptions.genders.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('branch') && !(isRestrictedUser && viewType === 'programWise') && (
            <div className="shared-filter-item">
              <label className="shared-filter-label">Branch</label>
              <select
                className="filter-select"
                value={currentFilters.branch}
                onChange={(e) => handleFilterChange('branch', e.target.value)}
              >
                <option value="All">All Branches</option>
                {filterOptions.branches.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('sector') && (
            <div className="shared-filter-item">
              <label className="shared-filter-label">Sector</label>
              <select
                className="filter-select"
                value={currentFilters.sector}
                onChange={(e) => handleFilterChange('sector', e.target.value)}
              >
                <option value="All">All Sectors</option>
                {filterOptions.sectors.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/education')}>
            &#8592; Back to Education
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Placements &amp; Career Outcomes</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LastUpdated tables={['placement_summary', 'placement_companies', 'placement_packages']} />
                <ShareButton />
              </div>
            </div>

            {!isReadOnlyView && isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => { setActiveUploadTable('placement_summary'); setIsUploadModalOpen(true); }}
                >
                  <span>&#128228;</span> Upload Summary
                </button>
                <button
                  className="page-upload-btn"
                  onClick={() => { setActiveUploadTable('placement_companies'); setIsUploadModalOpen(true); }}
                >
                  <span>&#128228;</span> Upload Companies
                </button>
                <button
                  className="page-upload-btn"
                  onClick={() => { setActiveUploadTable('placement_packages'); setIsUploadModalOpen(true); }}
                >
                  <span>&#128228;</span> Upload Packages
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="export-row">
          <ExportMenu
            elementId="placement-summary-cards-container"
            data={[summary]}
            headers={['Year', 'Registered', 'Placed', 'Placement %', 'Highest Package', 'Average Package']}
            keys={['year', 'registered', 'placed', 'placement_percentage', 'highest_package', 'average_package']}
            filename={`placement_summary_${summary.year || 'latest'}`}
            title={`Placement Summary - ${summary.year || 'Latest'}`}
          />
        </div>

        <div id="placement-summary-cards-container" className="summary-cards-grid-5">
          <div className="metric-card pls-metric-card--indigo">
            <div className="metric-card-inner">
              <div className="metric-card-icon-row">
                <span className="metric-card-icon">&#127891;</span>
                <h3 className="metric-card-label">Registered {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-card-value">{formatNumber(summary.registered)}</div>
              <div className="metric-card-footer">
                <span className="metric-card-dot" />
                <span className="metric-card-subtitle">Eligible students</span>
              </div>
            </div>
          </div>

          <div className="metric-card pls-metric-card--green">
            <div className="metric-card-inner">
              <div className="metric-card-icon-row">
                <span className="metric-card-icon">&#128188;</span>
                <h3 className="metric-card-label">Placed {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-card-value">{formatNumber(summary.placed)}</div>
              <div className="metric-card-footer">
                <span className="metric-card-dot" />
                <span className="metric-card-subtitle">Successful outcomes</span>
              </div>
            </div>
          </div>

          <div className="metric-card pls-metric-card--amber">
            <div className="metric-card-inner">
              <div className="metric-card-icon-row">
                <span className="metric-card-icon">&#128200;</span>
                <h3 className="metric-card-label">Placement % {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-card-value">{formatPercentage(summary.placement_percentage)}</div>
              <div className="metric-card-footer">
                <span className="metric-card-dot" />
                <span className="metric-card-subtitle">Success rate</span>
              </div>
            </div>
          </div>

          {!isRestrictedUser && (
            <div className="metric-card pls-metric-card--violet">
              <div className="metric-card-glow" />
              <div className="metric-card-inner">
                <div className="metric-card-icon-row">
                  <span className="metric-card-icon">&#127942;</span>
                  <span className="metric-card-label">Highest {summary.year && `(${summary.year})`}</span>
                </div>
                <div className="metric-card-value">{formatCurrency(summary.highest_package)}</div>
                <div className="metric-card-footer">
                  <span className="metric-card-dot" />
                  <span className="metric-card-subtitle">Top package</span>
                </div>
              </div>
            </div>
          )}

          <div className="metric-card pls-metric-card--sky">
            <div className="metric-card-glow" />
            <div className="metric-card-inner">
              <div className="metric-card-icon-row">
                <span className="metric-card-icon">&#128200;</span>
                <span className="metric-card-label">Average {summary.year && `(${summary.year})`}</span>
              </div>
              <div className="metric-card-value">{formatCurrency(summary.average_package)}</div>
              <div className="metric-card-footer">
                <span className="metric-card-dot" />
                <span className="metric-card-subtitle">Mean package</span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-panel">
          {renderFilterPanel()}

          {viewType === 'placementTrend' && !isRestrictedUser && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Placement Percentage Trend</h2>
                  <p className="chart-description">
                    Evolution of students registered vs placed and the resulting placement percentage.
                  </p>
                </div>
                <ExportMenu
                  elementId="placement-trend-container"
                  data={placementTrendChartData}
                  headers={['Year', 'Registered', 'Placed', 'Placement %']}
                  keys={['year', 'registered', 'placed', 'percentage']}
                  filename="placement_trend"
                  title="Placement Trend Overview"
                />
              </div>

              <div
                id="placement-trend-container"
                className={`chart-container pls-chart-area ${!placementTrendChartData.length ? 'chart-has-empty' : ''}`}
              >
                <div className={`section-empty-state ${placementTrendChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>

                <div className="mode-toggle-row">
                  {['bar', 'trend'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTrendChartMode(mode)}
                      className={`chart-toggle-btn${trendChartMode === mode ? ' plc-trend-active' : ''}`}
                    >
                      {mode === 'bar' ? 'Bar' : 'Trend'}
                    </button>
                  ))}
                </div>

                {trendChartMode === 'bar' ? (
                  <div
                    className="clickable-chart"
                    onClick={() => setExpandedChart({
                      title: "Placement Trends",
                      content: (
                        <ResponsiveContainer width="100%" height={450}>
                          <BarChart data={placementTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                            <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                            <Bar dataKey="registered" name="Registered" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="placed" name="Placed" fill="#22c55e" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    })}
                  >
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                      <BarChart data={placementTrendChartData} margin={{ top: 26, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} iconType="rect" />
                        <Bar dataKey="registered" name="Registered" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16}>
                          <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                        </Bar>
                        <Bar dataKey="placed" name="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16}>
                          <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                    <LineChart data={placementTrendChartData} margin={{ top: 26, right: 20, left: 40, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="linear" dataKey="percentage" name="Placement %" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }}>
                        <LabelList dataKey="percentage" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#38bdf8" }} />
                      </Line>
                      <Line type="linear" dataKey="placed" name="Placed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }}>
                        <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                      </Line>
                      <Line type="linear" dataKey="registered" name="Registered" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }}>
                        <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                )}

                <div className="stat-summary-box">
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-indigo">{placementTrendChartData.reduce((sum, item) => sum + item.registered, 0)}</div>
                    <div className="stat-summary-label">Total Registered</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-green">{placementTrendChartData.reduce((sum, item) => sum + item.placed, 0)}</div>
                    <div className="stat-summary-label">Total Placed</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-sky">{placementTrendChartData.length}</div>
                    <div className="stat-summary-label">Years Covered</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewType === 'genderWise' && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="section-header-left">
                  <h2>Gender Breakdown</h2>
                  <p className="chart-description">Comparison of placement metrics across genders.</p>
                </div>
                <ExportMenu
                  elementId="placement-gender-container"
                  data={genderBarData}
                  headers={['Gender', 'Registered', 'Placed']}
                  keys={['gender', 'registered', 'placed']}
                  filename="placement_gender_breakdown"
                  title="Gender-wise Placement Status"
                />
              </div>
              <div
                id="placement-gender-container"
                className={`chart-container clickable-chart pls-chart-area ${!genderBarData.length ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Gender Breakdown",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={genderBarData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="gender" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="rect" />
                        <Bar dataKey="registered" name="Registered" fill={GENDER_COLORS[0]} radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="registered" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: GENDER_COLORS[0] }} />
                        </Bar>
                        <Bar dataKey="placed" name="Placed" fill={GENDER_COLORS[1]} radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="placed" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: GENDER_COLORS[1] }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                <div className={`section-empty-state ${genderBarData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                  <BarChart data={genderBarData} margin={{ top: 26, right: 10, left: chartIsMobile ? 0 : 40, bottom: 30 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="gender" stroke="#666" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} iconType="rect" />
                    <Bar dataKey="registered" name="Registered" fill={GENDER_COLORS[0]} radius={[4, 4, 0, 0]} barSize={32}>
                      <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GENDER_COLORS[0] }} />
                    </Bar>
                    <Bar dataKey="placed" name="Placed" fill={GENDER_COLORS[1]} radius={[4, 4, 0, 0]} barSize={32}>
                      <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GENDER_COLORS[1] }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="stat-summary-box">
                  {genderBarData.map((item, index) => (
                    <div key={item.gender} className="stat-summary-item">
                      <div className="metric-value-sm" style={{ color: GENDER_COLORS[index % GENDER_COLORS.length] }}>
                        {item.registered} / {item.placed}
                      </div>
                      <div className="stat-summary-label">{item.gender} (Reg/Placed)</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewType === 'programWise' && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="section-header-left">
                  <h2>Program-wise Status</h2>
                  <p className="chart-description">Placement performance across different academic programs.</p>
                </div>
                <ExportMenu
                  elementId="placement-program-container"
                  data={programStatusChartData}
                  headers={['Program', 'Registered', 'Placed', 'Percentage']}
                  keys={['program', 'registered', 'placed', 'percentage']}
                  filename="placement_program_status"
                  title="Program-wise Placement Performance"
                />
              </div>
              <div
                id="placement-program-container"
                className={`chart-container clickable-chart pls-chart-area ${!programStatusChartData.length ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Program-wise Status",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={programStatusChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="program" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="registered" name="Registered" fill="#6366f1" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="registered" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#6366f1" }} />
                        </Bar>
                        <Bar dataKey="placed" name="Placed" fill="#22c55e" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="placed" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#22c55e" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                <div className={`section-empty-state ${programStatusChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                  <BarChart data={programStatusChartData} margin={{ top: 26, right: 10, left: chartIsMobile ? 0 : 40, bottom: chartIsMobile ? 60 : 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="program" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip denominatorKey="registered" excludePercentageFor={['Registered']} />} />
                    <Bar dataKey="registered" name="Registered" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                    </Bar>
                    <Bar dataKey="placed" name="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="stat-summary-box">
                  {programStatusChartData.map((item) => (
                    <div key={item.program} className="stat-summary-item">
                      <div className="metric-value-sm plc-color-indigo">{formatPercentage(item.percentage)}</div>
                      <div className="stat-summary-label">{item.program}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewType === 'recruiters' && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="section-header-left">
                  <h2>Recruiter Statistics</h2>
                  <p className="chart-description">Yearly trends of companies visiting and offers made.</p>
                </div>
                <ExportMenu
                  elementId="placement-recruiters-container"
                  data={recruiterChartData}
                  headers={['Year', 'Companies', 'Offers']}
                  keys={['year', 'companies', 'offers']}
                  filename="placement_recruiters_stats"
                  title="Recruiter Statistics"
                />
              </div>
              <div
                id="placement-recruiters-container"
                className={`chart-container clickable-chart pls-chart-area ${!recruiterChartData.length ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Recruiter Statistics",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={recruiterChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="companies" name="Companies" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="companies" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#f59e0b" }} />
                        </Bar>
                        <Bar dataKey="offers" name="Offers" fill="#38bdf8" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="offers" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#38bdf8" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                <div className={`section-empty-state ${recruiterChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                  <BarChart data={recruiterChartData} margin={{ top: 26, right: 10, left: chartIsMobile ? 0 : 40, bottom: chartIsMobile ? 60 : 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                    <Bar dataKey="companies" name="Companies" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="companies" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#f59e0b" }} />
                    </Bar>
                    <Bar dataKey="offers" name="Offers" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="offers" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#38bdf8" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="stat-summary-box">
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-amber">{recruiterChartData.reduce((s, i) => s + i.companies, 0)}</div>
                    <div className="stat-summary-label">Total Companies</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-sky">{recruiterChartData.reduce((s, i) => s + i.offers, 0)}</div>
                    <div className="stat-summary-label">Total Offers</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-indigo">{recruiterChartData.length}</div>
                    <div className="stat-summary-label">Years Active</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewType === 'sectorWise' && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Sector-wise Company Split</h2>
                  <p className="chart-description">Distribution of visiting recruiters by industry sector (Top 5 sectors shown).</p>
                </div>
                <ExportMenu
                  elementId="placement-sector-pie-container"
                  data={sectorPieData}
                  headers={['Sector', 'Companies', 'Offers']}
                  keys={['sector', 'companies', 'offers']}
                  filename="placement_sector_distribution"
                  title="Sector-wise Company Split"
                />
              </div>
              <div id="placement-sector-pie-container" className={`chart-container pls-chart-area--no-pad ${!sectorPieData.length ? 'chart-has-empty' : ''}`}>
                <div className={`section-empty-state ${sectorPieData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                {(() => {
                  const top5 = [...sectorPieData].sort((a, b) => b.companies - a.companies).slice(0, 5);
                  const otherTotal = sectorPieData.slice(5).reduce((s, i) => s + i.companies, 0);
                  const pieData = [...top5];
                  if (otherTotal > 0) pieData.push({ sector: 'Others', companies: otherTotal, offers: otherTotal });
                  return (
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 260 : 350}>
                      <PieChart>
                        <Pie data={pieData} dataKey="companies" nameKey="sector" cx="50%" cy="50%" outerRadius={chartIsMobile ? 80 : 120} label={!chartIsMobile ? ({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%` : false} labelLine={false}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.sector} fill={index < SECTOR_COLORS.length ? SECTOR_COLORS[index % SECTOR_COLORS.length] : '#a0a0a0'} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
                <div className="stat-summary-box">
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-dark-indigo">{sectorPieData.length}</div>
                    <div className="stat-summary-label">Total Sectors</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-green">{sectorPieData.reduce((s, i) => s + i.companies, 0)}</div>
                    <div className="stat-summary-label">Total Companies</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-orange">{sectorPieData.reduce((s, i) => s + i.offers, 0)}</div>
                    <div className="stat-summary-label">Total Offers</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewType === 'packageTrend' && !isRestrictedUser && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="section-header-left">
                  <h2>Salary Package Trends</h2>
                  <p className="chart-description">Evolution of average, highest, and lowest salary packages.</p>
                </div>
                <ExportMenu
                  elementId="placement-packages-container"
                  data={packageTrendChartData}
                  headers={['Year', 'Highest', 'Lowest', 'Average']}
                  keys={['year', 'highest', 'lowest', 'average']}
                  filename="placement_package_trends"
                  title="Salary Package Trends (LPA)"
                />
              </div>
              <div
                id="placement-packages-container"
                className={`chart-container clickable-chart pls-chart-area ${!packageTrendChartData.length ? 'chart-has-empty' : ''}`}
                onClick={() => setExpandedChart({
                  title: "Salary Package Trends",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={packageTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} label={{ value: 'LPA', angle: -90, position: 'insideLeft', offset: -25, style: { fill: '#555', fontSize: 14, fontWeight: 600 } }} />
                        <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="linear" dataKey="average" name="Average Package" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="linear" dataKey="highest" name="Highest Package" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
                        <Line type="linear" dataKey="lowest" name="Lowest Package" stroke="#ef4444" strokeWidth={3} dot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                <div className={`section-empty-state ${packageTrendChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
                  <LineChart data={packageTrendChartData} margin={{ top: 26, right: 10, left: chartIsMobile ? 0 : 50, bottom: chartIsMobile ? 60 : 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                    <Line type="linear" dataKey="average" name="Average Package" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false}>
                      <LabelList offset={5} dataKey="average" position="top" formatter={(value) => value?.toFixed(2)} style={{ fontSize: '10px', fontWeight: 600, fill: "#10b981" }} />
                    </Line>
                    <Line type="linear" dataKey="highest" name="Highest Package" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}>
                      <LabelList offset={5} dataKey="highest" position="top" formatter={(value) => value?.toFixed(2)} style={{ fontSize: '10px', fontWeight: 600, fill: "#3b82f6" }} />
                    </Line>
                    <Line type="linear" dataKey="lowest" name="Lowest Package" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}>
                      <LabelList offset={5} dataKey="lowest" position="top" formatter={(value) => value?.toFixed(2)} style={{ fontSize: '10px', fontWeight: 600, fill: "#ef4444" }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
                <div className="stat-summary-box">
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-emerald">{formatCurrency(summary.average_package)}</div>
                    <div className="stat-summary-label">Overall Average</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-blue">{formatCurrency(summary.highest_package)}</div>
                    <div className="stat-summary-label">Overall Highest</div>
                  </div>
                  <div className="stat-summary-item">
                    <div className="metric-value-sm plc-color-red">{formatCurrency(summary.lowest_package)}</div>
                    <div className="stat-summary-label">Overall Lowest</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewType === 'topRecruiters' && !isRestrictedUser && (
            <div className="chart-section">
              <div className="chart-title-row">
                <div className="chart-header">
                  <h2>Top Recruiters</h2>
                  <p className="chart-description">Highlights of visiting recruiters, their sectors, and offer volume.</p>
                </div>
                <ExportMenu
                  elementId="placement-top-recruiters-table"
                  data={topRecruiters}
                  headers={['Year', 'Company Name', 'Sector', 'Offers', 'Hires']}
                  keys={['year', 'company_name', 'sector', 'offers', 'hires']}
                  filename="placement_top_recruiters"
                  title="Top Recruiters"
                  exportType="table"
                />
              </div>
              <div id="placement-top-recruiters-table">
                {chartIsMobile ? (
                  <div className="faculty-card-list">
                    {topRecruiters.map((row) => (
                      <div key={`${row.year}-${row.company_name}`} className="faculty-card">
                        <div className="recruiter-card-header">
                          <div>
                            <div className="recruiter-card-year">{row.year}</div>
                            <div className="recruiter-card-company">{row.company_name}</div>
                          </div>
                          {row.sector && <span className="sector-badge">{row.sector}</span>}
                        </div>
                        <div className="recruiter-card-stats">
                          <div className="recruiter-card-stat">
                            <div className="recruiter-stat-label">Offers</div>
                            <div className="recruiter-stat-offers">{formatNumber(row.offers)}</div>
                          </div>
                          <div className="recruiter-card-stat">
                            <div className="recruiter-stat-label">Hires</div>
                            <div className="recruiter-stat-hires">{formatNumber(row.hires)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!topRecruiters.length && (
                      <div className="recruiter-no-data">
                        No information available for the selected filter
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="drilldown-table-wrap pls-tr-table-wrap">
                    <table className="data-table pls-tr-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Company</th>
                          <th>Sector</th>
                          <th>Offers</th>
                          <th>Hires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topRecruiters.map((row, index) => (
                          <tr key={`${row.year}-${row.company_name}`} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                            <td>{row.year}</td>
                            <td className="pls-td-strong">{row.company_name}</td>
                            <td>
                              {row.sector && (
                                <span className="sector-badge sector-badge--indigo">{row.sector}</span>
                              )}
                            </td>
                            <td>{formatNumber(row.offers)}</td>
                            <td>{formatNumber(row.hires)}</td>
                          </tr>
                        ))}
                        {!topRecruiters.length && (
                          <tr>
                            <td colSpan={6} className="pls-td-empty">
                              No information available for the selected filter
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {topRecruiters.length > 0 && (
                  <div className="stat-summary-box">
                    <div className="stat-summary-item">
                      <div className="metric-value-sm plc-color-violet">{topRecruiters.length}</div>
                      <div className="stat-summary-label">Total Entries</div>
                    </div>
                    <div className="stat-summary-item">
                      <div className="metric-value-sm plc-color-amber">{new Set(topRecruiters.map(r => r.company_name)).size}</div>
                      <div className="stat-summary-label">Unique Companies</div>
                    </div>
                    <div className="stat-summary-item">
                      <div className="metric-value-sm plc-color-green">{topRecruiters.reduce((s, r) => s + (r.offers || 0), 0)}</div>
                      <div className="stat-summary-label">Total Offers</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="cdc-promo">
          <div>
            <h3>Explore Career Development Center of IIT Palakkad</h3>
            <p>Empowering students for successful careers through training, internships, and placements at Career Development Centre IIT Palakkad</p>
          </div>
          <a
            href="https://cdc.iitpkd.ac.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="cdc-promo-link"
          >
            Visit &#8594; cdc.iitpkd.ac.in
          </a>
        </div>

      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
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
  );
}

export default PlacementSection;
