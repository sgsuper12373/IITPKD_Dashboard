import { useState } from 'react';
import './Page.css';
import './PeopleCampus.css';
import './PeopleCampusMinimal.css';

import AcademicSection from './AcademicSection';
import AdministrativeSection from './AdministrativeSection';
import IgrcSection from './IgrcSection';
import IccSection from './IccSection';
import EwdSection from './EwdSection';
import IarSection from './IarSection';

import SchoolIcon from '@mui/icons-material/School';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BalanceIcon from '@mui/icons-material/Balance';
import ConstructionIcon from '@mui/icons-material/Construction';
import PublicIcon from '@mui/icons-material/Public';

function PeopleCampusPublicView({ user }) {
  const isGuestUser = !user || user?.role_id === 1 || user?.isGuest === true;
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'academic',
      title: 'Student Overview',
      subtitle: '',
      expandedTitle: 'Meet the minds shaping tomorrow.',
      icon: <SchoolIcon htmlColor="#f57c00" fontSize="inherit" />,
      component: AcademicSection
    },
    {
      id: 'administrative',
      title: 'Employee Overview',
      subtitle: '',
      expandedTitle: 'Dedicated Professionals. One Shared Mission.',
      icon: <AccountBalanceIcon htmlColor="#3f51b5" fontSize="inherit" />,
      component: AdministrativeSection
    },
    {
      id: 'grievances',
      title: 'Grievances',
      subtitle: '',
      expandedTitle: 'Ensuring fairness, safety, and respect for all members of our community',
      icon: <BalanceIcon htmlColor="#ff9800" fontSize="inherit" />,
      isGrievances: true // Special flag to handle dual components
    },
    {
      id: 'ewd',
      title: 'Infrastructure',
      subtitle: '',
      expandedTitle: 'Sustaining Today. Developing for Tomorrow.',
      icon: <ConstructionIcon htmlColor="#ff9800" fontSize="inherit" />,
      component: EwdSection
    },
    {
      id: 'iar',
      title: 'Our Alumni',
      subtitle: '',
      expandedTitle: 'Fostering global partnerships and maintaining strong alumni connections',
      icon: <PublicIcon htmlColor="#4caf50" fontSize="inherit" />,
      component: IarSection
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
        {/* Card Grid View */}
        <div className={`minimal-sections-grid ${activeSection ? 'grid-hidden' : ''}`}>
          {/* Student Overview */}
          {!isGuestUser && (
            <div className="minimal-section-card" onClick={() => handleCardClick('academic')} style={{ animationDelay: '0s' }}>
              <div className="card-icon-minimal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SchoolIcon htmlColor="#f57c00" fontSize="inherit" /></div>
              <h3 className="card-title-minimal">Student Overview</h3>
              <p className="card-subtitle-minimal"></p>
              <div className="card-arrow">→</div>
            </div>
          )}
          {/* Employee Overview */}
          {!isGuestUser && (
            <div className="minimal-section-card" onClick={() => handleCardClick('administrative')} style={{ animationDelay: '0.08s' }}>
              <div className="card-icon-minimal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AccountBalanceIcon htmlColor="#3f51b5" fontSize="inherit" /></div>
              <h3 className="card-title-minimal">Employee Overview</h3>
              <p className="card-subtitle-minimal"></p>
              <div className="card-arrow">→</div>
            </div>
          )}
          {/* Grievances */}
          {!isGuestUser && (
            <div className="minimal-section-card" onClick={() => handleCardClick('grievances')} style={{ animationDelay: '0.16s' }}>
              <div className="card-icon-minimal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BalanceIcon htmlColor="#ff9800" fontSize="inherit" /></div>
              <h3 className="card-title-minimal">Grievances</h3>
              <p className="card-subtitle-minimal"></p>
              <div className="card-arrow">→</div>
            </div>
          )}
          {/* Infrastructure */}
          {!isGuestUser && (
            <div className="minimal-section-card" onClick={() => handleCardClick('ewd')} style={{ animationDelay: '0.24s' }}>
              <div className="card-icon-minimal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ConstructionIcon htmlColor="#ff9800" fontSize="inherit" /></div>
              <h3 className="card-title-minimal">Infrastructure</h3>
              <p className="card-subtitle-minimal"></p>
              <div className="card-arrow">→</div>
            </div>
          )}
          {/* Our Alumni */}
          {!isGuestUser && (
            <div className="minimal-section-card" onClick={() => handleCardClick('iar')} style={{ animationDelay: '0.32s' }}>
              <div className="card-icon-minimal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PublicIcon htmlColor="#4caf50" fontSize="inherit" /></div>
              <h3 className="card-title-minimal">Our Alumni</h3>
              <p className="card-subtitle-minimal"></p>
              <div className="card-arrow">→</div>
            </div>
          )}
        </div>

        {/* Expanded Section View */}
        {activeSection && (
          <div className="expanded-section-view">
            {sections.map((section) => {
              if (section.id === activeSection) {
                return (
                  <div key={section.id} className="section-wrapper">
                    {/* White Card Container */}
                    <div className="expanded-card-container">
                      {/* Single Row: Back Button + Icon + Expanded Title */}
                      <div className="expanded-card-top-bar">
                        <button className="back-button-inline" onClick={handleBackClick}>
                          <span className="back-arrow">←</span>
                          <span>Back</span>
                        </button>

                        <div className="section-icon-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{section.icon}</div>
                        <p className="section-overview-text">{section.expandedTitle}</p>
                      </div>

                      {/* Section Content */}
                      <div className="expanded-card-content">
                        {section.isGrievances ? (
                          // Special handling for Grievances - render both IGRC and ICC
                          <div className="grievances-combined-section">
                            {/* IGRC Section */}
                            <div className="grievance-subsection">
                              <h2 style={{ marginBottom: '1.5rem', fontWeight: '700', color: '#1a1a1a', fontSize: '1.5rem' }}>
                                Internal Grievance Resolution Cell (IGRC)
                              </h2>
                              <div className="subsection-content">
                                <IgrcSection user={user} isPublicView={true} />
                              </div>
                            </div>

                            {/* ICC Section */}
                            <div className="grievance-subsection" style={{ marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid #eee' }}>
                              <h2 style={{ marginBottom: '1.5rem', fontWeight: '700', color: '#1a1a1a', fontSize: '1.5rem' }}>
                                Internal Complaints Committee (ICC)
                              </h2>
                              <div className="subsection-content">
                                <IccSection user={user} isPublicView={true} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Normal single component rendering
                          (() => {
                            const SectionComponent = section.component;
                            return <SectionComponent user={user} isPublicView={true} />;
                          })()
                        )}
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

export default PeopleCampusPublicView;