import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar, LabelList
} from 'recharts';

import {
  fetchIarMouTrend,
  fetchIarMouList,
} from '../services/iarStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';

import './Page.css';
// Version bump for cache refresh

import './AcademicSection.css';
import './ResearchSection.css';
import '../DesignSystem.css';

const IAR_MOU_COLOR = '#14b8a6'; // Teal color to distinguish from ICSR purple

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

function EducationIarSection({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // const [filterOptions, setFilterOptions] = useState({
  //   mou_years: []
  // });

  const [filters, setFilters] = useState({ mou_year: 'All' });
  const [totalMous, setTotalMous] = useState(0);
  const [mouTrend, setMouTrend] = useState([]);
  const [mouList, setMouList] = useState([]);

  const [viewType, setViewType] = useState('trend'); // 'trend' | 'directory'
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'trend'

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;



  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [trendResp, listResp] = await Promise.all([
          fetchIarMouTrend({ mou_year: filters.mou_year }, token),
          fetchIarMouList({ mou_year: filters.mou_year }, token),
        ]);
        const trendData = trendResp?.data || [];
        setMouTrend(trendData);
        setMouList(listResp?.data || []);

        // Sum total from trend data
        setTotalMous(trendData.reduce((sum, row) => sum + (Number(row.total) || 0), 0));
      } catch (err) {
        setError('Failed to load IAR MoUs data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters, token, uploadVersion]);

  const mouTrendChartData = useMemo(() =>
    mouTrend.map((row) => ({ year: row.year, total: Number(row.total) || 0 })),
    [mouTrend]
  );

  // const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const handleClearFilters = () => setFilters({ mou_year: 'All' });

  // Using shared CustomTooltip from chartUtils
  const sortedMouList = useMemo(() => {
    return [...mouList].sort((a, b) =>
      (a.partner_name || '').localeCompare(b.partner_name || '')
    );
  }, [mouList]);
  return (
    <div className={`academic-section page-container ${isPublicView ? 'public-view' : ''}`}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isReadOnlyView && (
          <button
            className="page-back-btn"
            onClick={() => navigate('/education')}
            style={{ marginBottom: '20px' }}
          >
            ← Back to Education
          </button>
        )}

        <div className="section-header" style={{ marginBottom: '20px' }}>
          <div className="section-header-left">
            <h1
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: !isPublicView ? '#ffffff' : '#000000',
                textShadow: !isPublicView
                  ? '0 1px 3px rgba(0,0,0,0.6)'
                  : 'none',
              }}
            >
              <span
                className="icon-wrapper"
                style={{
                  background: IAR_MOU_COLOR,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  color: 'white',
                }}
              >
                🤝
              </span>
              {isPublicView
                ? 'Academic Collaborations'
                : 'International & Alumni Relations MoUs'
              }

            </h1>
          </div>

          {!isReadOnlyView && isAdmin && (
            <div className="section-header-actions">
              <button
                className="page-upload-btn"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <span>📤</span> Upload MoUs
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message" style={{ margin: '20px 0', padding: '15px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>{error}</div>}

        {!error && (
          <>
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                background: `linear-gradient(135deg, ${IAR_MOU_COLOR} 0%, #0d9488 100%)`,
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 8px 16px rgba(20, 184, 166, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                maxWidth: '400px'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  right: '-15px',
                  width: '70px',
                  height: '70px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>🤝</span>
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Total Academic MoUs</span>
                  </div>
                  <div style={{ fontSize: '34px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                    {totalMous}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', background: '#bef264', borderRadius: '50%' }} />
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Active & Recorded Collaborations</span>
                  </div>
                </div>
              </div>
            </div>
            <section className="chart-section" style={{
              marginBottom: '30px', padding: '20px',
              backgroundColor: '#fff', borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
                <ExportMenu
                  elementId={viewType === 'trend' ? "iar-mou-trend-container" : "iar-mou-directory-table"}
                  data={viewType === 'trend' ? mouTrendChartData : mouList}
                  headers={viewType === 'trend' ? ['Year', 'MoUs Signed'] : ['Partner', 'Framework', 'Country', 'Collaboration Nature', 'Signed', 'Valid Till']}
                  keys={viewType === 'trend' ? ['year', 'total'] : ['partner_name', 'framework', 'country', 'collaboration_nature', 'date_signed', 'validity_end']}
                  filename={viewType === 'trend' ? "iar_mou_trend" : "iar_mou_directory"}
                  title={viewType === 'trend' ? "IAR MoUs Trend" : "IAR MoUs Directory"}
                //exportType={viewType === 'trend' ? "chart" : "table"}
                />
              </div>
              {/* Filters Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Clear Filters
                </button>
              </div>

              {/* 🔥 View Toggle Buttons (NOW INSIDE FILTER) */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setViewType('trend')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: viewType === 'trend' ? `1px solid ${IAR_MOU_COLOR}` : '1px solid #e2e8f0',
                    backgroundColor: viewType === 'trend' ? '#ccfbf1' : '#fff',
                    color: viewType === 'trend' ? '#0f766e' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  📈 Trend Overview
                </button>
                {(typeof user === 'undefined' || user?.role_id !== 0) && (
                  <button
                    onClick={() => setViewType('directory')}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: viewType === 'directory' ? '1px solid #0ea5e9' : '1px solid #e2e8f0',
                      backgroundColor: viewType === 'directory' ? '#e0f2fe' : '#fff',
                      color: viewType === 'directory' ? '#0369a1' : '#333',
                      cursor: 'pointer'
                    }}
                  >
                    📋 MoUs Directory
                  </button>
                )}
              </div>

              {/* Trend View */}
              {viewType === 'trend' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {['bar', 'trend'].map((mode) => (
                      <button key={mode} onClick={() => setChartMode(mode)} style={{
                        padding: '6px 16px', fontSize: '13px', fontWeight: 600,
                        borderRadius: '6px', cursor: 'pointer', border: 'none',
                        backgroundColor: chartMode === mode ? IAR_MOU_COLOR : '#f1f5f9',
                        color: chartMode === mode ? '#fff' : '#555'
                      }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                    ))}
                  </div>
                  <div id="iar-mou-trend-container" className={`chart-container ${!mouTrendChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative', padding: '10px' }}>
                    <div className={`section-empty-state ${mouTrendChartData.length ? 'hidden' : ''}`}>
                      <p>No information available for the selected filter</p>
                    </div>
                    <ResponsiveContainer width="100%" height={350} minWidth={0}>
                      {chartMode === 'bar' ? (
                        <BarChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                          <Bar dataKey="total" name="MoUs Signed" fill={IAR_MOU_COLOR} radius={[4, 4, 0, 0]} barSize={28}>
                            <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: IAR_MOU_COLOR }} />
                          </Bar>
                        </BarChart>
                      ) : (
                        <LineChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                          <Line type="linear" dataKey="total" name="MoUs Signed"
                            stroke={IAR_MOU_COLOR} strokeWidth={3}
                            dot={{ r: 6, fill: IAR_MOU_COLOR }} activeDot={{ r: 8 }}>
                            <LabelList offset={15} dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: IAR_MOU_COLOR }} />
                          </Line>
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* Directory View */}
              {viewType === 'directory' && (
                <>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{mouList.length} records found</p>
                  <div id="iar-mou-directory-table" className="table-responsive" style={{ maxHeight: '350px', height: '350px', overflowY: 'auto' }}>
                    <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
                      <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#0ea5e9', color: 'white' }}>
                          <tr>
                            <th style={{ padding: '10px' }}>Sl. No.</th>
                            <th style={{ padding: '10px' }}>Partner</th>
                            <th style={{ padding: '10px' }}>Framework</th>
                            <th style={{ padding: '10px' }}>Country</th>
                            <th style={{ padding: '10px' }}>Collaboration Nature</th>
                            <th style={{ padding: '10px' }}>Signed</th>
                            <th style={{ padding: '10px' }}>Valid Till</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMouList.map((m, i) => (
                            <tr key={m.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                              <td style={{ padding: '8px', fontWeight: 600 }}>{i + 1}</td> {/* ✅ Sl. No. */}
                              <td style={{ padding: '8px' }}>{m.partner_name}</td>
                              <td style={{ padding: '8px' }}>{m.framework}</td>
                              <td style={{ padding: '8px' }}>{m.country}</td>
                              <td style={{ padding: '8px' }}>{m.collaboration_nature}</td>
                              <td style={{ padding: '8px' }}>{formatDate(m.date_signed)}</td>
                              <td style={{ padding: '8px' }}>{formatDate(m.validity_end)}</td>
                            </tr>
                          ))}
                          {!mouList.length && (
                            <tr>
                              <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#6c757d', fontWeight: 500 }}>
                                No information available for the selected filter
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}</>
                  </div>
                </>
              )}

            </section>
          </>
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="iar_mous"
        token={token}
      />
    </div>
  );
}

export default EducationIarSection;
