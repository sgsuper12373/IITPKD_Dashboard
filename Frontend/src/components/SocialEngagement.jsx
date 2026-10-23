import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PUBLIC_PREVIEW_USER, PREVIEW_QUERY, PublicPreviewContext, isPreviewSearch } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import './Page.css';
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
    subtitle: 'Rural Development Initiatives',
    expandedTitle: 'Engaging with communities through rural development and village adoption programs.',
    description:
      'Track UBA projects, community engagement events, village adoption programs, and the impact of rural development initiatives.',
    grad: 'linear-gradient(135deg, #066A75 0%, #087E8B 100%)',
    shadow: 'rgba(8, 126, 139,0.3)',
    shadowHover: 'rgba(8, 126, 139,0.45)',
    component: UbaSection,
    programKey: null,
  },
  {
    id: 'open-house',
    icon: 'bank',
    title: 'Open House',
    subtitle: 'Annual Community Showcase',
    expandedTitle: 'Explore Open House events, visitor statistics, and departmental participation.',
    description:
      'Explore Open House events, visitor statistics, departmental participation, and key highlights from each edition of this prestigious annual event.',
    grad: 'linear-gradient(135deg, #0F1F36 0%, #142D4E 100%)',
    shadow: 'rgba(102,126,234,0.3)',
    shadowHover: 'rgba(102,126,234,0.45)',
    component: OpenHouseSection,
    programKey: null,
  },
  {
    id: 'institute-visits',
    icon: 'home',
    title: 'Institute Visits',
    subtitle: 'Organised institution visits',
    expandedTitle: 'Organised visits by institutions to the IIT Palakkad campus.',
    description: 'Organised visits by institutions to the IIT Palakkad campus.',
    grad: 'linear-gradient(135deg, #087E8B 0%, #066A75 100%)',
    shadow: 'rgba(67,233,123,0.3)',
    shadowHover: 'rgba(67,233,123,0.45)',
    component: OutreachSection,
    programKey: 'institute_visits',
  },
  {
    id: 'nss',
    icon: 'people',
    title: 'NSS Activities',
    subtitle: 'Community service initiatives',
    expandedTitle: 'National Service Scheme community service initiatives.',
    description: 'National Service Scheme community service initiatives.',
    grad: 'linear-gradient(135deg, #066A75 0%, #087E8B 100%)',
    shadow: 'rgba(250,112,154,0.3)',
    shadowHover: 'rgba(250,112,154,0.45)',
    component: OutreachSection,
    programKey: 'nss_activities',
  },
];

function SocialEngagementsSection({ user: realUser }) {
  // Opened from the Outreach "View Public Page" preview: render as a public (role 0) visitor
  const [searchParams] = useSearchParams();
  const isPreview = isPreviewSearch(searchParams);
  const user = isPreview ? PUBLIC_PREVIEW_USER : realUser;
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);

  const activeItem = SECTIONS.find((s) => s.id === activeSection);
  const SectionComponent = activeItem?.component ?? null;

  const grid = (
    <>
      <div className="se-intro-wrap">
        <div className="page-container-socialEngagement">
          <div className="page-content-socialEngagement">
            <div className="se-header-wrap">
              <h1 className="se-heading">Social Engagements</h1>
            </div>

            <div className="se-cards-grid">
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  className="se-card"
                  onClick={() => setActiveSection(s.id)}
                  style={{ background: s.grad, boxShadow: `0 20px 40px ${s.shadow}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 25px 50px ${s.shadowHover}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 20px 40px ${s.shadow}`; }}
                >
                  <div className="se-card-decor1" />
                  <div className="se-card-decor2" />

                  <div className="se-card-content">
                    <div className="se-card-header">
                      <span className="se-card-icon-wrap"><DashboardIcon name={s.icon} /></span>
                      <h2 className="se-card-h2">{s.title}</h2>
                      <p className="se-card-subtitle">{s.subtitle}</p>
                    </div>
                    <p className="se-card-desc">{s.description}</p>
                    <div className="se-card-footer">
                      <div className="se-view-btn">
                        <span className="se-view-label">View &#8594;</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const expandedView = activeItem && SectionComponent && (
    <div className="expanded-section-view">
      <div className="section-wrapper">
        <div className="expanded-card-container">
          <div className="expanded-card-top-bar">
            <button className="back-button-inline" onClick={() => setActiveSection(null)}>
              <span className="back-arrow">&#8592;</span>
              <span>Back</span>
            </button>
            <div className="section-icon-header"><DashboardIcon name={activeItem.icon} size={28} /></div>
            <p className="section-overview-text">{activeItem.expandedTitle}</p>
          </div>
          <div className="expanded-card-content">
            <SectionComponent user={user} isPublicView={true} programKey={activeItem.programKey} />
          </div>
        </div>
      </div>
    </div>
  );

  const content = activeSection ? expandedView : grid;

  return (
    <div className="page-container">
      <div className="page-content">
        <button className="page-back-btn" onClick={() => navigate(isPreview ? '/outreach-extension' + PREVIEW_QUERY : '/outreach-extension')}>
          &#8592; Back to Outreach Extension
        </button>
        <PublicPreviewContext.Provider value={isPreview}>{content}</PublicPreviewContext.Provider>
      </div>
    </div>
  );
}

export default SocialEngagementsSection;
