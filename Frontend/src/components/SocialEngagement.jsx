import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Page.css';
import './PeopleCampusMinimal.css';
import './SocialEngagement.css';

import UbaSection from './UbaSection';
import OpenHouseSection from './OpenHouseSection';
import OutreachSection from './OutreachSection';

const SECTIONS = [
  {
    id: 'uba',
    icon: '🌾',
    title: 'Unnat Bharat Abhiyan',
    subtitle: 'Rural Development Initiatives',
    expandedTitle: 'Engaging with communities through rural development and village adoption programs.',
    description:
      'Track UBA projects, community engagement events, village adoption programs, and the impact of rural development initiatives.',
    grad: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    shadow: 'rgba(240,147,251,0.3)',
    shadowHover: 'rgba(240,147,251,0.45)',
    component: UbaSection,
    programKey: null,
  },
  {
    id: 'open-house',
    icon: '🏛️',
    title: 'Open House',
    subtitle: 'Annual Community Showcase',
    expandedTitle: 'Explore Open House events, visitor statistics, and departmental participation.',
    description:
      'Explore Open House events, visitor statistics, departmental participation, and key highlights from each edition of this prestigious annual event.',
    grad: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    shadow: 'rgba(102,126,234,0.3)',
    shadowHover: 'rgba(102,126,234,0.45)',
    component: OpenHouseSection,
    programKey: null,
  },
  {
    id: 'institute-visits',
    icon: '🏫',
    title: 'Institute Visits',
    subtitle: 'Organised institution visits',
    expandedTitle: 'Organised visits by institutions to the IIT Palakkad campus.',
    description: 'Organised visits by institutions to the IIT Palakkad campus.',
    grad: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    shadow: 'rgba(67,233,123,0.3)',
    shadowHover: 'rgba(67,233,123,0.45)',
    component: OutreachSection,
    programKey: 'institute_visits',
  },
  {
    id: 'nss',
    icon: '🤝',
    title: 'NSS Activities',
    subtitle: 'Community service initiatives',
    expandedTitle: 'National Service Scheme community service initiatives.',
    description: 'National Service Scheme community service initiatives.',
    grad: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    shadow: 'rgba(250,112,154,0.3)',
    shadowHover: 'rgba(250,112,154,0.45)',
    component: OutreachSection,
    programKey: 'nss_activities',
  },
];

function SocialEngagementsSection({ user, isPublicView = false }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);

  const activeItem = SECTIONS.find((s) => s.id === activeSection);
  const SectionComponent = activeItem?.component ?? null;

  const grid = (
    <>
      <div style={{ marginTop: '1rem' }}>
        <div className="page-container-socialEngagement">
          <div className='page-content-socialEngagement'>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ margin: '0 0 0.5rem 0', color: '#111', textShadow: '0 1px 4px rgba(255,255,255,0.8)' }}>Social Engagements</h1>
              <p style={{ color: '#666', fontSize: '1rem', margin: 0 }}>
                Community outreach: Open House and UBA projects
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    background: s.grad,
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: `0 20px 40px ${s.shadow}`,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = `0 25px 50px ${s.shadowHover}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 20px 40px ${s.shadow}`;
                  }}
                >
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                  <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                      <span style={{ fontSize: '64px', background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '24px', marginBottom: '16px', display: 'inline-block' }}>
                        {s.icon}
                      </span>
                      <h2 style={{ margin: 0, color: 'white', fontSize: '32px', fontWeight: 'bold', letterSpacing: '1px' }}>{s.title}</h2>
                      <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>{s.subtitle}</p>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '15px', lineHeight: '1.6', marginBottom: '30px', textAlign: 'center', padding: '0 10px' }}>
                      {s.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
                      <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '12px 24px', borderRadius: '40px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.3s ease', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <span style={{ color: 'white', fontSize: '16px', fontWeight: '500' }}>View →</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const expandedView = activeItem && SectionComponent && (
    <div className="expanded-section-view">
      <div className="section-wrapper">
        <div className="expanded-card-container">
          <div className="expanded-card-top-bar">
            <button className="back-button-inline" onClick={() => setActiveSection(null)}>
              <span className="back-arrow">←</span>
              <span>Back</span>
            </button>
            <div className="section-icon-header">{activeItem.icon}</div>
            <p className="section-overview-text">{activeItem.expandedTitle}</p>
          </div>
          <div className="expanded-card-content">
            <SectionComponent user={user} isPublicView={true} programKey={activeItem.programKey} />
          </div>
        </div>
      </div>
    </div>
  );

  const content = activeSection ? expandedView : grid;

  return (
    <div className="page-container">
      <div className="page-content">
        <button className="page-back-btn" onClick={() => navigate('/outreach-extension')}>
          ← Back to Outreach Extension
        </button>
        {content}
      </div>
    </div>
  );
}

export default SocialEngagementsSection;
