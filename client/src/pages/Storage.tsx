import { useState, useEffect } from 'react';
import api from '../lib/api';

interface StorageItem {
  id: number;
  product_type_id: number;
  product_name: string;
  price: number;
  entry_date: string;
  expire_date: string | null;
  state: 'onsale' | 'offsale' | 'sold';
}

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function Storage() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ 
    product_type_id: '', 
    entry_date: new Date().toISOString().slice(0, 16), 
    expire_date: '',
    quantity: 1 
  });

  useEffect(() => {
    loadStorage();
    loadProducts();
  }, []);

  const loadStorage = async () => {
    const res = await api.get('/storage');
    setItems(res.data);
  };

  const loadProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (let i = 0; i < parseInt(String(form.quantity)); i++) {
        await api.post('/storage', {
          product_type_id: form.product_type_id,
          entry_date: form.entry_date,
          expire_date: form.expire_date || null,
        });
      }
      setShowModal(false);
      setForm({ 
        product_type_id: '', 
        entry_date: new Date().toISOString().slice(0, 16), 
        expire_date: '',
        quantity: 1 
      });
      loadStorage();
    } catch {
      alert('Failed to add storage item');
    }
  };

  const updateState = async (id: number, state: string) => {
    try {
      await api.patch(`/storage/${id}`, { state });
      loadStorage();
    } catch {
      alert('Failed to update state');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Storage</h1>
        <button className="add-btn" onClick={() => setShowModal(true)}>Add Item</button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Price</th>
            <th>Entry Date</th>
            <th>Expire Date</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td>₱{Number(item.price).toFixed(2)}</td>
              <td>{new Date(item.entry_date).toLocaleString()}</td>
              <td>{item.expire_date ? new Date(item.expire_date).toLocaleDateString() : '-'}</td>
              <td>
                <select 
                  value={item.state} 
                  onChange={(e) => updateState(item.id, e.target.value)}
                  className="state-select"
                >
                  <option value="onsale">On Sale</option>
                  <option value="offsale">Off Sale</option>
                  <option value="sold">Sold</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add Storage Item</h2>
            <form onSubmit={handleSubmit}>
              <select 
                value={form.product_type_id} 
                onChange={(e) => setForm({ ...form, product_type_id: e.target.value })}
                required
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - ₱{Number(p.price).toFixed(2)}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                required
              />
              <input
                type="datetime-local"
                placeholder="Expire Date (optional)"
                value={form.expire_date}
                onChange={(e) => setForm({ ...form, expire_date: e.target.value })}
              />
              <input
                type="number"
                placeholder="Quantity"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                required
              />
              <div className="modal-actions">
                <button type="submit">Add</button>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}