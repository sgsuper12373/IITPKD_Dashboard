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

  const [activePanel, setActivePanel] = useState(null);

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserConfirmPassword, setEditUserConfirmPassword] = useState('');

  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const [truncateModalOpen, setTruncateModalOpen] = useState(false);
  const [truncatingTable, setTruncatingTable] = useState(null);

  const [toast, setToast] = useState(null);
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

            {isAdmin && (
              <div className="profile-actions">
                <div className="profile-btn-row">
                  <button className="page-upload-btn" onClick={handleCreateUserClick}>
                    👤 Create User
                  </button>
                  <button
                    className={`page-upload-btn${activePanel === 'users' ? ' page-upload-btn--active' : ''}`}
                    onClick={() => togglePanel('users')}
                  >
                    👥 Users
                  </button>
                  <button
                    className={`page-upload-btn${activePanel === 'roles' ? ' page-upload-btn--active' : ''}`}
                    onClick={() => togglePanel('roles')}
                  >
                    🔑 Roles
                  </button>
                  <button
                    className={`page-upload-btn${activePanel === 'export' ? ' page-upload-btn--active' : ''}`}
                    onClick={() => togglePanel('export')}
                  >
                    📥 Export Data
                  </button>
                  <button
                    className={`page-upload-btn${activePanel === 'truncate' ? ' page-upload-btn--active-danger' : ''}`}
                    onClick={() => togglePanel('truncate')}
                  >
                    ⚠ Truncate Tables
                  </button>
                </div>

                {/* Users Management Panel */}
                {activePanel === 'users' && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title">Manage Users</h3>
                    {usersLoading ? (
                      <p className="profile-loading-text">Loading users…</p>
                    ) : (
                      <div className="profile-table-scroll">
                        <table className="roles-table profile-users-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Email</th>
                              <th>Username</th>
                              <th>Role ID</th>
                              <th>Password</th>
                              <th className="profile-actions-col">Actions</th>
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
                                      className="roles-edit-input profile-role-select"
                                    >
                                      {roles.map(r => <option key={r.id} value={r.id}>{r.id} - {r.name}</option>)}
                                    </select>
                                  ) : (
                                    <span className="profile-role-id">{u.role_id}</span>
                                  )}
                                </td>
                                <td>
                                  {editingUserId === u.id ? (
                                    <div className="profile-pw-col">
                                      <input
                                        type="password"
                                        placeholder="New password"
                                        value={editUserPassword}
                                        onChange={(e) => setEditUserPassword(e.target.value)}
                                        className="roles-edit-input profile-pw-input"
                                      />
                                      <input
                                        type="password"
                                        placeholder="Confirm password"
                                        value={editUserConfirmPassword}
                                        onChange={(e) => setEditUserConfirmPassword(e.target.value)}
                                        className="roles-edit-input profile-pw-input"
                                      />
                                    </div>
                                  ) : (
                                    <span className="profile-pw-dots">••••••</span>
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
                      <p className="profile-loading-text">Loading roles…</p>
                    ) : (
                      <>
                        <table className="roles-table">
                          <thead>
                            <tr>
                              <th className="profile-id-col">ID</th>
                              <th>Name</th>
                              <th className="profile-actions-col">Actions</th>
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
                      <p className="profile-loading-text">Loading tables…</p>
                    ) : (
                      <>
                        <div className="profile-export-grid">
                          {tables.map(t => (
                            <label key={t} className="profile-export-label">
                              <input
                                type="checkbox"
                                checked={selectedTables.includes(t)}
                                onChange={() => toggleTableSelection(t)}
                              />
                              <span className="profile-table-name">{t}</span>
                            </label>
                          ))}
                        </div>
                        <div className="profile-export-actions">
                          <button
                            className="roles-btn roles-btn-save profile-export-download-btn"
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
                    <h3 className="roles-panel-title roles-panel-title--danger">⚠ Truncate Tables</h3>
                    <p className="profile-truncate-desc">
                      Permanently delete all rows from a table. Export the data first to keep a backup.
                    </p>
                    {exportLoading ? (
                      <p className="profile-loading-text">Loading tables…</p>
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
