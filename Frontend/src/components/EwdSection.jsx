import { useEffect, useMemo, useState } from 'react';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend, LabelList
} from 'recharts';

import { fetchEwdSummary, fetchEwdYearly } from '../services/ewdStats';
import DataUploadModal from './LazyDataUploadModal';
import ChartExpandModal from './ChartExpandModal';
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './EwdSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import SectionSkeleton from './SectionSkeleton';

const ENERGY_BAR_COLOR = '#667eea';
const ELECTRICITY_LINE_COLOR = '#f59e0b';
const WATER_LINE_COLOR = '#43e97b';
const RECYCLED_LINE_COLOR = '#fa709a';
const GREEN_AREA_STROKE = '#34d399';
const GREEN_AREA_FILL = 'rgba(52, 211, 153, 0.35)';

const numberFormatter = new Intl.NumberFormat('en-IN');
const decimalFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatNumber = (value) => numberFormatter.format(Math.round(value || 0));
const formatDecimal = (value) => decimalFormatter.format(value || 0);

function EwdSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [yearlyData, setYearlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [summary, setSummary] = useState({
    totalAnnualElectricity: 0,
    averagePerCapitaElectricity: 0,
    averagePerCapitaWater: 0,
    averagePerCapitaRecycledWater: 0,
    averageGreenCoverage: 0,
    latest: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('electricity');
  const [chartType, setChartType] = useState('Bar');
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
  const isAdmin = user?.role_id === 3 || user?.role_id === 6;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [yearlyResponse, summaryResponse] = await Promise.all([
          fetchEwdYearly(token),
          fetchEwdSummary(token)
        ]);

        const yearlyRows = yearlyResponse?.data || [];
        const formattedYearly = yearlyRows.map((row) => ({
          year: row.ewd_year,
          annualElectricity: Number(row.annual_electricity_consumption || 0),
          perCapitaElectricity: Number(row.per_capita_electricity_consumption || 0),
          perCapitaWater: Number(row.per_capita_water_consumption || 0),
          perCapitaRecycled: Number(row.per_capita_recycled_water || 0),
          greenCoverage: Number(row.green_coverage || 0)
        }));
        setYearlyData(formattedYearly);

        const summaryData = summaryResponse?.data || {};
        const latest = summaryData.latest
          ? {
            year: summaryData.latest.ewd_year,
            perCapitaElectricity: Number(summaryData.latest.per_capita_electricity_consumption || 0),
            perCapitaWater: Number(summaryData.latest.per_capita_water_consumption || 0),
            perCapitaRecycled: Number(summaryData.latest.per_capita_recycled_water || 0),
            greenCoverage: Number(summaryData.latest.green_coverage || 0)
          }
          : null;

        setSummary({
          totalAnnualElectricity: Number(summaryData.total_annual_electricity || 0),
          averagePerCapitaElectricity: Number(summaryData.average_per_capita_electricity || 0),
          averagePerCapitaWater: Number(summaryData.average_per_capita_water || 0),
          averagePerCapitaRecycledWater: Number(summaryData.average_per_capita_recycled_water || 0),
          averageGreenCoverage: Number(summaryData.average_green_coverage || 0),
          latest
        });
      } catch (err) {
        console.error('Failed to load EWD data:', err);
        setError(err.message || 'Failed to load EWD data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, uploadVersion]);

  const availableYears = useMemo(() => {
    return yearlyData.map(row => row.year).sort((a, b) => b - a);
  }, [yearlyData]);

  const filteredYearlyData = useMemo(() => {
    if (!yearlyData.length) return [];
    if (selectedYear === null) return yearlyData;
    return yearlyData.filter(row => row.year === selectedYear);
  }, [yearlyData, selectedYear]);

  const selectedYearData = useMemo(() => {
    if (selectedYear === null) {
      return summary.latest ? {
        year: summary.latest.year,
        perCapitaElectricity: summary.latest.perCapitaElectricity,
        perCapitaWater: summary.latest.perCapitaWater,
        perCapitaRecycled: summary.latest.perCapitaRecycled,
        greenCoverage: summary.latest.greenCoverage
      } : null;
    }

    const yearData = yearlyData.find(row => row.year === selectedYear);
    if (!yearData) return null;

    return {
      year: yearData.year,
      perCapitaElectricity: yearData.perCapitaElectricity,
      perCapitaWater: yearData.perCapitaWater,
      perCapitaRecycled: yearData.perCapitaRecycled,
      greenCoverage: yearData.greenCoverage
    };
  }, [selectedYear, yearlyData, summary.latest]);

  const scaledYearlyData = useMemo(() => {
    return filteredYearlyData.map(row => ({
      ...row,
      annualElectricityScaled: row.annualElectricity / 1000
    }));
  }, [filteredYearlyData]);

  return (
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
              <h1>Engineering and Works Division (EWD)</h1>
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

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <SectionSkeleton cards={3} charts={3} />
        ) : (
          <>
            <div className="ewd-export-row">
              <ExportMenu
                elementId="ewd-summary-cards-container"
                data={[summary]}
                headers={['Total Electricity', 'Avg Electricity/Capita', 'Avg Water/Capita', 'Avg Green Coverage']}
                keys={['totalAnnualElectricity', 'averagePerCapitaElectricity', 'averagePerCapitaWater', 'averageGreenCoverage']}
                filename="ewd_summary"
                title="EWD Summary"
              />
            </div>

            {(typeof user === 'undefined' || user?.role_id !== 0) && (
              <div id="ewd-summary-cards-container" className="ewd-cards-grid">
                <div className="ewd-stat-card ewd-stat-card--indigo">
                  <div className="ewd-stat-card-decor" />
                  <div className="ewd-stat-card-body">
                    <div className="ewd-stat-card-header">
                      <span className="ewd-stat-card-icon">&#9889;</span>
                      <span className="ewd-stat-card-label">Total Annual Electricity</span>
                    </div>
                    <div className="ewd-stat-card-value">{formatNumber(summary.totalAnnualElectricity)}</div>
                    <div className="ewd-stat-card-status">
                      <span className="ewd-stat-card-dot" />
                      <span className="ewd-stat-card-subtext">Cumulative kWh</span>
                    </div>
                  </div>
                </div>

                <div className="ewd-stat-card ewd-stat-card--amber">
                  <div className="ewd-stat-card-decor" />
                  <div className="ewd-stat-card-body">
                    <div className="ewd-stat-card-header">
                      <span className="ewd-stat-card-icon">&#128161;</span>
                      <span className="ewd-stat-card-label">Avg. Per Capita Electricity</span>
                    </div>
                    <div className="ewd-stat-card-value">{formatDecimal(summary.averagePerCapitaElectricity)}</div>
                    <div className="ewd-stat-card-status">
                      <span className="ewd-stat-card-dot" />
                      <span className="ewd-stat-card-subtext">kWh per person</span>
                    </div>
                  </div>
                </div>

                <div className="ewd-stat-card ewd-stat-card--green">
                  <div className="ewd-stat-card-decor" />
                  <div className="ewd-stat-card-body">
                    <div className="ewd-stat-card-header">
                      <span className="ewd-stat-card-icon">&#128167;</span>
                      <span className="ewd-stat-card-label">Avg. Per Capita Water</span>
                    </div>
                    <div className="ewd-stat-card-value">{formatDecimal(summary.averagePerCapitaWater)}</div>
                    <div className="ewd-stat-card-status">
                      <span className="ewd-stat-card-dot" />
                      <span className="ewd-stat-card-subtext">Litres per person</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedYearData && (
              <div className="ewd-indicators-panel">
                <div className="ewd-indicators-header">
                  <div className="ewd-indicators-title-group">
                    <span className="ewd-indicators-icon">&#128202;</span>
                    <h2 className="ewd-indicators-h2">Current Year Indicators</h2>
                  </div>
                  <div className="ewd-indicators-controls">
                    <label htmlFor="year-selector" className="ewd-year-label">Select Year:</label>
                    <select
                      id="year-selector"
                      value={selectedYear || 'latest'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedYear(value === 'latest' ? null : parseInt(value));
                      }}
                      className="ewd-year-select"
                    >
                      <option value="latest">Latest Year</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>FY {year}</option>
                      ))}
                    </select>
                    <ExportMenu
                      elementId="ewd-current-year-indicators-container"
                      data={[selectedYearData]}
                      headers={['Year', 'Per Capita Electricity', 'Per Capita Water', 'Per Capita Recycled', 'Green Coverage']}
                      keys={['year', 'perCapitaElectricity', 'perCapitaWater', 'perCapitaRecycled', 'greenCoverage']}
                      filename={`ewd_indicators_${selectedYearData?.year || 'latest'}`}
                      title={`EWD Indicators - ${selectedYearData?.year || 'latest'}`}
                    />
                  </div>
                </div>

                <div id="ewd-current-year-indicators-container" className="ewd-indicators-grid">
                  <div className="ewd-indicator-card ewd-indicator-card--amber">
                    <div className="ewd-indicator-label ewd-indicator-label--amber">&#9889; Per Capita Electricity</div>
                    <div className="ewd-indicator-value ewd-indicator-value--amber">{formatDecimal(selectedYearData.perCapitaElectricity)}</div>
                    <div className="ewd-indicator-unit">kWh</div>
                  </div>

                  <div className="ewd-indicator-card ewd-indicator-card--green">
                    <div className="ewd-indicator-label ewd-indicator-label--green">&#128167; Per Capita Water</div>
                    <div className="ewd-indicator-value ewd-indicator-value--green">{formatDecimal(selectedYearData.perCapitaWater)}</div>
                    <div className="ewd-indicator-unit">Litres</div>
                  </div>

                  <div className="ewd-indicator-card ewd-indicator-card--pink">
                    <div className="ewd-indicator-label ewd-indicator-label--pink">&#128260; Per Capita Recycled</div>
                    <div className="ewd-indicator-value ewd-indicator-value--pink">{formatDecimal(selectedYearData.perCapitaRecycled)}</div>
                    <div className="ewd-indicator-unit">Litres</div>
                  </div>

                  <div className="ewd-indicator-card ewd-indicator-card--teal">
                    <div className="ewd-indicator-label ewd-indicator-label--teal">&#127795; Green Coverage</div>
                    <div className="ewd-indicator-value ewd-indicator-value--teal">{formatDecimal(selectedYearData.greenCoverage)}</div>
                    <div className="ewd-indicator-unit">sq.m</div>
                  </div>
                </div>
              </div>
            )}

            <div className="ewd-view-tabs">
              <button
                type="button"
                onClick={() => setActiveView('electricity')}
                className={`ewd-view-tab${activeView === 'electricity' ? ' ewd-view-tab--active-electricity' : ''}`}
              >
                <span>&#9889;</span> Annual Electricity
              </button>
              <button
                type="button"
                onClick={() => setActiveView('perCapita')}
                className={`ewd-view-tab${activeView === 'perCapita' ? ' ewd-view-tab--active-perCapita' : ''}`}
              >
                <span>&#128202;</span> Per Capita Trends
              </button>
              <button
                type="button"
                onClick={() => setActiveView('environment')}
                className={`ewd-view-tab${activeView === 'environment' ? ' ewd-view-tab--active-environment' : ''}`}
              >
                <span>&#127795;</span> Environmental Summary
              </button>
            </div>

            {activeView === 'electricity' && (
              <div className="chart-section">
                <div className="ewd-chart-header-row">
                  <div className="chart-header">
                    <h2 className="ewd-chart-h2">Annual Electricity Consumption</h2>
                    <p className="ewd-chart-desc">Institution-wide electricity usage (kWh) recorded by EWD each financial year.</p>
                  </div>
                  <ExportMenu
                    elementId="ewd-electricity-chart-container"
                    data={filteredYearlyData}
                    headers={['Year', 'Annual Electricity (kWh)']}
                    keys={['year', 'annualElectricity']}
                    filename="ewd_electricity_consumption"
                    title="Annual Electricity Consumption"
                  />
                </div>

                <div className="ewd-mode-toggle">
                  {['Bar', 'Trend'].map(mode => (
                    <button key={mode} type="button" onClick={() => setChartType(mode)}
                      className={`ewd-mode-btn${chartType === mode ? ' ewd-mode-btn--active' : ''}`}>
                      {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>

                {filteredYearlyData.length === 0 ? (
                  <div className="ewd-no-data">
                    <span className="ewd-no-data-icon">&#9889;</span>
                    <p className="ewd-no-data-text">No EWD records available.</p>
                  </div>
                ) : (
                  <div id="ewd-electricity-chart-container" className="chart-container ewd-chart-area">
                    <div className="ewd-scale-note">Scale: 1 unit = 1,000 kWh</div>
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Bar' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Annual Electricity Consumption",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <BarChart data={scaledYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} label={{ value: 'Financial Year', position: 'insideBottom', offset: -60, style: { fill: '#555', fontSize: 14, fontWeight: 600 } }} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} label={{ value: 'Consumption (× 1,000 kWh)', angle: -90, position: 'insideLeft', offset: -25, style: { fill: '#555', fontSize: 14, fontWeight: 600 } }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
                              <Bar dataKey="annualElectricityScaled" name="Electricity Consumption (× 1,000 kWh)" fill="#667eea" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="annualElectricityScaled" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#667eea" }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      {(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={chartIsMobile ? 250 : 380}>
                          <BarChart data={scaledYearlyData} margin={{ top: 26, right: 10, left: chartIsMobile ? 20 : 60, bottom: chartIsMobile ? 60 : 55 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} label={!chartIsMobile ? { value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } } : undefined} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} label={!chartIsMobile ? { value: 'Consumption (× 1,000 kWh)', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } } : undefined} />
                            <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            <Bar dataKey="annualElectricityScaled" name="Electricity Consumption (× 1,000 kWh)" fill="#667eea" radius={[4, 4, 0, 0]} barSize={30}>
                              <LabelList dataKey="annualElectricityScaled" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Trend' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Annual Electricity Trends",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <LineChart data={scaledYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={80} label={{ value: 'Financial Year', position: 'insideBottom', offset: -60, style: { fill: '#555', fontSize: 14, fontWeight: 600 } }} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} label={{ value: 'Consumption (× 1,000 kWh)', angle: -90, position: 'insideLeft', offset: -25, style: { fill: '#555', fontSize: 14, fontWeight: 600 } }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
                              <Line type="linear" dataKey="annualElectricityScaled" name="Electricity Consumption (× 1,000 kWh)" stroke="#667eea" strokeWidth={4} dot={{ r: 6, fill: '#667eea' }} activeDot={{ r: 8 }}>
                                <LabelList dataKey="annualElectricityScaled" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#667eea" }} />
                              </Line>
                            </LineChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      {(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={chartIsMobile ? 250 : 380}>
                          <LineChart data={scaledYearlyData} margin={{ top: 26, right: 10, left: chartIsMobile ? 20 : 60, bottom: chartIsMobile ? 60 : 55 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 60 : 30} label={!chartIsMobile ? { value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } } : undefined} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} label={!chartIsMobile ? { value: 'Consumption (× 1,000 kWh)', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } } : undefined} />
                            <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            <Line type="linear" dataKey="annualElectricityScaled" name="Electricity Consumption (× 1,000 kWh)" stroke="#667eea" strokeWidth={3} dot={{ r: 5, fill: '#667eea', strokeWidth: 0 }} activeDot={{ r: 7 }}>
                              <LabelList dataKey="annualElectricityScaled" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'perCapita' && (
              <div className="chart-section">
                <div className="ewd-chart-header-row">
                  <div className="chart-header">
                    <h2 className="ewd-chart-h2">Per Capita Consumption Trends</h2>
                    <p className="ewd-chart-desc">Electricity and water consumption metrics normalised per capita.</p>
                  </div>
                  <ExportMenu
                    elementId="ewd-percapita-chart-container"
                    data={filteredYearlyData}
                    headers={['Year', 'Electricity (kWh)', 'Water (Litres)', 'Recycled (Litres)']}
                    keys={['year', 'perCapitaElectricity', 'perCapitaWater', 'perCapitaRecycled']}
                    filename="ewd_per_capita_trends"
                    title="Per Capita Consumption Trends"
                  />
                </div>

                <div className="ewd-mode-toggle">
                  {['Bar', 'Trend'].map(mode => (
                    <button key={mode} type="button" onClick={() => setChartType(mode)}
                      className={`ewd-mode-btn${chartType === mode ? ' ewd-mode-btn--active' : ''}`}>
                      {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>

                {filteredYearlyData.length === 0 ? (
                  <div className="ewd-no-data">
                    <span className="ewd-no-data-icon">&#128202;</span>
                    <p className="ewd-no-data-text">No per capita consumption records available.</p>
                  </div>
                ) : (
                  <div id="ewd-percapita-chart-container" className="chart-container ewd-chart-area">
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Bar' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Per Capita Consumption",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <BarChart data={filteredYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }} barCategoryGap="20%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
                              <Bar dataKey="perCapitaElectricity" name="Electricity (kWh / person)" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="perCapitaElectricity" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#f59e0b" }} />
                              </Bar>
                              <Bar dataKey="perCapitaWater" name="Water (litres / person)" fill="#43e97b" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="perCapitaWater" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#43e97b" }} />
                              </Bar>
                              <Bar dataKey="perCapitaRecycled" name="Recycled Water (litres / person)" fill="#fa709a" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="perCapitaRecycled" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#fa709a" }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      {(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={chartIsMobile ? 250 : 400}>
                          <BarChart data={filteredYearlyData} margin={{ top: 26, right: 20, left: 60, bottom: 55 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Per Capita Consumption', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            <Bar dataKey="perCapitaElectricity" name="Electricity (kWh / person)" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                              <LabelList dataKey="perCapitaElectricity" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#f59e0b" }} />
                            </Bar>
                            <Bar dataKey="perCapitaWater" name="Water (litres / person)" fill="#43e97b" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                              <LabelList dataKey="perCapitaWater" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#43e97b" }} />
                            </Bar>
                            <Bar dataKey="perCapitaRecycled" name="Recycled Water (litres / person)" fill="#fa709a" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                              <LabelList dataKey="perCapitaRecycled" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#fa709a" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Trend' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Per Capita Consumption Trends",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <LineChart data={filteredYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
                              <Line type="linear" dataKey="perCapitaElectricity" name="Electricity (kWh / person)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }}>
                                <LabelList dataKey="perCapitaElectricity" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#f59e0b" }} />
                              </Line>
                              <Line type="linear" dataKey="perCapitaWater" name="Water (litres / person)" stroke="#43e97b" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }}>
                                <LabelList dataKey="perCapitaWater" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#43e97b" }} />
                              </Line>
                              <Line type="linear" dataKey="perCapitaRecycled" name="Recycled Water (litres / person)" stroke="#fa709a" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }}>
                                <LabelList dataKey="perCapitaRecycled" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#fa709a" }} />
                              </Line>
                            </LineChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      {(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={chartIsMobile ? 250 : 400}>
                          <LineChart data={filteredYearlyData} margin={{ top: 26, right: 20, left: 60, bottom: 55 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Per Capita Consumption', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            <Line type="linear" dataKey="perCapitaElectricity" name="Electricity (kWh / person)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 6 }}>
                              <LabelList dataKey="perCapitaElectricity" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#f59e0b" }} />
                            </Line>
                            <Line type="linear" dataKey="perCapitaWater" name="Water (litres / person)" stroke="#43e97b" strokeWidth={2.5} dot={{ r: 4, fill: '#43e97b', strokeWidth: 0 }} activeDot={{ r: 6 }}>
                              <LabelList dataKey="perCapitaWater" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#43e97b" }} />
                            </Line>
                            <Line type="linear" dataKey="perCapitaRecycled" name="Recycled Water (litres / person)" stroke="#fa709a" strokeWidth={2.5} dot={{ r: 4, fill: '#fa709a', strokeWidth: 0 }} activeDot={{ r: 6 }}>
                              <LabelList dataKey="perCapitaRecycled" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#fa709a" }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'environment' && (
              <div className="chart-section">
                <div className="ewd-chart-header-row">
                  <div className="chart-header">
                    <h2 className="ewd-chart-h2">Environmental Summary</h2>
                    <p className="ewd-chart-desc">Green coverage (sq.m) illustrates campus sustainability efforts over time.</p>
                  </div>
                  <ExportMenu
                    elementId="ewd-environment-chart-container"
                    data={filteredYearlyData}
                    headers={['Year', 'Green Coverage (sq.m)']}
                    keys={['year', 'greenCoverage']}
                    filename="ewd_environmental_summary"
                    title="Environmental Summary"
                  />
                </div>

                <div className="ewd-mode-toggle">
                  {['Bar', 'Trend'].map(mode => (
                    <button key={mode} type="button" onClick={() => setChartType(mode)}
                      className={`ewd-mode-btn${chartType === mode ? ' ewd-mode-btn--active' : ''}`}>
                      {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>

                {filteredYearlyData.length === 0 ? (
                  <div className="ewd-no-data">
                    <span className="ewd-no-data-icon">&#127795;</span>
                    <p className="ewd-no-data-text">No environmental records available.</p>
                  </div>
                ) : (
                  <div id="ewd-environment-chart-container" className="chart-container ewd-chart-area">
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Bar' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Environmental Summary",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <BarChart data={filteredYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
                              <Bar dataKey="greenCoverage" name="Green Coverage (sq.m)" fill="#34d399" radius={[6, 6, 0, 0]}>
                                <LabelList dataKey="greenCoverage" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#34d399" }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      {(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={chartIsMobile ? 240 : 370}>
                          <BarChart data={filteredYearlyData} margin={{ top: 26, right: 20, left: 60, bottom: 55 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Green Coverage (sq.m)', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            <Bar dataKey="greenCoverage" name="Green Coverage (sq.m)" fill="#34d399" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                              <LabelList dataKey="greenCoverage" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#34d399" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <div
                      className={`chart-wrapper clickable-chart ${chartType === 'Trend' ? 'active' : 'inactive'}`}
                      onClick={() => setExpandedChart({
                        title: "Environmental Trends",
                        content: (
                          <ResponsiveContainer width="100%" height={500}>
                            <LineChart data={filteredYearlyData} margin={{ top: 40, right: 30, left: 40, bottom: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <YAxis stroke="#666" tick={{ fontSize: 13, fontWeight: 600 }} />
                              <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '13px', paddingBottom: '20px' }} />
                              <Line type="linear" dataKey="greenCoverage" name="Green Coverage (sq.m)" stroke="#34d399" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }}>
                                <LabelList dataKey="greenCoverage" position="top" style={{ fontSize: '12px', fontWeight: 700, fill: "#34d399" }} />
                              </Line>
                            </LineChart>
                          </ResponsiveContainer>
                        )
                      })}
                    >
                      {(typeof user === 'undefined' || user?.role_id !== 0) && (
                        <ResponsiveContainer width="100%" height={chartIsMobile ? 240 : 370}>
                          <LineChart data={filteredYearlyData} margin={{ top: 26, right: 20, left: 60, bottom: 55 }}>
                            <defs>
                              <linearGradient id="colorGreenCoverage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Green Coverage (sq.m)', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                            <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                            <Line type="linear" dataKey="greenCoverage" name="Green Coverage (sq.m)" stroke="#34d399" fill="url(#colorGreenCoverage)" strokeWidth={2} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }}>
                              <LabelList dataKey="greenCoverage" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#34d399" }} />
                            </Line>
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="ewd_yearwise"
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
  );
}

export default EwdSection;
