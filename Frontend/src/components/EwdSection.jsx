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
import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './EwdSection.css';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

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
  const [selectedYear, setSelectedYear] = useState(null); // null means "Latest"
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
  const [activeView, setActiveView] = useState('electricity'); // 'electricity' | 'perCapita' | 'environment'
  const [chartType, setChartType] = useState('Bar'); // 'Bar' | 'Trend'

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

  // Get available years from yearlyData
  const availableYears = useMemo(() => {
    return yearlyData.map(row => row.year).sort((a, b) => b - a); // Sort descending
  }, [yearlyData]);

  // Yearly data filtered based on selectedYear for use in charts
  const filteredYearlyData = useMemo(() => {
    if (!yearlyData.length) return [];
    // When "Latest" is selected (selectedYear === null), show full multi-year trend
    if (selectedYear === null) return yearlyData;
    return yearlyData.filter(row => row.year === selectedYear);
  }, [yearlyData, selectedYear]);

  // Get selected year data or latest year data
  const selectedYearData = useMemo(() => {
    if (selectedYear === null) {
      // Return latest year data
      return summary.latest ? {
        year: summary.latest.year,
        perCapitaElectricity: summary.latest.perCapitaElectricity,
        perCapitaWater: summary.latest.perCapitaWater,
        perCapitaRecycled: summary.latest.perCapitaRecycled,
        greenCoverage: summary.latest.greenCoverage
      } : null;
    }

    // Find selected year data from yearlyData
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



  // Scale data for Annual Electricity Consumption chart (divide by 1000 to show in thousands)
  const scaledYearlyData = useMemo(() => {
    return filteredYearlyData.map(row => ({
      ...row,
      annualElectricityScaled: row.annualElectricity / 1000 // Scale to thousands
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
            ← Back to People & Campus
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
            <p>Loading EWD data...</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
              <ExportMenu
                elementId="ewd-summary-cards-container"
                data={[summary]}
                headers={['Total Electricity', 'Avg Electricity/Capita', 'Avg Water/Capita', 'Avg Green Coverage']}
                keys={['totalAnnualElectricity', 'averagePerCapitaElectricity', 'averagePerCapitaWater', 'averageGreenCoverage']}
                filename="ewd_summary"
                title="EWD Summary"
              />
            </div>
            {/* Modern Summary Cards */}
            <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<div id="ewd-summary-cards-container" style={{
              display: 'grid',
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* Total Annual Electricity Card */}
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
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>⚡</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Total Annual Electricity</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {formatNumber(summary.totalAnnualElectricity)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Cumulative kWh</span>
                  </div>
                </div>
              </div>

              {/* Avg. Per Capita Electricity Card */}
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)',
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
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>💡</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Avg. Per Capita Electricity</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {formatDecimal(summary.averagePerCapitaElectricity)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>kWh per person</span>
                  </div>
                </div>
              </div>

              {/* Avg. Per Capita Water Card */}
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
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>💧</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Avg. Per Capita Water</span>
                  </div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {formatDecimal(summary.averagePerCapitaWater)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} />
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Litres per person</span>
                  </div>
                </div>
              </div>
            </div>
)}</>

            {selectedYearData && (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                marginBottom: '30px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '15px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px', background: '#f0f0f0', padding: '8px', borderRadius: '8px' }}>📊</span>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Current Year Indicators</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label htmlFor="year-selector" style={{ fontWeight: '600', fontSize: '14px', color: '#555' }}>
                      Select Year:
                    </label>
                    <select
                      id="year-selector"
                      value={selectedYear || 'latest'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedYear(value === 'latest' ? null : parseInt(value));
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        fontSize: '14px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        minWidth: '150px'
                      }}
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

                <div id="ewd-current-year-indicators-container" className="grid-4" style={{ gap: '15px' }}>
                  {/* Per Capita Electricity Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #f59e0b30',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: '600', marginBottom: '8px' }}>
                      ⚡ Per Capita Electricity
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '4px' }}>
                      {formatDecimal(selectedYearData.perCapitaElectricity)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>kWh</div>
                  </div>

                  {/* Per Capita Water Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #43e97b15 0%, #43e97b05 100%)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #43e97b30',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#43e97b', fontWeight: '600', marginBottom: '8px' }}>
                      💧 Per Capita Water
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#43e97b', marginBottom: '4px' }}>
                      {formatDecimal(selectedYearData.perCapitaWater)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Litres</div>
                  </div>

                  {/* Per Capita Recycled Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fa709a15 0%, #fa709a05 100%)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #fa709a30',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#fa709a', fontWeight: '600', marginBottom: '8px' }}>
                      🔄 Per Capita Recycled
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fa709a', marginBottom: '4px' }}>
                      {formatDecimal(selectedYearData.perCapitaRecycled)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Litres</div>
                  </div>

                  {/* Green Coverage Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #34d39915 0%, #34d39905 100%)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid #34d39930',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '14px', color: '#34d399', fontWeight: '600', marginBottom: '8px' }}>
                      🌳 Green Coverage
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#34d399', marginBottom: '4px' }}>
                      {formatDecimal(selectedYearData.greenCoverage)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>sq.m</div>
                  </div>
                </div>
              </div>
            )}

            {/* View selector for different EWD charts */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              borderBottom: '2px solid #e0e0e0',
              paddingBottom: '10px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => setActiveView('electricity')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: activeView === 'electricity' ? '#667eea' : '#f8f9fa',
                  color: activeView === 'electricity' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeView === 'electricity' ? '600' : '500',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>⚡</span> Annual Electricity
              </button>
              <button
                type="button"
                onClick={() => setActiveView('perCapita')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: activeView === 'perCapita' ? '#f59e0b' : '#f8f9fa',
                  color: activeView === 'perCapita' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeView === 'perCapita' ? '600' : '500',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>📊</span> Per Capita Trends
              </button>
              <button
                type="button"
                onClick={() => setActiveView('environment')}
                style={{
                  padding: '10px 24px',
                  backgroundColor: activeView === 'environment' ? '#34d399' : '#f8f9fa',
                  color: activeView === 'environment' ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeView === 'environment' ? '600' : '500',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>🌳</span> Environmental Summary
              </button>
            </div>

            {activeView === 'electricity' && (
              <div className="chart-section" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="chart-header">
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#333' }}>Annual Electricity Consumption</h2>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Institution-wide electricity usage (kWh) recorded by EWD each financial year.</p>
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

                {/* Bar / Trend toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['Bar', 'Trend'].map(mode => (
                    <button key={mode} type="button" onClick={() => setChartType(mode)} style={{
                      padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      backgroundColor: chartType === mode ? '#667eea' : '#e9ecef',
                      color: chartType === mode ? '#fff' : '#333',
                      fontWeight: chartType === mode ? '600' : '400',
                      fontSize: '13px', transition: 'all 0.2s'
                    }}>
                      {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>

                {filteredYearlyData.length === 0 ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚡</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No EWD records available.</p>
                  </div>
                ) : (
                  <div id="ewd-electricity-chart-container" className="chart-container" style={{ padding: '10px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                      Scale: 1 unit = 1,000 kWh
                    </div>
                    {/* Bar chart */}
                    <div className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={380}>
                        <BarChart data={scaledYearlyData} margin={{ top: 26, right: 20, left: 60, bottom: 55 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Consumption (× 1,000 kWh)', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                          <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                          <Bar dataKey="annualElectricityScaled" name="Electricity Consumption (× 1,000 kWh)" fill="#667eea" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive animationDuration={700}>
                            <LabelList dataKey="annualElectricityScaled" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
)}</>
                    </div>
                    {/* Trend chart */}
                    <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={380}>
                        <LineChart data={scaledYearlyData} margin={{ top: 26, right: 20, left: 60, bottom: 55 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Financial Year', position: 'insideBottom', offset: -30, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} label={{ value: 'Consumption (× 1,000 kWh)', angle: -90, position: 'insideLeft', offset: -45, style: { fill: '#555', fontSize: 12, fontWeight: 500 } }} />
                          <Tooltip content={<CustomTooltip hidePercentage={true} />} />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                          <Line type="linear" dataKey="annualElectricityScaled" name="Electricity Consumption (× 1,000 kWh)" stroke="#667eea" strokeWidth={3} dot={{ r: 5, fill: '#667eea', strokeWidth: 0 }} activeDot={{ r: 7 }}>
                            <LabelList dataKey="annualElectricityScaled" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: "#667eea" }} />
                          </Line>
                        </LineChart>
                      </ResponsiveContainer>
)}</>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'perCapita' && (
              <div className="chart-section" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="chart-header">
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#333' }}>Per Capita Consumption Trends</h2>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Electricity and water consumption metrics normalised per capita.</p>
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

                {/* Bar / Trend toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['Bar', 'Trend'].map(mode => (
                    <button key={mode} type="button" onClick={() => setChartType(mode)} style={{
                      padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      backgroundColor: chartType === mode ? '#667eea' : '#e9ecef',
                      color: chartType === mode ? '#fff' : '#333',
                      fontWeight: chartType === mode ? '600' : '400',
                      fontSize: '13px', transition: 'all 0.2s'
                    }}>
                      {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>

                {filteredYearlyData.length === 0 ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No per capita consumption records available.</p>
                  </div>
                ) : (
                  <div id="ewd-percapita-chart-container" className="chart-container" style={{ padding: '10px' }}>
                    {/* Bar chart */}
                    <div className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={400}>
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
)}</>
                    </div>
                    {/* Trend chart */}
                    <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={400}>
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
)}</>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'environment' && (
              <div className="chart-section" style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div className="chart-header">
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#333' }}>Environmental Summary</h2>
                    <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>Green coverage (sq.m) illustrates campus sustainability efforts over time.</p>
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

                {/* Bar / Trend toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['Bar', 'Trend'].map(mode => (
                    <button key={mode} type="button" onClick={() => setChartType(mode)} style={{
                      padding: '7px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      backgroundColor: chartType === mode ? '#667eea' : '#e9ecef',
                      color: chartType === mode ? '#fff' : '#333',
                      fontWeight: chartType === mode ? '600' : '400',
                      fontSize: '13px', transition: 'all 0.2s'
                    }}>
                      {mode === 'Bar' ? '📊 Bar' : '📈 Trend'}
                    </button>
                  ))}
                </div>

                {filteredYearlyData.length === 0 ? (
                  <div className="no-data" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🌳</span>
                    <p style={{ color: '#666', fontSize: '16px' }}>No environmental records available.</p>
                  </div>
                ) : (
                  <div id="ewd-environment-chart-container" className="chart-container" style={{ padding: '10px' }}>
                    {/* Bar chart */}
                    <div className={`chart-wrapper ${chartType === 'Bar' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={370}>
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
)}</>
                    </div>
                    {/* Trend (Area) chart */}
                    <div className={`chart-wrapper ${chartType === 'Trend' ? 'active' : 'inactive'}`}>
                      <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={370}>
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
)}</>
                    </div>
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
        tableName="ewd_yearwise"
        token={token}
      />
    </div>
  );
}

export default EwdSection;