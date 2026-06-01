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
import ChartExpandModal from './ChartExpandModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './IarSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

const PIE_COLORS = ['#667eea', '#764ba2', '#f093fb', '#43e97b', '#fa709a', '#00f2fe', '#f59e0b', '#a78bfa'];
const OTHERS_PIE_COLOR = '#94a3b8';

function makePieTooltip(total) {
  return function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return (
      <div className="iar-pie-tooltip">
        <p className="iar-pie-tooltip-name">{name}</p>
        <p className="iar-pie-tooltip-row">Count: <strong>{value}</strong></p>
        <p className="iar-pie-tooltip-row">Share: <strong>{pct}%</strong></p>
      </div>
    );
  };
}

function PieDistributionTable({ data, nameKey, total, colors, chartIsMobile }) {
  if (!data?.length) return null;
  if (chartIsMobile) {
    return (
      <div className="iar-pie-dist-mobile">
        {data.map((entry, index) => {
          const fill = entry.fill || colors[index % colors.length];
          const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={index} className="iar-pie-dist-item">
              <div className="iar-pie-dist-name">
                <span className="iar-pie-dist-dot" style={{ background: fill }} />
                <span className="iar-pie-dist-name-text">{entry[nameKey]}</span>
              </div>
              <div className="iar-pie-dist-right">
                <div className="iar-pie-dist-count">{entry.count}</div>
                <div className="iar-pie-dist-pct">{pct}% of total</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="iar-pie-dist-table-wrap">
      <table className="iar-pie-dist-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Count</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => {
            const fill = entry.fill || colors[index % colors.length];
            const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0.0';
            return (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td>
                  <div className="iar-pie-dist-cell">
                    <span className="iar-pie-dist-cell-dot" style={{ background: fill }} />
                    {entry[nameKey]}
                  </div>
                </td>
                <td>{entry.count}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const HIGHER_BAR_COLOR = '#43e97b';
const CORPORATE_BAR_COLOR = '#fa709a';
const TREND_TOTAL_COLOR = '#667eea';
const TREND_HIGHER_COLOR = '#22d3ee';
const TREND_CORPORATE_COLOR = '#f97316';

function ClippedLabel(props) {
  const { x, y, width, value, fill } = props;
  if (!value) return null;
  const labelY = y - 4;
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
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const [activeView, setActiveView] = useState('trend');
  const [chartType, setChartType] = useState('Bar');

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 5;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['alumni']} />
          <ShareButton />
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="iar-body">

          {/* Export + Summary Cards */}
          <div className="iar-export-row">
            <ExportMenu
              elementId="iar-summary-cards-container"
              data={[summary]}
              headers={['Total Alumni', 'Higher Studies', 'Corporate']}
              keys={['total_alumni', 'higher_studies', 'corporate']}
              filename="iar_summary"
              title="IAR Summary"
            />
          </div>

          <div id="iar-summary-cards-container" className="iar-stats-grid">
            {/* Total Alumni */}
            <div className="iar-stat-card iar-stat-card--alumni">
              <div className="iar-stat-card-decor" />
              <div className="iar-stat-card-body">
                <div className="iar-stat-card-header">
                  <span className="iar-stat-card-icon">👥</span>
                  <span className="iar-stat-card-label">Total Alumni</span>
                </div>
                <div className="metric-value iar-stat-card-value">{summary.total_alumni}</div>
                <div className="iar-stat-card-status">
                  <span className="iar-stat-card-dot" />
                  <span className="iar-stat-card-subtext">Alumni matched with filters</span>
                </div>
              </div>
            </div>

            {/* Higher Studies */}
            <div className="iar-stat-card iar-stat-card--higher">
              <div className="iar-stat-card-decor" />
              <div className="iar-stat-card-body">
                <div className="iar-stat-card-header">
                  <span className="iar-stat-card-icon">🎓</span>
                  <span className="iar-stat-card-label">Higher Studies</span>
                </div>
                <div className="metric-value iar-stat-card-value">{summary.higher_studies}</div>
                <div className="iar-stat-card-status">
                  <span className="iar-stat-card-dot" />
                  <span className="iar-stat-card-subtext">Pursuing research/education</span>
                </div>
              </div>
            </div>

            {/* Corporate */}
            <div className="iar-stat-card iar-stat-card--corporate">
              <div className="iar-stat-card-decor" />
              <div className="iar-stat-card-body">
                <div className="iar-stat-card-header">
                  <span className="iar-stat-card-icon">💼</span>
                  <span className="iar-stat-card-label">Corporate Careers</span>
                </div>
                <div className="metric-value iar-stat-card-value">{summary.corporate}</div>
                <div className="iar-stat-card-status">
                  <span className="iar-stat-card-dot" />
                  <span className="iar-stat-card-subtext">Working in industry</span>
                </div>
              </div>
            </div>
          </div>

          {/* View Selector */}
          <div className="iar-view-tabs">
            {[
              { id: 'trend', label: 'Outcome Trend', icon: '📈', activeColor: '#667eea', activeText: 'white' },
              { id: 'state', label: 'State Distribution', icon: '🗺️', activeColor: '#67e8f9', activeText: '#333' },
              { id: 'country', label: 'Country Distribution', icon: '🌍', activeColor: '#764ba2', activeText: 'white' },
              { id: 'outcome', label: 'Department Outcome', icon: '📊', activeColor: '#43e97b', activeText: 'white' },
            ].map(({ id, label, icon, activeColor, activeText }) => (
              <button key={id} type="button" onClick={() => setActiveView(id)} className="iar-view-tab" style={{
                backgroundColor: activeView === id ? activeColor : undefined,
                color: activeView === id ? activeText : undefined,
                fontWeight: activeView === id ? '600' : undefined,
              }}>
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>

          <div className="chart-section iar-chart-section-mb">
            {/* Compact filter bar */}
            <div className="iar-filter-bar">
              <div className="iar-filter-header">
                <span className="iar-filter-title">Filters</span>
                <button className="clear-filters-btn" onClick={handleClearFilters}>
                  Clear All Filters
                </button>
              </div>
              <div className="iar-filter-grid">
                {[
                  { id: 'iar-dept', label: 'Department', key: 'department', options: filterOptions.departments },
                  { id: 'iar-program', label: 'Course Type', key: 'course_type', options: filterOptions.course_types },
                ].map(({ id, label, key, options }) => (
                  <div key={id} className="iar-filter-field">
                    <label htmlFor={id} className="iar-filter-label">{label}</label>
                    <select id={id} value={filters[key]}
                      onChange={(e) => handleFilterChange(key, e.target.value)}
                      className="iar-filter-select">
                      <option value="All">All</option>
                      {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Outcome Trend View ── */}
            <div style={{ display: activeView === 'trend' ? 'block' : 'none' }}>
              <div className="chart-mode-toggle">
                {['Bar', 'Trend'].map(type => (
                  <button key={type} onClick={() => setChartType(type)} className={`chart-mode-btn${chartType === type ? ' chart-mode-btn--active' : ''}`}>{type}</button>
                ))}
              </div>
              <div>
                <div className="iar-chart-header">
                  <h2>
                    <span className="iar-icon-span">📈</span> Outcome Trend Over Years
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

                <div className="iar-relative">
                  {trendData.length === 0 && (
                    <div className="no-data-overlay">
                      <span className="no-data-overlay-icon">📈</span>
                      <p className="no-data-overlay-text">No trend data available for the selected filters.</p>
                    </div>
                  )}
                  <div id="iar-outcome-trend-container" className="chart-container">
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Bar' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Outcome Trend over Years",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <BarChart data={trendData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip denominatorKey="total" excludePercentageFor={['Total Alumni']} />} />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Bar dataKey="total" name="Total Alumni" fill={TREND_TOTAL_COLOR} radius={[6, 6, 0, 0]} barSize={20}>
                                <LabelList dataKey="total" content={<ClippedLabel fill={TREND_TOTAL_COLOR} />} />
                              </Bar>
                              <Bar dataKey="higher" name="Higher Studies" fill={TREND_HIGHER_COLOR} radius={[6, 6, 0, 0]} barSize={20}>
                                <LabelList dataKey="higher" content={<ClippedLabel fill={TREND_HIGHER_COLOR} />} />
                              </Bar>
                              <Bar dataKey="corporate" name="Corporate" fill={TREND_CORPORATE_COLOR} radius={[6, 6, 0, 0]} barSize={20}>
                                <LabelList dataKey="corporate" content={<ClippedLabel fill={TREND_CORPORATE_COLOR} />} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={trendData} margin={{ top: 24, right: 10, left: chartIsMobile ? 0 : 40, bottom: chartIsMobile ? 60 : 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
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
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Trend' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Outcome Trend over Years",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <LineChart data={trendData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip denominatorKey="total" excludePercentageFor={['Total Alumni']} />} />
                              <Legend wrapperStyle={{ paddingTop: '20px' }} />
                              <Line type="linear" dataKey="total" name="Total Alumni" stroke={TREND_TOTAL_COLOR} strokeWidth={3} dot={{ r: 6 }} />
                              <Line type="linear" dataKey="higher" name="Higher Studies" stroke={TREND_HIGHER_COLOR} strokeWidth={3} dot={{ r: 6 }} />
                              <Line type="linear" dataKey="corporate" name="Corporate" stroke={TREND_CORPORATE_COLOR} strokeWidth={3} dot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={trendData} margin={{ top: 24, right: 10, left: chartIsMobile ? 0 : 40, bottom: chartIsMobile ? 60 : 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
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

                    <div className="iar-stats-bar">
                      <div>
                        <div className="iar-stat-metric iar-stat-metric--purple">{trendData.reduce((sum, item) => sum + item.total, 0)}</div>
                        <div className="iar-stat-sub">Total Alumni</div>
                      </div>
                      <div>
                        <div className="iar-stat-metric iar-stat-metric--cyan">{trendData.reduce((sum, item) => sum + item.higher, 0)}</div>
                        <div className="iar-stat-sub">Higher Studies</div>
                      </div>
                      <div>
                        <div className="iar-stat-metric iar-stat-metric--orange">{trendData.reduce((sum, item) => sum + item.corporate, 0)}</div>
                        <div className="iar-stat-sub">Corporate</div>
                      </div>
                      <div>
                        <div className="iar-stat-metric iar-stat-metric--violet">{trendData.length}</div>
                        <div className="iar-stat-sub">Years Covered</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── State Distribution View ── */}
            <div style={{ display: activeView === 'state' ? 'block' : 'none' }}>
              <div>
                <div className="iar-chart-header">
                  <div>
                    <h2>
                      <span className="iar-icon-span">🗺️</span> State-wise Alumni Distribution
                    </h2>
                    <p className="chart-description">Top 5 states by alumni count</p>
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
                <div className="iar-relative">
                  {stateDistribution.length === 0 && (
                    <div className="no-data-overlay">
                      <span className="no-data-overlay-icon">🗺️</span>
                      <p className="no-data-overlay-text">No state distribution data to display.</p>
                    </div>
                  )}
                  <div id="iar-state-dist-container" className="chart-container">
                    <div
                      className="clickable-chart"
                      onClick={() => setExpandedChart({
                        title: "State-wise Alumni Distribution",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <PieChart>
                              <Pie data={stateTop10} dataKey="count" nameKey="state" cx="50%" cy="50%" outerRadius={180} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}>
                                {stateTop10.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<StatePieTooltip />} />
                              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontWeight: 600, fontSize: '14px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
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
                    </div>
                    {stateTop10.length > 0 && (
                      <PieDistributionTable data={stateTop10} nameKey="state" total={stateTotal} colors={PIE_COLORS} chartIsMobile={chartIsMobile} />
                    )}
                    <div className="iar-info-box">
                      <h2>
                        Total Alumni : <span className="iar-info-highlight--purple">{summary?.total_alumni || 0}</span>{' '}
                        out of which{' '}
                        <span className="iar-info-highlight--green">{countryDistribution.find(c => c.country?.toLowerCase() === 'india')?.count || stateDistribution.filter(s => s.state !== 'Not Found').reduce((sum, item) => sum + item.count, 0)}</span>{' '}
                        settled in{' '}
                        <span className="iar-info-highlight--orange">{stateDistribution.filter(s => s.state !== 'Not Found').length}</span>{' '}
                        Indian States / Union Territories
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Country Distribution View ── */}
            <div style={{ display: activeView === 'country' ? 'block' : 'none' }}>
              <div>
                <div className="iar-chart-header">
                  <div>
                    <h2>
                      <span className="iar-icon-span">🌍</span> Global Alumni Reach
                    </h2>
                    <p className="chart-description">Top 5 countries by alumni count</p>
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
                <div className="iar-relative">
                  {countryDistribution.length === 0 && (
                    <div className="no-data-overlay">
                      <span className="no-data-overlay-icon">🌍</span>
                      <p className="no-data-overlay-text">No country distribution data to display.</p>
                    </div>
                  )}
                  <div id="iar-country-dist-container" className="chart-container">
                    <div
                      className="clickable-chart"
                      onClick={() => setExpandedChart({
                        title: "Global Alumni Reach",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <PieChart>
                              <Pie data={countryTop10} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={180} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}>
                                {countryTop10.map((entry, index) => (
                                  <Cell key={index} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CountryPieTooltip />} />
                              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontWeight: 600, fontSize: '14px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
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
                    </div>
                    {countryTop10.length > 0 && (
                      <PieDistributionTable data={countryTop10} nameKey="country" total={countryTotal} colors={PIE_COLORS} chartIsMobile={chartIsMobile} />
                    )}
                    <div className="iar-info-box">
                      <h2>
                        Total Alumni : <span className="iar-info-highlight--purple">{summary?.total_alumni || 0}</span>{' '}
                        out of which{' '}
                        <span className="iar-info-highlight--green">{(summary?.total_alumni || 0) - (countryDistribution.find(c => c.country?.toLowerCase() === 'india')?.count || stateDistribution.filter(s => s.state !== 'Not Found').reduce((sum, item) => sum + item.count, 0))}</span>{' '}
                        settled across{' '}
                        <span className="iar-info-highlight--orange">{countryDistribution.length}</span>{' '}
                        Countries
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Outcome by Department View ── */}
            <div style={{ display: activeView === 'outcome' ? 'block' : 'none' }}>
              <div>
                <div className="iar-chart-header">
                  <div>
                    <h2>
                      <span className="iar-icon-span">📊</span> Outcome by Department
                    </h2>
                    <p className="chart-description">
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

                {/* Graph / Table toggle */}
                <div className="iar-graph-table-toggle">
                  {['Graph', 'Table'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setOutcomeDisplayMode(mode)}
                      className={`iar-toggle-btn${outcomeDisplayMode === mode ? ' iar-toggle-btn--active' : ''}`}
                    >
                      {mode === 'Graph' ? '📊 Graph' : '📋 Table'}
                    </button>
                  ))}
                </div>

                <div className="iar-relative">
                  {outcomeBreakdown.length === 0 && (
                    <div className="no-data-overlay">
                      <span className="no-data-overlay-icon">📊</span>
                      <p className="no-data-overlay-text">No departmental breakdown to display.</p>
                    </div>
                  )}

                  {/* Fixed-height panel */}
                  <div className="iar-fixed-panel">

                    {/* GRAPH panel */}
                    <div className="iar-graph-panel" style={{ display: outcomeDisplayMode === 'Graph' ? 'flex' : 'none' }}>
                      <div className="iar-legend">
                        {[
                          { color: HIGHER_BAR_COLOR, label: 'Higher Studies' },
                          { color: CORPORATE_BAR_COLOR, label: 'Corporate' },
                        ].map(({ color, label }) => (
                          <div key={label} className="iar-legend-pill">
                            <span className="iar-legend-dot" style={{ background: color }} />
                            <span className="iar-legend-label">{label}</span>
                          </div>
                        ))}
                      </div>

                      <div
                        id="iar-dept-outcome-container"
                        className="clickable-chart iar-chart-area"
                        onClick={() => setExpandedChart({
                          title: "Outcome by Department",
                          content: (
                            <ResponsiveContainer width="100%" height={500}>
                              <BarChart data={sortedOutcomeBreakdown} margin={{ top: 40, right: 30, left: 40, bottom: 120 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} tick={{ fill: '#333', fontSize: 12, fontWeight: 600 }} />
                                <YAxis tick={{ fontSize: 13, fontWeight: 600 }} />
                                <Tooltip content={<CustomTooltip denominatorKey="total" />} />
                                <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: '20px', fontWeight: 600 }} />
                                <Bar dataKey="higher" name="Higher Studies" fill={HIGHER_BAR_COLOR} radius={[6, 6, 0, 0]}>
                                  <LabelList dataKey="higher" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: HIGHER_BAR_COLOR }} />
                                </Bar>
                                <Bar dataKey="corporate" name="Corporate" fill={CORPORATE_BAR_COLOR} radius={[6, 6, 0, 0]}>
                                  <LabelList dataKey="corporate" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: CORPORATE_BAR_COLOR }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )
                        })}
                      >
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

                    {/* TABLE panel */}
                    <div className="iar-table-panel" style={{ display: outcomeDisplayMode === 'Table' ? 'flex' : 'none' }}>
                      <div className="iar-table-export-row">
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
                      <div id="iar-dept-outcome-table" className="iar-table-scroll">
                        {chartIsMobile ? (
                          <div className="iar-mobile-cards">
                            {sortedOutcomeBreakdown.map((row) => (
                              <div key={row.department} className="iar-mobile-card">
                                <div className="iar-mobile-card-dept">{row.department}</div>
                                <div className="iar-mobile-card-stats">
                                  <div className="iar-mobile-stat">
                                    <div className="iar-mobile-stat-label">Total</div>
                                    <div className="iar-mobile-stat-value iar-mobile-stat-value--total">{row.total}</div>
                                  </div>
                                  <div className="iar-mobile-stat">
                                    <div className="iar-mobile-stat-label">Higher</div>
                                    <div className="iar-mobile-stat-value iar-mobile-stat-value--higher">{row.higher}</div>
                                  </div>
                                  <div className="iar-mobile-stat">
                                    <div className="iar-mobile-stat-label">Corp</div>
                                    <div className="iar-mobile-stat-value iar-mobile-stat-value--corp">{row.corporate}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <table className="iar-outcome-table">
                            <thead className="iar-outcome-thead">
                              <tr>
                                <th>Department</th>
                                <th>Total Alumni</th>
                                <th>Higher Studies</th>
                                <th>Corporate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedOutcomeBreakdown.map((row, index) => (
                                <tr key={row.department} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                  <td>{row.department}</td>
                                  <td>{row.total}</td>
                                  <td>{row.higher}</td>
                                  <td>{row.corporate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="iar-stats-bar">
                    <div>
                      <div className="iar-stat-metric iar-stat-metric--purple">{outcomeBreakdown.reduce((sum, item) => sum + item.total, 0)}</div>
                      <div className="iar-stat-sub">Total Alumni</div>
                    </div>
                    <div>
                      <div className="iar-stat-metric iar-stat-metric--green">{outcomeBreakdown.reduce((sum, item) => sum + (item.higher || 0), 0)}</div>
                      <div className="iar-stat-sub">Higher Studies</div>
                    </div>
                    <div>
                      <div className="iar-stat-metric iar-stat-metric--pink">{outcomeBreakdown.reduce((sum, item) => sum + (item.corporate || 0), 0)}</div>
                      <div className="iar-stat-sub">Corporate</div>
                    </div>
                    <div>
                      <div className="iar-stat-metric iar-stat-metric--orange">{outcomeBreakdown.length}</div>
                      <div className="iar-stat-sub">Departments</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alumni CTA Banner */}
          <div className="iar-cta-banner">
            <div className="iar-cta-body">
              <div>
                <h3 className="iar-cta-title">Explore About our Alumni</h3>
                <p className="iar-cta-desc">Explore the achievements, innovations, and leadership journeys of our alumni community at IAR IIT Palakkad</p>
              </div>
            </div>
            <a
              href="https://iar.iitpkd.ac.in/home"
              target="_blank"
              rel="noopener noreferrer"
              className="iar-cta-link"
            >
              Visit iar.iitpkd.ac.in →
            </a>
          </div>
        </div>

      {/* Upload Modal */}
      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="iar_stats"
        token={token}
      />

      {/* Fullscreen Chart Modal */}
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

export default IarSection;
