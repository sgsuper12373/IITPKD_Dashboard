import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

const LABELS = {
  'people-campus':              'People & Campus',
  'academic-section':           'Academic Section',
  'administrative-section':     'Administrative Section',
  'igrc':                       'IGRC',
  'icc':                        'ICC',
  'ewd':                        'EWD',
  'iar':                        'IAR',
  'research':                   'Research',
  'icsr':                       'ICSR',
  'patents':                    'Patents',
  'mou-collaborations':         'MoU Collaborations',
  'library':                    'Library',
  'education':                  'Education',
  'placements':                 'Placements',
  'industry-connect':           'Industry Connect',
  'conclave':                   'Conclave',
  'innovation-entrepreneurship':'Innovation & Entrepreneurship',
  'iptif':                      'IPTIF',
  'techin':                     'TechIn',
  'home-ground-startup':        'Home Ground Startup',
  'outreach-extension':         'Outreach & Extension',
  'open-house':                 'Open House',
  'nptel':                      'NPTEL',
  'uba':                        'UBA',
  'social-engagements':         'Social Engagements',
  'students-engagements':       'Students Engagements',
  'outreach':                   'Outreach',
  'social-engagement':          'Social Engagement',
  'students-engagement':        'Students Engagement',
  'pmc':                        'Palakkad Math Circle',
  'pbd':                        'Pale Blue Dot',
  'sq':                         'Science Quest',
  'UBA':                        'UBA',
  'OpenHouse':                  'Open House',
  'InstituteVisits':            'Institute Visits',
  'NSS':                        'NSS',
  'profile':                    'Profile',
  'upload':                     'Upload',
  'create-user':                'Create User',
};

function Breadcrumb() {
  const { pathname } = useLocation();

  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  const crumbs = [{ label: 'Home', path: '/' }];
  segments.forEach((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    crumbs.push({ label: LABELS[seg] ?? seg, path });
  });

  return (
    <nav className="breadcrumb-nav" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="breadcrumb-item">
              {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">›</span>}
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">{crumb.label}</span>
              ) : (
                <Link className="breadcrumb-link" to={crumb.path}>{crumb.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
