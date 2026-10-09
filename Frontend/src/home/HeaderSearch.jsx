import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pageFor } from './exploreMap';
import { searchPages } from './pageSearch';
import { popularPages, usePopular } from './usePopular';
import { openJump } from './jumpEvents';
import { trackClick } from '../analytics/track';
import './HeaderSearch.css';

/** Always-visible search with live suggestions; on phones it collapses to an icon that opens the palette. */
export default function HeaderSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const listId = useId();
  const navigate = useNavigate();
  const { top } = usePopular();

  const results = useMemo(() => {
    const popular = popularPages(top);
    return searchPages(query, 6, popular.length >= 3 ? popular : undefined);
  }, [query, top]);

  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (page) => {
    if (!page || !pageFor(page.path)) return;
    setOpen(false);
    setQuery('');
    trackClick('header-search', window.location.pathname);
    navigate(page.path);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  const heading = query.trim() ? 'Pages' : top.length >= 3 ? 'Popular with visitors' : 'Browse';

  return (
    <div className="hs" ref={boxRef}>
      <button type="button" className="hs__icon" onClick={openJump} aria-label="Search pages">
        <span aria-hidden="true">⌕</span>
      </button>
      <div className="hs__field">
        <span className="hs__glass" aria-hidden="true">⌕</span>
        <input
          className="hs__input"
          type="text"
          role="combobox"
          aria-label="Search pages"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          placeholder="Search the dashboard…"
          maxLength={60}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onKeyDown={onKey}
        />
      </div>
      {open && (
        <div className="hs__panel">
          <p className="hs__heading">{heading}</p>
          <ul id={listId} className="hs__list" role="listbox">
            {results.map((p, i) => (
              <li
                key={p.path}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`hs__item${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); go(p); }}
              >
                <span className="hs__item-title">{p.title}</span>
                <span className="hs__item-blurb">{p.blurb}</span>
              </li>
            ))}
            {results.length === 0 && <li className="hs__empty">No matching pages</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
