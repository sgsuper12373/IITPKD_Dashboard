import { Link } from 'react-router-dom';
import { getRoleAccessibleSections } from '../utils/rolePermissions';
import './AccessDenied.css';

function AccessDenied({ user }) {
  const sections = getRoleAccessibleSections(user?.role_id);

  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <div className="access-denied-icon">🔒</div>
        <h2 className="access-denied-title">Access Restricted</h2>
        <p className="access-denied-msg">
          Your role doesn&apos;t have permission to view or manage this section.
        </p>
        {sections.length > 0 && (
          <div className="access-denied-sections">
            <p className="access-denied-hint">
              You can manage the following sections:
            </p>
            <ul className="access-denied-list">
              {sections.map((s) => (
                <li key={s.route}>
                  <Link to={s.route} className="access-denied-link">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccessDenied;
