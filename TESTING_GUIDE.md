# SmartLend - Testing Guide

## 🎯 Alur Lengkap Sistem Peminjaman

### **1. LOGIN PHASE**

#### Test sebagai MAHASISWA:
- Email: `student@mail.com`
- Password: `(anything)`
- Role: Pilih "**Mahasiswa**"
- ✅ Akan masuk ke **Student Dashboard**

#### Test sebagai ADMIN:
- Email: `admin@mail.com`
- Password: `(anything)`
- Role: Pilih "**Admin**"
- ✅ Akan masuk ke **Admin Dashboard**

#### Test sebagai WAREHOUSE:
- Email: `warehouse@mail.com`
- Password: `(anything)`
- Role: Pilih "**Gudang**"
- ✅ Akan masuk ke **Warehouse Dashboard**

---

### **2. ALUR MAHASISWA → ADMIN → WAREHOUSE**

#### **FASE 1: Mahasiswa Mengajukan Peminjaman**

1. Login sebagai **Mahasiswa**
2. Klik tab **"Katalog"** di bottom nav
3. Pilih item (contoh: Proyektor LCD)
4. Klik **"Pinjam"**
5. Isi form:
   - Tanggal Pinjam: Pilih tanggal
   - Tanggal Kembali: Pilih tanggal
   - Jumlah: Atur dengan + / -
   - Alasan: Tulis alasan
6. Klik **"Ajukan"**
7. ✅ Status: **PENDING** (Badge Kuning)

---

#### **FASE 2: Admin Menyetujui Peminjaman**

1. **Logout** dari mahasiswa
2. Login sebagai **Admin**
3. Lihat di dashboard → Tab **"Menunggu"**
4. Klik pengajuan yang baru dibuat
5. Klik **"Setujui"**
6. Konfirmasi → Klik **"Ya, Setujui"**
7. ✅ Status berubah: **APPROVED** (Badge Hijau)
8. ✅ QR Code di-generate otomatis!

---

#### **FASE 3: Mahasiswa Lihat QR Code**

1. **Logout** dari admin
2. Login kembali sebagai **Mahasiswa**
3. Klik tab **"Riwayat"**
4. Filter: **"Disetujui"**
5. Klik **"Tampilkan QR Code"** pada peminjaman yang disetujui
6. ✅ QR Code muncul!
7. Tunjukkan QR ini ke petugas gudang

---

#### **FASE 4: Warehouse Scan & Serahkan Barang**

1. **Logout** dari mahasiswa
2. Login sebagai **Warehouse**
3. Klik **"Scan Pengambilan Barang"**
4. Masukkan ID manual: **LR002** (atau ID yang baru dibuat)
5. Klik **"Cari"**
6. ✅ Detail peminjaman muncul
7. Verifikasi data → Klik **"Serahkan Barang"**
8. ✅ Status berubah: **ACTIVE** (Sedang Dipinjam)
9. ✅ Stok barang berkurang otomatis!

---

#### **FASE 5: Warehouse Scan & Terima Pengembalian**

1. Tetap di **Warehouse Dashboard**
2. Klik **"Scan Pengembalian Barang"**
3. Masukkan ID: **LR003** (yang statusnya ACTIVE)
4. Klik **"Cari"**
5. ✅ Form verifikasi muncul
6. Pilih kondisi barang:
   - ✅ **Baik** (Hijau)
   - ⚠️ **Rusak** (Kuning)
   - ❌ **Hilang** (Merah)
7. Tambahkan catatan (opsional)
8. Klik **"Selesaikan Pengembalian"**
9. ✅ Status berubah: **COMPLETED**
10. ✅ Stok barang bertambah kembali!

---

### **3. DATA MOCK YANG TERSEDIA**

| ID | Mahasiswa | Item | Status | Keterangan |
|---|---|---|---|---|
| **LR001** | Ahmad Rizki | Kursi Lipat | PENDING | Belum disetujui |
| **LR002** | Siti Nurhaliza | Proyektor LCD | APPROVED | Sudah ada QR Code |
| **LR003** | Budi Santoso | Meja Konferensi | ACTIVE | Sedang dipinjam |
| **LR004** | Dewi Lestari | Microphone | COMPLETED | Sudah selesai |
| **LR005** | Eko Prasetyo | Sound System | PENDING | Belum disetujui |
| **LR006** | Fitri Handayani | Kursi Lipat | APPROVED | Sudah ada QR Code |
| **LR007** | Hendra Gunawan | Kabel Roll | COMPLETED | Sudah selesai |

---

### **4. FITUR ADMIN DASHBOARD**

✅ **Stats Cards**:
- Total Peminjaman
- Menunggu Approval (PENDING)
- Sedang Dipinjam (ACTIVE)
- Stok Kritis

✅ **Search & Filter**:
- Search by nama / ID / barang
- Tab filter: Menunggu, Disetujui, Dipinjam, Selesai, Semua

✅ **Actions**:
- Approve → Generate QR Code
- Reject → Tolak peminjaman

---

### **5. FITUR WAREHOUSE DASHBOARD**

✅ **Stats Cards**:
- Scan Hari Ini
- Siap Diambil (APPROVED)
- Sedang Dipinjam (ACTIVE)

✅ **Scan Pengambilan**:
- QR Scanner simulation
- Manual ID input
- Verifikasi detail
- Serahkan barang → Status jadi ACTIVE

✅ **Scan Pengembalian**:
- QR Scanner simulation
- Manual ID input
- Cek kondisi: Baik / Rusak / Hilang
- Tambah catatan
- Selesaikan → Status jadi COMPLETED
- Stok otomatis update!

---

### **6. FLOW TESTING LENGKAP**

```
MAHASISWA → Ajukan (PENDING)
    ↓
ADMIN → Approve (APPROVED + QR Code)
    ↓
MAHASISWA → Lihat QR Code
    ↓
WAREHOUSE → Scan Pengambilan (ACTIVE, stok -)
    ↓
WAREHOUSE → Scan Pengembalian (COMPLETED, stok +)
```

---

### **7. AUTO-UPDATE FEATURES**

✅ **Stok Management**:
- Saat ACTIVE: Stok berkurang
- Saat COMPLETED: Stok bertambah
- Status item update otomatis:
  - `available` (>3)
  - `low-stock` (<3)
  - `out-of-stock` (0)

✅ **Real-time Updates**:
- Semua perubahan langsung terlihat
- Toast notifications untuk setiap aksi
- Badge status berubah otomatis

---

### **8. SHORTCUT TESTING**

#### Quick Test Approval Flow:
1. Login Admin
2. Tab "Menunggu" → Approve LR001
3. Logout
4. Login Mahasiswa
5. Riwayat → Lihat QR Code

#### Quick Test Warehouse Flow:
1. Login Warehouse
2. Scan Pengambilan → Input: LR002
3. Serahkan Barang
4. Scan Pengembalian → Input: LR003
5. Pilih kondisi → Selesaikan

---

## 🎨 Design Elements

- **Modal Width**: 900px (super lebar!)
- **Login Container**: 900px
- **Colors**:
  - Student: Blue #2563EB
  - Admin: Green #10B981
  - Warehouse: Orange #F59E0B
- **Responsive**: Mobile-first design
- **Smooth Transitions**: Semua interaksi smooth

---

## 📱 Screens Available

### Student (5 screens):
1. Home
2. Katalog
3. Riwayat
4. Notifikasi
5. Bantuan/Profile

### Admin (1 screen):
- Full dashboard dengan approval system

### Warehouse (1 screen):
- Full dashboard dengan QR scanner

---

**Happy Testing! 🚀**
