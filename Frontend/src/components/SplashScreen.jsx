import { useState, useEffect } from 'react';
import backgroundImage from '../assets/iitpkd_dashboard_bgi.avif';
import logoImage from '../assets/IIT_Palakkad_Logo.svg.png';
import './SplashScreen.css';

function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 300); // Small delay for fade out animation
    }, 2000); // 2 second splash screen

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`splash-screen ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="splash-background" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
      <div className="splash-content">
        <div className="splash-oval-container">
          <div className="splash-logo-container">
            <img src={logoImage} alt="IIT Palakkad Logo" className="splash-logo" />
          </div>
          <div className="splash-text-container">
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;

