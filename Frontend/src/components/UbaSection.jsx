import { useState, useEffect } from 'react';
import {
  fetchUbaSummary,
  fetchUbaProjects,
  fetchUbaEvents
} from '../services/outreachExtensionStats';
import { useUploadRefresh } from '../hooks/useUploadRefresh';
import './Page.css';
import './AcademicSection.css';
import './UbaSection.css';
import DataUploadModal from './LazyDataUploadModal';
import { useNavigate } from 'react-router-dom';
import ExportMenu from './ExportMenu';
import ChartExpandModal from './ChartExpandModal';
import LastUpdated from './LastUpdated';
import ShareButton from './ShareButton';


const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(value || 0);

function UbaSection({ user, isPublicView = false }) {
  const navigate = useNavigate();

  const uploadVersion = useUploadRefresh();
  const token = localStorage.getItem('authToken');

  const isGuestUser = !user;
  const isReadOnlyView = isPublicView || isGuestUser;
  const isAdmin = user?.role_id === 3 || user?.role_id === 17;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeUploadTable, setActiveUploadTable] = useState('');

  const [summary, setSummary] = useState({
    total_projects: 0,
    total_events: 0
  });

  const [projects, setProjects] = useState([]);
  const [events, setEvents] = useState([]);

  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const [chartIsMobile, setChartIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handle = () => setChartIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);


  useEffect(() => {
    const loadSummary = async () => {
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

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const result = await fetchUbaProjects(token);
        setProjects(result.projects || []);
      } catch (err) {
        console.error('Error loading projects:', err);
      }
    };
    loadProjects();
  }, [token, uploadVersion]);

  useEffect(() => {
    const loadEvents = async () => {
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
      {!isReadOnlyView && (
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          &#8592; Back to Outreach Extension
        </button>
      )}
      {!isReadOnlyView && <h1>UBA (Unnat Bharat Abhiyan)</h1>}

      {!isReadOnlyView && isAdmin && (
        <div className="uba-upload-row">
          <button
            className="page-upload-btn"
            onClick={() => { setActiveUploadTable('uba_projects'); setIsUploadModalOpen(true); }}
          >
            <span>&#128228;</span> Upload Projects
          </button>
          <button
            className="page-upload-btn"
            onClick={() => { setActiveUploadTable('uba_events'); setIsUploadModalOpen(true); }}
          >
            <span>&#128197;</span> Upload Events
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LastUpdated tables={['uba_projects', 'uba_events']} />
        <ShareButton />
      </div>

      <div className="uba-export-row">
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
      <div id="uba-summary-cards-container" className="uba-cards-grid">
        {/* Total Projects Card */}
        <div className="uba-stat-card uba-stat-card--purple">
          <div className="uba-stat-card-decor-top" />
          <div className="uba-stat-card-decor-bottom" />
          <div className="uba-stat-card-body">
            <div className="uba-stat-card-header">
              <span className="uba-stat-card-icon">&#128202;</span>
              <h3 className="uba-stat-card-h3">Total Projects</h3>
            </div>
            <div className="uba-stat-card-value">
              {summary.total_projects === 0 ? "To Be Updated" : formatNumber(summary.total_projects)}
            </div>
            <div className="uba-stat-card-status">
              <span className="uba-stat-dot" />
              <span className="uba-stat-subtext">Active UBA initiatives</span>
            </div>
          </div>
        </div>

        {/* Total Events Card */}
        <div className="uba-stat-card uba-stat-card--pink">
          <div className="uba-stat-card-decor-top" />
          <div className="uba-stat-card-decor-bottom" />
          <div className="uba-stat-card-body">
            <div className="uba-stat-card-header">
              <span className="uba-stat-card-icon">&#128197;</span>
              <h3 className="uba-stat-card-h3">Total Events</h3>
            </div>
            <div className="uba-stat-card-value">
              {summary.total_events === 0 ? "To Be Updated" : formatNumber(summary.total_events)}
            </div>
            <div className="uba-stat-card-status">
              <span className="uba-stat-dot" />
              <span className="uba-stat-subtext">Community engagement activities</span>
            </div>
          </div>
        </div>
      </div>

      <ChartExpandModal
        isOpen={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedChart?.title}
      >
        {expandedChart?.content}
      </ChartExpandModal>

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="uba-panel">
          <div className="uba-panel-header">
            <h2 className="uba-panel-h2">UBA Projects</h2>
            <div className="uba-panel-header-right">
              <span className="uba-count-badge uba-count-badge--purple">
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
              <div className="uba-empty-state">
                <span className="uba-empty-icon">&#128203;</span>
                <p className="uba-empty-text">No projects found</p>
              </div>
            ) : (
              <div className="uba-project-grid">
                {projects.map((project) => (
                  <div key={project.project_id} className="uba-project-card">
                    <div className="uba-project-card-header">
                      <h3 className="uba-project-card-h3">{project.project_title}</h3>
                      <span className="uba-project-status">{project.project_status}</span>
                    </div>
                    <div className="uba-project-card-body">
                      {project.coordinator_name && (
                        <div className="uba-project-info-row">
                          <span>&#128100;</span>
                          <span><strong>Coordinator:</strong> {project.coordinator_name}</span>
                        </div>
                      )}
                      {project.collaboration_partners && (
                        <div className="uba-project-info-row uba-project-info-row--sm">
                          <span>&#129309;</span>
                          <span><strong>Partners:</strong> {project.collaboration_partners}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Section */}
      <div className="uba-panel">
        <div className="uba-panel-header">
          <h2 className="uba-panel-h2">UBA Events</h2>
          <div className="uba-panel-header-right">
            <span className="uba-count-badge uba-count-badge--pink">
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
        <div
          id="uba-events-table-container"
          className="clickable-chart"
          onClick={() => !chartIsMobile && setExpandedChart({
            title: "UBA Events Directory",
            content: (
              <div className="uba-expanded-panel">
                <table className="uba-exp-table">
                  <thead>
                    <tr className="uba-exp-thead-tr">
                      {['Year', 'Program Name', 'Type', 'Association', 'Dates', 'Audience', 'Attendees', 'Reach'].map(h => (
                        <th key={h} className="uba-exp-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, idx) => (
                      <tr key={ev.id} className="uba-exp-tr" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td className="uba-exp-td uba-exp-td--year">{ev.year || '—'}</td>
                        <td className="uba-exp-td">{ev.program_name || '—'}</td>
                        <td className="uba-exp-td">{ev.program_type || '—'}</td>
                        <td className="uba-exp-td">{ev.association || '—'}</td>
                        <td className="uba-exp-td">{ev.start_date ? new Date(ev.start_date).toLocaleDateString() : '—'}</td>
                        <td className="uba-exp-td">{ev.targeted_audience || '—'}</td>
                        <td className="uba-exp-td uba-exp-td--center">{ev.num_attendees ?? '—'}</td>
                        <td className="uba-exp-td">{ev.geographic_reach || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        >
          {events.length === 0 ? (
            <div className="uba-empty-state">
              <span className="uba-empty-icon">&#128197;</span>
              <p className="uba-empty-text">No events found</p>
            </div>
          ) : chartIsMobile ? (
            <div className="uba-mobile-list">
              {events.map((ev) => (
                <div key={ev.id} className="uba-mobile-card">
                  <div className="uba-mobile-card-header">
                    <span className="uba-mobile-card-year">{ev.year}</span>
                    <span className="uba-mobile-card-type">{ev.program_type}</span>
                  </div>
                  <h4 className="uba-mobile-card-h4">{ev.program_name}</h4>
                  <div className="uba-mobile-card-fields">
                    <div><strong>Association:</strong> {ev.association || '—'}</div>
                    <div><strong>Attendees:</strong> {ev.num_attendees || '0'}</div>
                    <div className="uba-span-full"><strong>Reach:</strong> {ev.geographic_reach || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="uba-table-wrapper">
              {(typeof user === 'undefined' || user?.role_id !== 0) && (
                <table className="uba-table">
                  <thead>
                    <tr>
                      {['Year', 'Program Name', 'Type', 'Association', 'Dates', 'Audience', 'Attendees', 'Schools', 'Colleges', 'Reach', 'Remarks'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, idx) => (
                      <tr key={ev.id} className="uba-exp-tr" style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td className="uba-td-year">{ev.year || '—'}</td>
                        <td className="uba-td-wrap">{ev.program_name || '—'}</td>
                        <td className="uba-td-nowrap">{ev.program_type || '—'}</td>
                        <td className="uba-td-assoc">{ev.association || '—'}</td>
                        <td className="uba-td-date">
                          {ev.start_date ? new Date(ev.start_date).toLocaleDateString() : '—'}
                          {ev.end_date && ev.end_date !== ev.start_date ? ` – ${new Date(ev.end_date).toLocaleDateString()}` : ''}
                        </td>
                        <td className="uba-td-audience">{ev.targeted_audience || '—'}</td>
                        <td className="uba-td-center">{ev.num_attendees ?? '—'}</td>
                        <td className="uba-td-center">{ev.num_schools ?? '—'}</td>
                        <td className="uba-td-center">{ev.num_colleges ?? '—'}</td>
                        <td className="uba-td-reach">{ev.geographic_reach || '—'}</td>
                        <td className="uba-td-remarks">{ev.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        tableName={activeUploadTable}
        token={token}
      />
    </>
  );

  if (isPublicView) {
    return content;
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {content}
      </div>
    </div>
  );
}

export default UbaSection;
