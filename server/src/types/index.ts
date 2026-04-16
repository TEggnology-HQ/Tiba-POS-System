export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: 'cashier' | 'admin';
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface ProductType {
  id: number;
  name: string;
  price: number;
  barcode: string | null;
  created_at: Date;
  updated_at: Date;
  status: 'listed' | 'offsale';
}

export interface Storage {
  id: number;
  product_type_id: number;
  entry_date: Date;
  expire_date: Date | null;
}

export interface Transaction {
  id: number;
  cashier_id: number | null;
  created_at: Date;
  updated_at: Date;
  paid_amount: number;
  total_amount: number;
  type: 'immediate' | 'deferred';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_type_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Deferred {
  transaction_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  created_at: Date;
}

export interface Payment {
  payment_id: number;
  transaction_id: number;
  cashier_id: number | null;
  amount: number;
  payment_method: 'cash' | 'card' | 'digital' | null;
  payment_type: 'payment' | 'refund';
  created_at: Date;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  table_name: string;
  record_id: number | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}
