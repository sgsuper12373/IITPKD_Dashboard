import { Link } from 'react-router-dom';
import './Page.css';
import './OutreachMinimal.css';

import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';


function OutreachPublicView({ user }) {
  const isGuestUser = !user || user?.role_id === 1 || user?.isGuest === true;

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="outreach-page-header" />
        <div className="outreach-sections-grid">
          {/* Social Engagements */}
          {!isGuestUser && (
            <Link to="/outreach-extension/social-engagement" style={{ textDecoration: 'none', animationDelay: '0s' }}>
              <div className="outreach-section-card">
                <div className="outreach-card-icon"><PeopleIcon htmlColor="#2196f3" fontSize="inherit" /></div>
                <h3 className="outreach-card-title">Social Engagements</h3>
                <p className="outreach-card-subtitle">Community outreach: Open House, workshops, and public lectures</p>
                <div className="outreach-card-arrow">→</div>
              </div>
            </Link>
          )}
          {/* Students Engagement */}
          {!isGuestUser && (
            <Link to="/outreach-extension/students-engagement" style={{ textDecoration: 'none', animationDelay: '0.1s' }}>
              <div className="outreach-section-card">
                <div className="outreach-card-icon"><GroupsIcon htmlColor="#4caf50" fontSize="inherit" /></div>
                <h3 className="outreach-card-title">Students Engagement</h3>
                <p className="outreach-card-subtitle">Student-led outreach: Workshops and community projects</p>
                <div className="outreach-card-arrow">→</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default OutreachPublicView;
