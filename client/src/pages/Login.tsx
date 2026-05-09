import { useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import LockLocked from '../../../lock-locked.svg';
import LockUnlocked from '../../../lock-unlocked.svg';

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.user, res.data.token);
    } catch {
      setError(t('common.invalid_credentials'));
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>{t('pages.login.title', t('pages.login_title'))}</h1>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder={t('common.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <div className="password-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('common.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <button type="submit">{t('common.login')}</button>
      </form>
    </div>
  );
}
