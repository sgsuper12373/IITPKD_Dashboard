import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';
import IIPKD_Logo from '../assets/IITPKD_Logo.png';
// The Login component receives a prop `onLoginSuccess` from App.jsx
// which it will call with the token and user data after a successful login/signup.
function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  // This state toggles between Login and Sign Up forms
  const [isLoginView] = useState(true);

  // Form fields state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

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

  const handleGuestLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/guest`
      );
      onLoginSuccess(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Guest login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const url = isLoginView
      ? `${import.meta.env.VITE_API_BASE_URL}/auth/login`
      : `${import.meta.env.VITE_API_BASE_URL}/auth/signup`;

    const payload = isLoginView
      ? { email, password }
      : { email, password, username, display_name: displayName };

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

        <h2>{isLoginView ? 'Sign in to Dashboard' : 'Create an Account'}</h2>

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

          {!isLoginView && (
            <>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Loading...' : (isLoginView ? 'Login' : 'Sign Up')}
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

         <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>or</span>
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.6rem',
            marginTop: '0.25rem',
            background: 'transparent',
            border: '1.5px solid #ccc',
            borderRadius: '6px',
            color: '#555',
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}

export default Login;