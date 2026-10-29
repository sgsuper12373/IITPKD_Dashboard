import { useEffect, useState, useMemo } from 'react';
import DashboardIcon from './DashboardIcon';
import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
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
import DashboardPageHeader from './DashboardPageHeader';

const BAR_COLORS = {
  filed: '#142D4E',
  pending: '#F5A623',
  resolved: '#087E8B'
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
  const [hasLoaded, setHasLoaded] = useState(false);
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
        setHasLoaded(true);
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
      total: row?.filed || 0,
      resolved: row?.resolved || 0,
      pending: row?.pending || 0
    };
  }, [selectedYear, summary, yearlyData]);

  return (
    <>
      {(!!user && user.role_id !== 0) && (
        <div className={isPublicView ? "" : "page-container"}>
          <div className={isPublicView ? "" : "page-content"}>
            {!isReadOnlyView && (
              <button className="page-back-btn" onClick={() => navigate('/people-campus')}>
                &#8592; Back to People &amp; Campus
              </button>
            )}

            <DashboardPageHeader
              title="Internal Grievance Resolution Cell (IGRC)"
              subtitle="Explore institutional grievance redressal."
              tables={['igrs_yearwise']}
            >
              {!isReadOnlyView && isAdmin && (
                <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                  Upload Data
                </button>
              )}
            </DashboardPageHeader>

            {error && <div className="error-message">{error}</div>}

            {loading && !hasLoaded ? (
              <SectionSkeleton cards={4} charts={1} />
            ) : (
              <div className="performance-render-auto">
                <div className="igrc-export-row">
                  <ExportMenu
                    elementId="igrc-summary-cards-container"
                    data={[displaySummary]}
                    headers={['Total Grievances', 'Pending', 'Resolved']}
                    keys={['total', 'pending', 'resolved']}
                    filename="igrc_summary"
                    title="IGRC Summary"
                  />
                </div>

                {(!!user && user.role_id !== 0) && (
                  <div id="igrc-summary-cards-container" className="summary-cards-grid-4">
                    {/* Total Grievances — purple */}
                    <div className="metric-card" style={{ background: 'linear-gradient(135deg, #0F1F36 0%, #142D4E 100%)', boxShadow: '0 10px 20px rgba(15, 31, 54,0.2)' }}>
                      <div className="metric-card-glow" />
                      <div className="metric-card-inner">
                        <div className="metric-card-icon-row">
                          <DashboardIcon name="profile" className="metric-card-icon" />
                          <span className="metric-card-label">Total Grievances</span>
                        </div>
                        <div className="metric-card-value">{displaySummary.total}</div>
                        <div className="metric-card-footer">
                          <span className="metric-card-dot" />
                          <span className="metric-card-subtitle">
                            {selectedYear === 'All' ? 'All grievances filed' : `Filed in ${selectedYear}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resolved — green */}
                    <div className="metric-card" style={{ background: 'linear-gradient(135deg, #087E8B 0%, #066A75 100%)', boxShadow: '0 10px 20px rgba(8, 126, 139,0.2)' }}>
                      <div className="metric-card-glow" />
                      <div className="metric-card-inner">
                        <div className="metric-card-icon-row">
                          <DashboardIcon name="check" className="metric-card-icon" />
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
                    <div className="metric-card" style={{ background: 'linear-gradient(135deg, #066A75 0%, #087E8B 100%)', boxShadow: '0 10px 20px rgba(6, 106, 117,0.2)' }}>
                      <div className="metric-card-glow" />
                      <div className="metric-card-inner">
                        <div className="metric-card-icon-row">
                          <DashboardIcon name="clock" className="metric-card-icon" />
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
                    <div className="metric-card" style={{ background: 'linear-gradient(135deg, #142D4E 0%, #0F1F36 100%)', boxShadow: '0 10px 20px rgba(20, 45, 78,0.2)' }}>
                      <div className="metric-card-glow" />
                      <div className="metric-card-inner">
                        <div className="metric-card-icon-row">
                          <DashboardIcon name="calendar" className="metric-card-icon" />
                          <span className="metric-card-label">Filter by Year</span>
                        </div>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="metric-card-filter-select"
                        >
                          <option value="All" style={{ color: '#142D4E', background: '#fff' }}>All Years</option>
                          {yearlyData.map((row) => (
                            <option key={row.year} value={row.year} style={{ color: '#142D4E', background: '#fff' }}>
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
                  <div className="cc-subheader">
                    <h3 className="cc-title">Yearly Grievances</h3>
                    <div className="cc-subheader__right">
                      {Object.entries(visibleMetrics).map(([key, visible]) => (
                        <button
                          key={key}
                          type="button"
                          className="series-toggle-btn"
                          style={{ backgroundColor: visible ? BAR_COLORS[key] : '#f0f0f0', color: visible ? '#fff' : '#666' }}
                          onClick={() => setVisibleMetrics(prev => {
                            const next = { ...prev, [key]: !visible };
                            if (Object.values(next).every(v => !v)) return prev;
                            return next;
                          })}
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </button>
                      ))}
                      <div className="rls-mode-toggle">
                        {['Bar', 'Trend'].map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setChartType(mode)}
                            className={`rls-mode-btn${chartType === mode ? ' rls-mode-btn--active' : ''}`}
                          >
                            {mode === 'Bar' ? <><BarChartOutlined /> Bar</> : <><LineChartOutlined /> Trend</>}
                          </button>
                        ))}
                      </div>
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
                      xAxis: <XAxis dataKey="year" stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} label={{ value: 'Year', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#26384D', fontSize: 14, fontWeight: 500 } }} />,
                      yAxis: <YAxis stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} label={{ value: 'Number of Grievances', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#26384D', fontSize: 14, fontWeight: 500 } }} />,
                      tooltip: <Tooltip content={<CustomTooltip denominatorKey="filed" excludePercentageFor={['Filed']} />} />,
                      legend: <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 500 }} iconType="rect" />,
                      grid: <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />,
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
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                  <XAxis dataKey="year" stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} interval={0} angle={-40} textAnchor="end" height={60} />
                                  <YAxis stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} label={{ value: 'Number of Grievances', angle: -90, position: 'insideLeft', style: { fill: '#26384D', fontSize: 14, fontWeight: 500 } }} />
                                  <Tooltip content={<CustomTooltip denominatorKey="filed" excludePercentageFor={['Filed']} />} />
                                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 500 }} iconType="rect" />
                                  <Bar dataKey={visibleMetrics.filed ? "filed" : "__hidden__"} name="Filed" fill={BAR_COLORS.filed}>
                                    <LabelList dataKey="filed" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.filed }} />
                                  </Bar>
                                  <Bar dataKey={visibleMetrics.pending ? "pending" : "__hidden__"} name="Pending" fill={BAR_COLORS.pending}>
                                    <LabelList dataKey="pending" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.pending }} />
                                  </Bar>
                                  <Bar dataKey={visibleMetrics.resolved ? "resolved" : "__hidden__"} name="Resolved" fill={BAR_COLORS.resolved}>
                                    <LabelList dataKey="resolved" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.resolved }} />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            )
                          })}
                        >
                          {(!!user && user.role_id !== 0) && (
                            <ResponsiveContainer width="100%" height={420}>
                              <BarChart data={chartData} margin={{ top: 20, right: 20, left: chartIsMobile ? 30 : 60, bottom: chartIsMobile ? 50 : 60 }}>
                                {sharedAxisProps.grid}
                                <XAxis dataKey="year" stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} interval={0} angle={chartIsMobile ? -40 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                                {sharedAxisProps.yAxis}
                                {sharedAxisProps.tooltip}
                                {sharedAxisProps.legend}
                                <Bar dataKey={visibleMetrics.filed ? "filed" : "__hidden__"} name="Filed" fill={BAR_COLORS.filed} legendType={visibleMetrics.filed ? "rect" : "none"}>
                                  {visibleMetrics.filed && <LabelList dataKey="filed" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.filed }} />}
                                </Bar>
                                <Bar dataKey={visibleMetrics.pending ? "pending" : "__hidden__"} name="Pending" fill={BAR_COLORS.pending} legendType={visibleMetrics.pending ? "rect" : "none"}>
                                  {visibleMetrics.pending && <LabelList dataKey="pending" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.pending }} />}
                                </Bar>
                                <Bar dataKey={visibleMetrics.resolved ? "resolved" : "__hidden__"} name="Resolved" fill={BAR_COLORS.resolved} legendType={visibleMetrics.resolved ? "rect" : "none"}>
                                  {visibleMetrics.resolved && <LabelList dataKey="resolved" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.resolved }} />}
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
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                  <XAxis dataKey="year" stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} interval={0} angle={-40} textAnchor="end" height={60} />
                                  <YAxis stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} label={{ value: 'Number of Grievances', angle: -90, position: 'insideLeft', style: { fill: '#26384D', fontSize: 14, fontWeight: 500 } }} />
                                  <Tooltip content={<CustomTooltip denominatorKey="filed" excludePercentageFor={['Filed']} />} />
                                  <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 500 }} iconType="rect" />
                                  <Line type="linear" dataKey="filed" name="Filed" stroke={BAR_COLORS.filed} strokeWidth={3} dot={{ r: 6, fill: BAR_COLORS.filed }} activeDot={{ r: 8 }}>
                                    <LabelList dataKey="filed" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.filed }} />
                                  </Line>
                                </LineChart>
                              </ResponsiveContainer>
                            )
                          })}
                        >
                          {(!!user && user.role_id !== 0) && (
                            <ResponsiveContainer width="100%" height={420}>
                              <LineChart data={chartData} margin={{ top: 20, right: 20, left: chartIsMobile ? 30 : 60, bottom: chartIsMobile ? 50 : 60 }}>
                                {sharedAxisProps.grid}
                                <XAxis dataKey="year" stroke="#26384D" tick={{ fill: '#26384D', fontSize: 14, fontWeight: 500 }} interval={0} angle={chartIsMobile ? -40 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                                {sharedAxisProps.yAxis}
                                {sharedAxisProps.tooltip}
                                {sharedAxisProps.legend}
                                <Line type="linear" dataKey="filed" name="Filed" stroke={BAR_COLORS.filed} strokeWidth={3} dot={{ r: 5, fill: BAR_COLORS.filed, strokeWidth: 0 }} activeDot={{ r: 7 }}>
                                  <LabelList dataKey="filed" position="top" style={{ fontSize: '14px', fontWeight: 500, fill: BAR_COLORS.filed }} />
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
