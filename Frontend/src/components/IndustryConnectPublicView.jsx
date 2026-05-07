import { useState } from 'react';
import './Page.css';
import './IndustryConnectMinimal.css';

import BusinessIcon from '@mui/icons-material/Business';
import HandshakeIcon from '@mui/icons-material/Handshake';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

import IcsrSection from './IcsrSection';
import ConclaveSection from './ConclaveSection';
import IndustryAdministrativeSection from './IndustryAdministrativeSection';

function IndustryConnectPublicView({ user }) {
  const isGuestUser = !user || user?.role_id === 1 || user?.isGuest === true;
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'administrative',
      title: 'Faculty Industry Stint',
      subtitle: '',
      expandedTitle: 'Bridging academia and industry through practical learning experiences',
      icon: <BusinessIcon htmlColor="#607d8b" fontSize="inherit" />,
      component: IndustryAdministrativeSection
    },
    {
      id: 'icsr',
      title: 'Industry Events',
      subtitle: '',
      expandedTitle: 'Fostering innovation through dynamic industry-academia collaboration.',
      icon: <HandshakeIcon htmlColor="#e91e63" fontSize="inherit" />,
      component: IcsrSection
    },
    {
      id: 'conclave',
      title: 'Industry Academic Conclave',
      subtitle: '',
      expandedTitle: 'Building bridges between industry leaders and academic excellence.',
      icon: <TrackChangesIcon htmlColor="#1976d2" fontSize="inherit" />,
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
          {/* Faculty Industry Stint */}
          {!isGuestUser && (
            <div className="industry-section-card" onClick={() => handleCardClick('administrative')} style={{ animationDelay: '0s' }}>
              <div className="industry-card-icon"><BusinessIcon htmlColor="#607d8b" fontSize="inherit" /></div>
              <h3 className="industry-card-title">Faculty Industry Stint</h3>
              <p className="industry-card-subtitle"></p>
              <div className="industry-card-arrow">→</div>
            </div>
          )}
          {/* Industry Events */}
          {!isGuestUser && (
            <div className="industry-section-card" onClick={() => handleCardClick('icsr')} style={{ animationDelay: '0.08s' }}>
              <div className="industry-card-icon"><HandshakeIcon htmlColor="#e91e63" fontSize="inherit" /></div>
              <h3 className="industry-card-title">Industry Events</h3>
              <p className="industry-card-subtitle"></p>
              <div className="industry-card-arrow">→</div>
            </div>
          )}
          {/* Industry Academic Conclave */}
          {!isGuestUser && (
            <div className="industry-section-card" onClick={() => handleCardClick('conclave')} style={{ animationDelay: '0.16s' }}>
              <div className="industry-card-icon"><TrackChangesIcon htmlColor="#1976d2" fontSize="inherit" /></div>
              <h3 className="industry-card-title">Industry Academic Conclave</h3>
              <p className="industry-card-subtitle"></p>
              <div className="industry-card-arrow">→</div>
            </div>
          )}
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