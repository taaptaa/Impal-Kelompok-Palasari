# Audit ketersediaan — usulan saja, tanpa migrasi

## Kondisi yang terbukti

- `barang.stok_total` menyimpan jumlah inventaris tercatat, bukan `stok_tersedia`. Endpoint `GET /api/catalog` hanya mengambil kolom barang tersebut; belum menghitung ketersediaan.
- SQLite sudah mempunyai `peminjaman` (waktu mulai/selesai dan status), `detail_barang` (jumlah), `pengembalian`, dan `detail_pengembalian` (baik/rusak/hilang). Keberadaan tabel tidak membuktikan proses persetujuan, serah terima, pengembalian, atau pencatatan kondisi lengkap dan sinkron.
- `fasilitas_ruangan` juga mengalokasikan barang ke ruangan. Perlu diputuskan apakah stok total barang tetap/portabel mencakup alokasi tersebut dan apakah barang itu boleh dipinjam terpisah.
- Belum ada sumber kondisi inventaris awal terverifikasi, riwayat perbaikan/penghapusan yang lengkap, atau aturan reservasi/jadwal dan transaksi atomik yang diterapkan. Tabel transaksi kosong **tidak membuktikan** semua stok dapat dipinjam.

Karena itu UI memakai **Belum diverifikasi**, menampilkan stok total persis dari API, dan tidak menampilkan angka tersedia/dipinjam/rusak yang diasumsikan. Rencana tetap draft lokal tanpa reservasi.

## Usulan terpisah untuk persetujuan tim

1. Tetapkan definisi stok total, stok layak pinjam, alokasi fasilitas, status yang mengunci stok, batas interval waktu (misalnya `[mulai, selesai)`), zona waktu, keterlambatan, dan mekanisme pembatalan.
2. Audit/rekonsiliasi kondisi awal barang dan kelengkapan transaksi. Jika data belum lengkap, API harus mengembalikan status verifikasi dan alasan dengan jumlah tersedia `null`, bukan nol atau stok total.
3. Rancang query ketersediaan per barang pada interval yang diminta: kapasitas layak pinjam dikurangi pemakaian/reservasi yang tumpang tindih. Untuk interval bertingkat, hitung beban bersamaan maksimum, bukan menjumlahkan semua transaksi yang sekadar menyentuh interval. Cegah penghitungan rusak/hilang dua kali jika stok total sudah dikoreksi.
4. Bila dibutuhkan, usulkan tabel aditif untuk baseline kondisi terverifikasi dan mutasi kondisi/perbaikan dengan jejak audit. Buat DDL spesifik database setelah database otoritatif diputuskan dan tim menyetujui. Tidak ada DDL atau perubahan data yang dijalankan oleh perbaikan UI ini.
5. Implementasikan pemeriksaan ulang atomik saat approval/serah terima; uji overlap, pengembalian sebagian, kehilangan, perbaikan, penolakan, pembatalan, dan dua approval bersamaan pada database disposable.

Baru setelah aturan, data, dan proses tersebut terbukti lengkap, katalog boleh menampilkan jumlah tersedia dengan interval serta waktu verifikasinya. Ini tidak termasuk scope perbaikan modal.

## Catatan perbaikan modal dan uji regresi

CSS hasil build sebelumnya menghasilkan `.max-w-lg{max-width:var(--spacing-lg)}`; token tema `--spacing-lg:1.5rem` membatasi modal menjadi 24px, bukan lebar dialog. Tema global tidak diubah karena dipakai komponen lain. Modal katalog menggunakan dialog Radix yang sudah ada dengan lebar eksplisit `min(520px, calc(100vw - 32px))` dan `maxWidth: none` untuk menimpa utility default, pusat berbasis `vw/dvh`, batas tinggi dinamis, serta scroll vertikal. Label `sr-only` pada jumlah rencana diberi containing block agar tidak memperlebar halaman pada viewport tertentu.

`tests/browser-item-detail.mjs` memeriksa tiga barang yang sudah ada melalui koneksi SQLite `readOnly: true`, tanpa `openDb`, seed, atau DDL. Uji menekan Detail untuk semua barang pada 1440×900, 390×844, 320×568, dan 640×320; memeriksa lebar/batas viewport, isi, stok, Tutup, Escape, fokus, overlay dan teks panjang. Simulasi teks panjang hanya mengubah DOM browser uji, bukan data. Uji juga memastikan inventaris sebelum/sesudah identik dan menyimpan screenshot di folder temporary yang dilaporkan.

```powershell
# Setelah npm run build; pilih file lokal yang memuat tiga barang uji.
$env:SMARTLEND_MODAL_TEST_DB = 'C:\lokasi\database-uji.sqlite'
node tests/browser-item-detail.mjs
```

Regresi pada database memori terpisah: `node --test tests/auth.test.mjs tests/catalog.test.mjs tests/plan.test.mjs` dan `node tests/browser-smoke.mjs`.
