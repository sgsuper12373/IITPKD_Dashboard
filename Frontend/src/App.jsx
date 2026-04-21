import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import ScrollToTop from './components/ScrollToTop';
import Login from './components/Login';
import Home from './components/Home';
import HomePage from './components/HomePage';
import PeopleCampus from './components/PeopleCampus';
import Research from './components/Research';
import Education from './components/Education';
import IndustryConnect from './components/IndustryConnect';
import InnovationEntrepreneurship from './components/InnovationEntrepreneurship';
import OutreachExtension from './components/OutreachExtension';
import Profile from './components/Profile';
import UploadForm from './components/UploadForm';
import CreateUser from './components/CreateUser';
import AcademicSection from './components/AcademicSection';
import AdministrativeSection from './components/AdministrativeSection';
import IgrcSection from './components/IgrcSection';
import IccSection from './components/IccSection';
import EwdSection from './components/EwdSection';
import IarSection from './components/IarSection';
import PlacementSection from './components/PlacementSection';
import EducationAcademicSection from './components/EducationAcademicSection';
import EducationAdministrativeSection from './components/EducationAdministrativeSection';
import ResearchIcsrSection from './components/ResearchIcsrSection';
import ResearchAdministrativeSection from './components/ResearchAdministrativeSection';
import ResearchLibrarySection from './components/ResearchLibrarySection';
import InnovationSection from './components/InnovationSection';
import IptifSection from './components/IptifSection';
import TechinSection from './components/TechinSection';
import IcsrSection from './components/IcsrSection';
import ConclaveSection from './components/ConclaveSection';
import OpenHouseSection from './components/OpenHouseSection';
import NptelSection from './components/NptelSection';
import UbaSection from './components/UbaSection';
import SocialEngagementsSection from './components/SocialEngagements';
import StudentsEngagementSection from './components/StudentsEngagement';
import OutreachSection from './components/OutreachSection';

function App() {
  // State to hold the authentication token
  const [token, setToken] = useState(null);

  // State to hold user info (optional, but good for UI)
  const [user, setUser] = useState(null);

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

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  // Axios interceptor to catch 401 errors (e.g. token expiration) and auto-logout
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Unauthorised or token expired - log the user out to redirect to login
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    return token ? children : <Navigate to="/login" replace />;
  };

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            token ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home user={user} onLogout={handleLogout} />
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
          <Route path="research/administrative-section" element={<ResearchAdministrativeSection user={user} />} />
          <Route path="research/library" element={<ResearchLibrarySection user={user} />} />
          <Route path="education" element={<Education user={user} />} />
          <Route path="education/placements" element={<PlacementSection user={user} />} />
          <Route path="education/administrative-section" element={<EducationAdministrativeSection user={user} />} />
          <Route path="education/academic-section" element={<EducationAcademicSection user={user} />} />
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
          {/* Add the new Students Engagement route */}
          <Route path="outreach-extension/social-engagements" element={<SocialEngagementsSection user={user} />} />
          <Route path="outreach-extension/students-engagement" element={<StudentsEngagementSection user={user} />} />
          <Route path="outreach-extension/outreach" element={<OutreachSection user={user} />} />
          <Route path="profile" element={<Profile user={user} />} />
          <Route path="upload" element={<UploadForm token={token} onLogout={handleLogout} />} />
          <Route path="create-user" element={<CreateUser user={user} token={token} />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;