import { useState } from 'react';
import { Link } from 'react-router-dom';
import InnovationPublicView from './InnovationPublicView';
import './Page.css';
import './PeopleCampus.css';

function InnovationEntrepreneurship({ user }) {
  const roleId = user?.role_id;

  const sections = [
    {
      title: 'Home Grown Startup',
      route: '/innovation-entrepreneurship/home-ground-startup',
      description: 'Internal Startups',
      allowedRoles: [3, 13, 14]
    },
    {
      title: 'IIT Palakkad Technology IHub Foundation (IPTIF)',
      route: '/innovation-entrepreneurship/iptif',
      description: 'Innovation',
      allowedRoles: [3, 14]
    },
    {
      title: 'TechIn',
      route: '/innovation-entrepreneurship/techin',
      description: 'Entrepreneurship',
      allowedRoles: [3, 13]
    }
  ];
  const [showPublicView, setShowPublicView] = useState(false);

  const hasCards = [3, 13, 14].includes(roleId);

  if (!user || roleId === 0 || roleId === 1 || !hasCards) {
    return <InnovationPublicView user={user} />;
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
          <InnovationPublicView user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Public view button for non-public users */}
        {roleId !== 0 && roleId !== 1 && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              className="page-upload-btn"
              onClick={() => setShowPublicView(true)}
            >
              View Public Page
            </button>
          </div>
        )}

        <div className="people-campus-grid" style={{ marginTop: '2rem' }}>
          {sections.map((section, index) => {
            const isAllowed = roleId === 3 || (section.allowedRoles && section.allowedRoles.includes(roleId));
            if (!isAllowed) return null;
            return (
              <Link
                key={index}
                to={section.route}
                className="people-campus-card"
              >
                <div className="card-icon">
                  {section.title === 'IIT Palakkad Technology IHub Foundation (IPTIF)' ? '💡' : section.title === 'Home Ground Startup' ? '🏠' : '🚀'}
                </div>
                <h3 className="card-title">{section.title}</h3>
                <p className="card-description">{section.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default InnovationEntrepreneurship;