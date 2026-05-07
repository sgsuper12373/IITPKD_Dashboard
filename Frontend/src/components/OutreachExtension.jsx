import { useState } from 'react';
import { Link } from 'react-router-dom';
import OutreachPublicView from './OutreachPublicView';

import './Page.css';
import './PeopleCampus.css';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import ScienceIcon from '@mui/icons-material/Science';
import CalculateIcon from '@mui/icons-material/Calculate';
import PublicIcon from '@mui/icons-material/Public';
import SchoolIcon from '@mui/icons-material/School';
import HandshakeIcon from '@mui/icons-material/Handshake';

const OUTREACH_EXTENSION_SECTIONS = [
  {
    code: <AccountBalanceIcon htmlColor="#3f51b5" fontSize="inherit" />,
    title: 'Open House',
    description: 'Community Engagement Events',
    route: '/outreach-extension/open-house',
    allowedRoles: [3]
  },
  {
    code: <MenuBookIcon htmlColor="#8d6e63" fontSize="inherit" />,
    title: 'NPTEL - CCE',
    description: 'Centre for Continuing Education',
    route: '/outreach-extension/nptel',
    allowedRoles: [3]
  },
  {
    code: <AgricultureIcon htmlColor="#4CAF50" fontSize="inherit" />,
    title: 'Unnat Bharat Abhiyan',
    description: 'Rural Development Initiative',
    route: '/outreach-extension/uba',
    allowedRoles: [3]
  },
  {
    code: <ScienceIcon htmlColor="#00bcd4" fontSize="inherit" />,
    title: 'Science Quest',
    description: 'Science outreach and laboratory programmes for school students',
    route: '/outreach-extension/outreach?program=science_quest',
    allowedRoles: [3]
  },
  {
    code: <CalculateIcon htmlColor="#3f51b5" fontSize="inherit" />,
    title: 'Palakkad Math Circle',
    description: 'Mathematics enrichment sessions for school students',
    route: '/outreach-extension/outreach?program=palakkad_math_circle',
    allowedRoles: [3]
  },
  {
    code: <PublicIcon htmlColor="#4caf50" fontSize="inherit" />,
    title: 'Pale Blue Dot',
    description: 'Astronomy and space science public lecture series',
    route: '/outreach-extension/outreach?program=pale_blue_dot',
    allowedRoles: [3]
  },
  {
    code: <SchoolIcon htmlColor="#f57c00" fontSize="inherit" />,
    title: 'Institute Visits',
    description: 'Organised visits by institutions to the IIT Palakkad campus',
    route: '/outreach-extension/outreach?program=institute_visits',
    allowedRoles: [3]
  },
  {
    code: <HandshakeIcon htmlColor="#e91e63" fontSize="inherit" />,
    title: 'NSS Activities',
    description: 'National Service Scheme community service initiatives',
    route: '/outreach-extension/outreach?program=nss_activities',
    allowedRoles: [3]
  },
];

function OutreachExtension({ user }) {
  const [showPublicView, setShowPublicView] = useState(false);
  const roleId = user?.role_id;

  // Show public view for unauthenticated users or role_id === 1
  if (!user || roleId === 1) {
    return <OutreachPublicView user={user} />;
  }

  // If non-public user explicitly chooses public view
  if (showPublicView) {
    return (
      <div className="page-container">
        <div className="page-content">
          <button
            className="page-upload-btn"
            onClick={() => setShowPublicView(false)}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Admin View
          </button>
          <OutreachPublicView user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Public view button for non-public users */}
        <div style={{ marginBottom: '1rem' }}>
          <button
            className="page-upload-btn"
            onClick={() => setShowPublicView(true)}
          >
            View Public Page
          </button>
        </div>

        <div className="people-campus-grid">
          {OUTREACH_EXTENSION_SECTIONS.map((section) => {
            // Role-based visibility logic
            const isSuperAdmin = roleId === 3;
            const isAllowed =
              isSuperAdmin ||
              (section.allowedRoles && section.allowedRoles.includes(roleId));

            if (!isAllowed) {
              return null;
            }

            return (
              <Link key={section.route} to={section.route} className="people-campus-card">
                <div className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{section.code}</div>
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