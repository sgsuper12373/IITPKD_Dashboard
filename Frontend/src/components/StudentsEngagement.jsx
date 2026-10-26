import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PUBLIC_PREVIEW_USER, PREVIEW_QUERY, PublicPreviewContext, isPreviewSearch } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './StudentsEngagement.css';

import NptelSection from './NptelSection';
import OutreachSection from './OutreachSection';

const SECTIONS = [
  {
    id: 'nptel',
    icon: 'education',
    title: 'CCE',
    expandedTitle: 'Track student participation in NPTEL online learning and certification programmes.',
    component: NptelSection,
    programKey: null,
  },
  {
    id: 'pmc',
    icon: 'aim',
    title: 'Palakkad Math Circle',
    expandedTitle: 'Mathematics enrichment sessions for school students.',
    component: OutreachSection,
    programKey: 'palakkad_math_circle',
  },
  {
    id: 'pbd',
    icon: 'global',
    title: 'Pale Blue Dot',
    expandedTitle: 'Astronomy and space science public lecture series.',
    component: OutreachSection,
    programKey: 'pale_blue_dot',
  },
  {
    id: 'sq',
    icon: 'research',
    title: 'Science Quest',
    expandedTitle: 'Science outreach and laboratory programmes for school students.',
    component: OutreachSection,
    programKey: 'science_quest',
  },
];

function StudentsEngagementSection({ user: realUser }) {
  const [searchParams] = useSearchParams();
  const isPreview = isPreviewSearch(searchParams);
  const user = isPreview ? PUBLIC_PREVIEW_USER : realUser;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(SECTIONS[0]?.id);
  const activeSection = SECTIONS.find(s => s.id === activeTab);

  return (
    <div className="page-container">
      <div className="page-content">
        <button className="page-back-btn" onClick={() => navigate(isPreview ? '/outreach-extension' + PREVIEW_QUERY : '/outreach-extension')}>
          &#8592; Back to Outreach Extension
        </button>
        <PublicPreviewContext.Provider value={isPreview}>
          <nav className="pc-tab-bar" role="tablist" aria-label="Students Engagement sections">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                role="tab"
                aria-selected={activeTab === section.id}
                className={`pc-tab${activeTab === section.id ? ' pc-tab--active' : ''}`}
                onClick={() => setActiveTab(section.id)}
              >
                <span className="pc-tab__icon"><DashboardIcon name={section.icon} /></span>
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
            </div>
          )}
        </PublicPreviewContext.Provider>
      </div>
    </div>
  );
}

export default StudentsEngagementSection;
