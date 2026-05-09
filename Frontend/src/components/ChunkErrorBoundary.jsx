import { Component } from 'react';

// Recognises the various ways browsers/bundlers report a failed dynamic import
// for a code-split chunk that no longer exists on the server (typical after a
// fresh deploy when the user is holding a stale index.html in cache).
const isChunkLoadError = (error) => {
  if (!error) return false;
  const name = error.name || '';
  const message = error.message || '';
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
};

const RELOAD_FLAG = 'chunk-reload-attempted';

class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) {
      // Stale index.html → new build has different chunk hashes. Force a
      // single hard reload so the browser picks up the fresh index.html
      // and the matching chunk names. The session-storage flag prevents
      // an infinite reload loop if the failure is not actually stale-cache.
      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem(RELOAD_FLAG);
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // While the auto-reload is in flight, render nothing to avoid a flash
      if (this.state.isChunkError && !sessionStorage.getItem(RELOAD_FLAG + '-shown')) {
        return null;
      }
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', background: '#f8f9fa',
          fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: 12, color: '#333' }}>Something went wrong loading this page.</h2>
          <p style={{ marginBottom: 24, color: '#666', maxWidth: 480 }}>
            The application has been updated. Please reload to fetch the latest version.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '10px 24px', fontSize: 16, borderRadius: 6,
              border: 'none', background: '#667eea', color: '#fff',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChunkErrorBoundary;
