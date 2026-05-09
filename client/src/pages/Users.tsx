import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import LockLocked from '../../../lock-locked.svg';
import LockUnlocked from '../../../lock-unlocked.svg';

interface User {
  id: number;
  username: string;
  role_id: number;
  role_name: string;
  status: string;
  created_at: string;
}

interface UserRole {
  id: number;
  name: string;
}

export default function Users() {
  const { t } = useTranslation();
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
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      alert(err.response?.data?.error || 'Failed to fetch users');
    }
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
      alert(err.response?.data?.error || t('common.save', 'Failed to save user'));
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
    if (!confirm(t('pages.users.delete_confirm'))) return;
    try {
      await api.delete(`/users/${id}`);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || t('common.delete', 'Failed to delete user'));
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
        <h1>{t('pages.users.title')}</h1>
        <button className="add-btn" onClick={() => { setEditingId(null); setForm({ username: '', password: '', role_id: currentUser?.role === 'admin' ? '3' : '' }); setShowModal(true); }}>
          {t('pages.users.add_user')}
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder={t('pages.users.search_users')}
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
              <th>{t('pages.users.id')}</th>
              <th>{t('pages.users.username')}</th>
              <th>{t('pages.users.role')}</th>
              <th>{t('pages.users.status')}</th>
              <th>{t('pages.users.created')}</th>
              <th>{t('pages.users.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
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
                    {canEdit(user) && <button onClick={() => handleEdit(user)}>{t('common.edit')}</button>}
                    {canDelete(user) && <button className="btn-delete" onClick={() => handleDelete(user.id)}>{t('common.delete')}</button>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  {t('pages.activity.no_data', 'No users found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{editingId ? t('common.edit') : t('common.create')} {t('pages.users.username')}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder={t('pages.users.username')}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                disabled={isOwnProfile && currentUser?.role === 'admin'}
                className={isOwnProfile && currentUser?.role === 'admin' ? 'disabled-field' : ''}
              />
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editingId ? t('pages.users.new_password') : t('common.password')}
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
                <option value="">{t('pages.users.select_role')}</option>
                {getFilteredRoles().map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {isOwnProfile && (
                <p className="info-text">
                  {currentUser?.role === 'owner' 
                    ? t('pages.users.info_owner') 
                    : t('pages.users.info_admin')}
                </p>
              )}
              <div className="modal-actions">
                <button type="submit">{editingId ? t('common.update') : t('common.create')}</button>
                <button type="button" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
