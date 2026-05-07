import { useState } from 'react';
import './Page.css';
import './InnovationMinimal.css';

import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import IptifSection from './IptifSection';
import TechinSection from './TechinSection';

function InnovationPublicView({ user }) {
  const isGuestUser = !user || user?.role_id === 1 || user?.isGuest === true;
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'startups',
      title: 'IIT Palakkad Technology IHub Foundation (IPTIF)',
      subtitle: 'Innovation & Entrepreneurship',
      expandedTitle: 'Nurturing startups and innovation projects at IPTIF',
      icon: <LightbulbIcon htmlColor="#fbc02d" fontSize="inherit" />,
      component: IptifSection
    },
    {
      id: 'innovation-hub',
      title: 'Technology Innovation Foundation of IIT Palakkad (TECHIN)',
      subtitle: 'Research & Development',
      expandedTitle: 'Driving innovation through cutting-edge research and development',
      icon: <RocketLaunchIcon htmlColor="#f44336" fontSize="inherit" />,
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
            {/* IIT Palakkad Technology IHub Foundation (IPTIF) */}
            {!isGuestUser && (
              <div className="innovation-section-card" onClick={() => handleCardClick('startups')} style={{ animationDelay: '0s' }}>
                <div className="innovation-card-icon"><LightbulbIcon htmlColor="#fbc02d" fontSize="inherit" /></div>
                <h3 className="innovation-card-title">IIT Palakkad Technology IHub Foundation (IPTIF)</h3>
                <p className="innovation-card-subtitle">Innovation & Entrepreneurship</p>
                <div className="innovation-card-arrow">→</div>
              </div>
            )}
            {/* Technology Innovation Foundation of IIT Palakkad (TECHIN) */}
            {!isGuestUser && (
              <div className="innovation-section-card" onClick={() => handleCardClick('innovation-hub')} style={{ animationDelay: '0.1s' }}>
                <div className="innovation-card-icon"><RocketLaunchIcon htmlColor="#f44336" fontSize="inherit" /></div>
                <h3 className="innovation-card-title">Technology Innovation Foundation of IIT Palakkad (TECHIN)</h3>
                <p className="innovation-card-subtitle">Research & Development</p>
                <div className="innovation-card-arrow">→</div>
              </div>
            )}
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