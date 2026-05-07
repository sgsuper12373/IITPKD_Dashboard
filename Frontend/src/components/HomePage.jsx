import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import './Page.css';
import './HomePage.css';
import SplashScreen from './SplashScreen';
import NirfRankingSection from './NirfRankingSection';

// ImageSlider carries its own CSS and animation logic; defer it so it doesn't
// block the initial paint of the welcome text and splash screen.
const ImageSlider = lazy(() => import('./ImageSlider'));

// ⚙️ INSTRUCTIONS: Add your IIT Palakkad images here
// Step 1: Place your images in: Frontend/src/assets/images/iit-palakkad/
// Step 2: Import them below (uncomment and add your image paths)
// Step 3: Add them to the images array in the ImageSlider component

// Example imports (uncomment and modify when you add images):
import iitImage1 from '../assets/images/iit-palakkad/image1.avif';
import iitImage2 from '../assets/images/iit-palakkad/image2.avif';
import iitImage3 from '../assets/images/iit-palakkad/image3.avif';
import iitImage4 from '../assets/images/iit-palakkad/image4.avif';
import iitImage5 from '../assets/images/iit-palakkad/image5.avif';
import iitImage6 from '../assets/images/iit-palakkad/image6.jpg';



// For now, using empty array - add your images here when ready
const iitPalakkadImages = [
  // Add your imported images here, for example:
  iitImage1,
  iitImage2,
  iitImage3,
  iitImage4,
  iitImage5,
  iitImage6,

];

function HomePage({ user }) {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div className="page-container">
        <div className="page-content">
          <div className="welcome-section">
            <h1>Exploring the Vision that shapes Indian Institute of Technology Palakkad</h1>

            {/* Image Slider - IIT Palakkad Images */}
            <Suspense fallback={<div style={{ height: 320, background: '#f0f0f0', borderRadius: 8 }} />}>
              <ImageSlider images={iitPalakkadImages} autoSlideInterval={4000} />
            </Suspense>

            <div className="content-card">

              <h2>Vision and Strategic Focus</h2>

              <p>
                At Indian Institute of Technology Palakkad, we strive to build a dynamic institution that nurtures talent, advances knowledge, and contributes to society. Our vision is guided by six key pillars: People and Campus, Education, Research, Industry Connect, Innovation and Entrepreneurship, and Outreach and Extension.
              </p>

              <h3>
                <Link to="/people-campus" style={{ color: "#111111", textDecoration: "underline", textShadow: "0 1px 4px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.9)" }}>
                  People and Campus
                </Link>
              </h3>
              <p>
                We are committed to building an inclusive and diverse community that values well-being and growth. With strong alumni engagement and a focus on sustainability, we aim to achieve a net-zero carbon campus by 2040.
              </p>

              <h3>
                <Link to="/research" style={{ color: "#111111", textDecoration: "underline", textShadow: "0 1px 4px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.9)" }}>
                  Research
                </Link>
              </h3>
              <p>
                We aim to lead in both fundamental and applied research by fostering interdisciplinary collaboration. Our work focuses on addressing real-world challenges, particularly in sustainability, supported by accessible, state-of-the-art infrastructure.
              </p>

              <h3>
                <Link to="/education" style={{ color: "#111111", textDecoration: "underline", textShadow: "0 1px 4px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.9)" }}>
                  Education
                </Link>
              </h3>
              <p>
                We offer flexible, rigorous, and contemporary academic programmes that prepare students for a rapidly changing world. Our approach emphasizes interdisciplinary learning, innovation in teaching, and a strong focus on hands-on and research-based education.
              </p>

              <h3>
                <Link to="/industry-connect" style={{ color: "#111111", textDecoration: "underline", textShadow: "0 1px 4px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.9)" }}>
                  Industry Connect
                </Link>
              </h3>
              <p>
                We collaborate closely with industry to align research with practical applications. Through partnerships and knowledge exchange, we prepare students to be industry-ready and contribute to national development.
              </p>

              <h3>
                <Link to="/innovation-entrepreneurship" style={{ color: "#111111", textDecoration: "underline", textShadow: "0 1px 4px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.9)" }}>
                  Innovation and Entrepreneurship
                </Link>
              </h3>
              <p>
                We promote a culture of innovation by supporting the journey from ideas to impactful ventures. Our ecosystem encourages students and faculty to develop solutions that address societal needs.
              </p>

              <h3>
                <Link to="/outreach-extension" style={{ color: "#111111", textDecoration: "underline", textShadow: "0 1px 4px rgba(255, 255, 255, 0.8), 0 0 1px rgba(255, 255, 255, 0.9)" }}>
                  Outreach and Extension
                </Link>
              </h3>
              <p>
                We actively engage with communities to promote science and technology, inspire young minds, and support continuing education and skill development.
              </p>

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
