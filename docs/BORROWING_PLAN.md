# Rencana Peminjaman — draft lokal

- Katalog tetap membaca `GET /api/catalog`. Status **Belum diverifikasi** tidak menghalangi penyusunan draft, tetapi bukan bukti barang tersedia.
- Jumlah pilihan belum masuk rencana sampai pengguna menekan **Tambah ke Rencana**. Jumlah harus bilangan bulat positif, maksimal stok total tercatat; batas ini bukan verifikasi stok tersedia.
- Menambahkan barang yang sama lagi **mengganti** jumlah dengan pilihan terakhir, bukan menambahkan baris duplikat atau menjumlahkan kuantitas. Ringkasan mempunyai input **Ubah jumlah** dan tombol **Simpan jumlah**, serta tombol **Hapus** per barang.
- Konfirmasi menyatakan barang masuk/diperbarui dalam rencana, bukan dipesan. Rencana berada di state memori aplikasi; tidak mengirim transaksi, mereservasi barang, mengubah inventaris, atau bertahan setelah reload.
- Pada mobile, baris katalog disusun vertikal agar jumlah, tombol Tambah ke Rencana, dan Detail terjangkau tanpa mencari kolom di kanan tabel. Warna, header, modal dan komponen Figma existing dipertahankan.

> **Checkpoint terbaru:** pengajuan barang mahasiswa sudah diimplementasikan dan diuji terpisah setelah perbaikan draft ini. Kartu katalog kini responsif, bukan tabel. Lihat [Form Pengajuan Sprint 2](LOAN_SUBMISSION_SPRINT2.md) untuk form, API, migrasi aditif eksplisit, idempotency, konfirmasi dan riwayat. Rencana sendiri tetap draft sampai POST berhasil; publik tidak dapat mengajukan. Bagian “belum tersedia” di bawah mencatat kondisi audit historis, bukan status terbaru.

## Belum tersedia: Ajukan Peminjaman nyata

Audit `backend/server.mjs` menunjukkan hanya endpoint katalog, sesi, pemeriksaan akses admin, login, dan logout. Tidak ada endpoint submission atau approval. Tabel transaksi dalam skema bukan bukti bahwa API transaksi sudah diterapkan. Tidak ada transaksi atau keberhasilan pengajuan yang disimulasikan oleh rencana ini.

Tahap selanjutnya memerlukan keputusan alur identitas peminjam publik, interval peminjaman, skema yang sesuai, validasi server, pemeriksaan ketersediaan, idempotency, serta transaksi atomik untuk seluruh detail paket. Implementasi perlu disetujui dan diuji terpisah; tidak ada migrasi/perubahan skema pada perbaikan kontrol rencana. Lihat juga `AVAILABILITY_PROPOSAL.md` dan `SPRINT2_MIGRATION_PROPOSAL.md`.

## Verifikasi

```powershell
npm run build
node --test tests/auth.test.mjs tests/catalog.test.mjs tests/plan.test.mjs
node tests/browser-smoke.mjs
# Database lokal existing dibaca saja (tanpa seed/DDL):
$env:SMARTLEND_MODAL_TEST_DB = 'C:\lokasi\database-uji.sqlite'
node tests/browser-item-detail.mjs
```

Uji terakhir memeriksa Proyektor 2 unit + Kabel HDMI 1 unit, edit jumlah, penambahan ulang, penolakan pecahan, hapus, dan stok sebelum/sesudah yang identik pada empat viewport, sekaligus meregresi modal ketiga barang. Koneksi ke database existing memakai `readOnly: true`. Tes autentikasi/regresi lain memakai database memori terpisah dan tidak mengganti akun/pengujian lokal pengguna.
