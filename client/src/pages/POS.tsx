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
  storage_count: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function POS() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [transactionType, setTransactionType] = useState<'immediate' | 'deferred'>('immediate');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const res = await api.get('/products');
    setProducts(res.data);
  };

  const getRemainingQuantity = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    const cartItem = cart.find(item => item.product.id === productId);
    const inCart = cartItem ? cartItem.quantity : 0;
    return product.storage_count - inCart;
  };

  const addToCart = (product: Product) => {
    if (getRemainingQuantity(product.id) <= 0) return;
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (quantity <= 0) {
      removeFromCart(productId);
    } else if (quantity > product.storage_count) {
      return;
    } else {
      setCart(cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const change = parseFloat(paidAmount) - total;

  const handleCheckout = async () => {
    try {
      const paid = parseFloat(paidAmount);
      const paidCapped = isNaN(paid) ? 0 : Math.min(paid, total);

      if (transactionType === 'immediate' && (isNaN(paid) || paid < total)) {
        setMessageType('error');
        setMessage(t('pages.pos.insufficient_payment'));
        return;
      }

      const transactionRes = await api.post('/transactions', {
        cashier_id: user?.id,
        total_amount: total,
        type: transactionType,
        items: cart.map((item) => ({
          product_type_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
        })),
        customer: transactionType === 'deferred' ? customer : null,
        paid_amount: paidCapped,
      });

      const transactionId = transactionRes.data.id;

      if (paidCapped > 0) {
        await api.post('/payments', {
          transaction_id: transactionId,
          cashier_id: user?.id,
          amount: paidCapped,
          payment_method: paymentMethod,
        });
      }

      const changeAmount = !isNaN(paid) && paid > total ? paid - total : 0;
      setMessageType('success');
      setMessage(`${t('pages.pos.transaction_completed')}${changeAmount > 0 ? ` ${t('pages.pos.change')}: ${formatCurrency(changeAmount)}` : ''}`);
      setCart([]);
      setPaidAmount('');
      setCustomer({ name: '', phone: '', email: '', address: '' });
      loadProducts();
    } catch {
      setMessageType('error');
      setMessage(t('pages.pos.transaction_failed'));
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  );

  return (
    <div className="pos-page">
      <div className="pos-main">
        <div className="products-panel">
          <input
            type="text"
            placeholder={t('pages.pos.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <div className="products-grid">
            {filteredProducts.map((product) => {
              const remaining = getRemainingQuantity(product.id);
              const isOutOfStock = remaining === 0;
              return (
                <div 
                  key={product.id} 
                  className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`} 
                  onClick={() => addToCart(product)}
                >
                  <div className="product-name">{product.name}</div>
                  <div className="product-price">{formatCurrency(product.price)}</div>
                  <div className="product-stock">x{remaining}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cart-panel">
          <h2>{t('pages.pos.cart')}</h2>
          <div className="cart-items">
            {cart.map((item) => (
              <div key={item.product.id} className="cart-item">
                <div className="item-info">
                  <span className="item-name">{item.product.name}</span>
                  <span className="item-price">{formatCurrency(item.product.price)}</span>
                </div>
                <div className="item-controls">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                  <button className="remove-btn" onClick={() => removeFromCart(item.product.id)}>×</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="total">{t('pages.pos.total')}: {formatCurrency(total)}</div>
            
            <div className="transaction-type">
              <label>
                <input
                  type="radio"
                  checked={transactionType === 'immediate'}
                  onChange={() => setTransactionType('immediate')}
                />
                {t('pages.pos.immediate')}
              </label>
              <label>
                <input
                  type="radio"
                  checked={transactionType === 'deferred'}
                  onChange={() => setTransactionType('deferred')}
                />
                {t('pages.pos.deferred')}
              </label>
            </div>

            {transactionType === 'immediate' ? (
              <>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'digital')}>
                  <option value="cash">{t('pages.pos.cash')}</option>
                  <option value="card">{t('pages.pos.card')}</option>
                  <option value="digital">{t('pages.pos.digital')}</option>
                </select>
                <input
                  type="number"
                  placeholder={t('pages.pos.paid_amount_placeholder')}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
                {paidAmount && <div className="change">{t('pages.pos.change')}: {formatCurrency(change)}</div>}
              </>
            ) : (
              <div className="customer-fields">
                <input
                  type="text"
                  placeholder={t('pages.pos.customer_name')}
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder={t('pages.pos.customer_phone')}
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
                <input
                  type="email"
                  placeholder={t('pages.pos.customer_email')}
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
                <input
                  type="text"
                  placeholder={t('pages.pos.customer_address')}
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                />
              </div>
            )}

            {message && <div className={messageType === 'error' ? 'message-error' : 'message'}>{message}</div>}

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0}
            >
              {t('pages.pos.complete_transaction')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
