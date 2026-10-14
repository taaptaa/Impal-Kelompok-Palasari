# 📋 TUGAS & TANGGUNG JAWAB SETIAP ROLE

## 🎯 OVERVIEW SISTEM

SmartLend memiliki 3 role utama dengan tugas yang berbeda:

| Role | Warna Tema | Dashboard | Fungsi Utama |
|------|-----------|-----------|--------------|
| **👨‍🎓 Mahasiswa** | Biru (#2563EB) | Mobile App | Ajukan & pantau peminjaman |
| **👨‍💼 Admin** | Hijau (#10B981) | Desktop Dashboard | Approve/reject peminjaman |
| **👷 Petugas Gudang** | Orange (#F97316) | QR Scanner | Kelola pengambilan & pengembalian |

---

## 👨‍💼 ADMIN - ADMINISTRATOR

### **🎨 Dashboard Design:**
- Warna: **Hijau (#10B981)**
- Layout: Desktop-first (900px modals)
- Icon: Check circle untuk approval

### **📌 TUGAS UTAMA:**

#### **1. Review Peminjaman Baru** ⏳
**Lokasi:** Tab "Menunggu"

**Proses:**
```
1. Lihat daftar peminjaman dengan status PENDING
2. Review detail:
   ✓ Nama mahasiswa & email
   ✓ Barang yang diminta
   ✓ Jumlah unit
   ✓ Tanggal pinjam & kembali
   ✓ Alasan peminjaman
3. Cek ketersediaan stok
4. Verifikasi alasan peminjaman
```

**Contoh:**
```
PENDING (Tab Menunggu):
┌────────────────────────────────┐
│ LR001 - Kursi Lipat            │
│ Ahmad Rizki                    │
│ 20 unit                        │
│ 15-17 Jan 2024                 │
│ Alasan: Seminar mahasiswa      │
│                                │
│ [Tolak] [Setujui] ← Action     │
└────────────────────────────────┘
```

---

#### **2. Approve Peminjaman** ✅
**Action:** Klik tombol "Setujui"

**Yang Terjadi:**
```
1. Modal konfirmasi muncul (900px, icon centered)
   └─ Tampilkan detail lengkap peminjaman
   
2. Admin klik "Ya, Setujui"
   
3. SISTEM AUTO-GENERATE:
   ✓ QR Code (format: SMARTLEND:ID:ItemID:Qty)
   ✓ Status → APPROVED
   ✓ approvedBy → Nama admin
   ✓ approvedDate → Tanggal hari ini
   
4. Mahasiswa dapat notifikasi
   └─ Bisa lihat & screenshot QR Code

5. Peminjaman pindah ke Tab "Disetujui"
```

**QR Code Format:**
```
SMARTLEND:LR002:2:1
    │      │   │ │
    │      │   │ └─ Quantity
    │      │   └─── Item ID
    │      └─────── Loan Request ID
    └────────────── Prefix
```

---

#### **3. Reject Peminjaman** ❌
**Action:** Klik tombol "Tolak"

**Yang Terjadi:**
```
1. Modal konfirmasi muncul
2. Admin confirm rejection
3. Status → REJECTED
4. Mahasiswa dapat notifikasi penolakan
5. Stok tetap available (tidak berkurang)
```

---

#### **4. Monitor Peminjaman Aktif** 🔄
**Lokasi:** Tab "Disetujui"

**Isi:**
- Peminjaman yang sudah disetujui tapi belum diambil
- QR Code sudah di-generate
- Menunggu mahasiswa ke gudang

**Info yang Ditampilkan:**
```
┌────────────────────────────────┐
│ LR002 - Proyektor LCD          │
│ ✓ DISETUJUI                    │
│ Siti Nurhaliza                 │
│ 1 unit                         │
│ Pinjam: 12 Jan                 │
│ Kembali: 13 Jan                │
│ QR: SMARTLEND:LR002:2:1        │
│                                │
│ Status: Menunggu pengambilan   │
└────────────────────────────────┘
```

---

#### **5. Monitor Peminjaman Selesai** ✓
**Lokasi:** Tab "Selesai"

**Isi:**
- History peminjaman yang sudah dikembalikan
- Catatan kondisi barang saat dikembalikan
- Audit trail lengkap

---

### **📊 DASHBOARD TABS:**

| Tab | Jumlah Badge | Isi | Action |
|-----|--------------|-----|--------|
| **Menunggu** | 🟡 Count pending | Butuh review | Approve/Reject |
| **Disetujui** | 🟢 Count approved | QR generated | Monitor |
| **Aktif** | 🔴 Count active | Sedang dipinjam | Monitor |
| **Selesai** | 🔵 Count completed | History | Archive |

---

### **🎯 FLOW KERJA ADMIN:**

```
START
  ↓
1. Login ke Admin Dashboard
  ↓
2. Tab "Menunggu" → Lihat PENDING requests
  ↓
3. Klik item → Review detail peminjaman
  ↓
4. DECISION:
   ├─ APPROVE
   │  ├─ Klik "Setujui"
   │  ├─ Confirm di modal
   │  ├─ QR auto-generated
   │  └─ Status → APPROVED
   │
   └─ REJECT
      ├─ Klik "Tolak"
      ├─ Confirm di modal
      └─ Status → REJECTED
  ↓
5. Tab "Disetujui" → Monitor yang sudah approved
  ↓
6. Tab "Aktif" → Monitor yang sedang dipinjam
  ↓
7. Tab "Selesai" → Lihat history
  ↓
END
```

---

### **⚡ FITUR ADMIN:**

✅ **Real-time Updates**
- Status berubah otomatis saat approval
- Badge count update otomatis
- No refresh needed

✅ **Validation**
- Cek stok sebelum approve
- Prevent over-allocation
- Auto-calculate availability

✅ **Audit Trail**
- approvedBy: Nama admin
- approvedDate: Timestamp
- Complete history

✅ **QR Generation**
- Auto-generate saat approve
- Unique per loan request
- Secure format

---

## 👷 PETUGAS GUDANG - WAREHOUSE

### **🎨 Dashboard Design:**
- Warna: **Orange (#F97316)**
- Layout: QR Scanner focused
- Icon: Package & QR Code

### **📌 TUGAS UTAMA:**

#### **1. Scan QR - Pengambilan Barang** 📦
**Lokasi:** Tab "Pengambilan"

**Proses:**
```
1. Mahasiswa datang dengan QR Code
2. Petugas scan/input QR Code
   └─ Format: SMARTLEND:LR002:2:1
   
3. SISTEM VERIFIKASI:
   ✓ QR Code valid?
   ✓ Status = APPROVED?
   ✓ Belum diambil?
   ✓ Tanggal sesuai?
   
4. Tampilkan Detail:
   ┌──────────────────────────┐
   │ ✓ VALID                  │
   │ ID: LR002                │
   │ Mahasiswa: Siti Nur      │
   │ Barang: Proyektor LCD    │
   │ Jumlah: 1 unit           │
   │ Kembali: 13 Jan 2024     │
   │                          │
   │ [Konfirmasi Serahkan]    │
   └──────────────────────────┘
   
5. Petugas konfirmasi serahkan
   
6. SISTEM AUTO-UPDATE:
   ✓ Status → ACTIVE
   ✓ pickedUpDate → Hari ini
   ✓ Stok item berkurang
   ✓ handedBy → Nama petugas
```

---

#### **2. Scan QR - Pengembalian Barang** 📥
**Lokasi:** Tab "Pengembalian"

**Proses:**
```
1. Mahasiswa datang untuk kembalikan barang
2. Petugas scan QR Code yang sama
   
3. SISTEM VERIFIKASI:
   ✓ Status = ACTIVE?
   ✓ Sudah diambil sebelumnya?
   ✓ ID matching?
   
4. Tampilkan Form Cek Kondisi:
   ┌──────────────────────────┐
   │ PENGEMBALIAN BARANG      │
   │ ID: LR002                │
   │ Proyektor LCD (1 unit)   │
   │                          │
   │ Kondisi Barang:          │
   │ ● Baik - Lengkap & Baik  │
   │ ○ Rusak Ringan           │
   │ ○ Rusak Berat            │
   │                          │
   │ Catatan: [Optional]      │
   │ "Kondisi sempurna,       │
   │  tidak ada kerusakan"    │
   │                          │
   │ [Konfirmasi Terima]      │
   └──────────────────────────┘
   
5. Petugas cek fisik barang
6. Pilih kondisi
7. Konfirmasi terima
   
8. SISTEM AUTO-UPDATE:
   ✓ Status → COMPLETED
   ✓ returnCondition → Kondisi
   ✓ returnNotes → Catatan
   ✓ returnedDate → Hari ini
   ✓ Stok item bertambah kembali
   ✓ receivedBy → Nama petugas
```

**Quality Check Options:**
| Kondisi | Icon | Warna | Deskripsi |
|---------|------|-------|-----------|
| **Baik** | ✓ CheckCircle | 🟢 Hijau | Lengkap & tidak rusak |
| **Rusak Ringan** | ⚠️ AlertTriangle | 🟡 Kuning | Ada kerusakan kecil |
| **Rusak Berat** | ✗ XCircle | 🔴 Merah | Kerusakan parah |

---

#### **3. Monitor Stok Real-time** 📊

**Dashboard menampilkan:**
```
SUMMARY CARDS:
┌──────────────────┬──────────────────┬──────────────────┐
│ 🟡 PENDING       │ 🟢 SIAP AMBIL   │ 🔴 DIPINJAM      │
│      3           │      2           │      5           │
└──────────────────┴──────────────────┴──────────────────┘

STOK TERSEDIA:
┌────────────────────────────────┐
│ Kursi Lipat: 80/100 (80%)      │
│ Proyektor: 4/5 (Low Stock!)    │
│ Meja Konferensi: 12/15 (80%)   │
└────────────────────────────────┘
```

---

#### **4. Validasi & Error Handling** ⚠️

**Skenario Error:**

**a) QR Code Invalid:**
```
❌ QR Code tidak valid
   Pastikan QR Code dari SmartLend
```

**b) Status Tidak Sesuai:**
```
❌ Peminjaman belum disetujui
   Hubungi admin untuk approval
```

**c) Sudah Diambil:**
```
❌ Barang sudah diambil sebelumnya
   Tanggal ambil: 12 Jan 2024
```

**d) Belum Diambil (Return):**
```
❌ Tidak bisa dikembalikan
   Barang belum pernah diambil
```

**e) Stok Habis:**
```
❌ Stok tidak cukup
   Tersedia: 0 unit
   Diminta: 1 unit
```

---

### **📊 DASHBOARD TABS:**

| Tab | Fungsi | Action |
|-----|--------|--------|
| **Pengambilan** | Scan QR untuk serahkan barang | Hand over items |
| **Pengembalian** | Scan QR untuk terima kembali | Receive & check |
| **Riwayat** | History semua transaksi | Audit |

---

### **🎯 FLOW KERJA PETUGAS GUDANG:**

```
PENGAMBILAN BARANG:
START
  ↓
1. Mahasiswa datang dengan QR Code screenshot
  ↓
2. Petugas buka Tab "Pengambilan"
  ↓
3. Input/Scan QR: SMARTLEND:LR002:2:1
  ↓
4. Sistem verifikasi & tampilkan detail
  ↓
5. Petugas cek fisik:
   ✓ Barang ada?
   ✓ Kondisi baik?
   ✓ Jumlah sesuai?
  ↓
6. Klik "Konfirmasi Serahkan"
  ↓
7. SISTEM UPDATE:
   - Status → ACTIVE
   - Stok berkurang
   - pickedUpDate recorded
  ↓
8. Serahkan barang ke mahasiswa
  ↓
END

---

PENGEMBALIAN BARANG:
START
  ↓
1. Mahasiswa datang bawa barang + QR Code
  ↓
2. Petugas buka Tab "Pengembalian"
  ↓
3. Input/Scan QR: SMARTLEND:LR002:2:1
  ↓
4. Sistem verifikasi status ACTIVE
  ↓
5. Petugas cek kondisi fisik barang:
   ✓ Lengkap?
   ✓ Rusak?
   ✓ Berfungsi?
  ↓
6. Pilih kondisi di form:
   ○ Baik - Tidak rusak
   ○ Rusak Ringan
   ○ Rusak Berat
  ↓
7. Tulis catatan (optional)
  ↓
8. Klik "Konfirmasi Terima"
  ↓
9. SISTEM UPDATE:
   - Status → COMPLETED
   - Stok bertambah
   - returnCondition recorded
  ↓
10. Simpan barang ke gudang
  ↓
END
```

---

### **⚡ FITUR PETUGAS GUDANG:**

✅ **QR Scanner Simulation**
- Input manual QR code
- Real device scanner integration ready
- Format validation

✅ **Real-time Stock Update**
- Auto decrement saat pengambilan
- Auto increment saat pengembalian
- Low stock warning

✅ **Condition Check**
- 3 level kondisi (Baik/Rusak Ringan/Rusak Berat)
- Notes field untuk detail
- Photo upload ready (future)

✅ **Validation System**
- Prevent duplicate pickup
- Prevent return before pickup
- Status verification

---

## 📊 COMPARISON TABLE

| Aspek | Admin | Petugas Gudang |
|-------|-------|----------------|
| **Warna Tema** | 🟢 Hijau | 🟠 Orange |
| **Fokus Utama** | Approval & Monitor | Physical Handling |
| **Input Utama** | Mouse/Keyboard | QR Scanner |
| **Decision Making** | Approve/Reject | Hand over/Receive |
| **Data Entry** | Minimal | Condition check |
| **Dashboard Type** | Desktop | Mobile-friendly |
| **Main Action** | Click buttons | Scan QR |
| **Update Stock** | No | Yes (auto) |
| **Physical Access** | Office | Warehouse |

---

## 🔄 COMPLETE WORKFLOW

```
MAHASISWA                    ADMIN                    GUDANG
    │                          │                         │
    │ 1. Ajukan Pinjam         │                         │
    ├─────────────────────────>│                         │
    │                          │                         │
    │                          │ 2. Review & Approve     │
    │                          │ + Generate QR           │
    │                          │                         │
    │ 3. Dapat Notifikasi      │                         │
    │    & QR Code             │                         │
    │<─────────────────────────┤                         │
    │                          │                         │
    │ 4. Screenshot QR         │                         │
    │    Datang ke Gudang ────────────────────────────>  │
    │                          │                         │
    │                          │          5. Scan QR     │
    │                          │             Verifikasi  │
    │                          │             Serahkan    │
    │ 6. Terima Barang <──────────────────────────────┤  │
    │                          │                         │
    │ [ MENGGUNAKAN BARANG ]   │                         │
    │                          │                         │
    │ 7. Bawa Barang + QR ────────────────────────────>  │
    │                          │                         │
    │                          │          8. Scan QR     │
    │                          │             Cek Kondisi │
    │                          │             Terima      │
    │ 9. Selesai <────────────────────────────────────┤  │
    │                          │                         │
    ▼                          ▼                         ▼
```

---

## 🎯 KEY RESPONSIBILITIES

### **👨‍💼 ADMIN:**
1. ✅ Review permintaan peminjaman
2. ✅ Approve/reject berdasarkan kriteria
3. ✅ Monitor stok availability
4. ✅ Ensure QR code generation
5. ✅ Track active loans
6. ✅ Maintain audit trail

### **👷 PETUGAS GUDANG:**
1. ✅ Verify QR code validity
2. ✅ Hand over approved items
3. ✅ Check item condition on return
4. ✅ Update stock real-time
5. ✅ Record condition notes
6. ✅ Ensure item availability

---

## 📱 LOGIN CREDENTIALS (Demo)

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| Admin | `admin` | `123` | Green Dashboard |
| Gudang | `gudang` | `123` | Orange Dashboard |
| Mahasiswa | `test` | `123` | Blue Mobile App |

---

## 🎉 SUMMARY

**ADMIN = DECISION MAKER**
- Approve/Reject peminjaman
- Generate QR Code
- Monitor status

**GUDANG = EXECUTOR**
- Scan QR Code
- Hand over/Receive items
- Update stock & condition

**MAHASISWA = END USER**
- Request items
- Get QR code
- Pick up & return

---

**Sistem bekerja 3-way collaboration! 🤝**