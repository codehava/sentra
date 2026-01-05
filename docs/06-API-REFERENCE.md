# API Reference - SENTRA

## Service Modules

### Auth Service (`auth.service.ts`)

#### `loginWithNip(credentials)`

Login with NIP and password.

```typescript
interface LoginCredentials {
  nip: string;
  password: string;
}

interface LoginResult {
  user: User;
  needsPasswordChange: boolean;
}

await loginWithNip({ nip: 'ADMIN', password: 'Sentra@ADMIN' });
```

#### `changePassword(userId, newPassword)`

Change password for logged-in user.

```typescript
await changePassword('uuid-here', 'newPassword123');
// Returns: boolean
```

#### `logout()`

Clear auth session.

```typescript
await logout();
```

---

### Users Service (`users.service.ts`)

#### `getUsers()`

Get all users with roles.

```typescript
const users = await getUsers();
// Returns: UserWithRole[]
```

#### `createUser(user)`

Create new user with default password.

```typescript
const result = await createUser({
  nip: 'NEW001',
  full_name: 'New User',
  email: 'new@email.com',
  role_id: 2,
  is_active: true
});
// Returns: { ...user, defaultPassword: 'Sentra@NEW001' }
```

#### `updateUser(id, data)`

Update user data.

```typescript
await updateUser('uuid', { full_name: 'Updated Name' });
```

#### `deleteUser(id)`

Delete user.

```typescript
await deleteUser('uuid');
```

#### `resetUserPassword(userId, nip)`

Reset password to default.

```typescript
const result = await resetUserPassword('uuid', 'NIP001');
// Returns: { success: boolean, newPassword: 'Sentra@NIP001' }
```

---

### Transactions Service (`transactions.service.ts`)

#### `getTransactions(filters)`

Get transactions with filters.

```typescript
const transactions = await getTransactions({
  branch_id: 'uuid',
  status: 'PENDING',
  transaction_type_id: 1
});
```

#### `createTransaction(data)`

Create new transaction.

```typescript
const transaction = await createTransaction({
  transaction_type_id: 1,
  form_data: { field1: 'value1' },
  documents: [],
  branch_id: 'uuid',
  created_by: 'user-uuid'
});
```

#### `processTransaction(id, action, notes)`

Process transaction (approve/reject/return).

```typescript
await processTransaction('txn-uuid', 'APPROVED', 'Approved by manager');
// action: 'APPROVED' | 'REJECTED' | 'RETURNED'
```

#### `getMyTasks(userId)`

Get transactions assigned to user's role for current stage.

```typescript
const tasks = await getMyTasks('user-uuid');
```

#### `getMyTickets(userId)`

Get transactions created by user.

```typescript
const tickets = await getMyTickets('user-uuid');
```

---

### Fields Service (`fields.service.ts`)

#### `getFields()`

Get all field definitions.

```typescript
const fields = await getFields();
// Returns: Field[]
```

#### `getFieldAccess(transactionTypeId, stageCode, roleCode)`

Get field access configuration.

```typescript
const access = await getFieldAccess(1, 'MAKER', 'MAKER');
// Returns: FieldAccess[]
```

---

### Unique Fields Service (`unique-fields.service.ts`)

#### `checkUniqueFieldValue(params)`

Check if field value is unique.

```typescript
const result = await checkUniqueFieldValue({
  fieldCode: 'NOMOR_CL',
  fieldValue: 'CL-001',
  transactionTypeId: 1,
  excludeTransactionId: null // optional, for edit mode
});
// Returns: { isUnique: boolean, existingTicketNumber?: string }
```

---

## Database RPC Functions

### Authentication

```sql
-- Login
SELECT * FROM login_user('NIP', 'password');

-- Change password
SELECT change_user_password('user-uuid', 'newPassword');

-- Admin set password
SELECT admin_set_password('user-uuid', 'newPassword');
```

### Business Logic

```sql
-- Generate ticket number
SELECT generate_ticket_number('BU');
-- Returns: 'BU-20260105-0001'

-- Check unique field
SELECT check_unique_field_value(
  'NOMOR_CL',
  'CL-001',
  1,
  NULL
);
-- Returns: boolean
```

---

## Types

### User

```typescript
interface User {
  id: string;
  nip: string;
  fullName: string;
  email: string;
  roleId: number;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Transaction

```typescript
interface Transaction {
  id: string;
  ticket_number: string;
  transaction_type_id: number;
  form_data: Record<string, any>;
  documents: Document[];
  current_stage: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  created_by: string;
  branch_id: string;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
}
```

### Role

```typescript
interface Role {
  id: number;
  code: 'ADMIN' | 'MAKER' | 'APPROVER';
  name: string;
}
```
