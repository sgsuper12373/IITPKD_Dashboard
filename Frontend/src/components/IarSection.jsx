import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell, LabelList
} from 'recharts';

import {
  fetchFilterOptions,
  fetchSummary,
  fetchStateDistribution,
  fetchCountryDistribution,
  fetchOutcomeBreakdown
} from '../services/iarStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import DataUploadModal from './LazyDataUploadModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './IarSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

const PIE_COLORS = ['#667eea', '#764ba2', '#f093fb', '#43e97b', '#fa709a', '#00f2fe', '#f59e0b', '#a78bfa'];
const OTHERS_PIE_COLOR = '#94a3b8';

function makePieTooltip(total) {
  return function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return (
      <div style={{
        background: '#fff', border: '1px solid #e0e0e0',
        borderRadius: '8px', padding: '10px 14px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '13px'
      }}>
        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#333' }}>{name}</p>
        <p style={{ margin: '0 0 2px', color: '#555' }}>Count: <strong>{value}</strong></p>
        <p style={{ margin: 0, color: '#555' }}>Share: <strong>{pct}%</strong></p>
      </div>
    );
  };
}

function PieDistributionTable({ data, nameKey, total, colors, user }) {
  if (!data?.length) return null;
  return (
    <div style={{ marginTop: '16px', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#667eea', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Name</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Count</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => {
            const fill = entry.fill || colors[index % colors.length];
            const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0.0';
            return (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '7px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: fill, flexShrink: 0, display: 'inline-block' }} />
                    {entry[nameKey]}
                  </div>
                </td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 500 }}>{entry.count}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', color: '#667eea', fontWeight: 600 }}>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const STATE_BAR_COLOR = '#67e8f9';
const HIGHER_BAR_COLOR = '#43e97b';
const CORPORATE_BAR_COLOR = '#fa709a';
const TREND_TOTAL_COLOR = '#667eea';
const TREND_HIGHER_COLOR = '#22d3ee';
const TREND_CORPORATE_COLOR = '#f97316';

// Custom label renderer that clips labels exceeding the chart top
function ClippedLabel(props) {
  const { x, y, width, value, fill } = props;
  if (!value) return null;
  const labelY = y - 4;
  // Only show if there's at least 6px space above the bar
  if (labelY < 6) return null;
  return (
    <text
      x={x + width / 2}
      y={labelY}
      fill={fill}
      textAnchor="middle"
      dominantBaseline="auto"
      style={{ fontSize: '10px', fontWeight: 600 }}
    >
      {value}
    </text>
  );
}

function IarSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    course_types: [],
  });

  const [filters, setFilters] = useState({
    department: 'All',
    course_type: 'All',
  });

  const [summary, setSummary] = useState({
    total_alumni: 0,
    higher_studies: 0,
    corporate: 0,
    trend: []
  });
  const [stateDistribution, setStateDistribution] = useState([]);
  const [countryDistribution, setCountryDistribution] = useState([]);
  const [outcomeBreakdown, setOutcomeBreakdown] = useState([]);

  // "Graph" or "Table" toggle for Department Outcome section
  const [outcomeDisplayMode, setOutcomeDisplayMode] = useState('Graph');

  const sortedOutcomeBreakdown = useMemo(() => {
    return [...outcomeBreakdown]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);
  }, [outcomeBreakdown]);

  const stateTop10 = useMemo(() => {
    const sorted = [...stateDistribution]
      .filter(item => item.state !== 'Not Found')
      .sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    if (rest.length > 0) {
      top5.push({ state: 'Others', count: rest.reduce((s, i) => s + i.count, 0), fill: OTHERS_PIE_COLOR });
    }
    return top5;
  }, [stateDistribution]);

  const countryTop10 = useMemo(() => {
    const sorted = [...countryDistribution]
      .filter(item => item.country !== 'Other')
      .sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    if (rest.length > 0) {
      top5.push({ country: 'Others', count: rest.reduce((s, i) => s + i.count, 0), fill: OTHERS_PIE_COLOR });
    }
    return top5;
  }, [countryDistribution]);

  const stateTotal = useMemo(() => stateDistribution.reduce((s, i) => s + i.count, 0), [stateDistribution]);
  const countryTotal = useMemo(() => countryDistribution.reduce((s, i) => s + i.count, 0), [countryDistribution]);
  const StatePieTooltip = useMemo(() => makePieTooltip(stateTotal), [stateTotal]);
  const CountryPieTooltip = useMemo(() => makePieTooltip(countryTotal), [countryTotal]);

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [activeView, setActiveView] = useState('trend');
  const [chartType, setChartType] = useState('Bar');

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const serializedFilters = JSON.stringify(filters);

  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        const options = await fetchFilterOptions(filters, token);
        if (!isMounted) return;
        const departments = Array.isArray(options?.departments) ? options.departments : [];
        const course_types = Array.isArray(options?.course_types) ? options.course_types : [];
        setFilterOptions({ departments, course_types });

        const corrections = {};
        if (filters.department !== 'All' && filters.department && !departments.includes(filters.department)) {
          corrections.department = 'All';
        }
        if (filters.course_type !== 'All' && filters.course_type && !course_types.includes(filters.course_type)) {
          corrections.course_type = 'All';
        }
        if (Object.keys(corrections).length > 0) {
          setFilters(prev => ({ ...prev, ...corrections }));
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load filter options:', err);
          setError(err.message || 'Failed to load filter options.');
        }
      }
    };
    loadFilterOptions();
    return () => { isMounted = false; };
  }, [serializedFilters, token, uploadVersion, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryResp, stateResp, countryResp, outcomeResp] = await Promise.all([
        fetchSummary(filters, token),
        fetchStateDistribution(filters, token),
        fetchCountryDistribution(filters, token),
        fetchOutcomeBreakdown(filters, token)
      ]);
      setSummary(summaryResp?.data || { total_alumni: 0, higher_studies: 0, corporate: 0, trend: [] });
      setStateDistribution(stateResp?.data || []);
      setCountryDistribution(countryResp?.data || []);
      setOutcomeBreakdown(outcomeResp?.data || []);
    } catch (err) {
      console.error('Failed to load IAR data:', err);
      setError(err.message || 'Failed to load alumni statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, uploadVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ department: 'All', course_type: 'All' });
  };

  const trendData = useMemo(() => summary.trend || [], [summary.trend]);

  // Fixed chart height shared between graph and table views
  const OUTCOME_PANEL_HEIGHT = 450;

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
            ← Back to People & Campus
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>International and Alumni Relations</h1>
            </div>
            <div className="section-header-actions">
              {!isReadOnlyView && isAdmin && (
                <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                  <span>📤</span> Upload Data
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-message" style={{
            padding: '10px', backgroundColor: '#f8d7da', color: '#721c24',
            borderRadius: '4px', marginBottom: '20px'
          }}>{error}</div>
        )}

        <div style={{ position: 'relative', minHeight: '600px' }}>

          {/* Export + Summary Cards */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
            <ExportMenu
              elementId="iar-summary-cards-container"
              data={[summary]}
              headers={['Total Alumni', 'Higher Studies', 'Corporate']}
              keys={['total_alumni', 'higher_studies', 'corporate']}
              filename="iar_summary"
              title="IAR Summary"
            />
          </div>

          <div id="iar-summary-cards-container" className="grid-3" style={{
            gap: '20px', marginBottom: '30px'
          }}>
            {/* Total Alumni */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>👥</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Alumni</span>
                </div>
                <div className="metric-value" style={{ color: 'white', marginBottom: '8px' }}>{summary.total_alumni}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Alumni matched with filters</span>
                </div>
              </div>
            </div>

            {/* Higher Studies */}
            <div style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 20px rgba(34, 211, 238, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>🎓</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Higher Studies</span>
                </div>
                <div className="metric-value" style={{ color: 'white', marginBottom: '8px' }}>{summary.higher_studies}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Pursuing research/education</span>
                </div>
              </div>
            </div>

            {/* Corporate */}
            <div style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>💼</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Corporate Careers</span>
                </div>
                <div className="metric-value" style={{ color: 'white', marginBottom: '8px' }}>{summary.corporate}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Working in industry</span>
                </div>
              </div>
            </div>
          </div>

          {/* View Selector */}
          <div style={{
            display: 'flex', gap: '10px', marginBottom: '20px',
            borderBottom: '2px solid #e0e0e0', paddingBottom: '10px', flexWrap: 'wrap'
          }}>
            {[
              { id: 'trend', label: 'Outcome Trend', icon: '📈', activeColor: '#667eea', activeText: 'white' },
              { id: 'state', label: 'State Distribution', icon: '🗺️', activeColor: '#67e8f9', activeText: '#333' },
              { id: 'country', label: 'Country Distribution', icon: '🌍', activeColor: '#764ba2', activeText: 'white' },
              { id: 'outcome', label: 'Department Outcome', icon: '📊', activeColor: '#43e97b', activeText: 'white' },
            ].map(({ id, label, icon, activeColor, activeText }) => (
              <button key={id} type="button" onClick={() => setActiveView(id)} style={{
                padding: '10px 24px',
                backgroundColor: activeView === id ? activeColor : '#f8f9fa',
                color: activeView === id ? activeText : '#333',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: activeView === id ? '600' : '500',
                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>

          <div className="chart-section" style={{
            marginBottom: '30px', padding: '20px',
            backgroundColor: '#fff', borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* Compact filter bar */}
            <div style={{
              background: '#f8f9fa', border: '1px solid #e0e0e0',
              borderRadius: '10px', padding: '0.65rem 1rem', marginBottom: '20px'
            }}>
              <div className="filter-panel-header" style={{ marginBottom: '0.6rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a1a' }}>Filters</span>
                <button className="clear-filters-btn" onClick={handleClearFilters}
                  style={{ padding: '0.3rem 0.85rem', fontSize: '0.78rem', borderRadius: '6px', border: 'none', backgroundColor: '#dc3545', color: '#fff', cursor: 'pointer' }}>
                  Clear All Filters
                </button>
              </div>
              <div className="filter-grid-2" style={{ gap: '0.6rem' }}>
                {[
                  { id: 'iar-dept', label: 'Department', key: 'department', options: filterOptions.departments },
                  { id: 'iar-program', label: 'Course Type', key: 'course_type', options: filterOptions.course_types },
                ].map(({ id, label, key, options }) => (
                  <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor={id} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1a1a1a' }}>{label}</label>
                    <select id={id} value={filters[key]}
                      onChange={(e) => handleFilterChange(key, e.target.value)}
                      className="filter-select"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', borderRadius: '7px', border: '1px solid #ced4da' }}>
                      <option value="All">All</option>
                      {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Outcome Trend View ── */}
            <div style={{ display: activeView === 'trend' ? 'block' : 'none' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {['Bar', 'Trend'].map(type => (
                  <button key={type} onClick={() => setChartType(type)} style={{
                    padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
                    background: chartType === type ? '#667eea' : '#e9ecef',
                    color: chartType === type ? '#fff' : '#555',
                  }}>{type}</button>
                ))}
              </div>
              <div>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📈</span> Outcome Trend Over Years
                  </h2>
                  <ExportMenu
                    elementId="iar-outcome-trend-container"
                    data={trendData}
                    headers={['Year', 'Total Alumni', 'Higher Studies', 'Corporate']}
                    keys={['year', 'total', 'higher', 'corporate']}
                    filename="iar_outcome_trend"
                    title="Outcome Trend Over Years"
                  />
                </div>

                <div style={{ position: 'relative' }}>
                  {trendData.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '40px', marginBottom: '10px' }}>📈</span>
                      <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No trend data available for the selected filters.</p>
                    </div>
                  )}
                  <div id="iar-outcome-trend-container" className="chart-container">
                    <div className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={trendData} margin={{ top: 24, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip denominatorKey="total" excludePercentageFor={['Total Alumni']} />} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="total" name="Total Alumni" fill={TREND_TOTAL_COLOR} radius={[4, 4, 0, 0]} barSize={14}>
                            <LabelList dataKey="total" content={<ClippedLabel fill={TREND_TOTAL_COLOR} />} />
                          </Bar>
                          <Bar dataKey="higher" name="Higher Studies" fill={TREND_HIGHER_COLOR} radius={[4, 4, 0, 0]} barSize={14}>
                            <LabelList dataKey="higher" content={<ClippedLabel fill={TREND_HIGHER_COLOR} />} />
                          </Bar>
                          <Bar dataKey="corporate" name="Corporate" fill={TREND_CORPORATE_COLOR} radius={[4, 4, 0, 0]} barSize={14}>
                            <LabelList dataKey="corporate" content={<ClippedLabel fill={TREND_CORPORATE_COLOR} />} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={trendData} margin={{ top: 24, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip denominatorKey="total" excludePercentageFor={['Total Alumni']} />} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="linear" dataKey="total" name="Total Alumni" stroke={TREND_TOTAL_COLOR} strokeWidth={2.5} dot={{ r: 3 }}>
                            <LabelList dataKey="total" content={<ClippedLabel fill={TREND_TOTAL_COLOR} />} />
                          </Line>
                          <Line type="linear" dataKey="higher" name="Higher Studies" stroke={TREND_HIGHER_COLOR} strokeWidth={2} dot={{ r: 3 }}>
                            <LabelList dataKey="higher" content={<ClippedLabel fill={TREND_HIGHER_COLOR} />} />
                          </Line>
                          <Line type="linear" dataKey="corporate" name="Corporate" stroke={TREND_CORPORATE_COLOR} strokeWidth={2} dot={{ r: 3 }}>
                            <LabelList dataKey="corporate" content={<ClippedLabel fill={TREND_CORPORATE_COLOR} />} />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid-4" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', gap: '10px' }}>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#667eea' }}>{trendData.reduce((sum, item) => sum + item.total, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Total Alumni</div></div>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#22d3ee' }}>{trendData.reduce((sum, item) => sum + item.higher, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Higher Studies</div></div>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#f97316' }}>{trendData.reduce((sum, item) => sum + item.corporate, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Corporate</div></div>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#a855f7' }}>{trendData.length}</div><div style={{ color: '#666', fontSize: '11px' }}>Years Covered</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── State Distribution View ── */}
            <div style={{ display: activeView === 'state' ? 'block' : 'none' }}>
              <div>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🗺️</span> State-wise Alumni Distribution
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>Top 5 states by alumni count</p>
                  </div>
                  <ExportMenu
                    elementId="iar-state-dist-container"
                    data={stateTop10}
                    headers={['State', 'Count']}
                    keys={['state', 'count']}
                    filename="iar_state_distribution"
                    title="State-wise Alumni Distribution"
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  {stateDistribution.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none', minHeight: '200px' }}>
                      <span style={{ fontSize: '40px', marginBottom: '10px' }}>🗺️</span>
                      <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No state distribution data to display.</p>
                    </div>
                  )}
                  <div id="iar-state-dist-container" className="chart-container">
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie data={stateTop10.length > 0 ? stateTop10 : [{ state: '', count: 1, fill: '#f0f0f0' }]} dataKey="count" nameKey="state" cx="50%" cy="50%" outerRadius={130} label={false} labelLine={false}>
                          {(stateTop10.length > 0 ? stateTop10 : [{ state: '', fill: '#f0f0f0' }]).map((entry, index) => (
                            <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        {stateTop10.length > 0 && <Tooltip content={<StatePieTooltip />} />}
                      </PieChart>
                    </ResponsiveContainer>
                    {stateTop10.length > 0 && (
                      <PieDistributionTable data={stateTop10} nameKey="state" total={stateTotal} colors={PIE_COLORS} user={user} />
                    )}
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <h2 style={{ margin: 0, color: '#333', fontSize: '16px', fontWeight: '500', lineHeight: '1.5' }}>
                        Total Alumni : <span style={{ fontWeight: 'bold', color: '#667eea', fontSize: '22px' }}>{summary?.total_alumni || 0}</span> out of which <span style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '18px' }}>{countryDistribution.find(c => c.country?.toLowerCase() === 'india')?.count || stateDistribution.filter(s => s.state !== 'Not Found').reduce((sum, item) => sum + item.count, 0)}</span> settled in <span style={{ fontWeight: 'bold', color: '#f97316', fontSize: '18px' }}>{stateDistribution.filter(s => s.state !== 'Not Found').length}</span> Indian States / Union Territories
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Country Distribution View ── */}
            <div style={{ display: activeView === 'country' ? 'block' : 'none' }}>
              <div>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🌍</span> Global Alumni Reach
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>Top 5 countries by alumni count</p>
                  </div>
                  <ExportMenu
                    elementId="iar-country-dist-container"
                    data={countryDistribution}
                    headers={['Country', 'Count']}
                    keys={['country', 'count']}
                    filename="iar_country_distribution"
                    title="Global Alumni Reach"
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  {countryDistribution.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none', minHeight: '200px' }}>
                      <span style={{ fontSize: '40px', marginBottom: '10px' }}>🌍</span>
                      <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No country distribution data to display.</p>
                    </div>
                  )}
                  <div id="iar-country-dist-container" className="chart-container">
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie data={countryTop10.length > 0 ? countryTop10 : [{ country: '', count: 1, fill: '#f0f0f0' }]} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={130} label={false} labelLine={false}>
                          {(countryTop10.length > 0 ? countryTop10 : [{ country: '', fill: '#f0f0f0' }]).map((entry, index) => (
                            <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        {countryTop10.length > 0 && <Tooltip content={<CountryPieTooltip />} />}
                      </PieChart>
                    </ResponsiveContainer>
                    {countryTop10.length > 0 && (
                      <PieDistributionTable data={countryTop10} nameKey="country" total={countryTotal} colors={PIE_COLORS} user={user} />
                    )}
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <h2 style={{ margin: 0, color: '#333', fontSize: '16px', fontWeight: '500', lineHeight: '1.5' }}>
                        Total Alumni : <span style={{ fontWeight: 'bold', color: '#667eea', fontSize: '22px' }}>{summary?.total_alumni || 0}</span> out of which <span style={{ fontWeight: 'bold', color: '#22c55e', fontSize: '18px' }}>{(summary?.total_alumni || 0) - (countryDistribution.find(c => c.country?.toLowerCase() === 'india')?.count || stateDistribution.filter(s => s.state !== 'Not Found').reduce((sum, item) => sum + item.count, 0))}</span> settled across <span style={{ fontWeight: 'bold', color: '#f97316', fontSize: '18px' }}>{countryDistribution.length}</span> Countries
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Outcome by Department View ── */}
            <div style={{ display: activeView === 'outcome' ? 'block' : 'none' }}>
              <div>
                {/* Header row */}
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 6px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>📊</span> Outcome by Department
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Top 10 departments by alumni count — higher studies vs corporate career paths.
                    </p>
                  </div>
                  <ExportMenu
                    elementId="iar-dept-outcome-container"
                    data={sortedOutcomeBreakdown}
                    headers={['Department', 'Total', 'Higher Studies', 'Corporate']}
                    keys={['department', 'total', 'higher', 'corporate']}
                    filename="iar_department_outcome"
                    title="Outcome by Department"
                  />
                </div>

                {/* ── Graph / Table toggle buttons ── */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['Graph', 'Table'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setOutcomeDisplayMode(mode)}
                      style={{
                        padding: '7px 22px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        background: outcomeDisplayMode === mode ? '#43e97b' : '#e9ecef',
                        color: outcomeDisplayMode === mode ? '#fff' : '#555',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {mode === 'Graph' ? '📊 Graph' : '📋 Table'}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative' }}>
                  {outcomeBreakdown.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                      <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No departmental breakdown to display.</p>
                    </div>
                  )}

                  {/* Fixed-height panel — same height for both Graph and Table */}
                  <div style={{ height: `${OUTCOME_PANEL_HEIGHT}px`, overflow: 'hidden' }}>

                    {/* ── GRAPH panel ── */}
                    <div style={{ display: outcomeDisplayMode === 'Graph' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                      {/* Legend */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', justifyContent: 'flex-end' }}>
                        {[
                          { color: HIGHER_BAR_COLOR, label: 'Higher Studies' },
                          { color: CORPORATE_BAR_COLOR, label: 'Corporate' },
                        ].map(({ color, label }) => (
                          <div key={label} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: '#f8f9fa', border: '1px solid #e0e0e0',
                            borderRadius: '20px', padding: '4px 12px',
                          }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>{label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bar chart — takes remaining space */}
                      <div id="iar-dept-outcome-container" style={{ flex: 1, minHeight: 0, maxHeight: '450px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={sortedOutcomeBreakdown}
                            margin={{ top: 24, right: 20, left: 10, bottom: 80 }}
                            barCategoryGap="20%"
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="department" angle={-38} textAnchor="end" height={80} tick={{ fontSize: 10 }} interval={0} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} width={35} />
                            <Tooltip content={<CustomTooltip denominatorKey="total" />} />
                            <Bar dataKey="higher" name="Higher Studies" fill={HIGHER_BAR_COLOR} radius={[4, 4, 0, 0]} barSize={12} maxBarSize={20}>
                              <LabelList dataKey="higher" content={<ClippedLabel fill={HIGHER_BAR_COLOR} />} />
                            </Bar>
                            <Bar dataKey="corporate" name="Corporate" fill={CORPORATE_BAR_COLOR} radius={[4, 4, 0, 0]} barSize={12} maxBarSize={20}>
                              <LabelList dataKey="corporate" content={<ClippedLabel fill={CORPORATE_BAR_COLOR} />} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* ── TABLE panel ── */}
                    <div style={{ display: outcomeDisplayMode === 'Table' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <ExportMenu
                          elementId="iar-dept-outcome-table"
                          data={sortedOutcomeBreakdown}
                          headers={['Department', 'Total', 'Higher Studies', 'Corporate']}
                          keys={['department', 'total', 'higher', 'corporate']}
                          filename="iar_department_summary_table"
                          title="Departmental Outcome Summary"
                          exportType="table"
                        />
                      </div>
                      <div
                        id="iar-dept-outcome-table"
                        style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', width: '100%', maxHeight: '450px' }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#43e97b', color: 'white', zIndex: 1 }}>
                            <tr>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Department</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Total Alumni</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Higher Studies</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>Corporate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedOutcomeBreakdown.map((row, index) => (
                              <tr key={row.department} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                <td style={{ padding: '8px' }}>{row.department}</td>
                                <td style={{ padding: '8px' }}>{row.total}</td>
                                <td style={{ padding: '8px', color: '#43e97b', fontWeight: '500' }}>{row.higher}</td>
                                <td style={{ padding: '8px', color: '#fa709a', fontWeight: '500' }}>{row.corporate}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Stats row — always visible below the panel */}
                  <div className="grid-4" style={{
                    marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa',
                    borderRadius: '8px', border: '1px solid #e0e0e0',
                    gap: '10px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '20px' }}>{outcomeBreakdown.reduce((sum, item) => sum + item.total, 0)}</div>
                      <div style={{ color: '#666', fontSize: '11px' }}>Total Alumni</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#43e97b', fontWeight: 'bold', fontSize: '20px' }}>{outcomeBreakdown.reduce((sum, item) => sum + (item.higher || 0), 0)}</div>
                      <div style={{ color: '#666', fontSize: '11px' }}>Higher Studies</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#fa709a', fontWeight: 'bold', fontSize: '20px' }}>{outcomeBreakdown.reduce((sum, item) => sum + (item.corporate || 0), 0)}</div>
                      <div style={{ color: '#666', fontSize: '11px' }}>Corporate</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '20px' }}>{outcomeBreakdown.length}</div>
                      <div style={{ color: '#666', fontSize: '11px' }}>Departments</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alumni CTA Banner */}
          <div style={{ marginTop: '32px', background: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 100%)', borderRadius: '16px', padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 10px 30px rgba(253, 221, 161, 1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <h3 style={{ padding: '0 50px 0 0', margin: '0 40px 4px 0', color: '#000000ff', fontSize: '18px', fontWeight: 700 }}>Explore About our Alumni</h3>
                <p style={{ margin: 0, color: 'rgba(0, 0, 0, 0.85)', fontSize: '13px' }}>Explore the achievements, innovations, and leadership journeys of our alumni community at IAR IIT Palakkad</p>
              </div>
            </div>
            <a
              href="https://iar.iitpkd.ac.in/home"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', color: '#000000ff', padding: '10px 22px', borderRadius: '50px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            >
              Visit iar.iitpkd.ac.in →
            </a>
          </div>
        </div>

        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="alumni"
          token={token}
        />
      </div>
    </div>
  );
}

export default IarSection;