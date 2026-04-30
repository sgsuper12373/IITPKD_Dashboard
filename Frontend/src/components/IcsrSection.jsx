import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
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
  fetchIcsrSummary,
  fetchIcsrYearlyDistribution,
  fetchIcsrEventTypes,
  fetchIcsrEvents,
  fetchIcsrFilterOptions
} from '../services/industryConnectStats';
import DataUploadModal from './DataUploadModal';
import ExportMenu from './ExportMenu';
import { CustomTooltip } from '../utils/chartUtils';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';

const EVENT_TYPE_COLORS = ['#4f46e5', '#22c55e', '#0ea5e9', '#f97316', '#a855f7', '#facc15', '#fb7185', '#14b8a6', '#ec4899', '#8b5cf6'];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCompactCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  if (value >= 10000000) {
    return '₹' + (value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  } else if (value >= 100000) {
    return '₹' + (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  }
  return '₹' + formatNumber(value);
};

function IcsrSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [summary, setSummary] = useState({
    total_events: 0,
    total_funding: 0
  });

  const [yearlyDistribution, setYearlyDistribution] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    event_types: [],
    departments: [],
    years: []
  });

  // View type selection with radio buttons
  const [viewType, setViewType] = useState('yearly'); // 'yearly' | 'eventTypes' | 'eventsDirectory'
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'trend'

  const [filters, setFilters] = useState({
    event_type: 'All',
    department: 'All',
    year: 'All',
    search: ''
  });

  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 50,
    total: 0,
    total_pages: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Upload Modal State
  const [activeUploadTable] = useState('industry_events');

  // Data loading functions
  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchIcsrSummary(filters, token);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load summary data');
    } finally {
      setLoading(false);
    }
  }, [token, filters, uploadVersion]);

  const loadYearlyDistribution = useCallback(async () => {
    if (!token) return;
    try {
      const result = await fetchIcsrYearlyDistribution(filters, token);
      setYearlyDistribution(result.data || []);
    } catch (err) {
      console.error('Error loading yearly distribution:', err);
    }
  }, [token, filters, uploadVersion]);

  const loadEventTypes = useCallback(async () => {
    if (!token) return;
    try {
      const result = await fetchIcsrEventTypes(filters, token);
      setEventTypes(result.data || []);
    } catch (err) {
      console.error('Error loading event types:', err);
    }
  }, [token, filters, uploadVersion]);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    try {
      const result = await fetchIcsrEvents(
        filters,
        pagination.page,
        pagination.per_page,
        token
      );
      setEventsList(result.data || []);
      setPagination(prev => result.pagination || prev);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }, [token, filters, pagination.page, pagination.per_page, uploadVersion]);

  const loadFilterOptions = useCallback(async () => {
    if (!token) return;
    try {
      const options = await fetchIcsrFilterOptions(token);
      setFilterOptions({
        event_types: options?.event_types || [],
        departments: options?.departments || [],
        years: options?.years || []
      });
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  }, [token, uploadVersion]);

  const refreshData = () => {
    loadSummary();
    loadYearlyDistribution();
    loadEventTypes();
    loadEvents();
    loadFilterOptions();
  };

  // Initial Data Load (Filter options only once, summary/charts on filters)
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Load summary and chart data when filters change
  useEffect(() => {
    loadSummary();
    loadYearlyDistribution();
    loadEventTypes();
  }, [loadSummary, loadYearlyDistribution, loadEventTypes, filters]);

  // Load events when filters/pagination change
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleClearFilters = () => {
    setFilters({
      event_type: 'All',
      department: 'All',
      year: 'All',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Chart data
  const yearlyChartData = useMemo(() => {
    return yearlyDistribution.map(row => ({
      year: row.year,
      events: row.event_count || 0
    }));
  }, [yearlyDistribution]);

  const eventTypesPieData = useMemo(() => {
    const sortedData = [...eventTypes].sort((a, b) => b.count - a.count);
    const top5 = sortedData.slice(0, 5);
    const others = sortedData.slice(5);

    const othersCount = others.reduce((sum, item) => sum + (item.count || 0), 0);

    const pieData = top5.map(row => ({
      name: row.event_type,
      value: row.count || 0
    }));

    if (othersCount > 0) {
      pieData.push({
        name: 'Others',
        value: othersCount
      });
    }

    return pieData;
  }, [eventTypes]);

  // Using shared CustomTooltip from chartUtils

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isPublicView && (
          <>
            <button className="page-back-btn" onClick={() => navigate('/industry-connect')}>
              ← Back to Industry Connect
            </button>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1>ICSR Section - Industry Interaction Events</h1>
              </div>
              {user && user.role_id === 3 && (
                <div className="page-header-actions">
                  <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                    <span>📤</span> Upload Events Data
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
          <h2 style={{ textDecoration: "underline", color: isPublicView ? "#000000" : "#ffffff", textShadow: isPublicView ? "0 1px 2px rgba(255,255,255,0.6)" : "0 2px 6px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.6)", margin: 0, fontSize: "20px" }}>
            ICSR Summary
          </h2>
          <ExportMenu
            elementId="icsr-summary-cards-container"
            data={[summary]}
            headers={['Total Events', 'Total Funding']}
            keys={['total_events', 'total_funding']}
            filename="icsr_summary"
            title="ICSR Summary"
          />
        </div>
        {/* Modern Summary Cards */}
        <div id="icsr-summary-cards-container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Total Industry Events Card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer'
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-40px',
              width: '180px',
              height: '180px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>🏭</span>
                <h3 style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '18px',
                  fontWeight: '500'
                }}>Total Industry Events</h3>
              </div>
              <div className="metric-value">
                {formatNumber(summary.total_events)}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%'
                }} />
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Total industry interactions
                </span>
              </div>
            </div>
          </div>

          {/* Departments Involved Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 15px 35px rgba(240, 147, 251, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer'
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-40px',
              width: '180px',
              height: '180px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>💰</span>
                <h3 style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '18px',
                  fontWeight: '500'
                }}>Total Funding Generated</h3>
              </div>
              <div className="metric-value" title={`₹${formatNumber(summary.total_funding)}`}>
                {formatCompactCurrency(summary.total_funding)}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%'
                }} />
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Amount sanctioned from events
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Radio Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '30px',
          padding: '20px',
          borderRadius: '12px'
        }}>
          <button
            onClick={() => setViewType('yearly')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'yearly' ? '#667eea' : 'transparent',
              color: viewType === 'yearly' ? 'white' : '#333',
              border: viewType === 'yearly' ? '2px solid #667eea' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'yearly' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📊 Year-wise Trend
          </button>
          <button
            onClick={() => setViewType('eventTypes')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'eventTypes' ? '#22c55e' : 'transparent',
              color: viewType === 'eventTypes' ? 'white' : '#333',
              border: viewType === 'eventTypes' ? '2px solid #22c55e' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'eventTypes' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            🥧 Event Type Distribution
          </button>
          <button
            onClick={() => setViewType('eventsDirectory')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'eventsDirectory' ? '#f97316' : 'transparent',
              color: viewType === 'eventsDirectory' ? 'white' : '#333',
              border: viewType === 'eventsDirectory' ? '2px solid #f97316' : '2px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: viewType === 'eventsDirectory' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📋 Industry Event Directory
          </button>
        </div>

        {/* Single View Section based on radio selection */}
        <div className="chart-section" style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#fff',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Yearly Distribution Trend Line Graph */}
          {viewType === 'yearly' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="chart-header">
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📈</span> Year-wise Event Distribution Trend
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                    Yearly trend of industry events over time
                  </p>
                </div>
                <ExportMenu
                  elementId="icsr-yearly-trend-container"
                  data={yearlyChartData}
                  headers={['Year', 'Events']}
                  keys={['year', 'events']}
                  filename="icsr_yearly_events"
                  title="Year-wise Event Distribution Trend"
                />
              </div>

              {/* Filters inside the yearly view */}
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                  <button
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

                <div className="filter-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px'
                }}>
                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Event Type</label>
                    <select
                      value={filters.event_type}
                      onChange={(e) => handleFilterChange('event_type', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    >
                      <option value="All">All Types</option>
                      {filterOptions.event_types.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                    <select
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Search Events</label>
                    <input
                      type="text"
                      placeholder="Search by title, industry partner..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Active Filters Summary */}
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <strong>Active Filters:</strong>{' '}
                  {filters.event_type !== 'All' && <span style={{ marginRight: '8px' }}>📌 {filters.event_type}</span>}
                  {filters.year !== 'All' && <span style={{ marginRight: '8px' }}>📅 {filters.year}</span>}
                  {filters.search && <span style={{ marginRight: '8px' }}>🔍 "{filters.search}"</span>}
                  {filters.event_type === 'All' && filters.year === 'All' && !filters.search &&
                    <span>No filters applied</span>
                  }
                </div>
              </div>

              {/* Bar / Trend toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['bar', 'trend'].map((mode) => (
                  <button key={mode} onClick={() => setChartMode(mode)} style={{
                    padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
                    background: chartMode === mode ? '#667eea' : '#e9ecef',
                    color: chartMode === mode ? '#fff' : '#555',
                  }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                ))}
              </div>

              <div className="data-content-wrapper">

                <div id="icsr-yearly-trend-container" className={`chart-container ${yearlyChartData.length === 0 ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                  <div className={`section-empty-state ${yearlyChartData.length > 0 ? 'hidden' : ''}`}>
                    <p>No yearly distribution data available for the selected filters</p>
                  </div>
                  <div className={`chart-wrapper ${chartMode === 'bar' ? 'active' : 'inactive'}`}>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="year"
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 12 }}
                          label={{
                            value: 'Year',
                            position: 'insideBottom',
                            offset: -10,
                            style: { fill: '#666', fontSize: 14, fontWeight: 'bold' }
                          }}
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 12 }}
                          label={{
                            value: 'Number of Events',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: '#666', fontSize: 14, fontWeight: 'bold' }
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                        <Bar dataKey="events" name="Events" fill="#667eea" radius={[4, 4, 0, 0]} barSize={28}>
                          <LabelList dataKey="events" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={`chart-wrapper ${chartMode === 'trend' ? 'active' : 'inactive'}`}>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={yearlyChartData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="year"
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 12 }}
                          label={{
                            value: 'Year',
                            position: 'insideBottom',
                            offset: -10,
                            style: { fill: '#666', fontSize: 14, fontWeight: 'bold' }
                          }}
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fill: '#666', fontSize: 12 }}
                          label={{
                            value: 'Number of Events',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: '#666', fontSize: 14, fontWeight: 'bold' }
                          }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="circle" />
                        <Line type="linear"
                          dataKey="events"
                          name="Events"
                          stroke="#667eea"
                          strokeWidth={3}
                          dot={{ r: 6, fill: '#667eea', strokeWidth: 2 }}
                          activeDot={{ r: 8 }}>
                          <LabelList dataKey="events" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

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
                      <div className="metric-value-sm" style={{ color: '#667eea' }}>
                        {yearlyChartData.reduce((sum, item) => sum + item.events, 0)}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>Total Events</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="metric-value-sm" style={{ color: '#22c55e' }}>
                        {yearlyChartData.length > 0 ? Math.max(...yearlyChartData.map(item => item.events)) : 0}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>Peak Events in Year</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="metric-value-sm" style={{ color: '#f97316' }}>
                        {yearlyChartData.length}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>Years Covered</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Event Types Distribution - Pie Chart with Top 5 + Others */}
          {viewType === 'eventTypes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="chart-header">
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🥧</span> Event Type Distribution
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                    Distribution of different types of industry interaction events
                  </p>
                </div>
                <ExportMenu
                  elementId="icsr-event-type-dist-container"
                  data={eventTypesPieData}
                  headers={['Event Type', 'Count']}
                  keys={['name', 'value']}
                  filename="icsr_event_type_distribution"
                  title="Event Type Distribution"
                />
              </div>

              {/* Filters inside the event types view */}
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                  <button
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

                <div className="filter-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                    <select
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Search Events</label>
                    <input
                      type="text"
                      placeholder="Search by title, industry partner..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Active Filters Summary */}
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <strong>Active Filters:</strong>{' '}
                  {filters.year !== 'All' && <span style={{ marginRight: '8px' }}>📅 {filters.year}</span>}
                  {filters.search && <span style={{ marginRight: '8px' }}>🔍 "{filters.search}"</span>}
                  {filters.year === 'All' && !filters.search &&
                    <span>No filters applied</span>
                  }
                </div>
              </div>

              <div className="data-content-wrapper">

                <div id="icsr-event-type-dist-container" className={`chart-container ${eventTypesPieData.length === 0 ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                  <div className={`section-empty-state ${eventTypesPieData.length > 0 ? 'hidden' : ''}`}>
                    <p>No event distribution data available for the selected filters</p>
                  </div>
                  {eventTypesPieData.length > 0 && (
                    <div>
                      {/* Pie Chart for Top 5 + Others */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height={450}>
                          <PieChart margin={{ top: 40, right: 20, left: 20, bottom: 20 }}>
                            <Pie
                              data={eventTypesPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              label={false} // Disable direct labels to prevent overlapping
                            >
                              {eventTypesPieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={EVENT_TYPE_COLORS[index % EVENT_TYPE_COLORS.length]}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${value} events`, name]}
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                              }}
                            />
                            <Legend
                              layout="horizontal"
                              align="center"
                              verticalAlign="top"
                              wrapperStyle={{
                                top: 0,
                                left: 0,
                                width: '100%',
                                paddingBottom: '30px',
                                fontWeight: 'bold',
                                fontSize: '11px'
                              }}
                              iconType="circle"
                              iconSize={10}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

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
                          <div style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '24px' }}>
                            {eventTypesPieData.length}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Event Categories</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>
                            {eventTypesPieData.reduce((sum, item) => sum + item.value, 0)}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Total Events</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '24px' }}>
                            {eventTypesPieData.length > 0
                              ? Math.max(...eventTypesPieData.map(item => item.value))
                              : 0}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Most Common</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Industry Event Directory */}
          {viewType === 'eventsDirectory' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div className="chart-header">
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>📋</span> Industry Event Directory
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                    List of industry interaction events with funding details
                  </p>
                </div>
                <ExportMenu
                  elementId="icsr-event-directory-table"
                  data={eventsList}
                  headers={['Date', 'Event Title', 'Partner', 'Type', 'Funding (₹)']}
                  keys={['event_date', 'event_title', 'industry_partner', 'event_type', 'funding_amount']}
                  filename="icsr_events_directory"
                  title="Industry Event Directory"
                  exportType="table"
                />
              </div>

              {/* Filters inside the events directory view */}
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                  <button
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

                <div className="filter-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px'
                }}>
                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Event Type</label>
                    <select
                      value={filters.event_type}
                      onChange={(e) => handleFilterChange('event_type', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    >
                      <option value="All">All Types</option>
                      {filterOptions.event_types.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Year</label>
                    <select
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    >
                      <option value="All">All Years</option>
                      {filterOptions.years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Search Events</label>
                    <input
                      type="text"
                      placeholder="Search by title, industry partner..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Active Filters Summary */}
                <div style={{
                  marginTop: '12px',
                  padding: '8px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {filters.event_type !== 'All' && <span style={{ marginRight: '8px' }}>📌 {filters.event_type}</span>}
                  {filters.year !== 'All' && <span style={{ marginRight: '8px' }}>📅 {filters.year}</span>}
                  {filters.search && <span style={{ marginRight: '8px' }}>🔍 "{filters.search}"</span>}
                  {filters.event_type === 'All' && filters.year === 'All' && !filters.search &&
                    <span>No filters applied</span>
                  }
                </div>
              </div>

              <div className="data-content-wrapper">

                {/* Fixed Frame with Scrollable Events Table */}
                <div style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  position: 'relative'
                }}>
                  {eventsList.length > 0 ? (
                    <>
                      {/* Table Header - Fixed */}
                      <div style={{
                        backgroundColor: '#f97316',
                        color: 'white',
                        display: 'grid',
                        gridTemplateColumns: '1.8fr 1fr 1.5fr 1fr 1.2fr 1.2fr',
                        gap: '12px',
                        padding: '12px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                      }}>
                        <div>Event Name</div>
                        <div>Type</div>
                        <div>Hosted By</div>
                        <div>Date</div>
                        <div>Target Audience</div>
                        <div>Funding By</div>
                      </div>

                      {/* Scrollable Table Body */}
                      <div style={{
                        maxHeight: '500px',
                        overflowY: 'auto',
                        overflowX: 'auto'
                      }}>
                        {eventsList.map((event, index) => (
                          <div
                            key={event.project_id || index}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.8fr 1fr 1.5fr 1fr 1.2fr 1.2fr',
                              gap: '12px',
                              padding: '12px',
                              backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                              borderBottom: '1px solid #e0e0e0',
                              fontSize: '13px',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ fontWeight: '500' }}>{event.event_name}</div>
                            <div>
                              <span style={{
                                color: '#333',
                                fontSize: '11px',
                                fontWeight: '600',
                                display: 'inline-block'
                              }}>
                                {event.event_type}
                              </span>
                            </div>
                            <div>{event.hosted_by || '—'}</div>
                            <div>{event.date_of_event ? new Date(event.date_of_event).toLocaleDateString() : '—'}</div>
                            <div title={event.target_audience}>{event.target_audience || '—'}</div>
                            <div>{event.funding_by || '—'}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderTop: '1px solid #e0e0e0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '15px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#f97316', fontWeight: 'bold', fontSize: '20px' }}>
                            {eventsList.length}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Showing</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#667eea', fontWeight: 'bold', fontSize: '20px' }}>
                            {new Set(eventsList.map(e => e.event_type)).size}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Event Types</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '20px' }}>
                            {new Set(eventsList.map(e => e.hosted_by).filter(Boolean)).size}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Distinct Hosts</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '20px' }}>
                            {formatCompactCurrency(eventsList.reduce((sum, e) => sum + (e.amount || 0), 0))}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>Total Sanctioned</div>
                        </div>
                      </div>

                      {/* Pagination */}
                      {pagination.total_pages > 1 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '15px',
                          backgroundColor: '#fff',
                          borderTop: '1px solid #e0e0e0'
                        }}>
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: pagination.page === 1 ? '#ccc' : '#f97316',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            ← Previous
                          </button>
                          <span style={{ color: '#666', fontSize: '14px' }}>
                            Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong>
                            <span style={{ marginLeft: '8px', color: '#999' }}>
                              ({formatNumber(pagination.total)} total events)
                            </span>
                          </span>
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.total_pages}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: pagination.page >= pagination.total_pages ? '#ccc' : '#f97316',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: pagination.page >= pagination.total_pages ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="no-data" style={{
                      textAlign: 'center',
                      padding: '60px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
                      <p style={{ color: '#666', fontSize: '16px' }}>No events found for the selected filters.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName={activeUploadTable}
          token={token}
          onUploadSuccess={refreshData}
        />
      </div>
    </div >
  );
}

export default IcsrSection;