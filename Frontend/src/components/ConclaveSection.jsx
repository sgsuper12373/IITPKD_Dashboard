import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from './DashboardIcon';
import { UploadOutlined } from '@ant-design/icons';
import {
  fetchConclaveSummary,
  fetchConclaveList
} from '../services/industryConnectStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import { safeHref } from '../utils/safeUrl';
import './Page.css';
import './AcademicSection.css';
import './ConclaveSection.css';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function ConclaveSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 12;

  const [summary, setSummary] = useState({
    total_conclaves: 0,
    total_companies: 0
  });

  const [conclaves, setConclaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchConclaveSummary(token);
        setSummary(data);
      } catch (err) {
        setError(err.message || 'Failed to load summary data');
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    };
    loadSummary();
  }, [token, uploadVersion]);

  useEffect(() => {
    const loadConclaves = async () => {
      try {
        const result = await fetchConclaveList(token);
        setConclaves(result.data || []);
      } catch (err) {
        console.error('Error loading conclaves:', err);
      }
    };
    loadConclaves();
  }, [token, uploadVersion]);

  return (
    <div className={isPublicView ? "" : "page-container"}>
      <div className={isPublicView ? "" : "page-content"}>
        {!isReadOnlyView && (
          <button className="page-back-btn" onClick={() => navigate('/industry-connect')}>
            &#8592; Back to Industry Connect
          </button>
        )}
        {!isReadOnlyView && (
          <div className="page-header-row">
            <div className="page-header-left">
              <h1>Industry-Academia Conclave</h1>
            </div>
            {!isReadOnlyView && isAdmin && (
              <div className="page-header-actions">
                <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                  <UploadOutlined /> Upload Conclave Data
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LastUpdated tables={['industry_conclave']} />
          <ShareButton />
        </div>

        <div className="cncl-export-row">
          <ExportMenu
            elementId="conclave-summary-cards-container"
            data={[summary]}
            headers={['Total Conclaves', 'Companies Participated']}
            keys={['total_conclaves', 'total_companies']}
            filename="conclave_summary"
            title="Conclave Summary"
          />
        </div>

        <div id="conclave-summary-cards-container" className="cncl-cards-grid">
          <div className="cncl-stat-card cncl-stat-card--purple">
            <div className="cncl-stat-card-decor-top" />
            <div className="cncl-stat-card-decor-bottom" />
            <div className="cncl-stat-card-body">
              <div className="cncl-stat-card-header">
                <DashboardIcon name="aim" className="cncl-stat-card-icon" />
                <h3 className="cncl-stat-card-h3">Total Conclaves</h3>
              </div>
              <div className="cncl-stat-card-value">{formatNumber(summary.total_conclaves)}</div>
              <div className="cncl-stat-card-status">
                <span className="cncl-stat-dot" />
                <span className="cncl-stat-subtext">Industry-Academia meets</span>
              </div>
            </div>
          </div>

          <div className="cncl-stat-card cncl-stat-card--pink">
            <div className="cncl-stat-card-decor-top" />
            <div className="cncl-stat-card-decor-bottom" />
            <div className="cncl-stat-card-body">
              <div className="cncl-stat-card-header">
                <DashboardIcon name="bank" className="cncl-stat-card-icon" />
                <h3 className="cncl-stat-card-h3">Companies Participated</h3>
              </div>
              <div className="cncl-stat-card-value">{formatNumber(summary.total_companies)}</div>
              <div className="cncl-stat-card-status">
                <span className="cncl-stat-dot" />
                <span className="cncl-stat-subtext">Industry partners</span>
              </div>
            </div>
          </div>
        </div>

        {loading && !hasLoaded ? (
          <div className="cncl-loading">
            <div className="loading-spinner" />
            <p className="cncl-loading-text">Loading conclave information...</p>
          </div>
        ) : conclaves.length > 0 ? (
          <div>
            <div className="cncl-export-row">
              <ExportMenu
                elementId="conclave-directory-container"
                data={conclaves}
                headers={['Year', 'Companies', 'Theme', 'Focus Area']}
                keys={['year', 'number_of_companies', 'theme', 'focus_area']}
                filename="conclave_directory"
                title="Conclave Directory"
              />
            </div>
            <div id="conclave-directory-container" className="cncl-grid">
              {conclaves.map((conclave) => (
                <div key={conclave.conclave_id} className="cncl-card">
                  <div className="cncl-card-header">
                    <div className="cncl-card-header-left">
                      <DashboardIcon name="calendar" className="cncl-card-year-icon" />
                      <h2 className="cncl-card-year">{conclave.year}</h2>
                    </div>
                    <div className="cncl-card-count-badge">
                      <DashboardIcon name="bank" size={16} />
                      {formatNumber(conclave.number_of_companies)} Companies
                    </div>
                  </div>

                  <div className="cncl-card-body">
                    <div className="cncl-theme-block">
                      <div className="cncl-theme-header">
                        <DashboardIcon name="aim" className="cncl-theme-icon" />
                        <h3 className="cncl-theme-h3">Theme</h3>
                      </div>
                      <p className="cncl-theme-text">{conclave.theme}</p>
                    </div>

                    {conclave.focus_area && (
                      <div className="cncl-info-block">
                        <div className="cncl-info-header">
                          <DashboardIcon name="location" className="cncl-info-icon" />
                          <span className="cncl-info-label">Focus Area</span>
                        </div>
                        <p className="cncl-info-text">{conclave.focus_area}</p>
                      </div>
                    )}

                    {conclave.description && (
                      <p className="cncl-desc-text">{conclave.description}</p>
                    )}

                    {conclave.sessions_held && (
                      <div className="cncl-info-block cncl-info-block--row">
                        <DashboardIcon name="calendar" className="cncl-info-icon--lg" />
                        <div>
                          <span className="cncl-info-label">Sessions</span>
                          <p className="cncl-info-text">{conclave.sessions_held}</p>
                        </div>
                      </div>
                    )}

                    {conclave.key_speakers && (
                      <div className="cncl-info-block cncl-info-block--row">
                        <DashboardIcon name="sound" className="cncl-info-icon--lg" />
                        <div>
                          <span className="cncl-info-label">Key Speakers</span>
                          <p className="cncl-info-text">{conclave.key_speakers}</p>
                        </div>
                      </div>
                    )}

                    {(safeHref(conclave.brochure_url) || safeHref(conclave.event_photos_url)) && (
                      <div className="cncl-action-btns">
                        {safeHref(conclave.brochure_url) && (
                          <a
                            href={safeHref(conclave.brochure_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cncl-action-link"
                          >
                            <DashboardIcon name="file" size={14} /> View Brochure
                          </a>
                        )}
                        {safeHref(conclave.event_photos_url) && (
                          <a
                            href={safeHref(conclave.event_photos_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cncl-action-link"
                          >
                            <DashboardIcon name="camera" size={14} /> View Photos
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="cncl-empty-state">
            <DashboardIcon name="calendar" className="cncl-empty-icon" />
            <p className="cncl-empty-text">No conclave data available.</p>
          </div>
        )}
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName="industry_conclave"
        token={token}
      />
    </div>
  );
}

export default ConclaveSection;
