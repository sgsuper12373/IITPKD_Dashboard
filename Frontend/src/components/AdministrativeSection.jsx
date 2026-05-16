import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, LabelList
} from 'recharts';
import {
  fetchFilterOptions, fetchFacultyFilterOptions,
  fetchFacultyExpertiseMatrix, fetchYearwiseStrength, fetchGenderDistribution,
} from '../services/administrativeStats';
import {
  fetchFilterOptions as fetchEduFilterOptions,
  fetchSummary, fetchDepartmentBreakdown, fetchYearTrend,
  fetchTypeDistribution, fetchFacultyEngagementList
} from '../services/educationStats';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import { getOrderedLegend } from '../utils/chartUtils';
import './Page.css';
import './AcademicSection.css';

// ── Constants ──────────────────────────────────────────────────────────────

const BAR_ANIMATION = {
  isAnimationActive: true, animationDuration: 700,
  animationEasing: 'ease-out', animationBegin: 80
};

const GENDER_COLORS = { Male: '#667eea', Female: '#764ba2', Transgender: '#43e97b', Other: '#f093fb' };

// SERIES_META order defines both bar render order AND legend order for Regular section
const SERIES_META = [
  { key: 'Total', color: '#667eea', gradientId: 'colorEmpTotal', label: 'Total' },
  { key: 'Male', color: '#43e97b', gradientId: 'colorEmpMale', label: 'Male' },
  { key: 'Female', color: '#fa709a', gradientId: 'colorEmpFemale', label: 'Female' },
  { key: 'Other', color: '#f093fb', gradientId: 'colorEmpOther', label: 'Transgender' },
];

const REGULAR_VIEWS = [
  { value: 'yearwise', label: 'Yearwise Strength', icon: '📈' },
  { value: 'department', label: 'Faculty Strength', icon: '📊' },
  { value: 'gender', label: 'Gender Ratio', icon: '🥧' },
];

const EDU_VIEWS = [
  { value: 'department', label: '🏢 Department', color: '#22c55e' },
  { value: 'trend', label: '📈 Trend', color: '#f97316' },
  { value: 'distribution', label: '🥧 Distribution', color: '#a855f7' },
  { value: 'details', label: '📋 Details', color: '#0ea5e9' },
];

const NUM_YEARS_OPTIONS = [
  { value: 1, label: 'Last 1 Yr' },
  { value: 2, label: 'Last 2 Yrs' },
  { value: 3, label: 'Last 3 Yrs' },
  { value: 5, label: 'Last 5 Yrs' },
  { value: 10, label: 'Last 10 Yrs' },
];

const CHART_BOX = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
  boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
};

const ENGAGEMENT_COLORS = {
  Adjunct: '#667eea', Honorary: '#764ba2', Visiting: '#f093fb',
  FacultyFellow: '#4facfe', PoP: '#00f2fe'
};

// ✅ FIXED: ENGAGEMENT_CARD_META and EDU_ENGAGEMENT_ORDER MUST match exactly
// This order is: Adjunct → Honorary → Visiting → PoP
const ENGAGEMENT_CARD_META = [
  { type: 'Adjunct', label: 'Adjunct Faculty', icon: '👨‍🏫', grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102,126,234,0.25)' },
  { type: 'Honorary', label: 'Honorary Faculty', icon: '🏅', grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.25)' },
  { type: 'Visiting', label: 'Visiting Faculty', icon: '✈️', grad: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', shadow: 'rgba(34,211,238,0.25)' },
  { type: 'PoP', label: 'Professor of Practice', icon: '🎓', grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.25)' },
];

const ENGAGEMENT_LABELS = { Adjunct: 'Adjunct', Honorary: 'Honorary', Visiting: 'Visiting', PoP: 'PoP' };

// ✅ FIXED: EDU_ENGAGEMENT_ORDER defines STRICT order for bars AND legend
// MUST be: Adjunct → Honorary → Visiting → PoP (matches ENGAGEMENT_CARD_META)
const EDU_ENGAGEMENT_ORDER = ['Adjunct', 'Honorary', 'Visiting', 'PoP'];

const EDU_COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];

const formatNumber = (v) => new Intl.NumberFormat('en-IN').format(Number(v) || 0);

const CURRENT_YEAR = String(new Date().getFullYear());

// chartToggleStyle replaced by .chart-toggle-btn CSS class (see Page.css)

// ── Sub-components ──────────────────────────────────────────────────────────

const CustomXAxisTick = ({ x, y, payload }) => {
  const label = payload.value || '';
  const truncated = label.length > 18 ? label.slice(0, 16) + '…' : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={6} textAnchor="end" fill="#555" fontSize={11}
        fontWeight={500} transform="rotate(-38)">{truncated}</text>
    </g>
  );
};



// Pre-built ordered legend renderers for each chart family
// (Removed unused regularLegendRenderer and eduLegendRenderer)

// ── Main Component ──────────────────────────────────────────────────────────

function AdministrativeSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const token = localStorage.getItem('authToken');

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle, { passive: true });
    return () => window.removeEventListener('resize', handle);
  }, []);

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  // ── Top-level section toggle ──────────────────────────────────────────────
  const [section, setSection] = useState('regular'); // 'regular' | 'education'
  const [expandedChart, setExpandedChart] = useState(null);

  // ══════════════════════════════════════════════════════════════════════════
  // REGULAR EMPLOYEES STATE
  // ══════════════════════════════════════════════════════════════════════════
  const [activeView, setActiveView] = useState('yearwise');
  const [filterOptions, setFilterOptions] = useState({
    department: [], designation: [], gender: [], emp_type: [], group_name: [], appointed_category: [], years: []
  });
  const [facultyFilterOptions, setFacultyFilterOptions] = useState({ department: [], designation: [], group_name: [] });
  const [filters, setFilters] = useState({
    department: null, designation: null, gender: null,
    emp_type: null, group_name: null, appointed_category: null, num_years: 10
  });

  // Per-view year filters for Regular section
  const [regYearYW, setRegYearYW] = useState('All');
  const [regYearFD, setRegYearFD] = useState(CURRENT_YEAR);
  const [regYearGR, setRegYearGR] = useState(CURRENT_YEAR);

  const [expertiseData, setExpertiseData] = useState([]);
  const [expertiseTotal, setExpertiseTotal] = useState(0);
  const [yearwiseData, setYearwiseData] = useState([]);
  const [visibleSeries, setVisibleSeries] = useState(Object.fromEntries(SERIES_META.map(s => [s.key, true])));
  const [genderData, setGenderData] = useState([]);
  const [genderTotal, setGenderTotal] = useState(0);
  const [allYearwise, setAllYearwise] = useState([]);
  const [teachingYearwise, setTeachingYearwise] = useState([]);
  const [nonTeachingYearwise, setNonTeachingYearwise] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [yearwiseChartType, setYearwiseChartType] = useState('Bar');
  const [regError, setRegError] = useState(null);

  // ══════════════════════════════════════════════════════════════════════════
  // EDUCATION (NON-REGULAR) STATE
  // ══════════════════════════════════════════════════════════════════════════
  const [eduView, setEduView] = useState('department');
  const [eduFilterOptions, setEduFilterOptions] = useState({ years: [], current_year: null, departments: [], engagement_types: [] });
  const [eduFilters, setEduFilters] = useState({ year: 'All', department: 'All', engagement_type: 'All' });
  const [eduSummary, setEduSummary] = useState({ summary: [], overall_active: 0 });
  const [eduDepartmentData, setEduDepartmentData] = useState([]);
  const [eduYearTrendData, setEduYearTrendData] = useState([]);
  const [eduTypeDistribution, setEduTypeDistribution] = useState([]);
  const [eduEngagementList, setEduEngagementList] = useState([]);
  const [selectedCardType, setSelectedCardType] = useState(null);
  const [cardDetailsData, setCardDetailsData] = useState([]);
  const [eduError, setEduError] = useState(null);


  // Chart type toggles for Education views
  const [eduDeptChartType, setEduDeptChartType] = useState('Bar');
  const [eduTrendChartType, setEduTrendChartType] = useState('Bar');

  // Education Trend: No. of Years filter (independent of year filter)
  const [eduTrendNumYears, setEduTrendNumYears] = useState(5);

  // ══════════════════════════════════════════════════════════════════════════
  // REGULAR — DATA FETCHING
  // ══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    Promise.all([
      fetchYearwiseStrength({ num_years: 100 }, token),
      fetchYearwiseStrength({ emp_type: 'Teaching', num_years: 100 }, token),
      fetchYearwiseStrength({ emp_type: 'NonTeaching', num_years: 100 }, token),
    ]).then(([rAll, rTeaching, rNonTeaching]) => {
      const data = (r) => r.data || [];
      const allData = data(rAll);
      setAllYearwise(allData);
      setTeachingYearwise(data(rTeaching));
      setNonTeachingYearwise(data(rNonTeaching));
      if (allData.length > 0) setSelectedYear(String(allData[allData.length - 1].year));
    }).catch(() => { });
  }, [token, uploadVersion]);

  // Cascade filter options against the current `filters` state.
  // A short debounce + ignore-stale-response guard avoids flicker when the
  // user clicks through several dropdowns quickly.
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      fetchFilterOptions(token, filters)
        .then(opts => { if (!cancelled) setFilterOptions(opts); })
        .catch(() => { if (!cancelled) setRegError('Failed to load filter options.'); });
    }, 120);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [token, uploadVersion, filters]);

  useEffect(() => {
    if (activeView !== 'department') return;
    let cancelled = false;
    const handle = setTimeout(() => {
      fetchFacultyFilterOptions(token, filters)
        .then(opts => { if (!cancelled) setFacultyFilterOptions(opts); })
        .catch(() => { });
    }, 120);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [token, activeView, uploadVersion, filters]);

  useEffect(() => {
    if (activeView !== 'department') return;
    const fdFilters = { ...filters };
    if (regYearFD) fdFilters.year = regYearFD;
    fetchFacultyExpertiseMatrix(fdFilters, token)
      .then(r => { setExpertiseData(r.data); setExpertiseTotal(r.total); })
      .catch(() => setRegError('Failed to load faculty expertise matrix data.'));
  }, [filters, regYearFD, token, activeView, uploadVersion]);

  useEffect(() => {
    if (activeView !== 'yearwise') return;
    const ywFilters = { ...filters };
    if (regYearYW !== 'All') ywFilters.year = regYearYW;
    fetchYearwiseStrength(ywFilters, token)
      .then(r => {
        const reordered = (r.data || []).map(row => {
          const ordered = { year: row.year };
          SERIES_META.forEach(({ key }) => { ordered[key] = row[key] ?? 0; });
          return ordered;
        });
        setYearwiseData(reordered);
      })
      .catch(() => setRegError('Failed to load yearwise strength data.'));
  }, [filters, regYearYW, token, activeView, uploadVersion]);

  useEffect(() => {
    if (activeView !== 'gender') return;
    const grFilters = { ...filters };
    if (regYearGR) grFilters.year = regYearGR;
    fetchGenderDistribution(grFilters, null, token)
      .then(r => {
        const pie = Object.entries(r.data)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value, fill: GENDER_COLORS[name] || '#ccc' }));
        setGenderData(pie);
        setGenderTotal(r.total);
      })
      .catch(() => setRegError('Failed to load gender distribution data.'));
  }, [filters, regYearGR, token, activeView, uploadVersion]);

  const handleFilterChange = (key, value) => {
    if (key === 'num_years') setFilters(prev => ({ ...prev, [key]: Number(value) }));
    else setFilters(prev => ({ ...prev, [key]: value === 'All' ? null : value }));
  };

  const handleClearFilters = () => {
    setFilters({
      department: null, designation: null, gender: null,
      emp_type: null, group_name: null, appointed_category: null, num_years: 10
    });
    setRegYearYW('All');
    setRegYearFD(CURRENT_YEAR);
    setRegYearGR(CURRENT_YEAR);
  };

  const toggleSeries = (key) => setVisibleSeries(prev => {
    const next = { ...prev, [key]: !prev[key] };
    return Object.values(next).some(Boolean) ? next : prev;
  });

  const hasDeptData = expertiseTotal > 0 && expertiseData.length > 0;

  // ══════════════════════════════════════════════════════════════════════════
  // EDUCATION — DATA FETCHING
  // ══════════════════════════════════════════════════════════════════════════

  const serializedEduFilters = JSON.stringify(eduFilters);
  useEffect(() => {
    let isMounted = true;
    fetchEduFilterOptions(eduFilters, token).then(options => {
      if (!isMounted) return;
      const fetchedYears = Array.isArray(options?.years) ? [...options.years].sort((a, b) => b - a) : [];
      setEduFilterOptions({
        years: fetchedYears,
        current_year: options?.current_year || null,
        departments: Array.isArray(options?.departments) ? options.departments : [],
        engagement_types: Array.isArray(options?.engagement_types) ? options.engagement_types : []
      });
      // Only set default year if currently 'All'
      const defaultYear = options?.current_year
        ? String(options.current_year)
        : fetchedYears.length > 0 ? String(fetchedYears[0]) : 'All';
      setEduFilters(prev => (prev.year === 'All' && !(isReadOnlyView && eduView === 'distribution')) ? { ...prev, year: defaultYear } : prev);
    }).catch(err => setEduError(err.message || 'Failed to load education filter options.'));
    return () => { isMounted = false; };
  }, [serializedEduFilters, token, uploadVersion, eduFilters, eduView, isReadOnlyView]);

  useEffect(() => {
    const loadEduData = async () => {
      try {

        setEduError(null);
        const p = {};
        if (eduFilters.year !== 'All') p.year = eduFilters.year;
        if (eduFilters.department !== 'All') p.department = eduFilters.department;
        if (eduFilters.engagement_type !== 'All') p.engagement_type = eduFilters.engagement_type;

        const trendParams = { ...p };

        const [summaryResp, deptResp, trendResp, typeResp, listResp] = await Promise.all([
          fetchSummary(p, token),
          fetchDepartmentBreakdown(p, token),
          fetchYearTrend(trendParams, token),
          fetchTypeDistribution(p, token),
          fetchFacultyEngagementList(
            selectedCardType ? { ...p, engagement_type: selectedCardType } : p,
            token
          )
        ]);

        setEduSummary({
          summary: Array.isArray(summaryResp?.data?.summary) ? summaryResp.data.summary : [],
          overall_active: summaryResp?.data?.overall_active || 0
        });
        setEduDepartmentData(Array.isArray(deptResp?.data) ? deptResp.data : []);
        setEduYearTrendData(Array.isArray(trendResp?.data) ? trendResp.data : []);
        setEduTypeDistribution(Array.isArray(typeResp?.data) ? typeResp.data : []);
        setEduEngagementList(Array.isArray(listResp?.data) ? listResp.data : []);
      } catch (err) {
        setEduError(err.message || 'Failed to load education data.');
      }
    };
    loadEduData();
  }, [eduFilters, token, eduView, selectedCardType, uploadVersion]);

  useEffect(() => {
    if (!selectedCardType) return;
    const p = {};
    if (eduFilters.year !== 'All') p.year = eduFilters.year;
    if (selectedCardType !== '__all__') p.engagement_type = selectedCardType;
    fetchFacultyEngagementList(p, token)
      .then(r => setCardDetailsData(Array.isArray(r?.data) ? r.data : []))
      .catch(() => { });
  }, [selectedCardType, eduFilters.year, token]);

  const handleEduFilterChange = (field, value) => setEduFilters(prev => ({ ...prev, [field]: value }));
  const handleEduClearFilters = () => {
    const defaultYear = eduFilterOptions.current_year
      ? String(eduFilterOptions.current_year)
      : eduFilterOptions.years.length > 0 ? String(eduFilterOptions.years[0]) : 'All';
    setEduFilters({ year: defaultYear, department: 'All', engagement_type: 'All' });
    setEduTrendNumYears(5);
  };

  // Education derived data
  const eduSummaryCards = useMemo(() =>
    eduSummary.summary.map(item => ({
      type: item.engagement_type, active: Number(item.active) || 0
    })), [eduSummary.summary]);

  // ✅ FIXED: Always include ALL engagement types with zero-value enforcement
  const eduDeptChartData = useMemo(() => {
    if (!eduDepartmentData.length) return [];
    return eduDepartmentData.map(dept => {
      const entry = { department: dept.department || 'Unknown' };
      // Force all keys from EDU_ENGAGEMENT_ORDER to exist (even if 0)
      EDU_ENGAGEMENT_ORDER.forEach(type => {
        entry[type] = Number(dept[`${type}_active`]) || 0;
      });
      entry.total = Number(dept.active) || 0;
      return entry;
    });
  }, [eduDepartmentData]);

  // ✅ FIXED: Always include ALL engagement types with zero-value enforcement
  const eduTrendChartData = useMemo(() => {
    if (!eduYearTrendData.length) return [];
    const mapped = eduYearTrendData.map(entry => {
      const item = { year: entry.year || 'Unknown' };
      // Force all keys from EDU_ENGAGEMENT_ORDER to exist (even if 0)
      EDU_ENGAGEMENT_ORDER.forEach(type => { item[type] = Number(entry[type]) || 0; });
      return item;
    });
    const sorted = [...mapped].sort((a, b) => Number(a.year) - Number(b.year));
    return sorted.slice(-eduTrendNumYears);
  }, [eduYearTrendData, eduTrendNumYears]);

  const eduPieData = useMemo(() =>
    eduTypeDistribution.map(item => ({ name: item.engagement_type, value: Number(item.active) || 0 })),
    [eduTypeDistribution]);

  // ══════════════════════════════════════════════════════════════════════════
  // SHARED STYLES
  // ══════════════════════════════════════════════════════════════════════════

  const labelStyle = {
    fontSize: '12px', fontWeight: '600', color: '#555',
    marginBottom: '4px', display: 'block'
  };

  const selectStyle = {
    padding: '8px', fontSize: '13px', width: '100%',
    borderRadius: '6px', border: '1px solid #ddd', outline: 'none'
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LEGEND KEY ARRAYS (used by getOrderedLegend)
  // ══════════════════════════════════════════════════════════════════════════

  // Regular section: ordered key list locked to SERIES_META order
  const regularSeriesKeys = SERIES_META.map(s => s.key);

  // Education section: ordered key list locked to EDU_ENGAGEMENT_ORDER
  const eduSeriesKeys = [...EDU_ENGAGEMENT_ORDER];

  // ══════════════════════════════════════════════════════════════════════════
  // UNIFIED FILTER BAR
  // ══════════════════════════════════════════════════════════════════════════

  const renderFilterBar = () => {
    const isEdu = section === 'education';
    const regYears = (filterOptions.years || []).map(String);

    return (
      <div style={{
        background: '#f8f9fa', border: '1px solid #e9ecef',
        borderRadius: '12px', padding: '15px', marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>

        {/* ── Header row ── */}
        <div className="filter-panel-header" style={{ marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#333' }}>Dashboard Filters</span>
          <button
            onClick={isEdu ? handleEduClearFilters : handleClearFilters}
            style={{
              padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: 'none',
              cursor: 'pointer', backgroundColor: '#ef4444', color: '#fff', fontWeight: '500'
            }}
          >
            Clear All Filters
          </button>
        </div>

        {/* ── Section Toggle ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[
            { key: 'regular', label: '👥 Regular Employees', color: '#667eea' },
            { key: 'education', label: '🎓 Non-Regular Faculty', color: '#22c55e' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              style={{
                padding: '10px 22px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
                backgroundColor: section === key ? color : '#f1f5f9',
                color: section === key ? 'white' : '#475569',
                boxShadow: section === key ? `0 4px 12px ${color}40` : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── View-type pills ── */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '6px', display: 'block' }}>
            View Type
          </label>
          <div style={{ display: 'flex', gap: '6px', background: '#e9ecef', padding: '6px', borderRadius: '8px', flexWrap: 'wrap' }}>
            {isEdu
              ? EDU_VIEWS.filter(view => !(view.value === 'details' && (typeof user === 'undefined' || user?.role_id === 0)))
                .map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setEduView(value)}
                    style={{
                      flex: 1, padding: '6px 10px', border: 'none', borderRadius: '6px',
                      cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      backgroundColor: eduView === value ? color : 'transparent',
                      color: eduView === value ? 'white' : '#475569',
                    }}
                  >
                    {label}
                  </button>
                ))
              : REGULAR_VIEWS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => { setRegError(null); setActiveView(value); }}
                  style={{
                    padding: '6px 10px', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                    backgroundColor: activeView === value ? '#667eea' : 'transparent',
                    color: activeView === value ? 'white' : '#475569',
                  }}
                >
                  {icon} {label}
                </button>
              ))
            }
          </div>
        </div>

        {/* ── Dimension filters ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>

          {/* ══ REGULAR filters ══ */}

          {!isEdu && activeView === 'yearwise' && (
            <div>
              <label style={labelStyle}>Year</label>
              <select value={regYearYW} onChange={e => setRegYearYW(e.target.value)} style={selectStyle}>
                <option value="All">All Years</option>
                {regYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {!isEdu && activeView === 'department' && (
            <div>
              <label style={labelStyle}>Year</label>
              <select value={regYearFD} onChange={e => setRegYearFD(e.target.value)} style={selectStyle}>
                {regYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {!isEdu && activeView === 'gender' && (
            <div>
              <label style={labelStyle}>Year</label>
              <select value={regYearGR} onChange={e => setRegYearGR(e.target.value)} style={selectStyle}>
                {regYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {!isEdu && ['yearwise', 'gender'].includes(activeView) && (
            <div>
              <label style={labelStyle}>Employee Type</label>
              <select value={filters.emp_type || 'All'}
                onChange={(e) => handleFilterChange('emp_type', e.target.value)} style={selectStyle}>
                <option value="All">All</option>
                {filterOptions.emp_type?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          {!isEdu && ['yearwise', 'department', 'gender'].includes(activeView) && (
            <div>
              <label style={labelStyle}>Department</label>
              <select value={filters.department || 'All'}
                onChange={(e) => handleFilterChange('department', e.target.value)} style={selectStyle}>
                <option value="All">All</option>
                {(activeView === 'department' ? facultyFilterOptions.department : filterOptions.department)?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {!isEdu && ['yearwise', 'department', 'gender'].includes(activeView) && (
            <div>
              <label style={labelStyle}>Designation</label>
              <select value={filters.designation || 'All'}
                onChange={(e) => handleFilterChange('designation', e.target.value)} style={selectStyle}>
                <option value="All">All</option>
                {(activeView === 'department' ? facultyFilterOptions.designation : filterOptions.designation)?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {!isEdu && ['yearwise', 'department'].includes(activeView) && (
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={filters.gender || 'All'}
                onChange={(e) => handleFilterChange('gender', e.target.value)} style={selectStyle}>
                <option value="All">All</option>
                {filterOptions.gender?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          {!isEdu && ['yearwise', 'department', 'gender'].includes(activeView) && (
            <div>
              <label style={labelStyle}>Group</label>
              <select value={filters.group_name || 'All'}
                onChange={(e) => handleFilterChange('group_name', e.target.value)} style={selectStyle}>
                <option value="All">All</option>
                {(activeView === 'department' ? facultyFilterOptions.group_name : filterOptions.group_name)?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}

          {!isEdu && activeView === 'yearwise' && (
            <div>
              <label style={labelStyle}>No. of Years</label>
              <select value={filters.num_years}
                onChange={(e) => handleFilterChange('num_years', e.target.value)} style={selectStyle}>
                {NUM_YEARS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          {/* ══ EDUCATION filters ══ */}

          {isEdu && eduView !== 'trend' && (
            <div>
              <label style={labelStyle}>Year</label>
              <select value={eduFilters.year}
                onChange={(e) => handleEduFilterChange('year', e.target.value)} style={selectStyle}>
                {(!isReadOnlyView || eduView === 'distribution') && <option value="All">All Years</option>}
                {eduFilterOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {isEdu && eduView === 'trend' && (
            <div>
              <label style={labelStyle}>No. of Years</label>
              <select value={eduTrendNumYears}
                onChange={(e) => setEduTrendNumYears(Number(e.target.value))} style={selectStyle}>
                {NUM_YEARS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          {isEdu && eduView !== 'trend' && (
            <div>
              <label style={labelStyle}>Department</label>
              <select value={eduFilters.department}
                onChange={(e) => handleEduFilterChange('department', e.target.value)} style={selectStyle}>
                <option value="All">All Departments</option>
                {eduFilterOptions.departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {isEdu && eduView !== 'distribution' && (
            <div>
              <label style={labelStyle}>Engagement Type</label>
              <select value={eduFilters.engagement_type}
                onChange={(e) => handleEduFilterChange('engagement_type', e.target.value)} style={selectStyle}>
                <option value="All">All Types</option>
                {eduFilterOptions.engagement_types.map(t => (
                  <option key={t} value={t}>{ENGAGEMENT_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SUMMARY CARDS
  // ══════════════════════════════════════════════════════════════════════════

  const renderSummaryCards = () => {
    if (section === 'regular') {
      return (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <ExportMenu
              elementId="admin-summary-cards-container"
              data={[{
                year: selectedYear,
                total: selectedYear === 'All' ? allYearwise.reduce((s, r) => s + (r.Total || 0), 0) : (allYearwise.find(r => String(r.year) === selectedYear)?.Total || 0),
                faculty: selectedYear === 'All' ? teachingYearwise.reduce((s, r) => s + (r.Total || 0), 0) : (teachingYearwise.find(r => String(r.year) === selectedYear)?.Total || 0),
                staff: selectedYear === 'All' ? nonTeachingYearwise.reduce((s, r) => s + (r.Total || 0), 0) : (nonTeachingYearwise.find(r => String(r.year) === selectedYear)?.Total || 0)
              }]}
              headers={['Year', 'Total Employees', 'Faculty', 'Staff']}
              keys={['year', 'total', 'faculty', 'staff']}
              filename="employee_summary"
              title="Employee Summary"
            />
          </div>
          <div id="admin-summary-cards-container" className="grid-4" style={{ gap: '20px', marginBottom: '30px' }}>
            {/* Year picker card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px', padding: '24px', boxShadow: '0 10px 20px rgba(102,126,234,0.3)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📅</span>
                  <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>Filter by Year</span>
                </div>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)',
                  color: 'white', fontSize: '14px', fontWeight: '500', cursor: 'pointer', outline: 'none'
                }}>
                  <option value="All" style={{ color: '#333', background: '#fff' }}>All Years</option>
                  {(filterOptions.years || []).map(yr => (
                    <option key={yr} value={String(yr)} style={{ color: '#333', background: '#fff' }}>{yr}</option>
                  ))}
                </select>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>Focus on a specific year</p>
              </div>
            </div>

            {[
              { label: 'Total Employees', icon: '👥', data: allYearwise, grad: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', shadow: 'rgba(34,211,238,0.2)' },
              { label: 'Faculty', icon: '🎓', data: teachingYearwise, grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)' },
              { label: 'Staff', icon: '🏢', data: nonTeachingYearwise, grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.2)' },
            ].map(({ label, icon, data, grad, shadow }) => {
              const val = selectedYear === 'All'
                ? data.reduce((s, r) => s + (r.Total || 0), 0)
                : (data.find(r => String(r.year) === selectedYear)?.Total || 0);
              return (
                <div key={label} style={{ background: grad, borderRadius: '16px', padding: '24px', boxShadow: `0 10px 20px ${shadow}`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>{icon}</span>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>{label}</span>
                    </div>
                    <div className="stat-card-value" style={{ marginBottom: '8px' }}>{data.length === 0 ? '—' : val}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                        {selectedYear === 'All' ? 'Sum across all years' : `In year ${selectedYear}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    // ── Non-Regular summary cards ──
    const visibleCards = ENGAGEMENT_CARD_META.filter(meta =>
      eduSummaryCards.some(c => c.type === meta.type)
    );

    const isAllSelected = selectedCardType === '__all__';

    const DrilldownTable = ({ typeLabel, typeColor, data, exportId, exportFilename, exportTitle }) => (
      <div className="chart-section" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: typeColor, display: 'inline-block' }} />
            {typeLabel} Faculty List
            <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>
              ({eduFilters.year === 'All' ? 'All Years' : `Year: ${eduFilters.year}`})
            </span>
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ExportMenu
              elementId={exportId}
              data={data}
              headers={['Faculty Name', 'Department', 'Engagement Type']}
              keys={['faculty_name', 'department', 'engagement_type']}
              filename={exportFilename}
              title={exportTitle}
              exportType="table"
            />
            <button onClick={() => setSelectedCardType(null)} style={{
              background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '6px 12px',
              cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569'
            }}>✕ Close</button>
          </div>
        </div>
        <div id={exportId}>
          {chartIsMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.length > 0 ? data.map((f, i) => (
                <div key={i} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{f.faculty_name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{f.department}</div>
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                    {ENGAGEMENT_LABELS[f.engagement_type] || f.engagement_type || '—'}
                  </span>
                </div>
              )) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No faculty found.</div>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #edf2f7', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>FACULTY NAME</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #edf2f7', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>DEPARTMENT</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #edf2f7', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>ENGAGEMENT TYPE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length > 0 ? data.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>{f.faculty_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#475569' }}>{f.department}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#475569' }}>{ENGAGEMENT_LABELS[f.engagement_type] || f.engagement_type || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No faculty found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );


    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <ExportMenu
            elementId="nonreg-summary-cards-container"
            data={eduSummaryCards.filter(c => c.type !== 'FacultyFellow')}
            headers={['Type', 'Active']}
            keys={['type', 'active']}
            filename="non_regular_summary"
            title="Non-Regular Faculty Summary"
          />
        </div>
        <div
          id="nonreg-summary-cards-container"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleCards.length + 1}, 1fr)`,
            gap: '20px',
            marginBottom: '30px'
          }}
        >
          {/* Total Non-Regular card */}
          <div
            onClick={() => setSelectedCardType(isAllSelected ? null : '__all__')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px', padding: '24px',
              boxShadow: '0 10px 20px rgba(102,126,234,0.3)',
              position: 'relative', overflow: 'hidden',
              cursor: 'pointer',
              outline: isAllSelected ? '3px solid white' : 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
              transform: isAllSelected ? 'translateY(-4px)' : 'none',
            }}
          >
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>🎓</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Non-Regular</span>
              </div>
              <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                {eduSummary.overall_active > 0 ? formatNumber(eduSummary.overall_active) : '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Active faculty</span>
              </div>
              {isAllSelected && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  ▼ Showing details below
                </div>
              )}
            </div>
          </div>

          {/* Per-type cards — rendered in ENGAGEMENT_CARD_META order (= EDU_ENGAGEMENT_ORDER) */}
          {visibleCards.map(({ type, label, icon, grad, shadow }) => {
            const card = eduSummaryCards.find(c => c.type === type) || { active: 0 };
            const isSelected = selectedCardType === type;
            return (
              <div
                key={type}
                onClick={() => setSelectedCardType(isSelected ? null : type)}
                style={{
                  background: grad,
                  borderRadius: '16px', padding: '24px',
                  boxShadow: `0 10px 20px ${shadow}`,
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                  outline: isSelected ? '3px solid white' : 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  transform: isSelected ? 'translateY(-4px)' : 'none',
                }}
              >
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>{icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {formatNumber(card.active)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Active faculty</span>
                  </div>
                  {isSelected && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                      ▼ Showing details below
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedCardType && section === 'education' && (
          <DrilldownTable
            typeLabel={isAllSelected ? 'All Non-Regular' : (ENGAGEMENT_LABELS[selectedCardType] || selectedCardType)}
            typeColor={isAllSelected ? '#667eea' : (ENGAGEMENT_COLORS[selectedCardType] || '#667eea')}
            data={cardDetailsData}
            exportId="nonreg-drilldown-table"
            exportFilename={isAllSelected ? 'all_non_regular_faculty' : `faculty_list_${selectedCardType}`}
            exportTitle={isAllSelected ? 'All Non-Regular Faculty' : `${ENGAGEMENT_LABELS[selectedCardType] || selectedCardType} Faculty List`}
          />
        )}
      </>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ REUSABLE: Education chart series renderers
  // Both renderers iterate EDU_ENGAGEMENT_ORDER STRICTLY (NO filtering!)
  // This ensures bar/line order ALWAYS matches legend order
  // ══════════════════════════════════════════════════════════════════════════

  const renderEduBarSeries = () =>
    EDU_ENGAGEMENT_ORDER.map((type, index) => {
      const color = ENGAGEMENT_COLORS[type] || EDU_COLORS[index % EDU_COLORS.length];
      return (
        <Bar
          key={type}
          dataKey={type}
          name={ENGAGEMENT_LABELS[type] || type}
          fill={color}
          radius={[4, 4, 0, 0]}
          animationDuration={800}
        >
          <LabelList
            dataKey={type}
            position="top"
            style={{ fontSize: '10px', fontWeight: 600, fill: color }}
          />
        </Bar>
      );
    });

  const renderEduLineSeries = () =>
    EDU_ENGAGEMENT_ORDER.map((type, index) => {
      const color = ENGAGEMENT_COLORS[type] || EDU_COLORS[index % EDU_COLORS.length];
      return (
        <Line
          key={type}
          type="linear"
          dataKey={type}
          name={ENGAGEMENT_LABELS[type] || type}
          stroke={color}
          strokeWidth={3}
          dot={{ r: 5 }}
          activeDot={{ r: 8 }}
          animationDuration={800}
        >
          <LabelList
            offset={10}
            dataKey={type}
            position="top"
            style={{ fontSize: '10px', fontWeight: 600, fill: color }}
          />
        </Line>
      );
    });

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
            ← Back to People & Campus
          </button>
        )}
        {!isReadOnlyView && isAdmin && (
          <div className="section-header">
            <div className="section-header-left"><h1>Employee Overview</h1></div>
            <div className="section-header-actions">
              <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                <span>📤</span> Upload Employee Data
              </button>
            </div>
          </div>
        )}

        {(regError || eduError) && (
          <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' }}>
            {regError || eduError}
          </div>
        )}

        {renderSummaryCards()}

        <div className="chart-section">

          {renderFilterBar()}

          {/* ── REGULAR: Yearwise Strength ── */}
          {section === 'regular' && activeView === 'yearwise' && (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f0f0f0', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {['Bar', 'Trend'].map(mode => (
                  <button key={mode} type="button" onClick={() => setYearwiseChartType(mode)}
                    className={`chart-toggle-btn${yearwiseChartType === mode ? ' active' : ''}`}>
                    {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#1a1a1a', fontSize: '24px' }}>Year-wise Employee Strength</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Total employees and gender-wise breakdown year over year.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {SERIES_META.map(({ key, color, label }) => (
                    <button key={key} type="button" onClick={() => toggleSeries(key)} style={{
                      padding: '6px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer',
                      fontSize: '12px', fontWeight: '500', transition: 'all 0.2s',
                      backgroundColor: visibleSeries[key] ? color : '#f0f0f0',
                      color: visibleSeries[key] ? 'white' : '#666'
                    }}>{label}</button>
                  ))}
                  <ExportMenu
                    elementId="admin-yearwise-chart-container"
                    data={yearwiseData}
                    headers={['Year', ...SERIES_META.map(s => s.label)]}
                    keys={['year', ...SERIES_META.map(s => s.key)]}
                    filename="admin_yearwise_strength"
                    title="Year-wise Employee Strength"
                  />
                </div>
              </div>
              <div id="admin-yearwise-chart-container" style={{ position: 'relative' }}>
                {yearwiseData.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                    <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No employee records match the current filters.</p>
                  </div>
                )}

                {/* Bar chart */}
                <div
                  className={`chart-wrapper clickable-chart ${yearwiseChartType === 'Bar' ? 'active' : 'inactive'}`}
                  onClick={() => setExpandedChart({
                    title: "Year-wise Employee Strength",
                    content: (
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={yearwiseData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} content={(props) => {
                            const ordered = getOrderedLegend(props.payload, regularSeriesKeys);
                            return (
                              <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', flexWrap: 'wrap' }}>
                                {ordered.map(entry => (
                                  <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 12, height: 12, backgroundColor: entry.color, display: 'inline-block', borderRadius: 3, flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, color: '#334155' }}>{entry.value}</span>
                                  </li>
                                ))}
                              </ul>
                            );
                          }} />
                          {SERIES_META.map(({ key, color, label }) => (
                            <Bar key={key} dataKey={key} name={label} fill={color} radius={[6, 6, 0, 0]} {...BAR_ANIMATION} hide={!visibleSeries[key]}>
                              <LabelList dataKey={key} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: color }} />
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })}
                >
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={yearwiseData} margin={{ top: 40, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ✅ FIX: use getOrderedLegend to lock legend order to SERIES_META */}
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, regularSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 10, height: 10, backgroundColor: entry.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                                  <span>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {SERIES_META.map(({ key, color, label }) => (
                        <Bar key={key} dataKey={key} name={label} fill={color} radius={[4, 4, 0, 0]} {...BAR_ANIMATION} hide={!visibleSeries[key]}>
                          <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Trend (Line) chart */}
                <div
                  className={`chart-wrapper clickable-chart ${yearwiseChartType === 'Trend' ? 'active' : 'inactive'}`}
                  onClick={() => setExpandedChart({
                    title: "Year-wise Employee Trends",
                    content: (
                      <ResponsiveContainer width="100%" height={500}>
                        <LineChart data={yearwiseData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} content={(props) => {
                            const ordered = getOrderedLegend(props.payload, regularSeriesKeys);
                            return (
                              <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', flexWrap: 'wrap' }}>
                                {ordered.map(entry => (
                                  <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: 12, height: 12, backgroundColor: entry.color, display: 'inline-block', borderRadius: 3, flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, color: '#334155' }}>{entry.value}</span>
                                  </li>
                                ))}
                              </ul>
                            );
                          }} />
                          {SERIES_META.map(({ key, color, label }) => (
                            <Line key={key} type="linear" dataKey={key} name={label} stroke={color} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} hide={!visibleSeries[key]}>
                              <LabelList offset={10} dataKey={key} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: color }} />
                            </Line>
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  })}
                >
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={yearwiseData} margin={{ top: 40, right: 20, left: 40, bottom: 30 }}>
                      <defs>
                        {SERIES_META.map(({ gradientId, color }) => (
                          <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ✅ FIX: use getOrderedLegend to lock legend order to SERIES_META */}
                      <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, regularSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 10, height: 10, backgroundColor: entry.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                                  <span>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {SERIES_META.map(({ key, color, label }) => (
                        <Line key={key} type="linear" dataKey={key} name={label} stroke={color} strokeWidth={2} hide={!visibleSeries[key]}>
                          <LabelList offset={10} dataKey={key} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
                        </Line>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ── REGULAR: Faculty Department Wise ── */}
          {section === 'regular' && activeView === 'department' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#1a1a1a', fontSize: '24px' }}>Faculty Department Wise Count</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                    Currently active teaching faculty grouped by department. Total: <strong>{expertiseTotal}</strong>
                  </p>
                </div>
                <ExportMenu
                  elementId="admin-expertise-chart-container"
                  data={expertiseData}
                  headers={['Department', 'Faculty Count']}
                  keys={['name', 'count']}
                  filename="admin_faculty_expertise"
                  title="Faculty Department Wise Count"
                />
              </div>
              <div style={{ position: 'relative' }}>
                {!hasDeptData && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                    <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No active faculty match the current filters.</p>
                  </div>
                )}
                <div
                  id="admin-expertise-chart-container"
                  className="clickable-chart"
                  style={{ padding: '10px' }}
                  onClick={() => setExpandedChart({
                    title: "Faculty Department Wise Count",
                    content: (
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart data={expertiseData} margin={{ top: 40, right: 30, left: 40, bottom: 120 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: '#333', fontSize: 12, fontWeight: 600 }} interval={0} />
                          <YAxis tick={{ fontSize: 13, fontWeight: 600 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                          <Bar dataKey="count" name="Faculty" fill="#667eea" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: '#667eea' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })}
                >
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={expertiseData} margin={{ top: 26, right: 20, left: 0, bottom: 130 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="name" tick={<CustomXAxisTick />} interval={0} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                      <Bar dataKey="count" name="Faculty" fill="#667eea" radius={[4, 4, 0, 0]} {...BAR_ANIMATION}>
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ── REGULAR: Gender Distribution ── */}
          {section === 'regular' && activeView === 'gender' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#1a1a1a', fontSize: '24px' }}>Gender Distribution</h2>
                  <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Gender distribution of currently active employees.</p>
                </div>
                <ExportMenu
                  elementId="admin-gender-chart-container"
                  data={genderData}
                  headers={['Gender', 'Count']}
                  keys={['name', 'value']}
                  filename="admin_gender_distribution"
                  title="Gender Distribution"
                />
              </div>
              <div
                id="admin-gender-chart-container"
                className="clickable-chart"
                style={{ position: 'relative', padding: '10px' }}
                onClick={() => setExpandedChart({
                  title: "Gender Distribution",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <PieChart>
                        <Pie data={genderData} cx="50%" cy="50%" outerRadius={180} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}>
                          {genderData.map(entry => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontWeight: 600, fontSize: '14px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {genderData.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                    <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No gender data matches the current filters.</p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={chartIsMobile ? 300 : 420}>
                  <PieChart>
                    <Pie
                      data={genderData.length > 0 ? genderData : [{ name: '', value: 1, fill: '#f0f0f0' }]}
                      cx="50%" cy={chartIsMobile ? '43%' : '48%'} outerRadius={chartIsMobile ? 90 : 150} dataKey="value"
                      label={genderData.length > 0 && !chartIsMobile ? ({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)` : false}
                      labelLine={genderData.length > 0 && !chartIsMobile}
                      isAnimationActive animationDuration={700}
                    >
                      {(genderData.length > 0 ? genderData : [{ name: '', fill: '#f0f0f0' }]).map(entry => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    {genderData.length > 0 && (
                      <Legend verticalAlign="bottom" align="center"
                        formatter={value => <span style={{ color: GENDER_COLORS[value] || '#555', fontWeight: 600, fontSize: '0.82rem' }}>{value}</span>}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
                {genderData.length > 0 && (
                  <div style={{ textAlign: 'center', fontWeight: 700, color: '#1a1a1a', fontSize: '0.85rem', marginTop: '10px' }}>
                    Total Employees: {genderTotal}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              EDUCATION: Department-wise Breakdown
              ✅ FIXED: Strict EDU_ENGAGEMENT_ORDER rendering + getOrderedLegend
          ══════════════════════════════════════════════════════════════════ */}
          {section === 'education' && eduView === 'department' && (
            <>
              {/* Chart type toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f0f0f0', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {[
                  { mode: 'Bar', icon: '📊' },
                  { mode: 'Trend', icon: '📈' },
                ].map(({ mode, icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEduDeptChartType(mode)}
                    className={`chart-toggle-btn${eduDeptChartType === mode ? ' active' : ''}`}
                  >
                    {icon} {mode}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px' }}>🏢 Department-wise Breakdown</h2>
                  <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Active external academic engagements by department</p>
                </div>
                <ExportMenu
                  elementId="edu-dept-chart-container"
                  data={eduDeptChartData}
                  headers={['Department', ...EDU_ENGAGEMENT_ORDER.map(t => ENGAGEMENT_LABELS[t] || t), 'Total']}
                  keys={['department', ...EDU_ENGAGEMENT_ORDER, 'total']}
                  filename="faculty_engagement_department_breakdown"
                  title="Department-wise Breakdown"
                />
              </div>

              <div
                id="edu-dept-chart-container"
                className="clickable-chart"
                style={{ position: 'relative', minHeight: '400px', padding: '10px' }}
                onClick={() => setExpandedChart({
                  title: "Department-wise Breakdown",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={eduDeptChartData} margin={{ top: 40, right: 30, left: 40, bottom: 120 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} tick={{ fill: '#333', fontSize: 12, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} content={(props) => {
                          const ordered = getOrderedLegend(props.payload, eduSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 12, height: 12, backgroundColor: entry.color, display: 'inline-block', borderRadius: 3, flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: '#334155' }}>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }} />
                        {renderEduBarSeries()}
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {eduDeptChartData.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                    <p>No department data available for the selected filters.</p>
                  </div>
                )}

                {/* Bar chart */}
                <div className={`chart-wrapper ${eduDeptChartType === 'Bar' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={eduDeptChartData} margin={{ top: 20, right: 30, left: 60, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} tick={{ fill: '#333', fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ✅ FIX: use getOrderedLegend to lock legend order to EDU_ENGAGEMENT_ORDER */}
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ paddingBottom: '20px' }}
                        iconType="rect"
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, eduSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 10, height: 10, backgroundColor: entry.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                                  <span>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {renderEduBarSeries()}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Trend (Line) chart */}
                <div className={`chart-wrapper ${eduDeptChartType === 'Trend' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={eduDeptChartData} margin={{ top: 20, right: 30, left: 60, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} tick={{ fill: '#333', fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ✅ FIX: use getOrderedLegend to lock legend order to EDU_ENGAGEMENT_ORDER */}
                      <Legend
                        verticalAlign="top"
                        wrapperStyle={{ paddingBottom: '20px' }}
                        iconType="rect"
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, eduSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 10, height: 10, backgroundColor: entry.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                                  <span>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {renderEduLineSeries()}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              EDUCATION: Year-wise Trend
              ✅ FIXED: Strict EDU_ENGAGEMENT_ORDER rendering + getOrderedLegend
          ══════════════════════════════════════════════════════════════════ */}
          {section === 'education' && eduView === 'trend' && (
            <>
              {/* Chart type toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f0f0f0', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                {[
                  { mode: 'Bar', icon: '📊' },
                  { mode: 'Line', icon: '📈' },
                ].map(({ mode, icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEduTrendChartType(mode)}
                    className={`chart-toggle-btn${eduTrendChartType === mode ? ' active' : ''}`}
                  >
                    {icon} {mode}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px' }}>📈 Year-wise Trends</h2>
                  <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                    Active faculty engagement trends over multiple years
                    <span style={{ marginLeft: '8px', fontSize: '12px', background: '#f97316', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      Last {eduTrendNumYears} {eduTrendNumYears === 1 ? 'Year' : 'Years'}
                    </span>
                  </p>
                </div>
                <ExportMenu
                  elementId="edu-trend-chart-container"
                  data={eduTrendChartData}
                  headers={['Year', ...EDU_ENGAGEMENT_ORDER.map(t => ENGAGEMENT_LABELS[t] || t)]}
                  keys={['year', ...EDU_ENGAGEMENT_ORDER]}
                  filename="faculty_engagement_trends"
                  title="Year-wise Trends"
                />
              </div>

              <div
                id="edu-trend-chart-container"
                className="clickable-chart"
                style={{ position: 'relative', minHeight: '400px', padding: '10px' }}
                onClick={() => setExpandedChart({
                  title: "Year-wise Trends",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={eduTrendChartData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" tick={{ fill: '#333', fontSize: 13, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} content={(props) => {
                          const ordered = getOrderedLegend(props.payload, eduSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 12, height: 12, backgroundColor: entry.color, display: 'inline-block', borderRadius: 3, flexShrink: 0 }} />
                                  <span style={{ fontWeight: 600, color: '#334155' }}>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }} />
                        {renderEduLineSeries()}
                      </LineChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {eduTrendChartData.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                    <p>No trend data available for the selected filters.</p>
                  </div>
                )}

                {/* Bar chart */}
                <div className={`chart-wrapper ${eduTrendChartType === 'Bar' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={eduTrendChartData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" tick={{ fill: '#333', fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ✅ FIX: use getOrderedLegend to lock legend order to EDU_ENGAGEMENT_ORDER */}
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, eduSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 10, height: 10, backgroundColor: entry.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                                  <span>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {renderEduBarSeries()}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Line chart */}
                <div className={`chart-wrapper ${eduTrendChartType === 'Line' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={eduTrendChartData} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="year" tick={{ fill: '#333', fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* ✅ FIX: use getOrderedLegend to lock legend order to EDU_ENGAGEMENT_ORDER */}
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, eduSeriesKeys);
                          return (
                            <ul style={{ display: 'flex', justifyContent: 'center', gap: '16px', listStyle: 'none', padding: 0, margin: 0, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey ?? entry.value} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: 10, height: 10, backgroundColor: entry.color, display: 'inline-block', borderRadius: 2, flexShrink: 0 }} />
                                  <span>{entry.value}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {renderEduLineSeries()}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ── EDUCATION: Type Distribution ── */}
          {section === 'education' && eduView === 'distribution' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px' }}>🥧 Type Distribution</h2>
                  <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>Active faculty by engagement type</p>
                </div>
                <ExportMenu
                  elementId="edu-distribution-chart-container"
                  data={eduPieData}
                  headers={['Type', 'Active Count']}
                  keys={['name', 'value']}
                  filename="faculty_engagement_distribution"
                  title="Type Distribution"
                />
              </div>
              <div
                id="edu-distribution-chart-container"
                className="clickable-chart"
                style={{ position: 'relative', minHeight: '480px', padding: '10px' }}
                onClick={() => setExpandedChart({
                  title: "Type Distribution",
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <PieChart>
                        <Pie data={eduPieData} cx="50%" cy="50%" outerRadius={180} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                          {eduPieData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={ENGAGEMENT_COLORS[entry.name] || EDU_COLORS[i % EDU_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={v => formatNumber(v)} />
                        <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontWeight: 600, fontSize: '14px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )
                })}
              >
                {eduPieData.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)' }}>
                    <p>No distribution data available for the selected filters.</p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={chartIsMobile ? 300 : 420}>
                  <PieChart margin={{ top: chartIsMobile ? 10 : 40, right: 10, bottom: 10, left: 10 }}>
                    <Pie
                      data={eduPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={chartIsMobile ? 90 : 140}
                      dataKey="value"
                      animationDuration={800}
                      label={!chartIsMobile ? ({ cx, cy, midAngle, outerRadius, percent, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 28;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return percent > 0.04 ? (
                          <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central" fontSize={12} fontWeight={600}
                            fill={ENGAGEMENT_COLORS[name] || '#555'}>
                            {`${ENGAGEMENT_LABELS[name] || name} (${(percent * 100).toFixed(0)}%)`}
                          </text>
                        ) : null;
                      } : false}
                      labelLine={false}
                    >
                      {eduPieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={ENGAGEMENT_COLORS[entry.name] || EDU_COLORS[i % EDU_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => formatNumber(v)} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      iconSize={10}
                      wrapperStyle={{
                        position: 'relative',
                        paddingTop: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        lineHeight: '20px',
                      }}
                      formatter={(value) => (
                        <span style={{ color: ENGAGEMENT_COLORS[value] || '#555', fontWeight: 600 }}>
                          {ENGAGEMENT_LABELS[value] || value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* ── EDUCATION: Engagement Details ── */}
          {(typeof user === 'undefined' || user?.role_id !== 0) && section === 'education' && eduView === 'details' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px' }}>📋 Engagement Details</h2>
                  <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                    Detailed list of all external academic engagements · {eduEngagementList.length} records
                  </p>
                </div>
                <ExportMenu
                  elementId="edu-engagement-details-table"
                  data={eduEngagementList}
                  headers={['Sl No', 'Name', 'Academia or Industry', 'Discipline', 'Remarks']}
                  keys={['sl_no', 'faculty_name', 'fc_bg_type', 'department', 'remarks']}
                  filename="faculty_engagement_details"
                  title="Engagement Details"
                  exportType="table"
                />
              </div>
              <div id="edu-engagement-details-table" className="table-responsive" style={{
                height: '420px', overflowY: 'auto', overflowX: 'auto',
                border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#fff', position: 'relative'
              }}>
                {eduEngagementList.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.9)' }}>
                    <p style={{ color: '#94a3b8' }}>No engagement data available for the selected filters.</p>
                  </div>
                )}
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8f9fa' }}>
                      <tr>
                        {['Sl No', 'Name', 'Academia or Industry', 'Discipline', 'Remarks'].map(h => (
                          <th key={h} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#555', fontSize: '13px', fontWeight: '600' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {eduEngagementList.map((item, i) => (
                        <tr key={item.engagement_code || i} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{i + 1}</td>
                          <td style={{ padding: '10px', fontSize: '13px', fontWeight: '500' }}>{item.faculty_name || '—'}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{item.fc_bg_type || '—'}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{item.department || '—'}</td>
                          <td style={{ padding: '10px', fontSize: '13px' }}>{item.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}</>
              </div>
            </>
          )}

        </div>{/* end unified panel */}

        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="employees"
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

export default AdministrativeSection;
