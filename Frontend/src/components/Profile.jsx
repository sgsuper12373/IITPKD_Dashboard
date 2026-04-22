import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Page.css';
import './Profile.css';

const API_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;

function Profile({ user }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  // Check if user has role_id 2 or 3
  const canUploadData = user && (user.role_id === 2 || user.role_id === 3);
  const isAdmin = user && user.role_id === 3;

  // Roles panel state
  const [showRoles, setShowRoles] = useState(false);
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

  const handleUploadClick = () => {
    navigate('/upload');
  };

  const handleCreateUserClick = () => {
    navigate('/create-user');
  };

  // Fetch roles from backend
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

  // Load roles when panel is opened
  useEffect(() => {
    if (showRoles && isAdmin) {
      fetchRoles();
    }
  }, [showRoles]);

  // Start editing a role
  const handleEditStart = (role) => {
    setEditingId(role.id);
    setEditName(role.name);
    setRolesSuccess('');
    setRolesError('');
  };

  // Cancel editing
  const handleEditCancel = () => {
    setEditingId(null);
    setEditName('');
  };

  // Save edited role
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

  // Create new role
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

  // Delete a role
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
                  <button
                    className="page-upload-btn"
                    onClick={handleCreateUserClick}
                  >
                    👤 Create User
                  </button>
                  <button
                    className="page-upload-btn"
                    onClick={() => setShowRoles(prev => !prev)}
                    style={{
                      backgroundColor: showRoles ? '#f7a600' : undefined,
                      color: showRoles ? '#fff' : undefined,
                    }}
                  >
                    🔑 Roles
                  </button>
                </div>

                {/* Roles Management Panel */}
                {showRoles && (
                  <div className="roles-panel">
                    <h3 className="roles-panel-title">Manage Roles</h3>

                    {/* Status messages */}
                    {rolesError && (
                      <div className="roles-msg roles-msg-error">{rolesError}</div>
                    )}
                    {rolesSuccess && (
                      <div className="roles-msg roles-msg-success">{rolesSuccess}</div>
                    )}

                    {rolesLoading ? (
                      <p style={{ color: '#666', padding: '1rem 0' }}>Loading roles…</p>
                    ) : (
                      <>
                        {/* Roles Table */}
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
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleEditSave(role.id);
                                        if (e.key === 'Escape') handleEditCancel();
                                      }}
                                      className="roles-edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="roles-name">{role.name}</span>
                                  )}
                                </td>
                                <td>
                                  {editingId === role.id ? (
                                    <div className="roles-action-btns">
                                      <button
                                        className="roles-btn roles-btn-save"
                                        onClick={() => handleEditSave(role.id)}
                                        disabled={savingId === role.id}
                                      >
                                        {savingId === role.id ? '…' : '✓ Save'}
                                      </button>
                                      <button
                                        className="roles-btn roles-btn-cancel"
                                        onClick={handleEditCancel}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="roles-action-btns">
                                      <button
                                        className="roles-btn roles-btn-edit"
                                        onClick={() => handleEditStart(role)}
                                      >
                                        ✎ Edit
                                      </button>
                                      <button
                                        className="roles-btn roles-btn-delete"
                                        onClick={() => handleDeleteRole(role)}
                                        disabled={deletingId === role.id}
                                      >
                                        {deletingId === role.id ? '…' : '🗑'}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Add New Role */}
                        <div className="roles-new-row">
                          <input
                            type="number"
                            placeholder="ID"
                            value={newRoleId}
                            onChange={(e) => setNewRoleId(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateRole();
                            }}
                            className="roles-edit-input roles-id-input"
                          />
                          <input
                            type="text"
                            placeholder="New role name…"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCreateRole();
                            }}
                            className="roles-edit-input"
                          />
                          <button
                            className="roles-btn roles-btn-add"
                            onClick={handleCreateRole}
                            disabled={!newRoleName.trim() || newRoleId === '' || savingId === 'new'}
                          >
                            {savingId === 'new' ? 'Adding…' : '+ Add Role'}
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
        {!canUploadData && <p className="coming-soon">Full profile page implementation coming soon...</p>}
      </div>
    </div>
  );
}

export default Profile;