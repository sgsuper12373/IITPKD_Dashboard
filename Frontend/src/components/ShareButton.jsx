import { useState } from 'react';
import './ShareButton.css';

function ShareButton() {
  const [state, setState] = useState('idle'); // 'idle' | 'copied' | 'shared'

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    }).catch(() => setState('idle'));
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        setState('shared');
        setTimeout(() => setState('idle'), 2000);
      } catch (e) {
        if (e.name !== 'AbortError') copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const isCopied = state === 'copied' || state === 'shared';

  return (
    <button
      className={`share-btn${isCopied ? ' share-btn--done' : ''}`}
      onClick={handleShare}
      title="Copy link to this page"
      aria-label={isCopied ? 'Link copied' : 'Copy page link'}
    >
      {isCopied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}

export default ShareButton;
