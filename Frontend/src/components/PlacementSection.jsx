import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import DataUploadModal from './LazyDataUploadModal';

const GENDER_COLORS = ['#6366f1', '#ec4899', '#f97316'];
const SECTOR_COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#a855f7', '#facc15', '#fb7185', '#14b8a6'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '–';
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric === 0) return '–';
  return `${numeric.toFixed(2)} LPA`;
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '0%';
  return `${numeric.toFixed(2)}%`;
};

// Which filter fields each view uses
const VIEW_FILTER_FIELDS = {
  placementTrend: ['year', 'program', 'gender'],
  genderWise: ['year', 'program', 'gender'],
  programWise: ['year', 'program', 'gender'],
  recruiters: ['year', 'sector'],
  sectorWise: ['year', 'sector'],
  packageTrend: ['year', 'program', 'sector'],
  topRecruiters: ['year', 'program', 'sector'],
};

const DEFAULT_FILTERS = { year: 'All', program: 'All', gender: 'All', sector: 'All' };

function PlacementSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [filterOptions, setFilterOptions] = useState({
    years: [],
    programs: [],
    genders: [],
    sectors: []
  });

  const [viewType, setViewType] = useState('placementTrend');
  const [trendChartMode, setTrendChartMode] = useState('bar');

  // One filter state per view
  const [trendFilters, setTrendFilters] = useState({ ...DEFAULT_FILTERS });
  const [genderFilters, setGenderFilters] = useState({ ...DEFAULT_FILTERS });
  const [programFilters, setProgramFilters] = useState({ ...DEFAULT_FILTERS });
  const [recruitersFilters, setRecruitersFilters] = useState({ ...DEFAULT_FILTERS });
  const [sectorFilters, setSectorFilters] = useState({ ...DEFAULT_FILTERS });
  const [packageFilters, setPackageFilters] = useState({ ...DEFAULT_FILTERS });
  const [topRecruitersFilters, setTopRecruitersFilters] = useState({ ...DEFAULT_FILTERS });

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
    trend: false, gender: false, program: false,
    recruiters: false, sector: false, package: false, topRecruiters: false
  });

  const [error, setError] = useState(null);

  const latestYear = useMemo(() => {
    if (!filterOptions.years?.length) return null;
    return [...filterOptions.years].sort((a, b) =>
      parseInt(b.split('-')[0]) - parseInt(a.split('-')[0])
    )[0];
  }, [filterOptions.years]);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  // ── Helpers ──────────────────────────────────────────────────────────────
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

  // ── Filter options ────────────────────────────────────────────────────────
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
          sectors: Array.isArray(options?.sectors) ? options.sectors : []
        });

        // Auto-correct invalid filter selections
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
  }, [serializedFilters, token, uploadVersion, viewType, currentFilters, handleFilterChange]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (viewType !== 'placementTrend') return;
    const load = async () => {
      try {
        setLoading(p => ({ ...p, trend: true }));
        setError(null);
        const summaryFilters = { ...trendFilters };
        if (summaryFilters.year === 'All' && latestYear) summaryFilters.year = latestYear;
        const [summaryResp, trendResp] = await Promise.all([
          fetchPlacementSummary(summaryFilters, token),
          fetchPlacementTrend(trendFilters, token)
        ]);
        setSummary(summaryResp?.data || { registered: 0, placed: 0, placement_percentage: 0, highest_package: null, lowest_package: null, average_package: null });
        setTrendData(trendResp?.data || []);
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError(err.message || 'Failed to load placement statistics.');
      } finally {
        setLoading(p => ({ ...p, trend: false }));
      }
    };
    load();
  }, [trendFilters, token, viewType, uploadVersion, latestYear]);

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
  }, [packageFilters, token, viewType, uploadVersion]);

  useEffect(() => {
    if (viewType !== 'topRecruiters') return;
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
  }, [topRecruitersFilters, token, viewType, uploadVersion]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const placementTrendChartData = useMemo(() =>
    trendData.map(row => ({
      year: row.year,
      percentage: row.placement_percentage || 0,
      registered: row.registered || 0,
      placed: row.placed || 0
    })), [trendData]);

  const genderBarData = useMemo(() =>
    genderData.map(row => ({
      gender: row.gender,
      registered: row.registered || 0,
      placed: row.placed || 0
    })), [genderData]);

  const programStatusChartData = useMemo(() =>
    programStatus.map(row => ({
      program: row.program_category,
      registered: row.registered || 0,
      placed: row.placed || 0,
      percentage: row.placement_percentage || 0
    })), [programStatus]);

  const recruiterChartData = useMemo(() =>
    recruiterStats.map(row => ({
      year: row.year,
      companies: row.companies || 0,
      offers: row.offers || 0
    })), [recruiterStats]);

  const sectorPieData = useMemo(() =>
    sectorDistribution.map(row => ({
      sector: row.sector,
      companies: row.companies || 0,
      offers: row.offers || 0
    })), [sectorDistribution]);

  const packageTrendChartData = useMemo(() =>
    packageTrend.map(row => ({
      year: row.year,
      highest: row.highest && row.highest !== 0 ? row.highest : null,
      lowest: row.lowest && row.lowest !== 0 ? row.lowest : null,
      average: row.average && row.average !== 0 ? row.average : null,
    })), [packageTrend]);

  // ── Radio buttons config ──────────────────────────────────────────────────
  const radioButtons = [
    { id: 'placementTrend', label: 'Placement Trend', color: '#6366f1' },
    { id: 'genderWise', label: 'Gender-wise', color: '#ec4899' },
    { id: 'programWise', label: 'Program-wise', color: '#f97316' },
    { id: 'recruiters', label: 'Recruiters', color: '#f59e0b' },
    { id: 'sectorWise', label: 'Sector-wise', color: '#4f46e5' },
    { id: 'packageTrend', label: 'Package Trends', color: '#10b981' },
    { id: 'topRecruiters', label: 'Top Recruiters', color: '#8b5cf6' },
  ];

  // ── Unified filter panel (dynamic fields) ────────────────────────────────
  const activeFields = VIEW_FILTER_FIELDS[viewType] || [];

  const renderFilterPanel = () => (
    <div style={{
      marginBottom: '10px',
      padding: '16px 20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '10px',
      border: '1px solid #e9ecef'
    }}>
      {/* Heading row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px'
      }}>
        <h4 style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: '700' }}>
          🔍 Filters
        </h4>
        <button
          onClick={handleClearFilters}
          style={{
            padding: '5px 12px',
            backgroundColor: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Radio buttons */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: activeFields.length ? '16px' : '0',
        paddingBottom: activeFields.length ? '16px' : '0',
        borderBottom: activeFields.length ? '1px solid #dee2e6' : 'none'
      }}>
        {radioButtons.map((btn) => (
          <label
            key={btn.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '7px 16px',
              backgroundColor: viewType === btn.id ? btn.color : 'transparent',
              color: viewType === btn.id ? 'white' : '#555',
              borderRadius: '40px',
              transition: 'all 0.25s ease',
              border: `2px solid ${viewType === btn.id ? btn.color : '#d1d5db'}`,
              boxShadow: viewType === btn.id ? `0 3px 10px ${btn.color}40` : 'none',
              userSelect: 'none'
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

      {/* Dynamic filter fields */}
      {activeFields.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${activeFields.length}, 1fr)`,
          gap: '12px'
        }}>
          {activeFields.includes('year') && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Year</label>
              <select
                value={currentFilters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
              >
                <option value="All">All Years</option>
                {filterOptions.years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('program') && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Program</label>
              <select
                value={currentFilters.program}
                onChange={(e) => handleFilterChange('program', e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
              >
                <option value="All">All Programs</option>
                {filterOptions.programs.map((program) => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('gender') && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Gender</label>
              <select
                value={currentFilters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
              >
                <option value="All">All Genders</option>
                {filterOptions.genders.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>
          )}

          {activeFields.includes('sector') && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>Sector</label>
              <select
                value={currentFilters.sector}
                onChange={(e) => handleFilterChange('sector', e.target.value)}
                style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>

        {!isReadOnlyView && (
          <button
            className="page-back-btn"
            onClick={() => navigate('/education')}
          >
            ← Back to Education
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Placements & Career Outcomes</h1>
            </div>

            {!isReadOnlyView && isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => {
                    setActiveUploadTable('placement_summary');
                    setIsUploadModalOpen(true);
                  }}
                >
                  <span>📤</span> Upload Summary
                </button>

                <button
                  className="page-upload-btn"
                  onClick={() => {
                    setActiveUploadTable('placement_companies');
                    setIsUploadModalOpen(true);
                  }}
                >
                  <span>📤</span> Upload Companies
                </button>

                <button
                  className="page-upload-btn"
                  onClick={() => {
                    setActiveUploadTable('placement_packages');
                    setIsUploadModalOpen(true);
                  }}
                >
                  <span>📤</span> Upload Packages
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', }}>
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
          <ExportMenu
            elementId="placement-summary-cards-container"
            data={[summary]}
            headers={['Year', 'Registered', 'Placed', 'Placement %', 'Highest Package', 'Average Package']}
            keys={['year', 'registered', 'placed', 'placement_percentage', 'highest_package', 'average_package']}
            filename={`placement_summary_${summary.year || 'latest'}`}
            title={`Placement Summary - ${summary.year || 'Latest'}`}
          />
        </div>

        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<div id="placement-summary-cards-container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Registered */}
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(99,102,241,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🎓</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Registered {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{formatNumber(summary.registered)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Eligible students</span>
              </div>
            </div>
          </div>

          {/* Placed */}
          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(16,185,129,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>💼</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Placed {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{formatNumber(summary.placed)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Successful outcomes</span>
              </div>
            </div>
          </div>

          {/* Placement % */}
          <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(245,158,11,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📈</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Placement % {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{formatPercentage(summary.placement_percentage)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Success rate</span>
              </div>
            </div>
          </div>

          {/* Highest Package */}
          <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 20px rgba(168,85,247,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>🏆</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Highest {summary.year && `(${summary.year})`}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{formatCurrency(summary.highest_package)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Top package</span>
              </div>
            </div>
          </div>

          {/* Average Package */}
          <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 20px rgba(14,165,233,0.2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>📈</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Average {summary.year && `(${summary.year})`}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{formatCurrency(summary.average_package)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Mean package</span>
              </div>
            </div>
          </div>
        </div>
)}</>

        {/* ── Unified Filter + Chart Container ── */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '24px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }}>

          {renderFilterPanel()}

          {/* ── Chart Views ── */}

          {/* Placement Trend */}
          {viewType === 'placementTrend' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="chart-header">
                  <h2>Placement Percentage Trend</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
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

              <div id="placement-trend-container" className={`chart-container ${!placementTrendChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${placementTrendChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['bar', 'trend'].map((mode) => (
                    <button key={mode} onClick={() => setTrendChartMode(mode)} style={{
                      padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: 'none',
                      backgroundColor: trendChartMode === mode ? '#6366f1' : '#f1f5f9',
                      color: trendChartMode === mode ? '#fff' : '#555'
                    }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                  ))}
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                  {trendChartMode === 'bar' ? (
                    <BarChart data={placementTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconType="rect" />
                      <Bar dataKey="registered" name="Registered" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16}>
                        <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                      </Bar>
                      <Bar dataKey="placed" name="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16}>
                        <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={placementTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
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
                  )}
                </ResponsiveContainer>
)}</>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="metric-value-sm" style={{ color: '#6366f1' }}>{placementTrendChartData.reduce((sum, item) => sum + item.registered, 0)}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Registered</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="metric-value-sm" style={{ color: '#22c55e' }}>{placementTrendChartData.reduce((sum, item) => sum + item.placed, 0)}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Total Placed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="metric-value-sm" style={{ color: '#38bdf8' }}>{placementTrendChartData.length}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>Years Covered</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gender-wise */}
          {viewType === 'genderWise' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
                <div className="section-header-left">
                  <h2>Gender Breakdown</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Comparison of placement metrics across genders.</p>
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
              <div id="placement-gender-container" className={`chart-container ${!genderBarData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${genderBarData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                  <BarChart data={genderBarData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="gender" stroke="#666" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} iconType="rect" />
                    <Bar dataKey="registered" name="Registered" fill={GENDER_COLORS[0]} radius={[4, 4, 0, 0]} barSize={32}>
                      <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GENDER_COLORS[0] }} />
                    </Bar>
                    <Bar dataKey="placed" name="Placed" fill={GENDER_COLORS[1]} radius={[4, 4, 0, 0]} barSize={32}>
                      <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GENDER_COLORS[1] }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
)}</>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
                  {genderBarData.map((item, index) => (
                    <div key={item.gender} style={{ textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ color: GENDER_COLORS[index % GENDER_COLORS.length], fontWeight: 'bold', fontSize: '20px' }}>
                        {item.registered} / {item.placed}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>{item.gender} (Reg/Placed)</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Program-wise */}
          {viewType === 'programWise' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
                <div className="section-header-left">
                  <h2>Program-wise Status</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Placement performance across different academic programs.</p>
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
              <div id="placement-program-container" className={`chart-container ${!programStatusChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${programStatusChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                  <BarChart data={programStatusChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="program" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="registered" name="Registered" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="registered" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#6366f1" }} />
                    </Bar>
                    <Bar dataKey="placed" name="Placed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="placed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
)}</>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px' }}>
                  {programStatusChartData.map((item) => (
                    <div key={item.program} style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '18px' }}>{formatPercentage(item.percentage)}</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>{item.program}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recruiters */}
          {viewType === 'recruiters' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
                <div className="section-header-left">
                  <h2>Recruiter Statistics</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Yearly trends of companies visiting and offers made.</p>
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
              <div id="placement-recruiters-container" className={`chart-container ${!recruiterChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${recruiterChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                  <BarChart data={recruiterChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="companies" name="Companies" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="companies" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#f59e0b" }} />
                    </Bar>
                    <Bar dataKey="offers" name="Offers" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={30}>
                      <LabelList dataKey="offers" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#38bdf8" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
)}</>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '24px' }}>{recruiterChartData.reduce((s, i) => s + i.companies, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Companies</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '24px' }}>{recruiterChartData.reduce((s, i) => s + i.offers, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Offers</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px' }}>{recruiterChartData.length}</div><div style={{ color: '#666', fontSize: '12px' }}>Years Active</div></div>
                </div>
              </div>
            </div>
          )}

          {/* Sector-wise */}
          {viewType === 'sectorWise' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
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
              <div id="placement-sector-pie-container" className={`chart-container ${!sectorPieData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative' }}>
                <div className={`section-empty-state ${sectorPieData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                {(() => {
                  const top5 = [...sectorPieData].sort((a, b) => b.companies - a.companies).slice(0, 5);
                  const otherTotal = sectorPieData.slice(5).reduce((s, i) => s + i.companies, 0);
                  const pieData = [...top5];
                  if (otherTotal > 0) pieData.push({ sector: 'Others', companies: otherTotal, offers: otherTotal });
                  return (
                    <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie data={pieData} dataKey="companies" nameKey="sector" cx="50%" cy="50%" outerRadius={120} label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.sector} fill={index < SECTOR_COLORS.length ? SECTOR_COLORS[index % SECTOR_COLORS.length] : '#a0a0a0'} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
)}</>
                  );
                })()}
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '24px' }}>{sectorPieData.length}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Sectors</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>{sectorPieData.reduce((s, i) => s + i.companies, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Companies</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>{sectorPieData.reduce((s, i) => s + i.offers, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Offers</div></div>
                </div>
              </div>
            </div>
          )}

          {/* Package Trend */}
          {viewType === 'packageTrend' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
                <div className="section-header-left">
                  <h2>Salary Package Trends</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Evolution of average, highest, and lowest salary packages.</p>
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
              <div id="placement-packages-container" className={`chart-container ${!packageTrendChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                <div className={`section-empty-state ${packageTrendChartData.length ? 'hidden' : ''}`}>
                  <p>No information available for the selected filter</p>
                </div>
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                  <LineChart data={packageTrendChartData} margin={{ top: 10, right: 20, left: 50, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
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
)}</>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(summary.average_package)}</div><div style={{ color: '#666', fontSize: '12px' }}>Overall Average</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(summary.highest_package)}</div><div style={{ color: '#666', fontSize: '12px' }}>Overall Highest</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(summary.lowest_package)}</div><div style={{ color: '#666', fontSize: '12px' }}>Overall Lowest</div></div>
                </div>
              </div>
            </div>
          )}

          {/* Top Recruiters */}
          {viewType === 'topRecruiters' && (
            <div className="chart-section" style={{ marginTop: '0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
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
                <div className="table-responsive" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                  <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<table className="grievance-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0', minWidth: '600px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
                        <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#8b5cf6' }}>Year</th>
                        <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#8b5cf6' }}>Company</th>
                        <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#8b5cf6' }}>Sector</th>
                        <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#8b5cf6' }}>Offers</th>
                        <th style={{ padding: '12px', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#8b5cf6' }}>Hires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topRecruiters.map((row, index) => (
                        <tr key={`${row.year}-${row.company_name}`} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{row.year}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '500' }}>{row.company_name}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>
                            {row.sector && (
                              <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                                {row.sector}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{formatNumber(row.offers)}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{formatNumber(row.hires)}</td>
                        </tr>
                      ))}
                      {!topRecruiters.length && (
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
                {topRecruiters.length > 0 && (
                  <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '24px' }}>{topRecruiters.length}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Entries</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '24px' }}>{new Set(topRecruiters.map(r => r.company_name)).size}</div><div style={{ color: '#666', fontSize: '12px' }}>Unique Companies</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>{topRecruiters.reduce((s, r) => s + (r.offers || 0), 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Offers</div></div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>{/* ── end unified filter+chart container ── */}


        <div style={{ marginTop: '32px', background: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%)', borderRadius: '16px', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 10px 30px rgba(241, 229, 196, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span style={{ width:'100px', height: '100px'}}></span>
            <h3 style={{ padding:'0 50px 0 0 ', margin: '0 40px 4px 0', color: '#000000ff', fontSize: '18px', fontWeight: 700 }}>Explore Careere Development Center of IIT Palakkad</h3>
            <p style={{ margin: 0, color: 'rgba(0, 0, 0, 0.85)', fontSize: '13px' }}>Empowering students for successful careers through training, internships, and placements at Career Development Centre IIT Palakkad
</p>
          </div>
        </div>
        <a
          href="https://cdc.iitpkd.ac.in/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', color: '#000000ff', padding: '10px 22px', borderRadius: '50px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
        >
          Visit  → cdc.iitpkd.ac.in
        </a>
      </div>

      </div>


      
      

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </div>
  );
}

export default PlacementSection;