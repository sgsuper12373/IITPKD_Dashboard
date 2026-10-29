import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PUBLIC_PREVIEW_USER, PREVIEW_QUERY, PublicPreviewContext, isPreviewSearch } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
import './PeopleCampus.css';
import './PeopleCampusMinimal.css';
import './SocialEngagement.css';

import UbaSection from './UbaSection';
import OpenHouseSection from './OpenHouseSection';
import OutreachSection from './OutreachSection';

const SECTIONS = [
  {
    id: 'uba',
    icon: 'outreach',
    title: 'Unnat Bharat Abhiyan',
    expandedTitle: 'Engaging with communities through rural development and village adoption programs.',
    component: UbaSection,
    programKey: null,
  },
  {
    id: 'open-house',
    icon: 'bank',
    title: 'Open House',
    expandedTitle: 'Explore Open House events, visitor statistics, and departmental participation.',
    component: OpenHouseSection,
    programKey: null,
  },
  {
    id: 'institute-visits',
    icon: 'home',
    title: 'Institute Visits',
    expandedTitle: 'Organised visits by institutions to the IIT Palakkad campus.',
    component: OutreachSection,
    programKey: 'institute_visits',
  },
  {
    id: 'nss',
    icon: 'people',
    title: 'NSS Activities',
    expandedTitle: 'National Service Scheme community service initiatives.',
    component: OutreachSection,
    programKey: 'nss_activities',
  },
];

function SocialEngagementsSection({ user: realUser }) {
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
          <nav className="pc-tab-bar" role="tablist" aria-label="Social Engagement sections">
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

export default SocialEngagementsSection;
