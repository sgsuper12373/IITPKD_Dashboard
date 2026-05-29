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
import ChartExpandModal from './ChartExpandModal';
import MouPartnerLogos from './MouPartnerLogos';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

import './Page.css';
import './AcademicSection.css';
import './ResearchSection.css';
import './MoUCollaborations.css';

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
  const isRestricted = typeof user === 'undefined' || user?.role_id === 0;
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

  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

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

  const icsrChartData = useMemo(() => {
    const data = icsrTrend.map((r) => ({ year: r.year, total: Number(r.total) || 0 }));
    return chartIsMobile && data.length > 3 ? data.slice(-3) : data;
  }, [icsrTrend, chartIsMobile]);

  const iarChartData = useMemo(() => {
    const data = iarTrend.map((r) => ({ year: r.year, total: Number(r.total) || 0 }));
    return chartIsMobile && data.length > 3 ? data.slice(-3) : data;
  }, [iarTrend, chartIsMobile]);

  const sortedIcsrList = useMemo(() =>
    [...icsrList].sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || '')),
    [icsrList]
  );

  const sortedIarList = useMemo(() =>
    [...iarList].sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || '')),
    [iarList]
  );

  const renderMouChartSection = ({
    color, viewType, setViewType, chartMode, setChartMode,
    chartData, list, trendId, directoryId, filenamePrefix,
    filterOpts, filters, onFilterChange, onClearFilters,
    showIarColumns = false, chartIsMobile, setExpandedChart
  }) => (
    <section className="mou-section-panel">
      {/* Filter bar */}
      <div className="mou-filter-bar">
        <div className="mou-filter-bar-row">
          <div className="mou-filter-left">
            <h4 className="mou-filter-h4">Filters</h4>
            <div className="mou-view-btns-row">
              <button
                onClick={() => setViewType('trend')}
                className="mou-view-btn"
                style={{
                  border: viewType === 'trend' ? `2px solid ${color}` : '1px solid #e2e8f0',
                  backgroundColor: viewType === 'trend' ? (color === ICSR_COLOR ? '#faf5ff' : '#ccfbf1') : '#fff',
                  color: viewType === 'trend' ? (color === ICSR_COLOR ? '#6b21a8' : '#0f766e') : '#333',
                }}
              >
                &#128200; MoUs Trend
              </button>
              {!isRestricted && (
                <button
                  onClick={() => setViewType('directory')}
                  className={`mou-view-btn${viewType === 'directory' ? ' mou-view-btn--directory-active' : ''}`}
                >
                  &#128203; MoUs Directory
                </button>
              )}
            </div>
          </div>
          <button className="mou-clear-btn" onClick={onClearFilters}>
            Clear Filters
          </button>
        </div>
        <div className="mou-year-filter">
          <label className="mou-year-label">MoU Year</label>
          <select
            className="mou-year-select"
            value={filters.mou_year}
            onChange={(e) => onFilterChange('mou_year', e.target.value)}
          >
            <option value="All">All Years</option>
            {filterOpts.mou_years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="mou-body">
        <div className="mou-body-header-row">
          <h2 className="mou-body-h2">
            <span>{viewType === 'trend' ? '&#129309;' : '&#128203;'}</span>
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
            <div className="mou-mode-btns-row">
              {['bar', 'trend'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className="mou-mode-btn"
                  style={{
                    backgroundColor: chartMode === mode ? color : '#f1f5f9',
                    color: chartMode === mode ? '#fff' : '#555',
                  }}
                >
                  {mode === 'bar' ? 'Bar' : 'Trend'}
                </button>
              ))}
            </div>
            <div
              id={trendId}
              className={`chart-container clickable-chart mou-chart-container ${!chartData.length ? 'chart-has-empty' : ''}`}
              onClick={() => setExpandedChart({
                title: filenamePrefix.includes('industry') ? 'Industry MoUs Trend' : 'Education MoUs Trend',
                content: (
                  <ResponsiveContainer width="100%" height={500}>
                    {chartMode === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={60} />
                        <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                        <Bar dataKey="total" name="MoUs Signed" fill={color} radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="total" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: color }} />
                        </Bar>
                      </BarChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 40, right: 30, left: 40, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="year" stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} interval={0} angle={-45} textAnchor="end" height={60} />
                        <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 13, fontWeight: 600 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                        <Line type="linear" dataKey="total" name="MoUs Signed" stroke={color} strokeWidth={3} dot={{ r: 6, fill: color }} activeDot={{ r: 8 }}>
                          <LabelList dataKey="total" position="top" style={{ fontSize: '11px', fontWeight: 700, fill: color }} />
                        </Line>
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )
              })}
            >
              <div className={`section-empty-state ${chartData.length ? 'hidden' : ''}`}>
                <p>No information available for the selected filter</p>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                {chartMode === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: chartIsMobile ? 20 : 40, bottom: chartIsMobile ? 50 : 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (m) => Math.ceil(m * 1.2)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} iconType="rect" />
                    <Bar dataKey="total" name="MoUs Signed" fill={color} radius={[4, 4, 0, 0]} barSize={28}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: chartIsMobile ? 20 : 40, bottom: chartIsMobile ? 50 : 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 11 }} interval={0} angle={chartIsMobile ? -45 : 0} textAnchor={chartIsMobile ? "end" : "middle"} height={chartIsMobile ? 50 : 30} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} domain={[0, (m) => Math.ceil(m * 1.2)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
                    <Line type="linear" dataKey="total" name="MoUs Signed"
                      stroke={color} strokeWidth={3}
                      dot={{ r: 5, fill: color, strokeWidth: 0 }} activeDot={{ r: 7 }}>
                      <LabelList dataKey="total" offset={10} position="top" style={{ fontSize: '10px', fontWeight: 600, fill: color }} />
                    </Line>
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}

        {viewType === 'directory' && (
          <>
            <p className="mou-records-count">{list.length} records found</p>
            {chartIsMobile ? (
              <div className="mou-mobile-list">
                {list.length === 0 ? (
                  <div className="mou-mobile-empty">No records found</div>
                ) : (
                  list.map((m, i) => (
                    <div key={m.mou_id ?? m.id ?? i} className="mou-mobile-card">
                      <h4 className="mou-mobile-card-h4">{m.partner_name}</h4>
                      <div className="mou-mobile-card-fields">
                        <div><strong>Signed:</strong> {formatDate(m.date_signed)}</div>
                        <div><strong>Valid till:</strong> {formatDate(m.validity_end)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div id={directoryId} className="table-responsive mou-table-wrapper">
                {!isRestricted && (
                  <table className="mou-table">
                    <thead style={{ backgroundColor: color }}>
                      <tr>
                        {showIarColumns ? (
                          <>
                            <th className="mou-th">Sl. No.</th>
                            <th className="mou-th">Partner</th>
                            <th className="mou-th">Framework</th>
                            <th className="mou-th">Country</th>
                            <th className="mou-th">Collaboration Nature</th>
                            <th className="mou-th">Signed</th>
                            <th className="mou-th">Valid Till</th>
                          </>
                        ) : (
                          <>
                            <th className="mou-th">Partner</th>
                            <th className="mou-th">Focus</th>
                            <th className="mou-th">Signed</th>
                            <th className="mou-th">Valid Till</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((m, i) => (
                        <tr key={m.mou_id ?? m.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                          {showIarColumns ? (
                            <>
                              <td className="mou-td mou-td--strong">{i + 1}</td>
                              <td className="mou-td">{m.partner_name}</td>
                              <td className="mou-td">{m.framework}</td>
                              <td className="mou-td">{m.country}</td>
                              <td className="mou-td">{m.collaboration_nature}</td>
                              <td className="mou-td">{formatDate(m.date_signed)}</td>
                              <td className="mou-td">{formatDate(m.validity_end)}</td>
                            </>
                          ) : (
                            <>
                              <td className="mou-td">{m.partner_name}</td>
                              <td className="mou-td">{m.collaboration_nature}</td>
                              <td className="mou-td">{formatDate(m.date_signed)}</td>
                              <td className="mou-td">{formatDate(m.validity_end)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {!list.length && (
                        <tr>
                          <td colSpan={showIarColumns ? 7 : 4} className="mou-td mou-td--empty">
                            No information available for the selected filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
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
            &#8592; Back to Home
          </button>
        )}

        {!isReadOnlyView && (
          <div className="section-header">
            <div className="section-header-left">
              <h1>MoU and Collaborations</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LastUpdated tables={['research_mous', 'iar_mous']} />
                <ShareButton />
              </div>
            </div>
            {isAdmin && (
              <div className="section-header-actions">
                <button
                  className="page-upload-btn"
                  onClick={() => activeTab === 'industry' ? setIcsrUploadOpen(true) : setIarUploadOpen(true)}
                >
                  <span>&#128228;</span> Upload MoUs
                </button>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="mou-cards-grid">
          <div className="mou-stat-card mou-stat-card--purple">
            <div className="mou-stat-card-body">
              <div className="mou-stat-card-header">
                <span className="mou-stat-card-icon">&#127981;</span>
                <h3 className="mou-stat-card-h3">Industry MoUs</h3>
              </div>
              <div className="metric-value">{icsrTotalMous}</div>
              <div className="mou-stat-card-status">
                <span className="mou-stat-dot" />
                <span className="mou-stat-subtext">Industry collaborations</span>
              </div>
            </div>
          </div>

          <div className="mou-stat-card mou-stat-card--teal">
            <div className="mou-stat-card-body">
              <div className="mou-stat-card-header">
                <span className="mou-stat-card-icon">&#127891;</span>
                <h3 className="mou-stat-card-h3">Education MoUs</h3>
              </div>
              <div className="metric-value">{iarTotalMous}</div>
              <div className="mou-stat-card-status">
                <span className="mou-stat-dot" />
                <span className="mou-stat-subtext">Academic collaborations</span>
              </div>
            </div>
          </div>

          <div className="mou-stat-card mou-stat-card--blue">
            <div className="mou-stat-card-body">
              <div className="mou-stat-card-header">
                <span className="mou-stat-card-icon">&#129309;</span>
                <h3 className="mou-stat-card-h3">Total MoUs</h3>
              </div>
              <div className="metric-value">{icsrTotalMous + iarTotalMous}</div>
              <div className="mou-stat-card-status">
                <span className="mou-stat-dot" />
                <span className="mou-stat-subtext">Combined partnerships</span>
              </div>
            </div>
          </div>
        </div>

        <MouPartnerLogos user={user} isPublicView={isPublicView} />

        {/* Toggle Tabs */}
        <div className="mou-tab-bar">
          <button
            onClick={() => setActiveTab('industry')}
            className="mou-tab-btn"
            style={{
              backgroundColor: activeTab === 'industry' ? '#fff' : 'transparent',
              color: activeTab === 'industry' ? ICSR_COLOR : '#64748b',
              boxShadow: activeTab === 'industry' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            &#127981; Research Collaborations
          </button>
          <button
            onClick={() => setActiveTab('education')}
            className="mou-tab-btn"
            style={{
              backgroundColor: activeTab === 'education' ? '#fff' : 'transparent',
              color: activeTab === 'education' ? IAR_COLOR : '#64748b',
              boxShadow: activeTab === 'education' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            &#127891; Academic Collaborations
          </button>
        </div>

        {activeTab === 'industry' && renderMouChartSection({
          color: ICSR_COLOR,
          viewType: icsrViewType, setViewType: setIcsrViewType,
          chartMode: icsrChartMode, setChartMode: setIcsrChartMode,
          chartData: icsrChartData, list: sortedIcsrList,
          trendId: 'icsr-mou-trend-chart', directoryId: 'icsr-mou-directory-table',
          filenamePrefix: 'industry_mous',
          filterOpts: icsrFilterOpts, filters: icsrFilters,
          onFilterChange: (field, val) => setIcsrFilters((p) => ({ ...p, [field]: val })),
          onClearFilters: () => setIcsrFilters({ mou_year: 'All' }),
          showIarColumns: false,
          chartIsMobile,
          setExpandedChart
        })}

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
          showIarColumns: true,
          chartIsMobile,
          setExpandedChart
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

        <ChartExpandModal
          isOpen={!!expandedChart}
          onClose={() => setExpandedChart(null)}
          title={expandedChart?.title}
        >
          {expandedChart?.content}
        </ChartExpandModal>
      </div>
    </div>
  );
}

export default MoUCollaborations;
