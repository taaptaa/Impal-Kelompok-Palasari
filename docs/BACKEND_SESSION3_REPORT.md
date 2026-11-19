# SmartLend Sprint 2 — Session 3: backend dan business logic

## 1. Keputusan dan batas implementasi

**Approval BLOCKED. Rejection BLOCKED sampai kontrak audit keputusan disepakati.**

Tersedia: API baca Admin, statistik berdasarkan record DB, jadwal publik teragregasi, gate keputusan tanpa mutasi, dan penguatan validasi sesi saat submit. Tidak ada migrasi baru, perubahan UI, perubahan stok, provisioning akun, tarif, Payment Umum, atau persetujuan otomatis. Kontrak di bawah merupakan **handoff untuk disepakati**, bukan bukti Session Database/Frontend sudah menyetujui atau mengintegrasikannya.

File implementasi:

- Baru `backend/loan-reads.mjs`: validasi filter, snapshot baca, daftar/detail/statistik, agregasi jadwal dan readiness.
- Diubah `backend/server.mjs`: routing/otorisasi, gate keputusan, pemeriksaan ulang sesi setelah upload dan di dalam transaksi submit.
- Diubah `backend/loans.mjs`: callback otorisasi di bawah `BEGIN IMMEDIATE`, sebelum insert **atau replay**.
- Baru `tests/backend-reads.test.mjs`: seluruh mutasi memakai data sintetis pada memori/file disposable baru.
- Baru laporan ini. `package.json`, `src/`, `dist/`, schema/migrasi dan dokumen milik sesi lain tidak diedit.

## 2. Audit existing

Stack aktual: Node 22.13.1, HTTP native, `node:sqlite`, adapter SQLite sinkron. Tidak ada adapter MariaDB aktif. `DB_PATH` tidak terisi pada proses alat audit; jangan menganggap sebuah file otomatis merupakan DB otoritatif/produksi.

Target yang disebut dokumentasi existing diperiksa **read-only**, tanpa `openDb`, login, seed, atau migrasi:

`database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`

Checkpoint audit: 3 akun, 12 barang, **1 peminjaman menunggu / 1 detail barang**, 0 detail ruangan, 0 fasilitas ruangan, 0 pengembalian/detail pengembalian. Integritas `ok`, pelanggaran FK 0, profil metadata pengajuan `ready`. Angka ini menggantikan asumsi laporan lama bahwa transaksi masih kosong; transaksi tersebut tidak dihapus/disunting. Tidak meminta/mencetak password atau token pemilik. Verifikasi akhir membandingkan fingerprint schema dan seluruh isi tabel secara internal sebelum/sesudah pemanggilan read service: **identik**, tanpa mencetak field sensitif. Statistik nyata membaca total 1/menunggu 1; sampel jadwal barang membaca segmen kosong dengan verification unverified/availableQuantity null, bukan klaim tersedia.

### Pengajuan, idempotency dan otorisasi

| Area | Temuan/perlakuan |
| --- | --- |
| Login | scrypt bersalt, rotasi cookie sesi, lockout per email setelah kegagalan; dipertahankan |
| Sesi | token acak disimpan sebagai hash; expiry, akun aktif dan role dibaca ulang dari DB; cookie HttpOnly/SameSite=Strict, Secure jika origin HTTPS |
| CSRF | POST pengajuan/logout tetap memerlukan token sesi; Origin exact-match dan JSON; gate keputusan memakai perlindungan sama |
| Pemilik | mahasiswa hanya membaca ID **dan** pemilik sesi pada query detail; IDOR menghasilkan 404 |
| Payload | field identitas/status tambahan ditolak; jumlah integer positif, ID unik, tanggal ISO UTC kanonik, keperluan maksimal 150 karakter |
| Idempotency | UUID v4 scoped per peminjam; hash payload kanonik, key sama+payload sama replay, beda payload 409; indeks unique existing |
| Atomicity submit | `BEGIN IMMEDIATE`, nomor dari MAX+1 di dalam lock, header+seluruh detail commit bersama, rollback saat gagal |
| Stok | submit hanya memeriksa batas `stok_total`, **bukan** availability; stok tidak dikurangi, status awal selalu `menunggu` |
| Race sesi ditemukan | sebelumnya snapshot sesi dibuat sebelum stream body di-await; logout/expiry/nonaktif/perubahan role saat upload bisa terlewat |
| Perbaikan race sesi | revalidasi setelah body selesai, lalu callback sesi/role/CSRF di dalam write lock sebelum submit/replay; pencabutan yang sudah commit sebelum lock terlihat; pencabutan sesudah lock terserialisasi setelah submit |

Risiko existing di luar perubahan ini: lockout berbasis email saja belum menjadi rate limiter global/IP; scrypt dan SQLite sinkron dapat menahan event loop; timeout upload, batas koneksi, TLS, monitoring, dan limiter di reverse proxy perlu audit produksi. `openDb` menjalankan baseline `CREATE TABLE IF NOT EXISTS` saat startup: jangan mengarahkannya ke target tanpa audit. Tidak mengganti perilaku startup milik sesi Database dalam tugas ini.

## 3. Kontrak endpoint yang tersedia

Semua respons JSON, `Cache-Control: no-store`. Tidak ada CORS permisif baru. GET tidak memakai CSRF karena tidak melakukan mutasi. Role berasal dari sesi/database, bukan query/header role.

| Metode / endpoint | Akses | Respons sukses/perilaku |
| --- | --- | --- |
| GET `/api/admin/loans` | Admin aktif | `{loans, pagination, filters, asOf}` |
| GET `/api/admin/loans/:id` | Admin aktif | `{loan, decisions, asOf}`; 404 ID tidak ditemukan/tidak aman |
| GET `/api/admin/loans/stats` | Admin aktif | `{total, byStatus, itemUnitsByStatus, roomLoansByStatus, filters, decisions, asOf}` |
| GET `/api/admin/loans/readiness` | Admin aktif | `{decisions}`; kedua aksi tetap BLOCKED |
| GET `/api/schedule` | Publik/mahasiswa; tidak membuat sesi | Agregat satu barang atau satu ruangan, tanpa PII |
| POST `/api/admin/loans/:id/approve` | Admin+Origin+JSON+CSRF | **503 APPROVAL_BLOCKED**, tidak memutasi apa pun |
| POST `/api/admin/loans/:id/reject` | Admin+Origin+JSON+CSRF | **503 REJECTION_BLOCKED**, tidak memutasi apa pun |
| GET `/api/loans/mine`, GET `/api/loans/:id` | Mahasiswa pemilik | Kontrak existing tetap; status dibaca dari DB saat GET |
| POST `/api/loans` | Mahasiswa+Origin+JSON+CSRF+UUID | Kontrak existing 201/200 replay tetap |

Gate POST bukan implementasi approval/rejection: body objek apa pun setelah pemeriksaan keamanan tetap ditolak 503. Tidak memeriksa keberadaan ID atau mengeksekusi kontrak keputusan masa depan. Metode selain POST pada gate menghasilkan 405. Tidak ada flag/environment untuk mengaktifkan keputusan.

Error: 400 parameter/payload invalid; 401 tanpa sesi/expired/nonaktif; 403 role/CSRF/Origin/format; 404 resource tidak ditemukan; 405 metode gate/jadwal salah; 413 body melebihi batas; 503 keputusan diblokir/schema tidak didukung/jadwal tak dapat dibaca aman/DB busy; 500 internal tanpa stack/SQL. Body gate maksimal 4 KiB; submit existing 16 KiB.

### 3.1 Filter daftar dan statistik

Parameter opsional: `status`, pasangan `startsAt`+`endsAt`, `itemId`, `roomId`. Daftar juga menerima `limit` (default 25, 1–100), `offset` (default 0, 0–1.000.000). Batas tersebut teknis, bukan aturan bisnis peminjaman. Parameter asing, berulang, angka nonkanonik, status Inggris/palsu, tanggal tidak nyata atau tanpa zona ditolak 400.

- Enam status: `menunggu`, `disetujui`, `dipinjam`, `selesai`, `ditolak`, `dibatalkan`.
- Filter tanggal adalah **overlap periode pinjam**, bukan tanggal pembuatan: `mulai < queryEnd AND selesai > queryStart`, interval setengah terbuka `[mulai,selesai)`.
- `itemId`/`roomId` memfilter header melalui EXISTS; keduanya berarti intersection. Header multi-barang tidak dihitung dua kali.
- `itemUnitsByStatus` adalah jumlah seluruh unit pada header yang lolos filter, **bukan stok tersedia** dan bukan hanya jumlah unit item filter. `roomLoansByStatus` menghitung header dengan detail ruangan, bukan peserta/kapasitas.
- Keenam key statistik selalu ada, termasuk nol yang benar-benar berasal dari hasil query kosong, bukan fixture.
- Daftar diurut ID descending, bukan mengarang timestamp legacy. Pagination offset bukan snapshot lintas request; data dapat bergeser jika ada insert di antara halaman.
- Masing-masing respons list/detail/stats/schedule memakai satu transaksi baca untuk menghindari campuran COUNT/header/detail dari commit berbeda. Dua request terpisah dapat berbeda; `asOf` merupakan waktu server saat pembacaan, **bukan** bukti inventaris sudah diverifikasi.

Contoh request (waktu contoh, bukan transaksi yang dibuat):

```http
GET /api/admin/loans?status=menunggu&limit=25&offset=0
GET /api/admin/loans/stats?startsAt=2030-01-02T00%3A00%3A00.000Z&endsAt=2030-01-03T00%3A00%3A00.000Z
```

Shape loan Admin:

```text
{
  id, number, startsAt, endsAt, reason, status, createdAt,
  borrower: {id, name, email, role},
  admin: null | {id, name},
  items: [{itemId, code, name, unit, quantity}],
  room: null | {roomId, code, name, participants},
  totalTypes, totalUnits
}
pagination = {total, limit, offset, hasMore}
```

PII hanya tersedia untuk Admin atau mahasiswa pemilik melalui kontrak existing. `admin` hanya memantulkan FK existing, bukan bukti audit keputusan lengkap. Tidak mengarang tanggal keputusan, alasan penolakan, timestamp pembuatan legacy, atau snapshot nama historis. Tidak mengirim password/hash, key/hash idempotency, token sesi atau CSRF dalam respons pengajuan/statistik/jadwal.

Read API mendukung profil baseline 8 kolom dan profil existing 11 kolom+indeks unique. Baseline menghasilkan `createdAt:null` tanpa perlu migrasi metadata. Schema di luar kedua profil ditolak 503 untuk diaudit, bukan diperbaiki otomatis. Metadata pengajuan baru tetap membutuhkan migrasi existing yang dikelola terpisah.

### 3.2 Jadwal publik

Wajib: ISO UTC kanonik `startsAt`, `endsAt`, dan **tepat satu** `itemId` atau `roomId`. Rentang maksimal 31 hari/request (batas teknis), tanpa parameter status/peminjam. Resource harus ada, atau 404.

```text
{
  resource: {type: "item", id, code, name, unit}
         | {type: "room", id, code, name, operationalStatus},
  period: {startsAt, endsAt}, interval: "[startsAt,endsAt)",
  scope: "direct_details_only",
  timeBasis: "sqlite_utc_legacy_unverified",
  segments: [{startsAt, endsAt, recordedQuantity}],
  borrowedQuantityPendingReconciliation,
  availability: {verification: "unverified", availableQuantity: null, blockers: [...]},
  asOf
}
```

- Hanya detail langsung berstatus `disetujui`/`dipinjam`; `menunggu` bukan reservasi. `selesai`/`ditolak`/`dibatalkan` tidak mengunci jadwal tercatat.
- Segmen di-clip ke query, diurut, dijumlah per beban bersamaan, dan segmen berdampingan dengan jumlah sama digabung. Tidak mengirim satu baris per peminjam.
- Ruangan dihitung 1 per detail, bukan jumlah peserta. Fasilitas ruangan **belum** digabung ke beban barang karena kebijakan kepemilikan stok belum disahkan.
- `borrowedQuantityPendingReconciliation` menghitung semua detail `dipinjam` pada resource tersebut, **tidak dibatasi periode query**. Jadwal selesai bukan bukti barang kembali; indikator ini tidak dikurangkan dari kapasitas karena kapasitas belum sah.
- `segments:[]` **tidak berarti tersedia**. `availableQuantity` selalu null, bahkan inventaris/booking kosong. Jangan ubah menjadi nol atau `stok_total` di Frontend.
- SQL legacy dibandingkan melalui `julianday`, bukan urutan string dengan pemisah spasi vs `T`. SQLite menafsirkan tanggal tanpa zona sebagai UTC untuk pembacaan; zona asal legacy belum dibuktikan. Admin menerima nilai waktu tersimpan; segmen publik memakai interpretasi SQLite UTC dengan label unverified. Ini tidak boleh dijadikan dasar approval.
- Periode/jumlah alokasi yang tak dapat diinterpretasikan atau noninteger menghasilkan 503; lebih dari 5.000 baris overlap juga 503 (perkecil rentang), bukan jadwal parsial yang terkesan lengkap.
- Tidak ada nama/email/alasan/nomor/ID peminjaman, aktor, status per peminjam, key request atau token. Waktu/jumlah pemakaian aset tetap merupakan metadata publik yang disengaja; persetujuan kebijakan publikasi metadata diperlukan sebelum deployment produksi.

## 4. Aturan status dan availability — rancangan untuk koordinasi

Transisi yang diusulkan, **belum diaktifkan**:

| Dari | Ke | Otoritas/prasyarat |
| --- | --- | --- |
| menunggu | disetujui | Admin, seluruh paket lolos kapasitas+alokasi atomik |
| menunggu | ditolak | Admin, alasan wajib dan audit keputusan atomik |
| menunggu/disetujui | dibatalkan | Kebijakan aktor/batas waktu perlu disepakati; release sekali setelah commit |
| disetujui | dipinjam | Petugas, serah-terima aktual dan validasi ulang kondisi/alokasi |
| dipinjam | selesai | Petugas, jumlah kembali/kondisi direkonsiliasi; pengembalian parsial belum otomatis selesai |

`ditolak`, `dibatalkan`, `selesai` terminal kecuali proses koreksi terpisah yang diaudit. Tidak ada status baru `overdue`: keterlambatan merupakan kondisi turunan, tidak otomatis mengakhiri alokasi. Tidak boleh langsung `menunggu -> dipinjam/selesai`. Penolakan tidak mengurangi/menambah stok.

Untuk barang b pada interval I:

1. `C_b(t)` = kapasitas **layak dipinjam terverifikasi**, bukan otomatis `stok_total`.
2. `L_b(t)` = komitmen simultan yang relevan: reservasi disetujui, pemakaian belum kembali, serta alokasi fasilitas/ruangan sesuai kontrak yang disahkan.
3. Headroom interval = `min(t dalam I) [C_b(t) - L_b(t)]`. Untuk kapasitas konstan: kapasitas dikurangi **puncak beban bersamaan**, bukan menjumlah semua booking yang menyentuh I.
4. Paket q aman hanya jika `L_b(t)+q_b <= C_b(t)` untuk **semua** barang/titik perubahan dan ruangan eksklusif bebas. Satu gagal → seluruh paket rollback.
5. Headroom negatif menandakan overcommit/data bermasalah, bukan angka yang boleh ditutupi menjadi stok tersedia. Baseline, riwayat, atau timezone tak pasti → `unverified/null`, approval BLOCKED.

Contoh konseptual: kapasitas sah 5; booking 3 unit pukul 08–09 dan 3 unit pukul 09–10 memerlukan puncak 3, bukan 6; periode bersebelahan tidak overlap. Jika barang belum kembali, batas akhir rencana tidak otomatis membebaskannya. Kebijakan penahanan/extension keterlambatan harus menjamin tidak ada janji kapasitas palsu.

Rusak/hilang, maintenance, stok yang dialokasikan tetap di ruangan, perbaikan, dan pengembalian parsial harus direkonsiliasi satu kali. Jangan mengurangi rusak/hilang lagi apabila stok/baseline sudah memperhitungkannya. Tidak mengubah `stok_total` ketika pengajuan dibuat atau disetujui untuk menyimulasikan reservasi.

## 5. Kontrak keputusan masa depan dan proteksi double booking

**Usulan setelah persetujuan Session Database**, bukan field DB yang diasumsikan sudah ada:

```text
POST /api/admin/loans/:id/approve
Cookie + Origin + JSON + X-CSRF-Token + Idempotency-Key UUID v4
body: {expectedVersion: integer}

POST /api/admin/loans/:id/reject
header sama
body: {expectedVersion: integer, reason: string wajib}

sukses: {loan: receipt tersimpan, decision: {action, actorId, occurredAt, version}, replayed}
konflik: 409 untuk versi/status berubah, key berbeda payload, atau kapasitas tidak cukup
belum terverifikasi: 503 APPROVAL_BLOCKED
```

Panjang alasan, kolom version, penyimpanan audit/replay dan shape receipt final harus disepakati pemilik schema; saat ini tidak ada storage untuk menjamin kontrak tersebut. Jangan mengirim userId/actor/status tujuan dari klien sebagai otoritas.

Urutan transaksi approval yang wajib diimplementasikan sebelum aktivasi:

1. Verifikasi sesi/role/CSRF/Origin/payload; mulai transaksi, periksa kembali identitas di bawah lock.
2. Lookup key keputusan scoped aktor+aksi, payload hash mencakup ID/versi; replay hasil commit sebelumnya, konflik untuk payload berbeda. Idempotency submit mahasiswa **bukan** idempotency keputusan.
3. Lock header dan resource kapasitas yang stabil dalam urutan ID deterministik, termasuk seluruh barang dan ruangan/fasilitas terkait.
4. Baca ulang status/version, baseline verified+version, adjustment/kondisi, alokasi dan outstanding returns dari snapshot terlindungi. Jangan percaya angka availability dari GET/browser.
5. Sweep event batas mulai/selesai dan perubahan kapasitas; evaluasi seluruh paket. Data tidak lengkap → fail closed.
6. Simpan alokasi, CAS status `menunggu`+expectedVersion, aktor/waktu/alasan keputusan dan audit+hasil idempotency dalam satu commit. Tidak ada side effect eksternal sebelum commit; notifikasi perlu outbox jika kelak dibutuhkan.
7. Mahasiswa membaca status commit melalui GET Peminjaman Saya; tidak ada state frontend yang menjadi sumber kebenaran.

SQLite saat ini: `BEGIN IMMEDIATE` menserialisasi writer; busy/locked harus menghasilkan kegagalan retryable tanpa paket parsial. MariaDB nanti memerlukan adapter dan transaksi/locking yang diuji khusus, misalnya lock baris kapasitas/inventaris stabil `FOR UPDATE` sebelum query alokasi. Mengunci hanya baris booking overlap **tidak cukup** saat himpunan booking kosong: dua Admin dapat sama-sama membaca kosong (phantom race). Semua jalur pengubah kapasitas/alokasi—approval, batal, checkout, return, repair, fasilitas—wajib mengikuti protokol lock yang sama. Deadlock retry memakai key sama, bukan membuat keputusan baru.

Rejection hanya menerima `menunggu`, memerlukan reason/actor/timestamp/version/idempotency+audit atomik, tanpa alokasi atau stok. Balapan approve-vs-reject pada pengajuan sama hanya boleh punya satu pemenang CAS; keputusan lain 409, kecuali replay identik. Karena audit/version belum tersedia, rejection juga belum diaktifkan.

Risiko saat ini: baseline tidak ada, transaksi/kondisi mungkin belum lengkap, timezone legacy ambigu, aturan fasilitas dan keterlambatan belum sah. Tidak ada jaminan database terhadap penulisan status/alokasi langsung oleh tool lain. **Gate BLOCKED mencegah keputusan melalui API ini; itu bukan bukti algoritme approval aman sudah tersedia.**

## 6. Handoff dan checklist aktivasi

Session Database perlu menetapkan/menghasilkan kontrak, bukan Session 3 membuat DDL sendiri:

- [ ] DB otoritatif/dialek dan pemetaan ID/semantik timestamp legacy diputuskan.
- [ ] Baseline per barang: layak/rusak/hilang/maintenance/fasilitas, sumber verifikasi, aktor, waktu, version, masa berlaku; coverage seluruh barang yang akan disetujui.
- [ ] Definisi `stok_total` dan aturan pengurangan kondisi disahkan, tanpa double subtraction.
- [ ] Relasi fasilitas ke stok barang, eksklusivitas ruangan dan sumber konflik silang ditetapkan.
- [ ] Ledger alokasi/kondisi/repair dan return parsial/hilang/terlambat lengkap; reconciliation memiliki bukti, bukan asumsi tabel kosong.
- [ ] Status/version CAS, audit aktor/alasan/waktu, idempotency keputusan dan constraint integer/unit/interval/relasi disepakati.
- [ ] Indeks untuk resource/pengajuan/status/periode dan rencana query ditinjau pada volume nyata; query `julianday`/EXISTS dan N+1 bounded list saat ini bukan klaim skala produksi.
- [ ] Migrasi dikerjakan Session Database dengan backup/preservasi dan review bersama; pembaca profil schema disesuaikan setelah kontrak disahkan.
- [ ] Protokol lock seluruh writer, recovery/busy/deadlock, dan matriks race di bawah lulus.
- [ ] Review privasi publikasi jadwal dan izin operator sebelum deployment.

Session Frontend dapat memakai endpoint baca setelah menyetujui kontrak. Tetap pisahkan enam status; tampilkan readiness BLOCKED; jangan tampilkan availableQuantity null sebagai tersedia/0; jangan gunakan PII dari endpoint Admin pada jadwal publik. Halaman Peminjaman Saya existing tidak diubah; hasil status baru terbaca pada fetch/refresh, **belum** push/poll otomatis. Tampilan alasan penolakan/audit menunggu kontrak DB/API final.

## 7. Pengujian dan batas bukti

Perintah yang harus dijalankan bersama (script existing tidak diubah agar tidak menyentuh file bersama):

```powershell
npm run test:backend
node --test tests/backend-reads.test.mjs
```

Semua mutasi dilakukan pada SQLite memori atau disposable baru. Suite existing juga membuat backup/disposable sintetis di direktori pengujian existing; tidak mengarahkan mutasi ke target pemilik. Tes baca mencakup koneksi `readOnly:true` dan membandingkan seluruh isi tabel/schema sebelum-sesudah. Build regresi diarahkan ke folder temporary, bukan menimpa `dist` milik Frontend.

### Hasil aktual, 19 November 2026

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run test:backend` | **PASS 64/64**, termasuk idempotency dan alokasi nomor pengajuan lintas proses |
| `node --test tests/backend-reads.test.mjs` | **PASS 23/23**, tanpa skip |
| `node node_modules/vite/bin/vite.js build --outDir=<folder-temp-baru>` | **PASS**, 2.530 modul; tidak menimpa `dist/` |
| Baca target dokumentasi melalui `DatabaseSync(...,{readOnly:true})` dan service baru | **PASS**, statistik nyata; fingerprint schema/seluruh tabel sebelum-sesudah identik, integritas ok, FK 0 |
| Lint/TypeScript checker terpisah | **Tidak dijalankan**: tidak ada script checker/lint; Vite build bukan typecheck penuh |
| Uji visual/browser | **Tidak dijalankan**: tidak ada perubahan/integrasi UI dalam lingkup sesi ini |
| Approval aktif dan race kapasitas | **BLOCKED / belum diimplementasikan**, bukan dinyatakan lulus |

Total **87 tes lulus** dari kedua perintah, seluruh mutasi memakai DB uji terpisah. Build awal melalui `npm run build -- --outDir ...` gagal karena argumen flag tidak diteruskan sebagaimana dimaksud oleh invocation npm/PowerShell (path menjadi root Vite); invocation langsung CLI Vite di atas kemudian berhasil. Tidak memperbaiki konfigurasi/dependency atau membangun ulang direktori UI untuk menutupi kegagalan tersebut. Output build sukses berada di `%LOCALAPPDATA%\Temp\opencode\smartlend-session3-build-bbe779f7-cb08-4a2a-bd59-5f7b1bc71e22`. Peringatan experimental `node:sqlite` tetap ada; Vite mengingatkan outDir di luar root tidak dikosongkan, sesuai niat memakai folder baru.

Tes baru meliputi role Admin/student/warehouse/anonim; privasi; filter tanggal/status/resource; enam statistik dengan header multi-detail; ruangan; legacy timestamp; clip/overlap/nested/adjacent; jadwal kosong/null; borrowed di luar periode; data invalid/batas baris; baseline tanpa migrasi dan schema drift; gate 503 paralel tanpa mutasi; sesi dicabut saat upload dan tepat sebelum write lock; snapshot baca ketika writer koneksi lain commit di antara COUNT dan SELECT; serta seluruh status yang dibaca ulang di Peminjaman Saya dengan IDOR 404.

**Belum dapat diuji sebagai fitur aktif:** dua approval bersamaan berebut unit terakhir, approve-vs-reject aktif, return parsial/repair/batal melawan approval, baseline berubah saat approval, deadlock/replay audit keputusan dan recovery alokasi. Implementasinya sengaja belum ada. Tes serentak gate hanya membuktikan semuanya ditolak tanpa mutasi; bukan kelulusan safety approval. Setelah DB disepakati, tes tersebut wajib dijalankan pada disposable dengan koneksi/proses terpisah, termasuk booking kosong, multi-barang rollback dan puncak beban bertingkat.
