# Technology Stack Documentation

## Overview

This POS (Point of Sale) system is built with a modern JavaScript/TypeScript stack consisting of a React frontend, Express backend, and PostgreSQL database.

---

## Frontend (client)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^18.2.0 | UI framework |
| React Router DOM | ^6.20.0 | Client-side routing |
| Axios | ^1.6.2 | HTTP client |
| Vite | ^5.0.8 | Build tool & dev server |
| TypeScript | ^5.3.2 | Type safety |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## Backend (server)

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | ^4.18.2 | Web framework |
| pg | ^8.11.3 | PostgreSQL driver |
| bcrypt | ^5.1.1 | Password hashing |
| jsonwebtoken | ^9.0.2 | JWT authentication |
| zod | ^3.22.4 | Schema validation |
| TypeScript | ^5.3.2 | Type safety |
| tsx | ^4.6.0 | TypeScript execution |

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with watch mode |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled production build |

---

## Database

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | - | Relational database |

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client   │────▶│   Server   │────▶│  Database   │
│  (React)   │     │ (Express)  │     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
```

- **Client**: Single-page application built with React and Vite
- **Server**: REST API built with Express and TypeScript
- **Database**: PostgreSQL with schema defined in `schema.sql`