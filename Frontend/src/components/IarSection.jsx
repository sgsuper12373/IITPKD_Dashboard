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

import DataUploadModal from './DataUploadModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './IarSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import { CustomTooltip } from '../utils/chartUtils';

const PIE_COLORS = ['#667eea', '#764ba2', '#f093fb', '#43e97b', '#fa709a', '#00f2fe', '#f59e0b', '#a78bfa'];
const STATE_BAR_COLOR = '#67e8f9';
const HIGHER_BAR_COLOR = '#43e97b';
const CORPORATE_BAR_COLOR = '#fa709a';
const TREND_TOTAL_COLOR = '#667eea';
const TREND_HIGHER_COLOR = '#22d3ee';
const TREND_CORPORATE_COLOR = '#f97316';

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

  // Top 10 outcome departments sorted by total, capped at 10
  const sortedOutcomeBreakdown = useMemo(() => {
    return [...outcomeBreakdown]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10);
  }, [outcomeBreakdown]);

  // Top 5 states, excluding 'Not Found'
  const stateTop10 = useMemo(() => {
    return [...stateDistribution]
      .filter(item => item.state !== 'Not Found')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stateDistribution]);

  // Top 5 countries, excluding 'Other'
  const countryTop10 = useMemo(() => {
    return [...countryDistribution]
      .filter(item => item.country !== 'Other')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [countryDistribution]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI state to control which visualization block is visible
  const [activeView, setActiveView] = useState('trend'); // 'trend' | 'state' | 'country' | 'outcome'
  const [chartType, setChartType] = useState('Bar'); // 'Bar' | 'Trend'

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const canViewRestrictedSection = isPublicView && !isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await fetchFilterOptions(token);
        setFilterOptions({
          departments: Array.isArray(options?.departments) ? options.departments : [],
          course_types: Array.isArray(options?.course_types) ? options.course_types : [],
        });
      } catch (err) {
        console.error('Failed to load filter options:', err);
        setError(err.message || 'Failed to load filter options.');
      }
    };
    loadFilterOptions();
  }, [token, uploadVersion]);

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
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({ department: 'All', course_type: 'All' });
  };

  const trendData = useMemo(() => summary.trend || [], [summary.trend]);

  // Using shared CustomTooltip from chartUtils

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button
            className="page-back-btn"
            onClick={() => navigate('/people-campus')}
          >
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
                <button
                  className="page-upload-btn"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <span>📤</span> Upload Data
                </button>
              )}
            </div>
          </div>
        )}

        {error && <div className="error-message" style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>{error}</div>}

        <div style={{ position: 'relative', minHeight: '600px' }}>


          {/* ... Summary Cards ... */}
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
          {/* Modern Summary Cards */}
          <div id="iar-summary-cards-container" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Total Alumni Card */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>👥</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Alumni</span>
                </div>
                <div className="metric-value" style={{ color: 'white', marginBottom: '8px' }}>
                  {summary.total_alumni}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Alumni matched with filters</span>
                </div>
              </div>
            </div>

            {/* Higher Studies Card */}
            <div style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 20px rgba(34, 211, 238, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>🎓</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Higher Studies</span>
                </div>
                <div className="metric-value" style={{ color: 'white', marginBottom: '8px' }}>
                  {summary.higher_studies}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Pursuing research/education</span>
                </div>
              </div>
            </div>

            {/* Corporate Careers Card */}
            <div style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 10px 20px rgba(249, 115, 22, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>💼</span>
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Corporate Careers</span>
                </div>
                <div className="metric-value" style={{ color: 'white', marginBottom: '8px' }}>
                  {summary.corporate}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Working in industry</span>
                </div>
              </div>
            </div>
          </div>

          {/* View selector for different IAR charts */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '10px',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => setActiveView('trend')}
              style={{
                padding: '10px 24px',
                backgroundColor: activeView === 'trend' ? '#667eea' : '#f8f9fa',
                color: activeView === 'trend' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === 'trend' ? '600' : '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📈</span> Outcome Trend
            </button>
            <button
              type="button"
              onClick={() => setActiveView('state')}
              style={{
                padding: '10px 24px',
                backgroundColor: activeView === 'state' ? '#67e8f9' : '#f8f9fa',
                color: activeView === 'state' ? '#333' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === 'state' ? '600' : '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🗺️</span> State Distribution
            </button>
            <button
              type="button"
              onClick={() => setActiveView('country')}
              style={{
                padding: '10px 24px',
                backgroundColor: activeView === 'country' ? '#764ba2' : '#f8f9fa',
                color: activeView === 'country' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === 'country' ? '600' : '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>🌍</span> Country Distribution
            </button>
            <button
              type="button"
              onClick={() => setActiveView('outcome')}
              style={{
                padding: '10px 24px',
                backgroundColor: activeView === 'outcome' ? '#43e97b' : '#f8f9fa',
                color: activeView === 'outcome' ? 'white' : '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === 'outcome' ? '600' : '500',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>📊</span> Department Outcome
            </button>
          </div>

          <div className="chart-section" style={{
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* ── Compact filter bar ── */}
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
                  style={{ padding: '0.3rem 0.85rem', fontSize: '0.78rem', borderRadius: '6px', border: 'none', backgroundColor: '#dc3545', color: '#fff', cursor: 'pointer' }}>
                  Clear All Filters
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
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

            {/* Outcome Trend View */}
            <div style={{ display: activeView === 'trend' ? 'block' : 'none' }}>
              {/* Bar / Trend toggle — only for Outcome Trend view */}
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
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>📈</span> Outcome Trend Over Years
                    </h2>
                  </div>
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
                        <BarChart data={trendData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="total" name="Total Alumni" fill={TREND_TOTAL_COLOR} radius={[4, 4, 0, 0]} barSize={14}>
                            <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TREND_TOTAL_COLOR }} />
                          </Bar>
                          <Bar dataKey="higher" name="Higher Studies" fill={TREND_HIGHER_COLOR} radius={[4, 4, 0, 0]} barSize={14}>
                            <LabelList dataKey="higher" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TREND_HIGHER_COLOR }} />
                          </Bar>
                          <Bar dataKey="corporate" name="Corporate" fill={TREND_CORPORATE_COLOR} radius={[4, 4, 0, 0]} barSize={14}>
                            <LabelList dataKey="corporate" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TREND_CORPORATE_COLOR }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={trendData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Line type="linear" dataKey="total" name="Total Alumni" stroke={TREND_TOTAL_COLOR} strokeWidth={2.5} dot={{ r: 3 }}>
                            <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TREND_TOTAL_COLOR }} />
                          </Line>
                          <Line type="linear" dataKey="higher" name="Higher Studies" stroke={TREND_HIGHER_COLOR} strokeWidth={2} dot={{ r: 3 }}>
                            <LabelList dataKey="higher" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TREND_HIGHER_COLOR }} />
                          </Line>
                          <Line type="linear" dataKey="corporate" name="Corporate" stroke={TREND_CORPORATE_COLOR} strokeWidth={2} dot={{ r: 3 }}>
                            <LabelList dataKey="corporate" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: TREND_CORPORATE_COLOR }} />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Statistics */}
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#667eea' }}>{trendData.reduce((sum, item) => sum + item.total, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Total Alumni</div></div>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#22d3ee' }}>{trendData.reduce((sum, item) => sum + item.higher, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Higher Studies</div></div>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#f97316' }}>{trendData.reduce((sum, item) => sum + item.corporate, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Corporate</div></div>
                      <div style={{ textAlign: 'center' }}><div className="metric-value-sm" style={{ color: '#a855f7' }}>{trendData.length}</div><div style={{ color: '#666', fontSize: '11px' }}>Years Covered</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* State Distribution View */}
            <div style={{ display: activeView === 'state' ? 'block' : 'none' }}>
              <div>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🗺️</span> State-wise Alumni Distribution
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Top 5 states by alumni count
                    </p>
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
                        {stateTop10.length > 0 && <Tooltip content={<CustomTooltip />} />}
                        {stateTop10.length > 0 && <Legend />}
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Chart Statistics */}
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ textAlign: 'center' }}><div style={{ color: '#67e8f9', fontWeight: 'bold', fontSize: '20px' }}>{stateDistribution.reduce((sum, item) => sum + item.count, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Total Alumni</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '20px' }}>{stateDistribution.length}</div><div style={{ color: '#666', fontSize: '11px' }}>States Represented</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '20px' }}>{stateDistribution.length > 0 ? Math.max(...stateDistribution.map(item => item.count)) : 0}</div><div style={{ color: '#666', fontSize: '11px' }}>Highest Count</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Country Distribution View */}
            <div style={{ display: activeView === 'country' ? 'block' : 'none' }}>
              <div>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>🌍</span> Global Alumni Reach
                    </h2>
                    <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                      Top 5 countries by alumni count
                    </p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '0 0 280px' }}>
                        <ResponsiveContainer width={280} height={280}>
                          <PieChart>
                            <Pie data={countryTop10.length > 0 ? countryTop10 : [{ country: '', count: 1 }]} dataKey="count" nameKey="country" cx="50%" cy="50%" outerRadius={120} labelLine={false}>
                              {(countryTop10.length > 0 ? countryTop10 : [{ country: '' }]).map((entry, index) => (
                                <Cell key={index} fill={countryTop10.length > 0 ? PIE_COLORS[index % PIE_COLORS.length] : '#f0f0f0'} />
                              ))}
                            </Pie>
                            {countryTop10.length > 0 && <Tooltip content={<CustomTooltip />} />}
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {countryTop10.map((entry, index) => {
                          const total = countryTop10.reduce((s, i) => s + i.count, 0);
                          const pct = total ? ((entry.count / total) * 100).toFixed(1) : '0.0';
                          return (
                            <div key={entry.country} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: PIE_COLORS[index % PIE_COLORS.length], flexShrink: 0 }} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#333', flex: 1 }}>{entry.country}</span>
                              <span style={{ fontSize: '12px', color: '#666' }}>{entry.count} alumni</span>
                              <span style={{ fontSize: '11px', color: '#999', width: '40px', textAlign: 'right' }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ textAlign: 'center' }}><div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '20px' }}>{countryDistribution.length}</div><div style={{ color: '#666', fontSize: '11px' }}>Countries</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '20px' }}>{countryDistribution.reduce((sum, item) => sum + item.count, 0)}</div><div style={{ color: '#666', fontSize: '11px' }}>Total Alumni</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '20px' }}>{countryDistribution.length > 0 ? Math.max(...countryDistribution.map(item => item.count)) : 0}</div><div style={{ color: '#666', fontSize: '11px' }}>Highest Count</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome by Department View */}
            <div style={{ display: activeView === 'outcome' ? 'block' : 'none' }}>
              <div>
                <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                <div style={{ position: 'relative' }}>
                  {outcomeBreakdown.length === 0 && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(4px)', borderRadius: '8px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '40px', marginBottom: '10px' }}>📊</span>
                      <p style={{ color: '#888', fontSize: '15px', fontWeight: 500, margin: 0 }}>No departmental breakdown to display.</p>
                    </div>
                  )}
                  <>
                    {/* Custom legend — clean pill badges above the chart */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'flex-end' }}>
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
                    <div id="iar-dept-outcome-container" className="chart-container">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={sortedOutcomeBreakdown} margin={{ top: 10, right: 20, left: 40, bottom: 80 }} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="department" angle={-38} textAnchor="end" height={80} tick={{ fontSize: 10 }} interval={0} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="higher" name="Higher Studies" fill={HIGHER_BAR_COLOR} radius={[4, 4, 0, 0]} barSize={12}>
                            <LabelList dataKey="higher" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: HIGHER_BAR_COLOR }} />
                          </Bar>
                          <Bar dataKey="corporate" name="Corporate" fill={CORPORATE_BAR_COLOR} radius={[4, 4, 0, 0]} barSize={12}>
                            <LabelList dataKey="corporate" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: CORPORATE_BAR_COLOR }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Chart Statistics */}
                      <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '10px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '20px' }}>
                            {outcomeBreakdown.reduce((sum, item) => sum + item.total, 0)}
                          </div>
                          <div style={{ color: '#666', fontSize: '11px' }}>Total Alumni</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#43e97b', fontWeight: 'bold', fontSize: '20px' }}>
                            {outcomeBreakdown.reduce((sum, item) => sum + (item.higher || 0), 0)}
                          </div>
                          <div style={{ color: '#666', fontSize: '11px' }}>Higher Studies</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#fa709a', fontWeight: 'bold', fontSize: '20px' }}>
                            {outcomeBreakdown.reduce((sum, item) => sum + (item.corporate || 0), 0)}
                          </div>
                          <div style={{ color: '#666', fontSize: '11px' }}>Corporate</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '20px' }}>
                            {outcomeBreakdown.length}
                          </div>
                          <div style={{ color: '#666', fontSize: '11px' }}>Departments</div>
                        </div>
                      </div>
                    </div>

                    {/* Departmental Outcome Summary Table */}
                    <div className="grievance-table-wrapper" style={{ marginTop: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div className="chart-header">
                          <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '18px' }}>Departmental Outcome Summary</h3>
                          <p className="chart-description" style={{ color: '#666', fontSize: '12px', margin: 0 }}>
                            Tabular view listing counts per department.
                          </p>
                        </div>
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

                      <div id="iar-dept-outcome-table" className="table-responsive" style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '13px'
                        }}>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#43e97b', color: 'white' }}>
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
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
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