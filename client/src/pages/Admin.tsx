import { Link } from 'react-router-dom';

export default function Admin() {
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
      </div>
    </div>
  );
}