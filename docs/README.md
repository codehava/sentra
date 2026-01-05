# SENTRA - Sistem End to End Monitoring Transaksi

## Overview

SENTRA adalah aplikasi web berbasis React/TypeScript untuk monitoring dan manajemen transaksi end-to-end. Aplikasi ini dirancang untuk mengelola workflow transaksi dengan berbagai tahapan (stages), persetujuan multi-level, dan tracking SLA.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui, Tailwind CSS |
| State Management | Zustand, TanStack Query |
| Database | Supabase (PostgreSQL) |
| Authentication | Custom auth dengan bcrypt hash |
| Routing | React Router v6 |

## Key Features

### 1. Transaction Management
- Create transactions dengan dynamic form fields
- Multi-stage workflow dengan routing matrix
- Ticket number generation dengan prefix kode transaksi
- Document upload dan preview
- SLA monitoring

### 2. User Management
- Role-based access control (ADMIN, MAKER, APPROVER)
- Custom authentication dengan NIP + Password
- Default password: `Sentra@{NIP}`
- Force password change pada login pertama
- Admin reset password functionality

### 3. Admin Configuration
- Transaction Types management
- Field Master configuration
- Routing Matrix setup
- Field Access Matrix per role dan stage
- SLA Configuration
- Branch management
- Stage definitions

### 4. Unique Field Validation
- Prevent duplicate entries (e.g., Nomor CL untuk double payment)
- Configurable per field via `is_unique` flag

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run migrations in Supabase SQL Editor (in order):
# 001_initial_schema.sql
# 002_field_master_seeder.sql
# 003_branches_stages_statements.sql
# 004_unique_fields_ticket_prefix.sql
# 005_user_password_management.sql
# 006_must_change_password.sql

# Start development server
npm run dev
```

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./01-ARCHITECTURE.md) | System architecture dan folder structure |
| [Database Schema](./02-DATABASE-SCHEMA.md) | Tabel, relasi, dan functions |
| [Authentication](./03-AUTHENTICATION.md) | Login flow dan password management |
| [User Guide](./04-USER-GUIDE.md) | Panduan penggunaan aplikasi |
| [Admin Guide](./05-ADMIN-GUIDE.md) | Konfigurasi sistem oleh admin |
| [API Reference](./06-API-REFERENCE.md) | Service functions dan RPC calls |
| [Deployment](./07-DEPLOYMENT.md) | Deployment ke production |

## Default Credentials

| Role | NIP | Password |
|------|-----|----------|
| Admin | admin | Sentra@admin |
| Maker | maker | Sentra@maker |
| Approver | approver | Sentra@approver |

> **Note**: Password default harus diganti pada login pertama.

## License

Proprietary - All rights reserved.
