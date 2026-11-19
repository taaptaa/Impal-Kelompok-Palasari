# SmartLend — laporan konsolidasi integrasi Sprint 2

**Tanggal verifikasi: 19 November 2026.** Integrasi baca kalender dan Dashboard Admin selesai serta teruji pada source terkini. **Availability belum terverifikasi; approval dan rejection tetap BLOCKED.** Ini bukan pernyataan aplikasi siap produksi.

Workspace: `C:\Users\apta3\Downloads\Impal Palasari\Impal-Kelompok-Palasari-main`.

## 1. Kondisi awal, kepemilikan, dan audit

- Pengguna mengonfirmasi session Database, Backend, dan Frontend berhenti menulis serta mengizinkan editor integrasi tunggal. Pekerjaan existing dipertahankan; tidak ada Git/reset/restore, penggantian arsitektur, dependency baru, atau implementasi ulang backend.
- Audit memakai source dan laporan [Database Engineer](DATABASE_ENGINEER_SPRINT2_AUDIT.md), [proposal schema](DATABASE_SCHEMA_PROPOSAL_SPRINT2.md), [kontrak database DRAFT](DATABASE_BACKEND_CONTRACT_SPRINT2.md), [Backend Session 3](BACKEND_SESSION3_REPORT.md), serta komponen/kontrak Frontend existing. Proposal database tidak dianggap fitur produksi yang sudah diterapkan.
- Pada awal integrasi, komponen kalender/foto/panel Admin sudah ada, tetapi wiring live Admin masih memakai array kosong dan kalender belum terhubung ke kontrak agregat backend. Pengajuan mahasiswa existing tidak diganti.
- Server backend lama sempat mengembalikan 404 untuk endpoint baru. Pengguna memilih me-restart sendiri, bukan memberikan izin penghentian proses oleh asisten. Sesudah restart, GET jadwal menghasilkan 200 dan Admin anonim 401.
- Audit terakhir juga menemukan handoff pelengkap [integrasi frontend–backend](FRONTEND_BACKEND_INTEGRATION_REPORT.md): enam statistik status, refresh, penanda keputusan pada detail, dan tes snapshot SL-1. Perubahan tersebut dipertahankan tanpa ditimpa dan source terkini diuji ulang. Daftar berikut mencakup hasil integrasi gabungan, bukan klaim semua file dibuat baru pada penutupan ini.

## 2. File implementasi dan alasan perubahan

| File/area | Hasil integrasi |
| --- | --- |
| `src/app/api.ts` | Tipe/client GET Admin dan jadwal, cookie sesi existing, AbortSignal; kontrak POST mahasiswa tetap |
| `src/app/loan-read-models.mjs`, `.d.mts` | Validasi respons runtime; chunk maksimal 31 hari; penggabungan segmen tanpa menciptakan transaksi/status |
| `src/app/integrations/AdminDashboardContainer.tsx` | Daftar/statistik/readiness/detail dari API, pagination, filter, refresh/retry, pembatalan dan pengabaian respons stale |
| `src/app/integrations/ScheduleContainer.tsx` | Pemilihan barang, jendela 42 hari, pergantian bulan/tahun, refresh/retry dan pengaman respons stale |
| `src/app/components/loans/BookingSchedule.tsx`, `view-contracts.ts` | Mode agregat publik terpisah dari fixture booking individual; penjelasan unknown dan rekonsiliasi |
| `src/app/components/loans/AdminRequestsPanel.tsx` | Total + enam status, daftar, pencarian halaman aktif, filter server, pagination, detail, Setujui/Tolak disabled |
| `src/app/components/loans/CampusCalendar.tsx`, `campus-calendar.css` | Kalender existing digunakan kembali; dropdown bulan/tahun dinamis, navigasi dan responsivitas |
| `src/app/screens/MainApp.tsx`, `src/app/navigation.ts` | Wiring container Admin, route jadwal publik dan jalur kembali existing |
| `src/app/screens/LoanFormScreen.tsx` | Kalender jadwal API di form; draft, validasi, WIB/UTC dan pengiriman existing dipertahankan; fixture tetap bisa terisolasi |
| `src/app/screens/AdminDashboard.tsx` | View read-only diekstrak/digunakan kembali; prototipe tidak diaktifkan pada jalur aplikasi live |
| `src/app/screens/CatalogScreen.tsx` | Tombol jadwal; katalog mahasiswa tanpa Kembali redundan, katalog publik tetap mempunyai jalur kembali |
| `src/app/data/inventoryPhotos.ts`, `src/app/components/InventoryVisual.tsx`, `ItemCard.tsx` | Pemetaan foto lewat kode barang stabil, atribusi, penanda ilustrasi dan fallback |
| `src/app/screens/HomeScreen.tsx` | Figure/tautan atribusi dipisah dari tombol katalog, tidak ada tautan di dalam tombol |
| `tests/loan-read-models.test.mjs`, `tests/browser-integration-sprint2.mjs`, `tests/browser-running-app-readonly.mjs` | Validasi model, integrasi HTTP/SQLite sintetis dan probe aplikasi aktual GET-only |
| `tests/helpers/browser-harness.mjs`, `readonly-snapshot.mjs`, `tests/browser-existing-integration.mjs` | Harness browser dan verifikasi SL-1 melalui salinan SELECT konsisten, bukan login/mutasi database sumber |
| `tests/fixtures/frontend-sprint2.tsx`, `tests/browser-item-detail.mjs` | Fixture kode foto dan assertion seluruh 12 aset lokal dapat dimuat |
| `tools/audit-schedule-data.mjs`, `tools/verify-inventory-photos.mjs` | Fingerprint database read-only dan verifikasi metadata/lisensi aset existing |
| `package.json`, `dist/` | Script pengujian relevan dan hasil production build; tidak mengganti konfigurasi port |
| `docs/INVENTORY_PHOTO_VERIFICATION.json`, laporan ini | Bukti foto dan hasil/petunjuk integrasi konsolidasi |

`backend/server.mjs`, `backend/loan-reads.mjs`, autentikasi, schema aktif, dan proposal availability **tidak diubah pada tahap integrasi ini**. Aset existing tidak diunduh ulang atau ditimpa.

## 3. Kontrak API yang digunakan

| Endpoint existing | Pemakaian |
| --- | --- |
| GET `/api/admin/loans` | Daftar berotorisasi Admin; UI memakai `limit=10`, `offset`, dan filter `status`; respons `loans`, `pagination`, `asOf` |
| GET `/api/admin/loans/stats` | Total header transaksi dan enam `byStatus`; bukan jumlah baris detail/halaman; statistik mengikuti filter status |
| GET `/api/admin/loans/readiness` | Alasan approval/rejection BLOCKED dari backend |
| GET `/api/admin/loans/:id` | `{loan, decisions, asOf}` untuk modal detail hanya-baca |
| GET `/api/schedule` | `startsAt`, `endsAt`, tepat satu `itemId`/`roomId`, maksimal 31 hari per request |

Client jadwal mendukung kontrak barang/ruangan; **UI memilih barang existing**. Tidak menambahkan pilihan ruangan fiktif: sumber pengguna tidak berisi ruangan. GET katalog existing tetap menjadi sumber barang dan tombol **Lihat Katalog Database**.

Jadwal menggunakan interval setengah terbuka `[startsAt,endsAt)`, `scope: direct_details_only`, `timeBasis: sqlite_utc_legacy_unverified`, serta `segments[{startsAt,endsAt,recordedQuantity}]`. `availableQuantity:null` tetap unknown, bukan nol atau tersedia. Respons publik tidak diperlakukan sebagai booking individual dan tidak menghasilkan identitas, nomor pengajuan, atau status per segmen.

Tidak membuat endpoint baru yang menduplikasi fungsi. Tidak ada request keputusan dari UI. Sesi/role, CSRF, Origin, idempotency, commit atomik dan kontrak POST pengajuan tetap menggunakan implementasi existing.

## 4. Hasil kalender dan pemilihan periode

- Dropdown tanggal/bulan/tahun, navigasi sebelumnya/berikutnya, rentang mulai–selesai, serta input jam WIB tetap bekerja menggunakan Calendar/DayPicker existing.
- Draft menyimpan wall-clock WIB; pengiriman memakai konversi UTC existing. Tanggal tidak nyata, lampau, dan rentang terbalik tetap divalidasi. Tidak menambahkan batas durasi bisnis baru; rentang SL-1 tidak diedit.
- Kalender jadwal di katalog/form membaca jendela 42 hari melalui beberapa request maksimal 31 hari. Segmen bersebelahan dengan jumlah sama digabung; indikator belum direkonsiliasi tidak dijumlahkan berulang antar-request.
- Pergantian Desember–Januari, zona perangkat berbeda, keyboard dan pemeliharaan jam pilihan diuji. Kembali ke Rencana tidak menghapus draft isian.
- `menunggu` tidak dimasukkan ke alokasi publik. Titik kalender/puncak jumlah hanya menyatakan alokasi tercatat gabungan `disetujui`/`dipinjam`, bukan stok tersedia.
- UI menjelaskan sumber legacy, fasilitas ruangan belum digabung, dan peminjaman yang belum direkonsiliasi. Lewat rencana kembali bukan bukti barang sudah kembali.
- Loading/error/malformed tidak diterjemahkan menjadi jadwal kosong. Retry/refresh nyata tersedia; respons filter lama tidak menimpa pilihan baru. Pembacaan chunk dan statistik/daftar merupakan snapshot request terpisah, bukan snapshot global atomik atau live push.

## 5. Hasil Dashboard Admin

- Total Peminjaman serta menunggu/disetujui/dipinjam/selesai/ditolak/dibatalkan berasal dari statistik API. Uji sintetis memastikan **15 header**, bukan **16 detail**, dihitung sebagai total transaksi.
- Daftar memuat nama peminjam sesuai otorisasi, status, jadwal, keperluan, ringkasan barang/ruangan dan jumlah. Timestamp legacy yang belum pasti diberi penanda, bukan diasumsikan waktu lokal perangkat.
- Pagination 10 baris, filter status server, pencarian berlabel **Cari pada halaman ini**, refresh, loading/empty/error/retry dan respons stale teruji.
- Detail menampilkan seluruh detail dan metadata tercatat, tanpa mengarang riwayat keputusan. Modal responsif, fokus berada di dialog, judul terlihat saat dibuka dan toast ditutup ketika detail dibuka.
- Data sumber pada checkpoint: **total 1, menunggu 1, status lain 0**. SL-1/detail/statistik diverifikasi melalui salinan SQLite memori dari sumber read-only, bukan melalui kredensial atau sesi pengguna pada sumber.
- Stok Kritis tetap `— / Belum diverifikasi`. Setujui dan Tolak disabled pada daftar/detail; tidak ada callback mutasi keputusan.

## 6. Verifikasi 12 foto

Semua aset lokal diperiksa secara visual, dapat dimuat dalam browser, dan dipetakan melalui 12 kode `UJI-*`, bukan tebakan nama/ID. Sumber, author, lisensi, ukuran dan SHA-256 tercatat di [manifest verifikasi](INVENTORY_PHOTO_VERIFICATION.json). Metadata Commons diverifikasi tanpa mengunduh ulang foto; pemeriksaan akhir memastikan seluruh hash lokal masih sama.

Jenis ilustrasi: proyektor, kabel HDMI, speaker portable, mikrofon wireless, kursi lipat, meja lipat, tripod, kamera, kabel roll, pointer presentasi, whiteboard, dan extension HDMI. Sumber memuat lisensi Public domain, CC0, CC BY-SA 2.0/3.0/4.0 sesuai masing-masing metadata; atribusi/sumber/lisensi ditautkan pada figure. Kode tak dikenal atau gambar gagal memakai fallback.

**Batas whiteboard:** foto papan tulis umum tidak menunjukkan roda/model portable. Seluruh foto adalah ilustrasi representatif, bukan bukti merek/model/kondisi/spesifikasi atau foto unit kampus asli. Tidak mengklaim kecocokan model yang tidak terlihat.

## 7. Navigasi

- Katalog mahasiswa tidak menampilkan tombol Kembali redundan ketika navigasi internal sudah tersedia.
- Katalog publik mempertahankan Kembali ke pemilihan role; jadwal mempunyai Kembali ke Katalog.
- Navbar/BottomNav, login/logout tiga role, Rencana, Detail, profil dan Peminjaman Saya tetap teruji. Perbaikan foto Home tidak mengubah halaman menjadi redesign menyeluruh.

## 8. Pengujian aktual dan batas bukti

Semua baris PASS berikut dijalankan ulang pada source terkini sebelum laporan ini dibuat. Browser dijalankan satu per satu; port ephemeral hanya milik server tes terisolasi.

| Perintah/pemeriksaan | Hasil | Lingkup data |
| --- | --- | --- |
| `npm run build` | **PASS**, Vite 6.3.5; 2.533 modul | Production bundle terkini |
| `npm run test:backend` | **PASS 87/87** | SQLite memori/disposable tes; keamanan, read API, gate, POST existing |
| `npm run test:read-models` | **PASS 7/7** | Validasi, WIB, kalender, chunk/merge |
| `npm run test:integration` | **PASS** | Browser → HTTP → backend → SQLite memori sintetis; Admin, kalender, error/retry/loading/malformed/stale; 1440/768/390/320 |
| `node tests/browser-existing-integration.mjs <database-existing>` | **PASS** | SL-1/statistik/detail pada salinan SELECT memori; katalog/jadwal/refresh/401 pada listener aktual 5175; seluruh sumber identik |
| `node tests/browser-running-app-readonly.mjs` | **PASS** | **5175 → 3000 aktual, GET-only**; 12 foto, jadwal 200, menunggu bukan alokasi, unknown, Admin anonim 401; 1440/390/320 |
| `node tests/browser-loans.mjs` | **PASS** | DB tes; WIB, validasi, gagal API/response hilang, idempotent retry, double submit, daftar/detail/refresh/IDOR; 1440/390/320 |
| `node tests/browser-auth-navigation.mjs` | **PASS** | DB sintetis; login/refresh/logout tiga role dan batas publik/internal; 1440/390/320 |
| `node tests/browser-smoke.mjs` | **PASS** | DB tes; Home/search/katalog/ruangan/profil/Rencana/role/error |
| `node tests/browser-frontend-sprint2.mjs` | **PASS** | Fixture komponen, tanpa API; kalender/range/keyboard/fallback dan overflow; 1440/768/390/320/640-landscape |
| `node tests/browser-item-detail.mjs` dengan `SMARTLEND_MODAL_TEST_DB` existing | **PASS** | Sumber read-only; Detail/Rencana seluruh 12 barang, gambar, fokus/Escape/scroll dan preservasi data; lima viewport |
| Verifier SQLite terhadap dua checkpoint integrasi | **PASS** | Schema, akun/hash, stok, transaksi, sesi; integrity `ok`, FK 0 |
| Hash/ukuran 12 aset terhadap manifest terverifikasi | **PASS** | Tidak ada foto diganti |
| Full TypeScript checker / lint | **NOT TESTED** | Tidak tersedia script khusus; Vite build bukan full typecheck |
| Login/POST/Admin terautentikasi otomatis pada database sumber | **NOT TESTED** | Tidak meminta password, mengekstrak sesi, atau membuat transaksi sumber |
| Safari/iOS/perangkat fisik | **NOT TESTED** | Browser pengujian Chrome headless; emulasi viewport bukan cakupan semua browser |
| Approval/rejection operasional, availability terverifikasi | **BLOCKED** | Bukan fitur yang diaktifkan atau diuji sebagai berhasil |

Jumlah akhir: **94 tes backend/read-model lulus dan 8 suite browser lulus**, bukan hanya build/backend. Peninjauan screenshot terkini mencakup statistik Admin desktop, modal 320, kalender agregat desktop, dan jadwal publik mobile. Tidak ada overflow horizontal pada viewport teruji; konten panjang memakai scroll vertikal.

Riwayat kegagalan pengujian tidak disembunyikan: selector tanggal awal mengasumsikan `1 Januari`, sedangkan Intl menghasilkan `01 Januari`; diperbaiki memakai label Intl. Hook fetch probe live awal hilang ketika document berganti; pemasangan diperbaiki melalui `Page.addScriptToEvaluateOnNewDocument` lalu reload. Run PASS akhir terjadi sesudah perbaikan tersebut. Keduanya bukan alasan untuk mematikan assertion atau mengubah data backend.

### Artefak lokal run akhir

Direktori dasar: `C:\Users\apta3\AppData\Local\Temp\opencode\`.

| Direktori | Bukti |
| --- | --- |
| `smartlend-integration-browser-Ni1Gcx` | Admin/kalender sintetis; termasuk `admin-1440.png`, `admin-detail-320.png`, `schedule-1440.png` |
| `smartlend-integration-browser-ZUsj3r` | SL-1 pada snapshot sumber + jadwal live, termasuk `live-5175-schedule-320.png` |
| `smartlend-integration-browser-XjCEOF` | Probe live GET-only; katalog dan jadwal 1440/390/320 |
| `smartlend-loan-browser-rtBPQV` | Regresi pengajuan mahasiswa |
| `smartlend-auth-flow-EvanKj` | Login/navigasi tiga role |
| `smartlend-browser-rYQQag` | Smoke aplikasi |
| `smartlend-frontend-s2-ZR9Z6E` | Fixture komponen lima viewport |
| `smartlend-modal-mTln66` | Detail/Rencana 12 barang |

**Privasi:** screenshot Admin snapshot existing dapat memuat PII sumber. Simpan lokal; jangan publikasikan atau lampirkan tanpa izin/redaksi. Screenshot sintetis bukan bukti transaksi baru pada database pengguna.

## 9. SQLite sebelum dan sesudah

Target yang dilindungi, walaupun nama foldernya disposable:

`database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`

| Komponen | Sebelum integrasi | Verifikasi akhir |
| --- | --- | --- |
| Akun/hash | 3 akun existing | Identik, 3 akun |
| Barang/stok | 12 barang existing | Identik, 12 barang |
| Pengajuan | 1 header SL-1, `menunggu` | Identik, tidak disetujui/diubah |
| Detail | 1 detail Proyektor ID 9001 ×1 | Identik |
| Periode SL-1 | `2026-12-20T12:00:00.000Z` → `2027-12-19T17:00:00.000Z` | Identik |
| Schema | Profil 001, 11 kolom peminjaman + indeks idempotency | Identik; proposal 002 DRAFT tidak diterapkan |
| Sesi/percobaan login | Fingerprint checkpoint | Identik pada pembandingan akhir kedua checkpoint |
| Integritas/FK | Pemeriksaan read-only | `ok` / 0 masalah |

Checkpoint lokal:

- `smartlend-integration-before-20261119.json` — sebelum integrasi.
- `smartlend-live-public-before-20261119.json` — sebelum probe publik live.

Keduanya berada di direktori artefak lokal di atas. Verifier akhir untuk masing-masing menghasilkan `schemaUnchanged`, `accountsAndHashesUnchanged`, `inventoryAndStocksUnchanged`, `loansAndOtherBusinessDataUnchanged`, dan `sessionTablesUnchanged: true`.

Pada pemeriksaan sementara sesudah restart, tabel sesi sempat berbeda. Pengguna mengonfirmasi login/logout manual sebagai aktivitas sah. Tidak ada reset/restore sesi untuk menyamakan fingerprint; hasil akhir identik tidak berarti aktivitas sementara itu tidak pernah terjadi. Tidak ada seed ulang, penggantian DB_PATH, migrasi availability, pengajuan contoh, pengurangan stok, atau penambahan tarif/Payment pada sumber.

## 10. Acceptance criteria dan hal yang belum selesai

| AC | Status dan bukti |
| --- | --- |
| AC01–02 | **PASS** — tanpa Kembali redundan bagi mahasiswa; jalur kembali publik tetap ada |
| AC03–04 | **PASS** — tanggal/bulan/tahun, jam dan WIB/UTC, termasuk lintas tahun/zona perangkat |
| AC05 | **PASS** — regresi POST/form/retry mahasiswa pada DB tes |
| AC06–07 | **PASS** — 12 foto lokal dimuat, katalog 12 barang API |
| AC08–11 | **PASS** — jadwal API aktual/agregat, tanpa PII; menunggu tidak menjadi alokasi; unknown tidak menjadi tersedia |
| AC12–13 | **PASS** — statistik/daftar/detail dari backend; SL-1 diuji pada snapshot sumber, bukan login source otomatis |
| AC14 | **PASS** — multi-detail tidak menggandakan total header |
| AC15 | **PASS sebagai pengaman** — approval/rejection tetap BLOCKED; bukan approval berhasil |
| AC16 | **PASS** — login/katalog/Rencana/Peminjaman Saya melalui regresi browser |
| AC17 | **PASS** — perbandingan data/schema termasuk sesi pada checkpoint akhir |
| AC18 | **PASS** — build, 94 tes backend/read-model dan delapan suite browser; lint/full typecheck terpisah belum diuji |
| AC19 | **PASS** — server setelah restart: jadwal 200, Admin anonim 401, proxy aktual 5175 → 3000 |
| AC20 | **PASS pada viewport teruji** — desktop/tablet/mobile/landscape, bukan jaminan seluruh perangkat/browser |

Masih perlu keputusan/verifikasi pemilik sebelum approval: baseline stok layak pinjam, kebijakan alokasi fasilitas, rekonsiliasi pengembalian, kelengkapan alokasi, zona waktu legacy, kontrak alokasi atomik, dan audit keputusan. Rejection juga membutuhkan kontrak audit keputusan. Aktivasi membutuhkan implementasi yang disetujui serta uji concurrency/rollback baru; tes gate fail-closed bukan bukti approval operasional aman.

Tidak ada perhitungan availableQuantity terverifikasi, polling/push otomatis, atau riwayat keputusan rinci yang belum disimpan. Komponen fixture/prototipe existing tetap ada tetapi tidak dipakai sebagai data nyata pada route Admin/jadwal live. Proposal 002 dan kebutuhan produksi mengikuti dokumen Database/Backend, bukan diterapkan diam-diam oleh integrasi UI.

## 11. Menjalankan/restart pada port yang disepakati

Jika server sudah benar dan aktif, tidak perlu restart. Bila perlu, hentikan dengan Ctrl+C **hanya di terminal server yang memang dimiliki operator**, lalu gunakan konfigurasi yang sama. Jangan mematikan proses berdasarkan tebakan PID.

**Terminal backend existing**, dari workspace resmi; DB_PATH tidak diisi ulang atau diganti:

```powershell
if (-not $env:DB_PATH -or -not (Test-Path -LiteralPath $env:DB_PATH -PathType Leaf)) {
  throw 'DB_PATH existing harus dipertahankan dan diverifikasi; jangan membuat database baru.'
}
$expectedDb = (Resolve-Path -LiteralPath 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
if ((Resolve-Path -LiteralPath $env:DB_PATH).Path -ne $expectedDb) {
  throw 'Target berbeda dari database audit; minta konfirmasi pemilik sebelum menjalankan.'
}
$env:PORT = '3000'
$env:APP_ORIGIN = 'http://127.0.0.1:5175'
npm run server
```

**Terminal frontend**:

```powershell
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Buka **http://127.0.0.1:5175** (bukan localhost/5173). Proxy Vite existing meneruskan `/api` ke `http://127.0.0.1:3000`. `strictPort` mencegah perpindahan port diam-diam; jika port terpakai, periksa terminal existing, jangan memilih port lain. Dokumentasi historis yang menyebut 5173 tidak berlaku untuk konfigurasi pekerjaan ini. Jangan menjalankan seed/provisioning/migration untuk sekadar membuka aplikasi.

Perintah ulang pemeriksaan aman:

```powershell
npm run build
npm run test:backend
npm run test:read-models
npm run test:integration
node tests/browser-running-app-readonly.mjs
node tests/browser-existing-integration.mjs 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite'
```

Tes memerlukan Node dengan `node:sqlite` (teruji Node 22.13.1) dan Chrome lokal untuk suite browser. Jalankan browser satu per satu; source tidak dimutasi, tetapi tes snapshot existing menyimpan screenshot lokal yang perlu dijaga privasinya.

## 12. Verifikasi manual oleh pemilik

1. **Publik:** buka aplikasi, pilih katalog tanpa login. Pastikan 12 barang/foto/atribusi dimuat, Kembali publik tersedia, dan tombol Jadwal Peminjaman membuka pilihan barang.
2. Pilih Proyektor, Desember 2026, lalu tahun/bulan lain. Periksa tab Network: GET `/api/schedule` sukses dan setiap request maksimal 31 hari. SL-1 menunggu tidak menjadi titik alokasi; label Belum diverifikasi tetap tampil. Muat Ulang Jadwal benar-benar membaca API.
3. **Mahasiswa:** login menggunakan akun existing milik Anda. Katalog internal tidak mempunyai Kembali redundan. Tambahkan barang ke Rencana, buka form, ubah rentang/bulan/tahun dan jam WIB, kembali ke Rencana, lalu pastikan draft bertahan.
4. Untuk pemeriksaan tanpa mutasi, **jangan klik Kirim Pengajuan** pada sumber. Buka Peminjaman Saya dan detail existing. Uji pengajuan baru hanya di database tes terpisah atau setelah izin mutasi eksplisit; POST source tidak dilakukan automasi ini.
5. **Admin:** login memakai kredensial existing Anda sendiri. Pada dataset checkpoint, total 1 dan menunggu 1; SL-1 menampilkan Proyektor ×1 dan periode existing. Jika pemilik menambah data sah kemudian, cocokkan dengan record baru, bukan memaksa angka checkpoint.
6. Buka Detail SL-1, periksa barang/jumlah/keperluan/jadwal, scroll mobile, lalu tutup dengan tombol atau Escape. Filter status, pencarian halaman ini, dan Muat Ulang Pengajuan harus bekerja. Setujui/Tolak tetap disabled; Stok Kritis/availability belum diverifikasi.
7. Ulangi di desktop dan mobile; logout setelah selesai. Login/logout manual memang dapat mengubah tabel sesi secara sah; jangan reset sesi/data untuk mengejar fingerprint lama.

**Kesimpulan:** integrasi baca dan regresi UI/komunikasi backend selesai dalam lingkup yang disepakati. Pengaman availability/approval tidak dilepas, data sumber dipertahankan, dan tidak ada klaim kredensial sumber atau keputusan operasional telah diuji otomatis.
