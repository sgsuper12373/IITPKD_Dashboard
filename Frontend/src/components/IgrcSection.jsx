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
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import SectionSkeleton from './SectionSkeleton';

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

        // Sort by year ascending for consistent dropdown order
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
              <button
                className="page-back-btn"
                onClick={() => navigate('/people-campus')}
              >
                ← Back to People & Campus
              </button>
            )}

            {!isReadOnlyView && (
              <div className="section-header">
                <h1 className="section-title">
                  Internal Grievance Resolution Cell (IGRC)
                </h1>

                {!isReadOnlyView && isAdmin && (
                  <button
                    className="page-upload-btn"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    Upload Data
                  </button>
                )}
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {loading ? (
              <SectionSkeleton cards={4} charts={1} />
            ) : (
              <div className="performance-render-auto">
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
                  <ExportMenu
                    elementId="igrc-summary-cards-container"
                    data={[summary]}
                    headers={['Total Grievances', 'Pending', 'Resolved']}
                    keys={['total', 'pending', 'resolved']}
                    filename="igrc_summary"
                    title="IGRC Summary"
                  />
                </div>
                {/* Modern Gradient Summary Cards */}
                <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <div id="igrc-summary-cards-container" className="grid-4" style={{
                    gap: '20px',
                    marginBottom: '30px'
                  }}>
                    {/* Total Grievances Card - Purple Gradient */}
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
                          <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📋</span>
                          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Grievances</span>
                        </div>
                        <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                          {summary.total}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>All grievances filed</span>
                        </div>
                      </div>
                    </div>

                    {/* Resolved Card - Green Gradient */}
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
                          <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>✅</span>
                          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Resolved</span>
                        </div>
                        <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                          {summary.resolved}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Successfully closed</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Card - Pink Gradient */}
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
                          <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>⏳</span>
                          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Pending</span>
                        </div>
                        <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                          {summary.pending}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Currently in process</span>
                        </div>
                      </div>
                    </div>

                    {/* Filter by Year Card - Purple Gradient */}
                    <div style={{
                      background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 10px 20px rgba(168, 85, 247, 0.2)',
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
                          <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>📅</span>
                          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Filter by Year</span>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              fontSize: '14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.3)',
                              backgroundColor: 'rgba(255,255,255,0.2)',
                              color: 'white',
                              fontWeight: '500',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="All" style={{ color: '#333' }}>All Years</option>
                            {yearlyData.map((row) => (
                              <option key={row.year} value={row.year} style={{ color: '#333' }}>
                                {row.year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Focus on a specific year</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}</>

                <div className="chart-section">
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '20px' }}>
                    Internal Grievance Resolution Cell (IGRC)
                  </h2>
                  <div className="chart-header">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <p className="chart-description" style={{ margin: 0 }}>
                          Visual comparison of total grievances filed against resolutions and pending cases.
                        </p>
                      </div>
                    </div>
                    <div className="metric-toggle-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
                        {Object.entries(visibleMetrics).map(([key, visible]) => visible && (
                          <button
                            key={key}
                            type="button"
                            className="metric-toggle active"
                            style={{ minWidth: '90px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: BAR_COLORS[key] }}
                            onClick={() => setVisibleMetrics(prev => {
                              const next = { ...prev, [key]: false };
                              if (Object.values(next).every(v => !v)) return prev;
                              return next;
                            })}
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1)} ✕
                          </button>
                        ))}
                      </div>
                      {Object.values(visibleMetrics).some(v => !v) && (
                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', alignItems: 'center', animation: 'fadeIn 0.3s ease' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hidden:</span>
                          {Object.entries(visibleMetrics).map(([key, visible]) => !visible && (
                            <button
                              key={key}
                              type="button"
                              className="metric-toggle"
                              style={{ minWidth: '90px', opacity: 0.6, borderStyle: 'dashed' }}
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
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '12px 0'
                  }}>
                    {/* Left side → Bar / Trend toggle */}
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

                    {/* Right side → Export Menu */}
                    <div style={{ position: 'relative', zIndex: 9999 }}>
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
                      <div id="igrc-yearly-chart-container" className="chart-container" style={{ padding: '10px' }}>
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
                          <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
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
                          )}</>
                        </div>

                        {/* Trend (Line) chart — complaints filed only */}
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
                          <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
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
                          )}</>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Upload Modal */}
          <DataUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            tableName="igrs_yearwise"
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
        </div >
      )}
    </>
  );
}

export default IgrcSection;