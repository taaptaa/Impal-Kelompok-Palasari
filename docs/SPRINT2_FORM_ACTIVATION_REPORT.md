# SmartLend Sprint 2 — aktivasi form 003 dan persiapan dokumen/kapasitas

**19 November 2026.** Target: `database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite` pada workspace resmi. Frontend **5175**, backend **3000**, APP_ORIGIN **http://127.0.0.1:5175**.

**Hasil utama:** migrasi form 003 telah diterapkan dengan persetujuan eksplisit sesudah backup/restore dan rehearsal lulus. Schema target mendukung metadata dan capability `additionalFields:true`. Pemilik memilih **menunda transaksi target**, sehingga target masih mempunyai 0 metadata; keberhasilan submit lengkap pada target **tidak diklaim**. Penyimpanan/read-back lengkap terbukti pada salinan dan tes sintetis. Upload dan keputusan Admin target tetap **BLOCKED**.

## A. Audit awal

Seluruh dokumen wajib dibaca: laporan checkout, kontrak form DRAFT, integrasi, Backend Session 3, audit Database Engineer, proposal schema dan kontrak database/backend. Source server/loans/loan-form/reads/db/auth, API/validator/form/ringkasan/metadata/MyLoans/Admin dan tes existing diperiksa. Kontrak yang sudah tersedia dipakai kembali, bukan dibuat ulang.

| Pertanyaan audit | Hasil sebelum migrasi |
| --- | --- |
| Backend terbaru sudah memuat endpoint? | Source memiliki `/api/loans/form-options`, tetapi PID3884 mulai 16:18 sedangkan source form ditulis 17:14. GET anonim 401 tidak cukup membuktikan endpoint baru dimuat. Restart diperlukan |
| Tabel `informasi_pengajuan`? | Tidak ada; capability modul terhadap target BLOCKED |
| DRAFT003 kompatibel? | Ya, profil001 `ready`, tepat 11 kolom; tabel pendamping aditif tidak mengganti header |
| Payload details? | Sudah didukung source/validator/transaction/hash existing |
| Capability frontend? | Sudah dibaca, gate field/checkbox dan retry; draft tambahan tidak dibuang ke form dasar |
| Simpan/baca? | `writeLoanForm` dalam transaksi header/detail; `readLoanForm` pada receipt/pemilik/Admin; runtime response validation |
| Risiko migrasi? | DB/WAL berubah setelah backup, schema parsial, checksum berbeda, disk penuh, kegagalan commit. Runner menolak drift dan rollback sebelum commit |
| Disk C awal? | 1.959.854.080 byte bebas (~1,96 GB); bukan kondisi 0 byte sesi sebelumnya |
| Session lain? | Pemilik mengonfirmasi **Sudah berhenti** sebelum edit |

Preflight memakai koneksi SQLite **readOnly**, bukan `openDb`. Awal: 14 tabel, 3 akun, 12 barang, 1 header/1 detail SL-1 menunggu, 0 ruangan, 0 sesi dan **1 percobaan login**. Record percobaan login dianggap aktivitas sah, tidak dikembalikan ke angka nol laporan lama. Integritas `ok`, FK0. Tidak menganggap kondisi fisik/stock availability diketahui.

Baseline ulang sebelum migrasi: build, backend95, read-model7, checkout enam viewport dan integration PASS. Upaya Figma untuk struktur status kebijakan ditolak server karena referensi adalah file Make; layout existing dipertahankan, tidak ada klaim sinkronisasi Figma.

## B. Aktivasi metadata

Form existing sudah mempunyai seluruh field; tidak menghapus `disabled` secara paksa. Capability nyata dari `loanFormOptions` terhadap SQLite target setelah migrasi = **ready / true**. Backend lama dihentikan/restart sendiri oleh pemilik, bukan dibunuh asisten. Proses baru PID39692 teramati mulai 19:00:46. Pemilik memilih jawaban **Sudah ready / true** untuk pemeriksaan capability terautentikasi; ini dicatat sebagai konfirmasi manual pemilik, bukan GET terautentikasi yang dilakukan asisten.

Frontend5175 sempat tidak aktif setelah restart operator; asisten menjalankan kembali `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`. Probe browser final GET-only **5175 → 3000 PASS**. DB_PATH server tidak diganti oleh asisten. Tidak meminta password/cookie/token atau membuat sesi pada database target.

| Field | Kontrak tetap |
| --- | --- |
| Nama/email/ID/role | Sesi backend; bukan pemilik yang ditentukan browser |
| phone | 8–15 digit, opsional `+`, wajib pada payload lengkap; format bukan verifikasi nomor |
| borrowerIdentifier | Opsional, maksimal40, tanpa newline/tab; bukan verifikasi institusional NIM/NIP |
| unit | Opsional, maksimal120 |
| activityName | Wajib pada payload lengkap, maksimal120 |
| activityLocation | Wajib pada payload lengkap, maksimal160 |
| activityDescription | Opsional, maksimal1000 |
| reason | Wajib maksimal150, tetap keperluan terpisah |
| startsAt/endsAt | Input WIB → UTC kanonik, validasi existing, tanpa durasi bisnis baru |
| acknowledgement | Versi submission-info-v1 dan boolean true divalidasi backend |

Source backend hanya diganti referensi SQL profil dari DRAFT ke migrasi resmi dengan struktur sama. Payload/hash/read-back/otorisasi tidak ditulis ulang. Payload lama tanpa details tetap sah; payload tambahan tervalidasi ikut hash, lock dan commit atomik. Status awal menunggu; stok tidak dikurangi.

## C. Migrasi, backup dan persetujuan

Target absolut yang disetujui:

```text
C:\Users\apta3\Downloads\Impal Palasari\Impal-Kelompok-Palasari-main\database\disposable\accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite
```

Folder backup privat baru, di luar workspace/web root:

```text
C:\Users\apta3\AppData\Local\SmartLend\backups\form003-e271e7ca-9376-4e03-b5c9-411f382cf0c1\
```

| Artefak dalam folder tersebut | Fungsi |
| --- | --- |
| `before-003-9b8d60d3-3f2a-4dd0-a74e-0955ccc70139.sqlite` | Backup konsisten sebelum perubahan; dipertahankan |
| `restore-003-9b8d60d3-3f2a-4dd0-a74e-0955ccc70139.sqlite` | Restore terpisah; awal identik, kemudian dipakai rehearsal dan dua pengajuan **salinan saja** |
| `manifest-003-9b8d60d3-3f2a-4dd0-a74e-0955ccc70139.json` | Target, schema/count/hash semua tabel, hasil rehearsal, disk dan checksum; tanpa isi PII |
| `applied-003-8c7ac27f-5845-4b04-b73c-786b09299715.json` | Receipt penerapan target dan fingerprint sesudah commit |

ACL folder: pewarisan dinonaktifkan, FullControl hanya akun Windows `Apta3223\apta3` dan SYSTEM. Backup memuat data akun/hash; jangan bagikan. Tidak menimpa backup lama. SQLite `VACUUM main INTO` melalui koneksi read-only mengambil snapshot committed termasuk WAL, bukan copy file main sembarangan. Destination baru di-flush dan diverifikasi; backup di-restore melalui SQLite ke file baru dan seluruh fingerprint awal identik.

Ruang ketika prepare: **2.007.228.416 byte**; minimum yang dihitung **1.074.954.240 byte**. Runner mensyaratkan minimal1 GiB di luar kebutuhan salinan; memeriksa ulang sebelum apply. Tidak menghapus file untuk memperoleh ruang.

SQL actual: [`database/migrations/003-loan-form.sql`](../database/migrations/003-loan-form.sql), identik secara schema dengan DRAFT003. Tambahan ledger oleh [`tools/loan-form-migration.mjs`](../tools/loan-form-migration.mjs):

```sql
CREATE TABLE migrasi_aplikasi (
  versi TEXT PRIMARY KEY NOT NULL,
  checksum TEXT NOT NULL CHECK(length(checksum)=64),
  diterapkan_pada TEXT NOT NULL,
  operator TEXT NOT NULL
) STRICT;
```

Hanya **dua tabel aditif**: informasi_pengajuan dan migrasi_aplikasi. Ledger berisi satu record `003-loan-form`, timestamp aktual dan operator `OpenCode atas persetujuan eksplisit pemilik 2026-11-19`. Checksum gabungan SQL:

```text
63fdb8d85928cbcdcc4f3241a357fa8a761068f9f490905e719b8ba27ff70844
```

Sebelum apply, SQL lengkap, target, backup/restore, ruang, checksum dan recovery ditampilkan. Pemilik memilih **Setujui migrasi 003** serta **Saya restart sendiri**. Baru setelah itu runner dipanggil dengan konfirmasi target exact.

Runner memakai BEGIN IMMEDIATE, membandingkan seluruh snapshot dengan manifest sebelum DDL, lalu memeriksa semua objek/data lama, profil001, FK/integritas dan metadata kosong sebelum COMMIT. Re-run state/checksum yang sama no-op; schema parsial atau checksum berbeda ditolak. Pengujian gagal insert ledger membuktikan rollback DDL juga. Tidak menjalankan001/002 ulang, seed, backfill, ALTER header, perubahan akun/stok/status atau database engine.

Recovery: sebelum commit rollback transaksi; setelah commit **jangan** DROP/restore snapshot lama menimpa transaksi baru. Hentikan writer secara terkoordinasi, ambil backup keadaan terkini, periksa ledger/commit, rekonsiliasi perubahan lalu perbaikan forward dengan izin terpisah. Gangguan penulisan receipt eksternal sesudah commit tidak berarti database belum bermigrasi.

## D. Bukti penyimpanan dan batas target

Rehearsal restore membaca semua receipt lama sebelum/sesudah migrasi secara identik; menyimpan satu payload lengkap dan satu payload legacy, mengulang key lengkap tanpa duplikasi, membandingkan read-back peminjam/Admin, menutup/membuka file lagi dan memeriksa metadata/hash. Stok/akun salinan tetap sama. Backup asli dan target tidak menerima pengajuan rehearsal.

Tes `loan-form.test.mjs` membuktikan validasi, hash perubahan metadata→409, metadata insert gagal→rollback seluruh paket, concurrency key sama satu receipt dan IDOR. Browser checkout membuktikan form→HTTP→SQLite sintetis→Peminjaman Saya→refresh→Admin, termasuk lost response/double submit dan retry snapshot.

**Pemilik memilih “Belum, tunda transaksi target”.** Oleh sebab itu, setelah migrasi target tetap **1 pengajuan lama dan 0 informasi_pengajuan**. Tidak membuat transaksi contoh otomatis atas nama mahasiswa. Persistensi/refresh metadata **target** adalah **NOT TESTED**, meskipun implementasi dan salinan lulus. Jangan menamai SL-2 dari file restore sebagai transaksi target.

## E. Dokumen pendukung

Mekanisme sandbox baru: `experiments/documents/server.mjs`, DDL metadata DRAFT, kandidat kebijakan, dan5 tes keamanan/integritas. Upload terikat pengajuan yang sudah commit; autentikasi/Origin/CSRF, reauth sesudah inspeksi async, kuota ukuran/jumlah, UUID filename, root privat, attachment owner/Admin, hash byte, idempotency, rollback file yatim, expiry/tombstone/purge.

Kandidat uji disetujui pemilik: PDF kegiatan **opsional**, 2×2MiB, pemilik/Admin, LocalAppData privat, retensi90 hari. Bukan kebijakan resmi yang diaktifkan di target. KTP tidak dikumpulkan. Tidak ada migration dokumen atau input upload palsu pada form live.

**BLOCKED aktivasi:** tidak ditemukan qpdf/mutool/clamscan pada PATH; parser/scanner nyata belum dipasang. Test doubles hanya membuktikan penerimaan/penolakan verdict; bukan kemampuan memeriksa malware/PDF nyata. Jalur tanpa adapter menolak503. Masih diperlukan parser/scanner resource-isolated, korpus file nyata, ACL/storage/backup bersama DB, retensi metadata, audit akses/penghapusan dan rate-limit global. Detail: [rencana dokumen dan kapasitas](DOCUMENTS_AND_CAPACITY_ACTIVATION_PLAN.md).

## F. Konfirmasi informatif dan kebijakan

Versi existing **submission-info-v1**, teks tetap:

> Saya memahami bahwa pengajuan menunggu pemeriksaan Admin, bukan reservasi atau persetujuan, dan ketersediaan barang belum diverifikasi.

Backend hanya menerima `accepted:true` pada payload lengkap. Tabel menyimpan versi dan waktu server, FK pengajuan menghubungkan aktor sesi. Boolean true pada read model merepresentasikan invariant record konfirmasi yang lolos validasi tersebut; tidak menambahkan kolom accepted atau mengarang timestamp dari input. False/versi asing/timestamp klien ditolak. Timestamp awal tetap pada replay. Source target belum memiliki konfirmasi record karena transaksi baru ditunda.

`PolicyDocument.tsx` menyediakan struktur versi/judul/otoritas/tanggal/hash/isi untuk dokumen mendatang. Pada form dipasang tanpa dokumen sehingga menampilkan **belum disahkan**. Legal consent/version registry backend belum diaktifkan; rencana immutable policy+hash dan receipt server terpisah didokumentasikan. Konfirmasi informatif tidak disebut syarat legal kampus.

## G. Kategori pengguna

Pengajuan tetap mahasiswa terautentikasi. Admin/Petugas menggunakan akses existing masing-masing. Tidak ada registrasi/login Dosen/Staf/Umum, role baru, tarif, Payment, janji gratis, denda atau batas durasi bisnis. Metadata isian tidak mengubah identitas/role institusional. Perlu keputusan provisioning/otorisasi kategori mendatang, bukan pilihan palsu di form.

## H. Availability dan verifikasi

Target belum memiliki baseline kondisi, alokasi002 atau bukti pemeriksaan kapasitas. Semua nilai tersedia tetap **unknown/null**, bukan stok total91 atau nol. Menunggu tidak menjadi alokasi.

Executable specification baru `tests/database-engineer/verification-workflow.mjs` khusus fixture002: input bukti/alasan, bucket integer lengkap, rekonsiliasi total/fasilitas, role Admin/Petugas, timestamp server, expectedRevision/CAS, idempotency actor/key dan append-only audit/history. Perubahan fakta kerusakan/unknown/legacy ledger tidak lengkap menjadi perlu_rekonsiliasi, bukan kapasitas aman. Tidak menulis baseline apa pun pada 12 barang target.

Ini **prototipe terisolasi**, belum workflow UI/API operasional. Definisi fasilitas, unit dalam perbaikan, custody/overdue, receipt/koreksi, seluruh writer dan pengesahan pemeriksa masih perlu disepakati. Bukti teks dari pemeriksa bukan verifikasi fisik otomatis.

## I. Admin dan keputusan

Dashboard existing tetap API nyata: enam status, statistik, filter/pagination/refresh/detail. SL-1 terbaca pada snapshot existing pascamigrasi, tetap menunggu, satu Proyektor. Metadata tambahan ditampilkan hanya bila respons benar-benar memiliki record.

Sandbox keputusan baru menguji actor Admin, alasan rejection, expectedVersion, replay hash/key, audit before/after/waktu, CAS menunggu dan alokasi paket atomik. Proses terpisah menguji dua Admin pada transaksi sama, approve-vs-reject serta dua pengajuan perebutan unit terakhir. Uji juga mencakup periode bersambung/lintas tahun, overdue, kapasitas kurang dan rollback detail kedua.

Tidak ada endpoint aktif baru pada target; source `backend/server.mjs` dan readiness tidak diedit. Setujui/Tolak tetap disabled/gate503. Keputusan ruangan pada workflow tambahan ditolak; spesifikasi ruang existing diuji terpisah, bukan diluncurkan. Approval/rejection live **BLOCKED**, bukan PASS hanya karena tes prototipe lulus.

## J. Pengujian aktual

| Perintah/pemeriksaan | Hasil sesi ini |
| --- | --- |
| `npm run build` | **PASS**, 2.538 modul pada build final |
| `npm run test:backend` | **PASS 95/95**, diulang setelah promosi SQL |
| `npm run test:read-models` | **PASS 7/7** |
| `npm run test:activation` | **PASS 16/16**: migrasi6, dokumen5, verifikasi/keputusan5 |
| `node --test tests/database-engineer/availability.test.mjs` dengan sumber eksplisit read-only | **PASS 14/14**, skip0, termasuk preservasi salinan pasca003 |
| `npm run test:checkout` | **PASS**,1920/1440/768/390/320/landscape640, form legacy+lengkap+read-back sintetis |
| `npm run test:integration` | **PASS**, Admin/kalender/31hari/error/retry/stale/gate |
| `node tests/browser-auth-navigation.mjs` | **PASS**, tiga role/login/logout/refresh/navigasi pada1440/390/320 |
| `node tests/browser-existing-integration.mjs <target>` | **PASS**, SL-1/statistik/detail pada snapshot, sumber tidak berubah, katalog/jadwal aktual5175 |
| `node tests/browser-running-app-readonly.mjs` | **PASS**, live GET-only5175→3000,12foto/schedule200/Admin anonim401/unknown |
| Backup/restore/rehearsal target copy | **PASS**, fingerprint awal identik, legacy receipts/akun/stok dipertahankan |
| Migrasi target + pembukaan ulang read-only | **PASS**, applied/checksum benar,16tabel, seluruh14tabel lama identik |
| Capability terautentikasi pada listener | **Konfirmasi manual pemilik: ready/true**; asisten tidak mengambil token sesi |
| Submit/metadata/refresh baru pada target | **NOT TESTED**, ditunda pemilik,0metadata |
| Parser PDF/scanner malware nyata | **BLOCKED**, adapter belum tersedia; doubles tidak dianggap mesin keamanan |
| Upload/approval/rejection operasional target | **BLOCKED** |
| Full typecheck/lint | **NOT TESTED**, tidak ada script terkonfigurasi; build bukan full typecheck |

Total suite unit/integration Node **132 PASS**, ditambah **5 suite browser** final. Browser dijalankan berurutan; assertions tidak dipangkas. Margin disk diperiksa sebelum backup/build/browser. Tidak terjadi ENOSPC pada tugas ini; tidak ada pembersihan source/DB/backup/screenshot/cache pengguna. Ruang akhir teramati **950.296.576 byte** (~906MiB), turun dari awal; penyebab pemakaian di luar scope tidak diasumsikan. Di bawah guard migrasi1GiB sehingga jangan menjalankan backup/migrasi tambahan sebelum menyediakan ruang.

Riwayat kegagalan, tidak disembunyikan: command audit awal sempat salah quoting PowerShell; diperbaiki memakai stdin. Tes migration flush Windows sempat EPERM karena fsync handle read-only; diperbaiki ke r+ hanya untuk **file baru yang dibuat alat**, lalu6/6PASS. Run awal sandbox dokumen sempat timeout; run bounded dan suite final5/5PASS. Audit ad-hoc final sempat mencoba nested read transaction LoanReadService; diganti pembacaan LoanService di snapshot yang sama, final PASS. Tidak ada data target diubah untuk memperbaiki tes.

Artefak lokal di `%LOCALAPPDATA%\Temp\opencode\`:
- `smartlend-integration-browser-rc705j`: checkout final enam viewport.
- `smartlend-integration-browser-4ENIrR`: integrasi final.
- `smartlend-integration-browser-bPHaje`: snapshot SL-1; **mengandung PII existing, jangan publikasikan**.
- `smartlend-auth-flow-IZhUGs`: auth/navigation.
- `smartlend-integration-browser-TiV7Yx`: probe live GET-only.
- `smartlend-db-engineer-jYDdiI`: salinan002; mengandung hash akun, privat.

### Acceptance criteria

| AC | Status | Bukti/batas |
| --- | --- | --- |
| 01 | PASS | Form existing dipakai, hanya ekstraksi struktur kebijakan |
| 02 | PASS | Source/tes metadata tersedia, schema target ready; manual capability dikonfirmasi pemilik |
| 03 | PASS | Migrasi003 pada restore copy, repeat/partial/checksum/rollback |
| 04 | PASS | WAL-aware backup, restore identik, reopen dan rehearsal |
| 05 | PASS | Persetujuan spesifik diberikan sebelum target apply |
| 06 | NOT TESTED pada target | Telepon/kegiatan persisted PASS pada salinan/sintetis; transaksi target ditunda |
| 07 | PASS validasi | Batas NIM/unit diuji; bukan verifikasi institusi |
| 08 | NOT TESTED pada target | Refresh metadata PASS browser sintetis;0metadata target |
| 09 | NOT TESTED untuk metadata target baru | Admin read-back PASS salinan/sintetis; SL-1 target tidak diberi metadata palsu |
| 10 | PASS | Otorisasi/sesi, spoof/IDOR/role regression |
| 11 | NOT TESTED pada target | Versi/waktu/true tersimpan PASS pada salinan;0konfirmasi target |
| 12 | PASS | SL-1/header/detail serta seluruh data lama identik |
| 13 | PASS pada tes | Retry/concurrency satu commit; tidak membuat transaksi target |
| 14 | PASS pengaman | Upload target tetap BLOCKED, tidak ada file palsu |
| 15 | PASS | Status kebijakan belum disahkan, tidak ada legal consent fiktif |
| 16 | PASS | Tidak ada tarif/Umum/payment baru |
| 17 | PASS | Availability unknown; verifikasi terpisah dan tidak backfill total |
| 18 | PASS pengaman | Approval/rejection target tetap BLOCKED |
| 19 | PASS | Browser tiga role/navigasi/refresh/logout |
| 20 | PASS | Seluruh5perintah utama + tes tambahan dijalankan final |

## K. Perlindungan data dan file berubah

Pemeriksaan final **12:11:47 UTC / 19:11:47 WIB** membandingkan semua14tabel lama beserta seluruh field/hash terhadap manifest tepat sebelum migrasi, bukan checkpoint historis yang mengabaikan aktivitas sah.

- **3 akun/password hash identik**,12barang/stok identik, seluruh sesi/percobaan login dan tabel lain identik.
- **SL-1 menunggu**,1jenis/1unit, `2026-12-20T12:00:00.000Z` → `2027-12-19T17:00:00.000Z`,header/detail identik.
- Seluruh objek schema lama identik; tambahan hanya informasi_pengajuan(0) dan migrasi_aplikasi(1).
- Integritas `ok`, FK0. Tidak mengubah DB_PATH, seed,001,002,stok/status/engine; tidak membuat akun/transaksi target.

| File/area | Perubahan |
| --- | --- |
| `database/migrations/003-loan-form.sql` | Promosi DDL form aditif |
| `backend/loan-form.mjs` | Profil membaca migrasi resmi, struktur sama |
| `tools/loan-form-migration.mjs` | Prepare/backup/restore/rehearsal/exact-target apply/ledger/fingerprint/disk guard |
| `tests/loan-form-migration.test.mjs` |6tes migrasi/rollback/WAL/konfirmasi |
| `src/app/components/PolicyDocument.tsx`, `screens/LoanFormScreen.tsx` | Struktur kebijakan berversi, status belum disahkan pada form |
| `experiments/documents/{server.mjs,schema.DRAFT.sql,candidate-policy.mjs}` | Mekanisme dokumen sandbox, tidak diroute ke live |
| `tests/documents-sandbox.test.mjs` |5tes HTTP/storage/privacy/validation/retry/retention/reauth |
| `tests/database-engineer/verification-workflow{.mjs,.test.mjs}` | Workflow verifikasi dan keputusan khusus fixture,5tes termasuk race3skenario |
| `package.json` | Script `test:activation`, tanpa dependency baru |
| `dist/` | Hasil build final |
| `docs/SPRINT2_FORM_ACTIVATION_REPORT.md`, `DOCUMENTS_AND_CAPACITY_ACTIVATION_PLAN.md` | Laporan/batas implementasi dan langkah berikutnya |
| Banner pada laporan checkout/kontrak DRAFT | Tautan hasil aktivasi baru; histori lama dipertahankan |

## L. Instruksi manual berikutnya

### Server

Backend sudah direstart oleh operator; frontend5175 dijalankan kembali asisten. Bila nanti perlu restart, gunakan terminal milik proses terkait dan DB_PATH existing, bukan database salinan:

```powershell
if (-not $env:DB_PATH -or -not (Test-Path -LiteralPath $env:DB_PATH -PathType Leaf)) { throw 'DB_PATH existing wajib diverifikasi; jangan seed.' }
$expected = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
if ((Resolve-Path -LiteralPath $env:DB_PATH).Path -ne $expected) { throw 'Target berbeda; hentikan.' }
$env:PORT = '3000'
$env:APP_ORIGIN = 'http://127.0.0.1:5175'
npm run server
```

Terminal frontend bila belum berjalan:

```powershell
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Tidak perlu menjalankan migrasi003 lagi; tidak ada auto-migration startup. Jangan menjalankan proposal002/dokumen hanya untuk membuka tombol. Simpan backup asli/manifest/receipt; file restore berisi transaksi rehearsal bukan data operasional.

### Verifikasi form dan submit saat Anda menghendaki

1. Buka **http://127.0.0.1:5175**, login Mahasiswa sendiri. Jangan membagikan password/token. Buka `/api/loans/form-options` pada origin yang sama untuk mengecek ready/true; jika401 berarti perlu sesi, bukan memaksa field frontend aktif.
2. Pilih barang→Keranjang→Ajukan. Kontak/kegiatan/konfirmasi aktif bila endpoint ready. Identitas sesi tidak editable. Jangan menganggap stok total = tersedia.
3. Saat memang ingin menyimpan pengajuan baru, isi data yang Anda kehendaki, periode WIB valid, reason terpisah dan konfirmasi. Pada tugas ini Anda memilih menunda langkah tersebut.
4. Sukses harus mempunyai nomor dari backend/status menunggu. Buka Peminjaman Saya→Detail, refresh, cocokkan kontak/kegiatan/versi/waktu. Login Admin sendiri dan baca pengajuan bernomor sama. Ini langkah untuk menutup AC06/08/09/11 **target**.
5. Jika respons pengiriman terputus, retry dengan tombol aman/key sama atau cek riwayat. Jangan membuat key baru hanya karena respons pertama hilang. Stok/SL-1 lama harus tetap.
6. Upload/legal resmi/approval belum aktif; ikuti daftar prasyarat di [rencana](DOCUMENTS_AND_CAPACITY_ACTIVATION_PLAN.md), bukan menghapus disabled atau mengisi baseline asumsi.

Sediakan ruang disk kembali sebelum pengujian/backup baru. `npm run test:activation` mencakup tes backup yang memerlukan margin1GiB; kegagalan guard ruang adalah penghentian aman, bukan izin membersihkan file pengguna.
