import { useState } from 'react';
import { PUBLIC_PREVIEW_USER, PublicPreviewContext } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './InnovationMinimal.css';

import IptifSection from './IptifSection';
import TechinSection from './TechinSection';
import HomeGroundStartup from './HomeGroundStartup';
import StartupPortfolio from './StartupPortfolio';
import SectionSuggestions from '../home/SectionSuggestions';

function InnovationPublicView({ user: realUser, embedded }) {
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;

  const sections = [
    {
      id: 'home-ground-startup',
      title: 'Home Grown Startup',
      expandedTitle: 'Internal startups incubated through IPTIF and TECHIN programs',
      blurb: 'Explore home-grown startups.',
      icon: <DashboardIcon name="home" />,
      component: HomeGroundStartup
    },
    {
      id: 'startups',
      title: 'IPTIF',
      expandedTitle: 'Nurturing startups and innovation projects at IPTIF',
      blurb: 'Explore IPTIF incubation and projects.',
      icon: <DashboardIcon name="innovation" />,
      component: IptifSection
    },
    {
      id: 'innovation-hub',
      title: 'TECHIN',
      expandedTitle: 'Driving innovation through cutting-edge research and development',
      blurb: 'Explore TECHIN innovation hub.',
      icon: <DashboardIcon name="startup" />,
      component: TechinSection
    },
    {
      id: 'startup-portfolio',
      title: 'Startup Portfolio',
      expandedTitle: 'Showcasing startups incubated and supported across IPTIF and TECHIN',
      blurb: 'Browse incubated startups.',
      icon: <DashboardIcon name="profile" />,
      component: StartupPortfolio
    }
  ];

  const [activeTab, setActiveTab] = useState(sections[0]?.id);
  const activeSection = sections.find(s => s.id === activeTab);

  const inner = (
    <>
      <nav className="pc-tab-bar" role="tablist" aria-label="Innovation sections">
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
            pillar="innovation"
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

export default InnovationPublicView;
