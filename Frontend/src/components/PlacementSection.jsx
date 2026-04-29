import { useEffect, useMemo, useState } from 'react';
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
import { CustomTooltip } from '../utils/chartUtils';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import DataUploadModal from './DataUploadModal';

const GENDER_COLORS = ['#6366f1', '#ec4899', '#f97316'];
const SECTOR_COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#a855f7', '#facc15', '#fb7185', '#14b8a6'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCurrency = (value) => {
  if (value === null || value === undefined) {
    return '–';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric) || numeric === 0) {
    return '–';
  }
  return `${numeric.toFixed(2)} LPA`;
};

const formatPercentage = (value) => {
  if (value === null || value === undefined) {
    return '0%';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '0%';
  }
  return `${numeric.toFixed(2)}%`;
};

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

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('placementTrend');

  // Bar / Trend chart mode for Placement Trend
  const [trendChartMode, setTrendChartMode] = useState('bar');

  // Independent filter states for each view
  const [trendFilters, setTrendFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [genderFilters, setGenderFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [programFilters, setProgramFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [recruitersFilters, setRecruitersFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [sectorFilters, setSectorFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [packageFilters, setPackageFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [topRecruitersFilters, setTopRecruitersFilters] = useState({
    year: 'All',
    program: 'All',
    gender: 'All',
    sector: 'All'
  });

  const [summary, setSummary] = useState({
    registered: 0,
    placed: 0,
    placement_percentage: 0,
    highest_package: null,
    lowest_package: null,
    average_package: null
  });

  const [trendData, setTrendData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [programStatus, setProgramStatus] = useState([]);
  const [recruiterStats, setRecruiterStats] = useState([]);
  const [sectorDistribution, setSectorDistribution] = useState([]);
  const [packageTrend, setPackageTrend] = useState([]);
  const [topRecruiters, setTopRecruiters] = useState([]);

  const [loading, setLoading] = useState({
    trend: false,
    gender: false,
    program: false,
    recruiters: false,
    sector: false,
    package: false,
    topRecruiters: false
  });
  const [error, setError] = useState(null);

  const latestYear = useMemo(() => {
    if (!filterOptions.years || filterOptions.years.length === 0) return null;
    return [...filterOptions.years].sort((a, b) => {
      const yearA = parseInt(a.split('-')[0]);
      const yearB = parseInt(b.split('-')[0]);
      return yearB - yearA;
    })[0];
  }, [filterOptions.years]);

  const token = localStorage.getItem('authToken');

  // Get current filters based on view type
  const getCurrentFilters = () => {
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
  };

  // Handle filter change for current view
  const handleFilterChange = (field, value) => {
    switch (viewType) {
      case 'placementTrend':
        setTrendFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'genderWise':
        setGenderFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'programWise':
        setProgramFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'recruiters':
        setRecruitersFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'sectorWise':
        setSectorFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'packageTrend':
        setPackageFilters(prev => ({ ...prev, [field]: value }));
        break;
      case 'topRecruiters':
        setTopRecruitersFilters(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  // Clear filters for current view
  const handleClearFilters = () => {
    const defaultFilters = {
      year: 'All',
      program: 'All',
      gender: 'All',
      sector: 'All'
    };

    switch (viewType) {
      case 'placementTrend':
        setTrendFilters(defaultFilters);
        break;
      case 'genderWise':
        setGenderFilters(defaultFilters);
        break;
      case 'programWise':
        setProgramFilters(defaultFilters);
        break;
      case 'recruiters':
        setRecruitersFilters(defaultFilters);
        break;
      case 'sectorWise':
        setSectorFilters(defaultFilters);
        break;
      case 'packageTrend':
        setPackageFilters(defaultFilters);
        break;
      case 'topRecruiters':
        setTopRecruitersFilters(defaultFilters);
        break;
    }
  };

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      try {
        const options = await fetchPlacementFilterOptions(token);
        const rawGenders = Array.isArray(options?.genders) ? options.genders : [];
        setFilterOptions({
          years: Array.isArray(options?.years) ? options.years : [],
          programs: Array.isArray(options?.programs) ? options.programs : [],
          genders: rawGenders.length > 0 ? rawGenders : ['Male', 'Female', 'Transgender'],
          sectors: Array.isArray(options?.sectors) ? options.sectors : []
        });
      } catch (err) {
        console.error('Failed to fetch placement filter options:', err);
        setError(err.message || 'Failed to load placement filter options.');
      }
    };

    loadFilterOptions();
  }, [token, uploadVersion]);

  // Load placement trend data
  useEffect(() => {
    const loadTrendData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, trend: true }));
        setError(null);

        const summaryFilters = { ...trendFilters };
        if (summaryFilters.year === 'All' && latestYear) {
          summaryFilters.year = latestYear;
        }

        const [summaryResp, trendResp] = await Promise.all([
          fetchPlacementSummary(summaryFilters, token),
          fetchPlacementTrend(trendFilters, token)
        ]);

        setSummary(summaryResp?.data || {
          registered: 0,
          placed: 0,
          placement_percentage: 0,
          highest_package: null,
          lowest_package: null,
          average_package: null
        });
        setTrendData(trendResp?.data || []);
      } catch (err) {
        console.error('Failed to load trend data:', err);
        setError(err.message || 'Failed to load placement statistics.');
      } finally {
        setLoading(prev => ({ ...prev, trend: false }));
      }
    };

    if (viewType === 'placementTrend') {
      loadTrendData();
    }
  }, [trendFilters, token, viewType, uploadVersion, latestYear]);

  // Load gender data
  useEffect(() => {
    const loadGenderData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, gender: true }));
        setError(null);

        const genderResp = await fetchPlacementGenderBreakdown(genderFilters, token);
        setGenderData(genderResp?.data || []);
      } catch (err) {
        console.error('Failed to load gender data:', err);
        setError(err.message || 'Failed to load gender statistics.');
      } finally {
        setLoading(prev => ({ ...prev, gender: false }));
      }
    };

    if (viewType === 'genderWise') {
      loadGenderData();
    }
  }, [genderFilters, token, viewType, uploadVersion]);

  // Load program data
  useEffect(() => {
    const loadProgramData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, program: true }));
        setError(null);

        const programResp = await fetchPlacementProgramStatus(programFilters, token);
        setProgramStatus(programResp?.data || []);
      } catch (err) {
        console.error('Failed to load program data:', err);
        setError(err.message || 'Failed to load program statistics.');
      } finally {
        setLoading(prev => ({ ...prev, program: false }));
      }
    };

    if (viewType === 'programWise') {
      loadProgramData();
    }
  }, [programFilters, token, viewType, uploadVersion]);

  // Load recruiters data
  useEffect(() => {
    const loadRecruitersData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, recruiters: true }));
        setError(null);

        const recruiterResp = await fetchPlacementRecruiters(recruitersFilters, token);
        setRecruiterStats(recruiterResp?.data || []);
      } catch (err) {
        console.error('Failed to load recruiters data:', err);
        setError(err.message || 'Failed to load recruiters statistics.');
      } finally {
        setLoading(prev => ({ ...prev, recruiters: false }));
      }
    };

    if (viewType === 'recruiters') {
      loadRecruitersData();
    }
  }, [recruitersFilters, token, viewType, uploadVersion]);

  // Load sector data
  useEffect(() => {
    const loadSectorData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, sector: true }));
        setError(null);

        const sectorResp = await fetchPlacementSectorDistribution(sectorFilters, token);
        setSectorDistribution(sectorResp?.data || []);
      } catch (err) {
        console.error('Failed to load sector data:', err);
        setError(err.message || 'Failed to load sector statistics.');
      } finally {
        setLoading(prev => ({ ...prev, sector: false }));
      }
    };

    if (viewType === 'sectorWise') {
      loadSectorData();
    }
  }, [sectorFilters, token, viewType, uploadVersion]);

  // Load package data — passes both program and sector to the service
  useEffect(() => {
    const loadPackageData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, package: true }));
        setError(null);

        const packageResp = await fetchPlacementPackageTrend(packageFilters, token);
        setPackageTrend(packageResp?.data || []);
      } catch (err) {
        console.error('Failed to load package data:', err);
        setError(err.message || 'Failed to load package statistics.');
      } finally {
        setLoading(prev => ({ ...prev, package: false }));
      }
    };

    if (viewType === 'packageTrend') {
      loadPackageData();
    }
  }, [packageFilters, token, viewType, uploadVersion]);

  // Load top recruiters data
  useEffect(() => {
    const loadTopRecruitersData = async () => {
      if (!token) return;
      try {
        setLoading(prev => ({ ...prev, topRecruiters: true }));
        setError(null);

        const topRecruitersResp = await fetchTopRecruiters(topRecruitersFilters, token);
        setTopRecruiters(topRecruitersResp?.data || []);
      } catch (err) {
        console.error('Failed to load top recruiters data:', err);
        setError(err.message || 'Failed to load top recruiters statistics.');
      } finally {
        setLoading(prev => ({ ...prev, topRecruiters: false }));
      }
    };

    if (viewType === 'topRecruiters') {
      loadTopRecruitersData();
    }
  }, [topRecruitersFilters, token, viewType, uploadVersion]);

  const placementTrendChartData = useMemo(() => {
    if (!trendData.length) return [];
    return trendData.map((row) => ({
      year: row.year,
      percentage: row.placement_percentage || 0,
      registered: row.registered || 0,
      placed: row.placed || 0
    }));
  }, [trendData]);

  const genderPieData = useMemo(() => {
    if (!genderData.length) return [];
    return genderData.map((row) => ({
      name: row.gender,
      value: row.placement_percentage || 0,
      registered: row.registered || 0,
      placed: row.placed || 0
    }));
  }, [genderData]);

  const genderBarData = useMemo(() => {
    if (!genderData.length) return [];
    return genderData.map((row) => ({
      gender: row.gender,
      registered: row.registered || 0,
      placed: row.placed || 0,
    }));
  }, [genderData]);

  const programStatusChartData = useMemo(() => {
    if (!programStatus.length) return [];
    return programStatus.map((row) => ({
      program: row.program_category,
      registered: row.registered || 0,
      placed: row.placed || 0,
      percentage: row.placement_percentage || 0
    }));
  }, [programStatus]);

  const recruiterChartData = useMemo(() => {
    if (!recruiterStats.length) return [];
    return recruiterStats.map((row) => ({
      year: row.year,
      companies: row.companies || 0,
      offers: row.offers || 0
    }));
  }, [recruiterStats]);

  const sectorPieData = useMemo(() => {
    if (!sectorDistribution.length) return [];
    return sectorDistribution.map((row) => ({
      sector: row.sector,
      companies: row.companies || 0,
      offers: row.offers || 0
    }));
  }, [sectorDistribution]);

  // Null/zero values are already stripped by the backend, but guard on the
  // frontend too so the chart never renders a 0-value point on the line.
  const packageTrendChartData = useMemo(() => {
    if (!packageTrend.length) return [];
    return packageTrend.map((row) => ({
      year: row.year,
      highest: row.highest && row.highest !== 0 ? row.highest : null,
      lowest: row.lowest && row.lowest !== 0 ? row.lowest : null,
      average: row.average && row.average !== 0 ? row.average : null,
    }));
  }, [packageTrend]);

  // Using shared CustomTooltip from chartUtils

  // Get loading state for current view
  const isLoading = () => {
    switch (viewType) {
      case 'placementTrend': return loading.trend;
      case 'genderWise': return loading.gender;
      case 'programWise': return loading.program;
      case 'recruiters': return loading.recruiters;
      case 'sectorWise': return loading.sector;
      case 'packageTrend': return loading.package;
      case 'topRecruiters': return loading.topRecruiters;
      default: return false;
    }
  };

  // Radio button configurations
  const radioButtons = [
    { id: 'placementTrend', label: 'Placement Trend', color: '#6366f1' },
    { id: 'genderWise', label: 'Gender-wise', color: '#ec4899' },
    { id: 'programWise', label: 'Program-wise', color: '#f97316' },
    { id: 'recruiters', label: 'Recruiters', color: '#f59e0b' },
    { id: 'sectorWise', label: 'Sector-wise', color: '#4f46e5' },
    { id: 'packageTrend', label: 'Package Trends', color: '#10b981' },
    { id: 'topRecruiters', label: 'Top Recruiters', color: '#8b5cf6' }
  ];

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isPublicView && (
          <>
            <button className="page-back-btn" onClick={() => navigate('/education')}>
              ← Back to Education
            </button>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1>Placements & Career Outcomes</h1>
              </div>
              {user && user.role_id === 3 && (
                <div className="page-header-actions">
                  <button className="page-upload-btn" onClick={() => { setActiveUploadTable('placement_summary'); setIsUploadModalOpen(true); }}>
                    <span>📤</span> Upload Summary
                  </button>
                  <button className="page-upload-btn" onClick={() => { setActiveUploadTable('placement_companies'); setIsUploadModalOpen(true); }}>
                    <span>📤</span> Upload Companies
                  </button>
                  <button className="page-upload-btn" onClick={() => { setActiveUploadTable('placement_packages'); setIsUploadModalOpen(true); }}>
                    <span>📤</span> Upload Packages
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {error && <div className="error-message" style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ textDecoration: 'underline', color: '#000', margin: 0, fontSize: '20px' }}>
            Placement Summary {summary.year && `(${summary.year})`}
          </h2>
          <ExportMenu 
            elementId="placement-summary-cards-container"
            data={[summary]}
            headers={['Year', 'Registered', 'Placed', 'Placement %', 'Highest Package', 'Average Package']}
            keys={['year', 'registered', 'placed', 'placement_percentage', 'highest_package', 'average_package']}
            filename={`placement_summary_${summary.year || 'latest'}`}
            title={`Placement Summary - ${summary.year || 'Latest'}`}
          />
        </div>
        {/* Modern Summary Cards */}
        <div id="placement-summary-cards-container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Registered Students Card */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🎓</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Registered {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>
                {formatNumber(summary.registered)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Eligible students</span>
              </div>
            </div>
          </div>

          {/* Placed Students Card */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>💼</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Placed {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>
                {formatNumber(summary.placed)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Successful outcomes</span>
              </div>
            </div>
          </div>

          {/* Placement Percentage Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📈</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Placement % {summary.year && `(${summary.year})`}</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>
                {formatPercentage(summary.placement_percentage)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Success rate</span>
              </div>
            </div>
          </div>

          {/* Highest Package Card */}
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(168, 85, 247, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>🏆</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Highest {summary.year && `(${summary.year})`}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatCurrency(summary.highest_package)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Top package</span>
              </div>
            </div>
          </div>

          {/* Average Package Card */}
          <div style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 20px rgba(14, 165, 233, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '20px', background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>📈</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '500' }}>Average {summary.year && `(${summary.year})`}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {formatCurrency(summary.average_package)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Mean package</span>
              </div>
            </div>
          </div>

        </div>

        {/* Styled Radio Buttons - Outside */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          {radioButtons.map((btn) => (
            <label
              key={btn.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '10px 20px',
                backgroundColor: viewType === btn.id ? btn.color : 'transparent',
                color: viewType === btn.id ? 'white' : '#666',
                borderRadius: '40px',
                transition: 'all 0.3s ease',
                border: `2px solid ${viewType === btn.id ? btn.color : '#e0e0e0'}`,
                boxShadow: viewType === btn.id ? `0 4px 12px ${btn.color}40` : 'none'
              }}
            >
              <input
                type="radio"
                name="viewType"
                value={btn.id}
                checked={viewType === btn.id}
                onChange={(e) => setViewType(e.target.value)}
                style={{
                  accentColor: btn.color,
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                fontWeight: viewType === btn.id ? '600' : '500',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '16px' }}>{btn.icon}</span>
                {btn.label}
              </span>
            </label>
          ))}
        </div>


        {/* Placement Trend View */}
        {viewType === 'placementTrend' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Placement Trend View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Placement Trend</h4>
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Program</label>
                  <select
                    value={trendFilters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Programs</option>
                    {filterOptions.programs.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Gender</label>
                  <select
                    value={trendFilters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Genders</option>
                    {filterOptions.genders.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

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
              {/* Bar / Trend toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['bar', 'trend'].map((mode) => (
                  <button key={mode} onClick={() => setTrendChartMode(mode)} style={{
                    padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: 'none',
                    backgroundColor: trendChartMode === mode ? '#6366f1' : '#f1f5f9',
                    color: trendChartMode === mode ? '#fff' : '#555'
                  }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                ))}
              </div>
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

              {/* Chart Statistics */}
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
                  <div className="metric-value-sm" style={{ color: '#6366f1' }}>
                    {placementTrendChartData.reduce((sum, item) => sum + item.registered, 0)}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Total Registered</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="metric-value-sm" style={{ color: '#22c55e' }}>
                    {placementTrendChartData.reduce((sum, item) => sum + item.placed, 0)}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Total Placed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="metric-value-sm" style={{ color: '#38bdf8' }}>
                    {placementTrendChartData.length}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>Years Covered</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gender-wise Placement View */}
        {viewType === 'genderWise' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Gender-wise View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Gender-wise View</h4>
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
                    value={genderFilters.year}
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Program</label>
                  <select
                    value={genderFilters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Programs</option>
                    {filterOptions.programs.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Gender</label>
                  <select
                    value={genderFilters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Genders</option>
                    {filterOptions.genders.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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

              {/* Gender Statistics */}
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'center',
                gap: '40px',
                flexWrap: 'wrap'
              }}>
                {genderBarData.map((item, index) => (
                  <div key={item.gender} style={{ textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ color: GENDER_COLORS[index % GENDER_COLORS.length], fontWeight: 'bold', fontSize: '20px' }}>
                      {item.registered} / {item.placed}
                    </div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {item.gender} (Reg/Placed)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Program-wise Placement View */}
        {viewType === 'programWise' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Program-wise View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Program-wise View</h4>
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
                    value={programFilters.year}
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Program</label>
                  <select
                    value={programFilters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Programs</option>
                    {filterOptions.programs.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Gender</label>
                  <select
                    value={programFilters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Genders</option>
                    {filterOptions.genders.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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

              {/* Program Statistics */}
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

        {/* Recruiters View */}
        {viewType === 'recruiters' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Recruiters View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Recruiters View</h4>
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

              <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                  <select
                    value={recruitersFilters.year}
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Sector</label>
                  <select
                    value={recruitersFilters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Sectors</option>
                    {filterOptions.sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '24px' }}>{recruiterChartData.reduce((sum, item) => sum + item.companies, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Companies</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '24px' }}>{recruiterChartData.reduce((sum, item) => sum + item.offers, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Offers</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px' }}>{recruiterChartData.length}</div><div style={{ color: '#666', fontSize: '12px' }}>Years Active</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Sector-wise Distribution - Updated with Top 5 Sectors Only */}
        {viewType === 'sectorWise' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Sector-wise View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Sector-wise View</h4>
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

              <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                  <select
                    value={sectorFilters.year}
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Sector</label>
                  <select
                    value={sectorFilters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Sectors</option>
                    {filterOptions.sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="chart-header">
                <h2>Sector-wise Company Split</h2>
                <p className="chart-description">
                  Distribution of visiting recruiters by industry sector (Top 5 sectors shown).
                </p>
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
              {/* Get top 5 sectors for pie chart */}
              {(() => {
                const top5Sectors = [...sectorPieData].sort((a, b) => b.companies - a.companies).slice(0, 5);
                const otherSectors = sectorPieData.slice(5);
                const otherTotal = otherSectors.reduce((sum, s) => sum + s.companies, 0);
                const pieData = [...top5Sectors];
                if (otherTotal > 0) { pieData.push({ sector: 'Others', companies: otherTotal, offers: otherTotal }); }
                return (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={pieData} dataKey="companies" nameKey="sector" cx="50%" cy="50%" outerRadius={120} label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((entry, index) => (<Cell key={entry.sector} fill={index < SECTOR_COLORS.length ? SECTOR_COLORS[index % SECTOR_COLORS.length] : '#a0a0a0'} />))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '24px' }}>{sectorPieData.length}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Sectors</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>{sectorPieData.reduce((sum, item) => sum + item.companies, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Companies</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>{sectorPieData.reduce((sum, item) => sum + item.offers, 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Offers</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Package Trends View */}
        {viewType === 'packageTrend' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Package Trends View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Package Trends</h4>
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
                    value={packageFilters.year}
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Program</label>
                  <select
                    value={packageFilters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Programs</option>
                    {filterOptions.programs.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Sector</label>
                  <select
                    value={packageFilters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Sectors</option>
                    {filterOptions.sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={packageTrendChartData} margin={{ top: 10, right: 20, left: 50, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="linear" dataKey="average" name="Average Package" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false}>
                    <LabelList dataKey="average" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#10b981" }} />
                  </Line>
                  <Line type="linear" dataKey="highest" name="Highest Package" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}>
                    <LabelList dataKey="highest" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#3b82f6" }} />
                  </Line>
                  <Line type="linear" dataKey="lowest" name="Lowest Package" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}>
                    <LabelList dataKey="lowest" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#ef4444" }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(summary.average_package)}</div><div style={{ color: '#666', fontSize: '12px' }}>Overall Average</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(summary.highest_package)}</div><div style={{ color: '#666', fontSize: '12px' }}>Overall Highest</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>{formatCurrency(summary.lowest_package)}</div><div style={{ color: '#666', fontSize: '12px' }}>Overall Lowest</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Top Recruiters View */}
        {viewType === 'topRecruiters' && (
          <div className="chart-section" style={{ marginTop: '0' }}>
            {/* Filters for Top Recruiters View */}
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
                <h4 style={{ margin: '0', color: '#333' }}>Filters for Top Recruiters</h4>
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
                    value={topRecruitersFilters.year}
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
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Program</label>
                  <select
                    value={topRecruitersFilters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Programs</option>
                    {filterOptions.programs.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Sector</label>
                  <select
                    value={topRecruitersFilters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  >
                    <option value="All">All Sectors</option>
                    {filterOptions.sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="chart-header">
                <h2>Top Recruiters</h2>
                <p className="chart-description">
                  Highlights of visiting recruiters, their sectors, and offer volume.
                </p>
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
                          {row.sector && (<span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>{row.sector}</span>)}
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
              </div>

              {/* Recruiter Statistics */}
              {topRecruiters.length > 0 && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: '24px' }}>{topRecruiters.length}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Entries</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '24px' }}>{new Set(topRecruiters.map(r => r.company_name)).size}</div><div style={{ color: '#666', fontSize: '12px' }}>Unique Companies</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>{topRecruiters.reduce((sum, r) => sum + (r.offers || 0), 0)}</div><div style={{ color: '#666', fontSize: '12px' }}>Total Offers</div></div>
                </div>
              )}
            </div>
          </div>
        )}
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