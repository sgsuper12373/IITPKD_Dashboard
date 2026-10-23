import { useState } from 'react';
import { PUBLIC_PREVIEW_USER, PublicPreviewContext } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './PeopleCampusMinimal.css';

import AcademicSection from './AcademicSection';
import AdministrativeSection from './AdministrativeSection';
import IgrcSection from './IgrcSection';
import IccSection from './IccSection';
import EwdSection from './EwdSection';
import IarSection from './IarSection';
import SectionSuggestions from '../home/SectionSuggestions';

function PeopleCampusPublicView({ user: realUser, embedded }) {
  // embedded = opened via "View Public Page": render as a public (role 0) visitor
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    {
      id: 'academic',
      title: 'Student Overview',
      subtitle: '',
      expandedTitle: 'Meet the minds shaping tomorrow.',
      icon: <DashboardIcon name="students" />,
      component: AcademicSection
    },
    {
      id: 'administrative',
      title: 'Employee Overview',
      subtitle: '',
      expandedTitle: 'Dedicated Professionals. One Shared Mission.',
      icon: <DashboardIcon name="institute" />,
      component: AdministrativeSection
    },
    /*{
      id: 'grievances',
      title: 'Grievances',
      subtitle: '',
      expandedTitle: 'Ensuring fairness, safety, and respect for all members of our community',
      icon: <DashboardIcon name="audit" />,
      isGrievances: true
    },
    {
      id: 'ewd',
      title: 'Infrastructure',
      subtitle: '',
      expandedTitle: 'Sustaining Today. Developing for Tomorrow.',
      icon: <DashboardIcon name="industry" />,
      component: EwdSection
    },*/
    {
      id: 'iar',
      title: 'Our Alumni',
      subtitle: '',
      expandedTitle: 'Fostering global partnerships and maintaining strong alumni connections',
      icon: <DashboardIcon name="global" />,
      component: IarSection
    }
  ];

  // Hide Grievances and Infrastructure for non-admin users (role_id !== 0) or unauthenticated users
  const visibleSections = (!user || user.role_id === 0)
    ? sections.filter(s => s.id !== 'grievances' && s.id !== 'ewd')
    : sections;

  const handleCardClick = (sectionId) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleBackClick = () => {
    setActiveSection(null);
  };

  const inner = (
    <>
      {/* Card Grid View */}
      <div className={`people-campus-grid ${activeSection ? 'grid-hidden' : ''}`}>
        {visibleSections.map((section, index) => (
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
        <div className="expanded-section-view">
          {visibleSections.map((section) => {
            if (section.id === activeSection) {
              return (
                <div key={section.id} className="section-wrapper">
                  <div className="expanded-card-container">
                    <div className="expanded-card-top-bar">
                      <button className="back-button-inline" onClick={handleBackClick}>
                        <span className="back-arrow">←</span>
                        <span>Back</span>
                      </button>
                      <div className="section-icon-header">{section.icon}</div>
                      <p className="section-overview-text">{section.expandedTitle}</p>
                    </div>

                    <div className="expanded-card-content">
                      {section.isGrievances ? (
                        <div className="grievances-combined-section">
                          <div className="grievance-subsection">
                            <h2 className="grievance-section-h2">
                              Internal Grievance Resolution Cell (IGRC)
                            </h2>
                            <div className="subsection-content">
                              <IgrcSection user={user} isPublicView={true} />
                            </div>
                          </div>
                          <div className="grievance-subsection grievance-subsection--second">
                            <h2 className="grievance-section-h2">
                              Internal Complaints Committee (ICC)
                            </h2>
                            <div className="subsection-content">
                              <IccSection user={user} isPublicView={true} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const SectionComponent = section.component;
                          return <SectionComponent user={user} isPublicView={true} />;
                        })()
                      )}
                    </div>
                    <SectionSuggestions
                      pillar="people-campus"
                      sectionId={section.id}
                      siblings={visibleSections.filter((s) => s.id !== section.id)}
                      onOpen={setActiveSection}
                    />
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

  if (embedded) return <PublicPreviewContext.Provider value={true}>{inner}</PublicPreviewContext.Provider>;
  return (
    <div className="page-container">
      <div className="page-content">
        {inner}
      </div>
    </div>
  );
}

export default PeopleCampusPublicView;
