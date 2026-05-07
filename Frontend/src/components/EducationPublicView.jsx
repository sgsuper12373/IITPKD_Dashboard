import { useState } from 'react';
import './Page.css';
import './EducationMinimal.css';

import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import HandshakeIcon from '@mui/icons-material/Handshake';

import PlacementSection from './PlacementSection';
import EducationAcademicSection from './EducationAcademicSection';
import EducationIarSection from './EducationIarSection';

function EducationPublicView({ user }) {
  const isGuestUser = !user || user?.role_id === 1 || user?.isGuest === true;
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'placements',
      title: 'Placement Statistics',
      subtitle: '',
      expandedTitle: 'Empowering careers through industry-leading placement opportunities.',
      icon: <WorkIcon htmlColor="#1976d2" fontSize="inherit" />,
      component: PlacementSection
    },
    {
      id: 'academic',
      title: 'Courses Details',
      subtitle: '',
      expandedTitle: 'Advancing academic excellence through innovative programs.',
      icon: <SchoolIcon htmlColor="#f57c00" fontSize="inherit" />,
      component: EducationAcademicSection
    },
    {
      id: 'iar',
      title: 'Education Collaborations',
      subtitle: '',
      expandedTitle: 'Track and manage collaborations with Education Institutes',
      icon: <HandshakeIcon htmlColor="#e91e63" fontSize="inherit" />,
      component: EducationIarSection
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
        <div className={`education-page-header ${activeSection ? 'header-minimized' : ''}`}>
        </div>

        {/* Card Grid View */}
        <div className={`education-sections-grid ${activeSection ? 'grid-hidden' : ''}`}>
          {/* Placement Statistics */}
          {!isGuestUser && (
            <div className="education-section-card" onClick={() => handleCardClick('placements')} style={{ animationDelay: '0s' }}>
              <div className="education-card-icon"><WorkIcon htmlColor="#1976d2" fontSize="inherit" /></div>
              <h3 className="education-card-title">Placement Statistics</h3>
              <p className="education-card-subtitle"></p>
              <div className="education-card-arrow">→</div>
            </div>
          )}
          {/* Courses Details */}
          {!isGuestUser && (
            <div className="education-section-card" onClick={() => handleCardClick('academic')} style={{ animationDelay: '0.08s' }}>
              <div className="education-card-icon"><SchoolIcon htmlColor="#f57c00" fontSize="inherit" /></div>
              <h3 className="education-card-title">Courses Details</h3>
              <p className="education-card-subtitle"></p>
              <div className="education-card-arrow">→</div>
            </div>
          )}
          {/* Education Collaborations */}
          {!isGuestUser && (
            <div className="education-section-card" onClick={() => handleCardClick('iar')} style={{ animationDelay: '0.16s' }}>
              <div className="education-card-icon"><HandshakeIcon htmlColor="#e91e63" fontSize="inherit" /></div>
              <h3 className="education-card-title">Education Collaborations</h3>
              <p className="education-card-subtitle"></p>
              <div className="education-card-arrow">→</div>
            </div>
          )}
        </div>

        {/* Expanded Section View */}
        {activeSection && (
          <div className="education-expanded-view">
            {sections.map((section) => {
              if (section.id === activeSection) {
                const SectionComponent = section.component;
                return (
                  <div key={section.id} className="education-section-wrapper">
                    {/* White Card Container */}
                    <div className="education-expanded-container">
                      {/* Top Bar: Back Button + Icon + Title */}
                      <div className="education-top-bar">
                        <button className="education-back-button" onClick={handleBackClick}>
                          <span className="education-back-arrow">←</span>
                          <span>Back</span>
                        </button>

                        <div className="education-icon-header">{section.icon}</div>
                        <p className="education-overview-text">{section.expandedTitle}</p>
                      </div>

                      {/* Section Content */}
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
      </div>
    </div>
  );
}

export default EducationPublicView;