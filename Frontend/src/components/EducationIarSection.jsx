import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import { UploadOutlined, LineChartOutlined, ProfileOutlined } from '@ant-design/icons';
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
import DashboardPageHeader from './DashboardPageHeader';

import './Page.css';
import './AcademicSection.css';
import './ResearchSection.css';
import '../DesignSystem.css';
import './EducationIarSection.css';

const IAR_MOU_COLOR = '#087E8B';

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

  const [filters, setFilters] = useState({ mou_year: 'All' });
  const [totalMous, setTotalMous] = useState(0);
  const [mouTrend, setMouTrend] = useState([]);
  const [mouList, setMouList] = useState([]);

  const [viewType, setViewType] = useState('trend');
  const [chartMode, setChartMode] = useState('bar');

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 5;

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

  const handleClearFilters = () => setFilters({ mou_year: 'All' });

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
            className="page-back-btn eiar-back-btn"
            onClick={() => navigate('/education')}
          >
            &#8592; Back to Education
          </button>
        )}

        <DashboardPageHeader
          title={isPublicView ? 'Academic Collaborations' : 'International & Alumni Relations MoUs'}
          subtitle="Explore institutional academic partnerships."
          tables={['iar_mous']}
        >
          {!isReadOnlyView && isAdmin && (
            <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
              <UploadOutlined /> Upload MoUs
            </button>
          )}
        </DashboardPageHeader>

        {error && (
          <div className="error-message eiar-error">{error}</div>
        )}

        {!error && (
          <>
            <div className="eiar-card-wrap">
              <div className="eiar-summary-card">
                <div className="eiar-card-decor" />
                <div className="eiar-card-inner">
                  <div className="eiar-card-header">
                    <DashboardIcon name="link" className="eiar-card-icon" />
                    <span className="eiar-card-title">Total Academic MoUs</span>
                  </div>
                  <div className="eiar-card-value">{totalMous}</div>
                  <div className="eiar-card-footer">
                    <span className="eiar-card-dot" />
                    <span className="eiar-card-footer-text">Active &amp; Recorded Collaborations</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="chart-section eiar-chart-section">
              <div className="cc-header">
                <div className="cc-header__tabs">
                  <button
                    onClick={() => setViewType('trend')}
                    className={`cc-tab${viewType === 'trend' ? ' cc-tab--active' : ''}`}
                  >
                    <LineChartOutlined /> Trend
                  </button>
                  {(!!user && user.role_id !== 0) && (
                    <button
                      onClick={() => setViewType('directory')}
                      className={`cc-tab${viewType === 'directory' ? ' cc-tab--active' : ''}`}
                    >
                      <ProfileOutlined /> Directory
                    </button>
                  )}
                </div>
              </div>

              {viewType === 'trend' && (
                <>
                  <div className="cc-subheader">
                    <h2 className="cc-title">
                      <LineChartOutlined className="cc-title-icon" />
                      MoUs Signed Over Time
                    </h2>
                    <div className="cc-subheader__right">
                      <div className="rls-mode-toggle">
                        {['bar', 'trend'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setChartMode(mode)}
                            className={`rls-mode-btn${chartMode === mode ? ' rls-mode-btn--active' : ''}`}
                          >
                            {mode === 'bar' ? 'Bar' : 'Trend'}
                          </button>
                        ))}
                      </div>
                      <ExportMenu
                        elementId="iar-mou-trend-container"
                        data={mouTrendChartData}
                        headers={['Year', 'MoUs Signed']}
                        keys={['year', 'total']}
                        filename="iar_mou_trend"
                        title="IAR MoUs Trend"
                      />
                    </div>
                  </div>
                  <div
                    id="iar-mou-trend-container"
                    className={`chart-container eiar-chart-container${!mouTrendChartData.length ? ' chart-has-empty' : ''}`}
                  >
                    <div className={`section-empty-state ${mouTrendChartData.length ? 'hidden' : ''}`}>
                      <p>No information available for the selected filter</p>
                    </div>
                    <ResponsiveContainer width="100%" height={chartIsMobile ? 220 : 350} minWidth={0}>
                      {chartMode === 'bar' ? (
                        <BarChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 14 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 14 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 500 }} iconType="rect" />
                          <Bar dataKey="total" name="MoUs Signed" fill={IAR_MOU_COLOR} radius={[4, 4, 0, 0]} barSize={28}>
                            <LabelList dataKey="total" position="top" style={{ fontSize: '14px', fontWeight: 600, fill: IAR_MOU_COLOR }} />
                          </Bar>
                        </BarChart>
                      ) : (
                        <LineChart data={mouTrendChartData} margin={{ top: 10, right: 20, left: 40, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" stroke="#666" tick={{ fontSize: 14 }} />
                          <YAxis stroke="#666" tick={{ fontSize: 14 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 500 }} />
                          <Line
                            type="linear"
                            dataKey="total"
                            name="MoUs Signed"
                            stroke={IAR_MOU_COLOR}
                            strokeWidth={3}
                            dot={{ r: 6, fill: IAR_MOU_COLOR }}
                            activeDot={{ r: 8 }}
                          >
                            <LabelList offset={15} dataKey="total" position="top" style={{ fontSize: '14px', fontWeight: 600, fill: IAR_MOU_COLOR }} />
                          </Line>
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {viewType === 'directory' && (
                <>
                  <div className="cc-subheader">
                    <h2 className="cc-title">
                      <ProfileOutlined className="cc-title-icon" />
                      MoUs Directory
                      <span style={{ fontSize: 14, fontWeight: 400, color: '#8A8A84' }}>({mouList.length} records)</span>
                    </h2>
                    <div className="cc-subheader__right">
                      <ExportMenu
                        elementId="iar-mou-directory-table"
                        data={mouList}
                        headers={['Partner', 'Framework', 'Country', 'Collaboration Nature', 'Signed', 'Valid Till']}
                        keys={['partner_name', 'framework', 'country', 'collaboration_nature', 'date_signed', 'validity_end']}
                        filename="iar_mou_directory"
                        title="IAR MoUs Directory"
                      />
                    </div>
                  </div>
                  <div id="iar-mou-directory-table" className="table-responsive eiar-dir-table-wrap">
                    {(!!user && user.role_id !== 0) && (
                      <table className="eiar-dir-table">
                        <thead>
                          <tr>
                            <th>Sl. No.</th>
                            <th>Partner</th>
                            <th>Framework</th>
                            <th>Country</th>
                            <th>Collaboration Nature</th>
                            <th>Signed</th>
                            <th>Valid Till</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMouList.map((m, i) => (
                            <tr key={m.id ?? i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                              <td className="eiar-td-num">{i + 1}</td>
                              <td>{m.partner_name}</td>
                              <td>{m.framework}</td>
                              <td>{m.country}</td>
                              <td>{m.collaboration_nature}</td>
                              <td>{formatDate(m.date_signed)}</td>
                              <td>{formatDate(m.validity_end)}</td>
                            </tr>
                          ))}
                          {!mouList.length && (
                            <tr>
                              <td colSpan={7} className="eiar-td-empty">
                                No information available for the selected filter
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
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
