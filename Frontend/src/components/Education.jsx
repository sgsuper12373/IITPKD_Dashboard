import { useState } from 'react';
import { Link } from 'react-router-dom';
import EducationPublicView from './EducationPublicView';

import './Page.css';
import './PeopleCampus.css';

const EDUCATION_SECTIONS = [
  {
    code: 'P',
    title: 'Placement Office',
    description: 'Career outcomes, recruiters, and placement analytics',
    route: '/education/placements',
    allowedRoles: [3, 11]
  },
  {
    code: 'A',
    title: 'Academic Section',
    description: 'Academic programs, statistics, and student metrics',
    route: '/education/academic-section',
    allowedRoles: [3, 4]
  },
  {
    code: 'I',
    title: 'IAR',
    description: 'International & Alumni Relations MoUs',
    route: '/education/iar',
    allowedRoles: [3, 5]
  }
];

function Education({ user }) {
  const [showPublicView, setShowPublicView] = useState(false);
  const roleId = user?.role_id;

  if (!user || roleId === 0 || roleId === 1) {
    return <EducationPublicView user={user} />;
  }

  if (showPublicView) {
    return (
      <div className="page-container">
        <div className="page-content">
          <button
            className="page-upload-btn"
            onClick={() => setShowPublicView(false)}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Education Modules
          </button>
          <EducationPublicView user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {roleId !== 0 && roleId !== 1 && (
          <div style={{ marginBottom: '2rem' }}>
            <button className="page-upload-btn" onClick={() => setShowPublicView(true)}>
              View Public Page
            </button>
          </div>
        )}

        <div className="people-campus-grid">
          {EDUCATION_SECTIONS.map((section) => {

            // 🔹 ADDITION: role-based visibility logic
            const isPublicUser = false;
            const isSuperAdmin = roleId === 3;
            const isAllowed =
              isSuperAdmin ||
              roleId === 1 ||
              (section.allowedRoles && section.allowedRoles.includes(roleId));

            // 🔒 Public users should not see section tabs
            if (isPublicUser) {
              return null;
            }

            // 🔒 Restricted roles
            if (!isAllowed) {
              return null;
            }

            return (
              <Link
                key={section.route}
                to={section.route}
                className="people-campus-card"
              >
                <div className="card-icon">{section.code}</div>
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

export default Education;