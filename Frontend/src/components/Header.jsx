import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Home.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';

const SIDEBAR_LINKS = [
  {
    label: 'Quick Navigation',
    items: [
      { icon: '🏠', label: 'Home', path: '/' },
      { icon: '🎓', label: 'Student Overview', path: '/people-campus/academic-section' },
      { icon: '👥', label: 'Employee Overview', path: '/people-campus/administrative-section' },
      { icon: '📝', label: 'Patents', path: '/patents' },
      { icon: '🤝', label: 'Collaborations', path: '/mou-collaborations' },
    ],
  },
];

function Header({ user, onLogout, isGuest }) {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const lastScrollY = useRef(0);
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

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
                    <div className="header-left">
                        {/* Hamburger + Logo — explicitly inline flex so they share the same row */}
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
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
                                <div className="logo-container">
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
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="header-right">
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
                                                Profile &amp; Admin Actions
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
                    <Link to="/people-campus" className={`nav-link ${location.pathname.startsWith('/people-campus') ? 'active' : ''}`}>
                        People and Campus
                    </Link>
                    <Link to="/research" className={`nav-link ${location.pathname.startsWith('/research') ? 'active' : ''}`}>
                        Research
                    </Link>
                    <Link to="/education" className={`nav-link ${location.pathname.startsWith('/education') ? 'active' : ''}`}>
                        Education
                    </Link>
                    <Link to="/industry-connect" className={`nav-link ${location.pathname.startsWith('/industry-connect') ? 'active' : ''}`}>
                        Industry Connect
                    </Link>
                    <Link to="/innovation-entrepreneurship" className={`nav-link ${location.pathname.startsWith('/innovation-entrepreneurship') ? 'active' : ''}`}>
                        Innovation and Entrepreneurship
                    </Link>
                    <Link to="/outreach-extension" className={`nav-link ${location.pathname.startsWith('/outreach-extension') ? 'active' : ''}`}>
                        Outreach and Extension
                    </Link>
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
                            ✕
                        </button>
                    </div>

                    {SIDEBAR_LINKS.map((section) => (
                        <div key={section.label}>
                            <p className="sidebar-section-label">{section.label}</p>
                            {section.items.map((item) => (
                                <button
                                    key={item.path}
                                    className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                                >
                                    <span className="sidebar-nav-icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}

                    <div className="sidebar-divider" />

                    {/* User info at bottom */}
                    <div style={{ padding: '12px 20px', marginTop: 'auto' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Signed in as
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {isGuest ? 'Guest' : (user?.display_name || user?.email || 'User')}
                        </div>
                    </div>
                </aside>
            )}
        </>
    );
}

export default Header;
