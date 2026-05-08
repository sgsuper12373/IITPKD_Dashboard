import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, LabelList
} from 'recharts';
import {
  fetchResearchFilterOptions,
  fetchMouTrend,
  fetchMouList,
} from '../services/researchStats';
import {
  fetchIarMouFilterOptions,
  fetchIarMouTrend,
  fetchIarMouList,
} from '../services/iarStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import ExportMenu from './ExportMenu';
import CustomTooltip from './CustomTooltip';
import DataUploadModal from './LazyDataUploadModal';
import './Page.css';
import './AcademicSection.css';
import './ResearchSection.css';

const ICSR_COLOR = '#a855f7';
const IAR_COLOR = '#14b8a6';

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

function MoUCollaborations({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const uploadVersion = useUploadRefresh();
  const token = localStorage.getItem('authToken');

  const isAdmin = user?.role_id === 3 || user?.role_id === 4;
  const isReadOnlyView = isPublicView || !user;

  const [activeTab, setActiveTab] = useState('industry');

  // ── Industry (ICSR) state ──
  const [icsrFilterOpts, setIcsrFilterOpts] = useState({ mou_years: [] });
  const [icsrFilters, setIcsrFilters] = useState({ mou_year: 'All' });
  const [icsrTotalMous, setIcsrTotalMous] = useState(0);
  const [icsrTrend, setIcsrTrend] = useState([]);
  const [icsrList, setIcsrList] = useState([]);
  const [icsrViewType, setIcsrViewType] = useState('trend');
  const [icsrChartMode, setIcsrChartMode] = useState('bar');
  const [icsrUploadOpen, setIcsrUploadOpen] = useState(false);

  // ── Education (IAR) state ──
  const [iarFilterOpts, setIarFilterOpts] = useState({ mou_years: [] });
  const [iarFilters, setIarFilters] = useState({ mou_year: 'All' });
  const [iarTotalMous, setIarTotalMous] = useState(0);
  const [iarTrend, setIarTrend] = useState([]);
  const [iarList, setIarList] = useState([]);
  const [iarViewType, setIarViewType] = useState('trend');
  const [iarChartMode, setIarChartMode] = useState('bar');
  const [iarUploadOpen, setIarUploadOpen] = useState(false);

  // Load ICSR filter options (cross-filtered by active mou_year)
  useEffect(() => {
    const load = async () => {
      try {
        const opts = await fetchResearchFilterOptions({ mou_year: icsrFilters.mou_year }, token);
        setIcsrFilterOpts({
          mou_years: opts?.mou_years ? [...opts.mou_years].sort((a, b) => b - a) : [],
        });
      } catch (e) {
        console.error('Failed to load ICSR filter options:', e);
      }
    };
    load();
  }, [icsrFilters.mou_year, token, uploadVersion]);

  // Load ICSR MoU data
  useEffect(() => {
    const load = async () => {
      try {
        const [trendResp, listResp] = await Promise.all([
          fetchMouTrend({ mou_year: icsrFilters.mou_year }, token),
          fetchMouList({ mou_year: icsrFilters.mou_year }, token),
        ]);
        const trend = trendResp?.data || [];
        setIcsrTrend(trend);
        setIcsrList(listResp?.data || []);
        setIcsrTotalMous(trend.reduce((sum, r) => sum + (Number(r.total) || 0), 0));
      } catch (e) {
        console.error('Failed to load ICSR MoU data:', e);
      }
    };
    load();
  }, [icsrFilters, token, uploadVersion]);

  // Load IAR filter options (cross-filtered by active mou_year)
  useEffect(() => {
    const load = async () => {
      try {
        const opts = await fetchIarMouFilterOptions({ mou_year: iarFilters.mou_year }, token);
        setIarFilterOpts({ mou_years: opts?.mou_years || [] });
      } catch (e) {
        console.error('Failed to load IAR filter options:', e);
      }
    };
    load();
  }, [iarFilters.mou_year, token, uploadVersion]);

  // Load IAR MoU data
  useEffect(() => {
    const load = async () => {
      try {
        const [trendResp, listResp] = await Promise.all([
          fetchIarMouTrend({ mou_year: iarFilters.mou_year }, token),
          fetchIarMouList({ mou_year: iarFilters.mou_year }, token),
        ]);
        const trend = trendResp?.data || [];
        setIarTrend(trend);
        setIarList(listResp?.data || []);
        setIarTotalMous(trend.reduce((sum, r) => sum + (Number(r.total) || 0), 0));
      } catch (e) {
        console.error('Failed to load IAR MoU data:', e);
      }
    };
    load();
  }, [iarFilters, token, uploadVersion]);

  const icsrChartData = useMemo(() =>
    icsrTrend.map((r) => ({ year: r.year, total: Number(r.total) || 0 })),
    [icsrTrend]
  );
  const iarChartData = useMemo(() =>
    iarTrend.map((r) => ({ year: r.year, total: Number(r.total) || 0 })),
    [iarTrend]
  );

  const sortedIarList = useMemo(() =>
    [...iarList].sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || '')),
    [iarList]
  );

  const renderMouChartSection = ({
    color, viewType, setViewType, chartMode, setChartMode,
    chartData, list, trendId, directoryId, filenamePrefix,
    filterOpts, filters, onFilterChange, onClearFilters,
    showIarColumns = false
  }) => (
    <section style={{
      backgroundColor: '#fff', borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden'
    }}>
      {/* Filter bar */}
      <div style={{ padding: '16px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, color: '#333', fontSize: '14px' }}>Filters</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setViewType('trend')}
                style={{
                  padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                  border: viewType === 'trend' ? `2px solid ${color}` : '1px solid #e2e8f0',
                  backgroundColor: viewType === 'trend' ? (color === ICSR_COLOR ? '#faf5ff' : '#ccfbf1') : '#fff',
                  color: viewType === 'trend' ? (color === ICSR_COLOR ? '#6b21a8' : '#0f766e') : '#333',
                  cursor: 'pointer', fontWeight: 600
                }}
              >
                📈 MoUs Trend
              </button>
              <button
                onClick={() => setViewType('directory')}
                style={{
                  padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
                  border: viewType === 'directory' ? '2px solid #0ea5e9' : '1px solid #e2e8f0',
                  backgroundColor: viewType === 'directory' ? '#e0f2fe' : '#fff',
                  color: viewType === 'directory' ? '#0369a1' : '#333',
                  cursor: 'pointer', fontWeight: 600
                }}
              >
                📋 MoUs Directory
              </button>
            </div>
          </div>
          <button
            onClick={onClearFilters}
            style={{
              padding: '6px 12px', backgroundColor: '#dc3545', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
            }}
          >
            Clear Filters
          </button>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '200px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: '#555' }}>MoU Year</label>
          <select
            value={filters.mou_year}
            onChange={(e) => onFilterChange('mou_year', e.target.value)}
            style={{ padding: '8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
          >
            <option value="All">All Years</option>
            {filterOpts.mou_years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333' }}>
            <span>{viewType === 'trend' ? '🤝' : '📋'}</span>
            {viewType === 'trend' ? 'MoUs Trend' : 'MoUs Directory'}
          </h2>
          <ExportMenu
            elementId={viewType === 'trend' ? trendId : directoryId}
            data={viewType === 'trend' ? chartData : list}
            headers={viewType === 'trend'
              ? ['Year', 'MoUs Signed']
              : showIarColumns
                ? ['Sl. No.', 'Partner', 'Framework', 'Country', 'Collaboration Nature', 'Signed', 'Valid Till']
                : ['Partner', 'Focus', 'Signed', 'Valid Till']
            }
            keys={viewType === 'trend'
              ? ['year', 'total']
              : showIarColumns
                ? ['partner_name', 'framework', 'country', 'collaboration_nature', 'date_signed', 'validity_end']
                : ['partner_name', 'collaboration_nature', 'date_signed', 'validity_end']
            }
            filename={`${filenamePrefix}_${viewType}`}
            title={viewType === 'trend' ? 'MoUs Trend' : 'MoUs Directory'}
            exportType={viewType === 'trend' ? 'chart' : 'table'}
          />
        </div>

        {viewType === 'trend' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['bar', 'trend'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  style={{
                    padding: '6px 16px', fontSize: '13px', fontWeight: 600,
                    borderRadius: '6px', cursor: 'pointer', border: 'none',
                    backgroundColor: chartMode === mode ? color : '#f1f5f9',
                    color: chartMode === mode ? '#fff' : '#555'
                  }}
                >
                  {mode === 'bar' ? 'Bar' : 'Trend'}
                </button>
              ))}
            </div>
            <div
              id={trendId}
              className={`chart-container ${!chartData.length ? 'chart-has-empty' : ''}`}
              style={{ position: 'relative', padding: '10px' }}
            >
              <div className={`section-empty-state ${chartData.length ? 'hidden' : ''}`}>
                <p>No information available for the selected filter</p>
              </div>
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<ResponsiveContainer width="100%" height={400}>
                {chartMode === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (m) => Math.ceil(m * 1.2)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                    <Bar dataKey="total" name="MoUs Signed" fill={color} radius={[4, 4, 0, 0]} barSize={28}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 30, right: 20, left: 40, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (m) => Math.ceil(m * 1.2)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                    <Line type="linear" dataKey="total" name="MoUs Signed"
                      stroke={color} strokeWidth={3}
                      dot={{ r: 6, fill: color }} activeDot={{ r: 8 }}>
                      <LabelList dataKey="total" offset={10} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
                    </Line>
                  </LineChart>
                )}
              </ResponsiveContainer>
)}</>
            </div>
          </>
        )}

        {viewType === 'directory' && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{list.length} records found</p>
            <div
              id={directoryId}
              className="table-responsive"
              style={{ maxHeight: '450px', overflowY: 'auto' }}
            >
              <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: color, color: 'white' }}>
                  <tr>
                    {showIarColumns ? (
                      <>
                        <th style={{ padding: '10px' }}>Sl. No.</th>
                        <th style={{ padding: '10px' }}>Partner</th>
                        <th style={{ padding: '10px' }}>Framework</th>
                        <th style={{ padding: '10px' }}>Country</th>
                        <th style={{ padding: '10px' }}>Collaboration Nature</th>
                        <th style={{ padding: '10px' }}>Signed</th>
                        <th style={{ padding: '10px' }}>Valid Till</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '10px' }}>Partner</th>
                        <th style={{ padding: '10px' }}>Focus</th>
                        <th style={{ padding: '10px' }}>Signed</th>
                        <th style={{ padding: '10px' }}>Valid Till</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {list.map((m, i) => (
                    <tr key={m.mou_id ?? m.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                      {showIarColumns ? (
                        <>
                          <td style={{ padding: '8px', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ padding: '8px' }}>{m.partner_name}</td>
                          <td style={{ padding: '8px' }}>{m.framework}</td>
                          <td style={{ padding: '8px' }}>{m.country}</td>
                          <td style={{ padding: '8px' }}>{m.collaboration_nature}</td>
                          <td style={{ padding: '8px' }}>{formatDate(m.date_signed)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(m.validity_end)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px' }}>{m.partner_name}</td>
                          <td style={{ padding: '8px' }}>{m.collaboration_nature}</td>
                          <td style={{ padding: '8px' }}>{formatDate(m.date_signed)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(m.validity_end)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={showIarColumns ? 7 : 4} style={{ padding: '32px', textAlign: 'center', color: '#6c757d', fontWeight: 500 }}>
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
      </div>
    </section>
  );

  return (
    <div className={isPublicView ? '' : 'page-container'}>
      <div className={isPublicView ? '' : 'page-content'}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>MoU Collaborations</h1>
            </div>
            {isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => activeTab === 'industry' ? setIcsrUploadOpen(true) : setIarUploadOpen(true)}
                >
                  <span>📤</span> Upload MoUs
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${ICSR_COLOR} 0%, #9333ea 100%)`,
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(168,85,247,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🏭</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Industry MoUs</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{icsrTotalMous}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Industry collaborations</span>
              </div>
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${IAR_COLOR} 0%, #0d9488 100%)`,
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(20,184,166,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🎓</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Education MoUs</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{iarTotalMous}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Academic collaborations</span>
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '20px', padding: '24px',
            boxShadow: '0 10px 25px rgba(59,130,246,0.2)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '22px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px' }}>🤝</span>
                <h3 style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '500' }}>Total MoUs</h3>
              </div>
              <div className="metric-value" style={{ color: 'white' }}>{icsrTotalMous + iarTotalMous}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Combined partnerships</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Tabs */}
        <div style={{
          display: 'flex', gap: '0', marginBottom: '24px',
          background: '#f1f5f9', borderRadius: '10px', padding: '4px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => setActiveTab('industry')}
            style={{
              padding: '10px 24px', fontSize: '14px', fontWeight: 600,
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === 'industry' ? '#fff' : 'transparent',
              color: activeTab === 'industry' ? ICSR_COLOR : '#64748b',
              boxShadow: activeTab === 'industry' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🏭 Research Collaborations
          </button>
          <button
            onClick={() => setActiveTab('education')}
            style={{
              padding: '10px 24px', fontSize: '14px', fontWeight: 600,
              borderRadius: '8px', border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === 'education' ? '#fff' : 'transparent',
              color: activeTab === 'education' ? IAR_COLOR : '#64748b',
              boxShadow: activeTab === 'education' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🎓 Academic Collaborations
          </button>
        </div>

        {/* Industry Collaborations */}
        {activeTab === 'industry' && renderMouChartSection({
          color: ICSR_COLOR,
          viewType: icsrViewType, setViewType: setIcsrViewType,
          chartMode: icsrChartMode, setChartMode: setIcsrChartMode,
          chartData: icsrChartData, list: icsrList,
          trendId: 'icsr-mou-trend-chart', directoryId: 'icsr-mou-directory-table',
          filenamePrefix: 'industry_mous',
          filterOpts: icsrFilterOpts, filters: icsrFilters,
          onFilterChange: (field, val) => setIcsrFilters((p) => ({ ...p, [field]: val })),
          onClearFilters: () => setIcsrFilters({ mou_year: 'All' }),
          showIarColumns: false
        })}

        {/* Education Collaborations */}
        {activeTab === 'education' && renderMouChartSection({
          color: IAR_COLOR,
          viewType: iarViewType, setViewType: setIarViewType,
          chartMode: iarChartMode, setChartMode: setIarChartMode,
          chartData: iarChartData, list: sortedIarList,
          trendId: 'iar-mou-trend-chart', directoryId: 'iar-mou-directory-table',
          filenamePrefix: 'education_mous',
          filterOpts: iarFilterOpts, filters: iarFilters,
          onFilterChange: (field, val) => setIarFilters((p) => ({ ...p, [field]: val })),
          onClearFilters: () => setIarFilters({ mou_year: 'All' }),
          showIarColumns: true
        })}

        <DataUploadModal
          isOpen={icsrUploadOpen}
          onClose={() => setIcsrUploadOpen(false)}
          tableName="research_mous"
          token={token}
        />
        <DataUploadModal
          isOpen={iarUploadOpen}
          onClose={() => setIarUploadOpen(false)}
          tableName="iar_mous"
          token={token}
        />
      </div>
    </div>
  );
}

export default MoUCollaborations;
