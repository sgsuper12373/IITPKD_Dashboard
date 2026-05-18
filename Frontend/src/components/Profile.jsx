import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './Page.css';
import './Profile.css';
import TruncateConfirmModal from './TruncateConfirmModal';

const API_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;
const API_EXPORT_URL = `${import.meta.env.VITE_API_BASE_URL}/api/export`;

function Profile({ user }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  const isAdmin = user && user.role_id === 3;

  // Active Panel State
  const [activePanel, setActivePanel] = useState(null);

  // --- Roles State ---
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // --- Users State ---
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserConfirmPassword, setEditUserConfirmPassword] = useState('');

  // --- Export State ---
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  // --- Truncate State ---
  const [truncateModalOpen, setTruncateModalOpen] = useState(false);
  const [truncatingTable, setTruncatingTable] = useState(null);

  // --- Toast ---
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const toastTimerRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);


  const handleCreateUserClick = () => {
    navigate('/create-user');
  };

  const togglePanel = (panel) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === 'roles') fetchRoles();
      if (panel === 'users') { fetchUsers(); fetchRoles(); }
      if (panel === 'export') fetchTables();
      if (panel === 'truncate') fetchTables();
    }
  };

  // --- Roles Methods ---
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`${API_AUTH_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      setRoles(await res.json());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleEditStart = (role) => {
    setEditingId(role.id);
    setEditName(role.name);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleEditSave = async (roleId) => {
    if (!editName.trim()) return;
    setSavingId(roleId);
    try {
      const res = await fetch(`${API_AUTH_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role');
      showToast(`Role "${data.name}" updated successfully.`);
      setEditingId(null);
      setEditName('');
      fetchRoles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || newRoleId === '') return;
    setSavingId('new');
    try {
      const res = await fetch(`${API_AUTH_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: parseInt(newRoleId, 10), name: newRoleName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create role');
      showToast(`Role "${data.name}" (ID: ${data.id}) created successfully.`);
      setNewRoleName('');
      setNewRoleId('');
      fetchRoles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.name}" (ID: ${role.id})? This cannot be undone.`)) return;
    setDeletingId(role.id);
    try {
      const res = await fetch(`${API_AUTH_URL}/roles/${role.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete role');
      showToast(data.message);
      fetchRoles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Users Methods ---
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_AUTH_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsersList(await res.json());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserEditStart = (u) => {
    setEditingUserId(u.id);
    setEditUserRole(u.role_id);
    setEditUserPassword('');
    setEditUserConfirmPassword('');
  };

  const handleUserEditCancel = () => {
    setEditingUserId(null);
    setEditUserRole('');
    setEditUserPassword('');
    setEditUserConfirmPassword('');
  };

  const handleUserEditSave = async (userId) => {
    if (editUserPassword && editUserPassword !== editUserConfirmPassword) {
      showToast('Passwords do not match!', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_AUTH_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role_id: editUserRole, password: editUserPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user');
      showToast('User updated successfully.');
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- Export Methods ---
  const fetchTables = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`${API_EXPORT_URL}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch tables');
      setTables(await res.json());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const toggleTableSelection = (tableName) => {
    setSelectedTables(prev =>
      prev.includes(tableName) ? prev.filter(t => t !== tableName) : [...prev, tableName]
    );
  };

  const downloadTableAsCSV = async (tableName) => {
    try {
      const res = await fetch(`${API_EXPORT_URL}/table/${tableName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to download ${tableName}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportSelected = async () => {
    if (selectedTables.length === 0) {
      showToast('Please select at least one table.', 'error');
      return;
    }
    showToast('Starting downloads…', 'info');
    for (const tableName of selectedTables) {
      await downloadTableAsCSV(tableName);
    }
    showToast('Downloads complete!');
  };


  return (
    <div className="page-container">
      <div className="page-content">
        <h1>User Profile</h1>
        {user ? (
          <>
            <div className="profile-info">
              <div className="profile-field">
                <label>Email:</label>
                <span>{user.email || 'N/A'}</span>
              </div>
              <div className="profile-field">
                <label>Display Name:</label>
                <span>{user.display_name || 'N/A'}</span>
              </div>
              <div className="profile-field">
                <label>Username:</label>
                <span>{user.username || 'N/A'}</span>
              </div>
              <div className="profile-field">
                <label>Status:</label>
                <span>{user.status || 'N/A'}</span>
              </div>
              {user.role_id && (
                <div className="profile-field">
                  <label>Role ID:</label>
                  <span>{user.role_id}</span>
                </div>
              )}
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="profile-actions">
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="page-upload-btn" onClick={handleCreateUserClick}>
                    👤 Create User
                  </button>
                  <button
                    className="page-upload-btn"
                    onClick={() => togglePanel('users')}
                    style={{ backgroundColor: activePanel === 'users' ? '#f7a600' : undefined, color: activePanel === 'users' ? '#fff' : undefined }}
                  >
                    👥 Users
                  </button>
                  <button
                    className="page-upload-btn"
                    onClick={() => togglePanel('roles')}
                    style={{ backgroundColor: activePanel === 'roles' ? '#f7a600' : undefined, color: activePanel === 'roles' ? '#fff' : undefined }}
                  >
                    🔑 Roles
                  </button>
                  <button
                    className="page-upload-btn"
                    onClick={() => togglePanel('export')}
                    style={{ backgroundColor: activePanel === 'export' ? '#f7a600' : undefined, color: activePanel === 'export' ? '#fff' : undefined }}
                  >
                    📥 Export Data
                  </button>
                  <button
                    className="page-upload-btn"
                    onClick={() => togglePanel('truncate')}
                    style={{ backgroundColor: activePanel === 'truncate' ? '#ef4444' : undefined, color: activePanel === 'truncate' ? '#fff' : undefined, borderColor: activePanel === 'truncate' ? '#ef4444' : undefined }}
                  >
                    ⚠ Truncate Tables
                  </button>
                </div>

                {/* Users Management Panel */}
                {activePanel === 'users' && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title">Manage Users</h3>
                    {usersLoading ? (
                      <p style={{ color: '#666', padding: '1rem 0' }}>Loading users…</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="roles-table" style={{ minWidth: '600px' }}>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Email</th>
                              <th>Username</th>
                              <th>Role ID</th>
                              <th>Password</th>
                              <th style={{ width: '160px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersList.map((u) => (
                              <tr key={u.id}>
                                <td>{u.id}</td>
                                <td>{u.email}</td>
                                <td>{u.username}</td>
                                <td>
                                  {editingUserId === u.id ? (
                                    <select
                                      value={editUserRole}
                                      onChange={(e) => setEditUserRole(e.target.value)}
                                      className="roles-edit-input"
                                      style={{ width: 'auto' }}
                                    >
                                      {roles.map(r => <option key={r.id} value={r.id}>{r.id} - {r.name}</option>)}
                                    </select>
                                  ) : (
                                    <span style={{ fontWeight: 600, color: '#333' }}>{u.role_id}</span>
                                  )}
                                </td>
                                <td>
                                  {editingUserId === u.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                      <input
                                        type="password"
                                        placeholder="New password"
                                        value={editUserPassword}
                                        onChange={(e) => setEditUserPassword(e.target.value)}
                                        className="roles-edit-input"
                                        style={{ width: '100%', minWidth: '140px' }}
                                      />
                                      <input
                                        type="password"
                                        placeholder="Confirm password"
                                        value={editUserConfirmPassword}
                                        onChange={(e) => setEditUserConfirmPassword(e.target.value)}
                                        className="roles-edit-input"
                                        style={{ width: '100%', minWidth: '140px' }}
                                      />
                                    </div>
                                  ) : (
                                    <span style={{ color: '#999', fontSize: '12px' }}>••••••</span>
                                  )}
                                </td>
                                <td>
                                  {editingUserId === u.id ? (
                                    <div className="roles-action-btns">
                                      <button className="roles-btn roles-btn-save" onClick={() => handleUserEditSave(u.id)}>✓ Save</button>
                                      <button className="roles-btn roles-btn-cancel" onClick={handleUserEditCancel}>✕</button>
                                    </div>
                                  ) : (
                                    <button className="roles-btn roles-btn-edit" onClick={() => handleUserEditStart(u)}>✎ Edit</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Roles Management Panel */}
                {activePanel === 'roles' && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title">Manage Roles</h3>
                    {rolesLoading ? (
                      <p style={{ color: '#666', padding: '1rem 0' }}>Loading roles…</p>
                    ) : (
                      <>
                        <table className="roles-table">
                          <thead>
                            <tr>
                              <th style={{ width: '80px' }}>ID</th>
                              <th>Name</th>
                              <th style={{ width: '160px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roles.map((role) => (
                              <tr key={role.id}>
                                <td className="roles-id-cell">{role.id}</td>
                                <td>
                                  {editingId === role.id ? (
                                    <input
                                      type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(role.id); if (e.key === 'Escape') handleEditCancel(); }}
                                      className="roles-edit-input" autoFocus
                                    />
                                  ) : (
                                    <span className="roles-name">{role.name}</span>
                                  )}
                                </td>
                                <td>
                                  {editingId === role.id ? (
                                    <div className="roles-action-btns">
                                      <button className="roles-btn roles-btn-save" onClick={() => handleEditSave(role.id)} disabled={savingId === role.id}>
                                        {savingId === role.id ? '…' : '✓ Save'}
                                      </button>
                                      <button className="roles-btn roles-btn-cancel" onClick={handleEditCancel}>✕</button>
                                    </div>
                                  ) : (
                                    <div className="roles-action-btns">
                                      <button className="roles-btn roles-btn-edit" onClick={() => handleEditStart(role)}>✎ Edit</button>
                                      <button className="roles-btn roles-btn-delete" onClick={() => handleDeleteRole(role)} disabled={deletingId === role.id}>
                                        {deletingId === role.id ? '…' : '🗑'}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="roles-new-row">
                          <input
                            type="number" placeholder="ID" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRole(); }}
                            className="roles-edit-input roles-id-input"
                          />
                          <input
                            type="text" placeholder="New role name…" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRole(); }}
                            className="roles-edit-input"
                          />
                          <button className="roles-btn roles-btn-add" onClick={handleCreateRole} disabled={!newRoleName.trim() || newRoleId === '' || savingId === 'new'}>
                            {savingId === 'new' ? 'Adding…' : '+ Add Role'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Export Data Panel */}
                {activePanel === 'export' && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title">Export Database Tables</h3>
                    {exportLoading ? (
                      <p style={{ color: '#666', padding: '1rem 0' }}>Loading tables…</p>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                          {tables.map(t => (
                            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={selectedTables.includes(t)}
                                onChange={() => toggleTableSelection(t)}
                              />
                              <span style={{ fontSize: '14px', color: '#333' }}>{t}</span>
                            </label>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <button
                            className="roles-btn roles-btn-save"
                            style={{ padding: '8px 16px', fontSize: '14px' }}
                            onClick={handleExportSelected}
                            disabled={selectedTables.length === 0}
                          >
                            Download Selected as CSV
                          </button>
                          <button
                            className="roles-btn roles-btn-edit"
                            onClick={() => setSelectedTables(tables)}
                          >
                            Select All
                          </button>
                          <button
                            className="roles-btn roles-btn-cancel"
                            onClick={() => setSelectedTables([])}
                          >
                            Deselect All
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Truncate Tables Panel */}
                {activePanel === 'truncate' && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title" style={{ color: '#991b1b' }}>⚠ Truncate Tables</h3>
                    <p style={{ color: '#666', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                      Permanently delete all rows from a table. Export the data first to keep a backup.
                    </p>
                    {exportLoading ? (
                      <p style={{ color: '#666', padding: '1rem 0' }}>Loading tables…</p>
                    ) : (
                      <div className="truncate-list-wrap">
                        <table className="roles-table truncate-list-table">
                          <thead>
                            <tr>
                              <th>Table Name</th>
                              <th className="truncate-actions-col">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tables.map((t) => (
                              <tr key={t} className="truncate-list-row">
                                <td className="truncate-list-name" data-label="Table">{t}</td>
                                <td className="truncate-list-actions" data-label="Actions">
                                  <button
                                    className="roles-btn roles-btn-edit"
                                    onClick={() => downloadTableAsCSV(t)}
                                    title="Download table as CSV before truncating"
                                  >
                                    Export First
                                  </button>
                                  <button
                                    className="roles-btn roles-btn-delete truncate-list-delete-btn"
                                    onClick={() => { setTruncatingTable(t); setTruncateModalOpen(true); }}
                                    title={`Truncate table ${t}`}
                                  >
                                    Truncate
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p>Loading user information...</p>
        )}
        {/* {!canUploadData && <p className="coming-soon">Full profile page implementation coming soon...</p>} */}
      </div>

      {toast && createPortal(
        <div className={`profile-toast profile-toast-${toast.type}`} onClick={() => setToast(null)}>
          {toast.message}
        </div>,
        document.body
      )}

      <TruncateConfirmModal
        isOpen={truncateModalOpen}
        onClose={() => { setTruncateModalOpen(false); setTruncatingTable(null); }}
        tableName={truncatingTable}
        token={token}
        onExportFirst={(t) => downloadTableAsCSV(t)}
        onTruncateSuccess={(t) => {
          showToast(`Table "${t}" truncated successfully.`);
          setTruncateModalOpen(false);
          setTruncatingTable(null);
        }}
      />
    </div>
  );
}

export default Profile;
