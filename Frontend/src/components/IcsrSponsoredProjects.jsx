import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, Pencil } from 'lucide-react';

import {
  fetchSponsoredProjects,
  createSponsoredProject,
  updateSponsoredProject,
} from '../services/icsrSponsored';
import { canModifySection } from '../utils/rolePermissions';
import LastUpdated from './LastUpdated';
import DataUploadModal from './LazyDataUploadModal';

// Reuses the consultancy management page styles (shared `icp-` classes).
import './IcsrConsultancyProjects.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Logos can be an external URL (http…) or a server path (/uploads/industry/…).
const logoSrc = (project) => {
  const logo = project.industry_logo;
  if (!logo) return null;
  return logo.startsWith('http') ? logo : `${API_BASE}${logo}`;
};

const formatDate = (value) => {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
};

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !value) return '–';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric);
};

// Logo / placeholder thumbnail.
function LogoThumb({ project, size = 44 }) {
  const src = logoSrc(project);
  if (src) {
    return <img src={src} alt={project.sponsered_industry || 'Industry'} className="icp-logo" loading="lazy" />;
  }
  return (
    <div className="icp-logo icp-logo--placeholder" aria-hidden="true">
      <Building2 size={size * 0.5} strokeWidth={1.5} />
    </div>
  );
}

// ── Create / edit form ───────────────────────────────────────────────────────────

const TEXT_FIELDS = [
  'project_title', 'principal_investigator', 'principal_investigator_department',
  'co_principal_investigator1', 'co_principal_investigator1_department',
  'co_principal_investigator2', 'co_principal_investigator2_department',
  'funding_agency', 'client_organization', 'status',
  'sponsered_industry', 'project_area',
];

// start/end dates serialize to 'YYYY-MM-DD' — directly usable by <input type="date">.
const dateValue = (value) => (value ? String(value).slice(0, 10) : '');

function ProjectForm({ initial, isCreate = false, onSave, onCancel }) {
  const externalLogo =
    initial?.industry_logo && initial.industry_logo.startsWith('http') ? initial.industry_logo : '';

  const [form, setForm] = useState({
    project_title: initial?.project_title ?? '',
    principal_investigator: initial?.principal_investigator ?? '',
    principal_investigator_department: initial?.principal_investigator_department ?? '',
    co_principal_investigator1: initial?.co_principal_investigator1 ?? '',
    co_principal_investigator1_department: initial?.co_principal_investigator1_department ?? '',
    co_principal_investigator2: initial?.co_principal_investigator2 ?? '',
    co_principal_investigator2_department: initial?.co_principal_investigator2_department ?? '',
    sponsered_industry: initial?.sponsered_industry ?? '',
    project_area: initial?.project_area ?? '',
    funding_agency: initial?.funding_agency ?? '',
    client_organization: initial?.client_organization ?? '',
    amount_sanctioned: initial?.amount_sanctioned ?? '',
    start_date: dateValue(initial?.start_date),
    end_date: dateValue(initial?.end_date),
    status: initial?.status ?? '',
    industry_logo: externalLogo,
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_title.trim()) {
      setError('Project title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      [...TEXT_FIELDS, 'amount_sanctioned', 'start_date', 'end_date', 'industry_logo'].forEach(
        (k) => fd.append(k, String(form[k] ?? '').trim()),
      );
      if (file) fd.append('industry_logo_file', file);
      await onSave(fd);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const hasUploadedLogo = initial?.industry_logo && !externalLogo;

  return createPortal(
    <div
      className="icp-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="icp-form-panel">
        <h3 className="icp-form-title">
          {isCreate ? 'Add Sponsored Project' : `Edit “${initial?.project_title || 'project'}”`}
        </h3>
        <form onSubmit={handleSubmit} className="icp-form">
          <label className="icp-form-label">
            Project title<span className="icp-req">*</span>
            <input className="icp-form-input" value={form.project_title}
              onChange={setField('project_title')} placeholder="e.g. Development of …" autoFocus />
          </label>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Principal investigator
              <input className="icp-form-input" value={form.principal_investigator}
                onChange={setField('principal_investigator')} placeholder="e.g. Dr. A. Sharma" />
            </label>
            <label className="icp-form-label">
              PI department
              <input className="icp-form-input" value={form.principal_investigator_department}
                onChange={setField('principal_investigator_department')} placeholder="e.g. Mechanical Engineering" />
            </label>
          </div>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Co-PI 1
              <input className="icp-form-input" value={form.co_principal_investigator1}
                onChange={setField('co_principal_investigator1')} placeholder="e.g. Dr. B. Rao" />
            </label>
            <label className="icp-form-label">
              Co-PI 1 department
              <input className="icp-form-input" value={form.co_principal_investigator1_department}
                onChange={setField('co_principal_investigator1_department')} placeholder="e.g. Physics" />
            </label>
          </div>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Co-PI 2
              <input className="icp-form-input" value={form.co_principal_investigator2}
                onChange={setField('co_principal_investigator2')} placeholder="e.g. Dr. C. Nair" />
            </label>
            <label className="icp-form-label">
              Co-PI 2 department
              <input className="icp-form-input" value={form.co_principal_investigator2_department}
                onChange={setField('co_principal_investigator2_department')} placeholder="e.g. Chemistry" />
            </label>
          </div>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Sponsoring industry
              <input className="icp-form-input" value={form.sponsered_industry}
                onChange={setField('sponsered_industry')} placeholder="e.g. Tata Steel Ltd." />
            </label>
            <label className="icp-form-label">
              Project area
              <input className="icp-form-input" value={form.project_area}
                onChange={setField('project_area')} placeholder="e.g. Materials / AI / Energy" />
            </label>
          </div>

          <label className="icp-form-label">
            Industry logo URL
            <input className="icp-form-input" value={form.industry_logo}
              onChange={setField('industry_logo')} placeholder="https://…/logo.png" />
            <span className="icp-form-hint">Paste a logo URL, or upload an image below if you don’t have one.</span>
          </label>

          <label className="icp-form-label">
            Upload industry logo
            <input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              className="icp-form-input" onChange={(e) => setFile(e.target.files[0] || null)} />
            {hasUploadedLogo && !file && (
              <span className="icp-form-hint">A logo is already uploaded. Leave empty to keep it.</span>
            )}
          </label>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Funding agency
              <input className="icp-form-input" value={form.funding_agency}
                onChange={setField('funding_agency')} placeholder="e.g. DST" />
            </label>
            <label className="icp-form-label">
              Client organization
              <input className="icp-form-input" value={form.client_organization}
                onChange={setField('client_organization')} placeholder="e.g. ABC Pvt. Ltd." />
            </label>
          </div>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Amount sanctioned (₹)
              <input type="number" step="0.01" min="0" className="icp-form-input" value={form.amount_sanctioned}
                onChange={setField('amount_sanctioned')} placeholder="e.g. 500000" />
            </label>
            <label className="icp-form-label">
              Status
              <input className="icp-form-input" value={form.status}
                onChange={setField('status')} placeholder="e.g. Ongoing" />
            </label>
          </div>

          <div className="icp-form-grid">
            <label className="icp-form-label">
              Start date
              <input type="date" className="icp-form-input" value={form.start_date}
                onChange={setField('start_date')} />
            </label>
            <label className="icp-form-label">
              End date
              <input type="date" className="icp-form-input" value={form.end_date}
                onChange={setField('end_date')} />
            </label>
          </div>

          {error && <p className="icp-form-error">{error}</p>}
          <div className="icp-form-actions">
            <button type="button" className="icp-btn" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="icp-btn icp-btn--primary" disabled={saving}>
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

function IcsrSponsoredProjects({ user }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const isAdmin = canModifySection(user?.role_id, 'research/icsr');

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects((await fetchSponsoredProjects(token)) ?? []);
      setError('');
    } catch (err) {
      setProjects([]);
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [token]);

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [isAdmin, load]);

  const handleEdit = async (formData) => {
    await updateSponsoredProject(editing.project_id, formData, token);
    setEditing(null);
    await load();
  };

  const handleAdd = async (formData) => {
    await createSponsoredProject(formData, token);
    setShowAddForm(false);
    await load();
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      `${p.project_title ?? ''} ${p.principal_investigator ?? ''} ${p.principal_investigator_department ?? ''} ${p.sponsered_industry ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [projects, search]);

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="page-content">
          <p className="icp-empty">You don’t have access to manage sponsored projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content">
        <button className="page-back-btn" onClick={() => navigate('/research/icsr')}>
          &larr; Back to ICSR
        </button>

        <div className="icp-header">
          <div>
            <h1 className="icp-h1">Sponsored Projects</h1>
            <p className="icp-subtitle">
              Upload, edit, and attach sponsoring-industry logos for ICSR sponsored projects.
            </p>
            <LastUpdated tables={['icsr_sponsered_projects']} />
          </div>
          <div className="icp-admin-controls">
            <button className="page-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
              <span>&#128228;</span> Upload CSV
            </button>
            <button className="icp-btn icp-btn--primary" onClick={() => setShowAddForm(true)}>
              + Add Project
            </button>
          </div>
        </div>

        <div className="icp-toolbar">
          <input
            className="icp-search"
            type="text"
            placeholder="Search by title, PI, department, or industry…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="icp-count">{visible.length} projects</span>
        </div>

        {error && <div className="icp-error">{error}</div>}

        {loading && !hasLoaded ? (
          <p className="icp-empty">Loading projects…</p>
        ) : visible.length === 0 ? (
          <p className="icp-empty">
            {projects.length === 0
              ? 'No sponsored projects yet. Use “Upload CSV” or “Add Project” to get started.'
              : 'No projects match your search.'}
          </p>
        ) : (
          <div className="table-responsive">
            <table className="icp-table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Title</th>
                  <th>Industry</th>
                  <th>Area</th>
                  <th>PI</th>
                  <th>PI Department</th>
                  <th>Amount</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.project_id}>
                    <td><LogoThumb project={p} /></td>
                    <td className="icp-cell-title">{p.project_title || '–'}</td>
                    <td>{p.sponsered_industry || '–'}</td>
                    <td>{p.project_area || '–'}</td>
                    <td>{p.principal_investigator || '–'}</td>
                    <td>{p.principal_investigator_department || '–'}</td>
                    <td>{formatCurrency(p.amount_sanctioned)}</td>
                    <td className="icp-cell-period">
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </td>
                    <td>{p.status || '–'}</td>
                    <td>
                      <button className="icp-btn icp-btn--edit" onClick={() => setEditing(p)}>
                        <Pencil size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ProjectForm initial={editing} onSave={handleEdit} onCancel={() => setEditing(null)} />
      )}
      {showAddForm && (
        <ProjectForm isCreate onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}

      <DataUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => { setIsUploadModalOpen(false); load(); }}
        tableName="icsr_sponsered_projects"
        token={token}
        onUploadSuccess={load}
      />
    </div>
  );
}

export default IcsrSponsoredProjects;
