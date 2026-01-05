# Troubleshooting - SENTRA

## Common Issues

### Login Issues

#### "NIP atau password salah"

**Causes:**
1. User tidak ada di database
2. Password hash belum di-set
3. User tidak aktif

**Solutions:**
```sql
-- Check if user exists
SELECT * FROM users WHERE nip = 'YOUR_NIP';

-- Check if password is set
SELECT id, nip, password_hash IS NOT NULL as has_password 
FROM users WHERE nip = 'YOUR_NIP';

-- Reset password
SELECT admin_set_password(
  (SELECT id FROM users WHERE nip = 'YOUR_NIP'),
  'Sentra@YOUR_NIP'
);
```

#### User baru tidak bisa login

**Cause:** Password tidak ter-set saat create user.

**Solution:** 
1. Gunakan tombol **Reset Password** di User Management
2. Atau jalankan SQL di atas

---

### Password Issues

#### Tidak redirect ke Change Password

**Cause:** Flag `must_change_password` tidak TRUE.

**Solution:**
```sql
UPDATE users SET must_change_password = TRUE WHERE nip = 'YOUR_NIP';
```

#### "Gagal mengubah password"

**Causes:**
1. User ID tidak valid
2. Database function error

**Solution:** Check Supabase logs untuk error detail.

---

### Transaction Issues

#### Ticket number tidak generate

**Cause:** Function `generate_ticket_number` tidak ada.

**Solution:** Jalankan migration `004_unique_fields_ticket_prefix.sql`

#### Unique field validation tidak jalan

**Cause:** Field belum ditandai `is_unique`.

**Solution:**
```sql
UPDATE field_master SET is_unique = TRUE WHERE code = 'YOUR_FIELD_CODE';
```

---

### UI Issues

#### Tombol Reset Password tidak muncul

**Solutions:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Restart dev server: `npm run dev`

#### Data tidak terupdate

**Solution:** 
1. Refresh page
2. Check browser console untuk error
3. Verify Supabase connection

---

### Database Issues

#### Migration error "cannot change name of input parameter"

**Cause:** Function sudah ada dengan nama parameter berbeda.

**Solution:** Drop function terlebih dahulu:
```sql
DROP FUNCTION IF EXISTS function_name(parameter_types);
```

#### RPC function not found

**Cause:** Function belum dibuat di database.

**Solution:** Jalankan migration yang sesuai di SQL Editor.

---

### Supabase Connection

#### Test connection

```typescript
// In browser console
const { data, error } = await supabase.from('users').select('id').limit(1);
console.log({ data, error });
```

#### CORS error

**Solution:** 
1. Check Supabase URL di environment variables
2. Tambahkan domain ke allowed origins di Supabase settings

---

## Debug Tips

### Enable Console Logging

Add to service functions:
```typescript
console.log('API call:', params);
console.log('Response:', data, error);
```

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Check request/response untuk API calls

### Supabase Dashboard

1. Go to Supabase project
2. Check "Logs" section
3. Filter by error level

---

## Support

For issues not covered here:
1. Check Supabase documentation
2. Review browser console errors
3. Check network requests in DevTools
