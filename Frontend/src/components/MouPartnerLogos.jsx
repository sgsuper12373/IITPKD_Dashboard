import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  addMouPartner,
  deleteMouPartner,
  fetchMouPartners,
  reorderMouPartners,
  updateMouPartner,
} from '../services/mouPartners';

import './MouPartnerLogos.css';

// ── Sortable card (used only in edit mode) ────────────────────────────────────

function SortableCard({ partner, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: partner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mpl-card mpl-card--edit">
      <span className="mpl-drag-handle" {...attributes} {...listeners} title="Drag to reorder">
        ⠿
      </span>
      {partner.logo_url ? (
        <img
          src={`${import.meta.env.VITE_API_BASE_URL}${partner.logo_url}`}
          alt={partner.name}
          className="mpl-logo"
        />
      ) : (
        <div className="mpl-logo-placeholder">🏢</div>
      )}
      <span className="mpl-name">{partner.name}</span>
      <div className="mpl-edit-actions">
        <button className="mpl-btn mpl-btn--edit" onClick={() => onEdit(partner)}>
          Edit
        </button>
        <button className="mpl-btn mpl-btn--delete" onClick={() => onDelete(partner)}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Read-mode card ─────────────────────────────────────────────────────────────

function PartnerCard({ partner, onClick }) {
  return (
    <button className="mpl-card mpl-card--read" onClick={() => onClick(partner)}>
      {partner.logo_url ? (
        <img
          src={`${import.meta.env.VITE_API_BASE_URL}${partner.logo_url}`}
          alt={partner.name}
          className="mpl-logo"
        />
      ) : (
        <div className="mpl-logo-placeholder">🏢</div>
      )}
      <span className="mpl-name">{partner.name}</span>
    </button>
  );
}

// ── Zoom modal ─────────────────────────────────────────────────────────────────

function ZoomModal({ partner, onClose }) {
  const handleKey = useCallback(
    (e) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );

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
      className="mpl-zoom-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={partner.name}
    >
      <div className="mpl-zoom-panel">
        <button className="mpl-zoom-close" onClick={onClose} aria-label="Close">✕</button>
        {partner.logo_url ? (
          <img
            src={`${import.meta.env.VITE_API_BASE_URL}${partner.logo_url}`}
            alt={partner.name}
            className="mpl-zoom-img"
          />
        ) : (
          <div className="mpl-logo-placeholder mpl-logo-placeholder--large">🏢</div>
        )}
        <p className="mpl-zoom-name">{partner.name}</p>
        <p className="mpl-zoom-hint">Tap outside or press <kbd>Esc</kbd> to close</p>
      </div>
    </div>,
    document.body,
  );
}

// ── Partner form modal (add / edit) ───────────────────────────────────────────

function PartnerForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      if (file) fd.append('logo', file);
      await onSave(fd);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="mpl-zoom-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="mpl-form-panel">
        <h3 className="mpl-form-title">{initial ? 'Edit Partner' : 'Add Partner'}</h3>
        <form onSubmit={handleSubmit} className="mpl-form">
          <label className="mpl-form-label">
            Name
            <input
              className="mpl-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Partner organisation name"
              autoFocus
            />
          </label>
          <label className="mpl-form-label">
            Logo image
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              className="mpl-form-input"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </label>
          {error && <p className="mpl-form-error">{error}</p>}
          <div className="mpl-form-actions">
            <button type="button" className="mpl-btn" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="mpl-btn mpl-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function MouPartnerLogos({ user, isPublicView = false }) {
  const token = localStorage.getItem('authToken');
  const isAdmin = user?.role_id === 3 || user?.role_id === 4;

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [zoomedPartner, setZoomedPartner] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadPartners = useCallback(async () => {
    try {
      const data = await fetchMouPartners(token);
      setPartners(data ?? []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const handleAdd = async (formData) => {
    await addMouPartner(formData, token);
    setShowAddForm(false);
    await loadPartners();
  };

  const handleEdit = async (formData) => {
    await updateMouPartner(editingPartner.id, formData, token);
    setEditingPartner(null);
    await loadPartners();
  };

  const handleDelete = async (partner) => {
    if (!window.confirm(`Delete "${partner.name}"?`)) return;
    await deleteMouPartner(partner.id, token);
    await loadPartners();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = partners.findIndex((p) => p.id === active.id);
    const newIndex = partners.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(partners, oldIndex, newIndex).map((p, i) => ({
      ...p,
      display_order: i,
    }));
    setPartners(reordered);

    try {
      await reorderMouPartners(
        reordered.map((p) => ({ id: p.id, display_order: p.display_order })),
        token,
      );
    } catch {
      await loadPartners();
    }
  };

  if (loading) return null;

  return (
    <section className="mpl-section">
      <div className="mpl-header">
        <h2 className="mpl-heading">MOU Partner Organisations</h2>
        {isAdmin && !isPublicView && (
          <div className="mpl-admin-controls">
            {isEditMode ? (
              <>
                <button className="mpl-btn mpl-btn--primary" onClick={() => setShowAddForm(true)}>
                  + Add Partner
                </button>
                <button className="mpl-btn" onClick={() => setIsEditMode(false)}>
                  Done
                </button>
              </>
            ) : (
              <button className="mpl-btn" onClick={() => setIsEditMode(true)}>
                Edit Partners
              </button>
            )}
          </div>
        )}
      </div>

      {partners.length === 0 ? (
        <p className="mpl-empty">No partner organisations added yet.</p>
      ) : isEditMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={partners.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="mpl-grid">
              {partners.map((p) => (
                <SortableCard
                  key={p.id}
                  partner={p}
                  onEdit={setEditingPartner}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="mpl-grid">
          {partners.map((p) => (
            <PartnerCard key={p.id} partner={p} onClick={setZoomedPartner} />
          ))}
        </div>
      )}

      {zoomedPartner && (
        <ZoomModal partner={zoomedPartner} onClose={() => setZoomedPartner(null)} />
      )}
      {showAddForm && (
        <PartnerForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}
      {editingPartner && (
        <PartnerForm
          initial={editingPartner}
          onSave={handleEdit}
          onCancel={() => setEditingPartner(null)}
        />
      )}
    </section>
  );
}

export default MouPartnerLogos;
