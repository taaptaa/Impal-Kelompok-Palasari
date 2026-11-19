# SmartLend Sprint 2 — Audit Database Engineer

**Tanggal:** 19 November 2026. **Status:** audit selesai; desain integrasi menunggu persetujuan. **Tidak ada migrasi baru pada database pengguna.**

## 1. Lingkup dan sumber bukti

- Target teridentifikasi dari dokumentasi pengajuan: `database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`. Walaupun namanya disposable, file ini diperlakukan sebagai **database pengguna yang dilindungi**, bukan sasaran simulasi.
- `DB_PATH` tidak terisi pada proses audit ini dan **tidak diubah**. Tidak dapat membuktikan path yang dipakai proses server/terminal lain. Operator perlu mencocokkan konfigurasi server saat persetujuan integrasi.
- Audit langsung memakai `DatabaseSync(path,{readOnly:true})`, `query_only=ON`, dan read transaction konsisten. Tidak memakai `openDb`, server, login, seed, atau runner migrasi.
- Bukti awal: [DATABASE_AUDIT_SPRINT2_READONLY.json](DATABASE_AUDIT_SPRINT2_READONLY.json), 08:34:55 UTC. Bukti pembanding backup: [DATABASE_AUDIT_SPRINT2_FINAL.json](DATABASE_AUDIT_SPRINT2_FINAL.json), 08:41:04 UTC.
- Kedua checkpoint mempunyai schema dan fingerprint isi **seluruh 14 tabel yang identik**. Fingerprint meliputi semua field, termasuk field akun yang tidak dicetak. Tidak ada password, hash password individual, token sesi, request key/hash, atau keperluan pribadi dalam laporan JSON.
- Tidak ditemukan `docs/PRD.md`, `docs/DESIGN_SYSTEM.md`, atau `docs/USER_FLOWS.md`. Dokumen availability, pengajuan, inventaris, dan source aktual telah dibaca. Arahan tugas sekarang menetapkan SQLite; saran MariaDB dalam dokumen lama bukan keputusan sesi ini.

## 2. Temuan aktual

| Pemeriksaan | Hasil pada target |
| --- | --- |
| Runtime | Node 22.13.1; SQLite 3.47.2, WAL |
| `PRAGMA integrity_check` | `ok` |
| `PRAGMA foreign_key_check` | 0 pelanggaran |
| Akun | **3**, masing-masing 1 mahasiswa/admin/petugas, seluruhnya aktif |
| Barang | **12** entri uji, semuanya portabel; stok total agregat 91 unit |
| Peminjaman / detail barang | **1 / 1**, bukan nol |
| Ruangan / detail ruangan / fasilitas ruangan | **0 / 0 / 0** |
| Pengembalian / detail pengembalian | **0 / 0** |
| Sesi / percobaan login / notifikasi / feedback / rekomendasi AI | Seluruhnya 0 |
| Kondisi/baseline layak pinjam | Belum ada sumber inventaris terverifikasi |

Pengajuan existing **ID 1 / SL-1**, status `menunggu`, meminta barang **9001 (Proyektor Uji), 1 unit**. Jadwal tersimpan **2026-12-20T12:00:00.000Z → 2027-12-19T17:00:00.000Z**. Pengajuan ini dipertahankan, tidak disetujui/dibatalkan/diedit. Durasi panjang bukan pelanggaran aturan yang terbukti: belum ada kebijakan durasi maksimum sah. Tidak menambahkan batas baru diam-diam.

Inventaris persis pada kedua checkpoint:

| ID | Kode | Stok total |
| --- | --- | ---: |
| 9001 | UJI-PRJ-01 | 3 |
| 9002 | UJI-HDM-01 | 5 |
| 9003 | UJI-SPK-01 | 2 |
| 9004 | UJI-MIC-01 | 4 |
| 9005 | UJI-KRS-01 | 35 |
| 9006 | UJI-MJL-01 | 10 |
| 9007 | UJI-TRP-01 | 6 |
| 9008 | UJI-KMR-01 | 3 |
| 9009 | UJI-KRL-01 | 8 |
| 9010 | UJI-PTR-01 | 6 |
| 9011 | UJI-WBD-01 | 4 |
| 9012 | UJI-HDX-01 | 5 |

**91 adalah jumlah inventaris tercatat, bukan tersedia atau layak pinjam.** Tidak ada pengisian kondisi 12 barang tersebut, termasuk pada salinan uji. Kondisi simulasi hanya milik barang sintetis terpisah.

## 3. Audit schema dan relasi existing

| Tabel | Struktur/constraint penting | Kekurangan untuk availability |
| --- | --- | --- |
| `barang` | PK `id_barang INT`, kode UNIQUE, `stok_total>=0`, jenis portabel/tetap | Tidak menyimpan kondisi awal, stok layak pinjam, verifikasi, atau riwayat perubahan kapasitas |
| `ruangan` | PK, kode UNIQUE, kapasitas > 0, status aktif/perawatan | Tidak ada kalender blokir/perawatan atau pencegahan overlap; kapasitas adalah jumlah peserta, bukan jumlah slot booking |
| `fasilitas_ruangan` | PK `(id_ruangan,id_barang)`, FK keduanya, jumlah > 0 | Tidak memeriksa total lintas ruangan terhadap stok; tidak menjelaskan apakah fasilitas tercakup dalam total atau boleh dipinjam lepas |
| `peminjaman` | PK, nomor UNIQUE, FK peminjam/admin, waktu, keperluan, enam status resmi; 11 kolom setelah 001 | Tidak ada alokasi, penguncian kapasitas, status history, waktu serah terima/pelepasan |
| `detail_barang` | PK `(id_peminjaman,id_barang)`, FK header/barang, jumlah > 0 | Sudah benar untuk multi-barang; tidak ada reservasi atau batas agregat lintas pengajuan |
| `detail_ruangan` | PK `id_peminjaman`, FK header/ruangan, jumlah peserta > 0 | Satu ruangan per header; jumlah peserta dapat melebihi kapasitas tanpa validasi tambahan |
| `pengembalian` | PK, FK peminjaman/petugas, **UNIQUE id_peminjaman**, kondisi akhir baik/rusak/hilang | Maksimal satu header pengembalian per pengajuan; tidak cukup untuk event parsial berulang dan kondisi campuran |
| `detail_pengembalian` | PK `(id_pengembalian,id_barang)`, FK header/barang, tiga jumlah >= 0 dan jumlah gabungan > 0 | Tidak menjamin barang pernah diminta atau jumlah cocok dengan pinjaman; tidak mengikat perubahan kapasitas |

Relasi existing: `pengguna → peminjaman → detail_barang → barang`; `peminjaman → detail_ruangan → ruangan`; `ruangan ↔ barang` melalui fasilitas; `peminjaman → pengembalian → detail_pengembalian → barang`.

Pemeriksaan semantik pada data aktual: tidak ada jumlah barang pecahan/negatif, header tanpa detail, waktu tidak terbaca/terbalik, fasilitas melebihi total, atau detail pengembalian yang tidak cocok. Beberapa pemeriksaan bersifat **vacuous** karena tabel ruangan/fasilitas/pengembalian kosong; itu bukan bukti proses tersebut sudah bekerja.

Keterbatasan SQLite existing yang perlu diketahui Backend Engineer:

- `INT PRIMARY KEY` bukan alias `INTEGER PRIMARY KEY`/rowid dan secara schema legacy dapat menerima NULL. API existing menyediakan ID eksplisit positif; jangan mengandalkan `lastInsertRowid` sebagai ID peminjaman.
- Affinity `INT`, `DATETIME`, dan `VARCHAR(n)` bukan validasi integer, tanggal nyata/zona, atau panjang penuh. `CHECK(waktu_selesai>waktu_mulai)` membandingkan representasi tersimpan; teks tanggal sembarang/campuran zona dapat lolos.
- FK hanya memeriksa keberadaan akun, bukan role/aktif akun; status legal tidak menjamin transisi legal. Constraint lama tidak menolak perubahan detail setelah approval.
- FK enforcement harus ON **pada setiap koneksi penulis**. Nilai 1 pada koneksi audit bukan bukti konfigurasi semua proses lain.
- Indeks PK detail berawalan pengajuan, bukan barang/ruangan; indeks lookup sumber daya diperlukan saat volume transaksi meningkat. Indeks tidak melarang interval overlap.

## 4. Audit migrasi pengajuan 001

Sumber: `database/migrations/001-loan-submission.sql`, `backend/loan-schema.mjs`, `tools/enable-loan-submissions.mjs`, dan `backend/loans.mjs` (dibaca, tidak diedit).

Migrasi aktual menambah hanya `dibuat_pada TEXT`, `request_key TEXT` (nullable, length 36), `request_hash TEXT` (nullable, length 64), serta unique partial index `(id_peminjam,request_key) WHERE request_key IS NOT NULL`.

Perbandingan read-only dengan backup `database/backups/loans-before-1795074865479-66a51b1d-78c2-474e-a049-7e34fc766667.sqlite` membuktikan:

- Kolom peminjaman berubah 8 → tepat 11; tiga kolom ditambahkan sesuai urutan migrasi.
- Schema objek lain identik; partial unique index sesuai DDL.
- Semua record/field lama dalam backup tetap utuh, termasuk **seluruh 3 akun dan 12 barang**. Tidak ada legacy row hilang/berubah.
- Tambahan yang teramati sejak backup hanya **1 header peminjaman dan 1 detail barang**. Backup tidak punya transaksi sehingga preservasi transaksi pra-001 pada target tidak dapat dibuktikan dengan contoh nonkosong; tes legacy sintetis existing mencakupnya.
- Unique index memungkinkan key NULL untuk legacy; length check bukan validasi UUID/hash hex ataupun kewajiban tiga field hadir bersama. API existing memvalidasi UUID v4 dan menulis ketiganya.
- Pengajuan existing atomik dalam `BEGIN IMMEDIATE`, seluruh detail dalam transaksi sama, idempotency scoped peminjam/key, tidak mengurangi total atau membuat reservasi. Ini perlu dipertahankan.

**Risiko kompatibilitas utama:** `loanSchemaState()` membandingkan daftar kolom `peminjaman` secara persis dengan profil 11 kolom. Menambah kolom jadwal/audit/approval ke tabel ini akan menyebabkan exception. Proposal memakai tabel pendamping; tidak menambah/mengurutkan ulang kolom header/detail existing atau mengubah index 001.

001 tidak dijalankan otomatis saat server startup. Namun `backend/db.mjs:7–9` existing memang membuka writable, mengatur WAL, dan menjalankan baseline `CREATE TABLE IF NOT EXISTS` setiap `openDb`. Karena itu fungsi tersebut **bukan alat audit read-only**. Sesi ini tidak mengubahnya dan tidak menambahkan jalur migrasi otomatis apa pun.

## 5. Kesimpulan kebutuhan database

1. **Wajib verifikasi stok fisik dan pembukuan terlebih dahulu.** Tidak bisa menghitung angka tersedia dari transaksi kosong/menunggu atau dari `stok_total` saja.
2. Baseline kondisi, perubahan kapasitas, aktor/alasan, dan versi perlu ditambah; snapshot absolut berversi cukup untuk Sprint 2, tidak perlu menyimpan `stok_tersedia` sebagai angka mutable.
3. Alokasi per detail diperlukan untuk memisahkan permintaan (`menunggu`) dari komitmen kapasitas (`disetujui`/`dipinjam`), tanpa merusak transaksi multi-barang.
4. Event penerimaan per barang diperlukan jika pengembalian parsial/berulang akan didukung. Schema pengembalian lama dapat dipertahankan sebagai ringkasan penutupan, bukan ledger kedua yang ikut dikurangkan.
5. Audit operasi append-only diperlukan untuk idempotency keputusan dan jejak perubahan; FK/indeks/STRICT tetap tidak menggantikan transaksi approval yang memeriksa peak load.

Desain tabel, relasi, dan backup/rollback: [DATABASE_SCHEMA_PROPOSAL_SPRINT2.md](DATABASE_SCHEMA_PROPOSAL_SPRINT2.md). Kontrak integrasi: [DATABASE_BACKEND_CONTRACT_SPRINT2.md](DATABASE_BACKEND_CONTRACT_SPRINT2.md).

## 6. Pengujian yang benar-benar dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| Audit langsung target, dua checkpoint dan pembandingan backup read-only | PASS; integritas ok, FK 0, akun/barang/seluruh data target tetap |
| `node --test tests/database-engineer/availability.test.mjs`, dengan source eksplisit | **PASS 14/14, skip 0** |
| `npm run test:backend` | **PASS 64/64, skip 0** |
| `node tools/database-engineer/verify-checkpoint.mjs <target> docs/DATABASE_AUDIT_SPRINT2_READONLY.json` | **PASS**, 08:47:48 UTC; 14 tabel identik; 3 akun/12 barang/1 header/1 detail; 0 tabel proposal pada source |
| Frontend build, lint, full TypeScript, browser UI | Tidak dijalankan; tidak ada perubahan UI/aplikasi |
| Approval operasional pada target | Tidak dijalankan; belum diimplementasikan oleh sesi ini |

Tes desain meliputi DDL rollback pada salinan SELECT konsisten; preservasi semua record; profil 001 dan pengajuan service existing setelah DDL; baseline kosong → null; constraint integer/FK/check/append-only; alokasi fasilitas; drift data; interval `[mulai,selesai)`; peak bukan jumlah seluruh overlap; nested window; retry approval; rollback multi-barang termasuk gagal insert kedua; ruangan overlap/kapasitas/perawatan/paket campuran; pembatalan/penolakan; overdue; pengembalian parsial/rusak/hilang/perbaikan; kapasitas turun; legacy approval tanpa alokasi; dua proses SQLite berebut kapasitas terakhir.

**Batas bukti:** algoritma approval/penerimaan di `tests/database-engineer/prototype.mjs` hanya harness uji, bukan business logic produksi atau endpoint baru. Uji concurrency memakai dua proses terpisah pada file sintetis. Perubahan kapasitas, serah terima, idempotency semua aksi, pengoreksian receipt salah, otorisasi approval, downtime ruangan terjadwal, dan resolusi konflik setelah kejadian fisik tetap perlu implementasi/uji integrasi Backend Engineer; jangan mengklaim fitur tersebut live.

Tes desain diulang setelah guard destination ditambahkan dan tetap PASS 14/14. Verifier ad-hoc awal sempat gagal karena `deepStrictEqual` membedakan row SQLite ber-prototype null dari object hasil parse JSON, bukan karena perbedaan isi database. Verifier khusus membandingkan representasi nilai JSON untuk schema/fingerprint, tanpa melemahkan pemeriksaan data.

Salinan target yang diuji berada di `%LOCALAPPDATA%\Temp\opencode\smartlend-db-engineer-cZt1p7\availability.disposable.sqlite` dan pada run terakhir `smartlend-db-engineer-kWDQRF\availability.disposable.sqlite` pada parent temp yang sama. File ini **memuat hash akun lokal hasil salinan**, tidak boleh diunggah/disajikan frontend. `0600` bukan jaminan ACL Windows; perlu retensi/penghapusan terkontrol dengan izin pemilik. Tidak ada file pengguna dihapus. Tes existing juga membuat fixture/backup baru miliknya sendiri; tidak menyasar target pengguna.

## 7. File sesi ini dan keputusan lanjutan

- Dokumen audit ini, proposal schema, kontrak backend, dan dua checkpoint JSON baru dalam `docs/`.
- `database/proposals/002-availability.DRAFT.sql`: DDL prototipe **di luar folder migrasi**, tidak terhubung aplikasi.
- `tools/database-engineer/audit-readonly.mjs`: alat audit explicit-path, tidak punya mode apply.
- `tools/database-engineer/verify-checkpoint.mjs`: verifikasi akhir read-only terhadap checkpoint JSON.
- `tests/database-engineer/prototype.mjs`, `tests/database-engineer/availability.test.mjs`: simulasi terisolasi.
- Tidak mengedit `src/`, `backend/`, `package.json`, baseline schema, 001, atau file session lain. Tidak mengganti SQLite, DB_PATH, akun, stok, ataupun transaksi existing.

**Berhenti pada desain.** Pemilik dan Backend Engineer perlu menyetujui definisi stok/fasilitas, peran verifikasi, kebijakan barang belum kembali, migrasi manual, dan rencana koreksi/audit sebelum DDL dipromosikan menjadi migrasi atau diterapkan pada target.
