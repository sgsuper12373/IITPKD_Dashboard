import { useState, useEffect } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend, LabelList
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import ExportMenu from './ExportMenu';
import {
  fetchOpenHouseSummary,
  fetchOpenHouseList,
  fetchOpenHouseTimeline
} from '../services/outreachExtensionStats';
import './Page.css';
import './AcademicSection.css';
import DataUploadModal from './LazyDataUploadModal';
import { useNavigate } from 'react-router-dom';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function OpenHouseSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  // Chart type selection with radio buttons
  const [chartType, setChartType] = useState('timeline'); // 'timeline' | 'participation'

  const [summary, setSummary] = useState({
    total_events: 0,
    total_visitors: 0,
    departments_participated: 0
  });

  const [timeline, setTimeline] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    year: ''
  });

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load summary data
  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchOpenHouseSummary(token);
        setSummary(data);
      } catch (err) {
        setError(err.message || 'Failed to load summary data');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [token, uploadVersion]);

  // Load timeline data
  useEffect(() => {
    const loadTimeline = async () => {
      try {
        const result = await fetchOpenHouseTimeline(token);
        setTimeline(result.timeline || []);
      } catch (err) {
        console.error('Error loading timeline:', err);
      }
    };
    loadTimeline();
  }, [token, uploadVersion]);

  // Load events list
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const result = await fetchOpenHouseList(
          token,
          pagination.page,
          pagination.per_page,
          filters.search,
          filters.year || null
        );
        setEventsList(result.events || []);
        setPagination(prev => result.pagination || prev);
      } catch (err) {
        console.error('Error loading events:', err);
      }
    };
    loadEvents();
  }, [token, pagination.page, pagination.per_page, filters.search, filters.year, uploadVersion]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleYearChange = (e) => {
    setFilters(prev => ({ ...prev, year: e.target.value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  if (error) {
    return isPublicView ? (
      <p className="error-message">{error}</p>
    ) : (
      <div className="page-container">
        <div className="page-content">
          <h1>Open House</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!isPublicView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          ← Back to Outreach Extension
        </button>
      )}
      {!isReadOnlyView && <h1>Open House</h1>}

      {!isReadOnlyView && isAdmin && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            className="page-upload-btn"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <span>📤</span> Upload Open House Data
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
        <ExportMenu
          elementId="openhouse-summary-cards-container"
          data={[summary]}
          headers={['Total Events', 'Total Visitors', 'Participated Departments']}
          keys={['total_events', 'total_visitors', 'departments_participated']}
          filename="openhouse_summary"
          title="Open House Summary"
        />
      </div>
      {/* Summary Cards - Modern Design */}
      < div id="openhouse-summary-cards-container" className="grid-3" style={{
        gap: '24px',
        marginBottom: '40px'
      }
      }>
        {/* Total Events Card */}
        < div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          {/* Decorative elements */}
          < div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          < div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />

          < div style={{ position: 'relative', zIndex: 1 }}>
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
              }}>🏛️</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Total Open House Events</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {summary.total_events === 0 ? "To Be Updated" : formatNumber(summary.total_events)}
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
                Annual showcase events
              </span>
            </div>
          </div >
        </div >

        {/* Total Visitors Card */}
        < div style={{
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
              }}>👥</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Total Visitors</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {summary.total_visitors === 0 ? "To Be Updated" : formatNumber(summary.total_visitors)}
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
                Community attendees
              </span>
            </div>
          </div>
        </div >

        {/* Participating Departments Card */}
        < div style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(67, 233, 123, 0.3)',
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
              }}>🏢</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Participating Departments</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {summary.departments_participated === 0 ? "To Be Updated" : formatNumber(summary.departments_participated)}
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
                Academic departments
              </span>
            </div>
          </div>
        </div >
      </div >

      {/* Chart Type Selection - Radio Buttons */}
      < div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#333'
          }}>Select Chart View:</span>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: chartType === 'timeline' ? '#667eea' : '#f8f9fa',
            color: chartType === 'timeline' ? 'white' : '#333',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            border: chartType === 'timeline' ? '2px solid #667eea' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="chartType"
              value="timeline"
              checked={chartType === 'timeline'}
              onChange={(e) => setChartType(e.target.value)}
              style={{
                accentColor: '#667eea',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontWeight: chartType === 'timeline' ? 'bold' : 'normal' }}>
              📈 Event Timeline
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: chartType === 'participation' ? '#22c55e' : '#f8f9fa',
            color: chartType === 'participation' ? 'white' : '#333',
            borderRadius: '8px',
            transition: 'all 0.3s ease',
            border: chartType === 'participation' ? '2px solid #22c55e' : '2px solid #e0e0e0'
          }}>
            <input
              type="radio"
              name="chartType"
              value="participation"
              checked={chartType === 'participation'}
              onChange={(e) => setChartType(e.target.value)}
              style={{
                accentColor: '#22c55e',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontWeight: chartType === 'participation' ? 'bold' : 'normal' }}>
              📊 Participation Trends
            </span>
          </label>
        </div>
      </div >

      {/* Single Chart Section based on radio selection */}
      < div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
        marginBottom: '40px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <ExportMenu
            elementId="openhouse-chart-container"
            data={timeline}
            headers={['Year', 'Events', 'Visitors', 'Avg. Depts']}
            keys={['event_year', 'event_count', 'total_visitors', 'avg_departments']}
            filename={`openhouse_${chartType}_trend`}
            title={chartType === 'timeline' ? 'Event Timeline' : 'Participation Trends'}
          />
        </div>
        <div id="openhouse-chart-container">
          {/* Event Timeline Chart */}
          {chartType === 'timeline' && timeline.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <span style={{
                  fontSize: '28px',
                  background: '#f0f0f0',
                  padding: '8px',
                  borderRadius: '12px'
                }}>📈</span>
                <div>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Event Timeline</h3>
                  <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>
                    Trend of events and visitor counts over the years.
                  </p>
                </div>
              </div>
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                <LineChart data={timeline} margin={{ top: 26, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="event_year" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="plainline" />
                  <Line type="linear"
                    dataKey="event_count"
                    stroke="#4f46e5"
                    name="Events"
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#4f46e5' }}>
                    <LabelList dataKey="event_count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#4f46e5" }} />
                  </Line>
                  <Line type="linear"
                    dataKey="total_visitors"
                    stroke="#22c55e"
                    name="Visitors"
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#22c55e' }}>
                    <LabelList dataKey="total_visitors" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#22c55e" }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
)}</>
            </div>
          )}

          {/* Participation Trends Chart */}
          {chartType === 'participation' && timeline.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <span style={{
                  fontSize: '28px',
                  background: '#f0f0f0',
                  padding: '8px',
                  borderRadius: '12px'
                }}>📊</span>
                <div>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>Participation Trends</h3>
                  <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>
                    Average departmental participation vs total visitors.
                  </p>
                </div>
              </div>
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                <BarChart data={timeline} margin={{ top: 26, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="event_year" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                  <Bar dataKey="avg_departments"
                    fill="#0ea5e9"
                    name="Avg. Departments"
                    radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="avg_departments" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#0ea5e9" }} />
                  </Bar>
                  <Bar dataKey="total_visitors"
                    fill="#f97316"
                    name="Total Visitors"
                    radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="total_visitors" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#f97316" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
)}</>
            </div>
          )}
        </div>

        {/* No data message */}
        {
          timeline.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
              <p style={{ color: '#666', fontSize: '16px' }}>No chart data available</p>
            </div>
          )
        }
      </div >

      {/* Events Table Section */}
      < div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              fontSize: '28px',
              background: '#f0f0f0',
              padding: '8px',
              borderRadius: '12px'
            }}>📋</span>
            <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Open House Events</h2>
          </div>
          <ExportMenu
            elementId="openhouse-events-table-container"
            data={eventsList}
            headers={['Year', 'Date', 'Theme', 'Target Audience', 'Departments', 'Visitors']}
            keys={['event_year', 'event_date', 'theme', 'target_audience', 'departments_participated', 'total_visitors']}
            filename="openhouse_events_list"
            title="Open House Events Directory"
          />
        </div>
        <span style={{
          backgroundColor: '#667eea',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {pagination.total} Events
        </span>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1, position: 'relative', minWidth: '250px' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '16px'
            }}>🔍</span>
            <input
              type="text"
              placeholder="Search by theme, audience, or departments..."
              value={filters.search}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>
          <div style={{ position: 'relative', width: '180px' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '16px'
            }}>📅</span>
            <input
              type="number"
              placeholder="Filter by year..."
              value={filters.year}
              onChange={handleYearChange}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>
        </div>


        <div id="openhouse-events-table-container" className="table-responsive" style={{ overflowX: 'auto' }}>
          <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Year</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Theme</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Target Audience</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Departments</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Visitors</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Key Highlights</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Images</th>
              </tr>
            </thead>
            <tbody>
              {eventsList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📋</span>
                    No events found
                  </td>
                </tr>
              ) : (
                eventsList.map((event, index) => (
                  <tr
                    key={event.event_id}
                    style={{
                      backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                      borderBottom: '1px solid #e0e0e0',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td style={{ padding: '16px', fontSize: '14px' }}>
                      <span style={{
                        backgroundColor: '#667eea20',
                        color: '#667eea',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '500'
                      }}>
                        {event.event_year}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                      {new Date(event.event_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                      {event.theme || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                      {event.target_audience || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                      {event.departments_participated || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#22c55e' }}>
                      {formatNumber(event.total_visitors)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#333', maxWidth: '200px' }}>
                      {event.key_highlights || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {event.photos_url ? (
                        <a
                          href={event.photos_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#667eea',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '13px'
                          }}
                        >
                          <span>📸</span> View Images
                        </a>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
)}</>
        </div>

        {/* Pagination */}
        {
          pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '2rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                style={{
                  padding: '8px 16px',
                  backgroundColor: pagination.page === 1 ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.3s ease'
                }}
              >
                ← Previous
              </button>
              <span style={{ color: '#666', fontSize: '14px' }}>
                Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong>
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: pagination.page === pagination.pages ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.3s ease'
                }}
              >
                Next →
              </button>
            </div>
          )
        }
      </div >

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="open_house"
        token={token}
      />
    </>
  );

  // If public view, return content without wrappers
  if (isPublicView) {
    return content;
  }

  // If not public view, wrap in page-container and page-content
  return (
    <div className="page-container">
      <div className="page-content">
        {content}
      </div>
    </div>
  );
}

export default OpenHouseSection;