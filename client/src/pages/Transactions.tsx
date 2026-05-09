import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../lib/formatters';

interface Transaction {
  id: number;
  created_at: string;
  total_amount: number;
  paid_amount: number;
  type: 'immediate' | 'deferred';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
}

interface TransactionItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Payment {
  id: number;
  amount: number;
  payment_method: string;
  payment_type: string;
  created_at: string;
}

interface DeferredDetails {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
}

interface FilterOptions {
  statuses: string[];
  types: string[];
}

interface Filters {
  status: string;
  type: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ statuses: [], types: [] });
  const [currentFilters, setCurrentFilters] = useState<Filters>({
    status: '',
    type: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: ''
  });

  const [showEditStatusModal, setShowEditStatusModal] = useState(false);
  const [editStatusValue, setEditStatusValue] = useState('');

  const [showProductsModal, setShowProductsModal] = useState(false);
  const [products, setProducts] = useState<TransactionItem[]>([]);

  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempFilters, setTempFilters] = useState<Filters>(currentFilters);

  const [showLookUpModal, setShowLookUpModal] = useState(false);
  const [lookUpType, setLookUpType] = useState('immediate');
  const [lookUpField, setLookUpField] = useState('transaction_id');
  const [lookUpValue, setLookUpValue] = useState('');
  const [lookUpError, setLookUpError] = useState('');

  const [showDeferredModal, setShowDeferredModal] = useState(false);
  const [deferredDetails, setDeferredDetails] = useState<DeferredDetails | null>(null);

  const [showTodayTransactionsModal, setShowTodayTransactionsModal] = useState(false);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);

  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: '' });

  const { t } = useTranslation();

  useEffect(() => {
    loadTransactions();
    loadFilterOptions();
  }, []);

  const loadTransactions = async (filters?: Filters) => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.amount_min) params.append('amount_min', filters.amount_min);
      if (filters.amount_max) params.append('amount_max', filters.amount_max);
    }
    const res = await api.get(`/transactions?${params.toString()}`);
    setTransactions(res.data);
  };

  const loadFilterOptions = async () => {
    const res = await api.get('/transactions/filter-options');
    setFilterOptions(res.data);
  };

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditStatusValue(transaction.status);
  };

  const handleEditStatus = async () => {
    if (!selectedTransaction) return;
    await api.patch(`/transactions/${selectedTransaction.id}/status`, { status: editStatusValue });
    setShowEditStatusModal(false);
    loadTransactions(currentFilters.status || currentFilters.type ? currentFilters : undefined);
    if (selectedTransaction) {
      const res = await api.get(`/transactions/${selectedTransaction.id}`);
      setSelectedTransaction({ ...selectedTransaction, status: res.data.status });
    }
  };

  const handleProductsClick = async () => {
    if (!selectedTransaction) return;
    const res = await api.get(`/transactions/${selectedTransaction.id}/items`);
    setProducts(res.data);
    setShowProductsModal(true);
  };

  const handlePaymentsClick = async () => {
    if (!selectedTransaction) return;
    const res = await api.get(`/payments/transaction/${selectedTransaction.id}`);
    setPayments(res.data);
    setShowPaymentsModal(true);
  };

  const handleFilterApply = () => {
    setCurrentFilters(tempFilters);
    loadTransactions(tempFilters);
    setShowFilterModal(false);
  };

  const handleFilterClear = () => {
    const emptyFilters = { status: '', type: '', date_from: '', date_to: '', amount_min: '', amount_max: '' };
    setTempFilters(emptyFilters);
    setCurrentFilters(emptyFilters);
    loadTransactions();
    setShowFilterModal(false);
  };

  const handleLookUp = async () => {
    setLookUpError('');
    if (lookUpType === 'immediate') {
      if (!lookUpValue) {
        setLookUpError(t('pages.transactions.look_up_error_empty'));
        return;
      }
      const res = await api.get(`/transactions/${lookUpValue}`);
      if (res.data && res.data.id) {
        setTransactions([res.data]);
        setShowLookUpModal(false);
      } else {
        setLookUpError(t('pages.transactions.look_up_error_not_found'));
      }
    } else {
      if (!lookUpField || !lookUpValue) {
        setLookUpError(t('pages.transactions.look_up_error_fields'));
        return;
      }
      const res = await api.get(`/transactions/deferred/search?field=${lookUpField}&value=${encodeURIComponent(lookUpValue)}`);
      if (res.data.length > 0) {
        const params = new URLSearchParams();
        params.append('ids', res.data.join(','));
        const transRes = await api.get(`/transactions?${params.toString()}`);
        setTransactions(transRes.data);
        setShowLookUpModal(false);
      } else {
        setLookUpError(t('pages.transactions.look_up_error_deferred'));
      }
    }
  };

  const handleDeferredClick = async () => {
    if (!selectedTransaction) return;
    const res = await api.get(`/transactions/deferred/${selectedTransaction.id}`);
    setDeferredDetails(res.data);
    setShowDeferredModal(true);
  };

  const handleShowTodayTransactions = async () => {
    const today = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams();
    params.append('date_from', today);
    params.append('date_to', today);
    const res = await api.get(`/transactions?${params.toString()}`);
    setTodayTransactions(res.data);
    setShowTodayTransactionsModal(true);
  };

  const openFilterModal = () => {
    setTempFilters(currentFilters);
    setShowFilterModal(true);
  };

  const handleAddPayment = async () => {
    if (!selectedTransaction || !newPayment.amount || parseFloat(newPayment.amount) <= 0) return;
    
    const amount = parseFloat(newPayment.amount);
    const remaining = selectedTransaction.total_amount - selectedTransaction.paid_amount;
    
    if (amount > remaining) {
      alert(`${t('pages.transactions.payment_amount_exceeds')} ${formatCurrency(remaining)}`);
      return;
    }

    await api.post('/payments', {
      transaction_id: selectedTransaction.id,
      cashier_id: 1,
      amount: amount,
      payment_method: newPayment.payment_method,
      payment_type: 'payment'
    });

    setShowAddPaymentForm(false);
    setNewPayment({ payment_method: 'cash', amount: '' });
    
    const paymentsRes = await api.get(`/payments/transaction/${selectedTransaction.id}`);
    setPayments(paymentsRes.data);

    const transRes = await api.get(`/transactions/${selectedTransaction.id}`);
    setSelectedTransaction({ ...selectedTransaction, paid_amount: transRes.data.paid_amount });
  };

  return (
    <div className="page page-with-panel">
      <div className="page-header">
        <h1>{t('pages.transactions.title')}</h1>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('pages.transactions.date')}</th>
              <th>{t('pages.transactions.type')}</th>
              <th>{t('pages.transactions.total')}</th>
              <th>{t('pages.transactions.paid')}</th>
              <th>{t('pages.transactions.status')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className={selectedTransaction?.id === tx.id ? 'selected' : ''}
                onClick={() => handleRowClick(tx)}
              >
                <td>{new Date(tx.created_at).toLocaleString()}</td>
                <td>{t('pages.transactions.' + tx.type)}</td>
                <td>{formatCurrency(tx.total_amount)}</td>
                <td>{formatCurrency(tx.paid_amount)}</td>
                <td><span className={`status ${tx.status}`}>{t(`pages.transactions.${tx.status}`)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pinned-panel pinned-panel-fixed">
        <div className="pinned-field">
          <label>{t('pages.transactions.transaction_id')}</label>
          <input
            type="text"
            readOnly
            value={selectedTransaction?.id || ''}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
        <button
          className="pinned-btn"
          disabled={!selectedTransaction}
          onClick={() => setShowEditStatusModal(true)}
        >
          {t('pages.transactions.edit_status')}
        </button>
        <button
          className="pinned-btn"
          disabled={!selectedTransaction}
          onClick={handleProductsClick}
        >
          {t('pages.transactions.products')}
        </button>
        <button
          className="pinned-btn"
          disabled={!selectedTransaction}
          onClick={handlePaymentsClick}
        >
          {t('pages.transactions.payments')}
        </button>
        <button
          className="pinned-btn"
          onClick={openFilterModal}
        >
          {t('pages.transactions.filter')}
        </button>
        <button
          className="pinned-btn"
          onClick={() => {
            setLookUpType('immediate');
            setLookUpField('transaction_id');
            setLookUpValue('');
            setLookUpError('');
            setShowLookUpModal(true);
          }}
        >
          {t('pages.transactions.look_up')}
        </button>
          <button
            className="pinned-btn"
            disabled={!selectedTransaction || selectedTransaction.type !== 'deferred'}
            onClick={handleDeferredClick}
          >
            {t('pages.transactions.deferred_details')}
          </button>
          <button
            className="pinned-btn"
            onClick={handleShowTodayTransactions}
          >
            {t('pages.transactions.today_summary')}
          </button>
        </div>


      {showEditStatusModal && selectedTransaction && (
        <div className="modal" onClick={() => setShowEditStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.edit_status_title')}</h2>
            <p><strong>{t('pages.transactions.transaction_id')}:</strong> {selectedTransaction.id}</p>
            <select value={editStatusValue} onChange={(e) => setEditStatusValue(e.target.value)}>
              <option value="pending">{t('pages.transactions.pending')}</option>
              <option value="completed">{t('pages.transactions.completed')}</option>
              <option value="cancelled">{t('pages.transactions.cancelled')}</option>
              <option value="refunded">{t('pages.transactions.refunded')}</option>
            </select>
            <div className="modal-actions">
              <button onClick={handleEditStatus}>{t('common.save')}</button>
              <button onClick={() => setShowEditStatusModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showProductsModal && (
        <div className="modal" onClick={() => setShowProductsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.products_title')}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('pages.transactions.look_up_field', 'Product Name')}</th>
                  <th>{t('pages.pos.quantity', 'Quantity')}</th>
                  <th>{t('pages.products.price')}</th>
                  <th>{t('pages.transactions.total')}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.product_name}</td>
                    <td>{p.quantity}</td>
                    <td>{formatCurrency(p.unit_price)}</td>
                    <td>{formatCurrency(p.quantity * p.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowProductsModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentsModal && (
        <div className="modal" onClick={() => setShowPaymentsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.payments_title')}</h2>
            <div className="payments-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('pages.transactions.date', 'Date')}</th>
                    <th>{t('pages.transactions.payment_amount', 'Amount')}</th>
                    <th>{t('pages.transactions.payment_method', 'Method')}</th>
                    <th>{t('pages.transactions.type', 'Type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td>{t(`pages.pos.${p.payment_method}`, p.payment_method)}</td>
                      <td>{t(`pages.transactions.${p.payment_type}`, p.payment_type)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showAddPaymentForm && (
              <div className="add-payment-section">
                <div className="form-row">
                  <select
                    value={newPayment.payment_method}
                    onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                  >
                    <option value="cash">{t('pages.pos.cash')}</option>
                    <option value="card">{t('pages.pos.card')}</option>
                    <option value="digital">{t('pages.pos.digital')}</option>
                  </select>
                  <input
                    type="number"
                    placeholder={t('pages.transactions.payment_amount')}
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-confirm" onClick={handleAddPayment}>{t('common.save')}</button>
                  <button className="btn-cancel" onClick={() => {
                    setShowAddPaymentForm(false);
                    setNewPayment({ payment_method: 'cash', amount: '' });
                  }}>{t('common.cancel')}</button>
                </div>
              </div>
            )}
            <div className="modal-actions">
              {selectedTransaction?.status !== 'completed' && !showAddPaymentForm && (
                <button onClick={() => setShowAddPaymentForm(true)}>{t('pages.transactions.add_payment')}</button>
              )}
              <button className="btn-close" onClick={() => setShowPaymentsModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="modal" onClick={() => setShowFilterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.filter')} {t('pages.transactions.title', 'Transactions')}</h2>
            <label>{t('pages.transactions.status')}</label>
            <select
              value={tempFilters.status}
              onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}
            >
              <option value="">{t('common.all')}</option>
              {filterOptions.statuses.map((s) => (
                <option key={s} value={s}>{t(`pages.transactions.${s}`, s)}</option>
              ))}
            </select>
            <label>{t('pages.transactions.type')}</label>
            <select
              value={tempFilters.type}
              onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })}
            >
              <option value="">{t('common.all')}</option>
              {filterOptions.types.map((type) => (
                <option key={type} value={type}>{t(`pages.transactions.${type}`, type)}</option>
              ))}
            </select>
            <label>{t('pages.activity.date_from')}</label>
            <input
              type="date"
              value={tempFilters.date_from}
              onChange={(e) => setTempFilters({ ...tempFilters, date_from: e.target.value })}
            />
            <label>{t('pages.activity.date_to')}</label>
            <input
              type="date"
              value={tempFilters.date_to}
              onChange={(e) => setTempFilters({ ...tempFilters, date_to: e.target.value })}
            />
            <label>{t('pages.transactions.payment_amount', 'Amount Min')}</label>
            <input
              type="number"
              value={tempFilters.amount_min}
              onChange={(e) => setTempFilters({ ...tempFilters, amount_min: e.target.value })}
            />
            <label>{t('pages.transactions.payment_amount', 'Amount Max')}</label>
            <input
              type="number"
              value={tempFilters.amount_max}
              onChange={(e) => setTempFilters({ ...tempFilters, amount_max: e.target.value })}
            />
            <div className="modal-actions">
              <button onClick={handleFilterApply}>{t('common.apply')}</button>
              <button onClick={handleFilterClear}>{t('common.clear')}</button>
              <button onClick={() => setShowFilterModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showLookUpModal && (
        <div className="modal" onClick={() => setShowLookUpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.look_up_title')}</h2>
            <label>{t('pages.transactions.look_up_type')}</label>
            <select value={lookUpType} onChange={(e) => {
              setLookUpType(e.target.value);
              setLookUpField(e.target.value === 'immediate' ? 'transaction_id' : 'customer_name');
              setLookUpValue('');
              setLookUpError('');
            }}>
              <option value="immediate">{t('pages.transactions.immediate')}</option>
              <option value="deferred">{t('pages.transactions.deferred')}</option>
            </select>
            {lookUpType === 'immediate' ? (
              <>
                <label>{t('pages.transactions.look_up_id')}</label>
                <input
                  type="text"
                  value={lookUpValue}
                  onChange={(e) => setLookUpValue(e.target.value)}
                  placeholder={t('pages.transactions.look_up_id')}
                />
              </>
            ) : (
              <>
                <label>{t('pages.transactions.look_up_field')}</label>
                <select value={lookUpField} onChange={(e) => setLookUpField(e.target.value)}>
                  <option value="customer_name">{t('pages.transactions.customer_name')}</option>
                  <option value="customer_phone">{t('pages.transactions.customer_phone')}</option>
                  <option value="customer_email">{t('pages.transactions.customer_email')}</option>
                  <option value="customer_address">{t('pages.transactions.customer_address')}</option>
                </select>
                <label>{t('pages.transactions.look_up_value')}</label>
                <input
                  type="text"
                  value={lookUpValue}
                  onChange={(e) => setLookUpValue(e.target.value)}
                  placeholder={t('pages.transactions.look_up_value')}
                />
              </>
            )}
            {lookUpError && <p className="error-text">{lookUpError}</p>}
            <div className="modal-actions">
              <button onClick={handleLookUp}>{t('common.search', 'Search')}</button>
              <button onClick={() => setShowLookUpModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showDeferredModal && deferredDetails && (
        <div className="modal" onClick={() => setShowDeferredModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.deferred_title')}</h2>
            <p><strong>{t('pages.transactions.customer_name')}:</strong> {deferredDetails.customer_name}</p>
            <p><strong>{t('pages.transactions.customer_phone')}:</strong> {deferredDetails.customer_phone}</p>
            <p><strong>{t('pages.transactions.customer_email')}:</strong> {deferredDetails.customer_email}</p>
            <p><strong>{t('pages.transactions.customer_address')}:</strong> {deferredDetails.customer_address}</p>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowDeferredModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showTodayTransactionsModal && (
        <div className="modal" onClick={() => setShowTodayTransactionsModal(false)}>
          <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
            <h2>{t('pages.transactions.today_title')}</h2>
            <div className="payments-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('pages.transactions.date')}</th>
                    <th>{t('pages.transactions.type')}</th>
                    <th>{t('pages.transactions.total')}</th>
                    <th>{t('pages.transactions.paid')}</th>
                    <th>{t('pages.transactions.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString()}</td>
                      <td>{t('pages.transactions.' + tx.type)}</td>
                      <td>{formatCurrency(tx.total_amount)}</td>
                      <td>{formatCurrency(tx.paid_amount)}</td>
                      <td><span className={`status ${tx.status}`}>{t(`pages.transactions.${tx.status}`)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {t('pages.transactions.today_total')}: {formatCurrency(todayTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0))}
            </div>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowTodayTransactionsModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
