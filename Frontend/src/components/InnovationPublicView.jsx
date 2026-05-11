import { useState } from 'react';
import './Page.css';
import './InnovationMinimal.css';

import IptifSection from './IptifSection';
import TechinSection from './TechinSection';
import HomeGroundStartup from './HomeGroundStartup';

function InnovationPublicView({ user }) {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'home-ground-startup',
      title: 'Home Grown Startup',
      subtitle: '',
      expandedTitle: 'Internal startups incubated through IPTIF and TechIn programs',
      icon: '🏠',
      component: HomeGroundStartup
    },
    {
      id: 'startups',
      title: 'IIT Palakkad Technology IHub Foundation (IPTIF)',
      subtitle: '',
      expandedTitle: 'Nurturing startups and innovation projects at IPTIF',
      icon: '💡',
      component: IptifSection
    },
    {
      id: 'innovation-hub',
      title: 'Technology Innovation Foundation of IIT Palakkad (TECHIN)',
      subtitle: '',
      expandedTitle: 'Driving innovation through cutting-edge research and development',
      icon: '🚀',
      component: TechinSection
    }
  ];

  const handleCardClick = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleBackClick = () => {
    setActiveSection(null);
  };

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Page Header - visible only in card grid view */}
        {!activeSection && (
          <div className="innovation-page-header">
          </div>
        )}

        {/* Card Grid View */}
        {!activeSection && (
          <div className="innovation-sections-grid">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="innovation-section-card"
                onClick={() => handleCardClick(section.id)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="innovation-card-icon">{section.icon}</div>
                <h3 className="innovation-card-title">{section.title}</h3>
                <p className="innovation-card-subtitle">{section.subtitle}</p>
                <div className="innovation-card-arrow">→</div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Section View */}
        {activeSection && (
          <div className="innovation-expanded-view">
            {sections.map((section) => {
              if (section.id === activeSection) {
                const SectionComponent = section.component;
                return (
                  <div key={section.id} className="innovation-section-wrapper">
                    {/* White Card Container */}
                    <div className="innovation-expanded-container">
                      {/* Top Bar: Back Button + Icon + Title */}
                      <div className="innovation-top-bar">
                        <button className="innovation-back-button" onClick={handleBackClick}>
                          <span className="innovation-back-arrow">←</span>
                          <span>Back</span>
                        </button>

                        <div className="innovation-icon-header">{section.icon}</div>
                        <p className="innovation-overview-text">{section.expandedTitle}</p>
                      </div>

                      {/* Section Content */}
                      <div className="innovation-content-area">
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

export default InnovationPublicView;