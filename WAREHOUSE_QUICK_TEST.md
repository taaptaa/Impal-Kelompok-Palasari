# 🧪 QUICK TEST GUIDE - KONDISI BARANG RUSAK

## 🚀 TEST SCENARIOS

### **TEST 1: BARANG KONDISI BAIK** ✅

```bash
# Login Gudang
Email: gudang
Password: 123

# Pilih Tab
Tab: "Pengembalian"

# Input ID
ID: LR006
Klik: "Cari"

# Quality Check
✓ Pilih: "Baik" (Hijau)
✓ Catatan: (Kosongkan atau isi opsional)
✓ Klik: "Selesaikan Pengembalian"

# Expected Result
✅ Toast: "Pengembalian ... diterima (kondisi baik)"
✅ Status: COMPLETED
✅ Stok bertambah normal
```

---

### **TEST 2: BARANG RUSAK RINGAN** ⚠️

```bash
# Login Gudang
Email: gudang
Password: 123

# Input ID
ID: LR003
Klik: "Cari"

# Quality Check
⚠️ Pilih: "Rusak Ringan" (Kuning)

# Lihat Perubahan UI
✓ Background form jadi kuning muda
✓ Border merah jika notes kosong
✓ Muncul contoh catatan
✓ Placeholder berubah
✓ Background textarea pink

# Isi Catatan (WAJIB!)
Ketik:
"• Goresan di lensa kiri ~2cm
 • Kabel power lecet 5cm
 • Fungsi masih normal
 • Perlu perbaikan minor"

# Submit
✓ Klik: "Selesaikan Pengembalian"

# Expected Result
✅ Toast: "... diterima (kondisi rusak ringan)"
✅ returnCondition: "damaged-light"
✅ returnNotes tersimpan
✅ Stok kembali tapi flagged untuk repair
```

---

### **TEST 3: BARANG RUSAK BERAT** 🔴

```bash
# Login Gudang
Email: gudang
Password: 123

# Input ID
ID: LR004
Klik: "Cari"

# Quality Check
🔴 Pilih: "Rusak Berat" (Merah)

# Lihat Perubahan UI
✓ Background card merah muda
✓ Icon XCircle merah
✓ Border merah pada notes
✓ Textarea 5 baris (lebih besar)
✓ Background textarea pink
✓ Alert wajib isi muncul

# Isi Catatan Detail (WAJIB!)
Ketik:
"KERUSAKAN PARAH:

1. Lensa proyektor pecah total
2. Unit tidak menyala (dicoba 3x)
3. Casing retak bagian depan
4. Tombol Power & Focus hilang

Mahasiswa: Ahmad Rizki
Kronologi: Jatuh dari meja

STATUS: TIDAK DAPAT DIGUNAKAN
REKOMENDASI: GANTI UNIT BARU"

# Submit
✓ Klik: "Selesaikan Pengembalian"

# Expected Result
✅ Toast: "... diterima (kondisi rusak berat)"
✅ returnCondition: "damaged-heavy"
✅ returnNotes lengkap tersimpan
✅ Stok fisik kembali
✅ Stok available tidak bertambah
✅ Flag untuk replacement
```

---

## 📊 VISUAL CHECKLIST

### **Kondisi BAIK:**
```
┌─────────────────┐
│   ✓ CheckCircle │
│      BAIK       │
│   🟢 #D1FAE5    │  ← Background hijau muda
│   Border hijau  │
└─────────────────┘

Notes:
• Background: Putih
• Border: Abu (#E2E8F0)
• Placeholder: "Opsional..."
• Validation: Tidak wajib
```

### **Kondisi RUSAK RINGAN:**
```
┌─────────────────┐
│  ⚠️ AlertTriangle│
│  RUSAK RINGAN   │
│   🟡 #FEF3C7    │  ← Background kuning
│  Border orange  │
└─────────────────┘

Notes:
• Background: Pink muda (#FEF2F2)
• Border: Merah jika kosong
• Placeholder: "Jelaskan kerusakan..."
• Validation: WAJIB!
• Help box: Kuning dengan contoh
```

### **Kondisi RUSAK BERAT:**
```
┌─────────────────┐
│   ✗ XCircle     │
│   RUSAK BERAT   │
│   🔴 #FEE2E2    │  ← Background merah muda
│   Border merah  │
└─────────────────┘

Notes:
• Background: Pink (#FEF2F2)
• Border: Merah terang (#EF4444)
• Placeholder: "WAJIB: Detail lengkap..."
• Rows: 5 (lebih besar)
• Validation: WAJIB!
• Help box: Merah dengan checklist
```

---

## 🎯 VALIDATION RULES

| Kondisi | Notes Required | Min Length | Alert |
|---------|---------------|------------|-------|
| **Baik** | ❌ Optional | 0 | - |
| **Rusak Ringan** | ✅ WAJIB | 10 chars | ⚠️ Kuning |
| **Rusak Berat** | ✅ WAJIB | 20 chars | 🔴 Merah |

---

## 📱 UI STATES

### **State 1: Baik Selected**
```jsx
// Kondisi BAIK card
backgroundColor: '#D1FAE5'  // Hijau muda
borderColor: '#10B981'      // Hijau
icon color: '#10B981'       // Hijau
text color: '#10B981'       // Hijau

// Notes textarea
backgroundColor: '#FFFFFF'  // Putih
borderColor: '#E2E8F0'      // Abu
placeholder: "Opsional..."
```

### **State 2: Rusak Ringan Selected**
```jsx
// Kondisi RUSAK RINGAN card
backgroundColor: '#FEF3C7'  // Kuning muda
borderColor: '#F59E0B'      // Orange
icon color: '#F59E0B'       // Orange
text color: '#F59E0B'       // Orange

// Notes textarea
backgroundColor: '#FEF2F2'  // Pink
borderColor: notes ? '#E2E8F0' : '#EF4444'  // Merah jika kosong
placeholder: "Jelaskan kerusakan..."

// Help box
backgroundColor: '#FEF3C7'  // Kuning
text color: '#78350F'       // Coklat tua
```

### **State 3: Rusak Berat Selected**
```jsx
// Kondisi RUSAK BERAT card
backgroundColor: '#FEE2E2'  // Merah muda
borderColor: '#EF4444'      // Merah
icon color: '#EF4444'       // Merah
text color: '#EF4444'       // Merah

// Notes textarea
backgroundColor: '#FEF2F2'  // Pink
borderColor: notes ? '#E2E8F0' : '#EF4444'  // Merah terang
rows: 5                     // Lebih besar
placeholder: "WAJIB: Detail lengkap..."

// Help box
backgroundColor: '#FEE2E2'  // Merah muda
text color: '#991B1B'       // Merah tua
```

---

## 🧪 TESTING MATRIX

| Test Case | ID | Kondisi | Notes | Expected |
|-----------|----|---------|----|----------|
| TC-01 | LR006 | Baik | (kosong) | ✅ Success |
| TC-02 | LR006 | Baik | "Sempurna" | ✅ Success |
| TC-03 | LR003 | Rusak Ringan | (kosong) | ❌ Show warning |
| TC-04 | LR003 | Rusak Ringan | "Gores 2cm" | ✅ Success |
| TC-05 | LR004 | Rusak Berat | (kosong) | ❌ Show warning |
| TC-06 | LR004 | Rusak Berat | "Pecah total" | ✅ Success |

---

## 🎨 COLOR PALETTE

| Element | Baik | Rusak Ringan | Rusak Berat |
|---------|------|--------------|-------------|
| **Card BG** | #D1FAE5 | #FEF3C7 | #FEE2E2 |
| **Border** | #10B981 | #F59E0B | #EF4444 |
| **Icon** | #10B981 | #F59E0B | #EF4444 |
| **Text** | #10B981 | #F59E0B | #EF4444 |
| **Notes BG** | #FFFFFF | #FEF2F2 | #FEF2F2 |
| **Help BG** | - | #FEF3C7 | #FEE2E2 |

---

## 🔄 COMPLETE TEST FLOW

```
1. LOGIN GUDANG
   ↓
2. KLIK TAB "PENGEMBALIAN"
   ↓
3. INPUT ID: LR003
   ↓
4. KLIK "CARI"
   ↓
5. LIHAT DETAIL BARANG
   ✓ Foto
   ✓ Nama
   ✓ Peminjam
   ✓ Jumlah
   ↓
6. PILIH KONDISI: "RUSAK RINGAN"
   ✓ Card kuning ter-highlight
   ✓ Border orange
   ✓ Icon warning kuning
   ↓
7. CEK PERUBAHAN UI
   ✓ Textarea background pink
   ✓ Border merah (karena kosong)
   ✓ Help box kuning muncul
   ✓ Placeholder berubah
   ↓
8. ISI NOTES
   "Goresan di lensa kiri ~2cm"
   ↓
9. CEK VALIDATION
   ✓ Border jadi abu (valid)
   ✓ Warning hilang
   ↓
10. KLIK "SELESAIKAN PENGEMBALIAN"
   ↓
11. LIHAT TOAST
   ✅ "... diterima (kondisi rusak ringan)"
   ↓
12. VERIFY DATA
   ✓ Status: COMPLETED
   ✓ returnCondition: "damaged-light"
   ✓ returnNotes: "Goresan..."
```

---

## 🎉 SUCCESS CRITERIA

### **✅ PASS:**
- Semua 3 kondisi bisa dipilih
- Visual feedback jelas
- Validation bekerja
- Help box muncul untuk rusak
- Notes wajib diisi untuk rusak
- Border merah jika notes kosong (rusak)
- Toast message sesuai kondisi
- Data tersimpan dengan benar

### **❌ FAIL:**
- Kondisi tidak bisa dipilih
- No visual feedback
- Bisa submit rusak tanpa notes
- Help box tidak muncul
- Validation tidak jalan
- Toast message salah
- Data tidak tersimpan

---

## 📸 SCREENSHOT CHECKLIST

Ambil screenshot untuk dokumentasi:

1. ✅ Kondisi Baik selected (hijau)
2. ✅ Kondisi Rusak Ringan selected (kuning)
3. ✅ Kondisi Rusak Berat selected (merah)
4. ✅ Notes empty dengan border merah
5. ✅ Notes filled dengan validation pass
6. ✅ Help box untuk rusak ringan
7. ✅ Help box untuk rusak berat
8. ✅ Toast success untuk setiap kondisi

---

**Ready to test! 🚀** 

Gunakan panduan ini untuk memastikan semua fitur Quality Check berfungsi dengan sempurna! 🎯
