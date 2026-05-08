import { useEffect, useState } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';

import { fetchIccSummary, fetchIccYearly } from '../services/grievanceStats';
import DataUploadModal from './LazyDataUploadModal';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

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
  const [visibleMetrics, setVisibleMetrics] = useState({
    total: true,
    resolved: true,
    pending: true
  });
  const [activeView, setActiveView] = useState('chart'); // 'chart' | 'table'
  const [summary, setSummary] = useState({
    total: 0,
    resolved: 0,
    pending: 0
  });
  const [chartType, setChartType] = useState('Bar'); // 'Bar' | 'Trend'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

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
          pending: summaryData.pending || 0
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

  // Calculate resolution rate
  // const resolutionRate = summary.total > 0 
  //   ? Math.round((summary.resolved / summary.total) * 100) 
  //   : 0;

  return (
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
              <h1>Internal Complaints Committee (ICC)</h1>
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
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading ICC data...</p>
          </div>
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
            {/* Modern Summary Cards */}
            <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<div id="icc-summary-cards-container" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* Total Complaints Card */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '34px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📋</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '24px', fontWeight: '500' }}>Total Complaints</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {summary.total}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Received over the years</span>
                  </div>
                </div>
              </div>

              {/* Resolved Complaints Card */}
              <div style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 20px rgba(67, 233, 123, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '34px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>✅</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '24px', fontWeight: '500' }}>Resolved</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {summary.resolved}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Successfully resolved</span>
                  </div>
                </div>
              </div>

              {/* Pending Complaints Card */}
              <div style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #feca57 100%)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 20px rgba(250, 112, 154, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '34px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>⏳</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '24px', fontWeight: '500' }}>Pending</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {summary.pending}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Under review</span>
                  </div>
                </div>
              </div>

            </div>
)}</>



            {/* View selector for chart vs table */}
            <div style={{
              display: 'flex',
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}>
                  <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>
                      Internal Complaints Committee (ICC)
                    </h2>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                      Year-wise Complaint Trend
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setVisibleMetrics(prev => ({ ...prev, total: !prev.total }))}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: visibleMetrics.total ? AREA_COLORS.total : '#f0f0f0',
                          color: visibleMetrics.total ? 'white' : '#666',
                          border: 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Complaints Received
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleMetrics(prev => ({ ...prev, resolved: !prev.resolved }))}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: visibleMetrics.resolved ? AREA_COLORS.resolved : '#f0f0f0',
                          color: visibleMetrics.resolved ? 'white' : '#666',
                          border: 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Resolved
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleMetrics(prev => ({ ...prev, pending: !prev.pending }))}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: visibleMetrics.pending ? AREA_COLORS.pending : '#f0f0f0',
                          color: visibleMetrics.pending ? 'white' : '#666',
                          border: 'none',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        Pending
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bar / Trend toggle */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '12px 0'
                }}>
                  {/* Left → Bar / Trend buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Bar', 'Trend'].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setChartType(mode)}
                        style={{
                          padding: '7px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: chartType === mode ? '#667eea' : '#e9ecef',
                          color: chartType === mode ? '#fff' : '#333',
                          fontWeight: chartType === mode ? '600' : '400',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                      </button>
                    ))}
                  </div>

                  {/* Right → Export Menu */}
                  <div style={{ position: 'relative', zIndex: 9999 }}>
                    <ExportMenu
                      elementId="icc-trend-chart-container"
                      data={yearlyData}
                      headers={['Year', 'Total', 'Resolved', 'Pending']}
                      keys={['year', 'total', 'resolved', 'pending']}
                      filename="icc_trend_data"
                      title="ICC Complaint Trends"
                    />
                  </div>
                </div>

                {yearlyData.length === 0 ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No complaint records available.</p>
                  </div>
                ) : (
                  <div id="icc-trend-chart-container" className="chart-container" style={{ padding: '10px' }}>
                    {/* Bar chart — Complaints, Resolved, Pending */}
                    <div className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                        <BarChart data={yearlyData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          {visibleMetrics.total && <Bar dataKey="total" name="Complaints" fill={AREA_COLORS.total} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                            <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.total }} />
                          </Bar>}
                          {visibleMetrics.pending && <Bar dataKey="pending" name="Pending" fill={AREA_COLORS.pending} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                            <LabelList dataKey="pending" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.pending }} />
                          </Bar>}
                          {visibleMetrics.resolved && <Bar dataKey="resolved" name="Resolved" fill={AREA_COLORS.resolved} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                            <LabelList dataKey="resolved" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.resolved }} />
                          </Bar>}
                        </BarChart>
                      </ResponsiveContainer>
)}</>
                    </div>

                    {/* Trend (Line) chart — complaints only */}
                    <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={350}>
                        <LineChart data={yearlyData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                          <Line type="linear" dataKey="total" name="Complaints" stroke={AREA_COLORS.total} strokeWidth={3} dot={{ r: 5, fill: AREA_COLORS.total, strokeWidth: 0 }} activeDot={{ r: 7 }}>
                            <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: AREA_COLORS.total }} />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
)}</>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'table' && (
              <div className="chart-section" style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 5px 20px rgba(0,0,0,0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>
                      Yearly Complaint Statistics
                    </h2>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
                      Detailed breakdown of total complaints and their resolution status.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <ExportMenu
                      elementId="icc-yearly-table-container"
                      data={yearlyData}
                      headers={['Year', 'Total', 'Pending', 'Resolved']}
                      keys={['year', 'total', 'pending', 'resolved']}
                      filename="icc_yearly_stats"
                      title="Yearly Complaint Statistics"
                      exportType="table"
                    />
                    <span style={{
                      backgroundColor: '#667eea',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {yearlyData.length} Years
                    </span>
                  </div>
                </div>

                {yearlyData.length === 0 ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No records available to display.</p>
                  </div>
                ) : (
                  <div id="icc-yearly-table-container" className="table-responsive" style={{ overflowX: 'auto' }}>
                    <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#555' }}>Year</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#555' }}>Total Complaints</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#555' }}>Pending</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#555' }}>Resolved</th>
                          <th style={{ padding: '12px', textAlign: 'left', color: '#555' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearlyData.map((row, index) => {
                          const statusLabel =
                            row.pending === 0 ? (
                              <span style={{
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>All Pending</span>
                            ) : row.resolved === 0 ? (
                              <span style={{
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>All Resolved</span>
                            ) : (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>Mixed</span>
                            );

                          return (
                            <tr key={row.year} style={{
                              backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                              borderBottom: '1px solid #e0e0e0'
                            }}>
                              <td style={{ padding: '12px', fontWeight: '500' }}>{row.year}</td>
                              <td style={{ padding: '12px' }}>{row.total}</td>
                              <td style={{ padding: '12px', color: '#f97316', fontWeight: '500' }}>{row.pending}</td>
                              <td style={{ padding: '12px', color: '#22c55e', fontWeight: '500' }}>{row.resolved}</td>
                              <td style={{ padding: '12px' }}>{statusLabel}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
)}</>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="icc_yearwise"
        token={token}
      />
    </div >
  );
}

export default IccSection;