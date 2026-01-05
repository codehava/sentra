# Deployment Guide - SENTRA

## Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (for deployment)

---

## Environment Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy credentials:
   - Project URL
   - Anon Key
   - Service Role Key (for migrations)

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Setup

### Run Migrations

In Supabase SQL Editor, run migrations in order:

1. `001_initial_schema.sql`
2. `002_field_master_seeder.sql`
3. `003_branches_stages_statements.sql`
4. `004_unique_fields_ticket_prefix.sql`
5. `005_user_password_management.sql`
6. `006_must_change_password.sql`

### Seed Data (Optional)

```sql
-- Create admin user
INSERT INTO users (nip, full_name, email, role_id, is_active)
VALUES ('ADMIN', 'Administrator', 'admin@company.com', 1, true);

-- Set password
SELECT admin_set_password(
  (SELECT id FROM users WHERE nip = 'ADMIN'),
  'Sentra@ADMIN'
);
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

App runs at `http://localhost:5173`

---

## Production Build

```bash
# Build
npm run build

# Preview build
npm run preview
```

Build output: `dist/`

---

## Deploy to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Vercel Configuration

`vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

---

## Environment Variables (Production)

Set in Vercel dashboard:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

---

## Security Checklist

### Before Go-Live

- [ ] Change all default passwords
- [ ] Enable Supabase RLS policies
- [ ] Remove demo accounts
- [ ] Enable HTTPS
- [ ] Configure CORS in Supabase
- [ ] Set up database backups
- [ ] Enable audit logging

### Recommended RLS Policies

```sql
-- Users can only see active users
CREATE POLICY "Users read active"
ON users FOR SELECT
USING (is_active = true);

-- Users can only update themselves
CREATE POLICY "Users update own"
ON users FOR UPDATE
USING (auth.uid()::text = id::text);
```

---

## Monitoring

### Supabase Dashboard

- Database queries
- API requests
- Storage usage
- Auth logs

### Application Logs

Browser console untuk frontend errors.

---

## Troubleshooting

### Login Not Working

1. Check Supabase connection
2. Verify migrations ran successfully
3. Check user has password_hash set
4. Clear browser cache

### Build Errors

```bash
# Clear cache
rm -rf node_modules/.vite
npm run build
```

### Database Connection

Test Supabase connection:
```typescript
const { data, error } = await supabase.from('users').select('id').limit(1);
console.log({ data, error });
```
