import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../App';
import LockLocked from '../../../lock-locked.svg';
import LockUnlocked from '../../../lock-unlocked.svg';

interface User {
  id: number;
  username: string;
  role_id: number;
  role: string;
  role_name: string;
  status: string;
  created_at: string;
}

interface UserRole {
  id: number;
  name: string;
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role_id: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const loadRoles = async () => {
    const res = await api.get('/roles');
    setRoles(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const isSelf = editingId === currentUser?.id;
        await api.put(`/users/${editingId}`, {
          ...(isSelf && currentUser?.role === 'owner' ? { username: form.username } : {}),
          password: form.password || undefined,
          role_id: (!isSelf && form.role_id) ? Number(form.role_id) : undefined,
        });
      } else {
        await api.post('/users', {
          username: form.username,
          password: form.password,
          role_id: Number(form.role_id),
        });
      }
      setShowModal(false);
      setForm({ username: '', password: '', role_id: '' });
      setEditingId(null);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setForm({ 
      username: user.username, 
      password: '', 
      role_id: String(user.role_id) 
    });
    setEditingId(user.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const canEdit = (user: User): boolean => {
    if (!currentUser) return false;
    if (user.id === currentUser.id) return true;
    if (currentUser.role === 'admin') {
      return user.role_name === 'cashier';
    }
    return true;
  };

  const canDelete = (user: User): boolean => {
    if (!currentUser) return false;
    if (user.id === currentUser.id) return false;
    if (currentUser.role === 'admin') {
      return user.role_name === 'cashier';
    }
    return true;
  };

  const getFilteredRoles = (): UserRole[] => {
    if (currentUser?.role === 'admin') {
      return roles.filter(r => r.name === 'cashier');
    }
    return roles;
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role_name.toLowerCase().includes(search.toLowerCase())
  );

  const isOwnProfile = editingId === currentUser?.id;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Users</h1>
        <button className="add-btn" onClick={() => { setEditingId(null); setForm({ username: '', password: '', role_id: currentUser?.role === 'admin' ? '3' : '' }); setShowModal(true); }}>
          Add User
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
          style={{ maxWidth: '300px' }}
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className={user.id === currentUser?.id ? 'current-user-row' : ''}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>
                  <span className={`role-badge ${user.role_name}`}>
                    {user.role_name}
                  </span>
                </td>
                <td>
                  <span className={`status ${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {canEdit(user) && <button onClick={() => handleEdit(user)}>Edit</button>}
                  {canDelete(user) && <button className="btn-delete" onClick={() => handleDelete(user.id)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{editingId ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                disabled={isOwnProfile && currentUser?.role === 'admin'}
                className={isOwnProfile && currentUser?.role === 'admin' ? 'disabled-field' : ''}
              />
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editingId ? 'New Password (leave blank to keep)' : 'Password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                  className="password-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <img src={showPassword ? LockUnlocked : LockLocked} alt="Toggle password" />
                </button>
              </div>
              <select
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                required={!editingId}
                disabled={isOwnProfile}
              >
                <option value="">Select Role</option>
                {getFilteredRoles().map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {isOwnProfile && (
                <p className="info-text">
                  {currentUser?.role === 'owner' 
                    ? 'You can only change your password and username' 
                    : 'You can only change your password'}
                </p>
              )}
              <div className="modal-actions">
                <button type="submit">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}