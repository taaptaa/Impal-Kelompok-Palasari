# 🚀 SMARTLEND - COMPLETE WORKFLOW GUIDE

## 📋 QUICK REFERENCE

| Step | Actor | Action | Location | Result |
|------|-------|--------|----------|--------|
| 1 | 👨‍🎓 Mahasiswa | Ajukan peminjaman | Katalog | Status: PENDING |
| 2 | 👨‍💼 Admin | Review & approve | Tab "Menunggu" | QR Generated |
| 3 | 👨‍🎓 Mahasiswa | Lihat QR Code | Riwayat > Disetujui | Screenshot QR |
| 4 | 👷 Gudang | Scan & serahkan | Tab "Pengambilan" | Status: ACTIVE |
| 5 | 👨‍🎓 Mahasiswa | Gunakan barang | - | - |
| 6 | 👷 Gudang | Scan & terima | Tab "Pengembalian" | Status: COMPLETED |

---

## 🎯 DETAILED WORKFLOW

### **PHASE 1: PENGAJUAN** (Mahasiswa)

```
┌─────────────────────────────────────────┐
│  MAHASISWA LOGIN                        │
│  Email: test                            │
│  Password: 123                          │
│  Role: Mahasiswa                        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  TAB KATALOG                            │
│  • Lihat item tersedia                  │
│  • Pilih barang (e.g., Proyektor LCD)   │
│  • Klik "Pinjam"                        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  FORM PEMINJAMAN (Modal 900px)          │
│  ┌───────────────────────────────────┐  │
│  │ Barang: Proyektor LCD             │  │
│  │ Stok: 5 unit                      │  │
│  │                                   │  │
│  │ Jumlah: [1]                       │  │
│  │ Tanggal Pinjam: [12 Jan 2024]    │  │
│  │ Tanggal Kembali: [13 Jan 2024]   │  │
│  │ Alasan: [Presentasi TA...]       │  │
│  │                                   │  │
│  │        [Ajukan Peminjaman]        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ REQUEST CREATED                      │
│  ID: LR002                              │
│  Status: PENDING (🟡 Kuning)            │
│  Menunggu approval admin                │
└─────────────────────────────────────────┘
```

---

### **PHASE 2: APPROVAL** (Admin)

```
┌─────────────────────────────────────────┐
│  ADMIN LOGIN                            │
│  Email: admin                           │
│  Password: 123                          │
│  Role: Admin                            │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ADMIN DASHBOARD (🟢 Hijau)             │
│  ┌───────────────────────────────────┐  │
│  │ Tab: MENUNGGU (Badge: 1)          │  │
│  │                                   │  │
│  │ ┌─────────────────────────────┐   │  │
│  │ │ LR002 - Proyektor LCD       │   │  │
│  │ │ Siti Nurhaliza              │   │  │
│  │ │ 1 unit                      │   │  │
│  │ │ 12-13 Jan 2024              │   │  │
│  │ │ Alasan: Presentasi TA       │   │  │
│  │ │                             │   │  │
│  │ │ [Tolak]  [Setujui] ←Click!  │   │  │
│  │ └─────────────────────────────┘   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  MODAL KONFIRMASI (900px, centered)     │
│  ┌───────────────────────────────────┐  │
│  │        [✓ ICON 96px]              │  │
│  │    Konfirmasi Persetujuan         │  │
│  │                                   │  │
│  │  Detail lengkap peminjaman...     │  │
│  │                                   │  │
│  │  [Batal]  [✓ Ya, Setujui] ←Click! │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ APPROVED & QR GENERATED              │
│  Status: APPROVED (🟢 Hijau)            │
│  QR Code: SMARTLEND:LR002:2:1           │
│  approvedBy: Admin Utama                │
│  approvedDate: 2024-01-09               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  PINDAH KE TAB "DISETUJUI"              │
│  Menunggu mahasiswa ke gudang           │
└─────────────────────────────────────────┘
```

---

### **PHASE 3: LIHAT QR CODE** (Mahasiswa)

```
┌─────────────────────────────────────────┐
│  MAHASISWA LOGIN KEMBALI                │
│  Email: test                            │
│  Password: 123                          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  TAB RIWAYAT                            │
│  Filter: "Disetujui" ←Select            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ [IMG] Proyektor LCD               │  │
│  │ Status: DISETUJUI (🟢)            │  │
│  │ ID: LR002                         │  │
│  │ 1 unit                            │  │
│  │                                   │  │
│  │ [Tampilkan QR Code] ←Click!       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  QR CODE MODAL (600px, scrollable)      │
│  ┌───────────────────────────────────┐  │
│  │  Tiket Peminjaman           [×]   │  │
│  ├───────────────────────────────────┤  │
│  │       [QR ICON 96px]              │  │
│  │   Tunjukkan QR Code Ini           │  │
│  │                                   │  │
│  │   ┌─────────────────────────┐     │  │
│  │   │  █████████████████████  │     │  │
│  │   │  █████████████████████  │     │  │
│  │   │  █████████████████████  │     │  │
│  │   │  QR CODE 280x280px      │     │  │
│  │   │  █████████████████████  │     │  │
│  │   │  █████████████████████  │     │  │
│  │   │  █████████████████████  │     │  │
│  │   └─────────────────────────┘     │  │
│  │                                   │  │
│  │   ID PEMINJAMAN: LR002            │  │
│  │   Proyektor LCD - 1 unit          │  │
│  │   12 Jan - 13 Jan 2024            │  │
│  │                                   │  │
│  │   💡 Screenshot QR code ini       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  📸 MAHASISWA SCREENSHOT QR             │
│  Simpan ke galeri                       │
│  Siap ke gudang!                        │
└─────────────────────────────────────────┘
```

---

### **PHASE 4: PENGAMBILAN BARANG** (Petugas Gudang)

```
┌─────────────────────────────────────────┐
│  MAHASISWA DATANG KE GUDANG             │
│  Bawa: Screenshot QR Code               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  GUDANG LOGIN                           │
│  Email: gudang                          │
│  Password: 123                          │
│  Role: Warehouse                        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  WAREHOUSE DASHBOARD (🟠 Orange)        │
│  ┌───────────────────────────────────┐  │
│  │ Tab: PENGAMBILAN                  │  │
│  │                                   │  │
│  │ Scan atau Ketik QR Code:          │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ SMARTLEND:LR002:2:1          │ │  │
│  │ └───────────────────────────────┘ │  │
│  │                                   │  │
│  │        [Verifikasi] ←Click!       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  DETAIL PEMINJAMAN                      │
│  ┌───────────────────────────────────┐  │
│  │ ✓ QR CODE VALID                   │  │
│  │                                   │  │
│  │ ID: LR002                         │  │
│  │ Mahasiswa: Siti Nurhaliza         │  │
│  │ Email: siti.nur@mail.com          │  │
│  │ Barang: Proyektor LCD             │  │
│  │ Jumlah: 1 unit                    │  │
│  │ Tanggal Pinjam: 12 Jan 2024       │  │
│  │ Tanggal Kembali: 13 Jan 2024      │  │
│  │                                   │  │
│  │ [Konfirmasi Serahkan] ←Click!     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ BARANG DISERAHKAN                    │
│  Status: ACTIVE (🔴 Merah)              │
│  Stok berkurang: 5 → 4 unit             │
│  pickedUpDate: 2024-01-12               │
│  handedBy: Petugas Gudang               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  🎬 MAHASISWA GUNAKAN BARANG            │
│  Presentasi Tugas Akhir                 │
└─────────────────────────────────────────┘
```

---

### **PHASE 5: PENGEMBALIAN BARANG** (Petugas Gudang)

```
┌─────────────────────────────────────────┐
│  MAHASISWA DATANG KE GUDANG             │
│  Bawa: Barang + Screenshot QR           │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  WAREHOUSE DASHBOARD                    │
│  ┌───────────────────────────────────┐  │
│  │ Tab: PENGEMBALIAN ←Switch tab     │  │
│  │                                   │  │
│  │ Scan atau Ketik QR Code:          │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ SMARTLEND:LR002:2:1          │ │  │
│  │ └───────────────────────────────┘ │  │
│  │                                   │  │
│  │        [Verifikasi] ←Click!       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  FORM CEK KONDISI                       │
│  ┌───────────────────────────────────┐  │
│  │ PENGEMBALIAN BARANG               │  │
│  │                                   │  │
│  │ ID: LR002                         │  │
│  │ Proyektor LCD (1 unit)            │  │
│  │ Dipinjam: 12 Jan 2024             │  │
│  │                                   │  │
│  │ Kondisi Barang:                   │  │
│  │ ● Baik - Tidak rusak ←Select      │  │
│  │ ○ Rusak Ringan                    │  │
│  │ ○ Rusak Berat                     │  │
│  │                                   │  │
│  │ Catatan (Optional):               │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ Kondisi sempurna, tidak ada   │ │  │
│  │ │ kerusakan. Lensa bersih.      │ │  │
│  │ └───────────────────────────────┘ │  │
│  │                                   │  │
│  │   [Konfirmasi Terima] ←Click!     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ BARANG DITERIMA                      │
│  Status: COMPLETED (🔵 Biru)            │
│  Stok bertambah: 4 → 5 unit             │
│  returnCondition: Baik                  │
│  returnNotes: Kondisi sempurna...       │
│  returnedDate: 2024-01-13               │
│  receivedBy: Petugas Gudang             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  🎉 PEMINJAMAN SELESAI                  │
│  Pindah ke Tab "Selesai" (history)      │
└─────────────────────────────────────────┘
```

---

## 📊 STATUS FLOW DIAGRAM

```
┌───────────┐
│  PENDING  │ ← Mahasiswa ajukan
│   🟡      │
└─────┬─────┘
      │
      │ Admin approve
      ↓
┌───────────┐
│ APPROVED  │ ← QR Generated
│   🟢      │
└─────┬─────┘
      │
      │ Gudang serahkan
      ↓
┌───────────┐
│  ACTIVE   │ ← Sedang dipinjam
│   🔴      │
└─────┬─────┘
      │
      │ Gudang terima kembali
      ↓
┌───────────┐
│ COMPLETED │ ← History
│   🔵      │
└───────────┘

ALTERNATIVE:
┌───────────┐
│  PENDING  │
│   🟡      │
└─────┬─────┘
      │
      │ Admin reject
      ↓
┌───────────┐
│ REJECTED  │ ← Ditolak
│   ⚫      │
└───────────┘
```

---

## 🎮 TEST SCENARIOS

### **Scenario 1: Happy Path (Success)**

```
1. Mahasiswa: Email "test" → Katalog → Pilih "Proyektor LCD"
   └─ Ajukan: 1 unit, 12-13 Jan, Alasan: "Presentasi TA"
   └─ Status: PENDING

2. Admin: Email "admin" → Tab "Menunggu" → LR002
   └─ Klik "Setujui" → Confirm
   └─ Status: APPROVED, QR: SMARTLEND:LR002:2:1

3. Mahasiswa: Riwayat → "Disetujui" → LR002
   └─ "Tampilkan QR Code" → Screenshot
   └─ Bawa ke gudang

4. Gudang: Email "gudang" → Tab "Pengambilan"
   └─ Input: SMARTLEND:LR002:2:1
   └─ "Konfirmasi Serahkan"
   └─ Status: ACTIVE, Stok: 5→4

5. Mahasiswa: Gunakan barang (presentasi)

6. Gudang: Tab "Pengembalian"
   └─ Input: SMARTLEND:LR002:2:1
   └─ Kondisi: "Baik"
   └─ "Konfirmasi Terima"
   └─ Status: COMPLETED, Stok: 4→5

✅ SUCCESS! Workflow complete!
```

---

### **Scenario 2: Rejection Path**

```
1. Mahasiswa: Ajukan LR001 (Kursi Lipat, 50 unit)
   └─ Status: PENDING

2. Admin: Tab "Menunggu" → LR001
   └─ Review: Stok hanya 20 unit!
   └─ Klik "Tolak" → Confirm
   └─ Status: REJECTED

3. Mahasiswa: Dapat notifikasi penolakan
   └─ Riwayat → Filter "Ditolak"
   └─ Ajukan ulang dengan jumlah lebih kecil

❌ REJECTED (but can resubmit)
```

---

### **Scenario 3: Error - QR Invalid**

```
1. Mahasiswa screenshot QR palsu/edit
2. Gudang scan QR: "FAKE:CODE:123"
3. ❌ Error: "QR Code tidak valid"
4. Petugas minta mahasiswa tunjukkan dari app
```

---

### **Scenario 4: Error - Belum Approve**

```
1. Mahasiswa langsung ke gudang (belum approve)
2. Gudang scan QR: SMARTLEND:LR001:1:20
3. ❌ Error: "Peminjaman belum disetujui"
4. Mahasiswa harus tunggu admin approve dulu
```

---

## 📱 QUICK ACTIONS

### **Admin:**
```
LOGIN → Tab Menunggu → [Item] → Setujui → ✓
```

### **Gudang (Pengambilan):**
```
LOGIN → Tab Pengambilan → [Scan QR] → Verifikasi → Serahkan → ✓
```

### **Gudang (Pengembalian):**
```
LOGIN → Tab Pengembalian → [Scan QR] → Pilih Kondisi → Terima → ✓
```

---

## 🎯 KEY POINTS

1. **Mahasiswa** tidak bisa ambil barang tanpa approval
2. **Admin** harus approve agar QR ter-generate
3. **QR Code** hanya valid untuk 1 peminjaman
4. **Gudang** scan QR 2x (pengambilan & pengembalian)
5. **Stok** update otomatis saat pickup & return
6. **Kondisi** dicek saat pengembalian untuk audit

---

## ⚡ TIPS & TRICKS

**Untuk Admin:**
- Cek stok sebelum approve
- Review alasan peminjaman
- Monitor tab "Aktif" untuk overdue

**Untuk Gudang:**
- Verify identitas mahasiswa
- Cek fisik barang sebelum serahkan
- Teliti cek kondisi saat terima kembali
- Tulis notes jika ada kerusakan

**Untuk Mahasiswa:**
- Screenshot QR code
- Backup di cloud (Drive/Photos)
- Datang sesuai jadwal
- Rawat barang dengan baik

---

## 🎉 CONGRATULATIONS!

Anda sekarang paham complete workflow SmartLend! 🚀

**Next Steps:**
1. Test semua scenarios
2. Explore edge cases
3. Customize untuk kebutuhan kampus
4. Deploy & launch! 🎊
