import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area,
  PieChart, Pie, Cell,
  LineChart, Line, LabelList } from 'recharts';
import {
  fetchFilterOptions,
  fetchFacultyFilterOptions,
  fetchFacultyExpertiseMatrix,
  fetchYearwiseStrength,
  fetchGenderDistribution,
} from '../services/administrativeStats';
import DataUploadModal from './DataUploadModal';
import ExportMenu from './ExportMenu';
import { CustomTooltip } from '../utils/chartUtils';
import './Page.css';
import './AcademicSection.css';

// ── Constants ──────────────────────────────────────────────────────────────

const BAR_ANIMATION = {
  isAnimationActive: true,
  animationDuration: 700,
  animationEasing: 'ease-out',
  animationBegin: 80
};

const GENDER_COLORS = {
  Male: '#667eea',
  Female: '#764ba2',
  Transgender: '#43e97b',
  Other: '#f093fb',
};

// Same colour scheme as ICC for visual parity
const SERIES_META = [
  { key: 'Total', color: '#667eea', gradientId: 'colorEmpTotal', label: 'Total' },
  { key: 'Male', color: '#43e97b', gradientId: 'colorEmpMale', label: 'Male' },
  { key: 'Female', color: '#fa709a', gradientId: 'colorEmpFemale', label: 'Female' },
  { key: 'Other', color: '#f093fb', gradientId: 'colorEmpOther', label: 'Other' },
];

const VIEWS = [
  { value: 'yearwise', label: 'Yearwise Strength', icon: '📈' },
  { value: 'department', label: 'Faculty Expertise Matrix', icon: '📊' },
  { value: 'gender', label: 'Gender Ratio', icon: '🥧' },
];

const NUM_YEARS_OPTIONS = [
  { value: 1, label: 'Last 1 Yr' },
  { value: 2, label: 'Last 2 Yrs' },
  { value: 3, label: 'Last 3 Yrs' },
  { value: 5, label: 'Last 5 Yrs' },
  { value: 10, label: 'Last 10 Yrs' },
];

// Chart white-box style — identical to ICC
const CHART_BOX = {
  backgroundColor: '#fff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
};

// ── Sub-components ─────────────────────────────────────────────────────────

const CustomXAxisTick = ({ x, y, payload }) => {
  const label = payload.value || '';
  const truncated = label.length > 18 ? label.slice(0, 16) + '…' : label;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={6} textAnchor="end" fill="#555" fontSize={11}
        fontWeight={500} transform="rotate(-38)">
        {truncated}
      </text>
    </g>
  );
};

const CustomLegend = ({ payload, total }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '1.2rem', fontSize: '0.8rem', flexWrap: 'wrap', paddingBottom: '6px',
  }}>
    {payload.map((entry) => (
      <span key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          display: 'inline-block', width: 10, height: 10,
          borderRadius: 2, background: entry.color, flexShrink: 0,
        }} />
        <span style={{ color: entry.color, fontWeight: 600 }}>{entry.value}</span>
      </span>
    ))}
    <span style={{
      borderLeft: '1px solid #d0d0d0', paddingLeft: '1rem',
      fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap',
    }}>
      Total Employees: {total}
    </span>
  </div>
);

// Using shared CustomTooltip for consistency

// ── Main component ─────────────────────────────────────────────────────────

function AdministrativeSection({ isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('yearwise');

  const [filterOptions, setFilterOptions] = useState({
    department: [], designation: [], gender: [], emp_type: [], group_name: [], appointed_category: []
  });
  const [facultyFilterOptions, setFacultyFilterOptions] = useState({
    department: [], designation: [], group_name: []
  });
  const [filters, setFilters] = useState({
    department: null, designation: null, gender: null,
    emp_type: null, group_name: null, appointed_category: null, num_years: 5
  });

  const [expertiseData, setExpertiseData] = useState([]);
  const [expertiseTotal, setExpertiseTotal] = useState(0);

  const [yearwiseData, setYearwiseData] = useState([]);
  const [visibleSeries, setVisibleSeries] = useState(
    Object.fromEntries(SERIES_META.map(s => [s.key, true]))
  );

  const [genderData, setGenderData] = useState([]);
  const [genderTotal, setGenderTotal] = useState(0);

  // Summary card state (independent of filters)
  const [summaryTotals, setSummaryTotals] = useState({ all: 0, teaching: 0, nonTeaching: 0 });
  const [allYearwise, setAllYearwise] = useState([]);
  const [teachingYearwise, setTeachingYearwise] = useState([]);
  const [nonTeachingYearwise, setNonTeachingYearwise] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  const [yearwiseChartType, setYearwiseChartType] = useState('Bar'); // 'Bar' | 'Trend'
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  // ── data fetching ──────────────────────────────────────────────────────

  // ── summary cards — runs once on mount, independent of user filters ──────
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchYearwiseStrength({ num_years: 100 }, token),
      fetchYearwiseStrength({ emp_type: 'Teaching', num_years: 100 }, token),
      fetchYearwiseStrength({ emp_type: 'Non Teaching', num_years: 100 }, token),
    ]).then(([rAll, rTeaching, rNonTeaching]) => {
      const data = (r) => r.data || [];
      // Use the latest year's active headcount for summary cards
      const latestTotal = (arr) => arr.length > 0 ? (arr[arr.length - 1].Total || 0) : 0;
      const allData = data(rAll);
      setAllYearwise(allData);
      setTeachingYearwise(data(rTeaching));
      setNonTeachingYearwise(data(rNonTeaching));
      setSummaryTotals({
        all: latestTotal(allData),
        teaching: latestTotal(data(rTeaching)),
        nonTeaching: latestTotal(data(rNonTeaching)),
      });
      if (allData.length > 0) {
        setSelectedYear(String(allData[allData.length - 1].year));
      }
    }).catch(() => { });
  }, [token, uploadVersion]);

  useEffect(() => {
    if (!token) { setError('Authentication token not found. Please log in again.'); return; }
    fetchFilterOptions(token)
      .then(opts => setFilterOptions(opts))
      .catch(() => setError('Failed to load filter options.'));
  }, [token, uploadVersion]);

  useEffect(() => {
    if (!token || activeView !== 'department') return;
    fetchFacultyFilterOptions(token)
      .then(opts => setFacultyFilterOptions(opts))
      .catch(() => { });
  }, [token, activeView, uploadVersion]);

  useEffect(() => {
    if (!token || activeView !== 'department') return;
    fetchFacultyExpertiseMatrix(filters, token)
      .then(r => { setExpertiseData(r.data); setExpertiseTotal(r.total); })
      .catch(() => setError('Failed to load faculty expertise matrix data.'));
  }, [filters, token, activeView, uploadVersion]);

  useEffect(() => {
    if (!token || activeView !== 'yearwise') return;
    fetchYearwiseStrength(filters, token)
      .then(r => { setYearwiseData(r.data); })
      .catch(() => setError('Failed to load yearwise strength data.'))
  }, [filters, token, activeView, uploadVersion]);

  useEffect(() => {
    if (!token || activeView !== 'gender') return;
    fetchGenderDistribution(filters, null, token)
      .then(r => {
        const pie = Object.entries(r.data)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value, fill: GENDER_COLORS[name] || '#ccc' }));
        setGenderData(pie);
        setGenderTotal(r.total);
      })
      .catch(() => setError('Failed to load gender distribution data.'))
  }, [filters, token, activeView, uploadVersion]);

  // ── handlers ────────────────────────────────────────────────────────────

  const handleFilterChange = (key, value) => {
    if (key === 'num_years') {
      setFilters(prev => ({ ...prev, [key]: Number(value) }));
    } else {
      setFilters(prev => ({ ...prev, [key]: value === 'All' ? null : value }));
    }
  };

  const handleClearFilters = () => {
    setFilters({ department: null, designation: null, gender: null, emp_type: null, group_name: null, appointed_category: null, num_years: 5 });
  };

  const toggleSeries = (key) => {
    setVisibleSeries(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return Object.values(next).some(Boolean) ? next : prev;
    });
  };

  // ── derived ──────────────────────────────────────────────────────────────

  const hasDeptData = expertiseTotal > 0 && expertiseData.length > 0;

  // ── shared filter panel (inlined to avoid remount issues) ─────────────

  const filterPanel = (
    <div style={{
      background: '#f8f9fa', border: '1px solid #e0e0e0',
      borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '0.6rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e0e0e0'
      }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a1a' }}>Filters</span>
        <button className="clear-filters-btn" onClick={handleClearFilters}
          style={{ padding: '0.3rem 0.85rem', fontSize: '0.78rem', borderRadius: '6px' }}>
          Clear All Filters
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeView === 'yearwise' ? 7 : 6}, 1fr)`, gap: '0.6rem' }}>
        {[
          { id: 'emp-type-filter', label: 'Employee Type', key: 'emp_type', options: filterOptions.emp_type, views: ['yearwise', 'gender'] },
          { id: 'department-filter', label: 'Department', key: 'department', options: activeView === 'department' ? facultyFilterOptions.department : filterOptions.department, views: ['yearwise', 'department', 'gender'] },
          { id: 'designation-filter', label: 'Designation', key: 'designation', options: activeView === 'department' ? facultyFilterOptions.designation : filterOptions.designation, views: ['yearwise', 'department', 'gender'] },
          { id: 'gender-filter', label: 'Gender', key: 'gender', options: filterOptions.gender, views: ['yearwise', 'department'] },
          { id: 'group-filter', label: 'Group', key: 'group_name', options: activeView === 'department' ? facultyFilterOptions.group_name : filterOptions.group_name, views: ['yearwise', 'department', 'gender'] },
          { id: 'category-filter', label: 'Category', key: 'appointed_category', options: filterOptions.appointed_category, views: ['yearwise', 'department', 'gender'] },
          { id: 'num-years-filter', label: 'No. of Years', key: 'num_years', customOptions: NUM_YEARS_OPTIONS, views: ['yearwise'] },
        ].filter(({ views }) => views.includes(activeView)).map(({ id, label, key, options, customOptions }) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor={id} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1a1a1a' }}>{label}</label>
            <select id={id}
              value={customOptions ? filters[key] : (filters[key] || 'All')}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              className="filter-select"
              style={{ padding: '0.3rem 1.8rem 0.3rem 0.5rem', fontSize: '0.78rem', borderRadius: '7px' }}>
              {customOptions
                ? customOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
                : (<>
                  <option value="All">All</option>
                  {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </>)
              }
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>

        {!isPublicView && (
          <>
            <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
              ← Back to People & Campus
            </button>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1>Employee Overview</h1>
              </div>
              <div className="page-header-actions">
                <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                  <span>📤</span> Upload Employee Data
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{
            padding: '10px', backgroundColor: '#f8d7da',
            color: '#721c24', borderRadius: '4px', marginBottom: '20px'
          }}>{error}</div>
        )}


        {/* ══ Row 1: Filter card + Year-filtered data cards ════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#333', margin: 0, fontSize: '20px' }}>Employee Summary</h2>
          <ExportMenu 
            elementId="admin-summary-cards-container"
            data={[{
              label: 'Selected Year',
              year: selectedYear,
              total: selectedYear === 'All' ? allYearwise.reduce((sum, r) => sum + (r.Total || 0), 0) : (allYearwise.find((r) => String(r.year) === selectedYear)?.Total || 0),
              faculty: selectedYear === 'All' ? teachingYearwise.reduce((sum, r) => sum + (r.Total || 0), 0) : (teachingYearwise.find((r) => String(r.year) === selectedYear)?.Total || 0),
              staff: selectedYear === 'All' ? nonTeachingYearwise.reduce((sum, r) => sum + (r.Total || 0), 0) : (nonTeachingYearwise.find((r) => String(r.year) === selectedYear)?.Total || 0)
            }]}
            headers={['Year', 'Total Employees', 'Faculty', 'Staff']}
            keys={['year', 'total', 'faculty', 'staff']}
            filename="employee_summary"
            title="Employee Summary"
          />
        </div>
        <div id="admin-summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>

          {/* Purple "Filter by Year" card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px', padding: '24px',
            boxShadow: '0 10px 20px rgba(102,126,234,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📅</span>
                <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>Filter by Year</span>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                  outline: 'none', backdropFilter: 'blur(10px)',
                }}
              >
                <option value="All" style={{ color: '#333', background: '#fff' }}>All Years</option>
                {(filterOptions.years || []).map((yr) => (
                  <option key={yr} value={String(yr)} style={{ color: '#333', background: '#fff' }}>{yr}</option>
                ))}
              </select>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>
                Focus on a specific year
              </p>
            </div>
          </div>

          {/* Data cards */}
          {[
            { label: 'Total Employees', icon: '👥', data: allYearwise, grad: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', shadow: 'rgba(34,211,238,0.2)' },
            { label: 'Faculty', icon: '🎓', data: teachingYearwise, grad: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', shadow: 'rgba(249,115,22,0.2)' },
            { label: 'Staff', icon: '🏢', data: nonTeachingYearwise, grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(16,185,129,0.2)' },
          ].map(({ label, icon, data, grad, shadow }) => {
            const val = selectedYear === 'All'
              ? data.reduce((sum, r) => sum + (r.Total || 0), 0)
              : (data.find((r) => String(r.year) === selectedYear)?.Total || 0);
            return (
              <div key={label} style={{
                background: grad, borderRadius: '16px', padding: '24px',
                boxShadow: `0 10px 20px ${shadow}`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>{icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>{label}</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {data.length === 0 ? '—' : val}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                      {selectedYear === 'All' ? 'Sum across all years' : selectedYear ? `In year ${selectedYear}` : 'Select a year'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── View selector buttons — OUTSIDE chart box, exactly like ICC ── */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '10px'
        }}>
          {VIEWS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setError(null); setActiveView(value); }}
              style={{
                padding: '10px 24px',
                backgroundColor: activeView === value ? '#667eea' : '#f8f9fa',
                color: activeView === value ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === value ? '600' : '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            Yearwise Strength — chart identical in style to ICC's trend view
        ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'yearwise' && (
          <div style={CHART_BOX}>
            {filterPanel}

            {/* Bar / Trend toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['Bar', 'Trend'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setYearwiseChartType(mode)}
                  style={{
                    padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    backgroundColor: yearwiseChartType === mode ? '#667eea' : '#e9ecef',
                    color: yearwiseChartType === mode ? '#fff' : '#333',
                    fontWeight: yearwiseChartType === mode ? '600' : '400',
                    fontSize: '13px', transition: 'all 0.2s'
                  }}
                >
                  {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                </button>
              ))}
            </div>

            {/* Chart header: title (left) + series visibility toggles (right) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>Year-wise Employee Strength</h2>
                <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Overview of total employees and gender-wise breakdown year over year.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {SERIES_META.map(({ key, color, label }) => (
                  <button key={key} type="button" onClick={() => toggleSeries(key)} style={{
                    padding: '6px 12px', backgroundColor: visibleSeries[key] ? color : '#f0f0f0',
                    color: visibleSeries[key] ? 'white' : '#666', border: 'none', borderRadius: '20px',
                    cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.2s ease'
                  }}>
                    {label}
                  </button>
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
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)',
                  borderRadius: '8px', pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                  <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No employee records match the current filters.</p>
                </div>
              )}

              {/* Bar chart */}
              <div className={`chart-wrapper ${yearwiseChartType === 'Bar' ? 'active' : 'inactive'}`}>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={yearwiseData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {SERIES_META.map(({ key, color, label }) =>
                      visibleSeries[key] ? (
                        <Bar key={key} dataKey={key} name={label} fill={color} radius={[4, 4, 0, 0]} {...BAR_ANIMATION}>
  <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
</Bar>
                      ) : null
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trend (Area) chart */}
              <div className={`chart-wrapper ${yearwiseChartType === 'Trend' ? 'active' : 'inactive'}`}>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={yearwiseData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
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
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {SERIES_META.map(({ key, color, gradientId, label }) =>
                      visibleSeries[key] ? (
                        <Line key={key} type="linear" dataKey={key} name={label}
                          stroke={color} fill={`url(#${gradientId})`} strokeWidth={2}>
  <LabelList dataKey={key} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
</Line>
                      ) : null
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Faculty Expertise Matrix — bar chart (Teaching, current year hires)
        ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'department' && (
          <div style={CHART_BOX}>
            {filterPanel}

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>
                Faculty Expertise Matrix
              </h2>
              <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                Currently active teaching faculty (non-Director) grouped by department. Total: <strong>{expertiseTotal}</strong>
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              {!hasDeptData && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)',
                  borderRadius: '8px', pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                  <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No active faculty match the current filters.</p>
                </div>
              )}
                <div id="admin-expertise-chart-container" style={{ padding: '10px' }}>
                  <ResponsiveContainer width="100%" height={420}>
                <BarChart data={expertiseData} margin={{ top: 5, right: 20, left: 0, bottom: 130 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={<CustomXAxisTick />} interval={0} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Faculty" fill="#667eea" radius={[4, 4, 0, 0]} {...BAR_ANIMATION}>
  <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
</Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <ExportMenu 
                  elementId="admin-expertise-chart-container"
                  data={expertiseData}
                  headers={['Department', 'Faculty Count']}
                  keys={['name', 'count']}
                  filename="admin_faculty_expertise"
                  title="Faculty Expertise Matrix"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            Gender Ratio — pie chart
        ══════════════════════════════════════════════════════════════════ */}
        {activeView === 'gender' && (
          <div style={CHART_BOX}>
            {filterPanel}

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>
                Gender Distribution
              </h2>
              <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                Gender distribution of currently active employees at IIT Palakkad.
              </p>
            </div>

            <div id="admin-gender-chart-container" style={{ position: 'relative', padding: '10px' }}>
              {genderData.length === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)',
                  borderRadius: '8px', pointerEvents: 'none',
                }}>
                  <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                  <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No gender data matches the current filters.</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height={420}>
                <PieChart>
                  <Pie
                    data={genderData.length > 0 ? genderData : [{ name: '', value: 1, fill: '#f0f0f0' }]}
                    cx="50%" cy="48%" outerRadius={150}
                    dataKey="value"
                    label={genderData.length > 0 ? ({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(1)}%)` : false}
                    labelLine={genderData.length > 0}
                    isAnimationActive={true}
                    animationDuration={700}
                  >
                    {(genderData.length > 0 ? genderData : [{ name: '', fill: '#f0f0f0' }]).map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  {genderData.length > 0 && (
                    <Legend verticalAlign="bottom" align="center"
                      formatter={(value) => (
                        <span style={{ color: GENDER_COLORS[value] || '#555', fontWeight: 600, fontSize: '0.82rem' }}>
                          {value}
                        </span>
                      )}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1a1a' }}>
                  {genderData.length > 0 ? `Total Employees: ${genderTotal}` : ''}
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
            </div>
          </div>
        )}

        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="employees"
          token={token}
        />
      </div>
    </div>
  );
}

export default AdministrativeSection;
