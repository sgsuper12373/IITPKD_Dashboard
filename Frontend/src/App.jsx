import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import ScrollToTop from './components/ScrollToTop';

// Critical components stay static
import Login from './components/Login';
import Home from './components/Home';

// Lazy load dashboard sections
const HomePage = lazy(() => import('./components/HomePage'));
const PeopleCampus = lazy(() => import('./components/PeopleCampus'));
const Research = lazy(() => import('./components/Research'));
const Education = lazy(() => import('./components/Education'));
const IndustryConnect = lazy(() => import('./components/IndustryConnect'));
const InnovationEntrepreneurship = lazy(() => import('./components/InnovationEntrepreneurship'));
const OutreachExtension = lazy(() => import('./components/OutreachExtension'));
const Profile = lazy(() => import('./components/Profile'));
const UploadForm = lazy(() => import('./components/UploadForm'));
const CreateUser = lazy(() => import('./components/CreateUser'));
const AcademicSection = lazy(() => import('./components/AcademicSection'));
const AdministrativeSection = lazy(() => import('./components/AdministrativeSection'));
const IgrcSection = lazy(() => import('./components/IgrcSection'));
const IccSection = lazy(() => import('./components/IccSection'));
const EwdSection = lazy(() => import('./components/EwdSection'));
const IarSection = lazy(() => import('./components/IarSection'));
const PlacementSection = lazy(() => import('./components/PlacementSection'));
const EducationAcademicSection = lazy(() => import('./components/EducationAcademicSection'));
const EducationIarSection = lazy(() => import('./components/EducationIarSection'));
const ResearchIcsrSection = lazy(() => import('./components/ResearchIcsrSection'));
const Patents = lazy(() => import('./components/Patents'));
const MoUCollaborations = lazy(() => import('./components/MoUCollaborations'));
const IndustryAdministrativeSection = lazy(() => import('./components/IndustryAdministrativeSection'));
const ResearchLibrarySection = lazy(() => import('./components/ResearchLibrarySection'));
const InnovationSection = lazy(() => import('./components/InnovationSection'));
const IptifSection = lazy(() => import('./components/IptifSection'));
const TechinSection = lazy(() => import('./components/TechinSection'));
const IcsrSection = lazy(() => import('./components/IcsrSection'));
const ConclaveSection = lazy(() => import('./components/ConclaveSection'));
const OpenHouseSection = lazy(() => import('./components/OpenHouseSection'));
const NptelSection = lazy(() => import('./components/NptelSection'));
const UbaSection = lazy(() => import('./components/UbaSection'));
const SocialEngagement = lazy(() => import('./components/SocialEngagement'));
const StudentsEngagementSection = lazy(() => import('./components/StudentsEngagement'));
const OutreachSection = lazy(() => import('./components/OutreachSection'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#667eea', fontWeight: 600 }}>
    Loading dashboard...
  </div>
);

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Rehydrate auth state on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (storedToken) {
      setToken(storedToken);
      if (storedUser && storedUser !== 'undefined') {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('authUser');
        }
      }
    }
  }, []);

  const handleLoginSuccess = (receivedToken, receivedUser) => {
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('authToken', receivedToken);
    localStorage.setItem('authUser', JSON.stringify(receivedUser));
  };

  const handleGuestAccess = () => {
    setIsGuestMode(true);
    setUser({ username: 'Guest', display_name: 'Guest', role_id: 1, isGuest: true });
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsGuestMode(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  // Strip invalid auth headers so unauthenticated users can reach public endpoints
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const auth = config.headers?.Authorization;
      if (!auth || auth === 'Bearer null' || auth === 'Bearer undefined') {
        delete config.headers.Authorization;
      }
      return config;
    });
    return () => { axios.interceptors.request.eject(requestInterceptor); };
  }, []);

  // Axios interceptor to catch 401 errors (e.g. token expiration) and auto-logout
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401 && token) {
          // Only auto-logout if the user was actually logged in
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  // Allows authenticated users AND guest mode
  const ProtectedRoute = ({ children }) => {
    return (token || isGuestMode) ? children : <Navigate to="/login" replace />;
  };

  // Requires a real auth token (admin-only routes)
  const AuthRoute = ({ children }) => {
    return token ? children : <Navigate to="/login" replace />;
  };

  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              (token || isGuestMode) ? <Navigate to="/" replace /> :
                <Login onLoginSuccess={handleLoginSuccess} onGuestAccess={handleGuestAccess} />
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home user={user} onLogout={handleLogout} isGuest={isGuestMode} />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage user={user} />} />
            <Route path="people-campus" element={<PeopleCampus user={user} />} />
            <Route path="people-campus/academic-section" element={<AcademicSection user={user} />} />
            <Route path="people-campus/administrative-section" element={<AdministrativeSection user={user} />} />
            <Route path="people-campus/igrc" element={<IgrcSection user={user} />} />
            <Route path="people-campus/icc" element={<IccSection user={user} />} />
            <Route path="people-campus/ewd" element={<EwdSection user={user} />} />
            <Route path="people-campus/iar" element={<IarSection user={user} />} />
            <Route path="research" element={<Research user={user} />} />
            <Route path="research/icsr" element={<ResearchIcsrSection user={user} />} />
            <Route path="patents" element={<Patents user={user} />} />
            <Route path="mou-collaborations" element={<MoUCollaborations user={user} />} />
            <Route path="research/administrative-section" element={<IndustryAdministrativeSection user={user} />} />
            <Route path="research/library" element={<ResearchLibrarySection user={user} />} />
            <Route path="education" element={<Education user={user} />} />
            <Route path="education/placements" element={<PlacementSection user={user} />} />
            <Route path="education/academic-section" element={<EducationAcademicSection user={user} />} />
            <Route path="education/iar" element={<EducationIarSection user={user} />} />
            <Route path="industry-connect" element={<IndustryConnect user={user} />} />
            <Route path="innovation-entrepreneurship" element={<InnovationEntrepreneurship user={user} />} />
            <Route path="innovation-entrepreneurship/iptif" element={<IptifSection user={user} />} />
            <Route path="innovation-entrepreneurship/techin" element={<TechinSection user={user} />} />
            <Route path="industry-connect/icsr" element={<IcsrSection user={user} />} />
            <Route path="industry-connect/conclave" element={<ConclaveSection user={user} />} />
            <Route path="outreach-extension" element={<OutreachExtension user={user} />} />
            <Route path="outreach-extension/open-house" element={<OpenHouseSection user={user} />} />
            <Route path="outreach-extension/nptel" element={<NptelSection user={user} />} />
            <Route path="outreach-extension/uba" element={<UbaSection user={user} />} />
            {/* Admin social/students engagement routes */}
            <Route path="outreach-extension/social-engagements" element={<SocialEngagement user={user} />} />
            <Route path="outreach-extension/students-engagement" element={<StudentsEngagementSection user={user} />} />
            <Route path="outreach-extension/outreach" element={<OutreachSection user={user} />} />
            {/* Public view sub-routes — social engagement */}
            <Route path="outreach-extension/social-engagement" element={<SocialEngagement user={user} />} />
            <Route path="outreach-extension/social-engagement/UBA" element={<UbaSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/social-engagement/OpenHouse" element={<OpenHouseSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/social-engagement/InstituteVisits" element={<OutreachSection user={user} isPublicView={true} programKey="institute_visits" />} />
            <Route path="outreach-extension/social-engagement/NSS" element={<OutreachSection user={user} isPublicView={true} programKey="nss_activities" />} />
            {/* Public view sub-routes — students engagement */}
            <Route path="outreach-extension/students-engagement/nptel" element={<NptelSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/students-engagement/pmc" element={<OutreachSection user={user} isPublicView={true} programKey="palakkad_math_circle" />} />
            <Route path="outreach-extension/students-engagement/pbd" element={<OutreachSection user={user} isPublicView={true} programKey="pale_blue_dot" />} />
            <Route path="outreach-extension/students-engagement/sq" element={<OutreachSection user={user} isPublicView={true} programKey="science_quest" />} />
            {/* Admin-only routes — require real auth token, not guest */}
            <Route path="profile" element={<AuthRoute><Profile user={user} /></AuthRoute>} />
            <Route path="upload" element={<AuthRoute><UploadForm token={token} onLogout={handleLogout} /></AuthRoute>} />
            <Route path="create-user" element={<AuthRoute><CreateUser user={user} token={token} /></AuthRoute>} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;