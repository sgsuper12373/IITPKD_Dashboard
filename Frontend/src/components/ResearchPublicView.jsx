import { useState } from 'react';
import './Page.css';
import './ResearchMinimal.css';

import ResearchIcsrSection from './ResearchIcsrSection';
import ResearchLibrarySection from './ResearchLibrarySection';
import Patents from './Patents';

function ResearchPublicView({ user }) {
  const [activeSection, setActiveSection] = useState(null);

  const baseSections = [
    {
      id: 'icsr',
      title: 'Sponsored and Consultancy Projects',
      subtitle: '',
      expandedTitle: 'Driving innovation through industry partnerships and funded research',
      icon: '🔬',
      component: ResearchIcsrSection
    },
    {
      id: 'library',
      title: 'Research Publications',
      subtitle: '',
      expandedTitle: 'Advancing knowledge through publications and research contributions',
      icon: '📚',
      component: ResearchLibrarySection
    },
    {
      id: 'icsr-mous',
      title: 'Research Collaboration',
      subtitle: '',
      expandedTitle: 'Track and manage collaborative IC&SR MoUs',
      icon: '🤝',
      component: (props) => <ResearchIcsrSection {...props} mouOnly={true} />
    }
  ];

  const patentsSection = {
    id: 'patents',
    title: 'Patents',
    subtitle: '',
    expandedTitle: 'Explore patents and intellectual property contributions',
    icon: '💡',
    component: Patents
  };

  const sections =
    user?.role_id === 0 || user?.role_id === 1
      ? [...baseSections, patentsSection]
      : baseSections;

  const handleCardClick = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleBackClick = () => {
    setActiveSection(null);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <div className={`research-page-header ${activeSection ? 'header-minimized' : ''}`}>
        </div>

        <div className={`research-sections-grid ${activeSection ? 'grid-hidden' : ''}`}>
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="research-section-card"
              onClick={() => handleCardClick(section.id)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="research-card-icon">{section.icon}</div>
              <h3 className="research-card-title">{section.title}</h3>
              <p className="research-card-subtitle">{section.subtitle}</p>
              <div className="research-card-arrow">→</div>
            </div>
          ))}
        </div>

        {activeSection && (
          <div className="research-expanded-view">
            {sections.map((section) => {
              if (section.id === activeSection) {
                const SectionComponent = section.component;
                return (
                  <div key={section.id} className="research-section-wrapper">
                    <div className="research-expanded-container">
                      <div className="research-top-bar">
                        <button className="research-back-button" onClick={handleBackClick}>
                          <span className="research-back-arrow">←</span>
                          <span>Back</span>
                        </button>
                        <div className="research-icon-header">{section.icon}</div>
                        <p className="research-overview-text">{section.expandedTitle}</p>
                      </div>
                      <div className="research-content-area">
                        <SectionComponent user={user} isPublicView={true} />
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResearchPublicView;