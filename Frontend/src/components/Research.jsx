import { Link } from 'react-router-dom';
import { useState } from 'react';

import './Page.css';
import './PeopleCampus.css';

// 🔹 ADDITION: import public view
import ResearchPublicView from './ResearchPublicView';

function Research({ user }) {

  // 🔹 ADDITION: get role_id safely
  const roleId = user?.role_id;

  // 🔹 ADDITION: toggle public view for non-public users
  const [showPublicView, setShowPublicView] = useState(false);

  const sections = [
    {
      title: 'ICSR Section',
      route: '/research/icsr',
      description: 'Industrial consultancy & sponsored research metrics',
      allowedRoles: [3]
    },
    {
      title: 'Library',
      route: '/research/library',
      description: 'Research publications and scholarly outputs',
      allowedRoles: [3]
    }
  ];

  // Show public view for unauthenticated users or role_id === 0, 1, 2
  if (!user || roleId === 0 || roleId === 1 || roleId === 2) {
    return <ResearchPublicView user={user} />;
  }

  // 🔹 ADDITION: If non-public user explicitly chooses public view
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

          <ResearchPublicView user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* 🔹 ADDITION: Public view button for non-public users */}
        {roleId !== 0 && roleId !== 1 && roleId !== 2 && (
          <div style={{ marginBottom: '1rem' }}>
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
                state={section.state}
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

export default Research;