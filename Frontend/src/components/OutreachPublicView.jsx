import { Link } from 'react-router-dom';
import './Page.css';
import './OutreachMinimal.css';

const sections = [
  {
    id: 'social-engagement',
    title: 'Social Engagements',
    subtitle: 'Community outreach: Open House, workshops, and public lectures',
    icon: 'S',
    to: '/outreach-extension/social-engagement',
  },
  {
    id: 'students-engagement',
    title: 'Students Engagement',
    subtitle: 'Student-led outreach: Workshops and community projects',
    icon: 'S',
    to: '/outreach-extension/students-engagement',
  },
];

function OutreachPublicView() {
  return (
    <div className="page-container">
      <div className="page-content">
        <div className="outreach-page-header" />
        <div className="outreach-sections-grid">
          {sections.map((section, index) => (
            <Link
              key={section.id}
              to={section.to}
              style={{ textDecoration: 'none', animationDelay: `${index * 0.1}s` }}
            >
              <div className="outreach-section-card">
                <div className="outreach-card-icon">{section.icon}</div>
                <h3 className="outreach-card-title">{section.title}</h3>
                <p className="outreach-card-subtitle">{section.subtitle}</p>
                <div className="outreach-card-arrow">→</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OutreachPublicView;
