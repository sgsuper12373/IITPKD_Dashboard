import { Component } from 'react';
import './ChunkErrorBoundary.css';

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
    this.state = {
      hasError: false,
      isChunkError: false,
      // Set at construction time: if the boundary is mounted on a fresh page
      // load and the flag is present, a previous mount already triggered the
      // reload and it didn't fix things — show the fallback UI instead of
      // looping.
      reloadAlreadyAttempted: typeof window !== 'undefined' &&
        !!window.sessionStorage?.getItem(RELOAD_FLAG),
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error) && !this.state.reloadAlreadyAttempted) {
      // Stale index.html → new build has different chunk hashes. Force one
      // hard reload so the browser picks up the fresh index.html and the
      // matching chunk names.
      window.sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  }

  handleRetry = () => {
    window.sessionStorage.removeItem(RELOAD_FLAG);
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // First-time chunk error: a reload is about to fire from componentDidCatch.
    // Render a brief loader instead of nothing so users see continuity.
    if (this.state.isChunkError && !this.state.reloadAlreadyAttempted) {
      return (
        <div className="cberr-full-center">
          <div className="cberr-spinner" />
        </div>
      );
    }

    // Either a non-chunk render error, or a chunk error that survived a
    // reload — give the user a manual escape hatch.
    return (
      <div className="cberr-error-box">
        <h2 className="cberr-h2">Something went wrong loading this page.</h2>
        <p className="cberr-p">
          The application may have been updated. Please reload to fetch the latest version.
        </p>
        <button onClick={this.handleRetry} className="cberr-reload-btn">
          Reload
        </button>
      </div>
    );
  }
}

export default ChunkErrorBoundary;
