import { Link, useSearchParams } from 'react-router-dom';
import { PREVIEW_PARAM, PREVIEW_VALUE, isPreviewSearch } from '../utils/publicPreview';
import DashboardIcon from './DashboardIcon';
import OutreachPublicView from './OutreachPublicView';

import './Page.css';
import './PeopleCampus.css';

const OUTREACH_EXTENSION_SECTIONS = [
  {
    code: <DashboardIcon name="bank" />,
    title: 'Open House',
    description: 'Community Engagement Events',
    route: '/outreach-extension/open-house',
    allowedRoles: [3, 15]
  },
  {
    code: <DashboardIcon name="ug" />,
    title: 'CCE',
    description: 'Centre for Continuing Education',
    route: '/outreach-extension/nptel',
    allowedRoles: [3, 16]
  },
  {
    code: <DashboardIcon name="outreach" />,
    title: 'Unnat Bharat Abhiyan',
    description: 'Rural Development Initiative',
    route: '/outreach-extension/uba',
    allowedRoles: [3, 17]
  },
  {
    code: <DashboardIcon name="research" />,
    title: 'Science Quest',
    description: 'Science outreach and laboratory programmes for school students',
    route: '/outreach-extension/outreach?program=science_quest',
    allowedRoles: [3, 18]
  },
  {
    code: <DashboardIcon name="fund" />,
    title: 'Palakkad Math Circle',
    description: 'Mathematics enrichment sessions for school students',
    route: '/outreach-extension/outreach?program=palakkad_math_circle',
    allowedRoles: [3, 19]
  },
  {
    code: <DashboardIcon name="global" />,
    title: 'Pale Blue Dot',
    description: 'Astronomy and space science public lecture series',
    route: '/outreach-extension/outreach?program=pale_blue_dot',
    allowedRoles: [3, 20]
  },
  {
    code: <DashboardIcon name="home" />,
    title: 'Institute Visits',
    description: 'Organised visits by institutions to the IIT Palakkad campus',
    route: '/outreach-extension/outreach?program=institute_visits',
    allowedRoles: [3, 21]
  },
  {
    code: <DashboardIcon name="link" />,
    title: 'NSS Activities',
    description: 'National Service Scheme community service initiatives',
    route: '/outreach-extension/outreach?program=nss_activities',
    allowedRoles: [3, 22]
  },
];

function OutreachExtension({ user }) {
  // Kept in the URL so returning from an Outreach sub-page lands back in the preview
  const [searchParams, setSearchParams] = useSearchParams();
  const showPublicView = isPreviewSearch(searchParams);
  const setShowPublicView = (on) => setSearchParams(on ? { [PREVIEW_PARAM]: PREVIEW_VALUE } : {});
  const roleId = user?.role_id;

  if (!user || roleId === 0 || roleId === 1) {
    return <OutreachPublicView user={user} />;
  }

  // If non-public user explicitly chooses public view
  if (showPublicView) {
    return (
      <div className="page-container">
        <div className="page-content">
          <button
            className="page-upload-btn mb-space-4"
            onClick={() => setShowPublicView(false)}
          >
            ← Back to Admin View
          </button>
          <OutreachPublicView user={user} embedded />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Public view button for non-public users */}
        {roleId !== 0 && roleId !== 1 && (
          <div className="mb-space-4">
            <button
              className="page-upload-btn"
              onClick={() => setShowPublicView(true)}
            >
              View Public Page
            </button>
          </div>
        )}

        <div className="people-campus-grid">
          {OUTREACH_EXTENSION_SECTIONS.map((section) => {
            // Role-based visibility logic
            const isSuperAdmin = roleId === 3;
            const isAllowed =
              isSuperAdmin ||
              roleId === 1 ||
              (section.allowedRoles && section.allowedRoles.includes(roleId));

            if (!isAllowed) {
              return null;
            }

            return (
              <Link key={section.route} to={section.route} className="people-campus-card">
                <div className="card-icon">{section.code}</div>
                <h3 className="card-title">{section.title}</h3>
                <p className="card-description">{section.description}</p>
                <div className="card-arrow">→</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OutreachExtension;