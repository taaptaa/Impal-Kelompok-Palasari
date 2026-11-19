# Sprint 2 — status implementasi dan cara uji lokal

## Sumber data dan batasan

- Backend `backend/` dan `database/schema.sqlite.sql` diadaptasi dari paket Sprint 1 dalam `SmartLend_Kode_Database_dan_Laporan.zip`. Login memverifikasi hash scrypt dan peran di SQLite, memakai cookie HttpOnly/SameSite, batas percobaan, dan CSRF untuk logout/pengajuan. Akun **tidak** dibuat otomatis.
- Database aplikasi aktif adalah **SQLite terpisah**, bukan server MariaDB dari `smartlend_tubes.sql`. Dump lama, akun lama, dan data bisnisnya tidak dipindahkan atau diubah. Katalog GET membaca tabel `barang` dan `ruangan` dari DB_PATH yang ditentukan operator. Database baru akan kosong sampai data sah dimasukkan melalui proses yang disetujui.
- Tidak ada klaim stok tersedia: `stok_total` hanya jumlah total; jadwal, kondisi fisik, dan pemakaian aktif belum dihitung. Rencana multi-barang hanya state tab yang belum dikirim dan tidak mengunci stok.
- Pengayaan katalog pada disposable terverifikasi sudah dilakukan: 3 → 12 varian barang uji, kartu responsif/placeholder tanpa migrasi, search/filter dan Detail/draft teruji. Akun dan data lama identik terhadap backup sebelum insert. Lihat [laporan inventaris Sprint 2](INVENTORY_SPRINT2_REPORT.md) untuk path target/backup, manifest, hasil tes dan batasan; ini tidak mengisi database lain secara otomatis.
- **Pengajuan barang mahasiswa kini tersedia:** form multi-barang, POST/GET berotorisasi, commit atomik, idempotency dan Peminjaman Saya dari database. Status awal `menunggu`; tidak mengurangi stok/mereservasi/menyetujui barang. Target disposable telah mendapat migrasi eksplisit tiga kolom/indeks dengan backup dan verifikasi data identik. Lihat [laporan pengajuan](LOAN_SUBMISSION_SPRINT2.md), termasuk perintah menjalankan **database existing tanpa seed atau mengubah DB_PATH**.
- Alur awal tanpa sesi kembali ke pemilihan role. Home mahasiswa hanya muncul sesudah autentikasi/pemulihan sesi; Admin/Petugas masuk dashboard hanya-baca per role. Katalog publik (barang, ruangan dan draft) tetap dapat dibuka secara eksplisit, tanpa Home/profil/dashboard. Navbar/BottomNav membedakan konteks publik dan login; logout sukses membersihkan user/draft dan kembali ke pemilihan role. Lihat [koreksi navigasi role](ROLE_NAVIGATION_REPORT.md) dan [audit integrasi Home sebelumnya](HOME_INTEGRATION_AUDIT.md). Statistik transaksi yang belum terhubung tetap `—`; tidak ada registrasi publik atau transaksi mock yang diaktifkan.
- Skema SQLite baru dibentuk pada saat membuka DB_PATH yang eksplisit; tidak ada migrasi otomatis terhadap MariaDB maupun rancangan publik. Jangan arahkan DB_PATH ke database existing tanpa audit dan backup terpisah.

## Menjalankan secara lokal (PowerShell)

Pengujian aktual berhasil pada Node 22.13.1 dengan peringatan eksperimental `node:sqlite`. Gunakan database existing yang telah diverifikasi, bukan path contoh ke file baru. Panduan lengkap dan alternatif path eksplisit ada di [laporan pengajuan bagian J](LOAN_SUBMISSION_SPRINT2.md).

```powershell
if (-not $env:DB_PATH -or -not (Test-Path -LiteralPath $env:DB_PATH -PathType Leaf)) { throw 'Gunakan DB_PATH existing terverifikasi; jangan membuat database baru.' }
$env:APP_ORIGIN='http://127.0.0.1:5173'
npm run server
```

```powershell
npm run dev -- --host 127.0.0.1
```

Buka `http://127.0.0.1:5173`. Proxy Vite meneruskan `/api` ke backend di `127.0.0.1:3000`. Nilai `APP_ORIGIN` harus tepat sama dengan origin browser untuk POST. Untuk server yang langsung menyajikan hasil `npm run build` pada port 3000, gunakan `APP_ORIGIN=http://127.0.0.1:3000`. Gunakan tiga akun/password existing; **jangan menjalankan provisioning/seed pada target**. Panduan provisioning `TEST_ACCOUNTS.md` hanya untuk tugas terpisah yang secara eksplisit mengizinkan database baru. Seed tidak dijalankan otomatis saat aplikasi dimulai dan menolak existing.

## Pemeriksaan dan keputusan yang diperlukan

- Tes backend/draft memakai SQLite `:memory:`; tes provisioning membuat file **baru** berlabel disposable tanpa mengubah database lama. Jalankan `npm run test:backend`. Build frontend: `npm run build` setelah `npm ci`. Uji browser opsional: `node tests/browser-smoke.mjs` memakai Chrome lokal, tiga password sintetis acak, SQLite `:memory:`, serta profil/screenshot sementara di `%LOCALAPPDATA%\Temp\opencode`. Uji ini tidak memakai database produksi.
- Rekomendasi target utama adalah MariaDB setelah persetujuan tim: dump `smartlend_tubes.sql` dan rencana awal Sprint 0/SRS/DPPL memakai MySQL/MariaDB; SQLite bukan keputusan migrasi permanen. Backend saat ini **hanya** mendukung SQLite. Rancangan identitas publik/pembayaran di `SPRINT2_MIGRATION_PROPOSAL.md` **belum diterapkan**; jangan menyamakannya dengan migrasi metadata pengajuan mahasiswa yang sudah diterapkan terpisah. Target final, aturan publik dan persetujuan paket tetap memerlukan keputusan pemilik.
- Sebelum produksi diperlukan HTTPS, pemisahan akun/credential demo, peninjauan keamanan, backup, pengujian browser desktop/mobile dan concurrency serta izin integrasi data nyata.
