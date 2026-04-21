import { useState } from 'react';
import { Link } from 'react-router-dom';
import EducationPublicView from './EducationPublicView';

import './Page.css';
import './PeopleCampus.css';

const EDUCATION_SECTIONS = [
  {
    code: 'A',
    title: 'Administrative Section',
    description: 'Administrative services and information',
    route: '/education/administrative-section',
    // 🔹 ADDITION
    allowedRoles: [3]
  },
  {
    code: 'P',
    title: 'Placement Office',
    description: 'Career outcomes, recruiters, and placement analytics',
    route: '/education/placements',
    // 🔹 ADDITION
    allowedRoles: [3]
  },
  {
    code: 'A',
    title: 'Academic Section',
    description: 'Academic programs, statistics, and student metrics',
    route: '/education/academic-section',
    // 🔹 ADDITION
    allowedRoles: [3, 4]
  },
  {
    code: 'I',
    title: 'IAR',
    description: 'International & Alumni Relations MoUs',
    route: '/education/iar',
    allowedRoles: [3]
  }
];

function Education({ user }) {
  const [showPublicView, setShowPublicView] = useState(false);
  const roleId = user?.role_id;

  if (roleId === 1) {
    return <EducationPublicView user={user} />;
  }

  if (showPublicView) {
    return (
      <div className="page-container">
        <div className="page-content">
          <button
            className="upload-data-btn"
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
        {roleId === 3 && (
          <div style={{ marginBottom: '2rem' }}>
            <button className="upload-data-btn" onClick={() => setShowPublicView(true)}>
              View Public Page
            </button>
          </div>
        )}

        <div className="people-campus-grid">
          {EDUCATION_SECTIONS.map((section) => {

            // 🔹 ADDITION: role-based visibility logic
            const isPublicUser = roleId === 1;
            const isSuperAdmin = roleId === 3;
            const isAllowed =
              isSuperAdmin ||
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
                <div className="card-content">
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Education;