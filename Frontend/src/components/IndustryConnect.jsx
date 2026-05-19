import { Link } from 'react-router-dom';
import { useState } from 'react';

import './Page.css';
import './PeopleCampus.css';

// 🔹 ADDITION: import public view
import IndustryConnectPublicView from './IndustryConnectPublicView';

function IndustryConnect({ user }) {

  // 🔹 ADDITION: get role_id safely
  const roleId = user?.role_id;

  // 🔹 ADDITION: toggle public view for non-public users
  const [showPublicView, setShowPublicView] = useState(false);

  const sections = [
    {
      title: 'Administrative Section',
      route: '/research/administrative-section',
      description: 'Faculty industry externships and collaborations',
      allowedRoles: [3, 2]
    },
    {
      title: 'ICSR Section',
      route: '/industry-connect/icsr',
      description: 'Industry interaction events, workshops, and engagement activities',
      allowedRoles: [3, 9]
    },
    {
      title: 'Industry-Academia Conclave',
      route: '/industry-connect/conclave',
      description: 'Year-wise conclave information, themes, and participating companies',
      allowedRoles: [3, 12]
    }
  ];

  if (!user || roleId === 0 || roleId === 1) {
    return <IndustryConnectPublicView user={user} />;
  }

  // 🔹 ADDITION: If non-public user explicitly chooses public view
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

          <IndustryConnectPublicView user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* 🔹 ADDITION: Public view button for non-public users */}
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
          {sections.map((section, index) => {

            // 🔹 EXISTING role-based visibility logic
            const isSuperAdmin = roleId === 3;
            const isAllowed =
              isSuperAdmin ||
              roleId === 1 ||
              (section.allowedRoles && section.allowedRoles.includes(roleId));

            if (!isAllowed) {
              return null;
            }

            return (
              <Link
                key={index}
                to={section.route}
                className="people-campus-card"
              >
                <div className="card-icon">
                  {section.title.charAt(0)}
                </div>
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

export default IndustryConnect;