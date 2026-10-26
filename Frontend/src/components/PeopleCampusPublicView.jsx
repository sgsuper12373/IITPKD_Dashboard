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
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;

  const sections = [
    {
      id: 'academic',
      title: 'Student Overview',
      expandedTitle: 'Meet the minds shaping tomorrow.',
      icon: <DashboardIcon name="students" />,
      component: AcademicSection
    },
    {
      id: 'administrative',
      title: 'Employee Overview',
      expandedTitle: 'Dedicated Professionals. One Shared Mission.',
      icon: <DashboardIcon name="institute" />,
      component: AdministrativeSection
    },
    {
      id: 'iar',
      title: 'Our Alumni',
      expandedTitle: 'Fostering global partnerships and maintaining strong alumni connections',
      icon: <DashboardIcon name="global" />,
      component: IarSection
    }
  ];

  const visibleSections = (!user || user.role_id === 0)
    ? sections.filter(s => s.id !== 'grievances' && s.id !== 'ewd')
    : sections;

  const [activeTab, setActiveTab] = useState(visibleSections[0]?.id);

  const activeSection = visibleSections.find(s => s.id === activeTab);

  const inner = (
    <>
      {/* Horizontal tab bar */}
      <nav className="pc-tab-bar" role="tablist" aria-label="People &amp; Campus sections">
        {visibleSections.map((section) => (
          <button
            key={section.id}
            role="tab"
            aria-selected={activeTab === section.id}
            className={`pc-tab${activeTab === section.id ? ' pc-tab--active' : ''}`}
            onClick={() => setActiveTab(section.id)}
          >
            <span className="pc-tab__icon">{section.icon}</span>
            <span className="pc-tab__label">{section.title}</span>
          </button>
        ))}
      </nav>

      {/* Active section content */}
      {activeSection && (
        <div className="pc-tab-panel" role="tabpanel" key={activeSection.id}>
          <p className="pc-tab-panel__subtitle">{activeSection.expandedTitle}</p>
          <div className="pc-tab-panel__content">
            {activeSection.isGrievances ? (
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
                const SectionComponent = activeSection.component;
                return <SectionComponent user={user} isPublicView={true} />;
              })()
            )}
          </div>
          <SectionSuggestions
            pillar="people-campus"
            sectionId={activeSection.id}
            siblings={visibleSections.filter((s) => s.id !== activeSection.id)}
            onOpen={setActiveTab}
          />
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
