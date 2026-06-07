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
    },
    {
      title: 'Startup Portfolio',
      route: '/innovation-entrepreneurship/startup-portfolio',
      description: 'Showcase of IPTIF & TechIn startups',
      allowedRoles: [3, 13, 14]
    }
  ];
  const [showPublicView, setShowPublicView] = useState(false);

  if (!user || roleId === 0 || roleId === 1) {
    return <InnovationPublicView user={user} />;
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
          <InnovationPublicView user={user} embedded />
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

        <div className="people-campus-grid mt-space-8">
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
                  {section.title === 'IIT Palakkad Technology IHub Foundation (IPTIF)' ? '💡' : section.title === 'Startup Portfolio' ? '📇' : section.title === 'Home Grown Startup' ? '🏠' : '🚀'}
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