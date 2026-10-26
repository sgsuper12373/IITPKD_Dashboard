import { useState } from 'react';
import { PUBLIC_PREVIEW_USER, PublicPreviewContext } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './ResearchMinimal.css';

import ResearchIcsrSection from './ResearchIcsrSection';
import ResearchLibrarySection from './ResearchLibrarySection';
import Patents from './Patents';
import SectionSuggestions from '../home/SectionSuggestions';

function ResearchPublicView({ user: realUser, embedded }) {
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;

  const baseSections = [
    {
      id: 'icsr',
      title: 'Sponsored and Consultancy Projects',
      expandedTitle: 'Driving innovation through industry partnerships and funded research',
      icon: <DashboardIcon name="research" />,
      component: ResearchIcsrSection
    },
    {
      id: 'library',
      title: 'Research Publications',
      expandedTitle: 'Advancing knowledge through publications and research contributions',
      icon: <DashboardIcon name="ug" />,
      component: ResearchLibrarySection
    },
    {
      id: 'icsr-mous',
      title: 'Research Collaboration',
      expandedTitle: 'Track and manage collaborative IC&SR MoUs',
      icon: <DashboardIcon name="link" />,
      component: (props) => <ResearchIcsrSection {...props} mouOnly={true} />
    }
  ];

  const patentsSection = {
    id: 'patents',
    title: 'Patents',
    expandedTitle: 'Explore patents and intellectual property contributions',
    icon: <DashboardIcon name="innovation" />,
    component: Patents
  };

  const sections =
    user?.role_id === 0 || user?.role_id === 1 || user?.role_id === 2
      ? [...baseSections, patentsSection]
      : baseSections;

  const [activeTab, setActiveTab] = useState(sections[0]?.id);
  const activeSection = sections.find(s => s.id === activeTab);

  const inner = (
    <>
      <nav className="pc-tab-bar" role="tablist" aria-label="Research sections">
        {sections.map((section) => (
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

      {activeSection && (
        <div className="pc-tab-panel" role="tabpanel" key={activeSection.id}>
          <p className="pc-tab-panel__subtitle">{activeSection.expandedTitle}</p>
          <div className="pc-tab-panel__content">
            {(() => {
              const SectionComponent = activeSection.component;
              return <SectionComponent user={user} isPublicView={true} />;
            })()}
          </div>
          <SectionSuggestions
            pillar="research"
            sectionId={activeSection.id}
            siblings={sections.filter((s) => s.id !== activeSection.id)}
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

export default ResearchPublicView;
