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
  Bar,
} from 'recharts';

import {
  fetchIarMouFilterOptions,
  fetchIarMouTrend,
  fetchIarMouList,
} from '../services/iarStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import DataUploadModal from './DataUploadModal';

import './Page.css';
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

  const [filterOptions, setFilterOptions] = useState({
    mou_years: []
  });

  const [filters, setFilters] = useState({ mou_year: 'All' });
  const [totalMous, setTotalMous] = useState(0);
  const [mouTrend, setMouTrend] = useState([]);
  const [mouList, setMouList] = useState([]);
  
  const [viewType, setViewType] = useState('trend'); // 'trend' | 'directory'
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'trend'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const loadOptions = async () => {
      if (!token) return;
      try {
        const opts = await fetchIarMouFilterOptions(token);
        setFilterOptions({
          mou_years: opts?.mou_years || []
        });
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadOptions();
  }, [token, uploadVersion]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
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

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const handleClearFilters = () => setFilters({ mou_year: 'All' });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`academic-section page-container ${isPublicView ? 'public-view' : ''}`}>
      <div className="page-content performance-render-auto">
        {!isPublicView && (
          <button className="page-back-btn" onClick={() => navigate('/education')} style={{ marginBottom: '20px' }}>
            ← Back to Education
          </button>
        )}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <div className="page-header-title">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="icon-wrapper" style={{ background: IAR_MOU_COLOR, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', color: 'white' }}>🤝</span>
              International & Alumni Relations MoUs
            </h1>
            <p className="page-subtitle">Track and manage collaborative IAR MoUs</p>
          </div>
          
          {!isPublicView && (
            <div className="page-actions-group">
              {user && user.role_id === 3 && (
                <div className="page-header-actions">
                  <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                    <span>📤</span> Upload MoUs
                  </button>
                </div>
              )}
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
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Total IAR MoUs</span>
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

            <div style={{
              display: 'flex',
              gap: '10px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              border: '1px solid #e9ecef',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '30px'
            }}>
              <button
                onClick={() => setViewType('trend')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: viewType === 'trend' ? IAR_MOU_COLOR : 'transparent',
                  color: viewType === 'trend' ? 'white' : '#333',
                  border: viewType === 'trend' ? `2px solid ${IAR_MOU_COLOR}` : '2px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: viewType === 'trend' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
              >
                📈 Trend Overview
              </button>
              <button
                onClick={() => setViewType('directory')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: viewType === 'directory' ? '#0ea5e9' : 'transparent',
                  color: viewType === 'directory' ? 'white' : '#333',
                  border: viewType === 'directory' ? '2px solid #0ea5e9' : '2px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: viewType === 'directory' ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
              >
                📋 MoUs Directory
              </button>
            </div>

            <section className="chart-section" style={{
              marginBottom: '30px', padding: '20px',
              backgroundColor: '#fff', borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              
              {/* Filters Block */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                  <button onClick={handleClearFilters} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Clear Filters</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>Signed Year</label>
                    <select value={filters.mou_year}
                      onChange={(e) => handleFilterChange('mou_year', e.target.value)}
                      style={{ padding: '6px', fontSize: '13px', width: '100%' }}>
                      <option value="All">All Years</option>
                      {filterOptions.mou_years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '12px' }}>
                  <strong>Active Filters:</strong>{' '}
                  {filters.mou_year !== 'All' ? <span>📅 {filters.mou_year}</span> : <span>No filters applied</span>}
                </div>
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
                  <div className={`chart-container ${!mouTrendChartData.length ? 'chart-has-empty' : ''}`} style={{ position: 'relative' }}>
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
                          <Bar dataKey="total" name="MoUs Signed" fill={IAR_MOU_COLOR} radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                      ) : (
                        <LineChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="total" name="MoUs Signed"
                            stroke={IAR_MOU_COLOR} strokeWidth={3}
                            dot={{ r: 6, fill: IAR_MOU_COLOR }} activeDot={{ r: 8 }} />
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
                  <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#0ea5e9', color: 'white' }}>
                        <tr>
                          <th style={{ padding: '10px' }}>Partner</th>
                          <th style={{ padding: '10px' }}>Framework</th>
                          <th style={{ padding: '10px' }}>Country</th>
                          <th style={{ padding: '10px' }}>Collaboration Nature</th>
                          <th style={{ padding: '10px' }}>Signed</th>
                          <th style={{ padding: '10px' }}>Valid Till</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mouList.map((m, i) => (
                          <tr key={m.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
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
