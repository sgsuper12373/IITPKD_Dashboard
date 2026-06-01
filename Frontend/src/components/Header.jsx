import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  House, Users, FlaskConical, GraduationCap, Menu,
  FileText, Handshake, Building2, Factory, Lightbulb, Sprout, X,
} from 'lucide-react';
import './Home.css';
import './NativeApp.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';
import FeedbackModal from './FeedbackModal';
import { getRoleName } from '../utils/rolePermissions';

// All top-level nav entries with their page-key for role filtering
const ALL_NAV_LINKS = [
  { label: 'People and Campus',            path: '/people-campus',               pageKey: 'people-campus' },
  { label: 'Research',                     path: '/research',                    pageKey: 'research' },
  { label: 'Education',                    path: '/education',                   pageKey: 'education' },
  { label: 'Industry Connect',             path: '/industry-connect',            pageKey: 'industry-connect' },
  { label: 'Innovation and Entrepreneurship', path: '/innovation-entrepreneurship', pageKey: 'innovation-entrepreneurship' },
  { label: 'Outreach and Extension',       path: '/outreach-extension',          pageKey: 'outreach-extension' },
];

// All potential mobile bottom tabs (excluding More which is always present)
const ALL_BOTTOM_TABS = [
  { Icon: House,          label: 'Home',      path: '/',               pageKey: null,             match: (p) => p === '/' },
  { Icon: Users,          label: 'People',    path: '/people-campus',  pageKey: 'people-campus',  match: (p) => p.startsWith('/people-campus') },
  { Icon: FlaskConical,   label: 'Research',  path: '/research',       pageKey: 'research',       match: (p) => p.startsWith('/research') || p.startsWith('/patents') || p.startsWith('/mou-collaborations') },
  { Icon: GraduationCap,  label: 'Education', path: '/education',      pageKey: 'education',      match: (p) => p.startsWith('/education') },
];

const MORE_TAB = { Icon: Menu, label: 'More', path: null, match: () => false };

// Sidebar "Quick Navigation" items that are always shown regardless of role
const QUICK_NAV_ITEMS = [
  { Icon: House,     label: 'Home',           path: '/' },
  { Icon: FileText,  label: 'Patents',         path: '/patents' },
  { Icon: Handshake, label: 'Collaborations',  path: '/mou-collaborations' },
];

// Icons for main section items in the sidebar drawer
const SECTION_ICONS = {
  'people-campus':              Building2,
  'research':                   FlaskConical,
  'education':                  GraduationCap,
  'industry-connect':           Factory,
  'innovation-entrepreneurship': Lightbulb,
  'outreach-extension':         Sprout,
};


function Header({ user, onLogout, isGuest }) {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showFeedbackHint, setShowFeedbackHint] = useState(false);
    const dismissedPaths = useRef(new Set());
    const [showNavbar, setShowNavbar] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
    const lastScrollY = useRef(0);
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    // Every user sees all nav links — each page has a public view.
    const canSeePage = () => true;

    const visibleNavLinks   = ALL_NAV_LINKS.filter((l) => canSeePage(l.pageKey));
    const visibleBottomTabs = [...ALL_BOTTOM_TABS.filter((t) => canSeePage(t.pageKey)), MORE_TAB];

    // Track whether we're on a breakpoint where the navbar is CSS-hidden
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // True only when the navbar strip is both visible (not scrolled away) and rendered (not mobile)
    const navbarActuallyVisible = showNavbar && !isMobile;

    // Handle scroll to hide/show navbar
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setShowNavbar(false);
            } else {
                setShowNavbar(true);
            }
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => { window.removeEventListener('scroll', handleScroll); };
    }, []);

    // Handle click outside to close profile dropdown
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

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    // Show hint once per unique path per session; dismissed paths are remembered until page reload.
    useEffect(() => {
        setShowFeedbackHint(false);
        if (dismissedPaths.current.has(location.pathname)) return;
        const timer = setTimeout(() => setShowFeedbackHint(true), 4000);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const dismissHint = () => {
        dismissedPaths.current.add(location.pathname);
        setShowFeedbackHint(false);
    };

    const toggleDropdown = () => setShowProfileDropdown((prev) => !prev);

    const handleProfileClick = () => {
        setShowProfileDropdown(false);
        navigate('/profile');
    };

    const handleSignIn = () => {
        setShowProfileDropdown(false);
        onLogout();
        navigate('/login');
    };



    return (
        <>
            <div className="app-header-container">
                {/* Header with Logo and User Profile */}
                <header className="main-header">
                    <button
                        className="hamburger-btn"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open navigation menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <Link to="/" className="logo-link">
                        <img
                            src={IIPKD_Logo}
                            alt="IIT Palakkad Logo"
                            className="logo-image"
                        />
                        <div className="logo-text-group">
                            <span className="logo-text">
                                Indian Institute of Technology Palakkad
                            </span>
                            <span className="logo-tagline">
                                Nurturing Minds For a Better World
                            </span>
                        </div>
                    </Link>

                    <div className="header-right">
                        <div className="feedback-btn-wrapper">
                            <button
                                className="feedback-btn"
                                onClick={() => { setShowFeedback(true); dismissHint(); }}
                                aria-label="Open feedback form"
                            >
                                Feedback
                            </button>
                            {showFeedbackHint && (
                                <div className="feedback-hint-bubble" role="tooltip">
                                    <button
                                        className="feedback-hint-close"
                                        onClick={dismissHint}
                                        aria-label="Dismiss hint"
                                    >
                                        <X size={12} strokeWidth={2.5} />
                                    </button>
                                    <p>We value your <strong>feedback</strong>, thoughts &amp; suggestions. click this button to submit it anytime!</p>
                                </div>
                            )}
                        </div>
                        <div ref={dropdownRef} className="user-profile-container">
                            <div
                                className="user-avatar"
                                onClick={toggleDropdown}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleDropdown();
                                    }
                                }}
                            >
                                {isGuest ? 'G' : (user?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U')}
                            </div>
                            {showProfileDropdown && (
                                <div className="profile-dropdown">
                                    <div className="dropdown-header">
                                        <div className="dropdown-user-info">
                                            <div className="dropdown-avatar">
                                                {isGuest ? 'G' : (user?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U')}
                                            </div>
                                            <div className="dropdown-user-details">
                                                <div className="dropdown-name">{isGuest ? 'Guest' : (user?.display_name || 'User')}</div>
                                                <div className="dropdown-email">{isGuest ? 'Viewing as Guest' : (user?.email || '')}</div>
                                                <div className="dropdown-role" style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                                                    Role ID: {user?.role_id ?? 0} — {getRoleName(user?.role_id ?? 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    {isGuest ? (
                                        <button className="dropdown-item" onClick={handleSignIn}>
                                            Sign In
                                        </button>
                                    ) : (
                                        <>
                                            <button className="dropdown-item" onClick={handleProfileClick}>
                                                {user?.role_id === 3 ? 'Profile & Admin Actions' : 'Profile'}
                                            </button>
                                            <button className="dropdown-item" onClick={onLogout}>
                                                Logout
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Navigation Bar */}
                <nav className={`main-navbar ${showNavbar ? '' : 'navbar-hidden'}`}>
                    {visibleNavLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Sidebar Backdrop */}
            {sidebarOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Drawer */}
            {sidebarOpen && (
                <aside className="sidebar-drawer" role="navigation" aria-label="Quick navigation">
                    <div className="sidebar-header">
                        <span className="sidebar-title">Dashboard Navigation</span>
                        <button
                            className="sidebar-close-btn"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Close navigation menu"
                        >
                            <X size={16} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Main Sections — only show when nav bar is hidden (mobile) or always in sidebar */}
                    {!navbarActuallyVisible && visibleNavLinks.length > 0 && (
                        <div>
                            <p className="sidebar-section-label">Main Sections</p>
                            {visibleNavLinks.map((link) => (
                                <button
                                    key={link.path}
                                    className={`sidebar-nav-item ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
                                    onClick={() => { navigate(link.path); setSidebarOpen(false); }}
                                >
                                    <span className="sidebar-nav-icon">
                                        {(() => { const SIcon = SECTION_ICONS[link.pageKey]; return SIcon ? <SIcon size={16} strokeWidth={1.75} /> : null; })()}
                                    </span>
                                    <span>{link.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Quick Navigation */}
                    <div>
                        <p className="sidebar-section-label">Quick Navigation</p>
                        {QUICK_NAV_ITEMS.map((item) => (
                            <button
                                key={item.path}
                                className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                            >
                                <span className="sidebar-nav-icon"><item.Icon size={16} strokeWidth={1.75} /></span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="sidebar-divider" />

                    {/* User info at bottom */}
                    <div className="sidebar-user-box">
                        <div className="sidebar-user-label">
                            Signed in as
                        </div>
                        <div className="sidebar-user-name">
                            {isGuest ? 'Guest' : (user?.display_name || user?.email || 'User')}
                        </div>
                    </div>
                </aside>
            )}
            {/* Feedback Modal */}
            {showFeedback && (
                <FeedbackModal
                    onClose={() => setShowFeedback(false)}
                    defaultName={isGuest ? '' : (user?.display_name || '')}
                    defaultEmail={isGuest ? '' : (user?.email || '')}
                />
            )}

            {/* Bottom Tab Bar — mobile only (≤768px) */}
            <nav className="mobile-tab-bar" aria-label="Primary navigation" role="navigation">
              <div className="mobile-tab-bar__inner">
                {visibleBottomTabs.map((tab) => {
                  const isActive = tab.path ? tab.match(location.pathname) : false;
                  if (tab.path === null) {
                    return (
                      <button
                        key="more"
                        className={`mobile-tab-bar__tab${sidebarOpen ? ' active' : ''}`}
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open navigation menu"
                      >
                        <span className="mobile-tab-bar__icon"><tab.Icon size={22} strokeWidth={1.75} /></span>
                        <span className="mobile-tab-bar__label">More</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={tab.path}
                      className={`mobile-tab-bar__tab${isActive ? ' active' : ''}`}
                      onClick={() => navigate(tab.path)}
                      aria-label={tab.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
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
