# 🔧 ALUR KONDISI BARANG RUSAK - PETUGAS GUDANG

## 📋 OVERVIEW

Dokumen ini menjelaskan **complete workflow** untuk menangani barang rusak/hilang saat pengembalian di sistem SmartLend.

---

## 🎯 3 KONDISI BARANG

| Kondisi | Icon | Warna | Badge | Deskripsi | Action |
|---------|------|-------|-------|-----------|--------|
| **Baik** | ✓ CheckCircle | 🟢 Hijau | #10B981 | Lengkap & tidak rusak | Stok kembali normal |
| **Rusak Ringan** | ⚠️ AlertTriangle | 🟡 Kuning | #F59E0B | Gores, lecet, rusak kecil | Stok kembali, perlu perbaikan |
| **Rusak Berat** | ✗ XCircle | 🔴 Merah | #EF4444 | Pecah, hilang, tidak berfungsi | Stok kembali tapi non-operasional |

---

## 🔄 COMPLETE WORKFLOW

### **SKENARIO 1: BARANG KONDISI BAIK** ✅

```
┌─────────────────────────────────────────┐
│  STEP 1: MAHASISWA DATANG               │
│  • Bawa barang dalam kondisi sempurna   │
│  • Screenshot QR Code                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 2: PETUGAS SCAN QR                │
│  • Login: gudang / 123                  │
│  • Tab: "Pengembalian"                  │
│  • Input QR: LR002                      │
│  • Klik "Cari"                          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 3: SISTEM VERIFIKASI              │
│  ✓ QR Code valid                        │
│  ✓ Status: ACTIVE                       │
│  ✓ Sudah diambil sebelumnya             │
│  ✓ ID matching                          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 4: CEK FISIK BARANG               │
│  Petugas memeriksa:                     │
│  ✓ Jumlah unit lengkap                  │
│  ✓ Tidak ada kerusakan fisik            │
│  ✓ Fungsi normal (test jika elektronik) │
│  ✓ Aksesoris lengkap                    │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 5: PILIH KONDISI "BAIK"           │
│  ┌───────────────────────────────────┐  │
│  │ [✓ BAIK] (Hijau, selected)        │  │
│  │ ○ Rusak Ringan                    │  │
│  │ ○ Rusak Berat                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Catatan: (Optional)                    │
│  "Kondisi sempurna, tidak ada masalah"  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 6: KONFIRMASI & SUBMIT            │
│  Klik: "Selesaikan Pengembalian"        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ SISTEM UPDATE                        │
│  • Status: ACTIVE → COMPLETED           │
│  • returnCondition: "complete-good"     │
│  • returnNotes: "Kondisi sempurna..."   │
│  • actualReturnDate: 2024-01-13         │
│  • receivedBy: "Petugas Gudang"         │
│  • Stok: 4 → 5 unit (kembali normal)    │
│  • Item status: "available"             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  🎉 SUCCESS                             │
│  Toast: "Pengembalian Proyektor LCD     │
│         diterima (kondisi baik)"        │
└─────────────────────────────────────────┘
```

---

### **SKENARIO 2: BARANG RUSAK RINGAN** ⚠️

```
┌─────────────────────────────────────────┐
│  STEP 1: MAHASISWA DATANG               │
│  • Bawa barang dengan goresan/lecet     │
│  • Screenshot QR Code                   │
│  • Lapor: "Ada goresan di lensa"        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 2: PETUGAS SCAN QR                │
│  • Tab "Pengembalian"                   │
│  • Input QR: LR006                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 3: CEK FISIK BARANG               │
│  Petugas menemukan:                     │
│  ⚠️ Goresan di lensa kiri proyektor     │
│  ✓ Masih berfungsi normal               │
│  ✓ Jumlah lengkap                       │
│  ⚠️ Kabel sedikit lecet                 │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 4: PILIH KONDISI "RUSAK RINGAN"   │
│  ┌───────────────────────────────────┐  │
│  │ ○ Baik                            │  │
│  │ [⚠️ RUSAK RINGAN] (Kuning, active)│  │
│  │ ○ Rusak Berat                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Background berubah: 🟡 Kuning (#FEF3C7)│
│  Border: #F59E0B (Orange)               │
│  Icon: AlertTriangle besar              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 5: TULIS CATATAN DETAIL           │
│  ┌───────────────────────────────────┐  │
│  │ Catatan: (WAJIB untuk rusak)     │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ • Goresan di lensa kiri       │ │  │
│  │ │   proyektor ukuran ~2cm       │ │  │
│  │ │ • Kabel power lecet 5cm       │ │  │
│  │ │ • Fungsi masih normal         │ │  │
│  │ │ • Perlu perbaikan minor       │ │  │
│  │ └───────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 6: KONFIRMASI                     │
│  Klik: "Selesaikan Pengembalian"        │
│  ⚠️ Sistem tampilkan warning:           │
│  "Barang rusak ringan akan dicatat      │
│   untuk perbaikan"                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ SISTEM UPDATE                        │
│  • Status: ACTIVE → COMPLETED           │
│  • returnCondition: "damaged-light"     │
│  • returnNotes: "Goresan di lensa..."   │
│  • actualReturnDate: 2024-01-15         │
│  • Stok: 4 → 5 unit (kembali)           │
│  • Item status: "needs-repair" (NEW!)   │
│  • Flag untuk teknisi: true             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  🟡 SUCCESS WITH WARNING                │
│  Toast: "Pengembalian Proyektor LCD     │
│         diterima (kondisi rusak ringan)"│
│                                         │
│  🔔 Auto notification:                  │
│  • Ke Admin: "Barang LR006 perlu repair"│
│  • Ke Teknisi: "Check proyektor #2"    │
└─────────────────────────────────────────┘
```

---

### **SKENARIO 3: BARANG RUSAK BERAT** ❌

```
┌─────────────────────────────────────────┐
│  STEP 1: MAHASISWA DATANG               │
│  • Bawa barang rusak parah              │
│  • Lensa proyektor pecah                │
│  • Tidak bisa menyala                   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 2: PETUGAS SCAN QR                │
│  • Tab "Pengembalian"                   │
│  • Input QR: LR004                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 3: CEK FISIK BARANG               │
│  Petugas menemukan:                     │
│  ❌ Lensa proyektor pecah                │
│  ❌ Tidak bisa menyala                   │
│  ❌ Casing retak                         │
│  ❌ Beberapa tombol hilang               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 4: PILIH KONDISI "RUSAK BERAT"    │
│  ┌───────────────────────────────────┐  │
│  │ ○ Baik                            │  │
│  │ ○ Rusak Ringan                    │  │
│  │ [✗ RUSAK BERAT] (Merah, active)  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Background berubah: 🔴 Merah (#FEE2E2) │
│  Border: #EF4444 (Red)                  │
│  Icon: XCircle besar                    │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 5: TULIS CATATAN LENGKAP          │
│  ┌───────────────────────────────────┐  │
│  │ Catatan: (WAJIB untuk rusak berat)│  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ KERUSAKAN PARAH:              │ │  │
│  │ │                               │ │  │
│  │ │ 1. Lensa proyektor pecah      │ │  │
│  │ │    total (tidak bisa dipakai) │ │  │
│  │ │                               │ │  │
│  │ │ 2. Unit tidak menyala sama    │ │  │
│  │ │    sekali (dicoba 3x)         │ │  │
│  │ │                               │ │  │
│  │ │ 3. Casing retak bagian depan  │ │  │
│  │ │                               │ │  │
│  │ │ 4. Tombol Power & Focus       │ │  │
│  │ │    hilang                     │ │  │
│  │ │                               │ │  │
│  │ │ Mahasiswa: Ahmad Rizki        │ │  │
│  │ │ Kronologi: Jatuh dari meja    │ │  │
│  │ │                               │ │  │
│  │ │ STATUS: TIDAK DAPAT DIGUNAKAN │ │  │
│  │ │ REKOMENDASI: GANTI UNIT BARU  │ │  │
│  │ └───────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  STEP 6: KONFIRMASI                     │
│  Klik: "Selesaikan Pengembalian"        │
│  ❌ Sistem tampilkan ALERT:             │
│  ┌───────────────────────────────────┐  │
│  │ ⚠️ PERHATIAN!                     │  │
│  │                                   │  │
│  │ Barang rusak berat akan:          │  │
│  │ • Dicatat sebagai non-operasional │  │
│  │ • Stok berkurang permanen         │  │
│  │ • Admin akan di-notify            │  │
│  │ • Mahasiswa mungkin kena denda    │  │
│  │                                   │  │
│  │ [Batal] [✓ Lanjutkan]             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  ✓ SISTEM UPDATE                        │
│  • Status: ACTIVE → COMPLETED           │
│  • returnCondition: "damaged-heavy"     │
│  • returnNotes: "KERUSAKAN PARAH..."    │
│  • actualReturnDate: 2024-01-16         │
│  • damageFlag: true (NEW!)              │
│  • Stok FISIK: 4 → 5 unit               │
│  • Stok TERSEDIA: 4 → 4 unit (TETAP!)   │
│  • Item status: "broken" (NEW!)         │
│  • replacementNeeded: true              │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  🔴 SUCCESS WITH CRITICAL ALERT         │
│  Toast: "Pengembalian Proyektor LCD     │
│         diterima (kondisi rusak berat)" │
│                                         │
│  🚨 Auto notifications:                 │
│  • Admin: "URGENT - Barang rusak berat" │
│  • Kepala Gudang: "Perlu penggantian"   │
│  • Finance: "Estimasi biaya perbaikan"  │
│  • Mahasiswa: "Penalty notification"    │
└─────────────────────────────────────────┘
```

---

## 📊 DATA MODEL UNTUK KONDISI RUSAK

### **LoanRequest Interface (Extended):**

```typescript
interface LoanRequest {
  // ... existing fields
  
  // Return condition tracking
  returnCondition?: 'complete-good' | 'damaged-light' | 'damaged-heavy';
  returnNotes?: string;
  actualReturnDate?: string;
  receivedBy?: string;
  
  // Damage tracking (NEW!)
  damageFlag?: boolean;
  damagePhotos?: string[];           // URLs to damage photos
  damageCost?: number;                // Estimated repair/replacement cost
  penaltyAmount?: number;             // Penalty for student
  repairStatus?: 'pending' | 'in-progress' | 'completed' | 'replaced';
  replacementNeeded?: boolean;
}
```

### **Item Interface (Extended):**

```typescript
interface Item {
  // ... existing fields
  
  // Condition tracking (NEW!)
  totalStock: number;                 // Total fisik (termasuk rusak)
  availableStock: number;             // Yang bisa dipinjam
  damagedStock: number;               // Rusak ringan (perlu repair)
  brokenStock: number;                // Rusak berat (tidak bisa dipakai)
  
  status: 'available' | 'low-stock' | 'out-of-stock' | 'needs-repair' | 'broken';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}
```

---

## 🎨 UI/UX UNTUK KONDISI RUSAK

### **Visual Indicators:**

```
┌─────────────────────────────────────────┐
│  KONDISI BARANG CARDS                   │
│  ┌─────────┬─────────┬─────────┐        │
│  │   ✓     │   ⚠️    │   ✗     │        │
│  │  BAIK   │ RUSAK   │ RUSAK   │        │
│  │         │ RINGAN  │ BERAT   │        │
│  │ 🟢 #D1F │ 🟡 #FEF │ 🔴 #FEE │        │
│  └─────────┴─────────┴─────────┘        │
│                                         │
│  Selected State:                        │
│  • Border: 2px solid (color)            │
│  • Background: Light shade              │
│  • Icon: Bold, colored                  │
│  • Text: Bold, colored                  │
│                                         │
│  Unselected State:                      │
│  • Border: 2px #E2E8F0                  │
│  • Background: #F8FAFC                  │
│  • Icon: Gray (#94A3B8)                 │
│  • Text: Gray (#64748B)                 │
└─────────────────────────────────────────┘
```

### **Notes Field dengan Auto-suggestions:**

```typescript
const damageNotesSuggestions = {
  'damaged-light': [
    '• Goresan ringan di permukaan',
    '• Lecet pada kabel/casing',
    '• Cat terkelupas sedikit',
    '• Tombol agak longgar',
  ],
  'damaged-heavy': [
    '• Lensa/layar pecah',
    '• Tidak bisa menyala/berfungsi',
    '• Komponen hilang',
    '• Kerusakan struktural parah',
  ]
};
```

---

## 📋 CHECKLIST PETUGAS GUDANG

### **Saat Menerima Pengembalian:**

```
□ Scan QR Code mahasiswa
□ Verifikasi identitas (KTM/ID Card)
□ Cek jumlah unit lengkap
□ Periksa kondisi fisik:
  □ Bodi/casing utuh?
  □ Aksesoris lengkap?
  □ Ada goresan/lecet?
  □ Ada kerusakan?
□ Test fungsi (jika elektronik):
  □ Bisa menyala?
  □ Berfungsi normal?
  □ Ada error?
□ Pilih kondisi di sistem
□ Tulis catatan detail (jika rusak)
□ Upload foto kerusakan (jika ada)
□ Konfirmasi pengembalian
□ Simpan barang di lokasi yang sesuai:
  □ Baik → Rak normal
  □ Rusak Ringan → Area repair
  □ Rusak Berat → Area broken/disposal
```

---

## 🔄 FLOW SETELAH PENGEMBALIAN

### **Barang Kondisi BAIK:**
```
Pengembalian → Stok Update → Tersedia untuk dipinjam lagi
```

### **Barang RUSAK RINGAN:**
```
Pengembalian → Area Repair → Teknisi Perbaiki → Test → Tersedia lagi
```

### **Barang RUSAK BERAT:**
```
Pengembalian → Area Broken → Admin Review → Disposal/Penggantian
                                        ↓
                           Mahasiswa dapat penalty notification
```

---

## 📱 NOTIFICATION FLOW

### **Rusak Ringan:**
```
┌─────────────────────────────────────────┐
│  🟡 NOTIFIKASI KE TEKNISI               │
│  "Proyektor #2 perlu perbaikan"         │
│  Detail: Goresan lensa, kabel lecet     │
│  Priority: Medium                       │
│  ETA: 3 hari                            │
└─────────────────────────────────────────┘
```

### **Rusak Berat:**
```
┌─────────────────────────────────────────┐
│  🔴 NOTIFIKASI KE ADMIN                 │
│  "URGENT: Proyektor rusak parah"        │
│  Loan ID: LR004                         │
│  Student: Ahmad Rizki                   │
│  Damage: Lensa pecah, tidak berfungsi   │
│  Action: Perlu penggantian unit baru    │
│  Estimated cost: Rp 5.000.000           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⚠️ NOTIFIKASI KE MAHASISWA             │
│  "Barang dikembalikan rusak berat"      │
│  Detail kerusakan: ...                  │
│  Penalty: Rp 4.500.000                  │
│  Silakan hubungi admin untuk klarifikasi│
└─────────────────────────────────────────┘
```

---

## 📊 REPORTING & ANALYTICS

### **Dashboard Petugas Gudang (Enhanced):**

```
┌────────────────────────────────────────┐
│  SUMMARY CARDS                         │
│  ┌──────┬──────┬──────┬──────┐         │
│  │ Scan │Ready │Active│Damaged│         │
│  │  12  │  3   │  5   │  2   │         │
│  └──────┴──────┴──────┴──────┘         │
│                                        │
│  DAMAGE REPORT (This Month)            │
│  ┌────────────────────────────────┐    │
│  │ Total Returns: 45               │    │
│  │ • Baik: 38 (84%)               │    │
│  │ • Rusak Ringan: 5 (11%)        │    │
│  │ • Rusak Berat: 2 (5%)          │    │
│  │                                │    │
│  │ Repair Queue: 3 items          │    │
│  │ Replacement Needed: 1 item     │    │
│  │ Total Damage Cost: Rp 6.2M     │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
```

---

## 🎯 BEST PRACTICES

### **Untuk Petugas Gudang:**

1. ✅ **Selalu Test Fungsi** - Jangan hanya cek visual
2. ✅ **Foto Kerusakan** - Dokumentasi penting untuk bukti
3. ✅ **Detail di Notes** - Tulis sejelas mungkin
4. ✅ **Immediate Reporting** - Laporkan rusak berat segera
5. ✅ **Proper Storage** - Pisahkan barang rusak dari yang baik
6. ✅ **Follow Up** - Track status perbaikan

### **Untuk Admin:**

1. ✅ **Review Damage Reports** - Check setiap hari
2. ✅ **Quick Response** - Tangani rusak berat <24 jam
3. ✅ **Fair Penalty** - Sesuaikan dengan tingkat kerusakan
4. ✅ **Budget Planning** - Alokasi dana repair/replacement
5. ✅ **Prevention** - Edukasi mahasiswa tentang cara pakai

---

## 🎉 KESIMPULAN

Sistem SmartLend sekarang memiliki **complete damage tracking**:

✅ 3 Level kondisi (Baik, Rusak Ringan, Rusak Berat)
✅ Visual indicators yang jelas
✅ Mandatory notes untuk kondisi rusak
✅ Auto-notification ke stakeholders
✅ Proper stock management
✅ Damage cost tracking
✅ Penalty system
✅ Repair workflow
✅ Analytics & reporting

**Semua kerusakan tercatat dan dapat diaudit! 📝**
