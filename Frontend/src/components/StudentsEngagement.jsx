import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
/*import './Page.css';*/
/*import './PeopleCampusMinimal.css';*/
import './StudentsEngagement.css';

import NptelSection from './NptelSection';
import OutreachSection from './OutreachSection';

const SECTIONS = [
  {
    id: 'nptel',
    icon: '📚',
    title: 'CCE',
    subtitle: 'National Programme on Technology Enhanced Learning',
    expandedTitle: 'Track student participation in NPTEL online learning and certification programmes.',
    description:
      'Access NPTEL courses, certifications, local chapters, and student enrollment data. Track student participation in online learning and certification programmes.',
    grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    shadow: 'rgba(102,126,234,0.3)',
    shadowHover: 'rgba(102,126,234,0.45)',
    component: NptelSection,
    programKey: null,
  },
  {
    id: 'pmc',
    icon: '📐',
    title: 'Palakkad Math Circle',
    subtitle: 'Mathematics enrichment sessions',
    expandedTitle: 'Mathematics enrichment sessions for school students.',
    description: 'Mathematics enrichment sessions for school students.',
    grad: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    shadow: 'rgba(137,247,254,0.3)',
    shadowHover: 'rgba(137,247,254,0.45)',
    component: OutreachSection,
    programKey: 'palakkad_math_circle',
  },
  {
    id: 'pbd',
    icon: '🌠',
    title: 'Pale Blue Dot',
    subtitle: 'Public lecture series',
    expandedTitle: 'Astronomy and space science public lecture series.',
    description: 'Astronomy and space science public lecture series.',
    grad: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
    shadow: 'rgba(255,8,68,0.3)',
    shadowHover: 'rgba(255,8,68,0.45)',
    component: OutreachSection,
    programKey: 'pale_blue_dot',
  },
  {
    id: 'sq',
    icon: '🔬',
    title: 'Science Quest',
    subtitle: 'Science outreach for school students',
    expandedTitle: 'Science outreach and laboratory programmes for school students.',
    description: 'Science outreach and laboratory programmes for school students.',
    grad: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    shadow: 'rgba(79,172,254,0.3)',
    shadowHover: 'rgba(79,172,254,0.45)',
    component: OutreachSection,
    programKey: 'science_quest',
  },
];

function StudentsEngagementSection({ user }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);

  const activeItem = SECTIONS.find((s) => s.id === activeSection);
  const SectionComponent = activeItem?.component ?? null;

  const grid = (
    <>
      <div style={{ marginTop: '1rem' }}>
        <div className="page-container-studentsEngagement">
          <div className='page-content-studentsEngagement'>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ margin: '0 0 0.5rem 0', color: '#111', textShadow: '0 1px 4px rgba(255,255,255,0.8)' }}>Students Engagement</h1>
              {/* <p style={{ color: '#666', fontSize: '1rem', margin: 0 }}>
                Student participation in NPTEL courses, certifications, and learning programmes
              </p> */}
            </div>

            <div className="students-section-grid">
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    background: s.grad,
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: `0 20px 40px ${s.shadow}`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = `0 25px 50px ${s.shadowHover}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 20px 40px ${s.shadow}`;
                  }}
                >
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                      <span style={{ fontSize: '64px', background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '24px', marginBottom: '16px', display: 'inline-block' }}>{s.icon}</span>
                      <h2 style={{ margin: 0, color: 'white', fontSize: '32px', fontWeight: 'bold', letterSpacing: '1px' }}>{s.title}</h2>
                      <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>{s.subtitle}</p>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '15px', lineHeight: '1.6', marginBottom: '30px', textAlign: 'center', padding: '0 10px' }}>
                      {s.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 24px', borderRadius: '40px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.3s ease', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <span style={{ color: 'white', fontSize: '16px', fontWeight: '500' }}>View →</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const expandedView = activeItem && SectionComponent && (
    <div className="expanded-section-view">
      <div className="section-wrapper">
        <div className="expanded-card-container">
          <div className="expanded-card-top-bar">
            <button className="back-button-inline" onClick={() => setActiveSection(null)}>
              <span className="back-arrow">←</span>
              <span>Back</span>
            </button>
            <div className="section-icon-header">{activeItem.icon}</div>
            <p className="section-overview-text">{activeItem.expandedTitle}</p>
          </div>
          <div className="expanded-card-content">
            <SectionComponent user={user} isPublicView={true} programKey={activeItem.programKey} />
          </div>
        </div>
      </div>
    </div>
  );

  const content = activeSection ? expandedView : grid;

  return (
    <div className="page-container">
      <div className="page-content">
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          ← Back to Outreach Extension
        </button>
        {content}
      </div>
    </div>
  );
}

export default StudentsEngagementSection;
