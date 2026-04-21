import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Home.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';

function Header({ user, onLogout }) {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showNavbar, setShowNavbar] = useState(true);
    const lastScrollY = useRef(0);
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    // Handle scroll to hide/show navbar
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // If scrolling down AND past threshold (100px), hide navbar
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setShowNavbar(false);
            } else {
                // If scrolling up, show navbar
                setShowNavbar(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        };

        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileDropdown]);

    const toggleDropdown = () => {
        setShowProfileDropdown(prev => !prev);
    };

    const handleProfileClick = () => {
        setShowProfileDropdown(false);
        navigate('/profile');
    };

    const handleUploadClick = () => {
        setShowProfileDropdown(false);
        navigate('/upload');
    };

    // Check if user has role_id 2 or 3 for upload access
    const canUploadData = user && (user.role_id === 2 || user.role_id === 3 || user.role_id === 4);

    return (
        <div className="app-header-container">
            {/* Header with Logo and User Profile */}
            <header className="main-header">
                <div className="header-left">
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
                <div className="header-right">
                    <div
                        ref={dropdownRef}
                        className="user-profile-container"
                    >
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
                                        </div>
                                    </div>
                                </div>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item" onClick={handleProfileClick}>
                                    Profile & Admin Actions
                                </button>
                                <button className="dropdown-item" onClick={onLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Navigation Bar */}
            <nav className={`main-navbar ${showNavbar ? '' : 'navbar-hidden'}`}>
                <Link
                    to="/people-campus"
                    className={`nav-link ${location.pathname.startsWith('/people-campus') ? 'active' : ''}`}
                >
                    People and Campus
                </Link>
                <Link
                    to="/research"
                    className={`nav-link ${location.pathname.startsWith('/research') ? 'active' : ''}`}
                >
                    Research
                </Link>
                <Link
                    to="/education"
                    className={`nav-link ${location.pathname.startsWith('/education') ? 'active' : ''}`}
                >
                    Education
                </Link>
                <Link
                    to="/industry-connect"
                    className={`nav-link ${location.pathname.startsWith('/industry-connect') ? 'active' : ''}`}
                >
                    Industry Connect
                </Link>
                <Link
                    to="/innovation-entrepreneurship"
                    className={`nav-link ${location.pathname.startsWith('/innovation-entrepreneurship') ? 'active' : ''}`}
                >
                    Innovation and Entrepreneurship
                </Link>
                <Link
                    to="/outreach-extension"
                    className={`nav-link ${location.pathname.startsWith('/outreach-extension') ? 'active' : ''}`}
                >
                    Outreach and Extension
                </Link>
            </nav>
        </div>
    );
}

export default Header;
