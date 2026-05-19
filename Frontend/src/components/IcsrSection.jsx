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
  Cell,
  LabelList
} from 'recharts';
import {
  fetchIcsrSummary,
  fetchIcsrYearlyDistribution,
  fetchIcsrEventTypes,
  fetchIcsrEvents
} from '../services/industryConnectStats';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';
import CustomTooltip from './CustomTooltip';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import '../DesignSystem.css';
import './IcsrSection.css';

const EVENT_TYPE_COLORS = [
  '#4f46e5', '#22c55e', '#0ea5e9', '#f97316',
  '#a855f7', '#facc15', '#fb7185', '#14b8a6', '#ec4899', '#8b5cf6'
];

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

const formatCompactCurrency = (value) => {
  if (value === undefined || value === null) return '₹0';
  if (value >= 10000000)
    return '₹' + (value / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  if (value >= 100000)
    return '₹' + (value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' L';
  return '₹' + formatNumber(value);
};

function IcsrSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 9;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [summary, setSummary] = useState({ total_events: 0, total_funding: 0 });
  const [yearlyDistribution, setYearlyDistribution] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [viewType, setViewType] = useState('yearly');
  const [filters] = useState({ event_type: 'All', department: 'All', year: 'All', search: '' });
  const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, total_pages: 0 });
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setSummary(await fetchIcsrSummary(filters, token));
    } catch (err) {
      setError(err.message || 'Failed to load summary data');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  const loadYearlyDistribution = useCallback(async () => {
    try {
      const r = await fetchIcsrYearlyDistribution(filters, token);
      setYearlyDistribution(r.data || []);
    } catch (err) { console.error(err); }
  }, [token, filters]);

  const loadEventTypes = useCallback(async () => {
    try {
      const r = await fetchIcsrEventTypes(filters, token);
      setEventTypes(r.data || []);
    } catch (err) { console.error(err); }
  }, [token, filters]);

  const loadEvents = useCallback(async () => {
    try {
      const r = await fetchIcsrEvents(filters, pagination.page, pagination.per_page, token);
      setEventsList(r.data || []);
      setPagination(prev => r.pagination || prev);
    } catch (err) { console.error(err); }
  }, [token, filters, pagination.page, pagination.per_page]);

  const refreshData = () => {
    loadSummary(); loadYearlyDistribution();
    loadEventTypes(); loadEvents();
  };

  useEffect(() => { loadSummary(); loadYearlyDistribution(); loadEventTypes(); },
    [loadSummary, loadYearlyDistribution, loadEventTypes, uploadVersion]);
  useEffect(() => { loadEvents(); }, [loadEvents, uploadVersion]);


  const yearlyChartData = useMemo(() => {
    const data = yearlyDistribution.map(row => ({ year: row.year, events: row.event_count || 0 }));
    return chartIsMobile && data.length > 3 ? data.slice(-3) : data;
  }, [yearlyDistribution, chartIsMobile]);

  const eventTypesPieData = useMemo(() => {
    const sorted = [...eventTypes].sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const othersCount = sorted.slice(5).reduce((s, i) => s + (i.count || 0), 0);
    const pie = top5.map(r => ({ name: r.event_type, value: r.count || 0 }));
    if (othersCount > 0) pie.push({ name: 'Others', value: othersCount });
    return pie;
  }, [eventTypes]);

  const content = (
    <>
      {!isReadOnlyView && (
        <button className="page-back-btn" onClick={() => navigate('/industry-connect')}>
          &#8592; Back to Industry Connect
        </button>
      )}

      <div className="icsr-action-row">
        {error && <div className="icsr-error">{error}</div>}
        {!isReadOnlyView && isAdmin && (
          <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
            <span>&#128228;</span> Upload Events
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

      <div className="icsr-cards">
        <div className="icsr-card icsr-card--indigo">
          <h3 className="icsr-card-h3">Total Events</h3>
          <div className="icsr-card-value">{formatNumber(summary.total_events)}</div>
        </div>
        <div className="icsr-card icsr-card--green">
          <h3 className="icsr-card-h3">Total Funding</h3>
          <div className="icsr-card-value">{formatCompactCurrency(summary.total_funding)}</div>
        </div>
      </div>

      <div className="icsr-panel">
        <div className="icsr-panel-header">
          <div className="icsr-tab-row">
            {['yearly', 'eventTypes', 'eventsDirectory'].map(v => (
              <button
                key={v}
                onClick={() => setViewType(v)}
                className={`icsr-tab-btn${viewType === v ? ' icsr-tab-btn--active' : ' icsr-tab-btn--inactive'}`}
              >
                {v === 'yearly' ? 'Trend' : v === 'eventTypes' ? 'Types' : 'Directory'}
              </button>
            ))}
          </div>
          <ExportMenu
            elementId={viewType === 'yearly' ? 'icsr-yearly-chart' : viewType === 'eventTypes' ? 'icsr-types-chart' : 'icsr-directory-table'}
            data={viewType === 'yearly' ? yearlyChartData : viewType === 'eventTypes' ? eventTypesPieData : eventsList}
            headers={viewType === 'yearly' ? ['Year', 'Events'] : viewType === 'eventTypes' ? ['Type', 'Count'] : ['Year', 'Event Name', 'Organization', 'Type', 'Budget']}
            keys={viewType === 'yearly' ? ['year', 'events'] : viewType === 'eventTypes' ? ['name', 'value'] : ['event_year', 'event_name', 'organization_name', 'event_type', 'budget']}
            filename={`icsr_${viewType}`}
            title={`ICSR ${viewType === 'yearly' ? 'Trend' : viewType === 'eventTypes' ? 'Types' : 'Directory'}`}
          />
        </div>

        {viewType === 'yearly' && (
          <div
            id="icsr-yearly-chart"
            className="clickable-chart"
            onClick={() => setExpandedChart({
              title: "Yearly Event Distribution",
              content: (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartIsMobile ? yearlyChartData.slice(-3) : yearlyChartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                    <Bar dataKey="events" name="Events" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            })}
          >
            <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
              <BarChart data={chartIsMobile ? yearlyChartData.slice(-3) : yearlyChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} />
                <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="events" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewType === 'eventTypes' && (
          <div
            id="icsr-types-chart"
            className="clickable-chart"
            onClick={() => setExpandedChart({
              title: "Event Type Distribution",
              content: (
                <ResponsiveContainer width="100%" height={450}>
                  <PieChart>
                    <Pie data={eventTypesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} label>
                      {eventTypesPieData.map((_, i) => <Cell key={i} fill={EVENT_TYPE_COLORS[i % EVENT_TYPE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )
            })}
          >
            <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350}>
              <PieChart>
                <Pie data={eventTypesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}>
                  {eventTypesPieData.map((_, i) => <Cell key={i} fill={EVENT_TYPE_COLORS[i % EVENT_TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewType === 'eventsDirectory' && (
          chartIsMobile ? (
            <div id="icsr-directory-table" className="icsr-mobile-list">
              {eventsList.map((event, i) => (
                <div key={i} className="icsr-mobile-card">
                  <div className="icsr-mobile-top">
                    <span className="icsr-mobile-year">{event.event_year}</span>
                    <span className="icsr-mobile-badge">{event.event_type}</span>
                  </div>
                  <h4 className="icsr-mobile-h4">{event.event_name}</h4>
                  <div className="icsr-mobile-details">
                    <div><strong>Budget:</strong> &#8377;{formatNumber(event.budget)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-responsive">
              <table id="icsr-directory-table" className="icsr-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Event Name</th>
                    <th>Organization</th>
                    <th>Type</th>
                    <th>Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsList.map((event, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                      <td>{event.event_year}</td>
                      <td className="icsr-td-name">{event.event_name}</td>
                      <td>{event.organization_name}</td>
                      <td><span className="icsr-td-type">{event.event_type}</span></td>
                      <td>&#8377;{formatNumber(event.budget)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="industry_events"
        token={token}
        onUploadSuccess={refreshData}
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

export default IcsrSection;
