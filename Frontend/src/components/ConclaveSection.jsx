import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchConclaveSummary,
  fetchConclaveList
} from '../services/industryConnectStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import './Page.css';
import './AcademicSection.css';
import DataUploadModal from './LazyDataUploadModal';
import ExportMenu from './ExportMenu';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function ConclaveSection({ user, isPublicView = false }) {
  const uploadVersion = useUploadRefresh();
  const navigate = useNavigate();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const canViewRestrictedSection = isPublicView && !isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const [summary, setSummary] = useState({
    total_conclaves: 0,
    total_companies: 0
  });

  const [conclaves, setConclaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load summary data
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
      }
    };
    loadSummary();
  }, [token, uploadVersion]);

  // Load conclaves list
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
            ← Back to Industry Connect
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
                  <span>📤</span> Upload Conclave Data
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message" style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>{error}</div>}

        {/* FIX 1: Restored proper <h2> tag that was broken */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
          <h2
            style={{
              textDecoration: "underline",
              color: isPublicView ? "#000000" : "#ffffff",
              textShadow: isPublicView ? "0 1px 2px rgba(255,255,255,0.6)" : "0 2px 6px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.6)",
              margin: 0,
              fontSize: "20px"
            }}
          >
            Conclave Summary
          </h2>
          <ExportMenu
            elementId="conclave-summary-cards-container"
            data={[summary]}
            headers={['Total Conclaves', 'Companies Participated']}
            keys={['total_conclaves', 'total_companies']}
            filename="conclave_summary"
            title="Conclave Summary"
          />
        </div>

        {/* Summary Cards - Modern Design */}
        <>{(typeof user === 'undefined' || user?.role_id !== 0) && (
<div id="conclave-summary-cards-container" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Total Conclaves Card */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
          }}>
            {/* Decorative circles */}
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-40px',
              width: '180px',
              height: '180px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>🎯</span>
                <h3 style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '18px',
                  fontWeight: '500'
                }}>Total Conclaves</h3>
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px',
                lineHeight: '1.2'
              }}>
                {formatNumber(summary.total_conclaves)}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%'
                }} />
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Industry-Academia meets
                </span>
              </div>
            </div>
          </div>

          {/* Total Companies Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 15px 35px rgba(240, 147, 251, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer',
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-40px',
              width: '180px',
              height: '180px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '32px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '10px',
                  borderRadius: '12px'
                }}>🏢</span>
                <h3 style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '18px',
                  fontWeight: '500'
                }}>Companies Participated</h3>
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '8px',
                lineHeight: '1.2'
              }}>
                {formatNumber(summary.total_companies)}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%'
                }} />
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Industry partners
                </span>
              </div>
            </div>
          </div>
        </div>
)}</>

        {/* Conclave Cards */}
        {loading ? (
          <div className="loading-container" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="loading-spinner" />
            <p style={{ color: '#666', marginTop: '10px' }}>Loading conclave information...</p>
          </div>
        ) : conclaves.length > 0 ? (
          <div>
            {/* FIX 2: Removed stray "Students On Roll" h2; kept only "Conclave Directory" */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ textDecoration: 'underline', color: '#000', margin: 0, fontSize: '20px' }}>
                Conclave Directory
              </h2>
              <ExportMenu
                elementId="conclave-directory-container"
                data={conclaves}
                headers={['Year', 'Companies', 'Theme', 'Focus Area']}
                keys={['year', 'number_of_companies', 'theme', 'focus_area']}
                filename="conclave_directory"
                title="Conclave Directory"
              />
            </div>
            <div id="conclave-directory-container" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '24px',
              marginTop: '20px'
            }}>
              {conclaves.map((conclave) => (
                <div
                  key={conclave.conclave_id}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 15px 30px rgba(79, 70, 229, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 5px 20px rgba(0,0,0,0.05)';
                  }}
                >
                  {/* Year Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '20px 24px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{
                        fontSize: '28px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '8px',
                        borderRadius: '12px'
                      }}>🎪</span>
                      <h2 style={{
                        margin: 0,
                        fontSize: '28px',
                        fontWeight: 'bold'
                      }}>
                        {conclave.year}
                      </h2>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      padding: '8px 16px',
                      borderRadius: '30px',
                      fontSize: '14px',
                      fontWeight: '600',
                      backdropFilter: 'blur(5px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>🏢</span>
                      {formatNumber(conclave.number_of_companies)} Companies
                    </div>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '24px' }}>
                    {/* Theme */}
                    <div style={{
                      backgroundColor: '#f0f4ff',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px',
                      border: '1px solid #e0e7ff'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '20px' }}>🎯</span>
                        <h3 style={{
                          margin: 0,
                          color: '#4f46e5',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          Theme
                        </h3>
                      </div>
                      <p style={{
                        margin: 0,
                        color: '#333',
                        fontSize: '15px',
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}>
                        {conclave.theme}
                      </p>
                    </div>

                    {/* Focus Area */}
                    {conclave.focus_area && (
                      <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '10px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px'
                        }}>
                          <span style={{ fontSize: '16px' }}>📍</span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#666'
                          }}>
                            Focus Area
                          </span>
                        </div>
                        <p style={{
                          margin: 0,
                          color: '#333',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          {conclave.focus_area}
                        </p>
                      </div>
                    )}

                    {/* Description */}
                    {conclave.description && (
                      <p style={{
                        margin: '0 0 16px 0',
                        color: '#555',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '10px'
                      }}>
                        {conclave.description}
                      </p>
                    )}

                    {/* Sessions */}
                    {conclave.sessions_held && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '10px'
                      }}>
                        <span style={{ fontSize: '20px' }}>📅</span>
                        <div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#666',
                            display: 'block',
                            marginBottom: '4px'
                          }}>
                            Sessions
                          </span>
                          <span style={{
                            color: '#333',
                            fontSize: '14px',
                            lineHeight: '1.5'
                          }}>
                            {conclave.sessions_held}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Key Speakers */}
                    {conclave.key_speakers && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '10px'
                      }}>
                        <span style={{ fontSize: '20px' }}>🎤</span>
                        <div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#666',
                            display: 'block',
                            marginBottom: '4px'
                          }}>
                            Key Speakers
                          </span>
                          <span style={{
                            color: '#333',
                            fontSize: '14px',
                            lineHeight: '1.5'
                          }}>
                            {conclave.key_speakers}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {(conclave.brochure_url || conclave.event_photos_url) && (
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '2px dashed #e9ecef'
                      }}>
                        {conclave.brochure_url && (
                          <a
                            href={conclave.brochure_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              padding: '12px',
                              backgroundColor: '#f0f4ff',
                              color: '#4f46e5',
                              textDecoration: 'none',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.2s ease',
                              border: '1px solid #e0e7ff'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#4f46e5';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f0f4ff';
                              e.currentTarget.style.color = '#4f46e5';
                            }}
                          >
                            <span>📄</span> View Brochure
                          </a>
                        )}
                        {conclave.event_photos_url && (
                          <a
                            href={conclave.event_photos_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              padding: '12px',
                              backgroundColor: '#f0f4ff',
                              color: '#4f46e5',
                              textDecoration: 'none',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.2s ease',
                              border: '1px solid #e0e7ff'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#4f46e5';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f0f4ff';
                              e.currentTarget.style.color = '#4f46e5';
                            }}
                          >
                            <span>📷</span> View Photos
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
          <div className="no-data" style={{
            textAlign: 'center',
            padding: '60px',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            marginTop: '20px'
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🎪</span>
            <p style={{ color: '#666', fontSize: '16px' }}>No conclave data available.</p>
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