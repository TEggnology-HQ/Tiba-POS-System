import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../App';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Tiba</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/new-sale" end className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">+</span>
            New Sale
          </NavLink>
          <NavLink to="/storage" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📦</span>
            Storage
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">☰</span>
            Transactions
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">👤</span>
              Users
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="username">{user?.username}</span>
            <span className="role">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
