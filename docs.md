# POS System Documentation

## Project Overview

A Point of Sale (POS) web application for LAN usage, built with TypeScript on both frontend and backend.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite
- **Database**: PostgreSQL

## Project Structure

```
/POS
├── schema.sql          # Database schema
├── sql_doc.md          # Database documentation
├── server/             # Backend API
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts           # Express app entry point
│       ├── db/index.ts        # PostgreSQL connection
│       ├── types/index.ts    # TypeScript interfaces
│       └── routes/
│           ├── auth.ts        # Login/register
│           ├── products.ts    # Product CRUD
│           ├── transactions.ts # Transaction operations
│           ├── payments.ts    # Payment processing
│           └── activity.ts    # Activity logging
└── client/             # React frontend
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx           # React entry
        ├── App.tsx            # Main app with routing
        ├── index.css          # Global styles
        ├── lib/api.ts         # Axios with interceptors
        └── pages/
            ├── Login.tsx      # Login page
            ├── POS.tsx        # POS terminal
            ├── Transactions.tsx # Transaction history
            └── Products.tsx   # Product management
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List all transactions |
| GET | `/api/transactions/:id` | Get transaction with items |
| POST | `/api/transactions` | Create transaction |
| PATCH | `/api/transactions/:id/status` | Update transaction status |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | List all payments |
| GET | `/api/payments/transaction/:id` | Get payments for transaction |
| POST | `/api/payments` | Create payment |

### Activity
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity` | List activity logs |
| POST | `/api/activity` | Create activity log |

## Database Schema

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| username | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| role | TEXT | NOT NULL, CHECK ('cashier','admin') |
| status | TEXT | NOT NULL, DEFAULT 'active' |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### product_types
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| name | TEXT | NOT NULL |
| price | NUMERIC(12,2) | NOT NULL |
| barcode | TEXT | UNIQUE |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| status | TEXT | NOT NULL, DEFAULT 'listed' |

### storage
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| product_type_id | BIGINT | REFERENCES product_types(id) |
| entry_date | TIMESTAMPTZ | DEFAULT now() |
| expire_date | TIMESTAMPTZ | |

### transactions
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| cashier_id | BIGINT | REFERENCES users(id) |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| total_amount | NUMERIC(12,2) | NOT NULL |
| type | TEXT | CHECK ('immediate','deferred') |
| status | TEXT | DEFAULT 'pending' |

### transaction_items
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| transaction_id | BIGINT | REFERENCES transactions(id) |
| product_type_id | BIGINT | REFERENCES product_types(id) |
| product_name | TEXT | NOT NULL |
| quantity | INTEGER | NOT NULL |
| unit_price | NUMERIC(12,2) | NOT NULL |

### deferred
| Column | Type | Constraints |
|--------|------|-------------|
| transaction_id | BIGINT | PRIMARY KEY |
| customer_name | TEXT | NOT NULL |
| customer_phone | TEXT | NOT NULL |
| customer_email | TEXT | |
| customer_address | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### payments
| Column | Type | Constraints |
|--------|------|-------------|
| payment_id | BIGSERIAL | PRIMARY KEY |
| transaction_id | BIGINT | REFERENCES transactions(id) |
| cashier_id | BIGINT | REFERENCES users(id) |
| amount | NUMERIC(12,2) | NOT NULL |
| payment_method | TEXT | CHECK ('cash','card','digital') |
| payment_type | TEXT | DEFAULT 'payment' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### activity_log
| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGSERIAL | PRIMARY KEY |
| user_id | BIGINT | REFERENCES users(id) |
| action | TEXT | NOT NULL |
| table_name | TEXT | NOT NULL |
| record_id | BIGINT | |
| details | JSONB | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

## Setup Instructions

### 1. Database Setup

Create PostgreSQL database and run schema:

```bash
psql -U postgres -c "CREATE DATABASE pos;"
psql -U postgres -d pos -f schema.sql
```

### 2. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

Server runs on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:3000`

## User Roles

### Cashier
- Process transactions
- View transaction history
- Cannot add/edit/delete products

### Admin
- All cashier permissions
- Add/edit/delete products
- Update transaction status

## Transaction Flow

1. Cashier logs in
2. Selects products to add to cart
3. Chooses transaction type:
   - **Immediate**: Pay now with cash/card/digital
   - **Deferred**: Create account/sale for later payment
4. Completes transaction
5. Transaction status can be updated by admin

## Activity Log

All user actions are logged to `activity_log` table with:
- User ID
- Action performed
- Table affected
- Record ID
- Additional details (JSONB)
