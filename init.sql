-- Setup Roles
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO user_roles (name) VALUES ('owner'), ('admin'), ('cashier');

-- Setup Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES user_roles(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product Statuses
CREATE TABLE product_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO product_status (name) VALUES ('listed'), ('offsale');

-- Product Types
CREATE TABLE product_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    status_id INTEGER REFERENCES product_status(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Storage States
CREATE TABLE storage_state (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO storage_state (name) VALUES ('onsale'), ('sold'), ('damaged'), ('expired');

-- Storage Items
CREATE TABLE storage (
    id SERIAL PRIMARY KEY,
    product_type_id INTEGER REFERENCES product_types(id),
    entry_date DATE DEFAULT CURRENT_DATE,
    expire_date DATE,
    state_id INTEGER REFERENCES storage_state(id)
);

-- Transaction Types
CREATE TABLE transaction_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO transaction_type (name) VALUES ('immediate'), ('deferred');

-- Transaction Statuses
CREATE TABLE transaction_status (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO transaction_status (name) VALUES ('pending'), ('completed'), ('cancelled'), ('partially_paid');

-- Transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    cashier_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    type INTEGER REFERENCES transaction_type(id),
    status INTEGER REFERENCES transaction_status(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Transaction Items
CREATE TABLE transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    product_type_id INTEGER REFERENCES product_types(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

-- Deferred Payments
CREATE TABLE deferred (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT
);

-- Payments
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    cashier_id INTEGER REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_type VARCHAR(50) DEFAULT 'payment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activity Log
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
