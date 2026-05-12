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

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '15px' }}>
          <h1 style={{ margin: 0 }}>Patents and Intellectual Property</h1>
          {!isReadOnlyView && isAdmin && (
            <button
              className="page-upload-btn"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <span>📤</span> Upload Patent Data
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(99,102,241,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📝</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Patents Filed</h3>
              </div>
              <div className="metric-value" style={{ color: 'white', fontSize: '36px' }}>{patentStats.overall.Filed}</div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(34,197,94,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>✅</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Patents Granted</h3>
              </div>
              <div className="metric-value" style={{ color: 'white', fontSize: '36px' }}>{patentStats.overall.Granted}</div>
            </div>
          </div>
        </div>

        <section style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e0e0e0', overflow: 'hidden', marginBottom: '30px' }}>
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => safeSetViewType('trend')}
                  style={{
                    padding: '8px 16px', fontSize: '13px', borderRadius: '8px',
                    border: 'none',
                    backgroundColor: viewType === 'trend' ? '#6366f1' : '#fff',
                    color: viewType === 'trend' ? '#fff' : '#333',
                    cursor: 'pointer', fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  📈 Trend Analysis
                </button>
                {!isRestrictedUser && (
                  <button
                    onClick={() => safeSetViewType('directory')}
                    style={{
                      padding: '8px 16px', fontSize: '13px', borderRadius: '8px',
                      border: 'none',
                      backgroundColor: viewType === 'directory' ? '#ec4899' : '#fff',
                      color: viewType === 'directory' ? '#fff' : '#333',
                      cursor: 'pointer', fontWeight: 600,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    📋 Patent Directory
                  </button>
                )}
              </div>
              <button
                onClick={() => setFilters({ patent_year: 'All', patent_status: 'All' })}
                style={{
                  padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#64748b',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
                }}
              >
                Reset Filters
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Filing Year</label>
                <select
                  value={filters.patent_year}
                  onChange={(e) => setFilters((p) => ({ ...p, patent_year: e.target.value }))}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                >
                  <option value="All">All Years</option>
                  {filterOptions.patent_years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Patent Status</label>
                <select
                  value={filters.patent_status}
                  onChange={(e) => setFilters((p) => ({ ...p, patent_status: e.target.value }))}
                  style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                >
                  <option value="All">All Statuses</option>
                  {filterOptions.patent_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {viewType === 'trend' && (
              <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ margin: 0 }}>Yearly Statistics</h3>
                    <ExportMenu elementId="patents-trend-chart" data={chartData} headers={['Year', 'Filed', 'Granted', 'Total']} keys={['year', 'Filed', 'Granted', 'total']} filename="patents_trend" title="Patents Trend" />
                  </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {['bar', 'trend'].map((mode) => (
                    <button key={mode} onClick={() => setChartMode(mode)} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: chartMode === mode ? '#6366f1' : '#f1f5f9', color: chartMode === mode ? '#fff' : '#555' }}>
                      {mode === 'bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>
                <div 
                  id="patents-trend-chart" 
                  className="chart-container clickable-chart" 
                  style={{ padding: '10px' }}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {patentList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No patents found</div>
                  ) : (
                    patentList.map((patent) => (
                      <div key={patent.patent_id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ backgroundColor: patent.patent_status === 'Granted' ? '#dcfce7' : '#ede9fe', color: patent.patent_status === 'Granted' ? '#15803d' : '#6d28d9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{patent.patent_status}</span>
                        </div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#111', lineHeight: '1.4' }}>{patent.patent_title}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#666' }}>
                          <div><strong>Inventors:</strong> {patent.inventors || '—'}</div>
                          <div style={{ display: 'flex', gap: '15px' }}>
                            <div><strong>Filed:</strong> {formatDate(patent.filing_date)}</div>
                            {patent.patent_status === 'Granted' && <div><strong>Granted:</strong> {formatDate(patent.grant_date)}</div>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div id="patents-directory-table" className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                        <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Patent Title</th>
                        <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Inventors</th>
                        <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Status</th>
                        <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Filed</th>
                        <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Granted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patentList.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No records found</td></tr>
                      ) : (
                        patentList.map((p, i) => (
                          <tr key={p.patent_id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#333', fontWeight: '500' }}>{p.patent_title}</td>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#555' }}>{p.inventors}</td>
                            <td style={{ padding: '16px' }}><span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: p.patent_status === 'Granted' ? '#dcfce7' : '#ede9fe', color: p.patent_status === 'Granted' ? '#15803d' : '#6d28d9' }}>{p.patent_status}</span></td>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#555' }}>{formatDate(p.filing_date)}</td>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#555' }}>{formatDate(p.grant_date)}</td>
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