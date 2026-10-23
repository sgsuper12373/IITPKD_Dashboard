import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';
import CampusClipart from './CampusClipart';

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async ({ credential }) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/google`,
        { credential }
      );
      onLoginSuccess(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
        { email, password }
      );
      onLoginSuccess(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An unknown error occurred. Is the backend server running?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-split">
      {/* ── Left: dark navy branding panel ── */}
      <div className="login-brand">
        <div className="login-brand__content">
          <img src={IIPKD_Logo} alt="" className="login-brand__logo" />
          <h1 className="login-brand__title">IIT Palakkad</h1>
          <p className="login-brand__tagline">Institutional Dashboard</p>
          <p className="login-brand__desc">
            Explore data on people, research, education, industry connections,
            innovation and outreach — all in one place.
          </p>
        </div>
        <CampusClipart className="login-brand__clipart" />
      </div>

      {/* ── Right: sign-in form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-wrap">
          <h2 className="login-form__heading">Sign in</h2>
          <p className="login-form__sub">Access the institutional dashboard</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="login-field">
              <span className="login-field__label">Email</span>
              <input
                type="email"
                placeholder="you@iitpkd.ac.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="login-field">
              <span className="login-field__label">Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>

            {error && <p className="login-error">{error}</p>}
          </form>

          <div className="login-divider"><span>or</span></div>

          <div className="login-google-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed.')}
              width="320"
              text="signin_with"
              shape="rectangular"
              theme="outline"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
