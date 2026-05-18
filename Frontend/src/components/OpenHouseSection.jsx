import { useState, useEffect } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
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
import ChartExpandModal from './ChartExpandModal';
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
  const isAdmin = user?.role_id === 3 || user?.role_id === 15;

  const [summary, setSummary] = useState({
    total_events: 0,
    total_visitors: 0,
    departments_participated: 0,
    yearly_events: []
  });

  const [timeline, setTimeline] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 10, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ search: '', year: '' });
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sumRes, timelineRes] = await Promise.all([
          fetchOpenHouseSummary(token),
          fetchOpenHouseTimeline(token)
        ]);
        setSummary(sumRes);
        setTimeline(timelineRes.timeline || []);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token, uploadVersion]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const result = await fetchOpenHouseList(token, pagination.page, pagination.per_page, filters.search, filters.year || null);
        setEventsList(result.events || []);
        setPagination(prev => result.pagination || prev);
      } catch (err) {
        console.error('Error loading events:', err);
      }
    };
    loadEvents();
  }, [token, pagination.page, pagination.per_page, filters.search, filters.year, uploadVersion]);

  if (error) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1>Open House & Campus Events</h1>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ margin: 0 }}>Open House & Campus Events</h1>
        {!isReadOnlyView && isAdmin && (
          <button
            className="page-upload-btn"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <span>📤</span> Upload Event Data
          </button>
        )}
      </div>

      <ChartExpandModal
        isOpen={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedChart?.title}
      >
        {expandedChart?.content}
      </ChartExpandModal>

      <div id="openhouse-summary-cards-container" className="grid-3" style={{ gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '20px', padding: '28px', color: 'white', boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)' }}>
          <h3 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Total Events</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatNumber(summary.total_events)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '20px', padding: '28px', color: 'white', boxShadow: '0 10px 20px rgba(240, 147, 251, 0.2)' }}>
          <h3 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Total Visitors</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatNumber(summary.total_visitors)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '20px', padding: '28px', color: 'white', boxShadow: '0 10px 20px rgba(67, 233, 123, 0.2)' }}>
          <h3 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Departments</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatNumber(summary.departments_participated)}</div>
        </div>
      </div>

      <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>Participation Trends</h3>
          <ExportMenu
            elementId="openhouse-chart-container"
            data={timeline}
            headers={['Year', 'Events', 'Visitors']}
            keys={['event_year', 'event_count', 'total_visitors']}
            filename="openhouse_trends"
            title="Open House Participation Trends"
          />
        </div>

        <div id="openhouse-chart-container">
          {timeline.length > 0 ? (
            <div 
              className="clickable-chart"
              onClick={() => setExpandedChart({
                title: "Participation Overview",
                content: (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartIsMobile ? timeline.slice(-3) : timeline} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="event_year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                      <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                      <Bar dataKey="event_count" name="Events" fill="#667eea" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="total_visitors" name="Visitors" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              })}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartIsMobile ? timeline.slice(-3) : timeline} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="event_year" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="event_count" fill="#667eea" name="Events" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_visitors" fill="#22c55e" name="Visitors" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No data available</div>
          )}
        </div>
      </div>

      <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Event Directory</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search theme..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
            />
            <ExportMenu
              elementId="openhouse-events-list-container"
              data={eventsList}
              headers={['Year', 'Date', 'Theme', 'Visitors']}
              keys={['event_year', 'event_date', 'theme', 'total_visitors']}
              filename="openhouse_directory"
              title="Open House Event Directory"
            />
          </div>
        </div>

        {chartIsMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {eventsList.map((event) => (
              <div key={event.event_id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: '#667eea', fontSize: '14px' }}>{event.event_year}</span>
                </div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#111', lineHeight: '1.4' }}>{event.theme || 'Open House'}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#666' }}>
                  <div><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</div>
                  <div><strong>Visitors:</strong> {formatNumber(event.total_visitors)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555' }}>Year</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555' }}>Date</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555' }}>Theme</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555' }}>Visitors</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#555' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map((event, index) => (
                  <tr key={event.event_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#667eea', fontWeight: '600' }}>{event.event_year}</td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>{new Date(event.event_date).toLocaleDateString()}</td>
                    <td style={{ padding: '16px', fontSize: '14px' }}>{event.theme || '-'}</td>
                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{formatNumber(event.total_visitors)}</td>
                    <td style={{ padding: '16px' }}>
                      {event.photos_url && (
                        <a href={event.photos_url} target="_blank" rel="noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontSize: '13px' }}>📸 View</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="page-pagination-btn">Previous</button>
            <span style={{ alignSelf: 'center' }}>{pagination.page} / {pagination.pages}</span>
            <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages} className="page-pagination-btn">Next</button>
          </div>
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="open_house"
        token={token}
      />
    </>
  );

  return (
    <div className={isPublicView ? "" : "page-container performance-render-auto"}>
      <div className={isPublicView ? "" : "page-content"}>
        {loading ? (
          <div className="loading-container"><div className="loading-spinner" /></div>
        ) : content}
      </div>
    </div>
  );
}

export default OpenHouseSection;