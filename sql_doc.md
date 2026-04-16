# POS Database Schema Documentation

## Tables

### product_status
Lookup table for product status (SMALLSERIAL).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SMALLSERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | TEXT | NOT NULL, UNIQUE | Status name ('listed', 'offsale') |

### storage_state
Lookup table for storage item state (SMALLSERIAL).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SMALLSERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | TEXT | NOT NULL, UNIQUE | State name ('onsale', 'offsale', 'sold') |

### transaction_type
Lookup table for transaction type (SMALLSERIAL).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SMALLSERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | TEXT | NOT NULL, UNIQUE | Type name ('immediate', 'deferred') |

### transaction_status
Lookup table for transaction status (SMALLSERIAL).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SMALLSERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | TEXT | NOT NULL, UNIQUE | Status name ('pending', 'completed', 'cancelled', 'refunded') |

### users
Stores system users (cashiers and admins).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| username | TEXT | NOT NULL, UNIQUE | User's login name |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| role | TEXT | NOT NULL, CHECK ('cashier','admin') | User role |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK ('active','inactive') | Account status |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |

### product_types
Catalog of products available for sale.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| name | TEXT | NOT NULL | Product name |
| price | NUMERIC(12,2) | NOT NULL | Product price |
| barcode | TEXT | UNIQUE | Product barcode |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last update timestamp |
| status_id | SMALLINT | NOT NULL, REFERENCES product_status(id), DEFAULT 1 | Link to product_status table |

### storage
Inventory tracking for individual product items (e.g., each item with its own expiry).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| product_type_id | BIGINT | NOT NULL, REFERENCES product_types(id) | Link to product type |
| entry_date | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Date item was entered |
| expire_date | TIMESTAMPTZ | | Expiration date (nullable) |
| state_id | SMALLINT | NOT NULL, REFERENCES storage_state(id), DEFAULT 1 | Link to storage_state table |

### transactions
Main transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| cashier_id | BIGINT | REFERENCES users(id) | Cashier who processed transaction |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update timestamp |
| paid_amount | NUMERIC(12,2) | NOT NULL, DEFAULT 0 | Amount paid by customer |
| total_amount | NUMERIC(12,2) | NOT NULL | Total transaction amount |
| type | SMALLINT | NOT NULL, REFERENCES transaction_type(id) | Link to transaction_type table |
| status | SMALLINT | NOT NULL, REFERENCES transaction_status(id) | Link to transaction_status table |

### transaction_items
Line items within a transaction.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| transaction_id | BIGINT | NOT NULL, REFERENCES transactions(id), ON DELETE CASCADE | Link to transaction |
| product_type_id | BIGINT | NOT NULL, REFERENCES product_types(id) | Link to product type |
| product_name | TEXT | NOT NULL | Product name at time of sale |
| quantity | INTEGER | NOT NULL, CHECK (quantity > 0) | Quantity purchased |
| unit_price | NUMERIC(12,2) | NOT NULL | Unit price at time of sale |

### deferred
Deferred payment details (for credit/sales on account).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| transaction_id | BIGINT | PRIMARY KEY, REFERENCES transactions(id), ON DELETE CASCADE | Link to transaction |
| customer_name | TEXT | NOT NULL | Customer's name |
| customer_phone | TEXT | NOT NULL | Customer's phone |
| customer_email | TEXT | | Customer's email (nullable) |
| customer_address | TEXT | | Customer's address (nullable) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

### payments
Payment records for transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| payment_id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| transaction_id | BIGINT | NOT NULL, REFERENCES transactions(id), ON DELETE CASCADE | Link to transaction |
| cashier_id | BIGINT | REFERENCES users(id) | Cashier who processed payment |
| amount | NUMERIC(12,2) | NOT NULL, CHECK (amount <> 0) | Payment amount |
| payment_method | TEXT | CHECK ('cash','card','digital') | Payment method |
| payment_type | TEXT | DEFAULT 'payment', CHECK ('payment','refund') | Payment type |
| created_at | TIMESTAMPTZ | DEFAULT now() | Creation timestamp |

### activity_log
Audit log for tracking user actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing ID |
| user_id | BIGINT | REFERENCES users(id) | User who performed action |
| action | TEXT | NOT NULL | Action performed |
| table_name | TEXT | NOT NULL | Table affected |
| record_id | BIGINT | | ID of affected record |
| details | JSONB | | Additional details |
| created_at | TIMESTAMPTZ | DEFAULT now() | Timestamp of action |

## Indexes

- `idx_storage_product_type` - storage(product_type_id)
- `idx_transaction_items_transaction_id` - transaction_items(transaction_id)
- `idx_transactions_type` - transactions(type)
- `idx_transactions_status` - transactions(status)
- `idx_payments_transaction_id` - payments(transaction_id)
- `idx_activity_log_user_id` - activity_log(user_id)
- `idx_activity_log_created_at` - activity_log(created_at)