import { Link } from 'react-router-dom';
import './Page.css';
import './PeopleCampus.css';
import './OutreachMinimal.css';

const sections = [
  {
    id: 'social-engagement',
    title: 'Social Engagements',
    subtitle: 'Community outreach and extension activities',
    icon: '🤝',
    to: '/outreach-extension/social-engagement',
  },
  {
    id: 'students-engagement',
    title: 'Students Engagement',
    subtitle: 'Student-led initiatives and programmes',
    icon: '🎓',
    to: '/outreach-extension/students-engagement',
  },
];

function OutreachPublicView({ embedded }) {
  const inner = (
    <>
      <div className="outreach-page-header" />
      <div className="people-campus-grid">
        {sections.map((section, index) => (
          <Link
            key={section.id}
            to={section.to}
            className="people-campus-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="card-icon">{section.icon}</div>
            <h3 className="card-title">{section.title}</h3>
            <p className="card-description">{section.subtitle}</p>
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
