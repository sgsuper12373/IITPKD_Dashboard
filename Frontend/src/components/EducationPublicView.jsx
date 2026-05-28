import { useState } from 'react';
import './Page.css';
import './EducationMinimal.css';

import PlacementSection from './PlacementSection';
import EducationAcademicSection from './EducationAcademicSection';
import EducationIarSection from './EducationIarSection';

function EducationPublicView({ user, embedded }) {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'placements',
      title: 'Placement Statistics',
      subtitle: '',
      expandedTitle: 'Empowering careers through industry-leading placement opportunities.',
      icon: '💼',
      component: PlacementSection
    },
    {
      id: 'academic',
      title: 'Courses Details',
      subtitle: '',
      expandedTitle: 'Advancing academic excellence through innovative programs.',
      icon: '🎓',
      component: EducationAcademicSection
    },
    {
      id: 'iar',
      title: 'Academic Collaborations',
      subtitle: '',
      expandedTitle: 'Track and manage collaborations with Education Institutes',
      icon: '🤝',
      component: EducationIarSection
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
      <div className={`education-page-header ${activeSection ? 'header-minimized' : ''}`} />

      {/* Card Grid View */}
      <div className={`education-sections-grid ${activeSection ? 'grid-hidden' : ''}`}>
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="education-section-card"
            onClick={() => handleCardClick(section.id)}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="education-card-icon">{section.icon}</div>
            <h3 className="education-card-title">{section.title}</h3>
            <p className="education-card-subtitle">{section.subtitle}</p>
            <div className="education-card-arrow">→</div>
          </div>
        ))}
      </div>

      {/* Expanded Section View */}
      {activeSection && (
        <div className="education-expanded-view">
          {sections.map((section) => {
            if (section.id === activeSection) {
              const SectionComponent = section.component;
              return (
                <div key={section.id} className="education-section-wrapper">
                  <div className="education-expanded-container">
                    <div className="education-top-bar">
                      <button className="education-back-button" onClick={handleBackClick}>
                        <span className="education-back-arrow">←</span>
                        <span>Back</span>
                      </button>
                      <div className="education-icon-header">{section.icon}</div>
                      <p className="education-overview-text">{section.expandedTitle}</p>
                    </div>
                    <div className="education-content-area">
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

export default EducationPublicView;
