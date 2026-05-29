import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import './Page.css';
import './HomePage.css';
import SplashScreen from './SplashScreen';
import NirfRankingSection from './NirfRankingSection';

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

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', '1');
    setShowSplash(false);
  };

  // Every user sees all six pillar cards — each page has a public view.
  const canSeePage = () => true;

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div className="page-container">
        <div className="page-content">
          <div className="welcome-section">
            <h1>Exploring the Vision that shapes Us</h1>

            {/* Image Slider - IIT Palakkad Images */}
            <Suspense fallback={<div className="hp-slider-fallback" />}>
              <ImageSlider images={iitPalakkadImages} autoSlideInterval={4000} />
            </Suspense>

            {/* ── Six Dimensions of Our Vision ── */}
            <div className="vision-pillars-section">

              {/* Top Row: People & Campus, Research, Education */}
              <div className="vision-pillars-grid">
                {canSeePage('people-campus') && (
                  <Link to="/people-campus" className="vision-pillar-card">
                    <h3 className="vision-pillar-title">
                      <span className="vision-pillar-icon">🌿</span> <span className="vision-pillar-title-text"><u>People</u> &amp; Campus</span>
                    </h3>
                    <ul className="vision-pillar-list">
                      <li>Be a diverse and inclusive community</li>
                      <li>Promote wellness and personal development among our community</li>
                      <li>Nourish strong ties with our alumni</li>
                      <li>Achieve a net-zero carbon campus by 2040</li>
                    </ul>
                  </Link>
                )}

                {canSeePage('research') && (
                  <Link to="/research" className="vision-pillar-card">
                    <h3 className="vision-pillar-title">
                      <span className="vision-pillar-icon">🔬</span> <span className="vision-pillar-title-text"><u>Research</u></span>
                    </h3>
                    <ul className="vision-pillar-list">
                      <li>Be at the forefront of both applied research and blue sky research</li>
                      <li>Nurture a collaborative ecosystem for interdisciplinary and transdisciplinary inquiry</li>
                      <li>Develop state-of-the-art research infrastructure accessible to institutions and industries</li>
                      <li>Provide solutions that sustain ecologically sensitive regions, with emphasis on our neighbourhood</li>
                    </ul>
                  </Link>
                )}

                {canSeePage('education') && (
                  <Link to="/education" className="vision-pillar-card">
                    <h3 className="vision-pillar-title">
                      <span className="vision-pillar-icon">🎓</span> <span className="vision-pillar-title-text"><u>Education</u></span>
                    </h3>
                    <ul className="vision-pillar-list">
                      <li>Design programmes that prepare students for a leading role in an ever-changing world</li>
                      <li>Provide broad-based, flexible and rigorous undergraduate education</li>
                      <li>Offer rigorous masters &amp; doctoral programmes attuned to industry and academia</li>
                      <li>Be flexible and innovative in teaching practices catering to diverse learning needs</li>
                      <li>Promote hands-on and research-based learning</li>
                    </ul>
                  </Link>
                )}
              </div>

              {/* Dark Banner */}
              <div className="vision-banner">
                <span>S I X &nbsp; D I M E N S I O N S &nbsp; O F &nbsp; O U R &nbsp; V I S I O N</span>
              </div>

              {/* Bottom Row: Industry Connect, Innovation & Entrepreneurship, Outreach & Extension */}
              <div className="vision-pillars-grid">
                {canSeePage('industry-connect') && (
                  <Link to="/industry-connect" className="vision-pillar-card">
                    <h3 className="vision-pillar-title">
                      <span className="vision-pillar-icon">🏭</span> <span className="vision-pillar-title-text"><u>Industry</u> Connect</span>
                    </h3>
                    <ul className="vision-pillar-list">
                      <li>Synergize R&amp;D goals with industry and be a technological solution provider</li>
                      <li>Champion academic initiatives that benefit from mutual knowledge exchange</li>
                      <li>Offer opportunities for students to become industry-ready professionals</li>
                      <li>Leverage proximity to an industrial corridor to contribute to India's self-reliance mission</li>
                    </ul>
                  </Link>
                )}

                {canSeePage('innovation-entrepreneurship') && (
                  <Link to="/innovation-entrepreneurship" className="vision-pillar-card">
                    <h3 className="vision-pillar-title">
                      <span className="vision-pillar-icon">💡</span> <span className="vision-pillar-title-text"><u>Innovation &amp; Entrepreneurship</u></span>
                    </h3>
                    <ul className="vision-pillar-list">
                      <li>Build a vibrant ecosystem spanning ideation, prototyping, product development and incubation</li>
                      <li>Foster a culture of innovation; encourage students, staff and faculty to take ideas to market</li>
                      <li>Connect innovation activities to solve societal challenges</li>
                    </ul>
                  </Link>
                )}

                {canSeePage('outreach-extension') && (
                  <Link to="/outreach-extension" className="vision-pillar-card">
                    <h3 className="vision-pillar-title">
                      <span className="vision-pillar-icon">🌱</span> <span className="vision-pillar-title-text"><u>Outreach &amp; Extension</u></span>
                    </h3>
                    <ul className="vision-pillar-list">
                      <li>Be actively engaged with the local community</li>
                      <li>Partner with local organisations to strengthen public engagement with science and technology</li>
                      <li>Inspire young minds to dream big and nurture them in their pursuits</li>
                      <li>Be a hub for continuing education and skill development</li>
                    </ul>
                  </Link>
                )}
              </div>

            </div>
            {/* NIRF Ranking Section */}
            <NirfRankingSection user={user} />

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
