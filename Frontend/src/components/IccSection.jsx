import { useEffect, useState, useMemo } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';

import { fetchIccSummary, fetchIccYearly } from '../services/grievanceStats';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import SectionSkeleton from './SectionSkeleton';

const AREA_COLORS = {
  total: '#667eea',
  pending: '#fa709a',
  resolved: '#43e97b'
};

function IccSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [yearlyData, setYearlyData] = useState([]);
  const [visibleMetrics] = useState({
    total: true,
    resolved: true,
    pending: true
  });
  const [activeView, setActiveView] = useState('chart'); // 'chart' | 'table'
  const [summary, setSummary] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    yearly_stats: []
  });
  const [chartType] = useState('Bar'); // 'Bar' | 'Trend'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 8;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [yearlyResponse, summaryResponse] = await Promise.all([
          fetchIccYearly(token),
          fetchIccSummary(token)
        ]);

        const iccRows = yearlyResponse?.data || [];
        const formattedYearly = iccRows.map((row) => ({
          year: row.complaints_year,
          total: row.total_complaints,
          resolved: row.complaints_resolved,
          pending: row.complaints_pending
        }));
        formattedYearly.sort((a, b) => a.year - b.year);
        setYearlyData(formattedYearly);

        const summaryData = summaryResponse?.data || {};
        setSummary({
          total: summaryData.total || 0,
          resolved: summaryData.resolved || 0,
          pending: summaryData.pending || 0,
          yearly_stats: summaryData.yearly_stats || []
        });
      } catch (err) {
        console.error('Failed to load ICC data:', err);
        setError(err.message || 'Failed to load ICC data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, uploadVersion]);

  const displayYearlyData = useMemo(() => {
    return chartIsMobile && yearlyData.length > 3 ? yearlyData.slice(-3) : yearlyData;
  }, [yearlyData, chartIsMobile]);

  const displayStats = useMemo(() => {
    return chartIsMobile && summary.yearly_stats.length > 3 ? summary.yearly_stats.slice(-3) : summary.yearly_stats;
  }, [summary.yearly_stats, chartIsMobile]);

  return (
    <>
      {(typeof user === 'undefined' || user?.role_id !== 0) && (
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
                  <h1>ICC (Internal Complaints Committee)</h1>
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

            {loading ? (
              <SectionSkeleton cards={3} charts={1} />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
                  <ExportMenu
                    elementId="icc-summary-cards-container"
                    data={[summary]}
                    headers={['Total Complaints', 'Resolved', 'Pending']}
                    keys={['total', 'resolved', 'pending']}
                    filename="icc_summary"
                    title="ICC Summary"
                  />
                </div>

                <div id="icc-summary-cards-container" className="grid-3" style={{
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📋</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Complaints</span>
                      </div>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        {summary.total}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 10px 20px rgba(67, 233, 123, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>✅</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Resolved</span>
                      </div>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        {summary.resolved}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #feca57 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 10px 20px rgba(250, 112, 154, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>⏳</span>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Pending</span>
                      </div>
                      <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        {summary.pending}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '20px',
                  borderBottom: '2px solid #e0e0e0',
                  paddingBottom: '10px'
                }}>
                  <button
                    type="button"
                    onClick={() => setActiveView('chart')}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: activeView === 'chart' ? '#667eea' : '#f8f9fa',
                      color: activeView === 'chart' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: activeView === 'chart' ? '600' : '500',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📈</span> Trend View
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('table')}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: activeView === 'table' ? '#667eea' : '#f8f9fa',
                      color: activeView === 'table' ? 'white' : '#333',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: activeView === 'table' ? '600' : '500',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📊</span> Yearly Statistics
                  </button>
                </div>

                {activeView === 'chart' && (
                  <div className="chart-section" style={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 5px 20px rgba(0,0,0,0.05)'
                  }}>
                    <div className="chart-container" style={{ padding: '10px' }}>
                      <div id="icc-grievance-chart-container">
                        {summary.grievance_status && summary.grievance_status.length > 0 && (
                          <div
                            className="clickable-chart"
                            onClick={() => setExpandedChart({
                              title: "Grievance Status Distribution",
                              content: (
                                <ResponsiveContainer width="100%" height={400}>
                                  <BarChart data={summary.grievance_status} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                    <XAxis dataKey="status" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                                    <Bar dataKey="count" name="Count" fill="#667eea" radius={[6, 6, 0, 0]}>
                                      <LabelList dataKey="count" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: '#667eea' }} />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )
                            })}
                          >
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={summary.grievance_status} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="status" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#667eea" name="Count" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: '#667eea' }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                      <div
                        className={`chart-wrapper clickable-chart ${chartType === 'Bar' ? 'active' : 'inactive'}`}
                        onClick={() => setExpandedChart({
                          title: "ICC Complaint Distribution",
                          content: (
                            <ResponsiveContainer width="100%" height={500}>
                              <BarChart data={yearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 12 }} interval={0} angle={-40} textAnchor="end" height={60} />
                                <YAxis stroke="#666" tick={{ fontSize: 12 }} allowDecimals={false} label={{ value: 'Complaints', angle: -90, position: 'insideLeft' }} />
                                <Tooltip content={<CustomTooltip denominatorKey="total" excludePercentageFor={['Complaints']} />} />
                                <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} />
                                <Bar dataKey={visibleMetrics.total ? "total" : "__hidden__"} name="Complaints" fill={AREA_COLORS.total} radius={[6, 6, 0, 0]}>
                                  <LabelList dataKey="total" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: AREA_COLORS.total }} />
                                </Bar>
                                <Bar dataKey={visibleMetrics.pending ? "pending" : "__hidden__"} name="Pending" fill={AREA_COLORS.pending} radius={[6, 6, 0, 0]}>
                                  <LabelList dataKey="pending" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: AREA_COLORS.pending }} />
                                </Bar>
                                <Bar dataKey={visibleMetrics.resolved ? "resolved" : "__hidden__"} name="Resolved" fill={AREA_COLORS.resolved} radius={[6, 6, 0, 0]}>
                                  <LabelList dataKey="resolved" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: AREA_COLORS.resolved }} />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )
                        })}
                      >
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={displayYearlyData} margin={{ top: 26, right: 20, left: 30, bottom: chartIsMobile ? 50 : 30 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -40 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip denominatorKey="total" excludePercentageFor={['Complaints']} />} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Bar dataKey={visibleMetrics.total ? "total" : "__hidden__"} name="Complaints" fill={AREA_COLORS.total} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} legendType={visibleMetrics.total ? "rect" : "none"}>
                              {visibleMetrics.total && <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.total }} />}
                            </Bar>
                            <Bar dataKey={visibleMetrics.pending ? "pending" : "__hidden__"} name="Pending" fill={AREA_COLORS.pending} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} legendType={visibleMetrics.pending ? "rect" : "none"}>
                              {visibleMetrics.pending && <LabelList dataKey="pending" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.pending }} />}
                            </Bar>
                            <Bar dataKey={visibleMetrics.resolved ? "resolved" : "__hidden__"} name="Resolved" fill={AREA_COLORS.resolved} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700} legendType={visibleMetrics.resolved ? "rect" : "none"}>
                              {visibleMetrics.resolved && <LabelList dataKey="resolved" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.resolved }} />}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'table' && (
                  <div className="chart-section" style={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 5px 20px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ marginBottom: '20px' }}>
                      <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>Yearly Statistics</h2>
                    </div>

                    {chartIsMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {displayStats.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No records found</div>
                        ) : (
                          displayStats.map((stat) => (
                            <div key={stat.stat_year} style={{
                              backgroundColor: '#fff',
                              borderRadius: '12px',
                              padding: '16px',
                              border: '1px solid #e0e0e0',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
                                <span style={{ fontWeight: '700', color: '#667eea', fontSize: '16px' }}>FY {stat.stat_year}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', marginBottom: '2px' }}>Complaints</div>
                                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{stat.complaints_received}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', marginBottom: '2px' }}>Disposed</div>
                                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#22c55e' }}>{stat.complaints_disposed}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', marginBottom: '2px' }}>Pending</div>
                                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#ef4444' }}>{stat.complaints_pending}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', marginBottom: '2px' }}>Training/Workshops</div>
                                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{stat.training_workshops}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div id="icc-yearly-stats-table-container" className="table-responsive" style={{ overflowX: 'auto' }}>
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
                              <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Complaints Received</th>
                              <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Complaints Disposed</th>
                              <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Complaints Pending</th>
                              <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontSize: '14px', fontWeight: '600' }}>Training/Workshops</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayStats.length === 0 ? (
                              <tr>
                                <td colSpan="5" style={{
                                  textAlign: 'center',
                                  padding: '40px',
                                  color: '#666',
                                  fontSize: '14px'
                                }}>
                                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📋</span>
                                  No statistics found
                                </td>
                              </tr>
                            ) : displayStats.map((row, index) => {
                                return (
                                  <tr key={row.stat_year || index} style={{
                                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                    borderBottom: '1px solid #e0e0e0'
                                  }}>
                                    <td style={{ padding: '16px', fontWeight: '500' }}>{row.stat_year}</td>
                                    <td style={{ padding: '16px' }}>{row.complaints_received}</td>
                                    <td style={{ padding: '16px' }}>{row.complaints_disposed}</td>
                                    <td style={{ padding: '16px', color: '#ef4444', fontWeight: '500' }}>{row.complaints_pending}</td>
                                    <td style={{ padding: '16px' }}>{row.training_workshops}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="icc_yearwise"
        token={token}
      />

      {/* Fullscreen Chart Modal */}
      <ChartExpandModal
        isOpen={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedChart?.title}
      >
        {expandedChart?.content}
      </ChartExpandModal>
    </>
  );
}

export default IccSection;