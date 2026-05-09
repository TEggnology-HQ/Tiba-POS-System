import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import leftArrow from '/left-arrow.svg';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h1>{t('brand.name')}</h1>
          <button 
            className={`sidebar-toggle-btn ${collapsed ? 'collapsed' : ''}`}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <img src={leftArrow} alt="" />
          </button>
        </div>
        <nav className={`sidebar-nav ${collapsed ? 'collapsed' : ''}`}>
          <NavLink to="/new-sale" end className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">+</span>
            <span className="nav-text">{t('nav.new_sale')}</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">☰</span>
            <span className="nav-text">{t('nav.transactions')}</span>
          </NavLink>
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">{t('nav.admin')}</span>
            </NavLink>
           )}
           <div className="sidebar-language-section">
            <LanguageSwitcher />
          </div>
        </nav>
        <div className={`sidebar-footer ${collapsed ? 'collapsed' : ''}`}>
          <div className="user-info">
            <span className="username">{user?.username}</span>
            <span className="role">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">{t('common.logout')}</button>
        </div>
      </aside>
      <main className={`main-content ${collapsed ? 'expanded' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
