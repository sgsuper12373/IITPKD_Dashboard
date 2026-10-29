import { useState } from 'react';
import { PUBLIC_PREVIEW_USER, PublicPreviewContext } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import ScrollableTabBar from './ScrollableTabBar';
import './Page.css';
import './PeopleCampus.css';
import './IndustryConnectMinimal.css';

import IcsrSection from './IcsrSection';
import ConclaveSection from './ConclaveSection';
import IndustryAdministrativeSection from './IndustryAdministrativeSection';
import SectionSuggestions from '../home/SectionSuggestions';

function IndustryConnectPublicView({ user: realUser, embedded }) {
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;

  const sections = [
    {
      id: 'administrative',
      title: 'Externship',
      expandedTitle: 'Bridging academia and industry through Externships',
      blurb: 'Explore externship programmes.',
      icon: <DashboardIcon name="bank" />,
      component: IndustryAdministrativeSection
    },
    {
      id: 'icsr',
      title: 'Industry Events',
      expandedTitle: 'Fostering innovation through dynamic industry-academia collaboration.',
      blurb: 'Explore industry collaboration events.',
      icon: <DashboardIcon name="link" />,
      component: IcsrSection
    },
    {
      id: 'conclave',
      title: 'Industry Academic Conclave',
      expandedTitle: 'Building bridges between industry leaders and academic excellence.',
      blurb: 'Explore the conclave and partnerships.',
      icon: <DashboardIcon name="aim" />,
      component: ConclaveSection
    }
  ];

  const [activeTab, setActiveTab] = useState(sections[0]?.id);
  const activeSection = sections.find(s => s.id === activeTab);

  const inner = (
    <>
      <ScrollableTabBar ariaLabel="Industry Connect sections">
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
      </ScrollableTabBar>

      {activeSection && (
        <div className="pc-tab-panel" role="tabpanel" key={activeSection.id}>
          <div className="pc-tab-panel__content">
            {(() => {
              const SectionComponent = activeSection.component;
              return <SectionComponent user={user} isPublicView={true} />;
            })()}
          </div>
          <SectionSuggestions
            pillar="industry-connect"
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

export default IndustryConnectPublicView;
