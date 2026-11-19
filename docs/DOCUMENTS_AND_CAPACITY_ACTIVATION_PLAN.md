# Dokumen, kebijakan dan verifikasi kapasitas — lingkungan terisolasi

## 1. Status dan keputusan pemilik

Migrasi **003 form** terpisah dari pekerjaan ini. Tidak ada DDL dokumen atau availability 002 yang diterapkan ke database pengguna. Tidak ada endpoint dokumen/keputusan baru yang dipasang pada `backend/server.mjs`.

Pemilik menyetujui **kandidat uji**, bukan kebijakan resmi/aktivasi target: proposal kegiatan PDF opsional, maksimum **2 file × 2 MiB** per pengajuan, akses pemilik dan Admin, storage privat di LocalAppData, retensi 90 hari sejak upload. Nilai ada di `experiments/documents/candidate-policy.mjs`. Tidak ada persyaratan dokumen untuk Dosen/Staf/Umum atau kategori kegiatan tertentu karena kebijakan dan akun tersebut belum tersedia. KTP/identitas sensitif tidak diminta.

## 2. Mekanisme dokumen yang dibangun

`experiments/documents/server.mjs` adalah server sandbox, sengaja menolak database file di luar pola fixture dokumen yang dibuat khusus. Tidak punya mode aktivasi source. DDL metadata berada di `experiments/documents/schema.DRAFT.sql`, di luar migrasi resmi.

Kontrak sandbox:

- POST `/api/loans/:id/documents`: sesi mahasiswa pemilik pengajuan **yang sudah commit**, Origin exact, CSRF, UUID idempotency, `Content-Type: application/pdf`, `X-Document-Name` hanya nama tampilan yang aman. Body binary bounded, bukan binary dalam header SQLite. Tidak menerima owner/role/path dari klien.
- GET `/api/documents/:uuid`: sesi pemilik atau Admin. Petugas/mahasiswa lain tidak memperoleh dokumen; anonim 401. Respons attachment, nosniff, CSP sandbox, no-store; tidak ada static directory/listing atau path langsung publik.
- Nama storage UUID dari server, bukan nama/path klien. Tolak traversal, separator, kontrol, ekstensi salah. Root harus di luar workspace/frontend/public/dist; alias root dan symlink file ditolak. ACL privat masih harus diverifikasi saat instalasi storage target.
- Tahap validasi: MIME, ukuran, header/EOF, **parser PDF struktural** dan **scanner malware** melalui adapter. Header `%PDF` saja tidak cukup. Parser harus menolak file rusak/enkripsi/konten aktif; scanner harus mengembalikan clean, hash byte yang sama, dan versi engine.
- Saat inspeksi selesai, sesi/role/CSRF/pemilik diperiksa ulang di bawah `BEGIN IMMEDIATE`. Hash payload termasuk loan/nama/hash byte/versi kandidat. Key sama replay; key sama isi berbeda 409. Batas jumlah diperiksa kembali di lock.
- File ditulis eksklusif `.part`, di-flush, rename ke UUID `.pdf`, metadata insert, commit. Insert gagal → rollback dan file baru dibersihkan. Pengajuan utama tidak bergantung pada upload; tidak ada pre-upload yang diklaim sukses sebelum pengajuan ada.
- Jika crash setelah rename sebelum commit, file yatim bisa tersisa: maintenance memeriksa hanya nama UUID sandbox yang tidak direferensikan DB, dengan grace period 1 jam, dalam write lock. File asing tidak dihapus. Tidak menjalankan maintenance di storage pengguna.
- Kedaluwarsa langsung menolak download meski purge belum berjalan. Purge menghapus byte lalu menandai metadata `deleted`; key/hash tombstone dipertahankan agar retry tidak menghidupkan file terhapus. Kegagalan purge perlu retry operator; kebijakan retensi **metadata audit** belum disahkan.

## 3. Batas keamanan yang belum terpenuhi

Pencarian `qpdf`, `mutool`, dan `clamscan` pada PATH tidak menemukan instalasi. Ini bukan audit seluruh antivirus Windows. Tidak menginstal software/download binary baru tanpa keputusan.

**Parser dan scanner tes adalah doubles sintetis.** Tes penolakan file rusak/malware membuktikan integrasi verdict/fail-closed, bukan kemampuan mendeteksi PDF berbahaya nyata. Jalur tanpa adapter menolak 503 dan tidak menyimpan file. Karena itu upload target tetap **BLOCKED**.

Sebelum aktivasi: pilih/instal parser yang dipelihara dengan pembatasan resource, decoder/encryption/embedded-file/JavaScript checks, scanner tersedia dengan definisi terbaru/timeouts dan bukti verdict byte tepat; uji korpus PDF valid/rusak/polyglot/aktif/zip-bomb; sahkan ACL/storage/backup file+DB, limit koneksi global/rate limit dan kuota disk, retensi metadata/hukum penghapusan, audit download/penghapusan, serta migrasi target terpisah. Sandbox timeout HTTP bukan pengganti isolasi proses parser/scanner.

## 4. Kebijakan resmi berversi

`PolicyDocument.tsx` menyediakan struktur dokumen: version, title, approvedAt, approvedBy, contentSha256 dan sections. Form saat ini memasang komponen **tanpa dokumen**, sehingga hanya menampilkan status belum disahkan. Tidak ada teks legal palsu atau checkbox legal baru.

Sebelum persetujuan legal: dokumen approved harus berasal dari registry backend tepercaya, versi immutable + hash isi + otoritas/tanggal pengesahan; API menyajikan versi berlaku; receipt persetujuan menyimpan versi/hash/actor dari sesi/waktu server/pengajuan dalam transaksi. Tolak versi tidak dikenal/ditarik dan gunakan versi yang sama saat replay. Jangan mengubah arti `submission-info-v1` menjadi legal consent. Penyimpanan legal consent masih **belum diimplementasikan/diaktifkan** karena belum ada kebijakan.

## 5. Workflow verifikasi kapasitas

`tests/database-engineer/verification-workflow.mjs` memperluas executable specification 002 **khusus fixture terisolasi**; tidak diimpor server. Tidak membuat baseline otomatis untuk 12 barang target.

Urutan usulan:

1. Pemeriksa Admin/Petugas yang berwenang melakukan stocktake fisik dan rekonsiliasi unit yang berada di peminjam/fasilitas.
2. Catat referensi lembar pemeriksaan/bukti dan alasan, enam bucket absolut yang disjoint: layak pool, fasilitas, rusak (termasuk perbaikan yang belum layak), hilang, nonpinjam, belum diperiksa. Perbaikan harus dijelaskan dalam bukti; schema minimal belum punya serial/per-unit maintenance.
3. Jumlah bucket wajib sama dengan total pembukuan; fasilitas sama dengan sumber relasinya. Total tidak diubah agar cocok. Ketidakcocokan menghentikan verifikasi untuk rekonsiliasi.
4. Request memakai expectedRevision dan key. Aktor/role/aktif dibaca dari akun di bawah write lock; waktu server. Revisi lama → 409, key sama/hash sama → replay.
5. Append snapshot baru dan audit before/after/evidence dalam satu commit; histori lama immutable. Bukti teks adalah klaim pemeriksa, bukan bukti mesin sudah menghitung fisik.
6. Unit unknown, legacy approved/borrowed tanpa ledger, atau kapasitas turun di bawah komitmen → `perlu_rekonsiliasi`, available tetap null. Fakta kerusakan dapat dicatat tanpa mengarang kapasitas aman. Sahkan definisi fasilitas/custody dan proses penyelesaian konflik sebelum penggunaan target.

## 6. Persiapan keputusan Admin

Sandbox keputusan menggunakan role Admin, alasan wajib rejection, CAS status+expectedVersion, idempotency actor/key/hash dan audit timestamp/result atomik. Approval menghitung ulang peak load melalui spesifikasi availability existing dalam write lock; jumlah tersedia tidak diambil dari client. Rejection tidak mengubah stok. Hasil status dibaca kembali lewat `LoanService` existing.

Ruang/fasilitas lintas pengajuan belum diaktifkan pada workflow keputusan tambahan ini; permintaan ruang ditolak BLOCKED. Prototipe 002 lama tetap menguji rancangan ruang secara terpisah. Koreksi receipt, cancellation/pickup/repair/return-vs-approval, akses HTTP produksi dan seluruh writer eksternal masih memerlukan kontrak implementasi terintegrasi. Versi keputusan turunan audit sandbox belum menjadi kontrak API final.

Tes baru mencakup dua Admin satu pengajuan, approve-vs-reject, dua pengajuan berebut unit terakhir pada **proses SQLite terpisah**, alasan/role invalid, retry, stale revision, paket rollback, lintas tahun, interval bersambung dan custody overdue. Ini bukti rancangan terisolasi; tombol/API keputusan target tetap gate 503.

## 7. Menjalankan tanpa mutasi target

```powershell
npm run test:activation
# Opsional: prototipe availability existing dengan sumber audit hanya-baca.
$env:SMARTLEND_DATABASE_AUDIT_SOURCE = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
node --test tests/database-engineer/availability.test.mjs
```

Tidak ada perintah upload, apply 002, atau seed target di dokumen ini. Uji membutuhkan ruang disk; tidak menghapus artefak/file pengguna untuk mendapatkannya.
