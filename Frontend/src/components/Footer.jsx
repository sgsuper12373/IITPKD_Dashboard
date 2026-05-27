import { Link } from 'react-router-dom';
import IITPKD_Logo from '../assets/IITPKD_Logo.png';
import './Footer.css';

const DASHBOARD_LINKS = [
  { label: 'People and Campus', to: '/people-campus' },
  { label: 'Research', to: '/research' },
  { label: 'Education', to: '/education' },
  { label: 'Industry Connect', to: '/industry-connect' },
  { label: 'Innovation & Entrepreneurship', to: '/innovation-entrepreneurship' },
  { label: 'Outreach and Extension', to: '/outreach-extension' },
];

const QUICK_LINKS = [
  { label: 'NIRF', href: 'https://www.iitpkd.ac.in/nirf' },
  { label: 'NIRF – Innovation 2022', href: 'https://www.iitpkd.ac.in/nirf-innovation' },
  { label: 'Policies', href: 'https://www.iitpkd.ac.in/policies' },
  { label: 'RTI', href: 'https://www.iitpkd.ac.in/rti' },
  { label: 'Downloads', href: 'https://www.iitpkd.ac.in/downloads' },
  { label: 'Notifications & Circulars', href: 'https://www.iitpkd.ac.in/notifications' },
  { label: 'Anti-Ragging', href: 'https://www.iitpkd.ac.in/anti-ragging' },
  { label: 'Support', href: 'mailto:netadmin@iitpkd.ac.in' },
];

const SOCIAL_LINKS = [
  {
    label: 'Twitter / X',
    href: 'https://twitter.com/iitpalakkad',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/school/iit-palakkad/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/iitpalakkad',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@iitpalakkad',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/iitpalakkad/',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-main">
        {/* Column 1 — Institute Info */}
        <div className="footer-col footer-col--info">
          <div className="footer-logo-row">
            <img src={IITPKD_Logo} alt="IIT Palakkad Logo" className="footer-logo" />
            <div className="footer-logo-text">
              <span className="footer-inst-name">Indian Institute of Technology Palakkad</span>
              <span className="footer-tagline">Nurturing Minds For a Better World</span>
            </div>
          </div>

          <div className="footer-contact">
            <div className="footer-section-label">Address</div>
            <address className="footer-address">
              Indian Institute of Technology Palakkad<br />
              Kanjikode | Palakkad<br />
              Kerala | Pin: 678 623
            </address>

            <div className="footer-phones">
              <a href="tel:+914912092013" className="footer-phone-link">
                <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +91 491 209 2013 / 2001 (Office)
              </a>
              <a href="tel:+914912092035" className="footer-phone-link">
                <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +91 491 209 2035 (Academic Section)
              </a>
            </div>

            <a href="mailto:netadmin@iitpkd.ac.in" className="footer-email-link">
              <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              netadmin@iitpkd.ac.in
            </a>
          </div>

          <div className="footer-social">
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-link"
                aria-label={label}
                title={label}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Column 2 — Dashboard Sections */}
        <div className="footer-col footer-col--sections">
          <h4 className="footer-col-heading">Dashboard</h4>
          <ul className="footer-link-list">
            {DASHBOARD_LINKS.map(({ label, to }) => (
              <li key={to}>
                <Link to={to} className="footer-link">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Quick Links */}
        <div className="footer-col footer-col--links">
          <h4 className="footer-col-heading">Quick Links</h4>
          <ul className="footer-link-list">
            {QUICK_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 — Map */}
        <div className="footer-col footer-col--map">
          <h4 className="footer-col-heading">Find Us</h4>
          <div className="footer-map-wrapper">
            <iframe
              title="IIT Palakkad Location"
              src="https://maps.google.com/maps?q=Indian+Institute+of+Technology+Palakkad,+Kanjikode,+Kerala&output=embed"
              width="100%"
              height="220"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          &copy; {currentYear} Indian Institute of Technology Palakkad. All rights reserved.
        </span>
        <span className="footer-version">IITPKD Dashboard</span>
      </div>
    </footer>
  );
}

export default Footer;
