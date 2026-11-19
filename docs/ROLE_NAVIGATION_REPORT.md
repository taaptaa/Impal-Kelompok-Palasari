# Koreksi alur Home/login/logout per role

## Audit sebelum edit

Penyebab deterministik ditemukan pada `App.tsx`: state awal `'main'`, `initialView='home'`, dan `currentUser=null`. `currentSession()` hanya mengubah tujuan jika hasilnya non-null. Pada 401/null state awal dibiarkan, sedangkan error hanya menghasilkan toast. Setelah `checking=false`, `MainApp` dirender tanpa user. `MainApp` menerima user nullable, dan cabang Home tidak mempunyai guard user. `HomeScreen` juga menerima null dengan fallback nama SmartLend. Logout secara eksplisit kembali ke main/Home. Tidak ada bukti race yang diperlukan untuk memicu bug ini; loading awal sebelumnya memang menahan render, tetapi tujuan setelah loading salah.

Audit backend: peran database mahasiswa/admin/petugas dipetakan menjadi student/admin/warehouse, password diverifikasi scrypt, sesi dicek pada `/api/me`, logout memerlukan origin/CSRF, dan `/api/admin` memeriksa role dari sesi/database. Mekanisme tersebut dipertahankan; pilihan role klien bukan sumber otorisasi endpoint.

Risiko regresi yang diidentifikasi sebelum implementasi: tujuan kembali katalog, draft antarhalaman, navigasi mobile, pemeriksaan sesi lambat/gagal, dan tes lama yang mengharapkan Home publik. Semua komponen Home, login, role selection, katalog, profil serta dashboard yang sudah ada dipakai kembali.

## Perubahan terarah

- Default, null-session dan logout sukses kembali ke `RoleSelectionScreen`.
- Session bootstrap mempunyai loading, pembatalan callback stale, error inline dan retry. Retry juga memuat ulang katalog setelah gangguan backend. Gangguan tidak menghapus cookie dan tidak menganggap sesi terverifikasi.
- Tujuan setelah login/refresh berasal dari respons backend: student → Home, admin → Admin Dashboard, warehouse → Dashboard Logistik.
- Respons login/sesi diperiksa bentuknya dan role dikenal sebelum menjadi user aplikasi; ini validasi defensif respons, bukan pengganti otorisasi server.
- Katalog publik memakai komponen yang sama dengan `accessMode='public'`; pencarian, Detail, ruangan dan draft tetap berfungsi. Home/profil/dashboard tidak ditawarkan untuk anonim; guard navigasi juga menolak tujuan nonpublik jika user null.
- Logout menunggu backend, menampilkan proses yang sedang berlangsung, menghapus user/role/draft hanya sesudah berhasil, dan tetap di halaman terautentikasi jika gagal. Sesi yang memang sudah invalid diverifikasi melalui 401 backend, bukan diasumsikan dari gangguan jaringan.
- Home hanya berubah kontrak prop menjadi user wajib; visual dan fitur Home tidak dibangun ulang. Admin/Petugas tetap dashboard hanya-baca tanpa statistik palsu atau transaksi prototipe.

## Pengujian dan batas bukti

`tests/browser-auth-navigation.mjs` menjalankan acceptance menggunakan Chrome dan SQLite `:memory:` terpisah. Kredensial berbeda per role dibuat acak, tidak dicetak. Proxy gangguan dalam file tes hanya membungkus handler server ephemeral milik tes: menahan respons sesi/logout, memutus koneksi API, memberikan kegagalan logout 503, dan menguji respons role tak dikenal. Tidak ada bypass autentikasi pada source backend.

| Kriteria | Verifikasi |
|---|---|
| AC-01/02 | Buka/refresh tanpa sesi menghasilkan pemilihan role. |
| AC-03–05 | Login benar ketiga role menuju Home/Admin/Logistik. |
| AC-06 | Password salah benar-benar ditolak backend; form tetap terbuka tanpa Home. |
| AC-07–09 | Refresh dengan sesi valid untuk ketiga role dipulihkan ke tujuan yang benar. |
| AC-10–12 | Logout semua role menunggu invalidasi, kembali ke pemilihan role; replay cookie lama ditolak. |
| AC-13/14 | Katalog publik dibuka eksplisit; tidak ada Home/profil/dashboard anonim, termasuk percobaan URL `/home` pada fallback SPA. |
| AC-15/16 | Endpoint Admin menolak anonim (401), Petugas (403), serta mahasiswa (403). |
| AC-17–20 | Mahasiswa membuka/mencari katalog, menambah dua barang, dan memakai Detail. |
| AC-21/22 | Navigasi desktop 1440×900 dan mobile 390×844/320×568 untuk semua role, tanpa overflow halaman. |
| AC-23 | Koneksi API terputus menghasilkan error tanpa akses palsu; cookie tetap sama, retry memulihkan sesi/katalog. Logout 503 tidak memindahkan pengguna menjadi anonim. |
| AC-24 | Respons `/me` sengaja ditahan untuk user valid dan anonim; loading tampil, MutationObserver tidak melihat Home/dashboard sebelum verifikasi. |
| AC-25 | `npm run build` dijalankan terpisah dari uji browser. |

Regresi tambahan:
- `npm run test:backend`: autentikasi/CSRF/lockout, role, katalog, draft, provisioning pada database memori/file disposable milik tes, bukan database aktif.
- `node tests/browser-smoke.mjs`: pencarian Home, ruangan sintetis, profil, tiga role, empty/error katalog, draft, dan akses ditolak.
- `node tests/browser-item-detail.mjs`: koneksi **readOnly** ke database pengguna, tiga inventaris nyata uji, Detail/keyboard/overlay, draft dua barang dan navigasi publik pada 1440×900, 390×844, 320×568 dan 640×320. Ekspektasi Home anonim pada tes sebelumnya diganti oleh pemeriksaan bahwa Home tidak diberikan, sesuai spesifikasi yang dikoreksi.

Pengujian login browser memakai akun sintetis pada database tes. Password akun pengguna tidak diketahui, tidak dibaca, tidak diganti, dan tidak diperlukan untuk menguji alur. Pemeriksaan data aktif menggunakan fingerprint skema/tabel sebelum-sesudah (termasuk fingerprint baris akun/hash password, tidak mencetak nilainya), bukan salinan database.

### Hasil eksekusi checkpoint ini

| Pengujian | Status | Bukti |
|---|---|---|
| `npm run build` | PASS | Build produksi Vite selesai tanpa error. |
| `npm run test:backend` | PASS | 25/25 tes pada memori/disposable terpisah. |
| `node tests/browser-auth-navigation.mjs` | PASS | AC-01–24 pada 1440×900, 390×844, 320×568; termasuk menahan respons, kegagalan jaringan/logout, retry dan role respons tak dikenal. |
| `node tests/browser-smoke.mjs` | PASS | Home/search/katalog/ruangan/profil/draft serta tiga role. |
| `node tests/browser-item-detail.mjs` | PASS | Database aktif hanya-baca, tiga barang, draft dan Detail pada empat viewport; anonim tidak mendapat Home/profil/dashboard. |
| Fingerprint database aktif sebelum/sesudah | PASS | Skema dan data seluruh tabel identik; tiga akun termasuk hash password tidak berubah; Proyektor 3, HDMI 5, Speaker 2. |
| Login menggunakan password pilihan pemilik pada database aktif | NOT TESTED | Tidak meminta/membaca password pemilik; login diuji pada backend nyata dengan credential sintetis dan database terpisah. |

Tes smoke lama sempat gagal karena selector teks tidak menemukan tombol Logout berbentuk ikon. Selector diperbaiki untuk memakai `aria-label` yang sudah ada (tanpa mengubah assertion tujuan logout), lalu seluruh uji terkait diulang dan lulus. Artefak screenshot hasil acceptance terakhir berada di `%LOCALAPPDATA%\Temp\opencode\smartlend-auth-flow-zpxuob`; pemeriksaan integritas hanya menyimpan fingerprint/status, bukan salinan database atau password.

## Verifikasi manual

`vite.config.ts` tidak mengunci port frontend; proxy `/api` menuju `127.0.0.1:3000`. Untuk URL pasti tanpa fallback port, jalankan dari workspace:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Gunakan URL **Local** yang dicetak Vite; dengan perintah di atas, jika berhasil, alamatnya `http://127.0.0.1:5173`. Jika port terpakai, perintah gagal—jangan hentikan proses yang tidak dikenal. Pilih port lain secara eksplisit dan sesuaikan `APP_ORIGIN` backend dengan URL persis tersebut.

Gunakan backend yang sudah berjalan dengan **DB_PATH yang sama**. Jika perlu menyalakan ulang backend dari terminal yang sudah mempunyai DB_PATH aktif tersebut, pastikan `APP_ORIGIN` sama dengan URL Vite lalu `npm run server`; jangan seed ulang atau mengganti DB_PATH. Backend default port 3000 sesuai proxy Vite.

1. Jendela privat: buka frontend → pemilihan role; refresh harus tetap di sana.
2. Buka katalog publik → cari barang, Detail, draft dua barang; tidak ada Home/profil/dashboard anonim. Tombol kembali menuju pemilihan role.
3. Login setiap role dengan password lokal masing-masing → cek tujuan yang sesuai, refresh, lalu Logout → pemilihan role.
4. Mahasiswa: gunakan Home Search, katalog barang/ruangan, Detail, Tambah ke Rencana, dan Akun. Stok total tidak boleh berubah atau diklaim tersedia.
5. Untuk simulasi gangguan aman tanpa mematikan backend pengguna, jalankan `node tests/browser-auth-navigation.mjs` setelah build.

## Keterbatasan tetap

Navigasi masih state React existing, bukan router URL/deep link. Refresh mengembalikan tujuan default per role dan draft in-memory hilang. Pengajuan nyata, approval, perhitungan stok tersedia, pembayaran, serah terima, QR dan pengembalian belum diaktifkan. Tidak ada endpoint bisnis khusus Petugas yang ditambahkan pada pekerjaan ini; dashboard hanya-baca. Tidak ada migrasi/skema/kategori Civitas/Umum atau tarif yang dibuat.
