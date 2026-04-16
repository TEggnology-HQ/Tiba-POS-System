import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../App';

interface Product {
  id: number;
  name: string;
  price: number;
  barcode: string | null;
  status: 'listed' | 'offsale';
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', barcode: '', status: 'listed' });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, form);
      } else {
        await api.post('/products', form);
      }
      setShowModal(false);
      setForm({ name: '', price: '', barcode: '', status: 'listed' });
      setEditingId(null);
      loadProducts();
    } catch {
      alert('Failed to save product');
    }
  };

  const handleEdit = (product: Product) => {
    setForm({ name: product.name, price: String(product.price), barcode: product.barcode || '', status: product.status });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products</h1>
        {user?.role === 'admin' && (
          <button className="add-btn" onClick={() => setShowModal(true)}>Add Product</button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Price</th>
            <th>Barcode</th>
            <th>Status</th>
            {user?.role === 'admin' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>#{p.id}</td>
              <td>{p.name}</td>
              <td>₱{Number(p.price).toFixed(2)}</td>
              <td>{p.barcode || '-'}</td>
              <td><span className={`status ${p.status}`}>{p.status}</span></td>
              {user?.role === 'admin' && (
                <td>
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDelete(p.id)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{editingId ? 'Edit' : 'Add'} Product</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="listed">Listed</option>
                <option value="offsale">Off Sale</option>
              </select>
              <div className="modal-actions">
                <button type="submit">Save</button>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
