import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CreateUser.css';

function CreateUser({ user, token }) {
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    email: '',
    username: '',
    display_name: '',
    password: '',
    role_id: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || user.role_id !== 3) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/roles`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setRoles(res.data))
    .catch(() => setError('Failed to load roles'));
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/create-user`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('User created successfully');
      setForm({
        email: '',
        username: '',
        display_name: '',
        password: '',
        role_id: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating user');
    }
  };

  return (
    <div className="cu-card">
      <h1 className="cu-h1">Create User</h1>

      <form onSubmit={handleSubmit} className="cu-form">
        <div>
          <label className="cu-label">Email</label>
          <input
            name="email"
            type="email"
            placeholder="user@example.com"
            value={form.email}
            onChange={handleChange}
            required
            className="cu-input"
          />
        </div>

        <div>
          <label className="cu-label">Username</label>
          <input
            name="username"
            placeholder="username"
            value={form.username}
            onChange={handleChange}
            required
            className="cu-input"
          />
        </div>

        <div>
          <label className="cu-label">Display Name</label>
          <input
            name="display_name"
            placeholder="John Doe"
            value={form.display_name}
            onChange={handleChange}
            className="cu-input"
          />
        </div>

        <div>
          <label className="cu-label">Temporary Password</label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
            className="cu-input"
          />
        </div>

        <div>
          <label className="cu-label">Role</label>
          <select
            name="role_id"
            value={form.role_id}
            onChange={handleChange}
            required
            className="cu-select"
          >
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="cu-submit">
          Create User
        </button>

        {error && (
          <div className="cu-alert cu-alert--error">{error}</div>
        )}

        {success && (
          <div className="cu-alert cu-alert--success">{success}</div>
        )}
      </form>
    </div>
  );
}

export default CreateUser;
