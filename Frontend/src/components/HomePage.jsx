import { lazy, Suspense, useState } from 'react';
import './Page.css';
import './HomePage.css';

import NirfRankingSection from './NirfRankingSection';
import HomeIntro from '../home/HomeIntro';
import HomeTour from '../home/HomeTour';
import { JourneyPicker, MostVisited } from '../home/HomeDiscover';
import PillarCard from '../home/PillarCard';
import { PILLARS } from '../home/pillars';
import { useInstitutePulse } from '../hooks/useInstitutePulse';
import { useSiteSettings } from '../hooks/useSiteSettings';
import CampusClipart from './CampusClipart';

// ImageSlider carries its own CSS and animation logic; defer it so it doesn't
// block the initial paint of the welcome text and splash screen.
const ImageSlider = lazy(() => import('./ImageSlider'));
const QuickGlance = lazy(() => import('../pages/QuickGlance'));

// Auto-imports every image from iit-palakkad/ at build time.
// Drop images into that folder — they appear in the slider automatically, sorted alphabetically.
const _imageModules = import.meta.glob(
  '../assets/images/iit-palakkad/*',
  { eager: true }
);
const iitPalakkadImages = Object.keys(_imageModules)
  .sort()
  .map((key) => ({ src: _imageModules[key].default, duration: 4000, objectFit: 'cover' }));

function HomePage({ user }) {
  const [showTour, setShowTour] = useState(() => {
    try { return !localStorage.getItem('homeTourSeen'); } catch { return false; }
  });
  const { data } = useInstitutePulse(null);
  const { settings, toggle } = useSiteSettings();
  const isAdmin = user?.role_id === 3;
  const showSlider = settings.show_image_slider === 'true';
  const showNirf = settings.show_nirf === 'true';

  const closeTour = () => {
    try { localStorage.setItem('homeTourSeen', '1'); } catch { /* ignore */ }
    setShowTour(false);
  };

  return (
    <>
      {showTour && <HomeTour onClose={closeTour} />}
      <div className="page-container">
        <div className="page-content">
          <div className="welcome-section">
            <HomeIntro />
            <JourneyPicker />

            {/* Image Slider - IIT Palakkad Images */}
            {isAdmin && (
              <div className="hp-admin-toggle">
                <button type="button" className="hp-toggle-btn" onClick={() => toggle('show_image_slider')}>
                  {showSlider ? '⊘ Hide Image Slider' : '⊕ Show Image Slider'}
                </button>
              </div>
            )}
            {showSlider && (
              <Suspense fallback={<div className="hp-slider-fallback" />}>
                <ImageSlider images={iitPalakkadImages} autoSlideInterval={4000} />
              </Suspense>
            )}

            {/* Quick Glance — embedded directly */}
            <section id="quick-glance" className="hp-quick-glance-section">
              <Suspense fallback={null}>
                <QuickGlance user={user} />
              </Suspense>
            </section>

            {/* ── Six Dimensions of Our Vision ── */}
            <div className="vision-pillars-section" data-tour="pillars">

              {/* Top Row: People & Campus, Research, Education */}
              <div className="vision-pillars-grid">
                {PILLARS.slice(0, 3).map((p, i) => <PillarCard key={p.id} pillar={p} data={data} index={i} />)}
              </div>

              {/* Dark Banner with Campus Clipart */}
              <div className="vision-banner">
                <CampusClipart className="campus-clipart" />
                <span>S I X &nbsp; D I M E N S I O N S &nbsp; O F &nbsp; O U R &nbsp; V I S I O N</span>
              </div>

              {/* Bottom Row: Industry Connect, Innovation & Entrepreneurship, Outreach & Extension */}
              <div className="vision-pillars-grid">
                {PILLARS.slice(3).map((p, i) => <PillarCard key={p.id} pillar={p} data={data} index={i + 3} />)}
              </div>

            </div>

            <MostVisited />

            {/* NIRF Ranking Section */}
            {isAdmin && (
              <div className="hp-admin-toggle">
                <button type="button" className="hp-toggle-btn" onClick={() => toggle('show_nirf')}>
                  {showNirf ? '⊘ Hide NIRF Section' : '⊕ Show NIRF Section'}
                </button>
              </div>
            )}
            {showNirf && (
              <div data-tour="nirf"><NirfRankingSection user={user} /></div>
            )}

            {/* Main Sections Overview 
            <div className="content-card">
              <h2>Explore Our Institute</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>

                <div className="section-link-card">
                  <h3><Link to="/people-campus" style={{ color: '#087E8B', textDecoration: 'underline', fontSize: '1.5rem' }}>People and Campus</Link></h3>
                  <p>Explore our vibrant community, faculty profiles, staff details, and the life that thrives on our campus.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/research" style={{ color: '#087E8B', textDecoration: 'underline', fontSize: '1.5rem' }}>Research</Link></h3>
                  <p>Discover our cutting-edge research projects, publications, patents, and centers of excellence driving innovation.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/education" style={{ color: '#087E8B', textDecoration: 'underline', fontSize: '1.5rem' }}>Education</Link></h3>
                  <p>Learn about our academic programs, curriculum, departments, and the learning environment we offer.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/industry-connect" style={{ color: '#087E8B', textDecoration: 'underline', fontSize: '1.5rem' }}>Industry Connect</Link></h3>
                  <p>See our strong ties with the industry, including placements, internships, and collaborative projects.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/innovation-entrepreneurship" style={{ color: '#087E8B', textDecoration: 'underline', fontSize: '1.5rem' }}>Innovation and Entrepreneurship</Link></h3>
                  <p>Check out our incubation centre, startup ecosystem, and initiatives fostering the entrepreneurial spirit.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/outreach-extension" style={{ color: '#087E8B', textDecoration: 'underline', fontSize: '1.5rem' }}>Outreach and Extension</Link></h3>
                  <p>Read about our social initiatives, workshops, conferences, and community outreach programs.</p>
                </div>

              </div>
            </div> 
            */}

          </div>
        </div>
      </div>
    </>
  );
}

export default HomePage;
