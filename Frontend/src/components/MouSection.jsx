import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

import {
  fetchResearchFilterOptions,
  fetchMouTrend,
  fetchMouList,
} from '../services/researchStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';

import DataUploadModal from './DataUploadModal';

import './Page.css';
import './AcademicSection.css';
import './GrievanceSection.css';
import './ResearchSection.css';

const MOU_COLOR = '#a855f7';

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

function MouSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [filterOptions, setFilterOptions] = useState({ mou_years: [] });

  const [filters, setFilters] = useState({ mou_year: 'All' });

  const [totalMous, setTotalMous] = useState(0);
  const [mouTrend, setMouTrend] = useState([]);
  const [mouList, setMouList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [viewType, setViewType] = useState('trend'); // 'trend' | 'directory'
  const [chartMode, setChartMode] = useState('bar'); // 'bar' | 'trend'

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!token) return;
      try {
        const options = await fetchResearchFilterOptions(token);
        setFilterOptions({
          mou_years: Array.isArray(options?.mou_years)
            ? [...options.mou_years].sort((a, b) => b - a)
            : [],
        });
      } catch (err) {
        console.error('Failed to load MoU filter options:', err);
      }
    };
    loadFilterOptions();
  }, [token, uploadVersion]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const [trendResp, listResp] = await Promise.all([
          fetchMouTrend(token),
          fetchMouList({ mou_year: filters.mou_year }, token),
        ]);
        const trend = trendResp?.data || [];
        setMouTrend(trend);
        setMouList(listResp?.data || []);
        setTotalMous(trend.reduce((sum, row) => sum + (Number(row.total) || 0), 0));
      } catch (err) {
        console.error('Failed to load MoU data:', err);
        setError(err.message || 'Failed to load MoU data.');
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

  const handleFilterChange = (field, value) =>
    setFilters((prev) => ({ ...prev, [field]: value }));

  const handleClearFilters = () => setFilters({ mou_year: 'All' });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc',
          borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isPublicView && (
          <>
            <button className="page-back-btn" onClick={() => navigate('/research')}>
              ← Back to Research
            </button>
            <div className="page-header-row">
              <div className="page-header-left">
                <h1>Research · MoU (Memorandum of Understanding)</h1>
              </div>
              {user && user.role_id === 3 && (
                <div className="page-header-actions">
                  <button
                    className="page-upload-btn"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    <span>📤</span> Upload MoUs
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="error-message" style={{
            padding: '10px', backgroundColor: '#f8d7da', color: '#721c24',
            borderRadius: '4px', marginBottom: '20px'
          }}>{error}</div>
        )}

        {/* Summary Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '30px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            borderRadius: '14px', padding: '16px',
            boxShadow: '0 8px 16px rgba(168, 85, 247, 0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: '-15px', right: '-15px',
              width: '70px', height: '70px',
              background: 'rgba(255,255,255,0.1)', borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>🤝</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Total MoUs</span>
              </div>
              <div style={{ fontSize: '34px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {totalMous}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Signed collaborations</span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: '14px', padding: '16px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: '-15px', right: '-15px',
              width: '70px', height: '70px',
              background: 'rgba(255,255,255,0.1)', borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>📋</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Directory</span>
              </div>
              <div style={{ fontSize: '34px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {mouList.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>
                  {filters.mou_year !== 'All' ? `Year ${filters.mou_year}` : 'All years'}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
            borderRadius: '14px', padding: '16px',
            boxShadow: '0 8px 16px rgba(20, 184, 166, 0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: '-15px', right: '-15px',
              width: '70px', height: '70px',
              background: 'rgba(255,255,255,0.1)', borderRadius: '50%'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', padding: '5px', borderRadius: '6px' }}>📅</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '21px', fontWeight: '500' }}>Years Tracked</span>
              </div>
              <div style={{ fontSize: '34px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                {mouTrendChartData.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '5px', height: '5px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>Academic years with data</span>
              </div>
            </div>
          </div>
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '20px',
          marginBottom: '30px', padding: '20px', borderRadius: '12px'
        }}>
          <button
            onClick={() => setViewType('trend')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'trend' ? MOU_COLOR : 'transparent',
              color: viewType === 'trend' ? 'white' : '#333',
              border: viewType === 'trend' ? `2px solid ${MOU_COLOR}` : '2px solid #dee2e6',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              fontWeight: viewType === 'trend' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📈 MoUs Trend
          </button>
          <button
            onClick={() => setViewType('directory')}
            style={{
              padding: '12px 24px',
              backgroundColor: viewType === 'directory' ? '#ec4899' : 'transparent',
              color: viewType === 'directory' ? 'white' : '#333',
              border: viewType === 'directory' ? '2px solid #ec4899' : '2px solid #dee2e6',
              borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
              fontWeight: viewType === 'directory' ? 'bold' : 'normal',
              transition: 'all 0.3s ease'
            }}
          >
            📋 MoUs Directory
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading MoU data…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* MoUs Trend */}
            {viewType === 'trend' && (
              <section className="chart-section" style={{
                marginBottom: '30px', padding: '20px',
                backgroundColor: '#fff', borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div className="chart-header" style={{ marginBottom: '20px' }}>
                  <h2 style={{ margin: '0 0 10px 0', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🤝</span> MoUs Trend
                  </h2>
                  <p className="chart-description" style={{ color: '#666', margin: '0' }}>
                    Yearly trend of Memoranda of Understanding signed.
                  </p>
                </div>

                {/* Filters */}
                <div style={{
                  marginBottom: '20px', padding: '15px',
                  backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                    <button onClick={handleClearFilters} style={{
                      padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                    }}>Clear Filters</button>
                  </div>
                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>MoU Year</label>
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
                  <div style={{
                    marginTop: '12px', padding: '8px',
                    backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '12px'
                  }}>
                    <strong>Active Filters:</strong>{' '}
                    {filters.mou_year !== 'All'
                      ? <span>📅 {filters.mou_year}</span>
                      : <span>No filters applied</span>
                    }
                  </div>
                </div>

                {/* Bar / Trend toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {['bar', 'trend'].map((mode) => (
                    <button key={mode} onClick={() => setChartMode(mode)} style={{
                      padding: '6px 16px', fontSize: '13px', fontWeight: 600,
                      borderRadius: '6px', cursor: 'pointer', border: 'none',
                      backgroundColor: chartMode === mode ? MOU_COLOR : '#f1f5f9',
                      color: chartMode === mode ? '#fff' : '#555'
                    }}>{mode === 'bar' ? 'Bar' : 'Trend'}</button>
                  ))}
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={350}>
                    {chartMode === 'bar' ? (
                      <BarChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                        <Bar dataKey="total" name="MoUs Signed" fill={MOU_COLOR} radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    ) : (
                      <LineChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="total" name="MoUs Signed"
                          stroke={MOU_COLOR} strokeWidth={3}
                          dot={{ r: 6, fill: MOU_COLOR }} activeDot={{ r: 8 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* MoUs Directory */}
            {viewType === 'directory' && (
              <section className="chart-section" style={{
                marginBottom: '30px', padding: '20px',
                backgroundColor: '#fff', borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div className="chart-header" style={{ marginBottom: '15px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🤝</span> MoUs Directory
                  </h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: '5px 0 0 0' }}>
                    {mouList.length} MoUs found
                  </p>
                </div>

                {/* Filters */}
                <div style={{
                  marginBottom: '20px', padding: '15px',
                  backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
                    <button onClick={handleClearFilters} style={{
                      padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
                    }}>Clear Filters</button>
                  </div>
                  <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="filter-group">
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>MoU Year</label>
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
                  <div style={{
                    marginTop: '12px', padding: '8px',
                    backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '12px'
                  }}>
                    <strong>Active Filters:</strong>{' '}
                    {filters.mou_year !== 'All'
                      ? <span>📅 {filters.mou_year}</span>
                      : <span>No filters applied</span>
                    }
                  </div>
                </div>

                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#a855f7', color: 'white' }}>
                      <tr>
                        <th style={{ padding: '10px' }}>Partner</th>
                        <th style={{ padding: '10px' }}>Focus</th>
                        <th style={{ padding: '10px' }}>Signed</th>
                        <th style={{ padding: '10px' }}>Valid Till</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mouList.map((m, i) => (
                        <tr key={m.mou_id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          <td style={{ padding: '8px' }}>{m.partner_name}</td>
                          <td style={{ padding: '8px' }}>{m.collaboration_nature}</td>
                          <td style={{ padding: '8px' }}>{formatDate(m.date_signed)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(m.validity_end)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="research_mous"
        token={token}
      />
    </div>
  );
}

export default MouSection;
