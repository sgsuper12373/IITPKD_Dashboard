import { useEffect, useState, useMemo } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';

import { fetchIccSummary, fetchIccYearly } from '../services/grievanceStats';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './IccSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import SectionSkeleton from './SectionSkeleton';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

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
  const [selectedYear, setSelectedYear] = useState('All');
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

  // Summary card values reflect the selected year ('All' shows cumulative totals)
  const displaySummary = useMemo(() => {
    if (selectedYear === 'All') {
      return { total: summary.total, resolved: summary.resolved, pending: summary.pending };
    }
    const row = yearlyData.find((r) => String(r.year) === String(selectedYear));
    return {
      total: row?.total || 0,
      resolved: row?.resolved || 0,
      pending: row?.pending || 0
    };
  }, [selectedYear, summary, yearlyData]);

  // Yearly chart data filtered by the selected year
  const filteredYearlyData = useMemo(() => {
    return selectedYear === 'All'
      ? yearlyData
      : yearlyData.filter((r) => String(r.year) === String(selectedYear));
  }, [yearlyData, selectedYear]);

  const displayYearlyData = useMemo(() => {
    if (selectedYear !== 'All') return filteredYearlyData;
    return chartIsMobile && yearlyData.length > 3 ? yearlyData.slice(-3) : yearlyData;
  }, [filteredYearlyData, yearlyData, chartIsMobile, selectedYear]);

  const displayStats = useMemo(() => {
    if (selectedYear !== 'All') {
      return summary.yearly_stats.filter((s) => String(s.stat_year) === String(selectedYear));
    }
    return chartIsMobile && summary.yearly_stats.length > 3 ? summary.yearly_stats.slice(-3) : summary.yearly_stats;
  }, [summary.yearly_stats, chartIsMobile, selectedYear]);

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
                &#8592; Back to People &amp; Campus
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
                      <span>&#128228;</span> Upload Data
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LastUpdated tables={['icc_yearwise']} />
              <ShareButton />
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
              <SectionSkeleton cards={3} charts={1} />
            ) : (
              <>
                <div className="icc-export-row">
                  <ExportMenu
                    elementId="icc-summary-cards-container"
                    data={[displaySummary]}
                    headers={['Total Complaints', 'Resolved', 'Pending']}
                    keys={['total', 'resolved', 'pending']}
                    filename="icc_summary"
                    title="ICC Summary"
                  />
                </div>

                <div id="icc-summary-cards-container" className="summary-cards-grid-4">
                  {/* Total Complaints — purple */}
                  <div className="metric-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)' }}>
                    <div className="metric-card-glow" />
                    <div className="metric-card-inner">
                      <div className="metric-card-icon-row">
                        <span className="metric-card-icon">&#128203;</span>
                        <span className="metric-card-label">Total Complaints</span>
                      </div>
                      <div className="metric-card-value">{displaySummary.total}</div>
                      <div className="metric-card-footer">
                        <span className="metric-card-dot" />
                        <span className="metric-card-subtitle">
                          {selectedYear === 'All' ? 'All complaints filed' : `Filed in ${selectedYear}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resolved — green */}
                  <div className="metric-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', boxShadow: '0 10px 20px rgba(67, 233, 123, 0.2)' }}>
                    <div className="metric-card-glow" />
                    <div className="metric-card-inner">
                      <div className="metric-card-icon-row">
                        <span className="metric-card-icon">&#9989;</span>
                        <span className="metric-card-label">Resolved</span>
                      </div>
                      <div className="metric-card-value">{displaySummary.resolved}</div>
                      <div className="metric-card-footer">
                        <span className="metric-card-dot" />
                        <span className="metric-card-subtitle">Successfully closed</span>
                      </div>
                    </div>
                  </div>

                  {/* Pending — pink */}
                  <div className="metric-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #feca57 100%)', boxShadow: '0 10px 20px rgba(250, 112, 154, 0.2)' }}>
                    <div className="metric-card-glow" />
                    <div className="metric-card-inner">
                      <div className="metric-card-icon-row">
                        <span className="metric-card-icon">&#9203;</span>
                        <span className="metric-card-label">Pending</span>
                      </div>
                      <div className="metric-card-value">{displaySummary.pending}</div>
                      <div className="metric-card-footer">
                        <span className="metric-card-dot" />
                        <span className="metric-card-subtitle">Currently in process</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter by Year — violet */}
                  <div className="metric-card" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)', boxShadow: '0 10px 20px rgba(168, 85, 247, 0.2)' }}>
                    <div className="metric-card-glow" />
                    <div className="metric-card-inner">
                      <div className="metric-card-icon-row">
                        <span className="metric-card-icon">&#128197;</span>
                        <span className="metric-card-label">Filter by Year</span>
                      </div>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="metric-card-filter-select"
                      >
                        <option value="All" style={{ color: '#333', background: '#fff' }}>All Years</option>
                        {yearlyData.map((row) => (
                          <option key={row.year} value={row.year} style={{ color: '#333', background: '#fff' }}>
                            {row.year}
                          </option>
                        ))}
                      </select>
                      <div className="metric-card-footer" style={{ marginTop: '12px' }}>
                        <span className="metric-card-dot" />
                        <span className="metric-card-subtitle">Focus on a specific year</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="icc-view-tabs">
                  <button
                    type="button"
                    onClick={() => setActiveView('chart')}
                    className={`icc-view-btn${activeView === 'chart' ? ' icc-view-btn--active' : ''}`}
                  >
                    <span>&#128200;</span> Trend View
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('table')}
                    className={`icc-view-btn${activeView === 'table' ? ' icc-view-btn--active' : ''}`}
                  >
                    <span>&#128202;</span> Yearly Statistics
                  </button>
                </div>

                {activeView === 'chart' && (
                  <div className="icc-panel">
                    <div className="icc-chart-container">
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
                              <BarChart data={filteredYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }} barCategoryGap="20%">
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
                  <div className="icc-panel">
                    <div className="icc-table-h2-wrap">
                      <h2 className="icc-table-h2">Yearly Statistics</h2>
                    </div>

                    {chartIsMobile ? (
                      <div className="icc-mobile-list">
                        {displayStats.length === 0 ? (
                          <div className="icc-mobile-empty">No records found</div>
                        ) : (
                          displayStats.map((stat) => (
                            <div key={stat.stat_year} className="icc-mobile-card">
                              <div className="icc-mobile-card-header">
                                <span className="icc-mobile-card-year">FY {stat.stat_year}</span>
                              </div>
                              <div className="icc-mobile-card-fields">
                                <div>
                                  <div className="icc-field-label">Complaints</div>
                                  <div className="icc-field-value">{stat.complaints_received}</div>
                                </div>
                                <div>
                                  <div className="icc-field-label">Disposed</div>
                                  <div className="icc-field-value icc-field-value--green">{stat.complaints_disposed}</div>
                                </div>
                                <div>
                                  <div className="icc-field-label">Pending</div>
                                  <div className="icc-field-value icc-field-value--red">{stat.complaints_pending}</div>
                                </div>
                                <div>
                                  <div className="icc-field-label">Training/Workshops</div>
                                  <div className="icc-field-value">{stat.training_workshops}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div id="icc-yearly-stats-table-container" className="icc-table-wrapper">
                        <table className="icc-table">
                          <thead>
                            <tr>
                              <th className="icc-table-th">Year</th>
                              <th className="icc-table-th">Complaints Received</th>
                              <th className="icc-table-th">Complaints Disposed</th>
                              <th className="icc-table-th">Complaints Pending</th>
                              <th className="icc-table-th">Training/Workshops</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayStats.length === 0 ? (
                              <tr>
                                <td colSpan="5" className="icc-td-empty">
                                  <span className="icc-empty-icon">&#128203;</span>
                                  No statistics found
                                </td>
                              </tr>
                            ) : displayStats.map((row, index) => (
                              <tr key={row.stat_year || index} className="icc-tr" style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                <td className="icc-td-strong">{row.stat_year}</td>
                                <td>{row.complaints_received}</td>
                                <td>{row.complaints_disposed}</td>
                                <td className="icc-td-pending">{row.complaints_pending}</td>
                                <td>{row.training_workshops}</td>
                              </tr>
                            ))}
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
