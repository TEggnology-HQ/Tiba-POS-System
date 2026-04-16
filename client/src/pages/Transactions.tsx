import { useState, useEffect } from 'react';
import api from '../lib/api';

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

  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ payment_method: 'cash', amount: '' });

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
        setLookUpError('Please enter a Transaction ID');
        return;
      }
      const res = await api.get(`/transactions/${lookUpValue}`);
      if (res.data && res.data.id) {
        setTransactions([res.data]);
        setShowLookUpModal(false);
      } else {
        setLookUpError('Could not find the transaction for that ID');
      }
    } else {
      if (!lookUpField || !lookUpValue) {
        setLookUpError('Please select a field and enter a search value');
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
        setLookUpError('Could not find any deferred transactions with that information');
      }
    }
  };

  const handleDeferredClick = async () => {
    if (!selectedTransaction) return;
    const res = await api.get(`/transactions/deferred/${selectedTransaction.id}`);
    setDeferredDetails(res.data);
    setShowDeferredModal(true);
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
      alert(`Amount exceeds remaining balance of ₱${remaining.toFixed(2)}`);
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
        <h1>Transactions</h1>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr
                key={t.id}
                className={selectedTransaction?.id === t.id ? 'selected' : ''}
                onClick={() => handleRowClick(t)}
              >
                <td>{new Date(t.created_at).toLocaleString()}</td>
                <td>{t.type}</td>
                <td>₱{Number(t.total_amount).toFixed(2)}</td>
                <td>₱{Number(t.paid_amount).toFixed(2)}</td>
                <td><span className={`status ${t.status}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pinned-panel pinned-panel-fixed">
        <div className="pinned-field">
          <label>Transaction ID</label>
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
          Edit Status
        </button>
        <button
          className="pinned-btn"
          disabled={!selectedTransaction}
          onClick={handleProductsClick}
        >
          Products
        </button>
        <button
          className="pinned-btn"
          disabled={!selectedTransaction}
          onClick={handlePaymentsClick}
        >
          Payments
        </button>
        <button
          className="pinned-btn"
          onClick={openFilterModal}
        >
          Filter
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
          Look Up
        </button>
        <button
          className="pinned-btn"
          disabled={!selectedTransaction || selectedTransaction.type !== 'deferred'}
          onClick={handleDeferredClick}
        >
          Deferred Details
        </button>
      </div>

      {showEditStatusModal && selectedTransaction && (
        <div className="modal" onClick={() => setShowEditStatusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Status</h2>
            <p><strong>Transaction ID:</strong> {selectedTransaction.id}</p>
            <select value={editStatusValue} onChange={(e) => setEditStatusValue(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <div className="modal-actions">
              <button onClick={handleEditStatus}>Confirm</button>
              <button onClick={() => setShowEditStatusModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showProductsModal && (
        <div className="modal" onClick={() => setShowProductsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Products</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.product_name}</td>
                    <td>{p.quantity}</td>
                    <td>₱{Number(p.unit_price).toFixed(2)}</td>
                    <td>₱{(p.quantity * p.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowProductsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentsModal && (
        <div className="modal" onClick={() => setShowPaymentsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Payments</h2>
            <div className="payments-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleString()}</td>
                      <td>₱{Number(p.amount).toFixed(2)}</td>
                      <td>{p.payment_method}</td>
                      <td>{p.payment_type}</td>
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
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="digital">Digital</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn-confirm" onClick={handleAddPayment}>Confirm</button>
                  <button className="btn-cancel" onClick={() => {
                    setShowAddPaymentForm(false);
                    setNewPayment({ payment_method: 'cash', amount: '' });
                  }}>Cancel</button>
                </div>
              </div>
            )}
            <div className="modal-actions">
              {selectedTransaction?.status !== 'completed' && !showAddPaymentForm && (
                <button onClick={() => setShowAddPaymentForm(true)}>Add Payment</button>
              )}
              <button className="btn-close" onClick={() => setShowPaymentsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="modal" onClick={() => setShowFilterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Filter Transactions</h2>
            <label>Status</label>
            <select
              value={tempFilters.status}
              onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}
            >
              <option value="">All</option>
              {filterOptions.statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label>Type</label>
            <select
              value={tempFilters.type}
              onChange={(e) => setTempFilters({ ...tempFilters, type: e.target.value })}
            >
              <option value="">All</option>
              {filterOptions.types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label>Date From</label>
            <input
              type="date"
              value={tempFilters.date_from}
              onChange={(e) => setTempFilters({ ...tempFilters, date_from: e.target.value })}
            />
            <label>Date To</label>
            <input
              type="date"
              value={tempFilters.date_to}
              onChange={(e) => setTempFilters({ ...tempFilters, date_to: e.target.value })}
            />
            <label>Amount Min</label>
            <input
              type="number"
              value={tempFilters.amount_min}
              onChange={(e) => setTempFilters({ ...tempFilters, amount_min: e.target.value })}
            />
            <label>Amount Max</label>
            <input
              type="number"
              value={tempFilters.amount_max}
              onChange={(e) => setTempFilters({ ...tempFilters, amount_max: e.target.value })}
            />
            <div className="modal-actions">
              <button onClick={handleFilterApply}>Apply</button>
              <button onClick={handleFilterClear}>Clear</button>
              <button onClick={() => setShowFilterModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showLookUpModal && (
        <div className="modal" onClick={() => setShowLookUpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Look Up Transaction</h2>
            <label>Type</label>
            <select value={lookUpType} onChange={(e) => {
              setLookUpType(e.target.value);
              setLookUpField(e.target.value === 'immediate' ? 'transaction_id' : 'customer_name');
              setLookUpValue('');
              setLookUpError('');
            }}>
              <option value="immediate">Immediate</option>
              <option value="deferred">Deferred</option>
            </select>
            {lookUpType === 'immediate' ? (
              <>
                <label>Transaction ID</label>
                <input
                  type="text"
                  value={lookUpValue}
                  onChange={(e) => setLookUpValue(e.target.value)}
                  placeholder="Enter Transaction ID"
                />
              </>
            ) : (
              <>
                <label>Search By</label>
                <select value={lookUpField} onChange={(e) => setLookUpField(e.target.value)}>
                  <option value="customer_name">Customer Name</option>
                  <option value="customer_phone">Customer Phone</option>
                  <option value="customer_email">Customer Email</option>
                  <option value="customer_address">Customer Address</option>
                </select>
                <label>Search Value</label>
                <input
                  type="text"
                  value={lookUpValue}
                  onChange={(e) => setLookUpValue(e.target.value)}
                  placeholder="Enter search value"
                />
              </>
            )}
            {lookUpError && <p className="error-text">{lookUpError}</p>}
            <div className="modal-actions">
              <button onClick={handleLookUp}>Search</button>
              <button onClick={() => setShowLookUpModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeferredModal && deferredDetails && (
        <div className="modal" onClick={() => setShowDeferredModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Deferred Details</h2>
            <p><strong>Customer Name:</strong> {deferredDetails.customer_name}</p>
            <p><strong>Customer Phone:</strong> {deferredDetails.customer_phone}</p>
            <p><strong>Customer Email:</strong> {deferredDetails.customer_email}</p>
            <p><strong>Customer Address:</strong> {deferredDetails.customer_address}</p>
            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowDeferredModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}