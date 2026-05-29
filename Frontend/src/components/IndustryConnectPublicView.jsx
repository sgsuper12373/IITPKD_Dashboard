import { useState } from 'react';
import './Page.css';
import './PeopleCampus.css';
import './IndustryConnectMinimal.css';

import IcsrSection from './IcsrSection';
import ConclaveSection from './ConclaveSection';
import IndustryAdministrativeSection from './IndustryAdministrativeSection';

function IndustryConnectPublicView({ user, embedded }) {
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

  const inner = (
    <>
      <div className={`industry-page-header ${activeSection ? 'header-minimized' : ''}`} />

      {/* Card Grid View */}
      <div className={`people-campus-grid ${activeSection ? 'grid-hidden' : ''}`}>
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="people-campus-card"
            onClick={() => handleCardClick(section.id)}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="card-icon">{section.icon}</div>
            <h3 className="card-title">{section.title}</h3>
            <p className="card-description">{section.subtitle}</p>
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
                  <div className="industry-expanded-container">
                    <div className="industry-top-bar">
                      <button className="industry-back-button" onClick={handleBackClick}>
                        <span className="industry-back-arrow">←</span>
                        <span>Back</span>
                      </button>
                      <div className="industry-icon-header">{section.icon}</div>
                      <p className="industry-overview-text">{section.expandedTitle}</p>
                    </div>
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
    </>
  );

  if (embedded) return inner;
  return (
    <div className="page-container">
      <div className="page-content">
        {inner}
      </div>
    </div>
  );
}

export default IndustryConnectPublicView;
