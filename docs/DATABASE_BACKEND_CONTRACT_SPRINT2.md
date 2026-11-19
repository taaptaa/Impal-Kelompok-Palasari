# Kontrak Database untuk Backend Engineer — DRAFT

**Bukan API yang sudah tersedia.** Tidak ada endpoint atau business logic produksi yang ditambahkan sesi Database Engineer. Tetap gunakan autentikasi/session dan pengajuan multi-barang existing. [Audit](DATABASE_ENGINEER_SPRINT2_AUDIT.md) dan [schema](DATABASE_SCHEMA_PROPOSAL_SPRINT2.md) memuat bukti serta keputusan yang masih terbuka.

## 1. Kontrak yang tidak boleh berubah

- 3 akun/12 barang dan semua transaksi existing dilindungi; bukan target seed/reset. Saat audit ada **1 pengajuan menunggu**. Jangan membuat migrasi dengan asumsi tabel peminjaman kosong.
- Jangan mengganti DB_PATH, engine, tabel/kolom legacy, urutan 11 kolom `peminjaman`, atau index idempotency 001. `loanSchemaState` existing sensitif terhadap penambahan kolom.
- POST pengajuan existing tetap membuat header `menunggu` dan seluruh detail dalam satu `BEGIN IMMEDIATE`; tidak membuat alokasi, mengurangi `stok_total`, atau menjanjikan ketersediaan.
- Draft client dan `menunggu` tidak mengunci kapasitas. Jangan mengubahnya menjadi reservasi terselubung.
- Jangan import `tests/database-engineer/prototype.mjs` ke backend. Itu hanya executable specification untuk tes, bukan implementasi siap pakai.

## 2. Hasil query availability yang dibutuhkan

Kontrak fungsi/repository internal, **tanpa menentukan URL endpoint**:

```ts
type AvailabilityResult = {
  itemId: number;
  startsAt: string; // ISO UTC kanonik; interval [startsAt, endsAt)
  endsAt: string;
  checkedAt: string;
  verificationId: number | null;
  verificationRevision: number | null;
  verifiedAt: string | null;
  capacity: number | null;       // kapasitas pool terverifikasi, BUKAN stok_total
  peakCommitted: number | null;
  available: number | null;
  verificationStatus: 'terverifikasi' | 'belum_diverifikasi' | 'perlu_rekonsiliasi';
  reason: null | 'UNVERIFIED_STOCK' | 'RECONCILIATION_REQUIRED'
    | 'UNRECONCILED_LEGACY_ALLOCATION' | 'ALLOCATION_STATE_MISMATCH'
    | 'CAPACITY_DEFICIT';
};
```

- Angka `0` hanya berarti terverifikasi dan kapasitas tersisa benar-benar nol. Tidak cukup data → `available:null`, reason terisi, bukan fallback total. Angka tidak boleh di-clamp dari negatif ke nol untuk menyembunyikan defisit.
- Quote hanya untuk interval future valid (`startsAt >= checkedAt`), bukan audit availability historis. Untuk waktu lampau diperlukan rekonstruksi event/history, bukan query snapshot kini.
- Belum ada kebijakan maksimum durasi yang disahkan. Jangan menolak pengajuan lama atau memasukkan batas baru dari contoh/prototipe.
- Satu transaksi baca untuk seluruh paket diperlukan agar hasil tidak berasal dari versi stok berbeda. Quote bukan lock, bukan jaminan approval, dan cache client bukan sumber keputusan.
- Versi baseline pada respons adalah referensi audit/optimistic context; bukan satu-satunya version keseluruhan availability. Approval/cancel/receipt dapat mengubah komitmen tanpa mengubah baseline. Selalu hitung ulang di transaksi penulis.
- Ruangan mempunyai hasil sejenis: ID, interval, checkedAt, status operasional, kapasitas peserta, ada konflik atau tidak, serta alasan rekonsiliasi. Tidak ada ruangan dalam target saat ini; jangan inventarisasi ruang fiktif.

## 3. Rumus dan query guard wajib

Untuk barang `b`, ambil snapshot revisi tertinggi yang terverifikasi, jumlah bucket lengkap, total dan fasilitas sesuai sumber legacy, operasi pemeriksa sah, serta tidak ada pengajuan mengunci tanpa alokasi/ledger yang sudah direkonsiliasi.

```text
overlap(A,B) = A.mulai < B.selesai AND B.mulai < A.selesai
available(b,[s,e)) = verifiedPoolCapacity(b) - MAX_t load(b,t), s <= t < e
```

Algoritma sweep-line:

1. Untuk reservasi aktif yang belum diambil, interval efektif = rencana `[mulai_ms,selesai_ms)`, jumlah = `detail_barang.jumlah`.
2. Untuk alokasi sudah diambil, sisa = jumlah diminta − total receipt baik/rusak/hilang yang sah. Model konservatif memakai `[min(mulai_ms,diambil_ms), +infinity)` dengan jumlah sisa untuk quote future. Jangan membebaskan unit hanya karena waktu rencana selesai lewat.
3. Klip ke `[s,e)`. Pada setiap awal tambahkan jumlah dan pada setiap akhir kurangi. **Gabungkan delta di timestamp yang sama** sebelum menghitung running sum/peak; ini membuat interval bersebelahan tidak bentrok.
4. Kapasitas dikurangi **peak load**, bukan SUM seluruh pengajuan yang menyentuh interval. Contoh sintetis kapasitas 10: dua reservasi 6 unit pada dua interval bersebelahan mempunyai peak 6, bukan 12.
5. Alokasi dilepas tidak dihitung, tetapi release harus valid terhadap status dan ledger. Status `menunggu/ditolak/dibatalkan/selesai` tidak boleh menyisakan alokasi aktif yang tidak direkonsiliasi.

Index overlap membantu seleksi tetapi bukan bukti tidak bentrok. Ruangan eksklusif memakai `NOT EXISTS` overlap alokasi aktif, ditambah status aktif, peserta <= kapasitas, dan rekonsiliasi loan legacy yang sudah disetujui/dipinjam.

**Tidak ada jaminan DB-only:** backend wajib menjadi jalur penulis yang terkontrol. FK/UNIQUE tidak membatasi jumlah agregat interval atau otomatis menyamakan jadwal alokasi dengan header. Jangan membiarkan jalur CRUD lain mengubah detail/header/alokasi tanpa guard yang sama. Jika ada penulis eksternal, usulkan hardening constraint/trigger tambahan sebelum operasi live.

## 4. Transaksi approval paket

Semua langkah berikut harus satu transaksi sinkron pada **koneksi yang sama**, tanpa network/await saat write lock ditahan:

```text
validasi sesi, role, CSRF, bentuk payload dan key
PRAGMA foreign_keys=ON; PRAGMA busy_timeout=<nilai yang disetujui>
BEGIN IMMEDIATE
  lookup audit_operasi berdasarkan (pelaku dari sesi, request_key)
  key/hash/aksi/target sama → replay keputusan commit asli, tanpa alokasi baru
  key sama payload berbeda → conflict; jangan ubah keputusan lama
  baca ulang akun pelaku: aktif dan role admin (usulan, perlu disahkan)
  baca header/detail terkini; status harus menunggu, tidak kosong
  validasi integer, jadwal kanonik future, barang/ruang sah
  baca seluruh baseline, fasilitas, ledger, dan komitmen dalam write transaction
  cek kapasitas semua item dan konflik ruang; jadwal tidak diambil dari client
  buat satu audit_operasi dengan before/after hasil nyata
  insert alokasi tiap detail + alokasi ruang (jika ada)
  UPDATE header SET status=disetujui,id_admin=<sesi> WHERE status=menunggu
  wajib affected rows = 1; pastikan alokasi lengkap dan konsisten
COMMIT
kirim sukses hanya setelah commit
```

Jika satu item/ruang gagal: ROLLBACK seluruh alokasi, status, dan audit/key. Jangan mengirim “sebagian disetujui” untuk paket yang belum punya model partial approval. `BEGIN IMMEDIATE` menyerialkan semua writer SQLite; dua proses tidak boleh sama-sama memakai hasil cek sebelum lock. `SQLITE_BUSY/LOCKED` → retry terbatas/backoff atau error dapat dicoba lagi, bukan dianggap kapasitas tersedia. Retry setelah hasil commit tidak pasti menggunakan key/payload yang sama.

ID audit/snapshot/receipt baru menggunakan **INTEGER PRIMARY KEY** dan lastInsertRowid yang sesuai tabel baru. Nomor/ID peminjaman existing tetap strategi existing `MAX+1` dalam transaksi, bukan mengubah seluruh PK legacy.

## 5. Mutasi lain yang harus atomik

| Operasi | Ketentuan database |
| --- | --- |
| Tolak | Hanya status menunggu, tidak membuat alokasi; reason/actor/before-after audit satu transaksi |
| Batalkan sebelum diambil | Validasi transisi/otorisasi; release seluruh alokasi paket, status dibatalkan dan audit sekaligus. Jangan delete alokasi |
| Batalkan setelah diambil | **Jangan release custody**. Perlu proses pengembalian; kebijakan pembatalan administratif tidak boleh membuat stok fisik kembali secara fiktif |
| Serah terima | Validasi approval, actor petugas, waktu aktual, baseline dan semua konflik ulang. Catat waktu diambil dan status dipinjam + audit. Evaluasi seluruh komitmen future akibat ekstensi konservatif; resolusi eksplisit bila bertabrakan |
| Terima sebagian | Validasi alokasi sudah diambil, tidak dilepas; SUM receipt + batch <= jumlah pinjaman; insert semua detail event + audit satu transaksi |
| Kembali baik | Mengurangi outstanding custody; **tidak** menambah kapasitas baseline lagi karena unit baik sudah termasuk pool |
| Rusak/hilang | Mengurangi outstanding dan mengurangi kapasitas layak sekali melalui snapshot absolut pengganti dalam transaksi receipt yang sama. Jika komitmen future defisit, catat fakta berstatus rekonsiliasi dan blokir approval; jangan menyembunyikan konflik |
| Selesai | Hanya bila semua unit semua barang sudah diterima/diselesaikan dan ruang telah dilepas. Release item terverifikasi boleh per item, header jangan selesai prematur |
| Perbaikan/perolehan/realokasi/penghapusan | Snapshot baru, bukti/actor/reason audit, perubahan total/fasilitas sah bila perlu, validasi semua dampak kapasitas. Jangan menjumlahkan snapshot/delta dua kali |
| Kapasitas/status ruangan berubah | Before/after audit dengan FK ruang, validasi peserta dan semua booking terdampak, transaksi yang sama. Bukan update tanpa jejak yang membiarkan booking mustahil |

Role di atas adalah usulan pemisahan Admin/Petugas, bukan otorisasi baru yang dipasang sesi ini. FK actor saja tidak membuktikan role/aktif. API tidak boleh menerima `id_admin/id_petugas/id_pelaku`, status, baseline, atau angka tersedia dari client sebagai kebenaran.

Semua aksi mutasi harus idempotent dengan hash canonical berisi aksi, target, dan payload bisnis. Tidak cukup hanya membandingkan ID loan. `audit_operasi` unik per actor/key; key aksi approval tidak dicampur dengan key POST pengajuan milik peminjam. Hash/key tidak diekspos pada respons publik. Reason dan audit JSON tidak boleh memuat credential/token; batasi PII dan ukuran.

## 6. Integrasi data lama dan fail-closed

1. Tabel baru kosong setelah migrasi adalah kondisi yang benar: **12 barang existing belum terverifikasi**. Jangan otomatis set layak = total, bahkan karena hanya satu pengajuan menunggu.
2. Tidak backfill alokasi dari pengajuan menunggu. Pengajuan SL-1 existing baru memperoleh alokasi bila approval eksplisit lolos verifikasi.
3. Jika sebelum integrasi ditemukan status disetujui/dipinjam legacy: inventarisasi jadwal, jumlah, pickup dan outstanding dari bukti. Sampai direkonsiliasi, availability terkait null dan approval ditahan. Jangan mengasumsikan semua selesai/dikembalikan.
4. Jika ada pengembalian lama: definisikan marker/cutover ledger dan lakukan impor manual terverifikasi terpisah bila disetujui. Jangan menggabungkan `detail_pengembalian` dan `penerimaan_barang` tanpa deduplikasi/cutover.
5. Pilih satu ledger sumber untuk receipt baru; tabel legacy hanya ringkasan penutupan dengan aturan kondisi campuran yang disetujui. Koreksi receipt immutable butuh desain reversal tambahan; **belum aman untuk operasional return** hanya dengan prototipe ini.
6. `verificationStatus/reason` dapat diteruskan Session Frontend untuk copy jujur, bukan angka tersedia palsu. Tidak ada frontend yang diedit sesi ini.

## 7. Cara mengulang pemeriksaan tanpa mengubah DB_PATH

Audit saja (tidak punya flag apply):

```powershell
node tools/database-engineer/audit-readonly.mjs --database 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite'
node tools/database-engineer/verify-checkpoint.mjs 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite' 'docs/DATABASE_AUDIT_SPRINT2_READONLY.json'
```

Tes DDL/algoritma di file baru terpisah, dengan perbandingan source sebelum/sesudah:

```powershell
# Variabel khusus sumber audit, BUKAN DB_PATH. Source dibuka readOnly:true.
$env:SMARTLEND_DATABASE_AUDIT_SOURCE = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
node --test tests/database-engineer/availability.test.mjs
npm run test:backend
```

Tanpa variabel source, test preservasi salinan source akan **skip**, bukan dianggap teruji. Pada run sesi Database Engineer, variabel diberikan dan **14/14 PASS tanpa skip**; regresi existing **64/64 PASS**. Fixture ada di `%LOCALAPPDATA%\Temp\opencode\smartlend-db-engineer-*`. Jangan upload salinan target yang memuat hash akun. Tes tidak menjalankan DDL pada source, tidak membaca/mengubah DB_PATH, dan tidak menggunakan copy mentah yang mengabaikan WAL.

## 8. Gerbang persetujuan integrasi

Sebelum implementasi/apply: sahkan definisi total/fasilitas/pool dan pemeriksa; putuskan konservatisme custody vs rencana kembali dan resolusi booking berurutan; sahkan role/transisi/penolakan/pembatalan; tentukan legacy return summary dan koreksi receipt; setujui target serta prosedur backup/migrasi manual. Setelah itu Backend Engineer mengimplementasikan guard/otorisasi/idempotency semua mutasi, uji race pickup/receipt/capacity/room, gangguan commit/retry dan recovery. **Tes prototipe bukan persetujuan penerapan pada database pengguna.**
