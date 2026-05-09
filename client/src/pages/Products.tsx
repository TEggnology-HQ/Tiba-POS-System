import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../lib/formatters';

interface Product {
  id: number;
  name: string;
  price: number;
  barcode: string | null;
  status: 'listed' | 'offsale';
}

export default function Products() {
  const { t } = useTranslation();
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
    } catch (err: any) {
      alert(err.response?.data?.error || t('common.save', 'Failed to save product'));
    }
  };

  const handleEdit = (product: Product) => {
    setForm({ name: product.name, price: String(product.price), barcode: product.barcode || '', status: product.status });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('pages.products.delete_confirm'))) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t('pages.products.title')}</h1>
        {user?.role === 'owner' || user?.role === 'admin' && (
          <button className="add-btn" onClick={() => setShowModal(true)}>{t('pages.products.add_product')}</button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>{t('pages.products.id')}</th>
            <th>{t('pages.products.name')}</th>
            <th>{t('pages.products.price')}</th>
            <th>{t('pages.products.barcode')}</th>
            <th>{t('pages.products.status')}</th>
            {user?.role === 'owner' || user?.role === 'admin' && <th>{t('pages.products.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>#{p.id}</td>
              <td>{p.name}</td>
              <td>{formatCurrency(p.price)}</td>
              <td>{p.barcode || '-'}</td>
              <td><span className={`status ${p.status}`}>{t(`pages.products.${p.status}`)}</span></td>
              {user?.role === 'owner' || user?.role === 'admin' && (
                <td>
                  <button onClick={() => handleEdit(p)}>{t('common.edit')}</button>
                  <button onClick={() => handleDelete(p.id)}>{t('common.delete')}</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{editingId ? t('common.edit') : t('common.create')} {t('pages.products.name')}</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder={t('pages.products.name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder={t('pages.products.price')}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder={t('pages.products.barcode')}
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="listed">{t('pages.products.listed')}</option>
                <option value="offsale">{t('pages.products.offsale')}</option>
              </select>
              <div className="modal-actions">
                <button type="submit">{t('common.save')}</button>
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }}>
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
