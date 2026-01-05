# Architecture - SENTRA

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React     │  │   Zustand   │  │   TanStack Query    │  │
│  │  Components │  │    Store    │  │   (Data Fetching)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Client                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Database  │  │   Storage   │  │    RPC Functions    │  │
│  │   Queries   │  │   (Files)   │  │  (Auth, Business)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │   Storage   │  │   Edge Functions    │  │
│  │  Database   │  │   Buckets   │  │     (Optional)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
sentra-app/
├── docs/                    # Documentation
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Auth-related components
│   │   ├── layout/         # Layout components (sidebar, header)
│   │   └── ui/             # shadcn/ui components
│   ├── features/           # Feature modules
│   │   ├── admin/          # Admin pages (users, config)
│   │   ├── auth/           # Login, change password
│   │   ├── dashboard/      # Dashboard page
│   │   ├── reports/        # Reports page
│   │   └── transactions/   # Transaction CRUD
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configs
│   │   ├── supabase.ts     # Supabase client
│   │   └── utils.ts        # Helper functions
│   ├── routes/             # React Router config
│   ├── services/           # API service functions
│   ├── stores/             # Zustand stores
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # SQL migration files
└── package.json
```

## Key Modules

### Services Layer (`src/services/`)

| Service | Purpose |
|---------|---------|
| `auth.service.ts` | Login, logout, password management |
| `users.service.ts` | User CRUD, reset password |
| `transactions.service.ts` | Transaction CRUD, approval workflow |
| `fields.service.ts` | Field master management |
| `routing.service.ts` | Routing matrix configuration |
| `notifications.service.ts` | User notifications |
| `dashboard.service.ts` | Dashboard statistics |

### State Management (`src/stores/`)

| Store | Purpose |
|-------|---------|
| `auth-store.ts` | User session, login state |

### Feature Modules (`src/features/`)

| Module | Pages |
|--------|-------|
| `auth` | LoginPage, ChangePasswordPage |
| `dashboard` | DashboardPage |
| `transactions` | CreateTransaction, MyTasks, MyTickets, ProcessTransaction |
| `admin` | Users, Fields, Routing, SLA, Branches, Stages, etc. |
| `reports` | ReportsPage |

## Data Flow

```
User Action
    │
    ▼
React Component
    │
    ├──▶ Zustand Store (local state)
    │
    └──▶ TanStack Query
            │
            ▼
        Service Function
            │
            ▼
        Supabase Client
            │
            ├──▶ Database Query
            ├──▶ RPC Function
            └──▶ Storage Operation
```

## Security Model

1. **Authentication**: Custom bcrypt password hashing stored in database
2. **Authorization**: Role-based access control (ADMIN, MAKER, APPROVER)
3. **Route Protection**: ProtectedRoute component checks auth state
4. **API Security**: Supabase RLS policies (recommended for production)
