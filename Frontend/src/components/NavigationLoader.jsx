import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './NavigationLoader.css';

export default function NavigationLoader() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(hideTimer.current);
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <div className="nav-loader-overlay" aria-hidden="true">
      <div className="nav-loader-box">
        <div className="nav-loader-spinner" />
      </div>
    </div>
  );
}
