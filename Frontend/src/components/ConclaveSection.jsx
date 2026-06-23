import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchConclaveSummary,
  fetchConclaveList
} from '../services/industryConnectStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
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
                  <span>&#128228;</span> Upload Conclave Data
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
                <span className="cncl-stat-card-icon">&#127919;</span>
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
                <span className="cncl-stat-card-icon">&#127962;</span>
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
                      <span className="cncl-card-year-icon">&#127914;</span>
                      <h2 className="cncl-card-year">{conclave.year}</h2>
                    </div>
                    <div className="cncl-card-count-badge">
                      <span>&#127962;</span>
                      {formatNumber(conclave.number_of_companies)} Companies
                    </div>
                  </div>

                  <div className="cncl-card-body">
                    <div className="cncl-theme-block">
                      <div className="cncl-theme-header">
                        <span className="cncl-theme-icon">&#127919;</span>
                        <h3 className="cncl-theme-h3">Theme</h3>
                      </div>
                      <p className="cncl-theme-text">{conclave.theme}</p>
                    </div>

                    {conclave.focus_area && (
                      <div className="cncl-info-block">
                        <div className="cncl-info-header">
                          <span className="cncl-info-icon">&#128205;</span>
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
                        <span className="cncl-info-icon--lg">&#128197;</span>
                        <div>
                          <span className="cncl-info-label">Sessions</span>
                          <p className="cncl-info-text">{conclave.sessions_held}</p>
                        </div>
                      </div>
                    )}

                    {conclave.key_speakers && (
                      <div className="cncl-info-block cncl-info-block--row">
                        <span className="cncl-info-icon--lg">&#127908;</span>
                        <div>
                          <span className="cncl-info-label">Key Speakers</span>
                          <p className="cncl-info-text">{conclave.key_speakers}</p>
                        </div>
                      </div>
                    )}

                    {(conclave.brochure_url || conclave.event_photos_url) && (
                      <div className="cncl-action-btns">
                        {conclave.brochure_url && (
                          <a
                            href={conclave.brochure_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cncl-action-link"
                          >
                            <span>&#128196;</span> View Brochure
                          </a>
                        )}
                        {conclave.event_photos_url && (
                          <a
                            href={conclave.event_photos_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cncl-action-link"
                          >
                            <span>&#128247;</span> View Photos
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
            <span className="cncl-empty-icon">&#127914;</span>
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
