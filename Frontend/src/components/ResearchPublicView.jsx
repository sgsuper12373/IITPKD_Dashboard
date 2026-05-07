import { useState } from 'react';
import './Page.css';
import './ResearchMinimal.css';

import ScienceIcon from '@mui/icons-material/Science';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HandshakeIcon from '@mui/icons-material/Handshake';

import ResearchIcsrSection from './ResearchIcsrSection';
import ResearchLibrarySection from './ResearchLibrarySection';

function ResearchPublicView({ user }) {
  const isGuestUser = !user || user?.role_id === 1 || user?.isGuest === true;
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'icsr',
      title: 'Sponsored and Consultancy Projects',
      subtitle: '',
      expandedTitle: 'Driving innovation through industry partnerships and funded research',
      icon: <ScienceIcon htmlColor="#00bcd4" fontSize="inherit" />,
      component: ResearchIcsrSection
    },
    {
      id: 'library',
      title: 'Research Publications',
      subtitle: '',
      expandedTitle: 'Advancing knowledge through publications and research contributions',
      icon: <MenuBookIcon htmlColor="#8d6e63" fontSize="inherit" />,
      component: ResearchLibrarySection
    },
    {
      id: 'icsr-mous',
      title: 'Industry Collaboration',
      subtitle: '',
      expandedTitle: 'Track and manage collaborative IC&SR MoUs',
      icon: <HandshakeIcon htmlColor="#e91e63" fontSize="inherit" />,
      component: (props) => <ResearchIcsrSection {...props} mouOnly={true} />
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
        <div className={`research-page-header ${activeSection ? 'header-minimized' : ''}`}>
        </div>

        {/* Card Grid View */}
        <div className={`research-sections-grid ${activeSection ? 'grid-hidden' : ''}`}>
          {/* Sponsored and Consultancy Projects */}
          {!isGuestUser && (
            <div className="research-section-card" onClick={() => handleCardClick('icsr')} style={{ animationDelay: '0s' }}>
              <div className="research-card-icon"><ScienceIcon htmlColor="#00bcd4" fontSize="inherit" /></div>
              <h3 className="research-card-title">Sponsored and Consultancy Projects</h3>
              <p className="research-card-subtitle"></p>
              <div className="research-card-arrow">→</div>
            </div>
          )}
          {/* Research Publications */}
          {!isGuestUser && (
            <div className="research-section-card" onClick={() => handleCardClick('library')} style={{ animationDelay: '0.1s' }}>
              <div className="research-card-icon"><MenuBookIcon htmlColor="#8d6e63" fontSize="inherit" /></div>
              <h3 className="research-card-title">Research Publications</h3>
              <p className="research-card-subtitle"></p>
              <div className="research-card-arrow">→</div>
            </div>
          )}
          {/* Industry Collaboration */}
          {!isGuestUser && (
            <div className="research-section-card" onClick={() => handleCardClick('icsr-mous')} style={{ animationDelay: '0.2s' }}>
              <div className="research-card-icon"><HandshakeIcon htmlColor="#e91e63" fontSize="inherit" /></div>
              <h3 className="research-card-title">Industry Collaboration</h3>
              <p className="research-card-subtitle"></p>
              <div className="research-card-arrow">→</div>
            </div>
          )}
        </div>

        {/* Expanded Section View */}
        {activeSection && (
          <div className="research-expanded-view">
            {sections.map((section) => {
              if (section.id === activeSection) {
                const SectionComponent = section.component;
                return (
                  <div key={section.id} className="research-section-wrapper">
                    {/* White Card Container */}
                    <div className="research-expanded-container">
                      {/* Top Bar: Back Button + Icon + Title */}
                      <div className="research-top-bar">
                        <button className="research-back-button" onClick={handleBackClick}>
                          <span className="research-back-arrow">←</span>
                          <span>Back</span>
                        </button>

                        <div className="research-icon-header">{section.icon}</div>
                        <p className="research-overview-text">{section.expandedTitle}</p>
                      </div>

                      {/* Section Content */}
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