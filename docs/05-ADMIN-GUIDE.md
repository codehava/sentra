# Admin Guide - SENTRA

## Overview

Halaman Admin hanya dapat diakses oleh user dengan role **ADMIN**. Menu Admin tersedia di sidebar navigation.

---

## User Management

**Path:** Admin → Users

### Create User

1. Klik **+ Add User**
2. Isi form:
   - **NIP** - Nomor Induk Pegawai (unique)
   - **Full Name** - Nama lengkap
   - **Email** - Email address (unique)
   - **Role** - ADMIN, MAKER, atau APPROVER
   - **Active** - Status aktif/non-aktif
3. Klik **Create**
4. **Password default** akan ditampilkan: `Sentra@{NIP}`
5. Copy password dan informasikan ke user

### Edit User

1. Klik icon ✏️ pada row user
2. Update field yang diinginkan
3. Klik **Save**

### Reset Password

1. Klik icon 🔄 pada row user
2. Konfirmasi reset
3. Password akan di-reset ke default: `Sentra@{NIP}`
4. Copy password baru

### Assign Branches

1. Klik icon 🏢 pada row user
2. Pilih branch yang dapat diakses user
3. Klik **Simpan**

### Delete User

1. Klik icon 🗑️ pada row user
2. Konfirmasi penghapusan

---

## Transaction Types

**Path:** Admin → Transaction Types

Jenis-jenis transaksi yang tersedia di sistem.

| Field | Description |
|-------|-------------|
| Code | Kode unik (prefix ticket) |
| Name | Nama jenis transaksi |
| Icon | Icon untuk display |
| Description | Deskripsi |
| Active | Status aktif |

---

## Field Master

**Path:** Admin → Fields

Definisi field yang tersedia untuk form transaksi.

| Field | Description |
|-------|-------------|
| Code | Kode unik field |
| Name | Label field |
| Type | text, number, date, select, file, dll |
| Is Required | Wajib diisi |
| Is Unique | Nilai harus unik (cegah duplikasi) |
| Options | Untuk type select |

### Unique Field

Aktifkan **Unique Value** untuk field yang nilainya tidak boleh duplikat, contoh:
- Nomor Invoice
- Nomor CL (Covering Letter)
- Nomor PO

---

## Field Access Matrix

**Path:** Admin → Field Access

Mengatur visibility dan editability field per **Role** dan **Stage**.

| Setting | Description |
|---------|-------------|
| Hidden | Field tidak ditampilkan |
| View | Field read-only |
| Edit | Field dapat diedit |

Matrix: `Transaction Type × Stage × Role × Field`

---

## Routing Matrix

**Path:** Admin → Routing

Mengatur workflow stages untuk setiap jenis transaksi.

| Field | Description |
|-------|-------------|
| Transaction Type | Jenis transaksi |
| Stage Code | Kode stage (MAKER, CHECKER, APPROVER, dll) |
| Stage Order | Urutan eksekusi |
| Assigned Role | Role yang handle stage ini |
| Can Approve | Bisa approve ke stage berikutnya |
| Can Reject | Bisa reject (end workflow) |
| Can Return | Bisa return ke stage sebelumnya |

### Example Workflow

```
MAKER (order: 1) → CHECKER (order: 2) → APPROVER (order: 3)
```

---

## SLA Configuration

**Path:** Admin → SLA

Mengatur deadline untuk setiap jenis transaksi.

| Field | Description |
|-------|-------------|
| Transaction Type | Jenis transaksi |
| Duration Hours | Durasi SLA dalam jam |

---

## Branches

**Path:** Admin → Branches

Daftar kantor cabang.

| Field | Description |
|-------|-------------|
| Code | Kode cabang |
| Name | Nama cabang |
| Address | Alamat |
| Active | Status aktif |

---

## Stage Definitions

**Path:** Admin → Stages

Definisi stage codes yang tersedia untuk routing.

| Field | Description |
|-------|-------------|
| Code | Kode stage (MAKER, CHECKER, etc) |
| Name | Nama stage |
| Description | Deskripsi |

---

## Best Practices

1. **Test routing** sebelum go-live dengan membuat transaksi dummy
2. **Backup** konfigurasi sebelum modifikasi besar
3. **Audit** user secara berkala dan nonaktifkan yang tidak digunakan
4. **Monitor SLA** untuk optimasi workflow
