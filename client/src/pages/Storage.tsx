import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../lib/formatters';

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
  const { t } = useTranslation();
  const { user } = useAuth();
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
      const entryDate = form.entry_date ? new Date(form.entry_date).toISOString() : new Date().toISOString();
      const expireDate = form.expire_date ? new Date(form.expire_date).toISOString() : null;
      
      for (let i = 0; i < parseInt(String(form.quantity)); i++) {
        await api.post('/storage', {
          product_type_id: form.product_type_id,
          entry_date: entryDate,
          expire_date: expireDate,
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
    } catch (err: any) {
      alert(err.response?.data?.error || t('pages.storage.failed_add'));
    }
  };

  const updateState = async (id: number, state: string) => {
    try {
      await api.patch(`/storage/${id}`, { state });
      loadStorage();
    } catch {
      alert(t('pages.storage.failed_update'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('pages.storage.title')}</h1>
        {user?.role === 'owner' || user?.role === 'admin' && (
          <button className="add-btn" onClick={() => setShowModal(true)}>{t('pages.storage.add_item')}</button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>{t('pages.storage.product_name')}</th>
            <th>{t('pages.storage.price')}</th>
            <th>{t('pages.storage.entry_date')}</th>
            <th>{t('pages.storage.expire_date')}</th>
            <th>{t('pages.storage.state')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td>{formatCurrency(item.price)}</td>
              <td>{new Date(item.entry_date).toLocaleString()}</td>
              <td>{item.expire_date ? new Date(item.expire_date).toLocaleDateString() : '-'}</td>
              <td>
                <select 
                  value={item.state} 
                  onChange={(e) => updateState(item.id, e.target.value)}
                  className="state-select"
                >
                  <option value="onsale">{t('pages.storage.onsale')}</option>
                  <option value="offsale">{t('pages.storage.offsale')}</option>
                  <option value="sold">{t('pages.storage.sold')}</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{t('pages.storage.add_item')}</h2>
            <form onSubmit={handleSubmit}>
              <select 
                value={form.product_type_id} 
                onChange={(e) => setForm({ ...form, product_type_id: e.target.value })}
                required
              >
                <option value="">{t('pages.storage.select_product')}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
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
                placeholder={t('pages.storage.expire_date')}
                value={form.expire_date}
                onChange={(e) => setForm({ ...form, expire_date: e.target.value })}
              />
              <input
                type="number"
                placeholder={t('pages.storage.quantity')}
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                required
              />
              <div className="modal-actions">
                <button type="submit">{t('common.add', 'Add')}</button>
                <button type="button" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
