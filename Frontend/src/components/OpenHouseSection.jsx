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
import './OpenHouseSection.css';
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
          <h1>Open House &amp; Campus Events</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!isPublicView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          &#8592; Back to Outreach Extension
        </button>
      )}

      <div className="oh-header">
        <h1 className="oh-header-h1">Open House &amp; Campus Events</h1>
        {!isReadOnlyView && isAdmin && (
          <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
            <span>&#128228;</span> Upload Event Data
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

      <div id="openhouse-summary-cards-container" className="oh-cards">
        <div className="oh-card oh-card--purple">
          <h3 className="oh-card-h3">Total Events</h3>
          <div className="oh-card-value">{formatNumber(summary.total_events)}</div>
        </div>
        <div className="oh-card oh-card--pink">
          <h3 className="oh-card-h3">Total Visitors</h3>
          <div className="oh-card-value">{formatNumber(summary.total_visitors)}</div>
        </div>
        <div className="oh-card oh-card--green">
          <h3 className="oh-card-h3">Departments</h3>
          <div className="oh-card-value">{formatNumber(summary.departments_participated)}</div>
        </div>
      </div>

      <div className="oh-panel oh-panel--mb">
        <div className="oh-panel-header">
          <h3 className="oh-panel-h3">Participation Trends</h3>
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
            <div className="oh-chart-empty">No data available</div>
          )}
        </div>
      </div>

      <div className="oh-panel oh-panel--mb2">
        <div className="oh-panel-header">
          <h2 className="oh-panel-h2">Event Directory</h2>
          <div className="oh-dir-controls">
            <input
              type="text"
              placeholder="Search theme..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="oh-search-input"
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
          <div className="oh-mobile-list">
            {eventsList.map((event) => (
              <div key={event.event_id} className="oh-mobile-card">
                <div className="oh-mobile-top">
                  <span className="oh-mobile-year">{event.event_year}</span>
                </div>
                <h4 className="oh-mobile-h4">{event.theme || 'Open House'}</h4>
                <div className="oh-mobile-details">
                  <div><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</div>
                  <div><strong>Visitors:</strong> {formatNumber(event.total_visitors)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="oh-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Date</th>
                  <th>Theme</th>
                  <th>Visitors</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map((event, index) => (
                  <tr key={event.event_id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                    <td className="oh-td-year">{event.event_year}</td>
                    <td>{new Date(event.event_date).toLocaleDateString()}</td>
                    <td>{event.theme || '-'}</td>
                    <td className="oh-td-bold">{formatNumber(event.total_visitors)}</td>
                    <td>
                      {event.photos_url && (
                        <a href={event.photos_url} target="_blank" rel="noreferrer" className="oh-td-link">&#128248; View</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="oh-pagination">
            <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="page-pagination-btn">Previous</button>
            <span className="oh-pagination-info">{pagination.page} / {pagination.pages}</span>
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
          <div className="chart-skeleton-wrap">
            <div className="chart-skeleton-heading" />
            <div className="chart-skeleton" aria-label="Loading chart data…">
              {[55,80,65,90,45,70,60,75].map((h,i) => (
                <div key={i} className="chart-skeleton-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="chart-skeleton-labels">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="chart-skeleton-label" />)}
            </div>
          </div>
        ) : content}
      </div>
    </div>
  );
}

export default OpenHouseSection;
