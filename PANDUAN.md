# SmartLend - Tugas Week 4 Implementasi IMK

## Isi paket
- SmartLend_Laporan_IMK_Week4.pdf: laporan 10 halaman, kode inti, screenshot aktual, hasil uji.
- source/: source lengkap React + TypeScript dari ekspor Figma Make, dengan perbaikan integrasi katalog.
- screenshots/: screenshot eksekusi aplikasi, termasuk bukti pengajuan pada riwayat.
- test-results.json: hasil pengujian browser.
- tools/make_report.py: pembuat laporan PDF, dapat diedit untuk mengganti identitas.

## Menjalankan di Windows
1. Pastikan Node.js dan npm tersedia (cek `node --version` dan `npm --version`).
2. Ekstrak ZIP ke folder biasa, bukan menjalankan dari tampilan isi ZIP.
3. Buka folder `source`, klik address bar File Explorer, ketik `powershell`, tekan Enter.
4. Jalankan `npm ci`.
5. Jalankan `npm run dev`.
6. Buka URL localhost yang ditampilkan terminal.

## Alur untuk presentasi
1. Pilih Mahasiswa.
2. Isi username `Arfan`, klik Lanjutkan.
3. Isi password demo `12345`, klik Masuk. Ini bukan autentikasi produksi.
4. Pilih Katalog. Cari `Proyektor`.
5. Klik Detail, lalu Ajukan Peminjaman.
6. Isi jumlah 1, tanggal pinjam dan kembali di masa depan (kembali harus setelah pinjam), serta keperluan.
7. Klik Kirim Pengajuan. Buka Riwayat untuk melihat permintaan baru dengan status Pending.

## Verifikasi build
Jalankan `npm run build`. Build Vite sudah berhasil; ini bukan pemeriksaan tipe TypeScript penuh.

## Perbaikan terhadap ZIP ekspor
- CatalogScreen menerima items dan onSubmitLoan dari MainApp.
- CatalogScreen meneruskan onSubmitLoan ke ItemDetailModal.
- Modal memakai bg-black/50 dan z-[60] agar backdrop transparan serta berada di atas navigasi.
- Judul modal menggunakan warna putih secara eksplisit.
- package-lock.json disertakan untuk instalasi yang konsisten.

## Batasan
- Login menerima input demo yang tidak kosong; belum ada backend/database.
- Data baru hanya tersimpan di state React selama sesi, hilang saat refresh.
- Riwayat masih berisi seluruh data contoh, belum difilter per pengguna.
- Foto barang memakai URL eksternal; sebagian tidak termuat dalam lingkungan uji.
- Fokus pengujian adalah Login, Katalog, dan Form Peminjaman. Alur lainnya belum diuji menyeluruh.

## Sebelum dikumpulkan
- Periksa nama, NIM, dan kelas pada laporan.
- Lengkapi anggota kelompok lainnya. Daftar anggota belum tersedia pada permintaan ini.
- Jika perlu, ubah tools/make_report.py lalu jalankan dari terminal: `python -m pip install reportlab pillow`, kemudian `python tools/make_report.py`. Script menggunakan font DejaVu Sans; sesuaikan path font bila menjalankan di Windows.
- Unggah PDF ke LMS sesuai ketentuan dosen. Jika memakai GitHub, unggah source, laporan, dan screenshot; jangan unggah node_modules.
- Paket ini belum diunggah ke LMS atau GitHub.
