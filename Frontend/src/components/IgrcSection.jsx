import { useEffect, useState } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList
} from 'recharts';

import { fetchIgrcSummary, fetchIgrcYearly } from '../services/grievanceStats';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import '../DesignSystem.css';
import './IgrcSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import SectionSkeleton from './SectionSkeleton';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

const BAR_COLORS = {
  filed: '#667eea',
  pending: '#fa709a',
  resolved: '#43e97b'
};

function IgrcSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [yearlyData, setYearlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('All');
  const [visibleMetrics, setVisibleMetrics] = useState({
    filed: true,
    pending: true,
    resolved: true
  });
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    resolved: 0
  });
  const [chartType, setChartType] = useState('Bar'); // 'Bar' | 'Trend'
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
  const isAdmin = user?.role_id === 3 || user?.role_id === 7;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [yearlyResponse, summaryResponse] = await Promise.all([
          fetchIgrcYearly(token),
          fetchIgrcSummary(token)
        ]);

        const igrcRows = yearlyResponse?.data || [];
        const formattedYearly = igrcRows.map((row) => ({
          year: row.grievance_year,
          filed: row.total_grievances_filed,
          pending: row.grievances_pending,
          resolved: row.grievances_resolved,
        }));
        formattedYearly.sort((a, b) => a.year - b.year);
        setYearlyData(formattedYearly);

        const summaryData = summaryResponse?.data || {};
        setSummary({
          total: summaryData.total || 0,
          pending: summaryData.pending || 0,
          resolved: summaryData.resolved || 0
        });
      } catch (err) {
        console.error('Failed to load IGRC data:', err);
        setError(err.message || 'Failed to load IGRC data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, uploadVersion]);

  return (
    <>
      {(typeof user === 'undefined' || user?.role_id !== 0) && (
        <div className={isPublicView ? "" : "page-container"}>
          <div className={isPublicView ? "" : "page-content"}>
            {!isReadOnlyView && (
              <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
                &#8592; Back to People &amp; Campus
              </button>
            )}

            {!isReadOnlyView && (
              <div className="section-header">
                <h1 className="section-title">
                  Internal Grievance Resolution Cell (IGRC)
                </h1>

                {!isReadOnlyView && isAdmin && (
                  <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                    Upload Data
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LastUpdated tables={['igrs_yearwise']} />
              <ShareButton />
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
              <SectionSkeleton cards={4} charts={1} />
            ) : (
              <div className="performance-render-auto">
                <div className="igrc-export-row">
                  <ExportMenu
                    elementId="igrc-summary-cards-container"
                    data={[summary]}
                    headers={['Total Grievances', 'Pending', 'Resolved']}
                    keys={['total', 'pending', 'resolved']}
                    filename="igrc_summary"
                    title="IGRC Summary"
                  />
                </div>

                {(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <div id="igrc-summary-cards-container" className="summary-cards-grid-4">
                    {/* Total Grievances — purple */}
                    <div className="metric-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', boxShadow: '0 10px 20px rgba(102, 126, 234, 0.2)' }}>
                      <div className="metric-card-glow" />
                      <div className="metric-card-inner">
                        <div className="metric-card-icon-row">
                          <span className="metric-card-icon">&#128203;</span>
                          <span className="metric-card-label">Total Grievances</span>
                        </div>
                        <div className="metric-card-value">{summary.total}</div>
                        <div className="metric-card-footer">
                          <span className="metric-card-dot" />
                          <span className="metric-card-subtitle">All grievances filed</span>
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
                        <div className="metric-card-value">{summary.resolved}</div>
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
                        <div className="metric-card-value">{summary.pending}</div>
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
                )}

                <div className="chart-section">
                  <h2 className="igrc-chart-h2">
                    Internal Grievance Resolution Cell (IGRC)
                  </h2>
                  <div className="chart-header">
                    <div>
                      <p className="chart-description igrc-chart-desc-p">
                        Visual comparison of total grievances filed against resolutions and pending cases.
                      </p>
                    </div>
                    <div className="igrc-metric-toggle-group">
                      <div className="igrc-metric-row">
                        <span className="igrc-metric-row-label igrc-metric-row-label--active">Active:</span>
                        {Object.entries(visibleMetrics).map(([key, visible]) => visible && (
                          <button
                            key={key}
                            type="button"
                            className="metric-toggle active igrc-metric-btn"
                            style={{ backgroundColor: BAR_COLORS[key] }}
                            onClick={() => setVisibleMetrics(prev => {
                              const next = { ...prev, [key]: false };
                              if (Object.values(next).every(v => !v)) return prev;
                              return next;
                            })}
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)} &#10005;
                          </button>
                        ))}
                      </div>
                      {Object.values(visibleMetrics).some(v => !v) && (
                        <div className="igrc-metric-row igrc-metric-row--animated">
                          <span className="igrc-metric-row-label igrc-metric-row-label--hidden">Hidden:</span>
                          {Object.entries(visibleMetrics).map(([key, visible]) => !visible && (
                            <button
                              key={key}
                              type="button"
                              className="metric-toggle igrc-metric-btn igrc-metric-btn--hidden"
                              onClick={() => setVisibleMetrics(prev => ({ ...prev, [key]: true }))}
                            >
                              + {key.charAt(0).toUpperCase() + key.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bar / Trend toggle */}
                  <div className="igrc-toggle-toolbar">
                    <div className="igrc-toggle-left">
                      {['Bar', 'Trend'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setChartType(mode)}
                          className={`igrc-mode-btn${chartType === mode ? ' igrc-mode-btn--active' : ''}`}
                        >
                          {mode === 'Bar' ? '&#128202; Bar' : '&#128200; Trend'}
                        </button>
                      ))}
                    </div>
                    <div className="igrc-export-wrapper">
                      <ExportMenu
                        elementId="igrc-yearly-chart-container"
                        data={
                          selectedYear === 'All'
                            ? yearlyData
                            : yearlyData.filter((row) => String(row.year) === String(selectedYear))
                        }
                        headers={['Year', 'Filed', 'Pending', 'Resolved']}
                        keys={['year', 'filed', 'pending', 'resolved']}
                        filename="igrc_yearly_data"
                        title="IGRC Yearly Grievances"
                      />
                    </div>
                  </div>

                  {yearlyData.length === 0 ? (
                    <div className="no-data">No grievance records available.</div>
                  ) : (() => {
                    const chartData = selectedYear === 'All'
                      ? yearlyData
                      : yearlyData.filter((row) => String(row.year) === String(selectedYear));
                    const sharedAxisProps = {
                      xAxis: <XAxis dataKey="year" stroke="#000000" tick={{ fill: '#000000', fontSize: 14, fontWeight: 'bold' }} label={{ value: 'Year', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#000000', fontSize: 16, fontWeight: 'bold' } }} />,
                      yAxis: <YAxis stroke="#000000" tick={{ fill: '#000000', fontSize: 14, fontWeight: 'bold' }} label={{ value: 'Number of Grievances', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#000000', fontSize: 16, fontWeight: 'bold' } }} />,
                      tooltip: <Tooltip content={<CustomTooltip denominatorKey="filed" excludePercentageFor={['Filed']} />} />,
                      legend: <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />,
                      grid: <CartesianGrid strokeDasharray="3 3" stroke="#444" />,
                    };
                    return (
                      <div id="igrc-yearly-chart-container" className="chart-container igrc-chart-container">
                        {/* Bar chart */}
                        <div
                          className={`chart-wrapper clickable-chart ${chartType === 'Bar' ? 'active' : 'inactive'}`}
                          onClick={() => setExpandedChart({
                            title: "IGRC Grievance Distribution",
                            content: (
                              <ResponsiveContainer width="100%" height={500}>
                                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                  <XAxis dataKey="year" stroke="#000" tick={{ fill: '#000', fontSize: 14, fontWeight: 'bold' }} interval={0} angle={-40} textAnchor="end" height={60} />
                                  <YAxis stroke="#000" tick={{ fill: '#000', fontSize: 14, fontWeight: 'bold' }} label={{ value: 'Number of Grievances', angle: -90, position: 'insideLeft', style: { fill: '#000', fontSize: 16, fontWeight: 'bold' } }} />
                                  <Tooltip content={<CustomTooltip denominatorKey="filed" excludePercentageFor={['Filed']} />} />
                                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                                  <Bar dataKey={visibleMetrics.filed ? "filed" : "__hidden__"} name="Filed" fill={BAR_COLORS.filed}>
                                    <LabelList dataKey="filed" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: BAR_COLORS.filed }} />
                                  </Bar>
                                  <Bar dataKey={visibleMetrics.pending ? "pending" : "__hidden__"} name="Pending" fill={BAR_COLORS.pending}>
                                    <LabelList dataKey="pending" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: BAR_COLORS.pending }} />
                                  </Bar>
                                  <Bar dataKey={visibleMetrics.resolved ? "resolved" : "__hidden__"} name="Resolved" fill={BAR_COLORS.resolved}>
                                    <LabelList dataKey="resolved" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: BAR_COLORS.resolved }} />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )
                          })}
                        >
                          {(typeof user === 'undefined' || user?.role_id !== 0) && (
                            <ResponsiveContainer width="100%" height={420}>
                              <BarChart data={chartData} margin={{ top: 20, right: 20, left: chartIsMobile ? 30 : 60, bottom: chartIsMobile ? 50 : 60 }}>
                                {sharedAxisProps.grid}
                                <XAxis dataKey="year" stroke="#000000" tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }} interval={0} angle={chartIsMobile ? -40 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                                {sharedAxisProps.yAxis}
                                {sharedAxisProps.tooltip}
                                {sharedAxisProps.legend}
                                <Bar dataKey={visibleMetrics.filed ? "filed" : "__hidden__"} name="Filed" fill={BAR_COLORS.filed} legendType={visibleMetrics.filed ? "rect" : "none"}>
                                  {visibleMetrics.filed && <LabelList dataKey="filed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: BAR_COLORS.filed }} />}
                                </Bar>
                                <Bar dataKey={visibleMetrics.pending ? "pending" : "__hidden__"} name="Pending" fill={BAR_COLORS.pending} legendType={visibleMetrics.pending ? "rect" : "none"}>
                                  {visibleMetrics.pending && <LabelList dataKey="pending" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: BAR_COLORS.pending }} />}
                                </Bar>
                                <Bar dataKey={visibleMetrics.resolved ? "resolved" : "__hidden__"} name="Resolved" fill={BAR_COLORS.resolved} legendType={visibleMetrics.resolved ? "rect" : "none"}>
                                  {visibleMetrics.resolved && <LabelList dataKey="resolved" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: BAR_COLORS.resolved }} />}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* Trend (Line) chart */}
                        <div
                          className={`chart-wrapper clickable-chart ${chartType === 'Trend' ? 'active' : 'inactive'}`}
                          onClick={() => setExpandedChart({
                            title: "IGRC Grievance Trends",
                            content: (
                              <ResponsiveContainer width="100%" height={500}>
                                <LineChart data={chartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                  <XAxis dataKey="year" stroke="#000" tick={{ fill: '#000', fontSize: 14, fontWeight: 'bold' }} interval={0} angle={-40} textAnchor="end" height={60} />
                                  <YAxis stroke="#000" tick={{ fill: '#000', fontSize: 14, fontWeight: 'bold' }} label={{ value: 'Number of Grievances', angle: -90, position: 'insideLeft', style: { fill: '#000', fontSize: 16, fontWeight: 'bold' } }} />
                                  <Tooltip content={<CustomTooltip denominatorKey="filed" excludePercentageFor={['Filed']} />} />
                                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                                  <Line type="linear" dataKey="filed" name="Filed" stroke={BAR_COLORS.filed} strokeWidth={3} dot={{ r: 6, fill: BAR_COLORS.filed }} activeDot={{ r: 8 }}>
                                    <LabelList dataKey="filed" position="top" style={{ fontSize: '11px', fontWeight: 600, fill: BAR_COLORS.filed }} />
                                  </Line>
                                </LineChart>
                              </ResponsiveContainer>
                            )
                          })}
                        >
                          {(typeof user === 'undefined' || user?.role_id !== 0) && (
                            <ResponsiveContainer width="100%" height={420}>
                              <LineChart data={chartData} margin={{ top: 20, right: 20, left: chartIsMobile ? 30 : 60, bottom: chartIsMobile ? 50 : 60 }}>
                                {sharedAxisProps.grid}
                                <XAxis dataKey="year" stroke="#000000" tick={{ fill: '#000000', fontSize: 12, fontWeight: 'bold' }} interval={0} angle={chartIsMobile ? -40 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                                {sharedAxisProps.yAxis}
                                {sharedAxisProps.tooltip}
                                {sharedAxisProps.legend}
                                <Line type="linear" dataKey="filed" name="Filed" stroke={BAR_COLORS.filed} strokeWidth={3} dot={{ r: 5, fill: BAR_COLORS.filed, strokeWidth: 0 }} activeDot={{ r: 7 }}>
                                  <LabelList dataKey="filed" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: BAR_COLORS.filed }} />
                                </Line>
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <DataUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            tableName="igrs_yearwise"
            token={token}
          />

          <ChartExpandModal
            isOpen={!!expandedChart}
            onClose={() => setExpandedChart(null)}
            title={expandedChart?.title}
          >
            {expandedChart?.content}
          </ChartExpandModal>
        </div>
      )}
    </>
  );
}

export default IgrcSection;
