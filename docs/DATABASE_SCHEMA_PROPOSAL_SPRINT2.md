# Usulan Schema Availability — DRAFT, belum diterapkan

Referensi: [audit](DATABASE_ENGINEER_SPRINT2_AUDIT.md), [kontrak backend](DATABASE_BACKEND_CONTRACT_SPRINT2.md), DDL executable khusus tes: [`database/proposals/002-availability.DRAFT.sql`](../database/proposals/002-availability.DRAFT.sql).

## 1. Tujuan dan batas desain

Tetap SQLite; seluruh tabel/record existing dipertahankan. Tidak menambah kolom `peminjaman` karena profil 001 ketat. Tidak ada backfill kondisi, perubahan stok, automatic reservation untuk pengajuan menunggu, startup migration, atau apply tool dalam proposal ini. Prefix 002 hanya penanda urutan desain; file belum merupakan migrasi resmi.

Minimum availability/approval barang adalah **audit operasi + baseline versi + alokasi detail**. Tambahkan alokasi ruangan jika approval ruangan diaktifkan. Ledger penerimaan wajib sebelum pengembalian parsial/rusak/hilang memengaruhi ketersediaan; jika ditunda, blokir fitur tersebut dan jangan mengasumsikan barang sudah kembali.

### Lima tabel aditif

| Tabel | Kunci/relasi | Data dan maksud |
| --- | --- | --- |
| `audit_operasi` | INTEGER PK; FK pelaku ke pengguna, nullable FK peminjaman/ruangan; UNIQUE `(id_pelaku,request_key)` | Aksi, hash payload, UTC epoch-ms, alasan, before/after JSON. Header satu operasi atomik, termasuk multi-barang. Append-only. Tidak menyimpan token/credential |
| `verifikasi_stok_barang` | INTEGER PK; FK barang/operasi; UNIQUE `(id_barang,revisi)`, `(id_operasi,id_barang)`, `(id_verifikasi,id_barang)` | Snapshot absolut stok tercatat dan enam bucket kondisi/penggunaan; status verifikasi; histori perubahan kapasitas. Append-only |
| `alokasi_barang` | PK/FK komposit `(id_peminjaman,id_barang)` → detail barang; FK komposit `(id_verifikasi,id_barang)` → verifikasi | Interval reservasi, waktu diambil/dilepas, referensi operasi approval. Jumlah berasal dari detail immutable-by-contract; tidak diduplikasi |
| `alokasi_ruangan` | PK/FK `id_peminjaman` → detail ruangan; FK operasi | Interval eksklusif, waktu penggunaan/pelepasan. Ruangan/peserta berasal dari detail. Satu ruangan per header seperti existing |
| `penerimaan_barang` | INTEGER PK; FK komposit ke alokasi; FK operasi; UNIQUE `(id_operasi,id_peminjaman,id_barang)` | Event jumlah baik/rusak/hilang per item. Banyak event untuk partial return. Append-only; bukan pengajuan/pinjaman baru |

Relasi ringkas (bukan tabel existing yang diganti):

```text
pengguna ──< audit_operasi ──< verifikasi_stok_barang >── barang
                     │                  │
peminjaman ──< detail_barang ──1 alokasi_barang ──< penerimaan_barang
     │               │                  │
     └──1 detail_ruangan ──1 alokasi_ruangan
                     │
                   ruangan ──< fasilitas_ruangan >── barang
```

Audit operasi juga direferensikan alokasi dan penerimaan. `pengembalian/detail_pengembalian` existing tetap berelasi seperti semula; tidak menjadi sumber pengurangan tambahan bila ledger baru sudah dipakai.

## 2. Definisi stok dan verifikasi wajib

Definisi berikut **usulan untuk disahkan**, bukan kondisi inventaris yang diasumsikan:

```text
stok_total_snapshot = layak_pinjam + fasilitas + rusak + hilang
                    + nonpinjam + belum_verifikasi
```

- Semua bucket bilangan bulat >= 0 dan saling terpisah. `layak_pinjam` adalah kapasitas **pool barang lepas yang layak**, termasuk unit baik yang sedang direservasi/dipinjam. Bukan hitungan fisik yang hanya ada di rak.
- `fasilitas` dikhususkan untuk unit terikat ruangan, dikeluarkan dari pool. Dengan model ini unit fasilitas tidak ikut bucket rusak/hilang pool. Kerusakan fasilitas mengubah kelayakan operasional ruang melalui audit tersendiri. Jika tim ingin kondisi per fasilitas/per unit, perlu ekstensi, bukan menghitung unit sama di dua bucket.
- Untuk desain minimal, `SUM(fasilitas_ruangan.jumlah)` per barang harus sama dengan bucket fasilitas; verifikasi harus memastikan inventaris fasilitas memang termasuk stok total. Bila total lama ternyata mengecualikan fasilitas, hentikan rekonsiliasi, jangan paksa persamaan/fiktif. Pilihan model harus disepakati sebelum integrasi.
- `nonpinjam` mencatat unit yang tidak ditawarkan pada pool meski tidak masuk bucket lain. `belum_verifikasi` adalah unit yang statusnya belum diketahui, bukan barang yang diasumsikan baik.
- `hilang` tetap dalam total pembukuan sampai penghapusan resmi. Setelah penghapusan, sinkronkan total dan snapshot baru secara atomik, jangan mengurangi total lalu mengurangi kehilangan yang sama lagi.
- `status_verifikasi='terverifikasi'` mensyaratkan `belum_verifikasi=0`. Ketidakhadiran snapshot, status rekonsiliasi, atau ledger aktif tidak lengkap → jumlah tersedia **NULL**, bukan 0/total.

### Bukti yang perlu dikumpulkan Petugas/Admin

Per barang: kode/ID, total pembukuan, hitung fisik dan bukti, jumlah layak pool, rusak, hilang, fasilitas per ruang, nonpinjam, belum diperiksa, unit yang sedang berada pada peminjam, identitas pemeriksa, waktu, alasan, serta rekonsiliasi pengajuan aktif dan pengembalian lama. Jangan menyimpulkan kondisi dari nama, gambar, tabel transaksi kosong, atau jumlah total.

Backend mengambil snapshot **revisi tertinggi**, bukan menjumlahkan semua baseline. Revisi `MAX+1` dialokasikan dalam transaksi penulis; UNIQUE menjaga tabrakan. Timestamp berada pada audit operasi terkait, ditulis server, tidak boleh future/backdate untuk jalur normal. Versi yang sudah dipakai approval tetap tersimpan untuk jejak keputusan.

### Perubahan kapasitas tanpa tabel delta tambahan

Snapshot baru + operasi beralasan cukup untuk stocktake/perbaikan/perolehan/penghapusan/realokasi. Selisih antarsnapshot menunjukkan perubahan; tidak perlu tabel delta kedua yang bisa terhitung ganda. Pembukuan total/fasilitas yang benar-benar berubah harus sinkron dengan snapshot pada transaksi yang sama setelah integrasi disetujui. Untuk kondisi rusak/hilang saat kembali: unit keluar dari outstanding custody dan kapasitas layak berkurang **sekali** di snapshot baru, dalam transaksi sama.

Kapasitas baru yang lebih kecil dari puncak semua komitmen future tidak boleh diam-diam dilabeli aman. Perubahan administratif normal ditolak hingga resolusi; fakta kerusakan/kehilangan tetap harus dicatat sebagai `perlu_rekonsiliasi`, memblokir quote/approval baru dan menandai pengajuan terdampak. Jangan menolak fakta fisik demi menjaga angka tampak konsisten.

## 3. Constraint dan indeks

DDL prototipe memakai `STRICT` (SQLite >=3.37; target 3.47.2), PK/FK, CHECK jumlah/bucket/interval, serta unique key operasi. `STRICT` masih menerima coercion lossless tertentu, misalnya string numerik; validasi tipe JSON/integer di backend tetap wajib.

- FK verifikasi komposit mencegah alokasi barang A merujuk baseline barang B.
- FK alokasi komposit mencegah alokasi item yang tidak ada pada detail pengajuan.
- FK penerimaan ke alokasi memastikan ada komitmen sumber, tetapi tidak membuktikan serah terima sudah dilakukan.
- Trigger append-only **hanya pada tabel history baru**. Tidak memasang trigger pada tabel legacy, melakukan DELETE, atau menonaktifkan FK aplikasi.
- Indeks aktif `(id_barang,mulai_ms,selesai_ms) WHERE dilepas_ms IS NULL`, indeks resource-first detail barang/ruangan, indeks receipt per alokasi, dan indeks audit per loan/room mendukung query. UNIQUE verifikasi mendukung pencarian revisi terbaru.
- Tidak ada UNIQUE tunggal yang dapat menyatakan “jumlah interval overlap <= kapasitas”. Tidak ada exclusion constraint seperti PostgreSQL. **DDL ini sendiri belum mencegah double booking**; guard transaksi di kontrak backend adalah bagian wajib desain.
- Jumlah detail dan jadwal header wajib dibekukan setelah approval, termasuk lewat jalur CRUD lain. Reschedule dan perubahan jumlah setelah approval tidak termasuk MVP. Jika akses penulis SQL lebih dari service terkontrol, perlu hardening trigger freeze/aggregate terpisah yang diaudit dan diuji; jangan memberi klaim jaminan terhadap direct SQL writer.

Jejak audit ini bukan tamper-proof terhadap administrator file SQLite yang dapat menghapus trigger/menulis file. Proteksi filesystem, otorisasi service, retensi, backup dan peninjauan akses tetap diperlukan.

## 4. Jadwal, kondisi peminjaman, dan ruangan

- Wire existing tetap ISO UTC kanonik; tampilan WIB tidak diubah. Tabel baru memakai epoch-ms INTEGER agar tidak bergantung perbandingan teks DATETIME legacy. Backend memastikan konversi tepat dan interval sama dengan header.
- Interval reservasi `[mulai,selesai)`; bersebelahan diperbolehkan. Menunggu bukan reservasi. Disetujui mengunci semua detail atau tidak sama sekali; dipinjam membutuhkan waktu serah terima aktual.
- Konservatisme prototipe: barang yang sudah diambil mengunci jumlah belum diterima **sampai ada verifikasi kembali**, bahkan melewati rencana selesai. Tidak memperkirakan pengembalian sebagai fakta. Pada quote future, sisa custody diperlakukan mengunci sampai tak berbatas.
- **Tradeoff yang harus disetujui:** model konservatif dapat mengurangi utilisasi dan menimbulkan konflik dengan approval berurutan yang sudah ada. Pada serah terima, periksa dampak ekstensi terhadap semua komitmen future; konflik perlu resolusi eksplisit, bukan membiarkan overbooking. Alternatif memakai rencana kembali sebagai kapasitas future adalah quote bersyarat/berisiko, bukan jaminan tanpa double booking. Kebijakan final menunggu pemilik.
- Ruangan eksklusif satu booking per interval. Peserta harus <= kapasitas dan status aktif pada approval serta serah terima. Fasilitas yang sudah dikeluarkan dari pool tidak dikurangi lagi setiap peminjaman ruang.
- Waktu ruangan dipakai yang belum dilepas diperlakukan konservatif serupa. Penutupan/perawatan **terjadwal** memerlukan tabel blok waktu tambahan setelah aturan disetujui. `status_operasional` existing hanya memblokir ruang secara keseluruhan; jangan menciptakan pengajuan/akun palsu untuk menandai maintenance.

## 5. Pengembalian dan keterbatasan lanjutan

Ledger penerimaan baru mendukung beberapa batch per item. Backend memeriksa akumulasi jumlah <= detail, serah terima sudah ada, aktor berwenang, dan kondisi valid. Penerimaan rusak/hilang menyelesaikan tanggung jawab custody unit, bukan otomatis membuat unit tersedia.

`pengembalian` legacy UNIQUE per pengajuan dapat ditulis sekali saat paket selesai sebagai ringkasan kompatibilitas, dengan detail agregat. Jangan menulisnya pada setiap partial return, menghapus constraint UNIQUE, atau mengurangi stok dari kedua ledger. Aturan ringkasan `kondisi_akhir` untuk campuran harus disahkan; jangan memilih nilai palsu. Sampai aturan ini jelas, jangan aktifkan dual-write ringkasan.

**Belum dirancang untuk produksi:** koreksi/reversal receipt salah yang immutable, pembukaan kembali pinjaman selesai, serial number per unit, histori kondisi masing-masing fasilitas, perubahan kapasitas future terjadwal, buffer persiapan, atau reschedule. Koreksi stok dapat memakai snapshot pengganti, tetapi **koreksi receipt tidak cukup hanya mengganti baseline**, sebab outstanding alokasi juga berubah. Perlu event pembalik/supersession terpisah yang disetujui; hentikan integrasi return operasional sampai kebijakan koreksi aman tersedia.

## 6. Strategi migrasi, backup, dan rollback (rencana, tidak dieksekusi)

1. Persetujuan tertulis desain, definisi fasilitas/total, kondisi, role, pickup/overdue, return/koreksi, dan target path. Audit ulang jumlah **terkini**, jangan mengunci prasyarat “0 transaksi” dari laporan lama. Target saat audit mempunyai 3 akun/12 barang/1 pengajuan.
2. Hentikan sementara seluruh penulis secara terkoordinasi; tidak menghentikan proses lain tanpa izin. Verifikasi target path existing, integritas/FK, profil 001, schema fingerprint, SQLite version, dan izin akses. Jangan mengubah DB_PATH.
3. Ambil backup konsisten melalui SQLite backup API atau snapshot yang mencakup WAL. Jangan menyalin hanya main `.sqlite` saat WAL aktif, jangan paksa journal/checkpoint saat audit. Untuk snapshot via SELECT seperti tes, pertahankan read transaction sampai semua schema/rows terbaca dan validasi hasil; ini bukan pengganti backup fisik teruji untuk semua fitur SQLite.
4. Simpan backup, manifest counts/fingerprint schema+seluruh tabel, waktu dan identitas operator pada lokasi privat **di luar `dist`**. Verifikasi restore di file baru, `integrity_check`, FK dan fingerprint. Periksa ACL Windows/enkripsi/ruang disk; chmod saja bukan bukti keamanan.
5. Dengan approval penerapan terpisah, buat migrasi resmi manual dengan preflight dan ledger versi/checksum. Jalankan `foreign_keys=ON`, busy timeout, `BEGIN IMMEDIATE`; cek tidak ada perubahan sejak backup, lalu DDL. Tidak ada backfill kondisi/alokasi/receipt otomatis.
6. Verifikasi semua tabel lama identik dan tabel baru kosong, kolom/index 001 tetap valid, FK/integritas, dan pengajuan multi-barang masih bekerja pada salinan uji. Simpan version/checksum migrasi dalam transaksi sama sebelum COMMIT. Tidak memakai `CREATE IF NOT EXISTS` untuk menutupi schema parsial; state parsial/different checksum harus ditolak.
7. Kalau gagal sebelum COMMIT: **ROLLBACK transaksi DDL**. Tidak restore/reset data pengguna.
8. Kalau sudah COMMIT: rollback operasional paling aman adalah menonaktifkan integrasi availability/approval, **biarkan tabel aditif dan data tetap**. Jangan down-migration DROP atau restore snapshot menimpa transaksi baru. Pemulihan darurat memerlukan izin lain, backup kondisi terkini, latihan restore ke file baru, dan rekonsiliasi semua transaksi pascabackup sebelum cutover terkontrol.

Tidak ada runner apply baru dibuat. Setelah desain disetujui, migrasi resmi dan integrasi adalah tahap pekerjaan berikutnya, bukan menjalankan file DRAFT pada target sekarang.
