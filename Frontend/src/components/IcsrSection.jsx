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
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

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
          ← Back to Industry Connect
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ margin: 0 }}>ICSR Statistics</h1>
        {error && (
          <div className="error-message" style={{
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            marginBottom: '20px',
            width: '100%'
          }}>{error}</div>
        )}
        {!isReadOnlyView && isAdmin && (
          <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
            <span>📤</span> Upload Events
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

      <div className="grid-2" style={{ gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', borderRadius: '20px', padding: '28px', color: 'white' }}>
          <h3 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Total Events</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatNumber(summary.total_events)}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #22c55e 0%, #166534 100%)', borderRadius: '20px', padding: '28px', color: 'white' }}>
          <h3 style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Total Funding</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{formatCompactCurrency(summary.total_funding)}</div>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', padding: '24px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {['yearly', 'eventTypes', 'eventsDirectory'].map(v => (
              <button
                key={v}
                onClick={() => setViewType(v)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: viewType === v ? '#4f46e5' : '#f1f5f9',
                  color: viewType === v ? '#fff' : '#475569',
                  fontWeight: 600, cursor: 'pointer'
                }}
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
            <ResponsiveContainer width="100%" height={350}>
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
                      {eventTypesPieData.map((row, i) => <Cell key={i} fill={EVENT_TYPE_COLORS[i % EVENT_TYPE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )
            })}
          >
            <ResponsiveContainer width="100%" height={350}>
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
            <div id="icsr-directory-table" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {eventsList.map((event, i) => (
                <div key={i} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#4f46e5', fontSize: '14px' }}>{event.event_year}</span>
                    <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{event.event_type}</span>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#111', lineHeight: '1.4' }}>{event.event_name}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#666' }}>
                    <div><strong>Budget:</strong> ₹{formatNumber(event.budget)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Year</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Event Name</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Organization</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '16px', textAlign: 'left' }}>Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsList.map((event, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '16px' }}>{event.event_year}</td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{event.event_name}</td>
                      <td style={{ padding: '16px' }}>{event.organization_name}</td>
                      <td style={{ padding: '16px' }}><span style={{ color: '#4f46e5', fontWeight: 600 }}>{event.event_type}</span></td>
                      <td style={{ padding: '16px' }}>₹{formatNumber(event.budget)}</td>
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