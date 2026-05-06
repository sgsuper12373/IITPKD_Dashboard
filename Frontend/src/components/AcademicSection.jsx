import { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';
import {
  fetchFilterOptions, fetchGenderDistributionFiltered, fetchGenderTrends,
  fetchProgramTrends, fetchCumulativeStudentSummary, fetchOnrollSummary
} from '../services/academicStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './DataUploadModal';
import './Page.css';
import './AcademicSection.css';
import '../DesignSystem.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import { CustomTooltip, getOrderedLegend } from '../utils/chartUtils';

const COLORS = ['#667eea', '#764ba2', '#f093fb'];

// UG / PG / Research grouping colours (match summary cards)
const GROUP_COLORS = { UG: '#4f46e5', PG: '#f97316', Research: '#06b6d4', Total: '#22c55e' };

// Gender colours per group — for stacked bars
const GENDER_PALETTE = {
  Male: '#667eea',
  Female: '#764ba2',
  Transgender: '#f093fb',
};

// Map a program name to its broad group (fallback, only used if academic_program_type missing)
function getProgramGroup(prog) {
  const p = prog.toLowerCase();
  if (p.includes('b.tech') || p.includes('btech') || /\bug\b/.test(p)) return 'UG';
  if (p.includes('ph') && (p.includes('.d') || p.includes('d.'))) return 'Research';
  if ((p.includes('ms') || p.includes('m.s')) && p.includes('research')) return 'Research';
  if (p.includes('mse') && p.includes('research')) return 'Research';
  return 'PG';
}

const AREA_COLORS = {
  Total: { stroke: '#667eea', fill: 'url(#colorTotal)' },
  Male: { stroke: '#667eea', fill: 'url(#colorMale)' },
  Female: { stroke: '#764ba2', fill: 'url(#colorFemale)' },
  Transgender: { stroke: '#f093fb', fill: 'url(#colorTransgender)' },
};

const BAR_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 700,
  animationEasing: 'ease-out',
  animationBegin: 80
};

const TICK_STYLE = { fill: '#444', fontSize: 14, fontWeight: 400 };
const AXIS_LABEL_STYLE = { textAnchor: 'middle', fill: '#555', fontSize: 13, fontWeight: 500 };

const AreaGradients = () => (
  <defs>
    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#667eea" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorMale" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#667eea" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorFemale" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#764ba2" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#764ba2" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorTransgender" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#f093fb" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#f093fb" stopOpacity={0} />
    </linearGradient>
  </defs>
);

const InlineLegend = ({ payload, totalLabel, totalValue }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '1.1rem', fontSize: '0.82rem', flexWrap: 'wrap', paddingBottom: '4px',
  }}>
    {payload && payload.map((entry) => (
      <span key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ display: 'inline-block', width: 11, height: 11, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
        <span style={{ color: entry.color, fontWeight: 600 }}>{entry.value}</span>
      </span>
    ))}
    {totalValue !== undefined && (
      <span style={{ borderLeft: '1px solid #d0d0d0', paddingLeft: '1rem', fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
        {totalLabel ?? 'Total'}: {totalValue}
      </span>
    )}
  </div>
);

// ── Shared filter row ─────────────────────────────────────────────────────────
const fs = { padding: '0.28rem 1.6rem 0.28rem 0.45rem', fontSize: '0.75rem', borderRadius: '7px' };

function SharedFilters({
  mode,            // 'gender' | 'program'
  filterOptions,
  // gender-breakdown state
  selectedGender, setSelectedGender,
  trendYears, setTrendYears,
  genderTrendFilters, handleGenderTrendFilterChange, handleClearGenderTrendFilters,
  // program-group state
  programTrendFilters, handleProgramTrendFilterChange, handleClearProgramTrendFilters,
  // stacked gender toggle (program mode)
  stackGender, setStackGender,
}) {
  const isGender = mode === 'gender';
  const filters = isGender ? genderTrendFilters : programTrendFilters;
  const onChange = isGender ? handleGenderTrendFilterChange : handleProgramTrendFilterChange;
  const onClear = isGender ? handleClearGenderTrendFilters : handleClearProgramTrendFilters;

  return (
    <div style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', paddingBottom: '0.45rem', borderBottom: '1px solid #e0e0e0' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a1a' }}>Filters</span>
        <button className="clear-filters-btn" onClick={onClear} style={{ padding: '0.28rem 0.8rem', fontSize: '0.76rem', borderRadius: '6px' }}>Clear All Filters</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))', gap: '0.5rem' }}>

        {/* Gender selector — only shown in gender mode */}
        {isGender && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>Gender</label>
            <select value={selectedGender} onChange={e => setSelectedGender(e.target.value)} className="filter-select" style={fs}>
              <option value="All">M:F:T</option>
              <option value="Total">Total</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Transgender">Transgender</option>
            </select>
          </div>
        )}

        {/* Stack gender toggle — only shown in program mode */}
        {!isGender && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>Gender Stack</label>
            <select value={stackGender ? 'yes' : 'no'} onChange={e => setStackGender(e.target.value === 'yes')} className="filter-select" style={fs}>
              <option value="yes">Stacked</option>
              <option value="no">Totals Only</option>
            </select>
          </div>
        )}

        {/* Program */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>Program</label>
          <select
            value={filters.program || 'All'}
            onChange={e => onChange('program', e.target.value)}
            className="filter-select" style={fs}
          >
            <option value="All">All</option>
            {filterOptions.program.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Batch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>Batch</label>
          <select
            value={filters.batch || 'All'}
            onChange={e => onChange('batch', e.target.value)}
            className="filter-select" style={fs}
          >
            <option value="All">All</option>
            {filterOptions.batch.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Department */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>Department</label>
          <select
            value={filters.department || 'All'}
            onChange={e => onChange('department', e.target.value)}
            className="filter-select" style={fs}
          >
            <option value="All">All</option>
            {filterOptions.department.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* State */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>State</label>
          <select
            value={filters.state || 'All'}
            onChange={e => onChange('state', e.target.value)}
            className="filter-select" style={fs}
          >
            <option value="All">All</option>
            {filterOptions.state.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* PWD 
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>PWD</label>
          <select
            value={filters.pwd === true ? 'true' : filters.pwd === false ? 'false' : 'All'}
            onChange={e => {
              const v = e.target.value;
              onChange('pwd', v === 'true' ? true : v === 'false' ? false : null);
            }}
            className="filter-select" style={fs}
          >
            <option value="All">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div> */}

        {/* No. of Years — shown in gender mode */}
        {isGender && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>No. of Years</label>
            <select value={trendYears} onChange={e => setTrendYears(parseInt(e.target.value, 10))} className="filter-select" style={fs}>
              <option value={1}>Last 1 Yr</option>
              <option value={2}>Last 2 Yrs</option>
              <option value={3}>Last 3 Yrs</option>
              <option value={5}>Last 5 Yrs</option>
              <option value={10}>Last 10 Yrs</option>
            </select>
          </div>
        )}

        {/* No. of Years — shown in program mode too */}
        {!isGender && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>No. of Years</label>
            <select value={trendYears} onChange={e => setTrendYears(parseInt(e.target.value, 10))} className="filter-select" style={fs}>
              <option value={1}>Last 1 Yr</option>
              <option value={2}>Last 2 Yrs</option>
              <option value={3}>Last 3 Yrs</option>
              <option value={5}>Last 5 Yrs</option>
              <option value={10}>Last 10 Yrs</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AcademicSection({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [filterOptions, setFilterOptions] = useState({
    yearofadmission: [], program: [], batch: [], branch: [],
    department: [], category: [], state: [], latest_year: null
  });

  // Summary cards
  const [summaryYear, setSummaryYear] = useState('All');
  const [cumulativeSummary, setCumulativeSummary] = useState({ total_students: 0, ug_total: 0, pg_total: 0, research_total: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [onrollSummary, setOnrollSummary] = useState({ total_onroll: 0, ug_onroll: 0, pg_onroll: 0, research_onroll: 0 });
  const [onrollLoading, setOnrollLoading] = useState(false);

  // Gender distribution (top filter section — kept for reference; not used by charts)
  const [filters, setFilters] = useState({
    yearofadmission: null, program: null, batch: null, branch: null,
    department: null, category: null, pwd: null
  });
  const [genderData, setGenderData] = useState({ Male: 0, Female: 0, Transgender: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // Chart-level controls
  const [selectedGender, setSelectedGender] = useState('All');
  const [chartType, setChartType] = useState('Bar');
  const [trendYears, setTrendYears] = useState(10);
  const [programChartMode, setProgramChartMode] = useState('gender'); // 'gender' | 'program'
  const [stackGender, setStackGender] = useState(false); // stacked gender in program chart

  // Gender trend data
  const [genderTrendData, setGenderTrendData] = useState([]);
  const [genderTrendLoading, setGenderTrendLoading] = useState(true);
  const [genderTrendFilters, setGenderTrendFilters] = useState({
    program: null, batch: null, department: null, state: null, category: null, pwd: null
  });
  const [trendTotal, setTrendTotal] = useState(0);

  // Program trend data
  const [programTrendData, setProgramTrendData] = useState([]);
  const [programTrendPrograms, setProgramTrendPrograms] = useState([]);
  const [genderByGroup, setGenderByGroup] = useState([]); // NEW
  const [programTrendLoading, setProgramTrendLoading] = useState(true);
  const [programTrendFilters, setProgramTrendFilters] = useState({
    program: null, batch: null, department: null, state: null, category: null, pwd: null
  });

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const canViewRestrictedSection = isPublicView && !isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const showUploadBtn = !isReadOnlyView && isAdmin;

  // Available years for the summary-card year selector
  const availableYears = useMemo(() => {
    if (!filterOptions.yearofadmission || filterOptions.yearofadmission.length === 0) return ['All'];
    const years = [...filterOptions.yearofadmission].sort((a, b) => b - a);
    return ['All', ...years.map(String)];
  }, [filterOptions.yearofadmission]);

  // ── Fetch filter options ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const options = await fetchFilterOptions(token);
        setFilterOptions(options);
        if (options.latest_year) {
          setFilters(prev => ({ ...prev, yearofadmission: options.latest_year }));
        }
      } catch { setError('Failed to load filter options. Please try again.'); }
      finally { setLoading(false); }
    };
    load();
  }, [token, uploadVersion]);

  // ── Cumulative summary ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setSummaryLoading(true);
        const yearParam = summaryYear === 'All' ? null : summaryYear;
        const result = await fetchCumulativeStudentSummary(yearParam, token);
        setCumulativeSummary({ total_students: result.total_students || 0, ug_total: result.ug_total || 0, pg_total: result.pg_total || 0, research_total: result.research_total || 0 });
      } catch (err) { console.error('Failed to load cumulative summary:', err); }
      finally { setSummaryLoading(false); }
    };
    load();
  }, [token, summaryYear, uploadVersion]);

  // ── On-roll summary ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setOnrollLoading(true);
        const result = await fetchOnrollSummary(token);
        setOnrollSummary({ total_onroll: result.total_onroll || 0, ug_onroll: result.ug_onroll || 0, pg_onroll: result.pg_onroll || 0, research_onroll: result.research_onroll || 0 });
      } catch (err) { console.error('Failed to load on-roll summary:', err); }
      finally { setOnrollLoading(false); }
    };
    load();
  }, [token, uploadVersion]);

  // ── Gender distribution (for top-level year filter) ──────────────────────
  useEffect(() => {
    const load = async () => {
      if (filters.yearofadmission === null) return;
      try { setLoading(true); setError(null); const r = await fetchGenderDistributionFiltered(filters, token); setGenderData(r.data); setTotal(r.total); }
      catch { setError('Failed to load gender distribution data.'); }
      finally { setLoading(false); }
    };
    load();
  }, [filters, token, uploadVersion]);

  // ── Gender trend ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try { setGenderTrendLoading(true); const r = await fetchGenderTrends(genderTrendFilters, token); setGenderTrendData(r.data); }
      catch (err) { console.error(err); }
      finally { setGenderTrendLoading(false); }
    };
    load();
  }, [genderTrendFilters, token, uploadVersion]);

  // ── Program trend ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setProgramTrendLoading(true);
        const r = await fetchProgramTrends(programTrendFilters, token);
        setProgramTrendData(r.data);
        setProgramTrendPrograms(r.programs);
        setGenderByGroup(r.gender_by_group || []);
      } catch (err) { console.error(err); }
      finally { setProgramTrendLoading(false); }
    };
    load();
  }, [programTrendFilters, token, uploadVersion]);

  // ── Derived display data ──────────────────────────────────────────────────
  const displayGenderTrendData = useMemo(() => {
    if (!genderTrendData || genderTrendData.length === 0) return [];
    const sliced = genderTrendData.slice(-trendYears);
    if (selectedGender === 'Total') return sliced.map(d => ({ year: d.year, Total: (d.Male || 0) + (d.Female || 0) + (d.Transgender || 0) }));
    return sliced;
  }, [genderTrendData, trendYears, selectedGender]);

  useEffect(() => {
    const sum = displayGenderTrendData.reduce((acc, d) => {
      if (selectedGender === 'Total') return acc + (d.Total || 0);
      if (selectedGender === 'All') return acc + (d.Male || 0) + (d.Female || 0) + (d.Transgender || 0);
      return acc + (d[selectedGender] || 0);
    }, 0);
    setTrendTotal(sum);
  }, [displayGenderTrendData, selectedGender]);

  // UG/PG/Research aggregated from gender_by_group (preferred) or fallback
  const ugPgResearchTrend = useMemo(() => {
    const source = genderByGroup.length > 0 ? genderByGroup : programTrendData.map(row => {
      let ug = 0, pg = 0, research = 0;
      programTrendPrograms.forEach(prog => {
        const count = Number(row[prog]) || 0;
        const group = getProgramGroup(prog);
        if (group === 'UG') ug += count;
        else if (group === 'Research') research += count;
        else pg += count;
      });
      return {
        year: row.year,
        UG_Male: 0, UG_Female: 0, UG_Transgender: 0, UG_Total: ug,
        PG_Male: 0, PG_Female: 0, PG_Transgender: 0, PG_Total: pg,
        Research_Male: 0, Research_Female: 0, Research_Transgender: 0, Research_Total: research,
        Total: ug + pg + research,
      };
    });
    return source.slice(-trendYears);
  }, [genderByGroup, programTrendData, programTrendPrograms, trendYears]);

  const hasTrendData = displayGenderTrendData.some(d => (d.Total || 0) > 0 || (d.Male || 0) > 0 || (d.Female || 0) > 0);
  const hasProgramTrendData = ugPgResearchTrend.length > 0 && ugPgResearchTrend.some(d => d.Total > 0);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleGenderTrendFilterChange = (n, v) => setGenderTrendFilters(prev => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearGenderTrendFilters = () => { setGenderTrendFilters({ program: null, batch: null, department: null, state: null, category: null, pwd: null }); setTrendYears(10); setSelectedGender('All'); setChartType('Bar'); };
  const handleProgramTrendFilterChange = (n, v) => setProgramTrendFilters(prev => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearProgramTrendFilters = () => { setProgramTrendFilters({ program: null, batch: null, department: null, state: null, category: null, pwd: null }); setTrendYears(10); setStackGender(false); };

  const areaKeys = selectedGender === 'All' ? ['Male', 'Female', 'Transgender'] : [selectedGender];

  // Stacked gender bars for program chart
  // We render 3 groups × 3 genders = up to 9 stacked bars, or just 4 total bars
  const programStackedBars = useMemo(() => {
    if (!stackGender) {
      // Totals-only mode — 4 plain bars
      return [
        { key: 'UG_Total', name: 'UG', fill: GROUP_COLORS.UG },
        { key: 'PG_Total', name: 'PG', fill: GROUP_COLORS.PG },
        { key: 'Research_Total', name: 'Research', fill: GROUP_COLORS.Research },
        { key: 'Total', name: 'Total', fill: GROUP_COLORS.Total },
      ];
    }
    // Stacked mode — male/female/transgender stacked within each group
    return [
      { key: 'UG_Male', name: 'UG Male', stackId: 'UG', fill: '#4f46e5' },
      { key: 'UG_Female', name: 'UG Female', stackId: 'UG', fill: '#818cf8' },
      { key: 'UG_Transgender', name: 'UG Transgender', stackId: 'UG', fill: '#c7d2fe' },
      { key: 'PG_Male', name: 'PG Male', stackId: 'PG', fill: '#f97316' },
      { key: 'PG_Female', name: 'PG Female', stackId: 'PG', fill: '#fb923c' },
      { key: 'PG_Transgender', name: 'PG Transgender', stackId: 'PG', fill: '#fed7aa' },
      { key: 'Research_Male', name: 'Research Male', stackId: 'Research', fill: '#06b6d4' },
      { key: 'Research_Female', name: 'Research Female', stackId: 'Research', fill: '#22d3ee' },
      { key: 'Research_Transgender', name: 'Research Transgender', stackId: 'Research', fill: '#a5f3fc' },
      { key: 'Total', name: 'Total', stackId: 'Total', fill: GROUP_COLORS.Total },
    ];
  }, [stackGender]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button
            className="page-back-btn"
            onClick={() => navigate('/people-campus')}
          >
            ← Back to People & Campus
          </button>
        )}

        {showUploadBtn && (
          <div className="section-header">
            <h1>Student Overview</h1>

            <button
              className="page-upload-btn"
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Data
            </button>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}

        {/* ══ On-Roll Students ══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
          <ExportMenu
            elementId="academic-onroll-cards-container"
            data={[onrollSummary]}
            headers={['Total On Roll', 'UG', 'PG', 'Research']}
            keys={['total_onroll', 'ug_onroll', 'pg_onroll', 'research_onroll']}
            filename="students_on_roll"
            title="Students On Roll"
          />
        </div>
        <div id="academic-onroll-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          {[
            { label: 'Total Students On Roll', icon: '🎯', value: onrollSummary.total_onroll, grad: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', shadow: 'rgba(17,153,142,0.25)', subtitle: 'Total on roll students' },
            { label: 'UG', icon: '📘', value: onrollSummary.ug_onroll, grad: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', shadow: 'rgba(79,70,229,0.2)', subtitle: 'BTech — On Roll' },
            { label: 'PG', icon: '🎓', value: onrollSummary.pg_onroll, grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)', subtitle: 'MTech + MS — On Roll' },
            { label: 'Research', icon: '🔬', value: onrollSummary.research_onroll, grad: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', shadow: 'rgba(6,182,212,0.2)', subtitle: 'PhD / MSc (By Research) — On Roll' },
          ].map(({ label, icon, value, grad, shadow, subtitle }, idx) => {
            const delay = onrollLoading ? 0 : idx * 55;
            const t = onrollLoading ? 'opacity 0.15s ease-in, transform 0.15s ease-in' : `opacity 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms, transform 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms`;
            return (
              <div key={label} style={{ background: grad, borderRadius: '16px', padding: '24px', boxShadow: `0 10px 20px ${shadow}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>{icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '500' }}>{label}</span>
                  </div>
                  <div className="metric-value" style={{ color: 'white', marginBottom: '4px', opacity: onrollLoading ? 0 : 1, transform: onrollLoading ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)', transition: t, willChange: 'opacity, transform' }}>{value}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', opacity: onrollLoading ? 0 : 1, transform: onrollLoading ? 'translateY(4px)' : 'translateY(0)', transition: t, display: 'inline-block' }}>{subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ Student Summary ══════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
          <ExportMenu
            elementId="academic-summary-cards-container"
            data={[cumulativeSummary]}
            headers={['Total Students', 'UG', 'PG', 'Research']}
            keys={['total_students', 'ug_total', 'pg_total', 'research_total']}
            filename="student_summary"
            title="Student Summary"
          />
        </div>
        <div id="academic-summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '30px' }}>
          {/* Year filter card */}
          <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 20px rgba(168,85,247,0.3)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📅</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600' }}>Filter by Year</span>
              </div>
              <select value={summaryYear} onChange={e => setSummaryYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '500', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', outline: 'none' }}>
                {availableYears.map(y => <option key={y} value={y} style={{ color: '#333', background: '#fff' }}>{y === 'All' ? 'All Years' : y}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Focus on a specific year</span>
              </div>
            </div>
          </div>

          {[
            { label: 'Total Students', icon: '👥', value: cumulativeSummary.total_students, grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102,126,234,0.2)', subtitle: summaryYear === 'All' ? 'Cumulative students' : `Admitted in ${summaryYear}` },
            { label: 'UG', icon: '📘', value: cumulativeSummary.ug_total, grad: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', shadow: 'rgba(79,70,229,0.2)', subtitle: 'Undergraduate' },
            { label: 'PG', icon: '🎓', value: cumulativeSummary.pg_total, grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)', subtitle: 'Postgraduate' },
            { label: 'Research', icon: '📖', value: cumulativeSummary.research_total, grad: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', shadow: 'rgba(6,182,212,0.2)', subtitle: 'MS and PHD' },
          ].map(({ label, icon, value, grad, shadow, subtitle }, idx) => {
            const delay = summaryLoading ? 0 : idx * 55;
            const t = summaryLoading ? 'opacity 0.15s ease-in, transform 0.15s ease-in' : `opacity 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms, transform 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms`;
            return (
              <div key={label} style={{ background: grad, borderRadius: '16px', padding: '24px', boxShadow: `0 10px 20px ${shadow}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>{icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '500' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '4px', opacity: summaryLoading ? 0 : 1, transform: summaryLoading ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)', transition: t, willChange: 'opacity, transform' }}>{value}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', opacity: summaryLoading ? 0 : 1, transform: summaryLoading ? 'translateY(4px)' : 'translateY(0)', transition: t, display: 'inline-block' }}>{subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ Charts ════════════════════════════════════════════════════════ */}
        <div className="chart-section">
          <div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[{ key: 'gender', label: 'Gender Breakdown' }, { key: 'program', label: 'UG / PG / Research' }].map(({ key, label }) => (
                <button key={key} onClick={() => setProgramChartMode(key)} style={{ padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: programChartMode === key ? '#667eea' : '#e9ecef', color: programChartMode === key ? '#fff' : '#333', fontWeight: programChartMode === key ? '600' : '400', fontSize: '13px', transition: 'all 0.2s' }}>{label}</button>
              ))}
            </div>

            {/* ── Shared filter panel ── */}
            <SharedFilters
              mode={programChartMode}
              filterOptions={filterOptions}
              selectedGender={selectedGender} setSelectedGender={setSelectedGender}
              trendYears={trendYears} setTrendYears={setTrendYears}
              genderTrendFilters={genderTrendFilters}
              handleGenderTrendFilterChange={handleGenderTrendFilterChange}
              handleClearGenderTrendFilters={handleClearGenderTrendFilters}
              programTrendFilters={programTrendFilters}
              handleProgramTrendFilterChange={handleProgramTrendFilterChange}
              handleClearProgramTrendFilters={handleClearProgramTrendFilters}
              stackGender={stackGender} setStackGender={setStackGender}
            />

            {/* Bar / Trend toggle */}
            <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
              {['Bar', 'Trend'].map(mode => (
                <button key={mode} onClick={() => setChartType(mode)} style={{ padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: chartType === mode ? '#667eea' : '#e9ecef', color: chartType === mode ? '#fff' : '#333', fontWeight: chartType === mode ? '600' : '400', fontSize: '13px', transition: 'all 0.2s' }}>
                  {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                </button>
              ))}
            </div>

            {/* ── Gender breakdown charts ── */}
            {programChartMode === 'gender' && (
              <div className={`bar-chart-container trend-chart ${hasTrendData ? '' : 'has-empty'}`} style={{ padding: '0.75rem 1rem' }}>
                <div className={`trend-empty-state ${hasTrendData ? 'hidden' : ''}`}><p>No information available for the selected filter</p></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                  <ExportMenu
                    elementId={chartType === 'Bar' ? "academic-gender-bar-chart" : "academic-gender-trend-chart"}
                    data={displayGenderTrendData}
                    headers={['Year', 'Total', 'Male', 'Female', 'Transgender']}
                    keys={['year', 'Total', 'Male', 'Female', 'Transgender']}
                    filename="academic_gender_trend"
                    title="Gender Trend"
                  />
                </div>

                {/* Trend (line) */}
                <div id="academic-gender-trend-chart" className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={displayGenderTrendData} margin={{ top: 12, right: 30, left: 55, bottom: 60 }}>
                      <AreaGradients />
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                      <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                      <YAxis domain={[0, 'dataMax + 10']} allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={45} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ fontSize: '0.82rem', paddingBottom: '8px' }}
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, areaKeys);

                          return (
                            <ul style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '16px',
                              listStyle: 'none',
                              padding: 0,
                              margin: 0,
                              fontSize: '0.82rem'
                            }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: entry.color,
                                    display: 'inline-block',
                                    borderRadius: 2
                                  }} />
                                  {entry.value}
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {areaKeys.map(key => (
                        <Line key={key} type="linear" dataKey={key} stroke={AREA_COLORS[key]?.stroke || '#667eea'} strokeWidth={2.5} dot={{ fill: AREA_COLORS[key]?.stroke || '#667eea', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} animationDuration={800} animationEasing="ease-in-out">
                          <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS[key]?.stroke || '#667eea' }} />
                        </Line>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar */}
                <div id="academic-gender-bar-chart" className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={displayGenderTrendData} margin={{ top: 12, right: 30, left: 55, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                      <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                      <YAxis domain={[0, 'dataMax + 10']} allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={45} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ fontSize: '0.82rem', paddingBottom: '8px' }}
                        content={(props) => {
                          const ordered = getOrderedLegend(props.payload, areaKeys);

                          return (
                            <ul style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '16px',
                              listStyle: 'none',
                              padding: 0,
                              margin: 0,
                              fontSize: '0.82rem'
                            }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: entry.color,
                                    display: 'inline-block',
                                    borderRadius: 2
                                  }} />
                                  {entry.value}
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {selectedGender === 'Total' && <Bar dataKey="Total" fill="#667eea" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} /></Bar>}
                      {selectedGender === 'All' && <>
                        <Bar dataKey="Male" fill={COLORS[0]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Male" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[0] }} /></Bar>
                        <Bar dataKey="Female" fill={COLORS[1]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Female" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[1] }} /></Bar>
                        <Bar dataKey="Transgender" fill={COLORS[2]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Transgender" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[2] }} /></Bar>
                      </>}
                      {selectedGender === 'Male' && <Bar dataKey="Male" fill={COLORS[0]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Male" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[0] }} /></Bar>}
                      {selectedGender === 'Female' && <Bar dataKey="Female" fill={COLORS[1]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Female" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[1] }} /></Bar>}
                      {selectedGender === 'Transgender' && <Bar dataKey="Transgender" fill={COLORS[2]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Transgender" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[2] }} /></Bar>}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── UG / PG / Research chart ── */}
            {programChartMode === 'program' && (
              <div className={`bar-chart-container trend-chart ${hasProgramTrendData ? '' : 'has-empty'}`} style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 className="chart-heading" style={{ margin: 0 }}>
                    Student Strength — UG / PG / Research / Total
                    {stackGender && <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '8px', fontWeight: 400 }}>(stacked by gender)</span>}
                  </h3>
                  <ExportMenu
                    elementId="academic-program-strength-chart"
                    data={ugPgResearchTrend}
                    headers={stackGender
                      ? ['Year', 'UG Male', 'UG Female', 'UG Trans', 'UG Total', 'PG Male', 'PG Female', 'PG Trans', 'PG Total', 'Research Male', 'Research Female', 'Research Trans', 'Research Total', 'Total']
                      : ['Year', 'UG', 'PG', 'Research', 'Total']}
                    keys={stackGender
                      ? ['year', 'UG_Male', 'UG_Female', 'UG_Transgender', 'UG_Total', 'PG_Male', 'PG_Female', 'PG_Transgender', 'PG_Total', 'Research_Male', 'Research_Female', 'Research_Transgender', 'Research_Total', 'Total']
                      : ['year', 'UG_Total', 'PG_Total', 'Research_Total', 'Total']}
                    filename="academic_program_strength"
                    title="Student Strength Overview"
                  />
                </div>
                <div className={`trend-empty-state ${hasProgramTrendData ? 'hidden' : ''}`}><p>No information available for the selected filter</p></div>

                {/* Bar chart */}
                <div id="academic-program-strength-chart" className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={stackGender ? 480 : 420}>
                    <BarChart data={ugPgResearchTrend} margin={{ top: 12, right: 30, left: 20, bottom: 60 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                      <XAxis dataKey="year" angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                      <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={45} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ fontSize: '0.78rem', paddingBottom: '8px' }}
                        content={(props) => {
                          const keys = programStackedBars.map(b => b.key);
                          const ordered = getOrderedLegend(props.payload, keys);

                          return (
                            <ul style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '16px',
                              listStyle: 'none',
                              padding: 0,
                              margin: 0,
                              fontSize: '0.78rem'
                            }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: entry.color,
                                    display: 'inline-block',
                                    borderRadius: 2
                                  }} />
                                  {entry.value}
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {programStackedBars.map(({ key, name, fill, stackId }, i) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          name={name}
                          fill={fill}
                          stackId={stackId}
                          radius={
                            // Only round top of the last bar in each stack (or all if no stackId)
                            stackId
                              ? (programStackedBars.filter(b => b.stackId === stackId).at(-1)?.key === key ? [4, 4, 0, 0] : [0, 0, 0, 0])
                              : [4, 4, 0, 0]
                          }
                          {...BAR_ANIMATION}
                        >
                          {/* Only show label on top bar of each stack or all-total */}
                          {(!stackId || programStackedBars.filter(b => b.stackId === stackId).at(-1)?.key === key) && (
                            <LabelList
                              dataKey={stackId ? `${stackId}_Total` : key}
                              position="top"
                              style={{ fontSize: '10px', fontWeight: 600, fill: fill }}
                            />
                          )}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Trend (line) chart */}
                <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                  <ResponsiveContainer width="100%" height={420}>
                    <LineChart data={ugPgResearchTrend} margin={{ top: 12, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                      <XAxis dataKey="year" angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                      <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={45} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ fontSize: '0.78rem', paddingBottom: '8px' }}
                        content={(props) => {
                          const keys = programStackedBars.map(b => b.key);
                          const ordered = getOrderedLegend(props.payload, keys);

                          return (
                            <ul style={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '16px',
                              listStyle: 'none',
                              padding: 0,
                              margin: 0,
                              fontSize: '0.78rem'
                            }}>
                              {ordered.map(entry => (
                                <li key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: entry.color,
                                    display: 'inline-block',
                                    borderRadius: 2
                                  }} />
                                  {entry.value}
                                </li>
                              ))}
                            </ul>
                          );
                        }}
                      />
                      {stackGender ? (
                        // Stacked gender — show one line per gender per group
                        programStackedBars.map(({ key, name, fill }) => (
                          <Line key={key} type="linear" dataKey={key} name={name} stroke={fill} strokeWidth={2} dot={{ r: 4, fill, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}>
                            <LabelList dataKey={key} position="top" style={{ fontSize: '9px', fontWeight: 600, fill }} />
                          </Line>
                        ))
                      ) : (
                        // Totals only
                        <>
                          <Line type="linear" dataKey="UG_Total" name="UG" stroke={GROUP_COLORS.UG} strokeWidth={3} dot={{ r: 5, fill: GROUP_COLORS.UG, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="UG_Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.UG }} /></Line>
                          <Line type="linear" dataKey="PG_Total" name="PG" stroke={GROUP_COLORS.PG} strokeWidth={3} dot={{ r: 5, fill: GROUP_COLORS.PG, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="PG_Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.PG }} /></Line>
                          <Line type="linear" dataKey="Research_Total" name="Research" stroke={GROUP_COLORS.Research} strokeWidth={3} dot={{ r: 5, fill: GROUP_COLORS.Research, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="Research_Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.Research }} /></Line>
                          <Line type="linear" dataKey="Total" name="Total" stroke={GROUP_COLORS.Total} strokeWidth={3} strokeDasharray="6 3" dot={{ r: 5, fill: GROUP_COLORS.Total, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.Total }} /></Line>
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        <DataUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} tableName="student_table" token={token} />
      </div>
    </div>
  );
}

export default AcademicSection;