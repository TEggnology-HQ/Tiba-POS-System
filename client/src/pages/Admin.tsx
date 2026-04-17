import { Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Admin() {
  const { user } = useAuth();
  
  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage your store inventory and products</p>
      </div>
      <div className="admin-cards">
        <Link to="/storage" className="admin-card storage-card">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <h2>Storage</h2>
            <p>Manage inventory stock levels</p>
          </div>
          <div className="card-arrow">→</div>
        </Link>
        <Link to="/products" className="admin-card products-card">
          <div className="card-icon">🏷️</div>
          <div className="card-content">
            <h2>Products</h2>
            <p>Add, edit or remove products</p>
          </div>
          <div className="card-arrow">→</div>
        </Link>
        {user?.role === 'owner' || user?.role === 'admin' ? (
          <Link to="/users" className="admin-card users-card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h2>Users</h2>
              <p>Manage user accounts and roles</p>
            </div>
            <div className="card-arrow">→</div>
          </Link>
        ) : null}
        <Link to="/activity" className="admin-card activity-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h2>Activity Log</h2>
            <p>View user actions and system events</p>
          </div>
          <div className="card-arrow">→</div>
        </Link>
      </div>
    </div>
  );
}