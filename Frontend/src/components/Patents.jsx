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
import { CustomTooltip } from '../utils/chartUtils';
import DataUploadModal from './DataUploadModal';
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
  const token = localStorage.getItem('authToken');

  const isAdmin = user?.role_id === 3 || user?.role_id === 4;
  const isReadOnlyView = isPublicView || !user;

  const [filterOptions, setFilterOptions] = useState({ patent_years: [], patent_statuses: [] });
  const [filters, setFilters] = useState({ patent_year: 'All', patent_status: 'All' });
  const [patentStats, setPatentStats] = useState({ overall: { Filed: 0, Granted: 0 }, yearly: [] });
  const [patentList, setPatentList] = useState([]);
  const [viewType, setViewType] = useState('trend');
  const [chartMode, setChartMode] = useState('bar');

  useEffect(() => {
    const load = async () => {
      try {
        const opts = await fetchResearchFilterOptions(token);
        setFilterOptions({
          patent_years: opts?.patent_years ? [...opts.patent_years].sort((a, b) => b - a) : [],
          patent_statuses: opts?.patent_statuses || [],
        });
      } catch (e) {
        console.error('Failed to load patent filter options:', e);
      }
    };
    load();
  }, [token, uploadVersion]);

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

  const totalPatents = patentStats.overall.Filed + patentStats.overall.Granted;

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>Patents</h1>
            </div>
            {isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <span>📤</span> Patents
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(236,72,153,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📝</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Patents Filed</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{patentStats.overall.Filed}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Applications submitted</span>
              </div>
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
              <div className="metric-value" style={{ color: 'white' }}>{patentStats.overall.Granted}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Approved & protected</span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(99,102,241,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>📊</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Total Patents</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{totalPatents}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Research IP portfolio</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter + Chart/Directory Section */}
        <section style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Filter Bar */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setViewType('trend')}
                    style={{
                      padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                      border: viewType === 'trend' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      backgroundColor: viewType === 'trend' ? '#eef2ff' : '#fff',
                      color: viewType === 'trend' ? '#4338ca' : '#333',
                      cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    📈 Trend
                  </button>
                  <button
                    onClick={() => setViewType('directory')}
                    style={{
                      padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                      border: viewType === 'directory' ? '2px solid #ec4899' : '1px solid #e2e8f0',
                      backgroundColor: viewType === 'directory' ? '#fdf2f8' : '#fff',
                      color: viewType === 'directory' ? '#9d174d' : '#333',
                      cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    📋 Directory
                  </button>
                </div>
              </div>
              <button
                onClick={() => setFilters({ patent_year: 'All', patent_status: 'All' })}
                style={{
                  padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                }}
              >
                Clear Filters
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px', marginTop: '12px'
            }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#555', display: 'block', marginBottom: '4px' }}>
                  Patent Year
                </label>
                <select
                  value={filters.patent_year}
                  onChange={(e) => setFilters((p) => ({ ...p, patent_year: e.target.value }))}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                >
                  <option value="All">All Years</option>
                  {filterOptions.patent_years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#555', display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={filters.patent_status}
                  onChange={(e) => setFilters((p) => ({ ...p, patent_status: e.target.value }))}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                >
                  <option value="All">All Statuses</option>
                  {filterOptions.patent_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div style={{ padding: '20px' }}>

            {/* Trend View */}
            {viewType === 'trend' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                      <span>📝</span> Knowledge Transfer Trend
                    </h2>
                    <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
                      Year-wise patent filings and grants
                    </p>
                  </div>
                  <ExportMenu
                    elementId="patents-trend-chart"
                    data={chartData}
                    headers={['Year', 'Filed', 'Granted', 'Total']}
                    keys={['year', 'Filed', 'Granted', 'total']}
                    filename="patents_trend"
                    title="Patents Trend"
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['bar', 'trend'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setChartMode(mode)}
                      style={{
                        padding: '6px 16px', fontSize: '13px', fontWeight: 600,
                        borderRadius: '6px', cursor: 'pointer', border: 'none',
                        backgroundColor: chartMode === mode ? '#6366f1' : '#f1f5f9',
                        color: chartMode === mode ? '#fff' : '#555'
                      }}
                    >
                      {mode === 'bar' ? 'Bar' : 'Trend'}
                    </button>
                  ))}
                </div>

                <div
                  id="patents-trend-chart"
                  className={`chart-container ${!chartData.length ? 'chart-has-empty' : ''}`}
                  style={{ position: 'relative', padding: '10px' }}
                >
                  <div className={`section-empty-state ${chartData.length ? 'hidden' : ''}`}>
                    <p>No information available for the selected filter</p>
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    {chartMode === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (m) => Math.ceil(m * 1.2)]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                        {PATENT_STATUS_ORDER.map((s) => (
                          <Bar key={s} dataKey={s} name={s} fill={PATENT_COLORS[s]} radius={[4, 4, 0, 0]} barSize={18}>
                            <LabelList dataKey={s} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[s] }} />
                          </Bar>
                        ))}
                      </BarChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (m) => Math.ceil(m * 1.2)]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                        {PATENT_STATUS_ORDER.map((s) => (
                          <Line
                            key={s} type="linear" dataKey={s} name={s}
                            stroke={PATENT_COLORS[s]} strokeWidth={2.5}
                            dot={{ r: 5, fill: PATENT_COLORS[s] }} activeDot={{ r: 7 }}
                          >
                            <LabelList dataKey={s} offset={10} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: PATENT_COLORS[s] }} />
                          </Line>
                        ))}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </>
            )}

            {/* Directory View */}
            {viewType === 'directory' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
                      <span>📋</span> Patents Directory
                    </h2>
                    <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
                      {patentList.length} records found
                    </p>
                  </div>
                  <ExportMenu
                    elementId="patents-directory-table"
                    data={patentList}
                    headers={['Title', 'Inventors', 'Filed Date', 'Grant Date', 'Status']}
                    keys={['patent_title', 'inventors', 'filing_date', 'grant_date', 'status']}
                    filename="patents_directory"
                    title="Patents Directory"
                    exportType="table"
                  />
                </div>

                <div
                  id="patents-directory-table"
                  className="table-responsive"
                  style={{ maxHeight: '450px', overflowY: 'auto' }}
                >
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: PATENT_COLORS.Filed, color: 'white' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Inventors</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Filed</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Granted</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patentList.map((p, i) => (
                        <tr key={p.patent_id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          <td style={{ padding: '8px' }}>{p.patent_title}</td>
                          <td style={{ padding: '8px' }}>{p.inventors}</td>
                          <td style={{ padding: '8px' }}>{formatDate(p.filing_date)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(p.grant_date)}</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '12px',
                              fontSize: '11px', fontWeight: 600,
                              backgroundColor: p.status === 'Granted' ? '#dcfce7' : '#ede9fe',
                              color: p.status === 'Granted' ? '#15803d' : '#6d28d9'
                            }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!patentList.length && (
                        <tr>
                          <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#6c757d', fontWeight: 500 }}>
                            No information available for the selected filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
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
