# Database Schema - SENTRA

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   roles     │       │     users        │       │ user_branches   │
├─────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)     │◄──────│ role_id (FK)     │       │ user_id (FK)    │
│ code        │       │ id (PK)          │◄──────│ branch_id (FK)  │
│ name        │       │ nip              │       └─────────────────┘
│ description │       │ full_name        │               │
└─────────────┘       │ email            │               │
                      │ password_hash    │               ▼
                      │ must_change_pwd  │       ┌─────────────────┐
                      │ is_active        │       │   branches      │
                      └──────────────────┘       ├─────────────────┤
                              │                  │ id (PK)         │
                              │                  │ code            │
                              ▼                  │ name            │
┌──────────────────────────────────────┐         └─────────────────┘
│           transactions               │
├──────────────────────────────────────┤
│ id (PK)                              │◄────┐
│ ticket_number                        │     │
│ transaction_type_id (FK)─────────────┼──┐  │
│ form_data (JSONB)                    │  │  │
│ documents (JSONB)                    │  │  │
│ current_stage                        │  │  │
│ status                               │  │  │
│ created_by (FK) ─────────────────────┼──┼──┼──► users
│ branch_id (FK) ──────────────────────┼──┼──┼──► branches
│ sla_deadline                         │  │  │
└──────────────────────────────────────┘  │  │
                                          │  │
┌──────────────────────────────────────┐  │  │
│       transaction_types              │◄─┘  │
├──────────────────────────────────────┤     │
│ id (PK)                              │     │
│ code                                 │     │
│ name                                 │     │
│ icon                                 │     │
│ description                          │     │
│ is_active                            │     │
└──────────────────────────────────────┘     │
        │                                    │
        ▼                                    │
┌──────────────────────────────────────┐     │
│         routing_matrix               │     │
├──────────────────────────────────────┤     │
│ id (PK)                              │     │
│ transaction_type_id (FK)             │     │
│ stage_code                           │     │
│ stage_order                          │     │
│ assigned_role_id (FK) ───────────────┼──── ► roles
│ can_approve                          │     │
│ can_reject                           │     │
│ can_return                           │     │
└──────────────────────────────────────┘     │
                                             │
┌──────────────────────────────────────┐     │
│       transaction_history            │     │
├──────────────────────────────────────┤     │
│ id (PK)                              │     │
│ transaction_id (FK) ─────────────────┼─────┘
│ action                               │
│ from_stage / to_stage                │
│ performed_by (FK) ───────────────────┼───► users
│ notes                                │
│ created_at                           │
└──────────────────────────────────────┘
```

## Tables

### Core Tables

| Table | Description |
|-------|-------------|
| `roles` | User roles (ADMIN, MAKER, APPROVER) |
| `users` | User accounts with password hash |
| `branches` | Office branches |
| `user_branches` | User-branch assignments |
| `transactions` | Main transaction records |
| `transaction_types` | Types of transactions |
| `transaction_history` | Audit trail of actions |

### Configuration Tables

| Table | Description |
|-------|-------------|
| `field_master` | Dynamic form field definitions |
| `field_access` | Field visibility/editability per role & stage |
| `routing_matrix` | Workflow stages per transaction type |
| `sla_config` | SLA duration per transaction type |
| `stage_definitions` | Available stage codes |
| `unique_field_values` | Tracking unique field values |

## Key Functions

### Authentication Functions

```sql
-- Login with NIP and password
login_user(p_nip VARCHAR, p_password VARCHAR)
  RETURNS TABLE(user_id, nip, full_name, email, role_id, role_code, 
                role_name, is_active, password_needs_change)

-- Change user password
change_user_password(p_user_id UUID, p_new_password VARCHAR)
  RETURNS BOOLEAN

-- Admin set/reset password
admin_set_password(p_user_id UUID, p_new_password VARCHAR)
  RETURNS BOOLEAN

-- Hash password (internal)
hash_password(plain_password VARCHAR)
  RETURNS VARCHAR

-- Verify password (internal)
verify_password(plain_password VARCHAR, hashed_password VARCHAR)
  RETURNS BOOLEAN
```

### Business Logic Functions

```sql
-- Generate ticket number with prefix
generate_ticket_number(type_code VARCHAR)
  RETURNS VARCHAR
  -- Format: {TYPE_CODE}-{YYYYMMDD}-{SEQUENCE}
  -- Example: BU-20260105-0001

-- Check unique field value
check_unique_field_value(
  p_field_code VARCHAR,
  p_field_value VARCHAR,
  p_transaction_type_id INTEGER,
  p_exclude_transaction_id UUID DEFAULT NULL
)
  RETURNS BOOLEAN
```

## Migrations

Run in order:

1. `001_initial_schema.sql` - Base tables and functions
2. `002_field_master_seeder.sql` - Default field definitions
3. `003_branches_stages_statements.sql` - Branches and stages
4. `004_unique_fields_ticket_prefix.sql` - Unique validation & ticket prefix
5. `005_user_password_management.sql` - Password hashing
6. `006_must_change_password.sql` - Force password change flag
