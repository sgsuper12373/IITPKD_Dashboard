import { MapPin } from 'lucide-react';
import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <a
        href="https://maps.google.com/maps?q=Indian+Institute+of+Technology+Palakkad,+Kanjikode,+Kerala"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-map-link"
        aria-label="Find IIT Palakkad on Google Maps"
      >
        Find Us <MapPin size={16} strokeWidth={1.75} />
      </a>
      <span className="footer-copyright">
        &copy; {new Date().getFullYear()} IIT Palakkad. All rights reserved.
      </span>
    </footer>
  );
}

export default Footer;
