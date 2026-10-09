import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import './Page.css';
import './HomePage.css';
import SplashScreen from './SplashScreen';
import NirfRankingSection from './NirfRankingSection';
import HomeIntro from '../home/HomeIntro';
import HomeTour from '../home/HomeTour';
import { Highlights, JourneyPicker, MostVisited, NumbersStory, RecentPages } from '../home/HomeDiscover';
import PillarCard from '../home/PillarCard';
import { PILLARS } from '../home/pillars';
import { useInstitutePulse } from '../hooks/useInstitutePulse';

const LivePreview = lazy(() => import('../home/LivePreview'));

// ImageSlider carries its own CSS and animation logic; defer it so it doesn't
// block the initial paint of the welcome text and splash screen.
const ImageSlider = lazy(() => import('./ImageSlider'));

import dashboardBanner from '../assets/iit_palakkad_dashboard_banner.avif';

// Auto-imports every image from iit-palakkad/ at build time.
// Drop images into that folder — they appear in the slider automatically, sorted alphabetically.
const _imageModules = import.meta.glob(
  '../assets/images/iit-palakkad/*',
  { eager: true }
);
const _baseImages = Object.keys(_imageModules)
  .sort()
  .map((key) => _imageModules[key].default);

// Dashboard banner: 2× screen time, no cropping (contain keeps full image visible).
const iitPalakkadImages = [
  { src: dashboardBanner, duration: 10000, objectFit: 'contain' },
  ..._baseImages.map((src) => ({ src, duration: 4000, objectFit: 'cover' })),
];

function HomePage({ user }) {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem('splashShown')
  );

  const [showTour, setShowTour] = useState(false);
  // One data load shared by the preview cards, pillar teasers and highlights.
  const { status, data } = useInstitutePulse(null);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
    let seen = true;
    try { seen = !!localStorage.getItem('homeTourSeen'); } catch { /* storage blocked: skip auto-tour */ }
    if (!seen) setShowTour(true);
  };

  const closeTour = () => {
    try { localStorage.setItem('homeTourSeen', '1'); } catch { /* ignore */ }
    setShowTour(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {showTour && <HomeTour onClose={closeTour} />}
      <div className="page-container">
        <div className="page-content">
          <div className="welcome-section">
            <HomeIntro onStartTour={() => setShowTour(true)} data={data} />

            <Suspense fallback={null}>
              <LivePreview status={status} data={data} />
            </Suspense>

            <RecentPages />

            <Highlights data={data} />

            {/* Image Slider - IIT Palakkad Images */}
            <Suspense fallback={<div className="hp-slider-fallback" />}>
              <ImageSlider images={iitPalakkadImages} autoSlideInterval={4000} />
            </Suspense>

            {/* ── Six Dimensions of Our Vision ── */}
            <div className="vision-pillars-section" data-tour="pillars">

              {/* Top Row: People & Campus, Research, Education */}
              <div className="vision-pillars-grid">
                {PILLARS.slice(0, 3).map((p, i) => <PillarCard key={p.id} pillar={p} data={data} index={i} />)}
              </div>

              {/* Dark Banner */}
              <div className="vision-banner">
                <span>S I X &nbsp; D I M E N S I O N S &nbsp; O F &nbsp; O U R &nbsp; V I S I O N</span>
              </div>

              {/* Bottom Row: Industry Connect, Innovation & Entrepreneurship, Outreach & Extension */}
              <div className="vision-pillars-grid">
                {PILLARS.slice(3).map((p, i) => <PillarCard key={p.id} pillar={p} data={data} index={i + 3} />)}
              </div>

            </div>
            <NumbersStory data={data} />

            <MostVisited />

            <JourneyPicker />

            {/* NIRF Ranking Section */}
            <div data-tour="nirf"><NirfRankingSection user={user} /></div>

            {/* Main Sections Overview 
            <div className="content-card">
              <h2>Explore Our Institute</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>

                <div className="section-link-card">
                  <h3><Link to="/people-campus" style={{ color: '#f7a600', textDecoration: 'underline', fontSize: '1.5rem' }}>People and Campus</Link></h3>
                  <p>Explore our vibrant community, faculty profiles, staff details, and the life that thrives on our campus.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/research" style={{ color: '#f7a600', textDecoration: 'underline', fontSize: '1.5rem' }}>Research</Link></h3>
                  <p>Discover our cutting-edge research projects, publications, patents, and centers of excellence driving innovation.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/education" style={{ color: '#f7a600', textDecoration: 'underline', fontSize: '1.5rem' }}>Education</Link></h3>
                  <p>Learn about our academic programs, curriculum, departments, and the learning environment we offer.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/industry-connect" style={{ color: '#f7a600', textDecoration: 'underline', fontSize: '1.5rem' }}>Industry Connect</Link></h3>
                  <p>See our strong ties with the industry, including placements, internships, and collaborative projects.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/innovation-entrepreneurship" style={{ color: '#f7a600', textDecoration: 'underline', fontSize: '1.5rem' }}>Innovation and Entrepreneurship</Link></h3>
                  <p>Check out our incubation centre, startup ecosystem, and initiatives fostering the entrepreneurial spirit.</p>
                </div>

                <div className="section-link-card">
                  <h3><Link to="/outreach-extension" style={{ color: '#f7a600', textDecoration: 'underline', fontSize: '1.5rem' }}>Outreach and Extension</Link></h3>
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
