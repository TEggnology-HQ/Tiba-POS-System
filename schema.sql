-- Lookup tables (SMALLSERIAL)
CREATE TABLE product_status (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE storage_state (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE transaction_type (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE transaction_status (
    id SMALLSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Prepopulate lookup tables
INSERT INTO product_status (name) VALUES ('listed'), ('offsale');
INSERT INTO storage_state (name) VALUES ('onsale'), ('offsale'), ('sold');
INSERT INTO transaction_type (name) VALUES ('immediate'), ('deferred');
INSERT INTO transaction_status (name) VALUES ('pending'), ('completed'), ('cancelled'), ('refunded');

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cashier', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product types (uses product_status via SMALLINT)
CREATE TABLE product_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    barcode TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    status_id SMALLINT NOT NULL REFERENCES product_status(id) DEFAULT 1
);

-- Storage (uses storage_state via SMALLINT)
CREATE TABLE storage (
    id BIGSERIAL PRIMARY KEY,
    product_type_id BIGINT NOT NULL REFERENCES product_types(id),
    entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    expire_date TIMESTAMPTZ,
    state_id SMALLINT NOT NULL REFERENCES storage_state(id) DEFAULT 1
);

-- Transactions (uses transaction_type and transaction_status via SMALLINT)
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    cashier_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_amount NUMERIC(12,2) NOT NULL,
    type SMALLINT NOT NULL REFERENCES transaction_type(id),
    status SMALLINT NOT NULL REFERENCES transaction_status(id)
);

-- Transaction items
CREATE TABLE transaction_items (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_type_id BIGINT NOT NULL REFERENCES product_types(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL
);

-- Deferred payments
CREATE TABLE deferred (
    transaction_id BIGINT PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE payments (
    payment_id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    cashier_id BIGINT REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount <> 0),
    payment_method TEXT CHECK (payment_method IN ('cash','card','digital')),
    payment_type TEXT DEFAULT 'payment'
    CHECK (payment_type IN ('payment','refund')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id BIGINT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_storage_product_type ON storage(product_type_id);
CREATE INDEX idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);