import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Page.css';
import './Profile.css';

const API_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;
const API_EXPORT_URL = `${import.meta.env.VITE_API_BASE_URL}/api/export`;

function Profile({ user }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  // Check if user has role_id 2 or 3
  const canUploadData = user && (user.role_id === 2 || user.role_id === 3);
  const isAdmin = user && user.role_id === 3;

  // Active Panel State ('roles', 'users', 'export', or null)
  const [activePanel, setActivePanel] = useState(null);

  // --- Roles State ---
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState('');
  const [rolesSuccess, setRolesSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // --- Users State ---
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersSuccess, setUsersSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserConfirmPassword, setEditUserConfirmPassword] = useState('');

  // --- Export State ---
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const handleUploadClick = () => {
    navigate('/upload');
  };

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
    }
  };

  // --- Roles Methods ---
  const fetchRoles = async () => {
    setRolesLoading(true);
    setRolesError('');
    try {
      const res = await fetch(`${API_AUTH_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      setRolesError(err.message);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleEditStart = (role) => {
    setEditingId(role.id);
    setEditName(role.name);
    setRolesSuccess('');
    setRolesError('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleEditSave = async (roleId) => {
    if (!editName.trim()) return;
    setSavingId(roleId);
    setRolesError('');
    setRolesSuccess('');
    try {
      const res = await fetch(`${API_AUTH_URL}/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role');
      setRolesSuccess(`Role "${data.name}" updated successfully.`);
      setEditingId(null);
      setEditName('');
      fetchRoles();
    } catch (err) {
      setRolesError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || newRoleId === '') return;
    setSavingId('new');
    setRolesError('');
    setRolesSuccess('');
    try {
      const res = await fetch(`${API_AUTH_URL}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: parseInt(newRoleId, 10), name: newRoleName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create role');
      setRolesSuccess(`Role "${data.name}" (ID: ${data.id}) created successfully.`);
      setNewRoleName('');
      setNewRoleId('');
      fetchRoles();
    } catch (err) {
      setRolesError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete role "${role.name}" (ID: ${role.id})? This cannot be undone.`)) return;
    setDeletingId(role.id);
    setRolesError('');
    setRolesSuccess('');
    try {
      const res = await fetch(`${API_AUTH_URL}/roles/${role.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete role');
      setRolesSuccess(data.message);
      fetchRoles();
    } catch (err) {
      setRolesError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Users Methods ---
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await fetch(`${API_AUTH_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsersList(data);
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserEditStart = (u) => {
    setEditingUserId(u.id);
    setEditUserRole(u.role_id);
    setEditUserPassword('');
    setEditUserConfirmPassword('');
    setUsersError('');
    setUsersSuccess('');
  };

  const handleUserEditCancel = () => {
    setEditingUserId(null);
    setEditUserRole('');
    setEditUserPassword('');
    setEditUserConfirmPassword('');
  };

  const handleUserEditSave = async (userId) => {
    setUsersError('');
    setUsersSuccess('');

    if (editUserPassword && editUserPassword !== editUserConfirmPassword) {
      setUsersError("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch(`${API_AUTH_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_id: editUserRole,
          password: editUserPassword || undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user');
      setUsersSuccess(`User updated successfully.`);
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      setUsersError(err.message);
    }
  };

  // --- Export Methods ---
  const fetchTables = async () => {
    setExportLoading(true);
    setExportError('');
    try {
      const res = await fetch(`${API_EXPORT_URL}/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch tables');
      const data = await res.json();
      setTables(data);
    } catch (err) {
      setExportError(err.message);
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
      setExportError(prev => prev ? `${prev}\n${err.message}` : err.message);
    }
  };

  const handleExportSelected = async () => {
    setExportError('');
    setExportSuccess('');
    if (selectedTables.length === 0) {
      setExportError('Please select at least one table.');
      return;
    }
    setExportSuccess('Starting downloads...');
    for (const tableName of selectedTables) {
      await downloadTableAsCSV(tableName);
    }
    setExportSuccess('Downloads complete!');
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
                </div>

                {/* Users Management Panel */}
                {activePanel === 'users' && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title">Manage Users</h3>
                    {usersError && <div className="roles-msg roles-msg-error">{usersError}</div>}
                    {usersSuccess && <div className="roles-msg roles-msg-success">{usersSuccess}</div>}

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
                    {rolesError && <div className="roles-msg roles-msg-error">{rolesError}</div>}
                    {rolesSuccess && <div className="roles-msg roles-msg-success">{rolesSuccess}</div>}

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
                    {exportError && <div className="roles-msg roles-msg-error">{exportError}</div>}
                    {exportSuccess && <div className="roles-msg roles-msg-success">{exportSuccess}</div>}

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
              </div>
            )}
          </>
        ) : (
          <p>Loading user information...</p>
        )}
        {/* {!canUploadData && <p className="coming-soon">Full profile page implementation coming soon...</p>} */}
      </div>
    </div>
  );
}

export default Profile;
