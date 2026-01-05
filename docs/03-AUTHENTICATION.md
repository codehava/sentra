# Authentication - SENTRA

## Overview

SENTRA menggunakan **custom authentication** dengan password hash (bcrypt) yang disimpan langsung di database PostgreSQL. Ini berbeda dari Supabase Auth standar.

## Login Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   User      │      │   Frontend  │      │  Database   │
│  (Browser)  │      │   (React)   │      │ (Supabase)  │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │  1. Enter NIP +    │                    │
       │     Password       │                    │
       │───────────────────►│                    │
       │                    │                    │
       │                    │  2. RPC: login_user│
       │                    │───────────────────►│
       │                    │                    │
       │                    │  3. Verify hash &  │
       │                    │     return user    │
       │                    │◄───────────────────│
       │                    │                    │
       │  4. Store in       │                    │
       │     Zustand +      │                    │
       │     localStorage   │                    │
       │◄───────────────────│                    │
       │                    │                    │
       │  5. Check          │                    │
       │     must_change_   │                    │
       │     password       │                    │
       │───────────────────►│                    │
       │                    │                    │
       │  6a. Redirect to   │                    │
       │      Dashboard     │                    │
       │  OR                │                    │
       │  6b. Redirect to   │                    │
       │      Change Pwd    │                    │
       │◄───────────────────│                    │
```

## Password Management

### Default Password Format

Saat user baru dibuat, default password adalah:
```
Sentra@{NIP}
```

Contoh:
| NIP | Default Password |
|-----|------------------|
| ADMIN | Sentra@ADMIN |
| MAKER001 | Sentra@MAKER001 |
| john.doe | Sentra@john.doe |

### Password Hashing

Password di-hash menggunakan **bcrypt** via PostgreSQL `pgcrypto` extension:

```sql
-- Hash password
SELECT crypt('password123', gen_salt('bf', 8));

-- Verify password
SELECT (stored_hash = crypt('password123', stored_hash));
```

### Force Password Change

Flag `must_change_password` di tabel `users`:
- `TRUE` = User harus ganti password saat login
- `FALSE` = User bisa langsung masuk

Flow:
1. Admin buat user → `must_change_password = TRUE`
2. User login → Redirect ke `/change-password`
3. User ganti password → `must_change_password = FALSE`
4. Login berikutnya → Langsung ke Dashboard

## API Functions

### `loginWithNip(nip, password)`

```typescript
// Returns
{
  user: {
    id: string;
    nip: string;
    fullName: string;
    email: string;
    role: { id, code, name };
    isActive: boolean;
  },
  needsPasswordChange: boolean;
}
```

### `changePassword(userId, newPassword)`

```typescript
// Returns
boolean // true if successful
```

### `adminSetPassword(userId, newPassword)`

Admin use only - resets password dan set `must_change_password = TRUE`.

## Auth Store (Zustand)

```typescript
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}
```

Data disimpan di:
- Memory (Zustand state)
- localStorage (persist across refresh)

## Protected Routes

```tsx
<ProtectedRoute>
  <Component />
</ProtectedRoute>

<ProtectedRoute allowedRoles={['ADMIN']}>
  <AdminComponent />
</ProtectedRoute>
```

## Session Persistence

Session disimpan di localStorage:
```json
{
  "auth-storage": {
    "state": {
      "user": { ... },
      "token": "...",
      "isAuthenticated": true
    }
  }
}
```
