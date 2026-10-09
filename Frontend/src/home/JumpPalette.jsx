import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PAGES } from './exploreMap';
import { OPEN_JUMP_EVENT, openJump } from './jumpEvents';
import './Explore.css';


/** Small trigger for the palette; hidden on the home page, which has its own. */
export function JumpButton() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  return (
    <button type="button" className="jp-trigger" onClick={openJump} aria-label="Jump to a page">
      <span aria-hidden="true">⌕</span> Jump to… <kbd>Ctrl K</kbd>
    </button>
  );
}

const score = (page, q) => {
  const title = page.title.toLowerCase();
  if (title.startsWith(q)) return 3;
  if (title.includes(q)) return 2;
  return `${page.blurb} ${page.keywords}`.toLowerCase().includes(q) ? 1 : 0;
};

/** Ctrl/Cmd+K "jump to" search over the static page list. */
export default function JumpPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const returnFocus = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const show = () => {
      returnFocus.current = document.activeElement;
      setQuery('');
      setActive(0);
      setOpen(true);
    };
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_JUMP_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_JUMP_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGES.slice(0, 8);
    return PAGES.map((p) => ({ p, s: score(p, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.p)
      .slice(0, 8);
  }, [query]);

  const close = () => {
    setOpen(false);
    returnFocus.current?.focus?.();
  };
  const go = (page) => {
    if (!page) return;
    setOpen(false);
    navigate(page.path);
  };

  if (!open) return null;

  const onInputKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') go(results[active]);
  };

  return (
    <div className="jp" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="jp__box" role="dialog" aria-modal="true" aria-label="Jump to a page">
        <input
          ref={inputRef}
          className="jp__input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="jp-list"
          aria-activedescendant={results[active] ? `jp-opt-${active}` : undefined}
          placeholder="Search pages, e.g. placements, startups, NPTEL…"
          value={query}
          maxLength={60}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onInputKey}
        />
        <ul id="jp-list" className="jp__list" role="listbox">
          {results.map((p, i) => (
            <li
              key={p.path}
              id={`jp-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`jp__item${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(p)}
            >
              <span className="jp__item-title">{p.title}</span>
              <span className="jp__item-blurb">{p.blurb}</span>
            </li>
          ))}
          {results.length === 0 && <li className="jp__empty">No matching pages</li>}
        </ul>
      </div>
    </div>
  );
}
