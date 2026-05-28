import { useState, useEffect, useMemo } from 'react';
import useDebounce from '../utils/useDebounce';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';
import {
  fetchFilterOptions, fetchGenderDistributionFiltered, fetchGenderTrends,
  fetchProgramTrends, fetchCumulativeStudentSummary, fetchOnrollSummary, fetchStateDistributionFiltered
} from '../services/academicStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import './Page.css';
import './AcademicSection.css';
import '../DesignSystem.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import { getOrderedLegend } from '../utils/chartUtils';
import LastUpdated from './LastUpdated';

const COLORS = ['#667eea', '#764ba2', '#f093fb'];

const GROUP_COLORS = { UG: '#4f46e5', PG: '#f97316', Research: '#06b6d4', Total: '#22c55e' };

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

// ── Pie distribution table (desktop: table / mobile: card list) ─────────────
function PieDistributionTable({ data, nameKey, total, colors }) {
  if (!data?.length) return null;
  const isMobile = window.innerWidth <= 640;

  if (isMobile) {
    return (
      <div className="dist-card-list">
        {data.map((entry, index) => {
          const fill = entry.fill || colors[index % colors.length];
          const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={index} className="dist-card">
              <div className="dist-card-name">
                <span className="table-dot" style={{ background: fill }} />
                <span>{entry[nameKey]}</span>
              </div>
              <div className="dist-card-stats">
                <div className="dist-card-count">{entry.count}</div>
                <div className="dist-card-pct">{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="num">Count</th>
            <th className="num">% of Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => {
            const fill = entry.fill || colors[index % colors.length];
            const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0.0';
            return (
              <tr key={index}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="table-dot" style={{ background: fill }} />
                    {entry[nameKey]}
                  </div>
                </td>
                <td className="num">{entry.count}</td>
                <td className="num ac-pct-td">{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getProgramGroup(prog) {
  const p = prog.toLowerCase();
  if (p.includes('b.tech') || p.includes('btech') || /\bug\b/.test(p)) return 'UG';
  if (p.includes('ph') && (p.includes('.d') || p.includes('d.'))) return 'Research';
  if ((p.includes('ms') || p.includes('m.s')) && p.includes('research')) return 'Research';
  if (p.includes('mse') && p.includes('research')) return 'Research';
  return 'PG';
}

const AREA_COLORS = {
  Total:       { stroke: '#667eea', fill: 'url(#colorTotal)' },
  Male:        { stroke: '#667eea', fill: 'url(#colorMale)' },
  Female:      { stroke: '#764ba2', fill: 'url(#colorFemale)' },
  Transgender: { stroke: '#f093fb', fill: 'url(#colorTransgender)' },
};

const BAR_ANIMATION = {
  isAnimationActive: true, animationDuration: 700,
  animationEasing: 'ease-out', animationBegin: 80,
};

const TICK_STYLE = { fill: '#444', fontSize: 14, fontWeight: 400 };
const AXIS_LABEL_STYLE = { textAnchor: 'middle', fill: '#555', fontSize: 13, fontWeight: 500 };

const AreaGradients = () => (
  <defs>
    <linearGradient id="colorTotal"       x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#667eea" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorMale"        x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#667eea" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorFemale"      x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#764ba2" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#764ba2" stopOpacity={0} />
    </linearGradient>
    <linearGradient id="colorTransgender" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor="#f093fb" stopOpacity={0.72} />
      <stop offset="95%" stopColor="#f093fb" stopOpacity={0} />
    </linearGradient>
  </defs>
);

// Custom recharts legend rendered as an ordered list
function ChartLegendContent({ payload, orderedKeys, isMobile }) {
  const ordered = getOrderedLegend(payload, orderedKeys);
  return (
    <ul className="chart-legend-inline" style={{ gap: isMobile ? '8px' : '16px', fontSize: isMobile ? '0.7rem' : '0.82rem' }}>
      {ordered.map(entry => (
        <li key={entry.dataKey} className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

// Shared filter panel
function SharedFilters({
  mode,
  token,
  selectedGender, setSelectedGender,
  trendYears, setTrendYears,
  genderTrendFilters, handleGenderTrendFilterChange, handleClearGenderTrendFilters,
  programTrendFilters, handleProgramTrendFilterChange, handleClearProgramTrendFilters,
  stateDistributionFilters, handleStateDistributionFilterChange, handleClearStateDistributionFilters,
  stackGender, setStackGender,
}) {
  const isGender  = mode === 'gender';
  const isProgram = mode === 'program';
  const isState   = mode === 'state';

  const filters  = isGender ? genderTrendFilters  : (isProgram ? programTrendFilters  : stateDistributionFilters);
  const onChange = isGender ? handleGenderTrendFilterChange : (isProgram ? handleProgramTrendFilterChange : handleStateDistributionFilterChange);
  const onClear  = isGender ? handleClearGenderTrendFilters : (isProgram ? handleClearProgramTrendFilters : handleClearStateDistributionFilters);

  const [localOptions, setLocalOptions] = useState({
    program: [], batch: [], branch: [], department: [], category: [], state: [],
  });

  useEffect(() => {
    let isMounted = true;
    const loadOptions = async () => {
      try {
        const options = await fetchFilterOptions(filters, token);
        if (!isMounted) return;
        setLocalOptions(options);

        const activeFilters = { ...filters };
        let hasChanges = false;
        ['program', 'batch', 'department', 'state'].forEach(key => {
          if (activeFilters[key] && activeFilters[key] !== 'All' && options[key] && !options[key].map(String).includes(String(activeFilters[key]))) {
            activeFilters[key] = null;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          if (isGender)  ['program', 'batch', 'department', 'state'].forEach(k => { if (activeFilters[k] === null && genderTrendFilters[k]  !== null) handleGenderTrendFilterChange(k, 'All'); });
          if (isProgram) ['program', 'batch', 'department', 'state'].forEach(k => { if (activeFilters[k] === null && programTrendFilters[k] !== null) handleProgramTrendFilterChange(k, 'All'); });
          if (isState)   ['program', 'batch', 'department', 'state'].forEach(k => { if (activeFilters[k] === null && stateDistributionFilters[k] !== null) handleStateDistributionFilterChange(k, 'All'); });
        }
      } catch (err) {
        console.error('Failed to load local filter options', err);
      }
    };
    loadOptions();
    return () => { isMounted = false; };
  }, [filters, token, genderTrendFilters, handleGenderTrendFilterChange, handleProgramTrendFilterChange, handleStateDistributionFilterChange, isGender, isProgram, isState, programTrendFilters, stateDistributionFilters, handleClearGenderTrendFilters, handleClearProgramTrendFilters, handleClearStateDistributionFilters]);

  return (
    <div className="shared-filter-panel">
      <div className="shared-filter-panel-header">
        <span className="shared-filter-panel-title">Filters</span>
        <button className="clear-filters-btn" onClick={onClear}>Clear All Filters</button>
      </div>

      <div className="shared-filter-grid">

        {(isGender || isState) && (
          <div className="shared-filter-item">
            <label className="shared-filter-label">Gender</label>
            {isGender ? (
              <select value={selectedGender} onChange={e => setSelectedGender(e.target.value)} className="filter-select filter-select-sm">
                <option value="All">M:F:T</option>
                <option value="Total">Total</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Transgender">Transgender</option>
              </select>
            ) : (
              <select value={filters.gender || 'All'} onChange={e => onChange('gender', e.target.value)} className="filter-select filter-select-sm">
                <option value="All">M:F:T</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Transgender">Transgender</option>
              </select>
            )}
          </div>
        )}

        {isProgram && (
          <div className="shared-filter-item">
            <label className="shared-filter-label">Gender Stack</label>
            <select value={stackGender ? 'yes' : 'no'} onChange={e => setStackGender(e.target.value === 'yes')} className="filter-select filter-select-sm">
              <option value="yes">Stacked</option>
              <option value="no">Totals Only</option>
            </select>
          </div>
        )}

        <div className="shared-filter-item">
          <label className="shared-filter-label">Program</label>
          <select value={filters.program || 'All'} onChange={e => onChange('program', e.target.value)} className="filter-select filter-select-sm">
            <option value="All">All</option>
            {localOptions.program.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="shared-filter-item">
          <label className="shared-filter-label">Batch</label>
          <select value={filters.batch || 'All'} onChange={e => onChange('batch', e.target.value)} className="filter-select filter-select-sm">
            <option value="All">All</option>
            {localOptions.batch.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="shared-filter-item">
          <label className="shared-filter-label">Department</label>
          <select value={filters.department || 'All'} onChange={e => onChange('department', e.target.value)} className="filter-select filter-select-sm">
            <option value="All">All</option>
            {localOptions.department.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="shared-filter-item">
          <label className="shared-filter-label">State</label>
          <select value={filters.state || 'All'} onChange={e => onChange('state', e.target.value)} className="filter-select filter-select-sm">
            <option value="All">All</option>
            {localOptions.state.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {(isGender || isProgram) && (
          <div className="shared-filter-item">
            <label className="shared-filter-label">No. of Years</label>
            <select value={trendYears} onChange={e => setTrendYears(parseInt(e.target.value, 10))} className="filter-select filter-select-sm">
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
    department: [], category: [], state: [], latest_year: null,
  });

  const [summaryYear, setSummaryYear] = useState('All');
  const [cumulativeSummary, setCumulativeSummary] = useState({ total_students: 0, ug_total: 0, pg_total: 0, research_total: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [onrollSummary, setOnrollSummary] = useState({ total_onroll: 0, ug_onroll: 0, pg_onroll: 0, research_onroll: 0 });
  const [onrollLoading, setOnrollLoading] = useState(false);

  const [filters, setFilters] = useState({
    yearofadmission: null, program: null, batch: null, branch: null,
    department: null, category: null, pwd: null,
  });
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [_total, setTotal] = useState(0);
  const [_genderData, setGenderData] = useState({ Male: 0, Female: 0, Transgender: 0 });

  const [selectedGender, setSelectedGender] = useState('All');
  const [chartType, setChartType] = useState('Bar');
  const [trendYears, setTrendYears] = useState(10);
  const [programChartMode, setProgramChartMode] = useState('gender');
  const [stackGender, setStackGender] = useState(false);

  const [genderTrendData, setGenderTrendData] = useState([]);
  const [_genderTrendLoading, setGenderTrendLoading] = useState(true);
  const [genderTrendFilters, setGenderTrendFilters] = useState({
    program: null, batch: null, department: null, state: null, category: null, pwd: null,
  });

  const [programTrendData, setProgramTrendData] = useState([]);
  const [programTrendPrograms, setProgramTrendPrograms] = useState([]);
  const [genderByGroup, setGenderByGroup] = useState([]);
  const [_programTrendLoading, setProgramTrendLoading] = useState(true);
  const [programTrendFilters, setProgramTrendFilters] = useState({
    program: null, batch: null, department: null, state: null, category: null, pwd: null,
  });

  const [stateDistribution, setStateDistribution] = useState([]);
  const [_stateDistributionLoading, setStateDistributionLoading] = useState(true);
  const [stateDistributionFilters, setStateDistributionFilters] = useState({
    gender: null, program: null, batch: null, department: null, state: null,
  });

  const token = localStorage.getItem('authToken');

  const serializedFilters = useMemo(() => JSON.stringify(filters), [filters]);
  const serializedGTF     = useMemo(() => JSON.stringify(genderTrendFilters), [genderTrendFilters]);
  const serializedPTF     = useMemo(() => JSON.stringify(programTrendFilters), [programTrendFilters]);
  const serializedSDF     = useMemo(() => JSON.stringify(stateDistributionFilters), [stateDistributionFilters]);

  const debouncedFilters = useDebounce(serializedFilters, 300);
  const debouncedGTF     = useDebounce(serializedGTF, 300);
  const debouncedPTF     = useDebounce(serializedPTF, 300);
  const debouncedSDF     = useDebounce(serializedSDF, 300);

  const isGuestUser    = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin        = user?.role_id === 3 || user?.role_id === 4;
  const showUploadBtn  = !isReadOnlyView && isAdmin;

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  const [expandedChart, setExpandedChart] = useState(null);

  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle, { passive: true });
    return () => window.removeEventListener('resize', handle);
  }, []);

  const CM_LABEL   = chartIsMobile ? { top: 20, right: 12, left: 40, bottom: 40 } : { top: 26, right: 30, left: 55, bottom: 60 };
  const CM_NOLABEL = chartIsMobile ? { top: 20, right: 12, left: 5,  bottom: 40 } : { top: 26, right: 30, left: 20, bottom: 60 };
  const Y_AXIS_W   = chartIsMobile ? 32 : 45;
  const X_INTERVAL = chartIsMobile ? 1 : 0;

  const availableYears = useMemo(() => {
    if (!filterOptions.yearofadmission?.length) return ['All'];
    return ['All', ...[...filterOptions.yearofadmission].sort((a, b) => b - a).map(String)];
  }, [filterOptions.yearofadmission]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const options = await fetchFilterOptions(null, token);
        if (!isMounted) return;
        setFilterOptions(options);
        if (!filters.yearofadmission && options.latest_year) {
          setFilters(prev => ({ ...prev, yearofadmission: options.latest_year }));
        }
      } catch { if (isMounted) setError('Failed to load filter options. Please try again.'); }
      finally { if (isMounted) setLoading(false); }
    };
    load();
    return () => { isMounted = false; };
  }, [token, uploadVersion, filters.yearofadmission]);

  useEffect(() => {
    const load = async () => {
      try {
        setSummaryLoading(true);
        const r = await fetchCumulativeStudentSummary(summaryYear === 'All' ? null : summaryYear, token);
        setCumulativeSummary({ total_students: r.total_students || 0, ug_total: r.ug_total || 0, pg_total: r.pg_total || 0, research_total: r.research_total || 0 });
      } catch (err) { console.error('Failed to load cumulative summary:', err); }
      finally { setSummaryLoading(false); }
    };
    load();
  }, [token, summaryYear, uploadVersion]);

  useEffect(() => {
    const load = async () => {
      try {
        setOnrollLoading(true);
        const r = await fetchOnrollSummary(token);
        setOnrollSummary({ total_onroll: r.total_onroll || 0, ug_onroll: r.ug_onroll || 0, pg_onroll: r.pg_onroll || 0, research_onroll: r.research_onroll || 0 });
      } catch (err) { console.error('Failed to load on-roll summary:', err); }
      finally { setOnrollLoading(false); }
    };
    load();
  }, [token, uploadVersion]);

  useEffect(() => {
    const parsedFilters = JSON.parse(debouncedFilters);
    const load = async () => {
      if (parsedFilters.yearofadmission === null) return;
      try { setLoading(true); setError(null); const r = await fetchGenderDistributionFiltered(parsedFilters, token); setGenderData(r.data); setTotal(r.total); }
      catch { setError('Failed to load gender distribution data.'); }
      finally { setLoading(false); }
    };
    load();
  }, [debouncedFilters, token, uploadVersion]);

  useEffect(() => {
    const parsedGTF = JSON.parse(debouncedGTF);
    const load = async () => {
      try { setGenderTrendLoading(true); const r = await fetchGenderTrends(parsedGTF, token); setGenderTrendData(r.data); }
      catch (err) { console.error(err); }
      finally { setGenderTrendLoading(false); }
    };
    load();
  }, [debouncedGTF, token, uploadVersion]);

  useEffect(() => {
    const parsedPTF = JSON.parse(debouncedPTF);
    const load = async () => {
      try {
        setProgramTrendLoading(true);
        const r = await fetchProgramTrends(parsedPTF, token);
        setProgramTrendData(r.data);
        setProgramTrendPrograms(r.programs);
        setGenderByGroup(r.gender_by_group || []);
      } catch (err) { console.error(err); }
      finally { setProgramTrendLoading(false); }
    };
    load();
  }, [debouncedPTF, token, uploadVersion]);

  useEffect(() => {
    const parsedSDF = JSON.parse(debouncedSDF);
    const load = async () => {
      try {
        setStateDistributionLoading(true);
        const r = await fetchStateDistributionFiltered(parsedSDF, token);
        setStateDistribution(r.data || []);
      } catch (err) { console.error(err); }
      finally { setStateDistributionLoading(false); }
    };
    load();
  }, [debouncedSDF, token, uploadVersion]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const displayGenderTrendData = useMemo(() => {
    if (!genderTrendData?.length) return [];
    const sliced = genderTrendData.slice(-trendYears);
    if (selectedGender === 'Total') return sliced.map(d => ({ year: d.year, Total: (d.Male || 0) + (d.Female || 0) + (d.Transgender || 0) }));
    return sliced;
  }, [genderTrendData, trendYears, selectedGender]);

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
      return { year: row.year, UG_Male: 0, UG_Female: 0, UG_Transgender: 0, UG_Total: ug, PG_Male: 0, PG_Female: 0, PG_Transgender: 0, PG_Total: pg, Research_Male: 0, Research_Female: 0, Research_Transgender: 0, Research_Total: research, Total: ug + pg + research };
    });
    return source.slice(-trendYears);
  }, [genderByGroup, programTrendData, programTrendPrograms, trendYears]);

  const hasTrendData        = displayGenderTrendData.some(d => (d.Total || 0) > 0 || (d.Male || 0) > 0 || (d.Female || 0) > 0);
  const hasProgramTrendData = ugPgResearchTrend.length > 0 && ugPgResearchTrend.some(d => d.Total > 0);

  const stateTop10 = useMemo(() => {
    const sorted = [...stateDistribution].filter(i => i.state && i.state !== 'Not Found' && i.state.toLowerCase() !== 'unknown').sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    if (rest.length > 0) top5.push({ state: 'Others', count: rest.reduce((s, i) => s + i.count, 0), fill: '#a1a1aa' });
    return top5;
  }, [stateDistribution]);

  const stateTotal = useMemo(() => stateDistribution.reduce((s, i) => s + i.count, 0), [stateDistribution]);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleGenderTrendFilterChange         = (n, v) => setGenderTrendFilters(prev       => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearGenderTrendFilters         = ()     => { setGenderTrendFilters({ program: null, batch: null, department: null, state: null, category: null, pwd: null }); setTrendYears(10); setSelectedGender('All'); setChartType('Bar'); };
  const handleProgramTrendFilterChange        = (n, v) => setProgramTrendFilters(prev      => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearProgramTrendFilters        = ()     => { setProgramTrendFilters({ program: null, batch: null, department: null, state: null, category: null, pwd: null }); setTrendYears(10); setStackGender(false); };
  const handleStateDistributionFilterChange   = (n, v) => setStateDistributionFilters(prev => ({ ...prev, [n]: v === 'All' ? null : v }));
  const handleClearStateDistributionFilters   = ()     => { setStateDistributionFilters({ gender: null, program: null, batch: null, department: null, state: null }); };

  const areaKeys = selectedGender === 'All' ? ['Male', 'Female', 'Transgender'] : [selectedGender];

  const programStackedBars = useMemo(() => {
    if (!stackGender) {
      return [
        { key: 'UG_Total',       name: 'UG',       fill: GROUP_COLORS.UG },
        { key: 'PG_Total',       name: 'PG',       fill: GROUP_COLORS.PG },
        { key: 'Research_Total', name: 'Research', fill: GROUP_COLORS.Research },
        { key: 'Total',          name: 'Total',    fill: GROUP_COLORS.Total },
      ];
    }
    return [
      { key: 'UG_Male',          name: 'UG Male',          stackId: 'UG',       fill: '#4f46e5' },
      { key: 'UG_Female',        name: 'UG Female',        stackId: 'UG',       fill: '#818cf8' },
      { key: 'UG_Transgender',   name: 'UG Transgender',   stackId: 'UG',       fill: '#c7d2fe' },
      { key: 'PG_Male',          name: 'PG Male',          stackId: 'PG',       fill: '#f97316' },
      { key: 'PG_Female',        name: 'PG Female',        stackId: 'PG',       fill: '#fb923c' },
      { key: 'PG_Transgender',   name: 'PG Transgender',   stackId: 'PG',       fill: '#fed7aa' },
      { key: 'Research_Male',    name: 'Research Male',    stackId: 'Research', fill: '#06b6d4' },
      { key: 'Research_Female',  name: 'Research Female',  stackId: 'Research', fill: '#22d3ee' },
      { key: 'Research_Transgender', name: 'Research Transgender', stackId: 'Research', fill: '#a5f3fc' },
      { key: 'Total',            name: 'Total',            stackId: 'Total',    fill: GROUP_COLORS.Total },
    ];
  }, [stackGender]);

  // On-roll card data
  const onrollCards = [
    { label: 'Total Students On Roll', icon: '🎯', value: onrollSummary.total_onroll, grad: 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)', shadow: 'rgba(17,153,142,0.25)',   subtitle: 'Total on roll students' },
    { label: 'UG',       icon: '📘', value: onrollSummary.ug_onroll,       grad: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)', shadow: 'rgba(79,70,229,0.2)',    subtitle: 'BTech — On Roll' },
    { label: 'PG',       icon: '🎓', value: onrollSummary.pg_onroll,       grad: 'linear-gradient(135deg,#f97316 0%,#ea580c 100%)', shadow: 'rgba(249,115,22,0.2)',   subtitle: 'MTech and MSc — On Roll' },
    { label: 'Research', icon: '🔬', value: onrollSummary.research_onroll, grad: 'linear-gradient(135deg,#06b6d4 0%,#0891b2 100%)', shadow: 'rgba(6,182,212,0.2)',    subtitle: 'PhD and MS (By Research) — On Roll' },
  ];

  // Summary card data
  const summaryCards = [
    { label: 'Total Students', icon: '👥', value: cumulativeSummary.total_students, grad: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', shadow: 'rgba(102,126,234,0.2)', subtitle: summaryYear === 'All' ? 'Cumulative students' : `Admitted in ${summaryYear}` },
    { label: 'UG',             icon: '📘', value: cumulativeSummary.ug_total,       grad: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)', shadow: 'rgba(79,70,229,0.2)',    subtitle: 'BTech' },
    { label: 'PG',             icon: '🎓', value: cumulativeSummary.pg_total,       grad: 'linear-gradient(135deg,#f97316 0%,#ea580c 100%)', shadow: 'rgba(249,115,22,0.2)',   subtitle: 'MTech and MSc' },
    { label: 'Research',       icon: '📖', value: cumulativeSummary.research_total, grad: 'linear-gradient(135deg,#06b6d4 0%,#0891b2 100%)', shadow: 'rgba(6,182,212,0.2)',    subtitle: 'MS and PHD' },
  ];

  // Pie tooltip
  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="pie-tooltip">
        <p className="pie-tooltip-title">{d.state}</p>
        <p className="pie-tooltip-count">Count: {d.count}</p>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
            ← Back to People &amp; Campus
          </button>
        )}

        {showUploadBtn && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Student Overview</h1>
              <LastUpdated tables={['student_table', 'courses_table', 'nptel_courses', 'faculty_engagement', 'alumni']} />
            </div>
            <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
              Upload Data
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {/* ══ On-Roll Students ══════════════════════════════════════════════ */}
        <div className="export-row">
          <ExportMenu
            elementId="academic-onroll-cards-container"
            data={[onrollSummary]}
            headers={['Total On Roll', 'UG', 'PG', 'Research']}
            keys={['total_onroll', 'ug_onroll', 'pg_onroll', 'research_onroll']}
            filename="students_on_roll"
            title="Students On Roll"
          />
        </div>

        <div id="academic-onroll-cards-container" className="summary-cards-grid-4">
          {onrollCards.map(({ label, icon, value, grad, shadow, subtitle }, idx) => {
            const delay = onrollLoading ? 0 : idx * 55;
            const t = onrollLoading
              ? 'opacity 0.15s ease-in, transform 0.15s ease-in'
              : `opacity 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms, transform 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms`;
            return (
              <div key={label} className="metric-card" style={{ background: grad, boxShadow: `0 10px 20px ${shadow}` }}>
                <div className="metric-card-glow" />
                <div className="metric-card-inner">
                  <div className="metric-card-icon-row">
                    <span className="metric-card-icon">{icon}</span>
                    <span className="metric-card-label">{label}</span>
                  </div>
                  <div
                    className="metric-card-value"
                    style={{ opacity: onrollLoading ? 0 : 1, transform: onrollLoading ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)', transition: t, willChange: 'opacity, transform' }}
                  >
                    {value}
                  </div>
                  <div className="metric-card-footer">
                    <span className="metric-card-dot" />
                    <span className="metric-card-subtitle" style={{ opacity: onrollLoading ? 0 : 1, transform: onrollLoading ? 'translateY(4px)' : 'translateY(0)', transition: t }}>{subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ Student Summary ══════════════════════════════════════════════ */}
        <div className="export-row export-row-top">
          <ExportMenu
            elementId="academic-summary-cards-container"
            data={[cumulativeSummary]}
            headers={['Total Students', 'UG', 'PG', 'Research']}
            keys={['total_students', 'ug_total', 'pg_total', 'research_total']}
            filename="student_summary"
            title="Student Summary"
          />
        </div>

        <div id="academic-summary-cards-container" className="summary-cards-grid-5">
          {/* Year filter card */}
          <div className="metric-card ac-year-filter-card">
            <div className="metric-card-glow" />
            <div className="metric-card-inner">
              <div className="metric-card-icon-row">
                <span className="metric-card-icon">📅</span>
                <span className="metric-card-label">Filter by Year</span>
              </div>
              <select
                value={summaryYear}
                onChange={e => setSummaryYear(e.target.value)}
                className="metric-card-filter-select"
              >
                {availableYears.map(y => <option key={y} value={y} style={{ color: '#333', background: '#fff' }}>{y === 'All' ? 'All Years' : y}</option>)}
              </select>
              <div className="metric-card-footer ac-year-card-footer">
                <span className="metric-card-dot" />
                <span className="metric-card-subtitle">Focus on a specific year</span>
              </div>
            </div>
          </div>

          {summaryCards.map(({ label, icon, value, grad, shadow, subtitle }, idx) => {
            const delay = summaryLoading ? 0 : idx * 55;
            const t = summaryLoading
              ? 'opacity 0.15s ease-in, transform 0.15s ease-in'
              : `opacity 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms, transform 0.45s cubic-bezier(0.2,0,0,1) ${delay}ms`;
            return (
              <div key={label} className="metric-card" style={{ background: grad, boxShadow: `0 10px 20px ${shadow}` }}>
                <div className="metric-card-glow" />
                <div className="metric-card-inner">
                  <div className="metric-card-icon-row">
                    <span className="metric-card-icon">{icon}</span>
                    <span className="metric-card-label">{label}</span>
                  </div>
                  <div
                    className="metric-card-value"
                    style={{ opacity: summaryLoading ? 0 : 1, transform: summaryLoading ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)', transition: t, willChange: 'opacity, transform' }}
                  >
                    {value}
                  </div>
                  <div className="metric-card-footer">
                    <span className="metric-card-dot" />
                    <span className="metric-card-subtitle" style={{ opacity: summaryLoading ? 0 : 1, transform: summaryLoading ? 'translateY(4px)' : 'translateY(0)', transition: t }}>{subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ Charts ════════════════════════════════════════════════════════ */}
        <div className="chart-section">

          {/* Mode toggle */}
          <div className="mode-toggle-row">
            {[{ key: 'gender', label: 'Gender Breakdown' }, { key: 'program', label: 'UG / PG / Research' }, { key: 'state', label: 'State Distribution' }].map(({ key, label }) => (
              <button key={key} onClick={() => setProgramChartMode(key)} className={`mode-btn${programChartMode === key ? ' active' : ''}`}>{label}</button>
            ))}
          </div>

          {/* Shared filter panel */}
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
            stateDistributionFilters={stateDistributionFilters}
            handleStateDistributionFilterChange={handleStateDistributionFilterChange}
            handleClearStateDistributionFilters={handleClearStateDistributionFilters}
            stackGender={stackGender} setStackGender={setStackGender}
            token={token}
          />

          {/* Bar / Trend toggle */}
          {(programChartMode === 'gender' || programChartMode === 'program') && (
            <div className="chart-mode-row">
              {['Bar', 'Trend'].map(mode => (
                <button key={mode} onClick={() => setChartType(mode)} className={`mode-btn${chartType === mode ? ' active' : ''}`}>
                  {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                </button>
              ))}
            </div>
          )}

          {/* ── Gender breakdown charts ── */}
          {programChartMode === 'gender' && (
            <div className={`bar-chart-container trend-chart${hasTrendData ? '' : ' has-empty'}`}>
              <div className={`trend-empty-state${hasTrendData ? ' hidden' : ''}`}><p>No information available for the selected filter</p></div>

              <div className="export-row">
                <ExportMenu
                  elementId={chartType === 'Bar' ? 'academic-gender-bar-chart' : 'academic-gender-trend-chart'}
                  data={displayGenderTrendData}
                  headers={['Year', 'Total', 'Male', 'Female', 'Transgender']}
                  keys={['year', 'Total', 'Male', 'Female', 'Transgender']}
                  filename="academic_gender_trend"
                  title="Gender Trend"
                />
              </div>

              {/* Trend (line) */}
              <div
                id="academic-gender-trend-chart"
                className={`chart-wrapper clickable-chart${chartType === 'Trend' ? ' active' : ' inactive'}`}
                onClick={() => setExpandedChart({
                  title: 'Gender Breakdown Trend',
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={displayGenderTrendData} margin={{ top: 40, right: 40, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                        <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -15, style: AXIS_LABEL_STYLE }} />
                        <YAxis domain={[0, 'dataMax + 10']} allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W + 10} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: 0, style: AXIS_LABEL_STYLE }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.9rem', paddingBottom: '20px' }} />
                        {areaKeys.map(key => (
                          <Line key={key} type="linear" dataKey={key} stroke={AREA_COLORS[key]?.stroke || '#667eea'} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }}>
                            <LabelList dataKey={key} position="top" style={{ fontSize: '11px', fontWeight: 600, fill: AREA_COLORS[key]?.stroke || '#667eea' }} />
                          </Line>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ),
                })}
              >
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={displayGenderTrendData} margin={CM_LABEL}>
                    <AreaGradients />
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis dataKey="year" interval={X_INTERVAL} angle={-40} textAnchor="end" height={chartIsMobile ? 50 : 65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                    <YAxis domain={[0, 'dataMax + 10']} allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.82rem', paddingBottom: '8px' }}
                      content={(props) => <ChartLegendContent payload={props.payload} orderedKeys={areaKeys} isMobile={chartIsMobile} />}
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
              <div
                id="academic-gender-bar-chart"
                className={`chart-wrapper clickable-chart${chartType === 'Bar' ? ' active' : ' inactive'}`}
                onClick={() => setExpandedChart({
                  title: 'Gender Breakdown Bar Chart',
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={displayGenderTrendData} margin={{ top: 40, right: 40, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                        <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -15, style: AXIS_LABEL_STYLE }} />
                        <YAxis domain={[0, 'dataMax + 10']} allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W + 10} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: 0, style: AXIS_LABEL_STYLE }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.9rem', paddingBottom: '20px' }} />
                        {areaKeys.map(key => (
                          <Bar key={key} dataKey={key} fill={AREA_COLORS[key]?.stroke || '#667eea'} radius={[6, 6, 0, 0]}>
                            <LabelList dataKey={key} position="top" style={{ fontSize: '12px', fontWeight: 700, fill: '#1a2744' }} />
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ),
                })}
              >
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={displayGenderTrendData} margin={CM_LABEL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis dataKey="year" interval={X_INTERVAL} angle={-40} textAnchor="end" height={chartIsMobile ? 50 : 65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                    <YAxis domain={[0, 'dataMax + 10']} allowDecimals={false} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.82rem', paddingBottom: '8px' }}
                      content={(props) => <ChartLegendContent payload={props.payload} orderedKeys={areaKeys} isMobile={chartIsMobile} />}
                    />
                    {selectedGender === 'Total'       && <Bar dataKey="Total"       fill="#667eea" radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Total"       position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} /></Bar>}
                    {selectedGender === 'All' && <>
                      <Bar dataKey="Male"        fill={COLORS[0]} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Male"        position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[0] }} /></Bar>
                      <Bar dataKey="Female"      fill={COLORS[1]} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Female"      position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[1] }} /></Bar>
                      <Bar dataKey="Transgender" fill={COLORS[2]} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Transgender" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[2] }} /></Bar>
                    </>}
                    {selectedGender === 'Male'        && <Bar dataKey="Male"        fill={COLORS[0]} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Male"        position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[0] }} /></Bar>}
                    {selectedGender === 'Female'      && <Bar dataKey="Female"      fill={COLORS[1]} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Female"      position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[1] }} /></Bar>}
                    {selectedGender === 'Transgender' && <Bar dataKey="Transgender" fill={COLORS[2]} radius={[3,3,0,0]} isAnimationActive animationDuration={800} animationEasing="ease-in-out"><LabelList dataKey="Transgender" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: COLORS[2] }} /></Bar>}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── UG / PG / Research chart ── */}
          {programChartMode === 'program' && (
            <div className={`bar-chart-container trend-chart${hasProgramTrendData ? '' : ' has-empty'}`}>
              <div className={`trend-empty-state${hasProgramTrendData ? ' hidden' : ''}`}><p>No information available for the selected filter</p></div>

              <div className="chart-title-row">
                <h3 className="chart-heading">
                  Student Strength — UG / PG / Research / Total
                  {stackGender && <span className="text-muted text-sm acad-stacked-hint">(stacked by gender)</span>}
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

              {/* Bar chart */}
              <div
                id="academic-program-strength-chart"
                className={`chart-wrapper clickable-chart${chartType === 'Bar' ? ' active' : ' inactive'}`}
                onClick={() => setExpandedChart({
                  title: 'Student Strength — UG / PG / Research',
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={ugPgResearchTrend} margin={{ top: 40, right: 40, left: 60, bottom: 60 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                        <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -15, style: AXIS_LABEL_STYLE }} />
                        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W + 10} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: 0, style: AXIS_LABEL_STYLE }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.9rem', paddingBottom: '20px' }} />
                        {programStackedBars.map(({ key, name, fill, stackId }) => (
                          <Bar key={key} dataKey={key} name={name} fill={fill} stackId={stackId} radius={stackId ? (programStackedBars.filter(b => b.stackId === stackId).at(-1)?.key === key ? [6,6,0,0] : [0,0,0,0]) : [6,6,0,0]}>
                            {(!stackId || programStackedBars.filter(b => b.stackId === stackId).at(-1)?.key === key) && <LabelList dataKey={stackId ? `${stackId}_Total` : key} position="top" style={{ fontSize: '11px', fontWeight: 700, fill }} />}
                          </Bar>
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  ),
                })}
              >
                <ResponsiveContainer width="100%" height={stackGender ? 480 : 420}>
                  <BarChart data={ugPgResearchTrend} margin={CM_NOLABEL} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis dataKey="year" interval={chartIsMobile ? 1 : 0} angle={-40} textAnchor="end" height={chartIsMobile ? 50 : 65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                    <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.78rem', paddingBottom: '8px' }}
                      content={(props) => <ChartLegendContent payload={props.payload} orderedKeys={programStackedBars.map(b => b.key)} isMobile={chartIsMobile} />}
                    />
                    {programStackedBars.map(({ key, name, fill, stackId }) => (
                      <Bar key={key} dataKey={key} name={name} fill={fill} stackId={stackId} radius={stackId ? (programStackedBars.filter(b => b.stackId === stackId).at(-1)?.key === key ? [4,4,0,0] : [0,0,0,0]) : [4,4,0,0]} {...BAR_ANIMATION}>
                        {(!stackId || programStackedBars.filter(b => b.stackId === stackId).at(-1)?.key === key) && <LabelList dataKey={stackId ? `${stackId}_Total` : key} position="top" style={{ fontSize: '10px', fontWeight: 600, fill }} />}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trend (line) chart */}
              <div
                className={`chart-wrapper clickable-chart${chartType === 'Trend' ? ' active' : ' inactive'}`}
                onClick={() => setExpandedChart({
                  title: 'Student Strength Trend',
                  content: (
                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={ugPgResearchTrend} margin={{ top: 40, right: 40, left: 60, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                        <XAxis dataKey="year" interval={0} angle={-40} textAnchor="end" height={65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -15, style: AXIS_LABEL_STYLE }} />
                        <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W + 10} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: 0, style: AXIS_LABEL_STYLE }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.9rem', paddingBottom: '20px' }} />
                        {stackGender
                          ? programStackedBars.map(({ key, name, fill }) => (<Line key={key} type="linear" dataKey={key} name={name} stroke={fill} strokeWidth={3} dot={{ r: 6, fill }} activeDot={{ r: 8 }}><LabelList dataKey={key} position="top" style={{ fontSize: '11px', fontWeight: 600, fill }} /></Line>))
                          : (<>
                              <Line type="linear" dataKey="UG_Total"       name="UG"       stroke={GROUP_COLORS.UG}       strokeWidth={3} dot={{ r: 6, fill: GROUP_COLORS.UG }}><LabelList       dataKey="UG_Total"       position="top" style={{ fontSize: '11px', fontWeight: 600, fill: GROUP_COLORS.UG }} /></Line>
                              <Line type="linear" dataKey="PG_Total"       name="PG"       stroke={GROUP_COLORS.PG}       strokeWidth={3} dot={{ r: 6, fill: GROUP_COLORS.PG }}><LabelList       dataKey="PG_Total"       position="top" style={{ fontSize: '11px', fontWeight: 600, fill: GROUP_COLORS.PG }} /></Line>
                              <Line type="linear" dataKey="Research_Total" name="Research" stroke={GROUP_COLORS.Research} strokeWidth={3} dot={{ r: 6, fill: GROUP_COLORS.Research }}><LabelList dataKey="Research_Total" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: GROUP_COLORS.Research }} /></Line>
                              <Line type="linear" dataKey="Total"          name="Total"    stroke={GROUP_COLORS.Total}    strokeWidth={3} strokeDasharray="6 3" dot={{ r: 6, fill: GROUP_COLORS.Total }}><LabelList dataKey="Total" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: GROUP_COLORS.Total }} /></Line>
                            </>)}
                      </LineChart>
                    </ResponsiveContainer>
                  ),
                })}
              >
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart data={ugPgResearchTrend} margin={CM_NOLABEL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                    <XAxis dataKey="year" interval={chartIsMobile ? 1 : 0} angle={-40} textAnchor="end" height={chartIsMobile ? 50 : 65} tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} label={{ value: 'Year', position: 'insideBottom', offset: -10, style: AXIS_LABEL_STYLE }} />
                    <YAxis tick={TICK_STYLE} tickLine={false} axisLine={{ stroke: '#ddd' }} width={Y_AXIS_W} label={{ value: 'Students', angle: -90, position: 'insideLeft', offset: -5, style: AXIS_LABEL_STYLE }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '0.78rem', paddingBottom: '8px' }}
                      content={(props) => <ChartLegendContent payload={props.payload} orderedKeys={programStackedBars.map(b => b.key)} isMobile={chartIsMobile} />}
                    />
                    {stackGender
                      ? programStackedBars.map(({ key, name, fill }) => (<Line key={key} type="linear" dataKey={key} name={name} stroke={fill} strokeWidth={2} dot={{ r: 4, fill, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey={key} position="top" style={{ fontSize: '9px', fontWeight: 600, fill }} /></Line>))
                      : (<>
                          <Line type="linear" dataKey="UG_Total"       name="UG"       stroke={GROUP_COLORS.UG}       strokeWidth={3} dot={{ r: 5, fill: GROUP_COLORS.UG,       strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="UG_Total"       position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.UG }} /></Line>
                          <Line type="linear" dataKey="PG_Total"       name="PG"       stroke={GROUP_COLORS.PG}       strokeWidth={3} dot={{ r: 5, fill: GROUP_COLORS.PG,       strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="PG_Total"       position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.PG }} /></Line>
                          <Line type="linear" dataKey="Research_Total" name="Research" stroke={GROUP_COLORS.Research} strokeWidth={3} dot={{ r: 5, fill: GROUP_COLORS.Research, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="Research_Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.Research }} /></Line>
                          <Line type="linear" dataKey="Total"          name="Total"    stroke={GROUP_COLORS.Total}    strokeWidth={3} strokeDasharray="6 3" dot={{ r: 5, fill: GROUP_COLORS.Total, strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800}><LabelList dataKey="Total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: GROUP_COLORS.Total }} /></Line>
                        </>)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── State Distribution View ── */}
          {programChartMode === 'state' && (
            <div className={`bar-chart-container trend-chart${stateTop10.length > 0 ? '' : ' has-empty'}`}>
              <div className="chart-title-row">
                <h3 className="chart-heading">
                  State-wise Distribution
                  <span className="text-muted text-sm ac-chart-note">(Students in India)</span>
                </h3>
                <ExportMenu
                  elementId="academic-state-dist-container"
                  data={stateTop10}
                  headers={['State', 'Count']}
                  keys={['state', 'count']}
                  filename="academic_state_distribution"
                  title="State-wise Distribution"
                />
              </div>

              <div className="state-dist-wrap">
                {stateTop10.length === 0 && (
                  <div className="no-data-overlay">
                    <span className="no-data-overlay-icon">🗺️</span>
                    <p className="no-data-overlay-text">No state distribution data to display.</p>
                  </div>
                )}

                <div
                  id="academic-state-dist-container"
                  className="chart-container clickable"
                  onClick={() => setExpandedChart({
                    title: 'State-wise Distribution',
                    content: (
                      <div className="ac-modal-body">
                        <ResponsiveContainer width="100%" height={500}>
                          <PieChart>
                            <Pie data={stateTop10.length > 0 ? stateTop10 : [{ state: '', count: 1, fill: '#f0f0f0' }]} dataKey="count" nameKey="state" cx="50%" cy="50%" outerRadius={180} label={({ state, count }) => `${state}: ${count}`}>
                              {(stateTop10.length > 0 ? stateTop10 : [{ state: '', fill: '#f0f0f0' }]).map((entry, index) => (
                                <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="ac-modal-table">
                          <PieDistributionTable data={stateTop10} nameKey="state" total={stateTotal} colors={PIE_COLORS} />
                        </div>
                      </div>
                    ),
                  })}
                >
                  <ResponsiveContainer width="100%" height={chartIsMobile ? 240 : 380}>
                    <PieChart>
                      <Pie data={stateTop10.length > 0 ? stateTop10 : [{ state: '', count: 1, fill: '#f0f0f0' }]} dataKey="count" nameKey="state" cx="50%" cy="50%" outerRadius={chartIsMobile ? 80 : 130} label={false} labelLine={false}>
                        {(stateTop10.length > 0 ? stateTop10 : [{ state: '', fill: '#f0f0f0' }]).map((entry, index) => (
                          <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      {stateTop10.length > 0 && <Tooltip content={<PieTooltip />} />}
                    </PieChart>
                  </ResponsiveContainer>

                  {stateTop10.length > 0 && (
                    <PieDistributionTable data={stateTop10} nameKey="state" total={stateTotal} colors={PIE_COLORS} />
                  )}

                  <div className="state-summary-box">
                    <h2>
                      Total Students in India:{' '}
                      <span className="state-summary-total">{stateTotal}</span>
                      {' '}settled in{' '}
                      <span className="state-summary-states">
                        {stateDistribution.filter(s => s.state && s.state !== 'Not Found' && s.state.toLowerCase() !== 'unknown').length}
                      </span>
                      {' '}Indian States and Union Territories.
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DataUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} tableName="student_table" token={token} />

        <ChartExpandModal isOpen={!!expandedChart} onClose={() => setExpandedChart(null)} title={expandedChart?.title}>
          {expandedChart?.content}
        </ChartExpandModal>
      </div>
    </div>
  );
}

export default AcademicSection;
