# Sprint 2 — Form Pengajuan dan Transaksi Barang

## A. Ringkasan implementasi

Alur yang tersedia: **Login Mahasiswa → Katalog → Rencana → Ajukan Peminjaman → form WIB/keperluan → validasi backend → commit header/detail → konfirmasi → Peminjaman Saya/detail**.

Pengajuan multi-barang disimpan secara atomik dengan status resmi `menunggu`. Riwayat/detail dibaca dari backend, termasuk setelah refresh melalui tautan `#loans` atau `#loans/:id`. Tidak ada mock transaksi yang ditampilkan sebagai transaksi nyata.

Tidak mengaktifkan approval, serah terima, pengembalian, pembayaran, QRIS, reservasi, pengurangan stok, registrasi Umum/Dosen/Staf, atau tarif. Tidak mengganti arsitektur, autentikasi, database, atau DB_PATH.

## B. Audit sebelum perubahan

### Frontend dan komponen

- `App.tsx` memulihkan sesi dari `/api/me`, memuat katalog dari `/api/catalog`, serta menyimpan `plan: Record<id_barang, jumlah>` di state. Logout sukses membersihkan sesi UI/draft.
- `MainApp.tsx` mengelola navigasi existing tanpa router baru. Identitas `User` berasal dari respons sesi/login yang diverifikasi, bukan field form.
- `CatalogScreen.tsx`, `ItemCard`, `InventoryVisual` sudah menampilkan katalog API, search/filter, Detail, dan draft multi-barang.
- `Navbar`/`BottomNav` membedakan konteks publik/internal. Home mahasiswa hanya sesudah sesi terverifikasi.
- `LoanModal.tsx` dan `HistoryScreen.tsx` adalah source prototipe satu-barang/model status Inggris dengan foto/QR. Tidak diaktifkan untuk transaksi live. Form baru memakai ulang `ui/input`, `ui/textarea`, `ui/button`, gaya kartu dan palet SmartLend; bukan mengganti seluruh UI.
- `ProfileScreen` memiliki bantuan live terpisah dari konten prototipe. Copy live diperbarui sesuai fitur yang kini tersedia.
- Dokumen `docs/PRD.md`, `docs/DESIGN_SYSTEM.md`, dan `docs/USER_FLOWS.md` tidak ada. Tidak ditemukan aturan durasi maksimum yang sah; angka tujuh hari pada copy prototipe bukan dasar kebijakan backend.
- Tool sesi Figma menolak file Make sumber (`myW28RLuyQZMbBMsZzaDND`). Implementasi mengikuti source komponen SmartLend existing; tidak mengklaim file Figma diedit/sinkron.

### Backend dan keamanan

Sebelumnya tersedia GET katalog/sesi/admin serta POST login/logout. `AuthService.current` memverifikasi cookie, masa berlaku sesi, akun aktif, dan role dari database. Login memakai scrypt, rotasi sesi, dan pembatasan percobaan. Logout memerlukan CSRF. Server memeriksa Origin, format JSON, serta batas body.

Mekanisme tersebut dipertahankan. Endpoint baru memakai identitas/role dari fungsi sesi yang sama; tidak menerima user ID/status dari klien. `backend/auth.mjs`, provisioning akun, dan `backend/db.mjs` tidak diubah.

### Schema dan data target

Target existing yang diidentifikasi dan diperiksa **read-only terlebih dahulu**:

`database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`

Environment `DB_PATH` pada proses alat tidak diisi. Path target diberikan eksplisit; tidak mengubah environment/config DB_PATH, tidak mengganti database otoritatif.

Awal: **3 akun, 12 barang, 0 peminjaman, 0 detail barang**; integritas `ok`, tanpa pelanggaran foreign key. Seluruh kode/nama/jenis/satuan/stok 12 barang cocok baseline tugas sebelumnya.

`peminjaman` existing:

| Kolom | Aturan existing |
| --- | --- |
| id_peminjaman | INT PRIMARY KEY, bukan alias INTEGER rowid |
| kode_peminjaman | VARCHAR(25), NOT NULL, UNIQUE |
| id_peminjam | NOT NULL, FK pengguna |
| id_admin | Nullable, FK pengguna |
| waktu_mulai / waktu_selesai | NOT NULL; CHECK selesai > mulai |
| keperluan | VARCHAR(150), NOT NULL; panjang juga ditegakkan oleh API |
| status | menunggu/disetujui/ditolak/dipinjam/selesai/dibatalkan |

`detail_barang`: PK gabungan `(id_peminjaman,id_barang)`, FK ke header dan barang, `jumlah > 0`. Sudah mendukung satu header dengan banyak barang. API menambahkan validasi integer karena affinity INT SQLite sendiri bukan pemeriksaan tipe integer penuh.

Kekurangan: timestamp pembuatan serta penyimpanan key/hash untuk idempotency. Tidak perlu tabel transaksi baru, perubahan relasi pemilik, atau migrasi ke MariaDB.

Audit awal dan rencana minimal dilaporkan sebelum coding. Risiko utama yang ditangani: kebocoran antar pengguna, spoof identitas/status, header tanpa detail akibat kegagalan sebagian, nomor duplikat, dan retry setelah commit tetapi respons hilang.

## C. Perubahan frontend

| File | Fungsi |
| --- | --- |
| `src/app/screens/LoanFormScreen.tsx` (baru) | Identitas sesi, ringkasan seluruh barang, periode WIB, keperluan, validasi per field/fokus error, loading, snapshot retry |
| `src/app/screens/MyLoansScreen.tsx` (baru) | Daftar/detail dari API; empty/loading/error/retry; konfirmasi respons POST yang telah commit |
| `src/app/components/LoanSummary.tsx` (baru) | Label status schema, ringkasan tersimpan, format Asia/Jakarta, pemberitahuan bukan reservasi |
| `src/app/loan-validation.mjs` (baru) | Kontrak validasi bersama UI/server, konversi WIB ke UTC tanpa bergantung zona perangkat |
| `src/app/api.ts` | Client POST/GET, pengambilan CSRF dari sesi, pemeriksaan akun sebelum POST, ApiError/field errors, tipe transaksi terpisah dari prototype |
| `src/app/App.tsx`, `src/app/plan.mjs` | Clear selektif setelah sukses; hanya jumlah yang sama dengan snapshot kiriman dihapus |
| `src/app/screens/MainApp.tsx`, `src/app/navigation.ts` | Form/riwayat mahasiswa, detail hash-link/refresh dan perubahan hash; draft form tetap selama navigasi dalam sesi UI |
| `src/app/screens/CatalogScreen.tsx` | Ajukan Peminjaman hanya mahasiswa; disabled jika draft kosong/loading/error |
| `src/app/components/Navbar.tsx`, `BottomNav.tsx` | Navigasi Peminjaman Saya/Pengajuan khusus mahasiswa |
| `src/app/screens/HomeScreen.tsx`, `ProfileScreen.tsx` | Copy integrasi diperbarui saja; komposisi Home/dashboard tidak dirombak |

Rencana publik tetap draft, bukan hak mengirim transaksi. Admin/Petugas tidak ditawarkan form mahasiswa. Tidak menambahkan tombol Batal/Setujui/Kembalikan.

Saat gagal, draft tidak dibersihkan dan tidak ada nomor palsu. Request yang hasilnya belum pasti dikunci ke payload/key yang sama; navigasi kembali ke Rencana/form tidak mengganti key. Kesalahan validasi 400 yang pasti belum commit membuka kembali field untuk koreksi. Setelah sukses, clear selektif menjaga perubahan Rencana yang mungkin terjadi ketika request sedang berjalan.

Draft dan snapshot retry berada di state memori, bukan penyimpanan permanen. Refresh/logout menghilangkan draft yang belum dikirim; **transaksi yang sudah commit tetap dapat dibaca melalui Peminjaman Saya**. Jika halaman ditutup saat respons tidak pasti, periksa riwayat dahulu sebelum membuat pengajuan baru dengan key baru.

## D. API backend

File: `backend/loans.mjs` (baru), `backend/loan-schema.mjs` (baru), `backend/server.mjs`.

| Endpoint | Akses | Hasil |
| --- | --- | --- |
| POST `/api/loans` | Student, cookie valid, Origin sesuai, JSON, CSRF | 201 commit baru / 200 replay tersimpan |
| GET `/api/loans/mine` | Student, cookie valid | `{loans:[...]}`, hanya pemilik sesi |
| GET `/api/loans/:id` | Student, cookie valid | `{loan:...}`, filter ID **dan** pemilik di SQL |

Header POST: `Idempotency-Key: <UUID v4>`, `X-CSRF-Token`, `Content-Type: application/json`. Body hanya:

```json
{
  "items": [{"itemId": 9001, "quantity": 2}, {"itemId": 9004, "quantity": 1}],
  "startsAt": "2030-01-02T03:00:00.000Z",
  "endsAt": "2030-01-02T10:00:00.000Z",
  "reason": "UJI — kegiatan akademik sintetis"
}
```

Contoh di atas adalah format kontrak, bukan klaim transaksi yang dibuat pada target.

- Identitas/role/status/nomor ditetapkan backend. Field tambahan seperti `id_peminjam`, `userId`, atau `status` ditolak, bukan diabaikan diam-diam.
- Barang minimal satu, ID integer positif/unik, jumlah integer positif/aman dan ≤ stok total aktual yang dibaca di transaksi. ID asing, pecahan, nol, negatif, dan duplikasi ditolak.
- Waktu wire harus ISO UTC kanonik dengan `Z`; input UI datetime-local selalu ditafsir sebagai Asia/Jakarta UTC+07:00. Tanggal tidak nyata/normalisasi Februari ditolak. Selesai harus setelah mulai; pengajuan baru tidak boleh mulai di masa lalu saat diproses.
- Keperluan trim, wajib, maksimal 150 karakter sesuai field schema. **Tidak ada batas maksimum durasi baru.**
- Batas teknis request: 16 KiB UTF-8, maksimal 100 entri dan integer jumlah sampai 2147483647; bukan kebijakan durasi atau ketersediaan. Login/logout tetap memakai batas 4 KiB.
- Error aman: 400 invalid/field errors, 401 tanpa sesi, 403 role/CSRF/Origin/format, 404 tidak ada/bukan milik pengguna, 409 key sama payload berbeda, 413 body terlalu besar, 503 schema belum diaktifkan/database sibuk, 500 kegagalan internal tanpa stack trace.
- Respons tidak memuat password/hash akun, key/hash request, token sesi, atau data pengguna lain.

## E. Database, atomicity dan migrasi eksplisit

`database/schema.sqlite.sql` **tidak diganti**. Migrasi `database/migrations/001-loan-submission.sql` menambah:

```sql
ALTER TABLE peminjaman ADD COLUMN dibuat_pada TEXT;
ALTER TABLE peminjaman ADD COLUMN request_key TEXT
  CHECK (request_key IS NULL OR length(request_key) = 36);
ALTER TABLE peminjaman ADD COLUMN request_hash TEXT
  CHECK (request_hash IS NULL OR length(request_hash) = 64);
CREATE UNIQUE INDEX peminjaman_request_unique
  ON peminjaman(id_peminjam, request_key) WHERE request_key IS NOT NULL;
```

Nullable untuk mempertahankan kompatibilitas record lama. Timestamp lama tidak dikarang/backfill; UI menampilkan `Tidak tercatat` jika null. Semua pengajuan API baru mengisi tiga field.

Migrasi tidak dipanggil startup/server/openDb. `tools/enable-loan-submissions.mjs` default hanya audit; apply memerlukan target disposable existing terverifikasi dan `ENABLE_LOAN_SUBMISSIONS`. Pemeriksaan: path tanpa symlink, tiga identitas akun, 12 inventaris baseline, integritas/FK, profil schema. Backup konsisten termasuk WAL diverifikasi fingerprint-nya sebelum `BEGIN IMMEDIATE`. Jika sumber berubah setelah backup, proses ditolak. Perubahan data tak terduga atau DDL gagal menyebabkan rollback transaksi, bukan restore/reset seluruh database.

**Penerapan aktual target berhasil**, dengan backup lokal:

`database/backups/loans-before-1795074865479-66a51b1d-78c2-474e-a049-7e34fc766667.sqlite`

Metadata audit: file yang sama ditambah `.audit.json`. Apply kedua menghasilkan `changed:false`, `backup:null` (idempotent).

### Penyimpanan pengajuan

1. Validasi sesi/role/CSRF/JSON dan bentuk payload.
2. Normalisasi trim keperluan dan urut ID untuk hash payload deterministik.
3. `BEGIN IMMEDIATE`, lookup `(id_peminjam,request_key)`.
4. Jika key sudah tercatat dan hash cocok, kembalikan transaksi asli. Jika berbeda, 409. Replay yang sudah commit tetap dapat dibaca meskipun waktu mulai kemudian terlewati.
5. Untuk request baru, validasi ulang waktu dan stok total/keberadaan setiap barang.
6. Alokasikan `MAX(id_peminjaman)+1` **di dalam write transaction terserialisasi**, dilindungi PK. Ini bukan `COUNT(*)+1`. Kode `SL-<id>` berasal dari ID tersebut, bukan browser.
7. Insert header `status=menunggu`, `id_admin=NULL`, timestamp UTC, key/hash; insert seluruh detail; baca bentuk receipt; COMMIT.
8. Baru setelah commit berhasil server mengirim konfirmasi. Gagal satu detail → ROLLBACK header, seluruh detail dan key.

Tidak ada UPDATE terhadap `barang.stok_total`, reservasi atau pemanggilan approval. FK, PK detail, status resmi, jumlah positif dan indeks unique tetap aktif. Pengujian lintas proses menggunakan koneksi SQLite terpisah, bukan hanya request serial di satu server.

## F. Contoh transaksi dari database tes terpisah

Contoh aktual pada tes file disposable di `%LOCALAPPDATA%\Temp\opencode\smartlend-loans-db-*\loans.disposable.sqlite`:

- ID **41**, nomor **SL-41**; ID 40 sengaja merupakan fixture transaksi legacy untuk menguji preservasi dan alokasi nomor.
- Peminjam **Peminjam Sintetis**, `sintetis@smartlend.test` (bukan akun target).
- Barang **TEST-91 — Barang Sintetis**, **1 unit**.
- Mulai **2026-11-20T07:52:11.759Z**; kembali **2026-11-21T07:52:11.759Z** pada run tes yang dicatat.
- Status **menunggu**, admin null.
- Setelah koneksi ditutup dan file dibuka ulang read-only, detail identik dengan respons sebelum close.

Selain contoh satu-barang tersebut, tes browser membuat pengajuan sintetis tiga jenis: **Proyektor 2, Mikrofon Wireless 1, Kamera 1**, total empat unit, lalu memeriksa isi konfirmasi/detail dan membacanya ulang setelah refresh. Semua mutasi browser memakai SQLite memori terpisah. Tidak membuat transaksi contoh pada target pemilik.

## G. Hasil pengujian dan acceptance criteria

### Perintah dan hasil aktual

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run build` | **PASS**, Vite 6.3.5 |
| `npm run test:backend` | **PASS 64/64**, tanpa skip; termasuk autentikasi/katalog/inventaris/draft dan transaksi baru |
| `node tests/browser-loans.mjs` | **PASS**, 1440×900, 390×844, 320×568 |
| `node tests/browser-auth-navigation.mjs` | **PASS**, regresi AC-01–24 navigasi lama, login/logout/refresh tiga role dan akses tidak sah |
| `node tests/browser-smoke.mjs` | **PASS**, Home/search/filter/katalog/ruangan/profil/empty/error/draft |
| `node tests/browser-item-detail.mjs` pada target read-only | **PASS**, seluruh 12 barang, lima viewport, Detail/draft/stok tetap |
| `node tests/loan-preservation.mjs <target> <backup>` | **PASS**, isi seluruh 14 tabel lama identik, hanya tiga kolom dan satu index tambahan |
| Apply migrasi ulang pada target | **PASS**, tidak ada perubahan/backup baru |
| TypeScript checker/linter terpisah | **NOT TESTED**, tidak ada script tersebut; Vite build bukan pemeriksaan tipe penuh |
| Login/password pemilik dan POST manual pada target | **NOT TESTED**, sengaja tidak meminta password/membuat sesi/transaksi target; alur mutasi diuji pada DB terpisah |

Pengujian mencakup: spoof ID/status, CSRF/Origin/role, seluruh jumlah invalid, barang asing/duplikat, tanggal lampau/sama/terbalik/tidak nyata/tanpa zona, keperluan kosong/panjang, null/array/JSON rusak/oversized, header/detail atomik, FK/PK/unique, rollback detail kedua, retry paralel, key sama payload berbeda, key per pemilik, waktu lewat setelah commit, pembukaan ulang file SQLite, serta perlombaan nomor lintas proses.

Browser menguji validasi per field, fokus error, tombol draft kosong, snapshot retry lintas navigasi, loading dan klik ganda, gangguan sebelum commit, **respons diputus setelah commit** (termasuk auto-retry Chrome), tidak ada konfirmasi sebelum sukses, draft tidak hilang saat gagal, clear setelah sukses, daftar/detail/refresh, empty/error/retry, dan IDOR lewat hash URL. Logout membersihkan deep link, login baru tetap menuju Home; refresh sesi memulihkan detail yang tersimpan. Zona perangkat dibuat America/New_York untuk memastikan input tetap WIB.

Pemeriksaan tampilan/posisi tombol dan overflow otomatis serta screenshot desktop/mobile sudah dilakukan. Input tanggal dan pesan error terbaca; tombol submit dapat dijangkau tanpa tertutup Navbar/BottomNav.

Run awal sempat **FAIL**: assertion lama menganggap endpoint loans belum ada (404); diperbarui sesuai kontrak baru menjadi 401 dan tetap memeriksa endpoint asing 404. Harness browser juga diperbaiki untuk label tombol role dan membedakan auto-retry jaringan dari klik ganda. Uji hash detail menemukan sinkronisasi hash belum ada; handler aplikasi ditambahkan. Semua run akhir yang dicantumkan di tabel PASS; kegagalan awal tidak disembunyikan dengan menonaktifkan assertion.

### AC tugas ini

| AC | Status | Bukti utama |
| --- | --- | --- |
| 01–04 | PASS | Form, identitas sesi, seluruh barang, validasi frontend/backend |
| 05–08 | PASS | Multi-barang, anon ditolak, jumlah/ID diperiksa |
| 09–14 | PASS | Atomicity, ID terserialisasi, status menunggu, stok tetap, idempotency, konfirmasi pasca-commit |
| 15–17 | PASS | Refresh/file reopen, filter pemilik SQL/IDOR 404, failure mempertahankan draft |
| 18–20 | PASS | Regresi tiga role, target 12 barang, akun/hash identik backup |
| 21–24 | PASS | Migrasi hanya aditif, UI tiga viewport, build/64 tes, pembayaran tidak diaktifkan |
| 25 | PASS | Dokumen ini dan panduan operasi/tes tersedia |

## H. Perlindungan data target

Verifikasi independen membuka target dan backup dengan `DatabaseSync(...,{readOnly:true})` dan membandingkan isi tabel, bukan hanya jumlah.

| Data | Sebelum | Sesudah |
| --- | ---: | ---: |
| Akun | 3 | 3, seluruh field/hash identik |
| Barang | 12 | 12, seluruh field/stok identik |
| Peminjaman/detail target | 0 / 0 | 0 / 0, tidak diisi transaksi demo |
| Data tabel existing | 14 tabel | seluruh isi/kolom lama identik |
| Schema | 8 kolom peminjaman | 11 kolom, 1 indeks unique tambahan; schema lain tetap |
| Integritas / FK | ok / 0 masalah | ok / 0 masalah |

Tiga stok lama tetap Proyektor 3, HDMI 5, Speaker 2; sembilan tambahan tetap sesuai manifest inventaris sebelumnya. Tidak seed akun, mengganti password, reset inventaris, menghapus transaksi, menonaktifkan FK, mengubah DB_PATH, atau melakukan operasi Git.

Backup memuat hash akun/data lokal: jangan unggah, jangan sajikan lewat frontend, dan jangan bagikan. Berada di luar `dist`. Mode file `0600` tidak menjamin ACL owner-only pada Windows; akses ACL lokal/backup terenkripsi perlu ditinjau jika dipindahkan ke lingkungan bersama. Tidak ada restore/destructive down-migration otomatis. Jika migrasi gagal, transaksi DDL rollback; jika perlu menonaktifkan fitur setelah sukses, pertahankan kolom aditif dan jangan restore snapshot menimpa data baru tanpa keputusan pemilik.

## I. Keterbatasan

- Belum ada persetujuan/penolakan Admin, verifikasi jadwal/kondisi/ketersediaan penuh, serah terima, pengembalian, reservasi, QR operasional, atau pembayaran.
- Aturan Civitas Akademika/Umum, fasilitas dan tarif masih menunggu keputusan. Tidak membuat role baru atau tarif nol permanen.
- Riwayat mahasiswa tersedia; dashboard Admin/Logistik tidak dihubungkan ke operasi approval dan tetap terbatas.
- Detail menggunakan nama/kode/satuan inventaris saat dibaca; tidak menambah snapshot inventaris historis atau CRUD inventaris.
- Draft/request belum dikonfirmasi tidak bertahan setelah refresh/logout; lihat riwayat bila hasil pengiriman tidak pasti. Transaksi tersimpan tidak hilang setelah refresh.
- Daftar saat ini belum dipaginasi; sesuai lingkup SQLite pengujian lokal, bukan klaim kesiapan produksi berskala besar.
- Kebijakan idempotency scoped per peminjam/key: request dengan **key baru** adalah pengajuan baru, walaupun isinya sama. UI menjaga key sama selama retry request yang sama.
- Baseline schema existing tetap dipertahankan. Database baru/target lain tidak otomatis diaktifkan; harus melalui audit/migrasi eksplisit yang sesuai, bukan diarahkan diam-diam oleh aplikasi.

## J. Menjalankan dan menguji (PowerShell)

Node aktual pengujian: **22.13.1** dengan peringatan eksperimental `node:sqlite`. Dependencies existing digunakan, tidak menambah paket.

### Operasi dengan database existing

Gunakan terminal backend yang sudah memiliki DB_PATH existing. Guard berikut **tidak mengubah DB_PATH**, menolak file hilang/path lain, dan mencegah `openDb` membuat database kosong karena salah path:

```powershell
$expected = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
if (-not $env:DB_PATH -or -not (Test-Path -LiteralPath $env:DB_PATH -PathType Leaf)) {
  throw 'Gunakan terminal backend yang sudah memiliki DB_PATH existing terverifikasi; jangan seed atau membuat database baru.'
}
if ((Resolve-Path -LiteralPath $env:DB_PATH).Path -ne $expected) {
  throw 'DB_PATH berbeda dari target yang diaudit. Hentikan dan verifikasi konfigurasi existing.'
}
$env:APP_ORIGIN = 'http://127.0.0.1:5173'
npm run server
```

Bila terminal baru memang belum mempunyai DB_PATH, alternatif berikut menggunakan path existing **eksplisit** tanpa mengubah DB_PATH, tetap memakai fungsi server/database existing:

```powershell
$database = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
if ($env:DB_PATH -and (Resolve-Path -LiteralPath $env:DB_PATH).Path -ne $database) {
  throw 'DB_PATH existing berbeda; jangan mengganti target tanpa audit.'
}
node --input-type=module -e "import {openDb} from './backend/db.mjs'; import {makeServer} from './backend/server.mjs'; makeServer(openDb(process.argv[1]),'http://127.0.0.1:5173').listen(3000,'127.0.0.1',()=>console.log('Backend SmartLend pada port 3000'));" $database
```

Pilih **satu** cara menjalankan backend, jangan jalankan dua server pada port sama. Restart proses backend lama secara normal agar source terbaru dimuat; jangan menghentikan proses lain secara sembarang.

Terminal frontend:

```powershell
npm run dev -- --host 127.0.0.1
```

Buka `http://127.0.0.1:5173` (jika Vite menawarkan port lain karena 5173 terpakai, jangan memakai origin berbeda tanpa menyamakan APP_ORIGIN secara sadar). Login menggunakan akun/password existing. Pilih barang, buka Rencana, Ajukan Peminjaman, isi waktu **WIB di masa depan** dan keperluan bertanda `UJI`, lalu Kirim. Ini akan membuat transaksi nyata pada disposable; stok tidak berubah. Periksa Peminjaman Saya dan refresh. Jangan menjalankan seed/provisioning untuk langkah ini.

### Audit aktivasi yang sudah diterapkan

```powershell
node tools/enable-loan-submissions.mjs --database 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite'
```

Target sudah `ready`. Tidak perlu apply ulang. Perintah apply yang digunakan pada tugas ini (dicatat untuk audit):

```powershell
node tools/enable-loan-submissions.mjs --database 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite' --apply --confirm ENABLE_LOAN_SUBMISSIONS
```

### Tes otomatis

```powershell
npm run build
npm run test:backend
node tests/browser-loans.mjs
node tests/browser-auth-navigation.mjs
node tests/browser-smoke.mjs
$env:SMARTLEND_MODAL_TEST_DB = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
node tests/browser-item-detail.mjs
node tests/loan-preservation.mjs 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite' 'database/backups/loans-before-1795074865479-66a51b1d-78c2-474e-a049-7e34fc766667.sqlite'
```

Tes backend/browser transaksi membuat fixture memori atau **file disposable terpisah**; tidak mengubah akun/database target. Verifier terakhir memeriksa seluruh record terhadap backup dan dimaksudkan untuk checkpoint segera setelah migrasi. Jika pemilik kemudian membuat pengajuan sah, perbedaan header/detail memang diizinkan dan harus diaudit sebagai transaksi baru, bukan dianggap kehilangan data atau dihapus untuk meluluskan verifier. Verifier inventaris historis `tests/inventory-preservation.mjs` mengharapkan schema lama sebelum aktivasi pengajuan; gunakan verifier migrasi di atas untuk checkpoint baru.

Screenshot lokal run final transaksi: `%LOCALAPPDATA%\Temp\opencode\smartlend-loan-browser-DDg0zh`. Regresi target: `smartlend-modal-GrCQFG`; navigasi role: `smartlend-auth-flow-NRgwps`; smoke: `smartlend-browser-N0m9xf` pada direktori Temp/opencode yang sama.

### File pendukung backend/database/tes/dokumen

- Baru: `backend/loans.mjs`, `backend/loan-schema.mjs`, `database/migrations/001-loan-submission.sql`, `tools/enable-loan-submissions.mjs`, `tests/loans.test.mjs`, `tests/browser-loans.mjs`, `tests/loan-preservation.mjs`, dokumen ini.
- Diubah: `backend/server.mjs`, `tests/catalog.test.mjs` (kontrak endpoint baru), `package.json` (suite backend), `docs/SPRINT2_STATUS.md`, `docs/BORROWING_PLAN.md`, catatan checkpoint pada laporan inventaris.
- `dist/` dibangun ulang. Target hanya memperoleh schema aditif; backup/audit lokal dibuat. Daftar file frontend ada di bagian C. Tidak menambahkan dependency atau mengubah konfigurasi OpenCode/router.
