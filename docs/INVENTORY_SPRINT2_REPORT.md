# Sprint 2 — pengayaan inventaris dan kartu katalog

> Laporan ini mencatat checkpoint inventaris sebelum pengajuan nyata. Tahap berikutnya telah menambahkan form/API transaksi dan tiga kolom/indeks secara aditif dengan backup baru; lihat [laporan pengajuan](LOAN_SUBMISSION_SPRINT2.md). Pernyataan “belum tersedia” dan schema tidak berubah di sini berlaku pada checkpoint inventaris ini, bukan status terbaru.

## Hasil

Database disposable terverifikasi kini berisi **12 entri/varian barang uji**, dari sebelumnya 3. Sembilan record ditambahkan secara aditif dalam transaksi; tidak ada migrasi schema, penggantian akun/password, perubahan DB_PATH, transaksi peminjaman, atau pembayaran. Semua barang tetap memiliki `jenis=portabel`: 12 varian inventaris **bukan** 12 kategori schema.

Target yang diperiksa dan ditambah:

`database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`

Environment `DB_PATH` proses alat kosong saat audit. Karena itu path disposable yang telah diidentifikasi pada checkpoint sebelumnya diberikan eksplisit; konfigurasi/environment aplikasi tidak diganti. Pengujian API target menggunakan server ephemeral dari `makeServer` dengan koneksi SQLite hanya-baca, bukan asumsi bahwa proses aplikasi lain memakai path ini.

## Audit awal

- `barang`: `id_barang INT PRIMARY KEY`, `kode_barang VARCHAR(20) NOT NULL UNIQUE`, `nama_barang VARCHAR(80) NOT NULL`, `jenis VARCHAR(15) NOT NULL`, `satuan VARCHAR(20) NOT NULL`, `stok_total INT NOT NULL CHECK (stok_total >= 0)`.
- Constraint `jenis` hanya menerima `portabel` atau `tetap`. Tidak ada field foto, URL gambar, kategori elektronik, atau stok tersedia.
- GET `/api/catalog` sudah membaca seluruh `barang ORDER BY id_barang` beserta ruangan. Backend dan model enam field tidak perlu diubah untuk penambahan inventaris.
- Awal: 3 barang sesuai baseline, 3 akun role mahasiswa/admin/petugas, integritas `ok`, nol pelanggaran FK.
- Aset lokal hanya logo dan latar kampus. Kartu legacy menggunakan model fixture/URL eksternal dan stok tersedia; dipertahankan untuk kompatibilitas, **tidak dipakai sebagai sumber data katalog live**.
- Figma Make tidak didukung oleh tool sesi Figma yang tersedia. Adaptasi dilakukan pada source `ItemCard` existing; tidak ada klaim sinkronisasi atau perubahan file Figma sumber.

## Inventaris sebelum dan sesudah

Seluruh nama di bawah berakhiran `(Uji)`, satuan `unit`, jenis `portabel`.

| ID | Kode | Nama | Stok sebelum | Stok sesudah |
| --- | --- | --- | ---: | ---: |
| 9001 | UJI-PRJ-01 | Proyektor (Uji) | 3 | 3 |
| 9002 | UJI-HDM-01 | Kabel HDMI (Uji) | 5 | 5 |
| 9003 | UJI-SPK-01 | Speaker Portable (Uji) | 2 | 2 |
| 9004 | UJI-MIC-01 | Mikrofon Wireless (Uji) | — | 4 |
| 9005 | UJI-KRS-01 | Kursi Lipat (Uji) | — | 35 |
| 9006 | UJI-MJL-01 | Meja Lipat (Uji) | — | 10 |
| 9007 | UJI-TRP-01 | Tripod (Uji) | — | 6 |
| 9008 | UJI-KMR-01 | Kamera (Uji) | — | 3 |
| 9009 | UJI-KRL-01 | Kabel Roll (Uji) | — | 8 |
| 9010 | UJI-PTR-01 | Pointer Presentasi (Uji) | — | 6 |
| 9011 | UJI-WBD-01 | Whiteboard Portable (Uji) | — | 4 |
| 9012 | UJI-HDX-01 | Extension HDMI (Uji) | — | 5 |

`—` berarti record belum ada, bukan stok nol.

## Perlindungan data dan backup

Backup sebelum insert:

`database/backups/inventory-before-1795071065863-7a226fc3-b6c1-42e8-a6a4-8b91d9ce9f8c.sqlite`

Metadata audit: path yang sama ditambah `.audit.json`.

- Prosedur default hanya-baca; memeriksa path existing berlabel disposable, identitas akun, tiga barang baseline, integritas, FK, schema dan konflik kode.
- Backup menggunakan snapshot SQLite `VACUUM main INTO`, bukan copy mentah file SQLite yang dapat mengabaikan WAL. Fingerprint schema/seluruh tabel pada snapshot diverifikasi sebelum penulisan.
- Hanya `INSERT barang` dalam `BEGIN IMMEDIATE`; jika data berubah sesudah backup, konflik, atau insert gagal, transaksi ditolak/rollback. Record identik yang sudah ada dilewati, bukan di-update.
- Penerapan pertama: `inserted=9`, `skipped=0`. Pengulangan pada **target yang sama**: `inserted=0`, `skipped=9`, total tetap 12, tidak membuat backup baru yang tidak diperlukan.
- Verifikasi independen `tests/inventory-preservation.mjs` membuka target dan backup dengan `readOnly:true`, membandingkan schema serta isi seluruh 13 tabel selain `barang`, tiga record lama, dan tambahan terhadap manifest audit. Hasil **PASS**: seluruh akun termasuk hash password identik; hanya sembilan insert barang; integritas `ok`, nol pelanggaran FK.
- Backup berisi data sensitif/hash akun. Disimpan lokal di luar `dist`; tidak ditampilkan API/frontend dan tidak dicetak ke log. Jangan unggah atau bagikan. `chmod(0600)` bukan jaminan ACL privat pada Windows; ACL yang diperiksa masih mewarisi akses pemilik, SYSTEM, Administrators, dan grup sandbox lokal. Backup tidak terenkripsi.

### Prosedur audit/pengulangan (PowerShell)

Tidak perlu menjalankan ulang untuk memakai katalog yang sudah berisi 12 barang. Jangan mengganti path dengan database yang belum diidentifikasi.

```powershell
node tools/add-test-inventory.mjs --database 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite'
```

Setelah audit dan dengan izin penambahan yang sesuai, mode apply memerlukan konfirmasi eksplisit:

```powershell
node tools/add-test-inventory.mjs --database 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite' --apply --confirm ADD_SYNTHETIC_INVENTORY
```

Kode existing yang isinya berbeda ditolak tanpa ditimpa. Jangan mengedit manifest untuk memperbarui data lama.

## Implementasi UI

- `ItemCard` mendapatkan mode katalog API, tanpa menghapus mode legacy. Grid 1 kolom ponsel, 2 tablet, 3 desktop; nama, kode, jenis, penanda data uji, stok total, ketersediaan, jumlah, Detail, dan Tambah ke Rencana.
- `InventoryVisual` menggunakan placeholder lokal konsisten berlabel **Foto belum tersedia**, tanpa URL foto rekaan atau fetch gambar eksternal. Tidak menambah kolom gambar.
- Search nama/kode/jenis case-insensitive, trim spasi, empty state, filter dari nilai `jenis` aktual API dan reset gabungan. Fixture memori memiliki dua jenis agar filter tidak hanya diuji pada satu nilai.
- Home live tetap memakai komposisi existing dan empat barang pertama API; hanya visual generik diganti placeholder jujur. Tidak merombak Home/dashboard.
- Rencana tetap draft state tab: multi-barang, update/hapus, ID tidak duplikat, validasi bilangan bulat positif sampai batas stok total. Stok tidak dikurangi, tidak ada reservasi atau pengajuan sukses palsu.
- Notifikasi sukses memakai ID stabil agar tidak bertumpuk, lalu ditutup saat membuka Detail supaya tidak menutupi modal di layar kecil. Feedback `role=status` tetap tersedia.

## Pengujian aktual

| Pemeriksaan | Hasil | Bukti/cakupan |
| --- | --- | --- |
| Tiga barang lama, kode unik, sembilan tambahan tersimpan | PASS | Perbandingan read-only target/backup; 3 → 12, tiga stok tetap 3/5/2 |
| Idempotency pada target | PASS | Apply ulang: 0 insert, 9 skip, tetap 12 |
| Rollback konflik/gagal tengah paket, snapshot WAL, target/konfirmasi salah | PASS | `tests/inventory.test.mjs`, fixture terpisah |
| Seluruh akun/hash dan tabel lain tidak berubah; tanpa perubahan schema | PASS | `tests/inventory-preservation.mjs`, perbandingan isi bukan hanya jumlah |
| API target mengembalikan seluruh 12 barang dan nilai persis | PASS | `tests/browser-item-detail.mjs`, koneksi target hanya-baca |
| Home membaca data API; Home search → katalog | PASS | `tests/browser-smoke.mjs` dan `tests/browser-auth-navigation.mjs`, SQLite memori/password sintetis |
| Search nama/kode/jenis case-insensitive, barang baru, empty state | PASS | Browser target: `mIkRoFoN`, `uji-kmr-01`, `PoRtAbEl`, query tanpa hasil |
| Filter jenis dan reset gabungan | PASS | Target portabel; fixture memori portabel/tetap termasuk kombinasi filter tanpa hasil |
| Detail seluruh barang lama/baru | PASS | Seluruh 12 di lima viewport; isi/stok, fokus, Tutup, Escape, overlay, scroll teks panjang |
| Rencana multi-barang, update/hapus, tanpa duplikasi | PASS | Barang lama serta Mikrofon/Kamera; draft bertahan antarhalaman |
| Jumlah 0, negatif, pecahan, melebihi total ditolak | PASS | Browser target, draft valid sebelumnya tetap tersimpan |
| Stok/data tidak berubah setelah draft dan Detail | PASS | Fingerprint seluruh database target sebelum/sesudah uji identik |
| Grid/overflow desktop, tablet, mobile | PASS | 1440×900, 768×1024, 390×844, 320×568, 640×320; screenshot juga diperiksa |
| Login/password salah, tujuan role, refresh, logout, akses tidak sah | PASS | AC-01–24 browser; 3 role pada 1440/390/320; database memori, bukan login mutatif pada target |
| Build produksi | PASS | `npm run build` (Vite 6.3.5) |
| Suite backend | PASS | `npm run test:backend`: 28/28, tanpa skip |
| TypeScript checker/linter terpisah | NOT TESTED | Tidak ada script pemeriksaan tersebut; Vite build bukan pemeriksaan tipe penuh |
| Login memakai password pemilik di database target | NOT TESTED | Tidak meminta/mengganti password atau membuat sesi target; hash akun terbukti identik, alur tiga role diuji di memori |
| Pengajuan/reservasi/approval/pembayaran nyata | NOT TESTED | Belum diimplementasikan, bukan cakupan tugas |

Catatan eksekusi: satu pengulangan smoke saat tiga Chrome berjalan paralel mengalami **FAIL timeout** menunggu halaman anonim. Pengulangan perintah yang sama secara terpisah **PASS**, tanpa perubahan assertion; penyebab timeout belum dipastikan. Suite smoke sebelumnya juga PASS. Jangan menganggap run paralel tersebut lulus.

Perintah yang dijalankan:

```powershell
npm run build
npm run test:backend
node tests/browser-auth-navigation.mjs
node tests/browser-smoke.mjs
$env:SMARTLEND_MODAL_TEST_DB = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
node tests/browser-item-detail.mjs
node tests/inventory-preservation.mjs 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite' 'database/backups/inventory-before-1795071065863-7a226fc3-b6c1-42e8-a6a4-8b91d9ce9f8c.sqlite'
```

Screenshot final lokal:

- Katalog/Detail/Rencana: `C:\Users\apta3\AppData\Local\Temp\opencode\smartlend-modal-vVxbVA`
- Smoke: `C:\Users\apta3\AppData\Local\Temp\opencode\smartlend-browser-IO65Vu`
- Autentikasi/navigasi: `C:\Users\apta3\AppData\Local\Temp\opencode\smartlend-auth-flow-GtpHLC`

## File yang berubah/ditambahkan pada tugas ini

- `src/app/screens/CatalogScreen.tsx`
- `src/app/components/ItemCard.tsx`
- `src/app/components/InventoryVisual.tsx` (baru)
- `src/app/screens/HomeScreen.tsx` (placeholder live saja)
- `tools/add-test-inventory.mjs` (baru)
- `tests/inventory.test.mjs` (baru)
- `tests/inventory-preservation.mjs` (baru)
- `tests/browser-item-detail.mjs`
- `tests/browser-smoke.mjs`
- `tests/browser-auth-navigation.mjs`
- `package.json` (menambahkan suite inventaris ke script backend; tanpa dependensi baru)
- `docs/INVENTORY_SPRINT2_REPORT.md` (baru), `docs/SPRINT2_STATUS.md`
- Output `dist/` dibangun ulang; target SQLite mendapat sembilan insert; backup dan metadata lokal dibuat. Tes provisioning/inventaris juga membuat file fixture disposable sendiri, tidak menimpa database target.

Tidak mengubah backend autentikasi/otorisasi, API katalog, schema, konfigurasi OpenCode/router, atau melakukan operasi Git.

## Kesiapan Order Use Case

**Siap untuk pengujian frontend pemilihan inventaris dan penyusunan draft multi-barang**, serta menjadi input pengembangan Form Ajukan Peminjaman Sprint 2. Belum siap sebagai transaksi end-to-end: form/endpoint pengajuan, validasi jadwal/kondisi/ketersediaan oleh server, penyimpanan transaksi dan approval belum tersedia. Draft hilang saat refresh/logout; tidak mengunci stok.

Foto asli dapat diusulkan kemudian dengan persetujuan sumber aset dan kontrak data; tidak diperlukan migrasi untuk placeholder saat ini. Integrasi backend pengajuan dan aturan ketersediaan harus menjadi tugas terpisah yang disetujui, bukan diasumsikan sudah selesai di katalog.
