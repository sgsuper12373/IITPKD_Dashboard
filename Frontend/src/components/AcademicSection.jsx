import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchFilterOptions, fetchGenderDistributionFiltered, fetchStudentStrengthFiltered, fetchGenderTrends, fetchProgramTrends, fetchCumulativeStudentSummary, fetchOnrollSummary } from '../services/academicStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './DataUploadModal';
import './Page.css';
import './AcademicSection.css';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#667eea', '#764ba2', '#f093fb'];
const TREND_COLORS = ['#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#ff9a9e', '#fbc2eb', '#a18cd1', '#fad0c4', '#ffd1ff', '#a6c1ee'];

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

// Crisp axis styles
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

function AcademicSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    yearofadmission: [], program: [], batch: [], branch: [],
    department: [], category: [], state: [], latest_year: null
  });

  // Year filter for summary cards
  const [summaryYear, setSummaryYear] = useState('All');
  const [cumulativeSummary, setCumulativeSummary] = useState({
    total_students: 0,
    ug_total: 0,
    pg_total: 0,
    research_total: 0
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [onrollSummary, setOnrollSummary] = useState({
    total_onroll: 0, ug_onroll: 0, pg_onroll: 0, research_onroll: 0
  });
  const [onrollLoading, setOnrollLoading] = useState(false);

  const [filters, setFilters] = useState({
    yearofadmission: null, program: null, batch: null, branch: null,
    department: null, category: null, pwd: null
  });
  const [genderData, setGenderData] = useState({ Male: 0, Female: 0, Transgender: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const [studentStrengthData, setStudentStrengthData] = useState([]);
  const [strengthFilters, setStrengthFilters] = useState({ yearofadmission: null, category: null, state: null });
  const [strengthLoading, setStrengthLoading] = useState(false);
  const [strengthError, setStrengthError] = useState(null);
  const [strengthTotal, setStrengthTotal] = useState(0);

  const [selectedGender, setSelectedGender] = useState('Total');
  const [chartType, setChartType] = useState('Trend');
  const [trendYears, setTrendYears] = useState(5);
  const [genderTrendData, setGenderTrendData] = useState([]);
  const [genderTrendLoading, setGenderTrendLoading] = useState(true);
  const [genderTrendFilters, setGenderTrendFilters] = useState({
    program: null, batch: null, department: null, category: null, pwd: null
  });
  const [trendTotal, setTrendTotal] = useState(0);

  const [programTrendData, setProgramTrendData] = useState([]);
  const [programTrendPrograms, setProgramTrendPrograms] = useState([]);
  const [programTrendLoading, setProgramTrendLoading] = useState(true);
  const [programTrendFilters, setProgramTrendFilters] = useState({ category: null, state: null });

  const [activeChart, setActiveChart] = useState('genderTrend');
  const token = localStorage.getItem('authToken');
  const showUploadBtn = !isPublicView && user && (user.role_id === 3 || user.role_id === 4);

  // Get available years for dropdown from database
  const availableYears = useMemo(() => {
    if (!filterOptions.yearofadmission || filterOptions.yearofadmission.length === 0) {
      return ['All'];
    }
    const years = [...filterOptions.yearofadmission].sort((a, b) => b - a);
    return ['All', ...years.map(String)];
  }, [filterOptions.yearofadmission]);

  // Fetch cumulative summary data
  useEffect(() => {
    const loadCumulativeSummary = async () => {
      if (!token) {
        console.log('No token available for cumulative summary');
        return;
      }
      try {
        setSummaryLoading(true);
        const yearParam = summaryYear === 'All' ? null : summaryYear;
        console.log('Fetching summary for year:', yearParam);
        const result = await fetchCumulativeStudentSummary(yearParam, token);
        console.log('Received summary result:', result);
        setCumulativeSummary({
          total_students: result.total_students || 0,
          ug_total: result.ug_total || 0,
          pg_total: result.pg_total || 0,
          research_total: result.research_total || 0
        });
      } catch (err) {
        console.error('Failed to load cumulative summary:', err);
        // Keep previous values on error
        setCumulativeSummary(prev => ({
          total_students: prev.total_students || 0,
          ug_total: prev.ug_total || 0,
          pg_total: prev.pg_total || 0,
          research_total: prev.research_total || 0
        }));
      } finally {
        setSummaryLoading(false);
      }
    };
    loadCumulativeSummary();
  }, [token, summaryYear, uploadVersion]);

  // Fetch on-roll summary data
  useEffect(() => {
    const loadOnrollSummary = async () => {
      if (!token) return;
      try {
        setOnrollLoading(true);
        const result = await fetchOnrollSummary(token);
        setOnrollSummary({
          total_onroll:    result.total_onroll    || 0,
          ug_onroll:       result.ug_onroll       || 0,
          pg_onroll:       result.pg_onroll       || 0,
          research_onroll: result.research_onroll || 0,
        });
      } catch (err) {
        console.error('Failed to load on-roll summary:', err);
      } finally {
        setOnrollLoading(false);
      }
    };
    loadOnrollSummary();
  }, [token, uploadVersion]);

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Authentication token not found. Please log in again.'); setLoading(false); return; }
      try {
        setLoading(true); setError(null);
        const options = await fetchFilterOptions(token);
        setFilterOptions(options);
        if (options.latest_year) {
          setFilters(prev => ({ ...prev, yearofadmission: options.latest_year }));
          setStrengthFilters(prev => ({ ...prev, yearofadmission: options.latest_year }));
        }
      } catch { setError('Failed to load filter options. Please try again.'); }
      finally { setLoading(false); }
    };
    load();
  }, [token, uploadVersion]);

  const displayGenderTrendData = useMemo(() => {
    if (!genderTrendData || genderTrendData.length === 0) return [];
    const sliced = genderTrendData.slice(-trendYears);
    if (selectedGender === 'Total') {
      return sliced.map(d => ({ year: d.year, Total: (d.Male || 0) + (d.Female || 0) + (d.Transgender || 0) }));
    }
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

  const hasTrendData = displayGenderTrendData.some(d => (d.Total || 0) > 0 || (d.Male || 0) > 0 || (d.Female || 0) > 0 || (d.Transgender || 0) > 0);
  const hasProgramTrendData = programTrendData.length > 0 && programTrendData.slice(-5).some(d => programTrendPrograms.some(p => (d[p] || 0) > 0));
  const hasStrengthData = strengthTotal > 0 && studentStrengthData.some(d => (d.Male || 0) > 0 || (d.Female || 0) > 0 || (d.Transgender || 0) > 0);

  useEffect(() => { const load = async () => { if (!token || filters.yearofadmission === null) return; try { setLoading(true); setError(null); const r = await fetchGenderDistributionFiltered(filters, token); setGenderData(r.data); setTotal(r.total); } catch { setError('Failed to load gender distribution data.'); } finally { setLoading(false); } }; load(); }, [filters, token, uploadVersion]);
  useEffect(() => { const load = async () => { if (!token || strengthFilters.yearofadmission === null) return; try { setStrengthLoading(true); setStrengthError(null); const r = await fetchStudentStrengthFiltered(strengthFilters, token); setStudentStrengthData(r.data); setStrengthTotal(r.total); } catch { setStrengthError('Failed to load student strength data.'); } finally { setStrengthLoading(false); } }; load(); }, [strengthFilters, token, uploadVersion]);
  useEffect(() => { const load = async () => { if (!token) return; try { setGenderTrendLoading(true); const r = await fetchGenderTrends(genderTrendFilters, token); setGenderTrendData(r.data); } catch (err) { console.error(err); } finally { setGenderTrendLoading(false); } }; load(); }, [genderTrendFilters, token, uploadVersion]);
  useEffect(() => { const load = async () => { if (!token) return; try { setProgramTrendLoading(true); const r = await fetchProgramTrends(programTrendFilters, token); setProgramTrendData(r.data); setProgramTrendPrograms(r.programs); } catch (err) { console.error(err); } finally { setProgramTrendLoading(false); } }; load(); }, [programTrendFilters, token, uploadVersion]);

  const handleGenderTrendFilterChange = (n, v) => setGenderTrendFilters(prev => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearGenderTrendFilters = () => { setGenderTrendFilters({ program: null, batch: null, department: null, category: null, pwd: null }); setTrendYears(5); setSelectedGender('Total'); setChartType('Trend'); };
  const handleStrengthFilterChange = (n, v) => setStrengthFilters(prev => ({ ...prev, [n]: v === 'All' ? (n === 'yearofadmission' ? 'All' : null) : v }));
  const handleClearStrengthFilters = () => setStrengthFilters({ yearofadmission: filterOptions.latest_year || null, category: null, state: null });
  const handleProgramTrendFilterChange = (n, v) => setProgramTrendFilters(prev => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearProgramTrendFilters = () => setProgramTrendFilters({ category: null, state: null });

  const areaKeys = selectedGender === 'All' ? ['Male', 'Female', 'Transgender'] : [selectedGender];
  const fs = { padding: '0.28rem 1.6rem 0.28rem 0.45rem', fontSize: '0.75rem', borderRadius: '7px' };

  // Shared Tooltip style
  const tooltipStyle = {
    contentStyle: { backgroundColor: '#fff', borderColor: '#e0e0e0', borderRadius: '8px', fontSize: '0.85rem', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
    labelStyle: { fontWeight: 600, color: '#1a1a1a', marginBottom: '2px' },
    cursor: { strokeDasharray: '4 2', stroke: '#667eea' },
  };

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>

        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
            ← Back to People & Campus
          </button>
        )}

        {showUploadBtn && (
          <div className="section-header">
            <h1>Student Overview</h1>
            <div className="header-left" />

            <button className="upload-data-btn" onClick={() => setIsUploadModalOpen(true)}>Upload Data</button>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}

        {/* ══ On-Roll Students ══════════════════════════════════════════════ */}
        <h2 style={{ textDecoration: 'underline', color: '#000', marginBottom: '16px', fontSize: '30px' }}>
          Students On Roll
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          {[
            {
              label: 'Total Studnets On Roll', icon: '🎯', value: onrollSummary.total_onroll,
              grad: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', shadow: 'rgba(17,153,142,0.25)',
              subtitle: 'Cumulative students on roll'
            },
            {
              label: 'UG', icon: '📘', value: onrollSummary.ug_onroll,
              grad: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', shadow: 'rgba(79,70,229,0.2)',
              subtitle: 'BTech — On Roll'
            },
            {
              label: 'PG', icon: '🎓', value: onrollSummary.pg_onroll,
              grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)',
              subtitle: 'MTech + MS — On Roll'
            },
            {
              label: 'Research', icon: '🔬', value: onrollSummary.research_onroll,
              grad: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', shadow: 'rgba(6,182,212,0.2)',
              subtitle: 'PhD + MSe By Research) — On Roll'
            },
          ].map(({ label, icon, value, grad, shadow, subtitle }, idx) => {
            const delay = onrollLoading ? 0 : idx * 55;
            const enterTransition = `opacity 0.45s cubic-bezier(0.2, 0, 0, 1) ${delay}ms, transform 0.45s cubic-bezier(0.2, 0, 0, 1) ${delay}ms`;
            const exitTransition = 'opacity 0.15s ease-in, transform 0.15s ease-in';
            const t = onrollLoading ? exitTransition : enterTransition;
            return (
              <div key={label} style={{
                background: grad, borderRadius: '16px', padding: '24px',
                boxShadow: `0 10px 20px ${shadow}`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>{icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '500' }}>{label}</span>
                  </div>
                  <div style={{
                    fontSize: '40px', fontWeight: 'bold', color: 'white', marginBottom: '4px',
                    opacity: onrollLoading ? 0 : 1,
                    transform: onrollLoading ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)',
                    transition: t,
                    willChange: 'opacity, transform',
                  }}>
                    {value}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{
                      fontSize: '11px', color: 'rgba(255,255,255,0.7)',
                      opacity: onrollLoading ? 0 : 1,
                      transform: onrollLoading ? 'translateY(4px)' : 'translateY(0)',
                      transition: t,
                      display: 'inline-block',
                    }}>{subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ Student Summary ══════════════════════════════════════════════ */}
        <h2 style={{ textDecoration: 'underline', color: '#000', marginBottom: '16px', fontSize: '20px' }}>
          Student Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '30px' }}>

          {/* Year Filter Card */}
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            borderRadius: '16px', padding: '24px',
            boxShadow: '0 10px 20px rgba(168,85,247,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📅</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600' }}>Filter by Year</span>
              </div>
              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: 'none', fontSize: '14px', fontWeight: '500',
                  background: 'rgba(255,255,255,0.2)', color: 'white',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {availableYears.map(y => (
                  <option key={y} value={y} style={{ color: '#333', background: '#fff' }}>
                    {y === 'All' ? 'All Years' : y}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Focus on a specific year</span>
              </div>
            </div>
          </div>

          {/* Data Cards */}
          {[
            {
              label: 'Total Students', icon: '👥', value: cumulativeSummary.total_students,
              grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadow: 'rgba(102,126,234,0.2)',
              subtitle: summaryYear === 'All' ? 'Cumulative students' : `Admitted in ${summaryYear}`
            },
            {
              label: 'UG', icon: '📘', value: cumulativeSummary.ug_total,
              grad: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', shadow: 'rgba(79,70,229,0.2)',
              subtitle: 'Undergraduate'
            },
            {
              label: 'PG', icon: '🎓', value: cumulativeSummary.pg_total,
              grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)',
              subtitle: 'Postgraduate'
            },
            {
              label: 'Research', icon: '📖', value: cumulativeSummary.research_total,
              grad: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', shadow: 'rgba(6,182,212,0.2)',
              subtitle: 'MS and PHD'
            },
          ].map(({ label, icon, value, grad, shadow, subtitle }, idx) => {
            // Fast exit, smooth decelerated entrance with per-card stagger
            const delay = summaryLoading ? 0 : idx * 55;
            const enterTransition = `opacity 0.45s cubic-bezier(0.2, 0, 0, 1) ${delay}ms, transform 0.45s cubic-bezier(0.2, 0, 0, 1) ${delay}ms`;
            const exitTransition = 'opacity 0.15s ease-in, transform 0.15s ease-in';
            const t = summaryLoading ? exitTransition : enterTransition;
            return (
              <div key={label} style={{
                background: grad, borderRadius: '16px', padding: '24px',
                boxShadow: `0 10px 20px ${shadow}`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>{icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '500' }}>{label}</span>
                  </div>
                  <div style={{
                    fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '4px',
                    opacity: summaryLoading ? 0 : 1,
                    transform: summaryLoading ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)',
                    transition: t,
                    willChange: 'opacity, transform',
                  }}>
                    {value}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{
                      fontSize: '11px', color: 'rgba(255,255,255,0.7)',
                      opacity: summaryLoading ? 0 : 1,
                      transform: summaryLoading ? 'translateY(4px)' : 'translateY(0)',
                      transition: t,
                      display: 'inline-block',
                    }}>{subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="chart-section">

          {/* ── 1. Gender Trend ── */}
          <div className={`chart-view ${activeChart === 'genderTrend' ? 'active' : ''}`}>
            <div className="chart-header" style={{ marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', marginBottom: 0 }}>Student Overview</h2>
            </div>

            {/* Compact filters */}
            <div style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem', paddingBottom: '0.45rem', borderBottom: '1px solid #e0e0e0' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a1a' }}>Filters</span>
                <button className="clear-filters-btn" onClick={handleClearGenderTrendFilters} style={{ padding: '0.28rem 0.8rem', fontSize: '0.76rem', borderRadius: '6px' }}>Clear All Filters</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.5rem' }}>
                {[
                  { label: 'Graph Type', el: <select value={chartType} onChange={e => setChartType(e.target.value)} className="filter-select" style={fs}><option value="Trend">Trend</option><option value="Bar">Bar Chart</option></select> },
                  { label: 'Gender', el: <select value={selectedGender} onChange={e => setSelectedGender(e.target.value)} className="filter-select" style={fs}><option value="Total">Total</option><option value="All">M : F : T</option><option value="Male">Male</option><option value="Female">Female</option><option value="Transgender">Transgender</option></select> },
                  { label: 'Program', el: <select value={genderTrendFilters.program || 'All'} onChange={e => handleGenderTrendFilterChange('program', e.target.value)} className="filter-select" style={fs}><option value="All">All</option>{filterOptions.program.map(p => <option key={p} value={p}>{p}</option>)}</select> },
                  { label: 'Batch', el: <select value={genderTrendFilters.batch || 'All'} onChange={e => handleGenderTrendFilterChange('batch', e.target.value)} className="filter-select" style={fs}><option value="All">All</option>{filterOptions.batch.map(b => <option key={b} value={b}>{b}</option>)}</select> },
                  { label: 'Department', el: <select value={genderTrendFilters.department || 'All'} onChange={e => handleGenderTrendFilterChange('department', e.target.value)} className="filter-select" style={fs}><option value="All">All</option>{filterOptions.department.map(d => <option key={d} value={d}>{d}</option>)}</select> },
                  { label: 'Category', el: <select value={genderTrendFilters.category || 'All'} onChange={e => handleGenderTrendFilterChange('category', e.target.value)} className="filter-select" style={fs}><option value="All">All</option>{filterOptions.category.map(c => <option key={c} value={c}>{c}</option>)}</select> },
                  { label: 'No. of Years', el: <select value={trendYears} onChange={e => setTrendYears(parseInt(e.target.value, 10))} className="filter-select" style={fs}><option value={1}>Last 1 Yr</option><option value={2}>Last 2 Yrs</option><option value={3}>Last 3 Yrs</option><option value={5}>Last 5 Yrs</option><option value={10}>Last 10 Yrs</option></select> },
                  { label: 'PWD', el: <select value={genderTrendFilters.pwd === true ? 'true' : genderTrendFilters.pwd === false ? 'false' : 'All'} onChange={e => { const v = e.target.value; handleGenderTrendFilterChange('pwd', v === 'true' ? true : v === 'false' ? false : null); }} className="filter-select" style={fs}><option value="All">All</option><option value="true">Yes</option><option value="false">No</option></select> },
                ].map(({ label, el }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1a1a1a' }}>{label}</label>
                    {el}
                  </div>
                ))}
              </div>
            </div>

            <div className={`bar-chart-container trend-chart ${hasTrendData ? '' : 'has-empty'}`} style={{ padding: '0.75rem 1rem' }}>
              <div className={`trend-empty-state ${hasTrendData ? 'hidden' : ''}`}>
                <p>No information available for the selected filter</p>
              </div>

              {/* ── Area Chart ── */}
              <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={displayGenderTrendData} margin={{ top: 12, right: 30, left: 55, bottom: 60 }}>
                    <AreaGradients />
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis
                      dataKey="year"
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={65}
                      tick={TICK_STYLE}
                      tickLine={false}
                      axisLine={{ stroke: '#ddd' }}
                      label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }}
                    />
                    <YAxis
                      domain={[0, 'dataMax + 10']}
                      allowDecimals={false}
                      tick={TICK_STYLE}
                      tickLine={false}
                      axisLine={{ stroke: '#ddd' }}
                      width={45}
                      label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }}
                    />
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      verticalAlign="top" align="center"
                      content={(props) => <InlineLegend {...props} />}
                    />
                    {areaKeys.map(key => (
                      <Area
                        key={key} type="monotone" dataKey={key}
                        stroke={AREA_COLORS[key]?.stroke || '#667eea'}
                        fill={AREA_COLORS[key]?.fill || 'url(#colorTotal)'}
                        strokeWidth={2.5}
                        dot={{ fill: AREA_COLORS[key]?.stroke || '#667eea', r: 4, strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        animationDuration={800} animationEasing="ease-in-out"
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* ── Bar Chart ── */}
              <div className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={displayGenderTrendData} margin={{ top: 12, right: 30, left: 55, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis
                      dataKey="year" interval={0} angle={-40} textAnchor="end" height={65}
                      tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }}
                      label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }}
                    />
                    <YAxis
                      domain={[0, 'dataMax + 10']} allowDecimals={false}
                      tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }}
                      width={45}
                      label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }}
                    />
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      verticalAlign="top" align="center"
                      content={(props) => <InlineLegend {...props} />}
                    />
                    {selectedGender === 'Total' && <Bar dataKey="Total" fill="#667eea" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" />}
                    {selectedGender === 'All' && <><Bar dataKey="Male" fill={COLORS[0]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" /><Bar dataKey="Female" fill={COLORS[1]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" /><Bar dataKey="Transgender" fill={COLORS[2]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" /></>}
                    {selectedGender === 'Male' && <Bar dataKey="Male" fill={COLORS[0]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" />}
                    {selectedGender === 'Female' && <Bar dataKey="Female" fill={COLORS[1]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" />}
                    {selectedGender === 'Transgender' && <Bar dataKey="Transgender" fill={COLORS[2]} radius={[3, 3, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── 2. Student Strength by Program Trend ── */}
          <div className={`chart-view ${activeChart === 'programTrend' ? 'active' : ''}`}>
            <div className="chart-header">
              <h2>Student Strength by Program (Trend)</h2>
              <p className="chart-description">Student strength trends by program over the last 5 years.</p>
            </div>
            <div className="filter-panel">
              <div className="filter-header">
                <h3>Filters</h3>
                <button className="clear-filters-btn" onClick={handleClearProgramTrendFilters}>Clear All Filters</button>
              </div>
              <div className="filter-grid">
                <div className="filter-group">
                  <label>Category</label>
                  <select value={programTrendFilters.category || 'All'} onChange={e => handleProgramTrendFilterChange('category', e.target.value)} className="filter-select">
                    <option value="All">All</option>
                    {filterOptions.category.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>State</label>
                  <select value={programTrendFilters.state || 'All'} onChange={e => handleProgramTrendFilterChange('state', e.target.value)} className="filter-select">
                    <option value="All">All</option>
                    {filterOptions.state.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className={`bar-chart-container trend-chart ${hasProgramTrendData ? '' : 'has-empty'}`}>
              <h3 className="chart-heading">Student Strength by Program (Trend)</h3>
              <div className={`trend-empty-state ${hasProgramTrendData ? 'hidden' : ''}`}><p>No information available for the selected filter</p></div>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={programTrendData.slice(-5)} margin={{ top: 12, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                  <XAxis dataKey="year" angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} />
                  <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.82rem', paddingBottom: '8px' }} />
                  {programTrendPrograms.map((p, i) => (
                    <Bar key={p} dataKey={p} stackId="a" fill={TREND_COLORS[i % TREND_COLORS.length]} {...BAR_ANIMATION} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── 3. Student Strength by Program ── */}
          <div className={`chart-view ${activeChart === 'programStrength' ? 'active' : ''}`}>
            <div className="chart-header"><h2>Student Strength by Program</h2></div>
            {strengthError && <div className="error-message">{strengthError}</div>}
            <div className="filter-panel">
              <div className="filter-header">
                <h3>Filters</h3>
                <button className="clear-filters-btn" onClick={handleClearStrengthFilters}>Clear All Filters</button>
              </div>
              <div className="filter-grid">
                <div className="filter-group">
                  <label>Year of Admission</label>
                  <select
                    value={strengthFilters.yearofadmission === 'All' ? 'All' : strengthFilters.yearofadmission || ''}
                    onChange={e => { const v = e.target.value; handleStrengthFilterChange('yearofadmission', v === 'All' ? 'All' : v === '' ? null : parseInt(v)); }}
                    className="filter-select">
                    <option value="">Select Year</option>
                    <option value="All">All</option>
                    {filterOptions.yearofadmission.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Category</label>
                  <select value={strengthFilters.category || 'All'} onChange={e => handleStrengthFilterChange('category', e.target.value)} className="filter-select">
                    <option value="All">All</option>
                    {filterOptions.category.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>State</label>
                  <select value={strengthFilters.state || 'All'} onChange={e => handleStrengthFilterChange('state', e.target.value)} className="filter-select">
                    <option value="All">All</option>
                    {filterOptions.state.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className={`bar-chart-container trend-chart ${hasStrengthData ? '' : 'has-empty'}`}>
              <h3 className="chart-heading">Student Strength by Program</h3>
              <div className={`trend-empty-state ${hasStrengthData ? 'hidden' : ''}`}><p>No information available for the selected filter</p></div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={studentStrengthData} margin={{ top: 12, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                  <XAxis dataKey="name" angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} />
                  <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} />
                  <Tooltip content={<StackedBarTooltip total={strengthTotal} />} />
                  <Legend
                    verticalAlign="top" align="center"
                    content={(props) => <InlineLegend {...props} />}
                  />
                  <Bar dataKey="Male" stackId="a" fill="#667eea" {...BAR_ANIMATION} />
                  <Bar dataKey="Female" stackId="a" fill="#764ba2" {...BAR_ANIMATION} />
                  <Bar dataKey="Transgender" stackId="a" fill="#f093fb" {...BAR_ANIMATION} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        <DataUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} tableName="student_table" token={token} />
      </div>
    </div>
  );
}

const StackedBarTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const programTotal = (data.Male || 0) + (data.Female || 0) + (data.Transgender || 0);
    const percentage = total > 0 ? ((programTotal / total) * 100).toFixed(1) : 0;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{`${data.name}: ${programTotal}`}</p>
        <p className="tooltip-percentage">{percentage}% of total</p>
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #eee' }}>
          <p style={{ color: '#667eea', margin: '0.2rem 0', fontSize: '0.85rem' }}>Male: {data.Male || 0}</p>
          <p style={{ color: '#764ba2', margin: '0.2rem 0', fontSize: '0.85rem' }}>Female: {data.Female || 0}</p>
          <p style={{ color: '#f093fb', margin: '0.2rem 0', fontSize: '0.85rem' }}>Transgender: {data.Transgender || 0}</p>
        </div>
      </div>
    );
  }
  return null;
};

export default AcademicSection;