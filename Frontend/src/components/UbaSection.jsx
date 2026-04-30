import { useState, useEffect } from 'react';
import {
  fetchUbaSummary,
  fetchUbaProjects,
  fetchUbaEvents
} from '../services/outreachExtensionStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import './Page.css';
import './AcademicSection.css';
import DataUploadModal from './DataUploadModal';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function UbaSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const token = localStorage.getItem('authToken');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [summary, setSummary] = useState({
    total_projects: 0,
    total_events: 0
  });

  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load summary data
  useEffect(() => {
    const loadSummary = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const data = await fetchUbaSummary(token);
        setSummary(data);
      } catch (err) {
        setError(err.message || 'Failed to load summary data');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [token, uploadVersion]);

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!token) return;
      try {
        const result = await fetchUbaProjects(token);
        setProjects(result.projects || []);
      } catch (err) {
        console.error('Error loading projects:', err);
      }
    };
    loadProjects();
  }, [token, uploadVersion]);

  // Load all events
  useEffect(() => {
    const loadEvents = async () => {
      if (!token) return;
      try {
        const result = await fetchUbaEvents(token);
        setEvents(result.events || []);
      } catch (err) {
        console.error('Error loading events:', err);
      }
    };
    loadEvents();
  }, [token, uploadVersion]);


  if (error) {
    return isPublicView ? (
      <p className="error-message">{error}</p>
    ) : (
      <div className="page-container">
        <div className="page-content">
          <h1>UBA (Unnat Bharat Abhiyan)</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!isPublicView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          ← Back to Outreach Extension
        </button>
      )}
      {!isPublicView && <h1>UBA (Unnat Bharat Abhiyan)</h1>}

      {isPublicView ? null : (user && user.role_id === 3 && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <button
            className="page-upload-btn"
            onClick={() => { setActiveUploadTable('uba_projects'); setIsUploadModalOpen(true); }}
          >
            <span>📤</span> Upload Projects
          </button>
          <button
            className="page-upload-btn"
            onClick={() => { setActiveUploadTable('uba_events'); setIsUploadModalOpen(true); }}
          >
            <span>📅</span> Upload Events
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2> style={{ textDecoration: "underline", color: isPublicView ? "#000000" : "#ffffff", textShadow: isPublicView ? "0 1px 2px rgba(255,255,255,0.6)" : "0 2px 6px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.6)", margin: 0, fontSize: "20px" }}
          Impact Summary
        </h2>
        <ExportMenu
          elementId="uba-summary-cards-container"
          data={[summary]}
          headers={['Total Projects', 'Total Events']}
          keys={['total_projects', 'total_events']}
          filename="uba_summary"
          title="UBA Impact Summary"
        />
      </div>
      {/* Impact Summary Cards */}
      < div id="uba-summary-cards-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px',
        marginBottom: '40px'
      }
      }>
        {/* Total Projects Card */}
        < div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(102, 126, 234, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          {/* Decorative elements */}
          < div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          < div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />

          < div style={{ position: 'relative', zIndex: 1 }}>
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
              }}>📊</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Total Projects</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_projects)}
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
                Active UBA initiatives
              </span>
            </div>
          </div >
        </div >

        {/* Total Events Card */}
        < div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '20px',
          padding: '28px',
          boxShadow: '0 15px 35px rgba(240, 147, 251, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          cursor: 'pointer'
        }}>
          {/* Decorative elements */}
          < div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '150px',
            height: '150px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }} />
          < div style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }} />

          < div style={{ position: 'relative', zIndex: 1 }}>
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
              }}>📅</span>
              <h3 style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '18px',
                fontWeight: '500'
              }}>Total Events</h3>
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px',
              lineHeight: '1.2'
            }}>
              {formatNumber(summary.total_events)}
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
                Community engagement activities
              </span>
            </div>
          </div >
        </div >
      </div >

      {/* Projects Section */}
      < div className="chart-section" style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>UBA Projects</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ backgroundColor: '#667eea', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>
              {projects.length} Projects
            </span>
            <ExportMenu
              elementId="uba-projects-container"
              data={projects}
              headers={['Project Title', 'Status', 'Coordinator', 'Partners']}
              keys={['project_title', 'project_status', 'coordinator_name', 'collaboration_partners']}
              filename="uba_projects_directory"
              title="UBA Projects Directory"
            />
          </div>
        </div>
        <div id="uba-projects-container">

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f8f9fa', borderRadius: '12px', color: '#666' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
              <p style={{ fontSize: '16px' }}>No projects found</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {projects.map((project) => (
                <div key={project.project_id} style={{
                  backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e9ecef',
                  overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', color: 'white' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', lineHeight: '1.4' }}>{project.project_title}</h3>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {project.project_status}
                    </span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    {project.coordinator_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: '#555' }}>
                        <span>👤</span><span><strong>Coordinator:</strong> {project.coordinator_name}</span>
                      </div>
                    )}
                    {project.collaboration_partners && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#666' }}>
                        <span>🤝</span><span><strong>Partners:</strong> {project.collaboration_partners}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div >

      {/* Events Section */}
      < div className="chart-section" style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>UBA Events</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ backgroundColor: '#f093fb', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>
              {events.length} Events
            </span>
            <ExportMenu
              elementId="uba-events-table-container"
              data={events}
              headers={['Year', 'Program Name', 'Type', 'Association', 'Attendees', 'Reach']}
              keys={['year', 'program_name', 'program_type', 'association', 'num_attendees', 'geographic_reach']}
              filename="uba_events_list"
              title="UBA Events Directory"
            />
          </div>
        </div>
        <div id="uba-events-table-container">

          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f8f9fa', borderRadius: '12px', color: '#666' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📅</span>
              <p style={{ fontSize: '16px' }}>No events found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                    {['Year', 'Program Name', 'Type', 'Association', 'Dates', 'Audience', 'Attendees', 'Schools', 'Colleges', 'Reach', 'Remarks'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: '600', color: '#555', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, idx) => (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap', color: '#667eea', fontWeight: '500' }}>{ev.year || '—'}</td>
                      <td style={{ padding: '10px', maxWidth: '260px', lineHeight: '1.4' }}>{ev.program_name || '—'}</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{ev.program_type || '—'}</td>
                      <td style={{ padding: '10px', maxWidth: '160px' }}>{ev.association || '—'}</td>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap', fontSize: '13px', color: '#666' }}>
                        {ev.start_date ? new Date(ev.start_date).toLocaleDateString() : '—'}
                        {ev.end_date && ev.end_date !== ev.start_date ? ` – ${new Date(ev.end_date).toLocaleDateString()}` : ''}
                      </td>
                      <td style={{ padding: '10px', maxWidth: '160px', fontSize: '13px' }}>{ev.targeted_audience || '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{ev.num_attendees ?? '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{ev.num_schools ?? '—'}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>{ev.num_colleges ?? '—'}</td>
                      <td style={{ padding: '10px', maxWidth: '140px', fontSize: '13px' }}>{ev.geographic_reach || '—'}</td>
                      <td style={{ padding: '10px', maxWidth: '160px', fontSize: '13px', color: '#888' }}>{ev.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div >

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </>
  );

  // If public view, return content without wrappers
  if (isPublicView) {
    return content;
  }

  // If not public view, wrap in page-container and page-content
  return (
    <div className="page-container">
      <div className="page-content">
        {content}
      </div>
    </div>
  );
}

export default UbaSection;