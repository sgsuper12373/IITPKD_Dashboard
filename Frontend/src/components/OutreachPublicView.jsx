import { useState } from 'react';
import { PUBLIC_PREVIEW_USER, PublicPreviewContext } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './OutreachMinimal.css';

import UbaSection from './UbaSection';
import OpenHouseSection from './OpenHouseSection';
import OutreachSection from './OutreachSection';
import NptelSection from './NptelSection';
import SectionSuggestions from '../home/SectionSuggestions';

const sections = [
  {
    id: 'uba',
    title: 'Unnat Bharat Abhiyan',
    expandedTitle: 'Engaging with communities through rural development and village adoption programs.',
    blurb: 'Explore village adoption and rural outreach.',
    icon: <DashboardIcon name="outreach" />,
    component: UbaSection,
    programKey: null,
  },
  {
    id: 'open-house',
    title: 'Open House',
    expandedTitle: 'Explore Open House events, visitor statistics, and departmental participation.',
    blurb: 'Explore annual open house and visitors.',
    icon: <DashboardIcon name="bank" />,
    component: OpenHouseSection,
    programKey: null,
  },
  {
    id: 'institute-visits',
    title: 'Institute Visits',
    expandedTitle: 'Organised visits by institutions to the IIT Palakkad campus.',
    blurb: 'Explore school and college visits.',
    icon: <DashboardIcon name="home" />,
    component: OutreachSection,
    programKey: 'institute_visits',
  },
  {
    id: 'nss',
    title: 'NSS Activities',
    expandedTitle: 'National Service Scheme community service initiatives.',
    blurb: 'Explore NSS community service.',
    icon: <DashboardIcon name="people" />,
    component: OutreachSection,
    programKey: 'nss_activities',
  },
  {
    id: 'nptel',
    title: 'CCE',
    expandedTitle: 'Track student participation in NPTEL online learning and certification programmes.',
    blurb: 'Explore NPTEL enrolments and certifications.',
    icon: <DashboardIcon name="education" />,
    component: NptelSection,
    programKey: null,
  },
  {
    id: 'pmc',
    title: 'Palakkad Math Circle',
    expandedTitle: 'Mathematics enrichment sessions for school students.',
    blurb: 'Explore maths enrichment sessions.',
    icon: <DashboardIcon name="aim" />,
    component: OutreachSection,
    programKey: 'palakkad_math_circle',
  },
  {
    id: 'pbd',
    title: 'Pale Blue Dot',
    expandedTitle: 'Astronomy and space science public lecture series.',
    blurb: 'Explore astronomy and space outreach.',
    icon: <DashboardIcon name="global" />,
    component: OutreachSection,
    programKey: 'pale_blue_dot',
  },
  {
    id: 'sq',
    title: 'Science Quest',
    expandedTitle: 'Science outreach and laboratory programmes for school students.',
    blurb: 'Explore science competitions.',
    icon: <DashboardIcon name="research" />,
    component: OutreachSection,
    programKey: 'science_quest',
  },
];

function OutreachPublicView({ user: realUser, embedded }) {
  const user = embedded ? PUBLIC_PREVIEW_USER : realUser;

  const [activeTab, setActiveTab] = useState(sections[0]?.id);
  const activeSection = sections.find(s => s.id === activeTab);

  const inner = (
    <>
      <nav className="pc-tab-bar" role="tablist" aria-label="Outreach & Extension sections">
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
              return <SectionComponent user={user} isPublicView={true} programKey={activeSection.programKey} />;
            })()}
          </div>
          <SectionSuggestions
            pillar="outreach"
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

export default OutreachPublicView;
