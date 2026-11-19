# Audit dan integrasi Home SmartLend

> **Koreksi akses terbaru:** Home publik pada checkpoint integrasi di bawah sudah dikoreksi sesuai spesifikasi role. Tanpa sesi, entry dan logout kembali ke pemilihan role; Home hanya setelah login, sedangkan katalog publik terpisah tetap tersedia. Detail kondisi terkini dan bukti pengujian: `ROLE_NAVIGATION_REPORT.md`. Bagian berikut dipertahankan sebagai catatan audit integrasi sebelumnya.

## Audit sebelum perubahan

| Komponen | Kondisi awal checkpoint | Integrasi minimal |
|---|---|---|
| `App.tsx` | State React untuk pemilihan role/login/katalog/MainApp; tidak memakai router URL. Data barang disimpan, respons ruangan diabaikan. | Home publik sebagai entry; simpan kedua bagian respons API; pertahankan state rencana bersama dan login backend. |
| `MainApp.tsx` | Admin/Petugas masuk dashboard hanya-baca, mahasiswa langsung katalog. | Sambungkan Home, barang, ruangan, akun dan akses rencana; dashboard tetap tersedia hanya bagi role internal. |
| `HomeScreen.tsx` | Ada tetapi tidak aktif. Header merah, pencarian, statistik dan kartu lama bergantung tipe prototipe, termasuk QR/pengembalian. | Pakai komposisi existing dalam mode katalog live. Hitung jumlah **jenis barang/ruangan tercatat/draft**, bukan pinjaman atau stok tersedia; jangan jalankan transaksi legacy. |
| `Navbar.tsx` | Ada tetapi tidak aktif; link `href="#"` dan notifikasi tidak melakukan aksi. | Callback navigasi nyata, indikator halaman aktif, Akun/Masuk/Logout; tidak tampilkan badge notifikasi palsu. |
| `BottomNav.tsx` | Ada tetapi tidak aktif; Home/Katalog/Riwayat/Notifikasi/Bantuan. | Pakai kembali navigasi mobile untuk Home/Barang/Ruangan/Rencana/Akun. Riwayat/notifikasi tidak diaktifkan tanpa backend. |
| `CatalogScreen.tsx` | API, Detail dan Tambah ke Rencana sudah aktif. | Tidak mengganti alurnya; tambahkan penerimaan query Home dan akses langsung ke ringkasan rencana. |
| `ProfileScreen.tsx` | Ada tetapi tidak aktif. Memuat telepon contoh, klaim SSO, denda, support dan QR yang belum terverifikasi. | Mode profil sesi menampilkan nama/email/role dari backend atau status pengunjung tanpa pseudo-user. Bantuan mengikuti fitur yang benar-benar tersedia. |
| Ruangan | Model `CatalogRoom`, tabel dan GET `/api/catalog` sudah ada. Daftar hanya ada di `LiveCatalogScreen` yang tidak lagi dipakai. Tidak ada screen ruangan Figma terpisah dalam source. | Screen tipis `RoomCatalogScreen` memakai daftar existing dan gaya komponen katalog/Home; data dari API atau empty/error state, tanpa booking. |
| `Header`, `Sidebar`, `ItemCard`, modal transaksi, riwayat/notifikasi/registrasi lama | Masih tersimpan sebagai komponen alternatif/prototipe. | Tidak disambungkan hanya agar terlihat lengkap; jangan klaim stok, transaksi, akun atau keberhasilan dari fixture. |

## Perilaku yang dipertahankan

- Pencarian Home meneruskan teks ke filter katalog barang yang sudah ada. Filter bisa diedit/reset di katalog. Kartu Home membuka katalog dengan kode barang yang sesuai; bukan halaman stok fixture.
- Home, katalog barang, katalog ruangan, dan draft rencana tersedia bagi pengunjung tanpa akun. Akun publik menjelaskan status belum login dan menyediakan akses ke form login internal existing.
- Setelah login Admin/Petugas, dashboard per role tetap menjadi tampilan awal. Home/profil/katalog tetap bisa dibuka tanpa menghilangkan sesi; otorisasi endpoint tetap dilakukan backend.
- Rencana disimpan sekali dalam state `App.tsx`, sehingga tidak hilang ketika berpindah Home, katalog, ruangan atau profil. Akses Rencana membuka ringkasan dan memindahkan fokus; tambah/edit/hapus dan modal Detail memakai implementasi yang sudah diuji.
- Profil hanya-baca. Tidak ada nomor telepon, tarif/denda, dukungan 24/7 atau kontak contoh yang disajikan sebagai data nyata.
- Status operasional ruangan **bukan** ketersediaan jadwal. Barang dan jadwal ruangan tetap **Belum diverifikasi**. Database yang belum berisi ruangan menampilkan empty state tanpa seed.

## Batas scope

Navigasi masih state React existing, **bukan** routing URL/deep-link atau riwayat tombol Back browser. Refresh mengembalikan Home publik/dashboard role dan menghapus draft in-memory. Tidak ada dependensi router baru, migrasi, perubahan akun/password, atau inventaris. Pengajuan, approval nyata, reservasi, edit profil, notifikasi, dan riwayat transaksi belum punya API yang terintegrasi.

Komponen legacy tetap tersimpan untuk referensi. Hanya mode live/sesi yang dipanggil dari `MainApp`; data mock dan kontrol transaksi legacy tidak diaktifkan.

## Verifikasi

```powershell
npm run build
node --test tests/auth.test.mjs tests/catalog.test.mjs tests/plan.test.mjs
node tests/browser-smoke.mjs
# Koneksi readOnly untuk dataset pengguna (tanpa openDb/seed/DDL):
$env:SMARTLEND_MODAL_TEST_DB = 'C:\lokasi\database-uji.sqlite'
node tests/browser-item-detail.mjs
```

Tes smoke memakai SQLite memori dan ruangan sintetis terpisah untuk memverifikasi hasil nonempty/search; tidak memasukkan ruangan ke database pengguna. Tes read-only menggunakan dataset pengguna untuk Home/nav/profil pengunjung/ruangan/draft/Detail pada 1440×900, 390×844, 320×568 dan 640×320; memeriksa stok serta jumlah akun sebelum/sesudah. Profil tiga role memakai sesi sintetis dalam pengujian browser/API, bukan password akun pengguna.
