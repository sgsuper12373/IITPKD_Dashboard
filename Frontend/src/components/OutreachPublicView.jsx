import { Link } from 'react-router-dom';
import './Page.css';
import './OutreachMinimal.css';

const sections = [
  {
    id: 'social-engagement',
    title: 'Social Engagements',
    subtitle: '',
    icon: 'S',
    to: '/outreach-extension/social-engagement',
  },
  {
    id: 'students-engagement',
    title: 'Students Engagement',
    subtitle: '',
    icon: 'S',
    to: '/outreach-extension/students-engagement',
  },
];

function OutreachPublicView({ embedded }) {
  const inner = (
    <>
      <div className="outreach-page-header" />
      <div className="outreach-sections-grid">
        {sections.map((section, index) => (
          <Link
            key={section.id}
            to={section.to}
            className="outreach-section-link"
            style={{ animationDelay: `${index * 0.1}s` }}
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
    </>
  );

  if (embedded) return inner;
  return (
    <div className="page-container">
      <div className="page-content">
        {inner}
      </div>
    </div>
  );
}

export default OutreachPublicView;
