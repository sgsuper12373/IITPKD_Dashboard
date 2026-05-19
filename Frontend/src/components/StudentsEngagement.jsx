import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <div className="se-intro-wrap">
        <div className="page-container-studentsEngagement">
          <div className="page-content-studentsEngagement">
            <div className="se-header-wrap">
              <h1 className="se-heading">Students Engagement</h1>
            </div>

            <div className="se-cards-grid">
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  className="se-card"
                  onClick={() => setActiveSection(s.id)}
                  style={{ background: s.grad, boxShadow: `0 20px 40px ${s.shadow}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 25px 50px ${s.shadowHover}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 20px 40px ${s.shadow}`; }}
                >
                  <div className="se-card-decor1" />
                  <div className="se-card-decor2" />

                  <div className="se-card-content">
                    <div className="se-card-header">
                      <span className="se-card-icon-wrap">{s.icon}</span>
                      <h2 className="se-card-h2">{s.title}</h2>
                      <p className="se-card-subtitle">{s.subtitle}</p>
                    </div>
                    <p className="se-card-desc">{s.description}</p>
                    <div className="se-card-footer">
                      <div className="se-view-btn">
                        <span className="se-view-label">View &#8594;</span>
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
              <span className="back-arrow">&#8592;</span>
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
          &#8592; Back to Outreach Extension
        </button>
        {content}
      </div>
    </div>
  );
}

export default StudentsEngagementSection;
