import { useState } from 'react';
import { PUBLIC_PREVIEW_USER, PublicPreviewContext } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './EducationMinimal.css';

import PlacementSection from './PlacementSection';
import EducationAcademicSection from './EducationAcademicSection';
import EducationIarSection from './EducationIarSection';
import SectionSuggestions from '../home/SectionSuggestions';

function EducationPublicView({ user: realUser, embedded }) {
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;

  const sections = [
    {
      id: 'placements',
      title: 'Placement Statistics',
      expandedTitle: 'Empowering careers through industry-leading placement opportunities.',
      blurb: 'Explore placement outcomes and recruiters.',
      icon: <DashboardIcon name="briefcase" />,
      component: PlacementSection
    },
    {
      id: 'academic',
      title: 'Courses Details',
      expandedTitle: 'Advancing academic excellence through innovative programs.',
      blurb: 'Explore academic programmes.',
      icon: <DashboardIcon name="education" />,
      component: EducationAcademicSection
    },
    {
      id: 'iar',
      title: 'Academic Collaborations',
      expandedTitle: 'Track and manage collaborations with Education Institutes',
      blurb: 'Explore institutional partnerships.',
      icon: <DashboardIcon name="link" />,
      component: EducationIarSection
    }
  ];

  const [activeTab, setActiveTab] = useState(sections[0]?.id);
  const activeSection = sections.find(s => s.id === activeTab);

  const inner = (
    <>
      <nav className="pc-tab-bar" role="tablist" aria-label="Education sections">
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
          <div className="pc-tab-panel__content">
            {(() => {
              const SectionComponent = activeSection.component;
              return <SectionComponent user={user} isPublicView={true} />;
            })()}
          </div>
          <SectionSuggestions
            pillar="education"
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

export default EducationPublicView;
