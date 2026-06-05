import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Factory } from 'lucide-react';

import {
  addFacility,
  deleteFacility,
  fetchFacilities,
  updateFacility,
} from '../services/iptifFacilities';
import { canModifySection } from '../utils/rolePermissions';

import './IptifFacilities.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const imgSrc = (facility) => (facility.image_url ? `${API_BASE}${facility.image_url}` : null);

// Shared image / icon-placeholder renderer.
function Media({ facility, className, iconSize = 30 }) {
  const src = imgSrc(facility);
  if (src) {
    return <img src={src} alt={facility.display_title} className={className} loading="lazy" />;
  }
  return (
    <div className={`${className} iff-placeholder`} aria-hidden="true">
      <Factory size={iconSize} strokeWidth={1.5} />
    </div>
  );
}

// ── Read-mode directory row ─────────────────────────────────────────────────────

function FacilityRow({ facility, onOpen }) {
  return (
    <button className="iff-row" onClick={() => onOpen(facility)}>
      <div className="iff-row-media-wrap">
        <Media facility={facility} className="iff-row-media" />
      </div>
      <div className="iff-row-body">
        <div className="iff-row-head">
          <h3 className="iff-row-title">{facility.display_title}</h3>
          {facility.availability_status && (
            <span className="iff-row-status">{facility.availability_status}</span>
          )}
        </div>
        {facility.facility_type && <p className="iff-row-type">{facility.facility_type}</p>}
        {facility.facility_summary && (
          <p className="iff-row-summary">{facility.facility_summary}</p>
        )}
        <span className="iff-row-cta">View details &#8594;</span>
      </div>
    </button>
  );
}

// ── Edit-mode directory row ─────────────────────────────────────────────────────

function EditableRow({ facility, onEdit, onDelete }) {
  return (
    <div className="iff-row iff-row--edit">
      <div className="iff-row-media-wrap">
        <Media facility={facility} className="iff-row-media" />
      </div>
      <div className="iff-row-body">
        <div className="iff-row-head">
          <h3 className="iff-row-title">{facility.display_title}</h3>
        </div>
        {facility.facility_type && <p className="iff-row-type">{facility.facility_type}</p>}
        <div className="iff-edit-actions">
          <button className="iff-btn iff-btn--edit" onClick={() => onEdit(facility)}>Edit</button>
          <button className="iff-btn iff-btn--delete" onClick={() => onDelete(facility)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Detail overlay (full view) ──────────────────────────────────────────────────

function DetailModal({ facility, onClose }) {
  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  return createPortal(
    <div
      className="iff-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={facility.display_title}
    >
      <div className="iff-modal-panel">
        <button className="iff-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="iff-modal-media">
          <Media facility={facility} className="iff-modal-img" iconSize={56} />
        </div>

        <div className="iff-modal-content">
          <div className="iff-modal-headrow">
            <h2 className="iff-modal-title">{facility.display_title}</h2>
            {facility.availability_status && (
              <span className="iff-modal-status">{facility.availability_status}</span>
            )}
          </div>
          {facility.facility_type && <p className="iff-modal-type">{facility.facility_type}</p>}

          {facility.facility_summary && (
            <p className="iff-modal-summary">{facility.facility_summary}</p>
          )}

          {facility.availing_guidance && (
            <div className="iff-modal-block">
              <h4 className="iff-modal-block-title">How to avail</h4>
              <p className="iff-modal-block-text">{facility.availing_guidance}</p>
            </div>
          )}

          {facility.more_info_link && (
            <a
              className="iff-modal-link"
              href={facility.more_info_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              More details ↗
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Add / Edit form ─────────────────────────────────────────────────────────────

function FacilityForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    display_title: initial?.display_title ?? '',
    facility_name: initial?.facility_name ?? '',
    facility_type: initial?.facility_type ?? '',
    facility_summary: initial?.facility_summary ?? '',
    availability_status: initial?.availability_status ?? '',
    availing_guidance: initial?.availing_guidance ?? '',
    more_info_link: initial?.more_info_link ?? '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.display_title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value.trim()));
      if (file) fd.append('image', file);
      await onSave(fd);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="iff-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="iff-form-panel">
        <h3 className="iff-form-title">{initial ? 'Edit Facility' : 'Add Facility'}</h3>
        <form onSubmit={handleSubmit} className="iff-form">
          <label className="iff-form-label">
            Title<span className="iff-req">*</span>
            <input className="iff-form-input" value={form.display_title}
              onChange={setField('display_title')} placeholder="e.g. Central Prototyping Lab" autoFocus />
          </label>

          <div className="iff-form-grid">
            <label className="iff-form-label">
              Facility type
              <input className="iff-form-input" value={form.facility_type}
                onChange={setField('facility_type')} placeholder="e.g. Laboratory" />
            </label>
            <label className="iff-form-label">
              Availability status
              <input className="iff-form-input" value={form.availability_status}
                onChange={setField('availability_status')} placeholder="e.g. Available" />
            </label>
          </div>

          <label className="iff-form-label">
            Short summary
            <textarea className="iff-form-input iff-form-textarea" value={form.facility_summary}
              onChange={setField('facility_summary')} rows={3}
              placeholder="A short description shown on the card and detail view." />
          </label>

          <label className="iff-form-label">
            How to avail
            <textarea className="iff-form-input iff-form-textarea" value={form.availing_guidance}
              onChange={setField('availing_guidance')} rows={3}
              placeholder="Steps or contact details to access this facility." />
          </label>

          <label className="iff-form-label">
            More info link
            <input className="iff-form-input" value={form.more_info_link}
              onChange={setField('more_info_link')} placeholder="https://…" />
          </label>

          <label className="iff-form-label">
            Image
            <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              className="iff-form-input" onChange={(e) => setFile(e.target.files[0] || null)} />
            {initial?.image_url && !file && (
              <span className="iff-form-hint">Leave empty to keep the current image.</span>
            )}
          </label>

          {error && <p className="iff-form-error">{error}</p>}
          <div className="iff-form-actions">
            <button type="button" className="iff-btn" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="iff-btn iff-btn--primary" disabled={saving}>
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

function IptifFacilities({ user }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const isAdmin = canModifySection(user?.role_id, 'innovation/iptif');

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [openFacility, setOpenFacility] = useState(null);
  const [editingFacility, setEditingFacility] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchFacilities(token);
      setFacilities(data ?? []);
    } catch {
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (formData) => {
    await addFacility(formData, token);
    setShowAddForm(false);
    await load();
  };

  const handleEdit = async (formData) => {
    await updateFacility(editingFacility.facility_id, formData, token);
    setEditingFacility(null);
    await load();
  };

  const handleDelete = async (facility) => {
    if (!window.confirm(`Delete "${facility.display_title}"?`)) return;
    await deleteFacility(facility.facility_id, token);
    await load();
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <button className="page-back-btn" onClick={() => navigate('/innovation-entrepreneurship/iptif')}>
          &#8592; Back to IPTIF
        </button>

        <div className="iff-header">
          <div>
            <h1 className="iff-h1">IPTIF Facilities</h1>
            <p className="iff-subtitle">
              Explore the facilities offered by the IIT Palakkad Technology IHub Foundation.
            </p>
          </div>
          {isAdmin && (
            <div className="iff-admin-controls">
              {isEditMode ? (
                <>
                  <button className="iff-btn iff-btn--primary" onClick={() => setShowAddForm(true)}>
                    + Add Facility
                  </button>
                  <button className="iff-btn" onClick={() => setIsEditMode(false)}>Done</button>
                </>
              ) : (
                <button className="iff-btn" onClick={() => setIsEditMode(true)}>Manage Facilities</button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p className="iff-empty">Loading facilities…</p>
        ) : facilities.length === 0 ? (
          <p className="iff-empty">
            {isAdmin
              ? 'No facilities yet. Use “Manage Facilities” → “Add Facility” to create one.'
              : 'No facilities have been published yet.'}
          </p>
        ) : (
          <div className="iff-list">
            {facilities.map((f) =>
              isEditMode ? (
                <EditableRow
                  key={f.facility_id}
                  facility={f}
                  onEdit={setEditingFacility}
                  onDelete={handleDelete}
                />
              ) : (
                <FacilityRow key={f.facility_id} facility={f} onOpen={setOpenFacility} />
              ),
            )}
          </div>
        )}
      </div>

      {openFacility && (
        <DetailModal facility={openFacility} onClose={() => setOpenFacility(null)} />
      )}
      {showAddForm && (
        <FacilityForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}
      {editingFacility && (
        <FacilityForm
          initial={editingFacility}
          onSave={handleEdit}
          onCancel={() => setEditingFacility(null)}
        />
      )}
    </div>
  );
}

export default IptifFacilities;
