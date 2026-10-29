import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  House, Users, FlaskConical, GraduationCap, Menu,
  Factory, Lightbulb, Sprout, X,
  /* LayoutGrid, */ ArrowUpRight, LogIn,
} from 'lucide-react';
import './Home.css';
import './NativeApp.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';
import FeedbackModal from './FeedbackModal';
import HeaderSearch from '../home/HeaderSearch';
import CampusClipart from './CampusClipart';
import { getRoleName } from '../utils/rolePermissions';

const SIDEBAR_NAV = [
  { Icon: House,          label: 'Institute overview',           path: '/',                            match: (p) => p === '/' },
  // { Icon: LayoutGrid,     label: 'Quick glance',                 path: '/quick-glance',                match: (p) => p.startsWith('/quick-glance') },
  { Icon: Users,          label: 'People & campus',              path: '/people-campus',               match: (p) => p.startsWith('/people-campus') },
  { Icon: FlaskConical,   label: 'Research',                     path: '/research',                    match: (p) => p.startsWith('/research') || p.startsWith('/patents') || p.startsWith('/mou-collaborations') },
  { Icon: GraduationCap,  label: 'Education',                    path: '/education',                   match: (p) => p.startsWith('/education') },
  { Icon: Factory,        label: 'Industry connect',             path: '/industry-connect',            match: (p) => p.startsWith('/industry-connect') },
  { Icon: Lightbulb,      label: 'Innovation & entrepreneurship', path: '/innovation-entrepreneurship', match: (p) => p.startsWith('/innovation-entrepreneurship') || p.startsWith('/startup-portfolio') },
  { Icon: Sprout,         label: 'Outreach & extension',         path: '/outreach-extension',          match: (p) => p.startsWith('/outreach-extension') },
];

const ALL_BOTTOM_TABS = [
  { Icon: House,          label: 'Home',      path: '/',               match: (p) => p === '/' },
  { Icon: Users,          label: 'People',    path: '/people-campus',  match: (p) => p.startsWith('/people-campus') },
  { Icon: FlaskConical,   label: 'Research',  path: '/research',       match: (p) => p.startsWith('/research') || p.startsWith('/patents') || p.startsWith('/mou-collaborations') },
  { Icon: GraduationCap,  label: 'Education', path: '/education',      match: (p) => p.startsWith('/education') },
];

const MORE_TAB = { Icon: Menu, label: 'More', path: null, match: () => false };

function Header({ user, onLogout, isGuest }) {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    const visibleBottomTabs = [MORE_TAB, ...ALL_BOTTOM_TABS];

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };
        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }, [showProfileDropdown]);

    useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    const toggleDropdown = () => setShowProfileDropdown((prev) => !prev);

    const handleProfileClick = () => {
        setShowProfileDropdown(false);
        navigate('/profile');
    };

    const sidebarContent = (
        <>
            <div className="ds-logo-area">
                <div className="ds-title">IIT Palakkad</div>
            </div>

            <p className="ds-section-label">EXPLORE THE INSTITUTE</p>

            <nav className="ds-nav">
                {SIDEBAR_NAV.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`ds-nav-item${item.match(location.pathname) ? ' active' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <item.Icon size={18} strokeWidth={1.75} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="ds-identity">
                <CampusClipart className="ds-clipart" />
            </div>

            <div className="ds-footer">
                <p className="ds-footer-text">IIT Palakkad, at a Glance. Everything, One Click Away.</p>
                {!isGuest && (
                    <button className="ds-footer-link" onClick={() => { setSidebarOpen(false); onLogout(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                        <LogIn size={14} strokeWidth={2} />
                        <span>Sign out</span>
                    </button>
                )}
                <a href="https://iitpkd.ac.in" target="_blank" rel="noopener noreferrer" className="ds-footer-link">
                    iitpkd.ac.in
                    <ArrowUpRight size={12} strokeWidth={2} />
                </a>
            </div>
        </>
    );

    return (
        <>
            {/* ══ Desktop permanent sidebar ══ */}
            <aside className="desktop-sidebar" aria-label="Main navigation">
                {sidebarContent}
            </aside>

            {/* ══ Top header bar ══ */}
            <div className="app-header-container">
                <header className="main-header">
                    {/* Mobile only: hamburger */}
                    <button
                        className="hamburger-btn"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open navigation menu"
                    >
                        <span /><span /><span />
                    </button>

                    {/* Mobile only: logo */}
                    <Link to="/" className="logo-link">
                        <img src={IIPKD_Logo} alt="IIT Palakkad" className="logo-image" />
                        <div className="logo-text-group">
                            <span className="logo-text">IIT Palakkad</span>
                            <span className="logo-tagline">DASHBOARD</span>
                        </div>
                    </Link>

                    {/* Desktop only: logo + institute name */}
                    <div className="header-indicator">
                        <img src={IIPKD_Logo} alt="IIT Palakkad" className="header-logo" />
                        <div className="header-institute-name">
                            <span className="header-institute-primary">Indian Institute of Technology Palakkad</span>
                            <span className="header-institute-sub">DASHBOARD</span>
                        </div>
                    </div>

                    {/* Right side: search + user */}
                    <div className="header-right">
                        <HeaderSearch />
                        {(user?.role_id ?? 0) !== 0 && (
                            <>
                                <span className="header-guest-label">
                                    {isGuest ? 'Guest view' : (user?.display_name || '')}
                                </span>
                                <div ref={dropdownRef} className="user-profile-container">
                                    <div
                                        className="user-avatar"
                                        onClick={toggleDropdown}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(); } }}
                                    >
                                        {user?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    {showProfileDropdown && (
                                        <div className="profile-dropdown">
                                            <div className="dropdown-header">
                                                <div className="dropdown-user-info">
                                                    <div className="dropdown-avatar">
                                                        {user?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div className="dropdown-user-details">
                                                        <div className="dropdown-name">{user?.display_name || 'User'}</div>
                                                        <div className="dropdown-email">{user?.email || ''}</div>
                                                        <div className="dropdown-role" style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                                            Role ID: {user?.role_id ?? 0} — {getRoleName(user?.role_id ?? 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="dropdown-divider" />
                                            <button className="dropdown-item" onClick={handleProfileClick}>
                                                {user?.role_id === 3 ? 'Profile & Admin Actions' : 'Profile'}
                                            </button>
                                            {user?.role_id === 3 && (
                                                <button className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/site-monitor'); }}>
                                                    Site Monitor
                                                </button>
                                            )}
                                            <button className="dropdown-item" onClick={onLogout}>
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </header>
            </div>

            {/* ══ Mobile: sidebar drawer backdrop ══ */}
            {sidebarOpen && isMobile && (
                <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
            )}

            {/* ══ Mobile: sidebar drawer ══ */}
            {sidebarOpen && isMobile && (
                <aside className="sidebar-drawer" role="navigation" aria-label="Mobile navigation">
                    <div className="sidebar-header">
                        <span className="sidebar-title">Navigation</span>
                        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close">
                            <X size={16} strokeWidth={2} />
                        </button>
                    </div>
                    {sidebarContent}
                </aside>
            )}

            {/* ══ Feedback Modal ══ */}
            {showFeedback && (
                <FeedbackModal
                    onClose={() => setShowFeedback(false)}
                    askEmail={isGuest}
                    defaultName={isGuest ? '' : (user?.display_name || '')}
                    defaultEmail={isGuest ? '' : (user?.email || '')}
                />
            )}

            {/* ══ Mobile bottom tab bar ══ */}
            <nav className="mobile-tab-bar" aria-label="Primary navigation" role="navigation">
              <div className="mobile-tab-bar__inner">
                {visibleBottomTabs.map((tab) => {
                  const isActive = tab.path ? tab.match(location.pathname) : false;
                  if (tab.path === null) {
                    return (
                      <button key="more" className={`mobile-tab-bar__tab${sidebarOpen ? ' active' : ''}`} onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
                        <span className="mobile-tab-bar__icon"><tab.Icon size={22} strokeWidth={1.75} /></span>
                        <span className="mobile-tab-bar__label">More</span>
                      </button>
                    );
                  }
                  return (
                    <button key={tab.path} className={`mobile-tab-bar__tab${isActive ? ' active' : ''}`} onClick={() => navigate(tab.path)} aria-label={tab.label} aria-current={isActive ? 'page' : undefined}>
                      <span className="mobile-tab-bar__icon"><tab.Icon size={22} strokeWidth={1.75} /></span>
                      <span className="mobile-tab-bar__label">{tab.label}</span>
                      {isActive && <span className="mobile-tab-bar__indicator" />}
                    </button>
                  );
                })}
              </div>
            </nav>
        </>
    );
}

export default Header;
