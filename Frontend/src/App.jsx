import { useState, useEffect, lazy, Suspense, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Always-eager: on the critical first-paint path
import ScrollToTop from './components/ScrollToTop';
import Login from './components/Login';

// ── Lazy route chunks ──────────────────────────────────────────────────────
// Each import() becomes its own JS chunk; the browser only fetches a chunk
// when the user first navigates to that route.

const Home = lazy(() => import('./components/Home'));
const HomePage = lazy(() => import('./components/HomePage'));

// People & Campus
const PeopleCampus = lazy(() => import('./components/PeopleCampus'));
const AcademicSection = lazy(() => import('./components/AcademicSection'));
const AdministrativeSection = lazy(() => import('./components/AdministrativeSection'));
const IgrcSection = lazy(() => import('./components/IgrcSection'));
const IccSection = lazy(() => import('./components/IccSection'));
const EwdSection = lazy(() => import('./components/EwdSection'));
const IarSection = lazy(() => import('./components/IarSection'));

// Research
const Research = lazy(() => import('./components/Research'));
const ResearchIcsrSection = lazy(() => import('./components/ResearchIcsrSection'));
const Patents = lazy(() => import('./components/Patents'));
const MoUCollaborations = lazy(() => import('./components/MoUCollaborations'));
const IndustryAdministrativeSection = lazy(() => import('./components/IndustryAdministrativeSection'));
const ResearchLibrarySection = lazy(() => import('./components/ResearchLibrarySection'));

// Education
const Education = lazy(() => import('./components/Education'));
const PlacementSection = lazy(() => import('./components/PlacementSection'));
const EducationAcademicSection = lazy(() => import('./components/EducationAcademicSection'));
const EducationIarSection = lazy(() => import('./components/EducationIarSection'));

// Industry Connect
const IndustryConnect = lazy(() => import('./components/IndustryConnect'));
const IcsrSection = lazy(() => import('./components/IcsrSection'));
const ConclaveSection = lazy(() => import('./components/ConclaveSection'));

// Innovation & Entrepreneurship
const InnovationEntrepreneurship = lazy(() => import('./components/InnovationEntrepreneurship'));
const InnovationSection = lazy(() => import('./components/InnovationSection'));
const IptifSection = lazy(() => import('./components/IptifSection'));
const TechinSection = lazy(() => import('./components/TechinSection'));
const HomeGroundStartup = lazy(() => import('./components/HomeGroundStartup'));

// Outreach & Extension
const OutreachExtension = lazy(() => import('./components/OutreachExtension'));
const OpenHouseSection = lazy(() => import('./components/OpenHouseSection'));
const NptelSection = lazy(() => import('./components/NptelSection'));
const UbaSection = lazy(() => import('./components/UbaSection'));
const SocialEngagement = lazy(() => import('./components/SocialEngagement'));
const StudentsEngagementSection = lazy(() => import('./components/StudentsEngagement'));
const OutreachSection = lazy(() => import('./components/OutreachSection'));

// Admin-only
const Profile = lazy(() => import('./components/Profile'));
const UploadForm = lazy(() => import('./components/UploadForm'));
const CreateUser = lazy(() => import('./components/CreateUser'));

// ── Loading fallback ───────────────────────────────────────────────────────
// Shown while a lazy chunk is being fetched. Kept intentionally minimal so
// it renders instantly from the already-loaded main bundle.
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#f8f9fa'
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      border: '4px solid #e9ecef', borderTopColor: '#667eea',
      animation: 'spin 0.75s linear infinite'
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── Chunk error boundary ───────────────────────────────────────────────────
// Catches CSS/JS preload failures caused by stale Vite asset hashes in a
// cached index.html after a new deploy. On first occurrence it reloads once
// (sessionStorage guards against an infinite reload loop). If the error
// persists after the reload it renders a manual refresh prompt instead.
class ChunkErrorBoundary extends Component {
  static RELOAD_KEY = 'chunk_error_reloaded';

  static isChunkError(error) {
    return (
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Unable to preload') ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch')
    );
  }

  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return ChunkErrorBoundary.isChunkError(error) ? { hasError: true } : null;
  }

  componentDidCatch(error) {
    if (!ChunkErrorBoundary.isChunkError(error)) return;
    if (!sessionStorage.getItem(ChunkErrorBoundary.RELOAD_KEY)) {
      sessionStorage.setItem(ChunkErrorBoundary.RELOAD_KEY, '1');
      window.location.reload();
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: '1rem',
        fontFamily: 'sans-serif', color: '#555'
      }}>
        <p>This page failed to load. The site may have been updated.</p>
        <button
          onClick={() => {
            sessionStorage.removeItem(ChunkErrorBoundary.RELOAD_KEY);
            window.location.reload();
          }}
          style={{
            padding: '0.5rem 1.5rem', borderRadius: '6px',
            border: '1.5px solid #667eea', background: '#667eea',
            color: '#fff', cursor: 'pointer', fontSize: '0.95rem'
          }}
        >
          Refresh page
        </button>
      </div>
    );
  }
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // Blocks route rendering until localStorage has been read, preventing the
  // race where ProtectedRoute redirects to /login before rehydration finishes.
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Guard against undefined env var: if VITE_GUEST_EMAIL is unset, both sides
  // would be undefined and the equality would incorrectly return true.
  const isGuestMode =
    !!user &&
    !!import.meta.env.VITE_GUEST_EMAIL &&
    user.email === import.meta.env.VITE_GUEST_EMAIL;

  // Rehydrate auth state on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');

    if (storedToken) {
      if (storedUser && storedUser !== 'undefined') {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Guest sessions must not persist across page loads
          if (parsedUser?.email === import.meta.env.VITE_GUEST_EMAIL) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            setIsAuthChecked(true);
            return;
          }
          setToken(storedToken);
          setUser(parsedUser);
        } catch {
          localStorage.removeItem('authUser');
        }
      } else {
        setToken(storedToken);
      }
    }
    setIsAuthChecked(true);
  }, []);

  const handleLoginSuccess = (receivedToken, receivedUser) => {
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('authToken', receivedToken);
    localStorage.setItem('authUser', JSON.stringify(receivedUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
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
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    return () => { axios.interceptors.response.eject(responseInterceptor); };
  }, [token]);

  const ProtectedRoute = ({ children }) =>
    (token || isGuestMode) ? children : <Navigate to="/login" replace />;

  const AuthRoute = ({ children }) =>
    token ? children : <Navigate to="/login" replace />;

  const AdminRoute = ({ children }) => {
    // role 0 users can now access these sections (they see restricted views)
    if (!user) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // Wait for localStorage rehydration before rendering any routes so that
  // ProtectedRoute never redirects away from a valid deep-link on hard reload.
  if (!isAuthChecked) return <PageLoader />;

  return (
    <Router>
      <ScrollToTop />
      <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/login"
            element={
              (token || isGuestMode) ? <Navigate to="/" replace /> :
                <Login onLoginSuccess={handleLoginSuccess} />
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
            <Route path="people-campus/academic-section" element={<AdminRoute><AcademicSection user={user} /></AdminRoute>} />
            <Route path="people-campus/administrative-section" element={<AdminRoute><AdministrativeSection user={user} /></AdminRoute>} />
            <Route path="people-campus/igrc" element={<AdminRoute><IgrcSection user={user} /></AdminRoute>} />
            <Route path="people-campus/icc" element={<AdminRoute><IccSection user={user} /></AdminRoute>} />
            <Route path="people-campus/ewd" element={<AdminRoute><EwdSection user={user} /></AdminRoute>} />
            <Route path="people-campus/iar" element={<AdminRoute><IarSection user={user} /></AdminRoute>} />
            <Route path="research" element={<Research user={user} />} />
            <Route path="research/icsr" element={<AdminRoute><ResearchIcsrSection user={user} /></AdminRoute>} />
            <Route path="patents" element={<AdminRoute><Patents user={user} /></AdminRoute>} />
            <Route path="mou-collaborations" element={<AdminRoute><MoUCollaborations user={user} /></AdminRoute>} />
            <Route path="research/administrative-section" element={<AdminRoute><IndustryAdministrativeSection user={user} /></AdminRoute>} />
            <Route path="research/library" element={<AdminRoute><ResearchLibrarySection user={user} /></AdminRoute>} />
            <Route path="education" element={<Education user={user} />} />
            <Route path="education/placements" element={<AdminRoute><PlacementSection user={user} /></AdminRoute>} />
            <Route path="education/academic-section" element={<AdminRoute><EducationAcademicSection user={user} /></AdminRoute>} />
            <Route path="education/iar" element={<AdminRoute><EducationIarSection user={user} /></AdminRoute>} />
            <Route path="industry-connect" element={<IndustryConnect user={user} />} />
            <Route path="innovation-entrepreneurship" element={<InnovationEntrepreneurship user={user} />} />
            <Route path="innovation-entrepreneurship/iptif" element={<AdminRoute><IptifSection user={user} /></AdminRoute>} />
            <Route path="innovation-entrepreneurship/techin" element={<AdminRoute><TechinSection user={user} /></AdminRoute>} />
            <Route path="innovation-entrepreneurship/home-ground-startup" element={<HomeGroundStartup user={user} />} />
            <Route path="industry-connect/icsr" element={<AdminRoute><IcsrSection user={user} /></AdminRoute>} />
            <Route path="industry-connect/conclave" element={<AdminRoute><ConclaveSection user={user} /></AdminRoute>} />
            <Route path="outreach-extension" element={<OutreachExtension user={user} />} />
            <Route path="outreach-extension/open-house" element={<AdminRoute><OpenHouseSection user={user} /></AdminRoute>} />
            <Route path="outreach-extension/nptel" element={<AdminRoute><NptelSection user={user} /></AdminRoute>} />
            <Route path="outreach-extension/uba" element={<AdminRoute><UbaSection user={user} /></AdminRoute>} />
            <Route path="outreach-extension/social-engagements" element={<AdminRoute><SocialEngagement user={user} /></AdminRoute>} />
            <Route path="outreach-extension/students-engagements" element={<AdminRoute><StudentsEngagementSection user={user} /></AdminRoute>} />
            <Route path="outreach-extension/outreach" element={<AdminRoute><OutreachSection user={user} /></AdminRoute>} />
            {/* Public view sub-routes — social engagement */}
            <Route path="outreach-extension/social-engagement" element={<SocialEngagement user={user} />} />
            <Route path="outreach-extension/social-engagement/UBA" element={<UbaSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/social-engagement/OpenHouse" element={<OpenHouseSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/social-engagement/InstituteVisits" element={<OutreachSection user={user} isPublicView={true} programKey="institute_visits" />} />
            <Route path="outreach-extension/social-engagement/NSS" element={<OutreachSection user={user} isPublicView={true} programKey="nss_activities" />} />
            {/* Public view sub-routes — students engagement */}
            <Route path="outreach-extension/students-engagement" element={<StudentsEngagementSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/students-engagement/nptel" element={<NptelSection user={user} isPublicView={true} />} />
            <Route path="outreach-extension/students-engagement/pmc" element={<OutreachSection user={user} isPublicView={true} programKey="palakkad_math_circle" />} />
            <Route path="outreach-extension/students-engagement/pbd" element={<OutreachSection user={user} isPublicView={true} programKey="pale_blue_dot" />} />
            <Route path="outreach-extension/students-engagement/sq" element={<OutreachSection user={user} isPublicView={true} programKey="science_quest" />} />
            {/* Admin-only routes */}
            <Route path="profile" element={<AuthRoute><Profile user={user} /></AuthRoute>} />
            <Route path="upload" element={<AuthRoute><UploadForm token={token} onLogout={handleLogout} /></AuthRoute>} />
            <Route path="create-user" element={<AuthRoute><CreateUser user={user} token={token} /></AuthRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ChunkErrorBoundary>
    </Router>
  );
}

export default App;
