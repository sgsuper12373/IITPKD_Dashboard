import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, Globe, ExternalLink, User } from 'lucide-react';

import {
  fetchPortfolio,
  fetchManageList,
  updateStartupShowcase,
} from '../services/startupPortfolio';
import { canModifySection } from '../utils/rolePermissions';
import LastUpdated from './LastUpdated';

import './StartupPortfolio.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const ORIGIN_LABELS = { iptif: 'IPTIF', techin: 'TechIN' };

// Logos can be an external URL (http…) or a server path (/uploads/startups/…).
const logoSrc = (startup) => {
  const logo = startup.startup_logo;
  if (!logo) return null;
  return logo.startsWith('http') ? logo : `${API_BASE}${logo}`;
};

const foundedYear = (startup) =>
  startup.incubated_date ? new Date(startup.incubated_date).getFullYear() : null;

// Shared logo / icon-placeholder renderer.
function Media({ startup, className, iconSize = 34 }) {
  const src = logoSrc(startup);
  if (src) {
    return <img src={src} alt={startup.startup_name} className={className} loading="lazy" />;
  }
  return (
    <div className={`${className} sp-placeholder`} aria-hidden="true">
      <Rocket size={iconSize} strokeWidth={1.5} />
    </div>
  );
}

function OriginBadge({ origin }) {
  return <span className={`sp-origin sp-origin--${origin}`}>{ORIGIN_LABELS[origin] ?? origin}</span>;
}

// ── Read-mode showcase card ─────────────────────────────────────────────────────

function StartupCard({ startup, onOpen }) {
  return (
    <button className="sp-card" onClick={() => onOpen(startup)}>
      <div className="sp-card-media-wrap">
        <Media startup={startup} className="sp-card-media" />
        <OriginBadge origin={startup.origin} />
      </div>
      <div className="sp-card-body">
        <h3 className="sp-card-title">{startup.startup_name}</h3>
        {startup.startup_tagline && <p className="sp-card-tagline">{startup.startup_tagline}</p>}
        {startup.startup_founder_name && (
          <p className="sp-card-founder">
            <User size={13} strokeWidth={2} /> {startup.startup_founder_name}
          </p>
        )}
        {startup.startup_summary && <p className="sp-card-summary">{startup.startup_summary}</p>}
        <span className="sp-card-cta">View details &#8594;</span>
      </div>
    </button>
  );
}

// ── Edit-mode row ───────────────────────────────────────────────────────────────

function EditableRow({ startup, onEdit }) {
  return (
    <div className="sp-card sp-card--edit">
      <div className="sp-card-media-wrap">
        <Media startup={startup} className="sp-card-media" />
        <OriginBadge origin={startup.origin} />
      </div>
      <div className="sp-card-body">
        <div className="sp-edit-head">
          <h3 className="sp-card-title">{startup.startup_name}</h3>
          <span className={`sp-pub ${startup.is_published ? 'sp-pub--on' : 'sp-pub--off'}`}>
            {startup.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
        {startup.startup_tagline && <p className="sp-card-tagline">{startup.startup_tagline}</p>}
        <div className="sp-edit-actions">
          <button className="sp-btn sp-btn--edit" onClick={() => onEdit(startup)}>Edit</button>
        </div>
      </div>
    </div>
  );
}

// ── Detail overlay ──────────────────────────────────────────────────────────────

function DetailModal({ startup, onClose }) {
  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  const year = foundedYear(startup);

  return createPortal(
    <div
      className="sp-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={startup.startup_name}
    >
      <div className="sp-modal-panel">
        <button className="sp-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="sp-modal-media">
          <Media startup={startup} className="sp-modal-img" iconSize={64} />
        </div>

        <div className="sp-modal-content">
          <div className="sp-modal-headrow">
            <h2 className="sp-modal-title">{startup.startup_name}</h2>
            <OriginBadge origin={startup.origin} />
          </div>
          {startup.startup_tagline && <p className="sp-modal-tagline">{startup.startup_tagline}</p>}

          <div className="sp-modal-badges">
            {startup.domain && <span className="sp-badge">{startup.domain}</span>}
            {startup.status && <span className="sp-badge sp-badge--status">{startup.status}</span>}
            {year && <span className="sp-badge">Incubated {year}</span>}
          </div>

          {startup.startup_summary && <p className="sp-modal-summary">{startup.startup_summary}</p>}

          {(startup.startup_founder_name || startup.startup_founder_profile_line) && (
            <div className="sp-modal-block">
              <h4 className="sp-modal-block-title">Founder</h4>
              <p className="sp-modal-block-text">
                {startup.startup_founder_name || '—'}
                {startup.startup_founder_profile_line && (
                  <>
                    {'  '}
                    <a
                      className="sp-inline-link"
                      href={startup.startup_founder_profile_line}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Profile <ExternalLink size={12} />
                    </a>
                  </>
                )}
              </p>
            </div>
          )}

          {startup.startup_website_link && (
            <a
              className="sp-modal-link"
              href={startup.startup_website_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Globe size={15} /> Visit website
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Edit form ───────────────────────────────────────────────────────────────────

function StartupForm({ initial, onSave, onCancel }) {
  const externalLogo =
    initial?.startup_logo && initial.startup_logo.startsWith('http') ? initial.startup_logo : '';

  const [form, setForm] = useState({
    startup_tagline: initial?.startup_tagline ?? '',
    startup_founder_name: initial?.startup_founder_name ?? '',
    startup_founder_profile_line: initial?.startup_founder_profile_line ?? '',
    startup_website_link: initial?.startup_website_link ?? '',
    startup_summary: initial?.startup_summary ?? '',
    startup_logo: externalLogo,
  });
  const [file, setFile] = useState(null);
  const [isPublished, setIsPublished] = useState(!!initial?.is_published);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value.trim()));
      fd.append('is_published', isPublished ? 'true' : 'false');
      if (file) fd.append('image', file);
      await onSave(fd);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const hasUploadedLogo = initial?.startup_logo && !externalLogo;

  return createPortal(
    <div
      className="sp-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="sp-form-panel">
        <h3 className="sp-form-title">
          Edit “{initial?.startup_name}” <OriginBadge origin={initial?.origin} />
        </h3>
        <form onSubmit={handleSubmit} className="sp-form">
          <label className="sp-form-label">
            Tagline / slogan
            <input className="sp-form-input" value={form.startup_tagline}
              onChange={setField('startup_tagline')} placeholder="e.g. Drones for precision agriculture" autoFocus />
          </label>

          <div className="sp-form-grid">
            <label className="sp-form-label">
              Founder name
              <input className="sp-form-input" value={form.startup_founder_name}
                onChange={setField('startup_founder_name')} placeholder="e.g. A. Sharma" />
            </label>
            <label className="sp-form-label">
              Founder profile link
              <input className="sp-form-input" value={form.startup_founder_profile_line}
                onChange={setField('startup_founder_profile_line')} placeholder="https://linkedin.com/in/…" />
            </label>
          </div>

          <label className="sp-form-label">
            Website
            <input className="sp-form-input" value={form.startup_website_link}
              onChange={setField('startup_website_link')} placeholder="https://…" />
          </label>

          <label className="sp-form-label">
            What they do (summary)
            <textarea className="sp-form-input sp-form-textarea" value={form.startup_summary}
              onChange={setField('startup_summary')} rows={3}
              placeholder="A short description of the startup, its goal, and target market." />
          </label>

          <label className="sp-form-label">
            Logo URL
            <input className="sp-form-input" value={form.startup_logo}
              onChange={setField('startup_logo')} placeholder="https://…/logo.png" />
            <span className="sp-form-hint">Paste a logo URL, or upload an image below if you don’t have one.</span>
          </label>

          <label className="sp-form-label">
            Upload logo image
            <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              className="sp-form-input" onChange={(e) => setFile(e.target.files[0] || null)} />
            {hasUploadedLogo && !file && (
              <span className="sp-form-hint">A logo is already uploaded. Leave empty to keep it.</span>
            )}
          </label>

          <label className="sp-form-check">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            <span>Publish on the public Startup Portfolio</span>
          </label>

          {error && <p className="sp-form-error">{error}</p>}
          <div className="sp-form-actions">
            <button type="button" className="sp-btn" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="sp-btn sp-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ── Main component ───────────────────────────────────────────────────────────────

function StartupPortfolio({ user, isPublicView = false }) {
  const token = localStorage.getItem('authToken');
  const isAdmin =
    canModifySection(user?.role_id, 'innovation/iptif') ||
    canModifySection(user?.role_id, 'innovation/techin');

  const [portfolio, setPortfolio] = useState([]);
  const [manageList, setManageList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [openStartup, setOpenStartup] = useState(null);
  const [editing, setEditing] = useState(null);
  const [originFilter, setOriginFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      setPortfolio((await fetchPortfolio(token)) ?? []);
    } catch {
      setPortfolio([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadManage = useCallback(async () => {
    try {
      setManageList((await fetchManageList(token)) ?? []);
    } catch {
      setManageList([]);
    }
  }, [token]);

  useEffect(() => { loadPortfolio(); }, [loadPortfolio]);

  const enterEditMode = async () => {
    await loadManage();
    setIsEditMode(true);
  };

  const handleEdit = async (formData) => {
    await updateStartupShowcase(editing.origin, editing.id, formData, token);
    setEditing(null);
    await Promise.all([loadManage(), loadPortfolio()]);
  };

  const source = isEditMode ? manageList : portfolio;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return source.filter((s) => {
      if (originFilter !== 'all' && s.origin !== originFilter) return false;
      if (q && !`${s.startup_name} ${s.startup_founder_name ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [source, originFilter, search]);

  const wrapClass = isPublicView ? 'sp-wrap' : 'page-container';
  const innerClass = isPublicView ? '' : 'page-content';

  return (
    <div className={wrapClass}>
      <div className={innerClass}>
        <div className="sp-header">
          <div>
            <h1 className="sp-h1">Startup Portfolio</h1>
            <p className="sp-subtitle">
              Startups incubated and supported across IPTIF and TechIN at IIT Palakkad.
            </p>
            <LastUpdated tables={['iptif_startup_table', 'techin_startup_table']} />
          </div>
          {isAdmin && (
            <div className="sp-admin-controls">
              {isEditMode ? (
                <button className="sp-btn" onClick={() => setIsEditMode(false)}>Done</button>
              ) : (
                <button className="sp-btn" onClick={enterEditMode}>Manage Startups</button>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="sp-filters">
          <div className="sp-origin-toggle">
            {['all', 'iptif', 'techin'].map((o) => (
              <button
                key={o}
                className={`sp-toggle-btn ${originFilter === o ? 'sp-toggle-btn--active' : ''}`}
                onClick={() => setOriginFilter(o)}
              >
                {o === 'all' ? 'All' : ORIGIN_LABELS[o]}
              </button>
            ))}
          </div>
          <input
            className="sp-search"
            type="text"
            placeholder="Search by startup or founder…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="sp-empty">Loading startups…</p>
        ) : visible.length === 0 ? (
          <p className="sp-empty">
            {isEditMode
              ? 'No startups available to manage for your section yet.'
              : isAdmin
                ? 'No published startups yet. Use “Manage Startups” to enrich and publish them.'
                : 'No startups have been published yet.'}
          </p>
        ) : (
          <div className="sp-grid">
            {visible.map((s) =>
              isEditMode ? (
                <EditableRow key={`${s.origin}-${s.id}`} startup={s} onEdit={setEditing} />
              ) : (
                <StartupCard key={`${s.origin}-${s.id}`} startup={s} onOpen={setOpenStartup} />
              ),
            )}
          </div>
        )}
      </div>

      {openStartup && (
        <DetailModal startup={openStartup} onClose={() => setOpenStartup(null)} />
      )}
      {editing && (
        <StartupForm
          initial={editing}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default StartupPortfolio;
