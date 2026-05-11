import { useState } from 'react';
import './Page.css';
import './IndustryConnectMinimal.css';

import IcsrSection from './IcsrSection';
import ConclaveSection from './ConclaveSection';
import IndustryAdministrativeSection from './IndustryAdministrativeSection';

function IndustryConnectPublicView({ user }) {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'administrative',
      title: 'Externship',
      subtitle: 'Faculty Engagement with Industries',
      expandedTitle: 'Bridging academia and industry through Externships',
      icon: '🏢',
      component: IndustryAdministrativeSection
    },
    {
      id: 'icsr',
      title: 'Industry Events',
      subtitle: '',
      expandedTitle: 'Fostering innovation through dynamic industry-academia collaboration.',
      icon: '🤝',
      component: IcsrSection
    },
    {
      id: 'conclave',
      title: 'Industry Academic Conclave',
      subtitle: '',
      expandedTitle: 'Building bridges between industry leaders and academic excellence.',
      icon: '🎯',
      component: ConclaveSection
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
        {/* Page Header - visible in both views */}
        <div className={`industry-page-header ${activeSection ? 'header-minimized' : ''}`}>
        </div>

        {/* Card Grid View */}
        <div className={`industry-sections-grid ${activeSection ? 'grid-hidden' : ''}`}>
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="industry-section-card"
              onClick={() => handleCardClick(section.id)}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="industry-card-icon">{section.icon}</div>
              <h3 className="industry-card-title">{section.title}</h3>
              <p className="industry-card-subtitle">{section.subtitle}</p>
              <div className="industry-card-arrow">→</div>
            </div>
          ))}
        </div>

        {/* Expanded Section View */}
        {activeSection && (
          <div className="industry-expanded-view">
            {sections.map((section) => {
              if (section.id === activeSection) {
                const SectionComponent = section.component;
                return (
                  <div key={section.id} className="industry-section-wrapper">
                    {/* White Card Container */}
                    <div className="industry-expanded-container">
                      {/* Top Bar: Back Button + Icon + Title */}
                      <div className="industry-top-bar">
                        <button className="industry-back-button" onClick={handleBackClick}>
                          <span className="industry-back-arrow">←</span>
                          <span>Back</span>
                        </button>

                        <div className="industry-icon-header">{section.icon}</div>
                        <p className="industry-overview-text">{section.expandedTitle}</p>
                      </div>

                      {/* Section Content */}
                      <div className="industry-content-area">
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

export default IndustryConnectPublicView;