import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, LabelList
} from 'recharts';
import {
  fetchResearchFilterOptions,
  fetchPatentStats,
  fetchPatentList,
} from '../services/researchStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import './Page.css';
import './AcademicSection.css';
import './ResearchSection.css';
import './Patents.css';

const PATENT_STATUS_ORDER = ['Filed', 'Granted'];
const PATENT_COLORS = { Filed: '#6366f1', Granted: '#22c55e' };

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

function Patents({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const token = localStorage.getItem('authToken');

  const isAdmin = user?.role_id === 3 || user?.role_id === 4;
  const isReadOnlyView = isPublicView || !user;
  const isRestrictedUser = typeof user === 'undefined' || user?.role_id === 0;

  const [filterOptions, setFilterOptions] = useState({ patent_years: [], patent_statuses: [] });
  const [filters, setFilters] = useState({ patent_year: 'All', patent_status: 'All' });
  const [patentStats, setPatentStats] = useState({ overall: { Filed: 0, Granted: 0 }, yearly: [] });
  const [patentList, setPatentList] = useState([]);
  const [viewType, setViewType] = useState('trend');
  const [chartMode, setChartMode] = useState('bar');

  const safeSetViewType = (type) => {
    if (isRestrictedUser && type === 'directory') return;
    setViewType(type);
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const opts = await fetchResearchFilterOptions({ patent_year: filters.patent_year, patent_status: filters.patent_status }, token);
        if (!isMounted) return;
        const patent_years = opts?.patent_years ? [...opts.patent_years].sort((a, b) => b - a) : [];
        const patent_statuses = opts?.patent_statuses || [];
        setFilterOptions({ patent_years, patent_statuses });

        const corrections = {};
        if (filters.patent_year !== 'All' && filters.patent_year && !patent_years.map(String).includes(String(filters.patent_year))) corrections.patent_year = 'All';
        if (filters.patent_status !== 'All' && filters.patent_status && !patent_statuses.includes(filters.patent_status)) corrections.patent_status = 'All';
        if (Object.keys(corrections).length > 0) setFilters(prev => ({ ...prev, ...corrections }));
      } catch (e) {
        if (isMounted) console.error('Failed to load patent filter options:', e);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [filters.patent_status, filters.patent_year, token, uploadVersion]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsResp, listResp] = await Promise.all([
          fetchPatentStats({ patent_year: filters.patent_year, patent_status: filters.patent_status }, token),
          fetchPatentList({ patent_year: filters.patent_year, patent_status: filters.patent_status }, token),
        ]);
        setPatentStats({
          overall: {
            Filed: Number(statsResp?.overall?.Filed) || 0,
            Granted: Number(statsResp?.overall?.Granted) || 0,
          },
          yearly: Array.isArray(statsResp?.yearly) ? statsResp.yearly : [],
        });
        setPatentList(listResp?.data || []);
      } catch (e) {
        console.error('Failed to load patent data:', e);
      }
    };
    load();
  }, [filters, token, uploadVersion]);

  const chartData = useMemo(() =>
    patentStats.yearly.map((row) => {
      const entry = { year: row.year };
      PATENT_STATUS_ORDER.forEach((s) => { entry[s] = Number(row[s]) || 0; });
      entry.total = PATENT_STATUS_ORDER.reduce((acc, s) => acc + entry[s], 0);
      return entry;
    }),
    [patentStats.yearly]
  );

  const statusClass = (status) =>
    status === 'Granted' ? 'pat-status--granted' : 'pat-status--filed';

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/')}>
            &#8592; Back to Home
          </button>
        )}

        <div className="pat-upload-row">
          {!isReadOnlyView && isAdmin && (
            <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
              <span>&#128228;</span> Upload Patent Data
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

        {/* Summary Cards */}
        <div className="pat-cards-row">
          <div className="pat-summary-card pat-summary-card--indigo">
            <div className="pat-card-inner">
              <div className="pat-card-header">
                <span className="pat-card-icon">&#128221;</span>
                <h3 className="pat-card-h3">Patents Filed</h3>
              </div>
              <div className="pat-card-value">{patentStats.overall.Filed}</div>
            </div>
          </div>

          <div className="pat-summary-card pat-summary-card--green">
            <div className="pat-card-inner">
              <div className="pat-card-header">
                <span className="pat-card-icon">&#9989;</span>
                <h3 className="pat-card-h3">Patents Granted</h3>
              </div>
              <div className="pat-card-value">{patentStats.overall.Granted}</div>
            </div>
          </div>
        </div>

        <section className="pat-panel">
          <div className="pat-panel-header">
            <div className="pat-panel-toolbar">
              <div className="pat-view-tabs">
                <button
                  onClick={() => safeSetViewType('trend')}
                  className={`pat-view-btn${viewType === 'trend' ? ' pat-view-btn--trend-active' : ''}`}
                >
                  &#128200; Trend Analysis
                </button>
                {!isRestrictedUser && (
                  <button
                    onClick={() => safeSetViewType('directory')}
                    className={`pat-view-btn${viewType === 'directory' ? ' pat-view-btn--dir-active' : ''}`}
                  >
                    &#128203; Patent Directory
                  </button>
                )}
              </div>
              <button
                onClick={() => setFilters({ patent_year: 'All', patent_status: 'All' })}
                className="pat-reset-btn"
              >
                Reset Filters
              </button>
            </div>

            <div className="pat-filter-grid">
              <div className="pat-filter-item">
                <label className="pat-filter-label">Filing Year</label>
                <select
                  value={filters.patent_year}
                  onChange={(e) => setFilters((p) => ({ ...p, patent_year: e.target.value }))}
                  className="pat-filter-select"
                >
                  <option value="All">All Years</option>
                  {filterOptions.patent_years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="pat-filter-item">
                <label className="pat-filter-label">Patent Status</label>
                <select
                  value={filters.patent_status}
                  onChange={(e) => setFilters((p) => ({ ...p, patent_status: e.target.value }))}
                  className="pat-filter-select"
                >
                  <option value="All">All Statuses</option>
                  {filterOptions.patent_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pat-panel-body">
            {viewType === 'trend' && (
              <>
                <div className="pat-section-header">
                  <h3 className="pat-section-h3">Yearly Statistics</h3>
                  <ExportMenu elementId="patents-trend-chart" data={chartData} headers={['Year', 'Filed', 'Granted', 'Total']} keys={['year', 'Filed', 'Granted', 'total']} filename="patents_trend" title="Patents Trend" />
                </div>
                <div className="pat-chart-mode-row">
                  {['bar', 'trend'].map((mode) => (
                    <button key={mode} onClick={() => setChartMode(mode)}
                      className={`pat-mode-btn${chartMode === mode ? ' pat-mode-btn--active' : ''}`}>
                      {mode === 'bar' ? '&#128202; Bar' : '&#128200; Trend'}
                    </button>
                  ))}
                </div>
                <div
                  id="patents-trend-chart"
                  className="chart-container clickable-chart pat-chart-container"
                  onClick={() => setExpandedChart({
                    title: "Patent Trends",
                    content: (
                      <ResponsiveContainer width="100%" height={450}>
                        <BarChart data={chartIsMobile ? chartData.slice(-3) : chartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                          {PATENT_STATUS_ORDER.map((s) => (
                            <Bar key={s} dataKey={s} name={s} fill={PATENT_COLORS[s]} radius={[6, 6, 0, 0]}>
                              <LabelList dataKey={s} position="top" style={{ fontSize: '11px', fontWeight: 700, fill: PATENT_COLORS[s] }} />
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })}
                >
                  <ResponsiveContainer width="100%" height={350}>
                    {chartMode === 'bar' ? (
                      <BarChart data={chartIsMobile ? chartData.slice(-3) : chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        {PATENT_STATUS_ORDER.map((s) => (
                          <Bar key={s} dataKey={s} name={s} fill={PATENT_COLORS[s]} radius={[4, 4, 0, 0]} barSize={20}>
                            <LabelList dataKey={s} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[s] }} />
                          </Bar>
                        ))}
                      </BarChart>
                    ) : (
                      <LineChart data={chartIsMobile ? chartData.slice(-3) : chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        {PATENT_STATUS_ORDER.map((s) => (
                          <Line key={s} type="linear" dataKey={s} name={s} stroke={PATENT_COLORS[s]} strokeWidth={2.5} dot={{ r: 5, fill: PATENT_COLORS[s], strokeWidth: 0 }} activeDot={{ r: 7 }} />
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {viewType === 'directory' && !isRestrictedUser && (
              chartIsMobile ? (
                <div className="pat-mobile-list">
                  {patentList.length === 0 ? (
                    <div className="pat-mobile-empty">No patents found</div>
                  ) : (
                    patentList.map((patent) => (
                      <div key={patent.patent_id} className="pat-mobile-card">
                        <div className="pat-mobile-card-top">
                          <span className={`pat-status-badge ${statusClass(patent.patent_status)}`}>{patent.patent_status}</span>
                        </div>
                        <h4 className="pat-mobile-card-h4">{patent.patent_title}</h4>
                        <div className="pat-mobile-card-fields">
                          <div><strong>Inventors:</strong> {patent.inventors || '—'}</div>
                          <div className="pat-mobile-dates">
                            <div><strong>Filed:</strong> {formatDate(patent.filing_date)}</div>
                            {patent.patent_status === 'Granted' && <div><strong>Granted:</strong> {formatDate(patent.grant_date)}</div>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div id="patents-directory-table" className="pat-table-wrap">
                  <table className="pat-table">
                    <thead>
                      <tr>
                        <th>Patent Title</th>
                        <th>Inventors</th>
                        <th>Status</th>
                        <th>Filed</th>
                        <th>Granted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patentList.length === 0 ? (
                        <tr><td colSpan="5" className="pat-td-empty">No records found</td></tr>
                      ) : (
                        patentList.map((p, i) => (
                          <tr key={p.patent_id ?? i} className="pat-tr" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                            <td className="pat-td-title">{p.patent_title}</td>
                            <td className="pat-td-text">{p.inventors}</td>
                            <td><span className={`pat-status-pill ${statusClass(p.patent_status)}`}>{p.patent_status}</span></td>
                            <td className="pat-td-text">{formatDate(p.filing_date)}</td>
                            <td className="pat-td-text">{formatDate(p.grant_date)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </section>

        <DataUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          tableName="research_patents"
          token={token}
        />
      </div>
    </div>
  );
}

export default Patents;
