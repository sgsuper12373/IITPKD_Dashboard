import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';
// The Login component receives a prop `onLoginSuccess` from App.jsx
// which it will call with the token and user data after a successful login.
function Login({ onLoginSuccess }) {
  const navigate = useNavigate();

  // Form fields state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // GoogleLogin component calls this with { credential } — the Google ID token.
  // The raw ID token is sent to the backend for cryptographic verification.
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
      if (err.response && err.response.data && err.response.data.message) {
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

    const url = `${import.meta.env.VITE_API_BASE_URL}/auth/login`;
    const payload = { email, password };

    try {
      const response = await axios.post(url, payload);

      // On success, call the function passed from App.jsx
      // This will set the token in the parent component and update the UI
      onLoginSuccess(response.data.token, response.data.user);

      // Navigate to home page after successful login
      navigate('/');

    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An unknown error occurred. Is the backend server running?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Page heading */}
      <h1 className="login-page-title">
        Indian Institute of Technology Palakkad
      </h1>

      <div className="card">
        {/* Logo */}
        <div className="login-logo">
          <img src={IIPKD_Logo} alt="IIT Palakkad Logo" />
        </div>

        <h2>Sign in to Dashboard</h2>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Login'}
          </button>

          {error && <p className="login-error">{error}</p>}
        </form>

        <div className="login-divider">or</div>

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
  );
}

export default Login;