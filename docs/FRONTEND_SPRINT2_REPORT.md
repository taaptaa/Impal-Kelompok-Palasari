# SmartLend — Session 2: Frontend & UI/UX Sprint 2

## Hasil dan audit

- Stack terverifikasi: React 18, TypeScript, Vite 6, Tailwind 4, Radix/shadcn, `react-day-picker` 8.10.1 dan `date-fns` 3.6.0 existing. Tidak menambah dependency atau mengganti konfigurasi.
- Dokumen PRD/DESIGN_SYSTEM/USER_FLOWS tidak ada. Acuan: komponen existing serta laporan role, inventaris, pengajuan dan status Sprint 2 di `docs/`.
- Ada komponen prototipe dan komponen live berbeda. Pekerjaan difokuskan pada `screens/CatalogScreen`, `LoanFormScreen`, cabang `readOnly` pada `screens/AdminDashboard`, serta `InventoryVisual`. Tidak mengaktifkan `LoanModal`, dashboard prototipe, QR atau transaksi mock.
- Katalog mahasiswa memakai Navbar/BottomNav sehingga tombol Kembali redundan disembunyikan. Konteks ditentukan dari wiring existing `onApply` yang hanya ditawarkan kepada mahasiswa; tidak mengedit navigasi bersama. Katalog publik tetap kembali ke pemilihan role. Kembali Admin/Petugas juga tetap ada.
- Tool Figma `create_session` untuk sumber `myW28RLuyQZMbBMsZzaDND` menolak karena file Make tidak didukung. Tidak mengklaim sinkronisasi/edit Figma; komposisi Navbar, BottomNav, Home, Katalog, Rencana dan Peminjaman Saya existing dipertahankan.

## Komponen/file

| File | Perubahan |
| --- | --- |
| `src/app/screens/CatalogScreen.tsx` | Hanya kondisi tombol kembali; draft, Detail, stok dan search/filter tetap |
| `src/app/screens/LoanFormScreen.tsx` | Kalender rentang sebelum isian tanggal/jam existing; panel jadwal; prop `schedule` opsional |
| `src/app/screens/AdminDashboard.tsx` | Cabang live read-only memakai panel daftar/statistik; header mobile bisa wrap; prop `overview`/retry opsional |
| `src/app/components/InventoryVisual.tsx` | Foto lokal berlabel ilustrasi, atribusi dan fallback onError/nama tidak dikenal |
| `src/app/components/loans/CampusCalendar.tsx`, `campus-calendar.css` | Navigasi bulan/tahun, locale Indonesia, hari berlabel penuh untuk pembaca layar, fokus/keyboard, gaya scoped responsif tanpa animasi |
| `src/app/components/loans/LoanPeriodPicker.tsx` | Rentang inklusif tanggal, termasuk hari yang sama; mempertahankan jam yang sudah diisi; terkunci bersama snapshot retry |
| `src/app/components/loans/BookingSchedule.tsx` | Pemilihan hari, titik booking, daftar status dan label verifikasi; format WIB dan overlap lintas bulan/tahun |
| `src/app/components/loans/AdminRequestsPanel.tsx` | Statistik nullable dari props, cari/filter daftar yang dimuat, status, ringkasan dan Setujui selalu disabled |
| `src/app/components/loans/RemoteViewNotice.tsx`, `view-contracts.ts` | State unconnected/loading/error/ready; empty hanya untuk ready dengan data kosong |
| `src/app/components/loans/calendar-dates.mjs`, `.d.mts` | Helper civil date UI, hari ini Jakarta dan overlap interval; bukan pengganti kontrak validasi bersama |
| `src/app/data/inventoryPhotos.ts`, `src/assets/inventory/*` | Mapping 12 nama terverifikasi ke aset ilustrasi, bukan field DB |
| `tools/fetch-inventory-photos.mjs`, `ATTRIBUTIONS.md` | Akuisisi ulang opsional dan sumber/izin setiap foto |
| `tests/frontend-calendar.test.mjs`, `tests/browser-frontend-sprint2.mjs`, `tests/fixtures/frontend-sprint2.tsx` | Uji helper dan komponen terisolasi; fixture tidak diimpor aplikasi |
| `tests/browser-smoke.mjs` | Assertion penghapusan Kembali mahasiswa, lalu navigasi melalui Home di Navbar |
| `docs/FRONTEND_SPRINT2_CONTRACT.md` | Rencana integrasi dan kontrak props sebelum implementasi; masih usulan, bukan endpoint yang disepakati |

`dist/` dibangun ulang. `api.ts`, `App.tsx`, `MainApp.tsx`, `navigation.ts`, Navbar, BottomNav, Home, MyLoansScreen, validasi pengajuan bersama, package/lockfile, backend, schema, database target dan konfigurasi Vite tidak diedit oleh sesi ini.

## Kalender dan integritas waktu

- Kalender menambah cara memilih tanggal, bulan, tahun, rentang dan hari yang sama. Isian `datetime-local` existing tetap menjadi cara mengedit tanggal/jam secara langsung dan menerima fokus error.
- Default isian jam dari klik kalender adalah 08.00/17.00 jika belum ada jam, dijelaskan di UI sebagai isian awal yang dapat diubah, **bukan jam operasional/kebijakan**. Jam yang telah diisi tidak ditimpa ketika tanggal diganti.
- Draft tetap `YYYY-MM-DDTHH:mm` WIB. Submit tetap melalui `jakartaToUtc`, validasi existing, UTC kanonik `Z`, CSRF dan idempotency existing. Tidak mengubah kontrak backend, batas durasi atau stok.
- Kalender jadwal terpisah dari kalender pemilihan rentang. Interval booking `[startsAt,endsAt)` ditampilkan menurut hari WIB; akhir tepat 00.00 tidak menandai hari berikutnya.
- Default jadwal/Admin **belum terhubung**, bukan empty/sukses atau angka nol. Tidak ada fetch baru, booking contoh, statistik rekaan atau aksi persetujuan pada runtime aplikasi.

## Sumber foto

12 file Wikimedia Commons lokal, total **785.568 byte**; lisensi Public Domain, CC0, CC BY-SA 2.0/3.0/4.0 sesuai karya. Judul, penulis, sumber dan tautan lisensi lengkap terdapat di [ATTRIBUTIONS.md](../ATTRIBUTIONS.md) dan atribusi UI.

Foto proporsional tidak dipotong; `object-contain`, lazy loading dan fallback tetap ada. Semua berlabel **foto ilustrasi, bukan barang aktual**. Whiteboard adalah ilustrasi umum (tidak memastikan model portabel); merek/model pada foto tidak menjadi spesifikasi inventaris. Nama di luar 12 mapping tetap fallback, bukan pencocokan spekulatif. Tidak ada hotlink/fetch gambar eksternal saat aplikasi digunakan.

## Hasil pengujian aktual

| Perintah | Hasil |
| --- | --- |
| `npm run build` | PASS, Vite 6.3.5 |
| `node --test tests/frontend-calendar.test.mjs` | PASS 3/3; leap day/tanggal invalid, empat zona perangkat, WIB→UTC, interval akhir eksklusif |
| `node tests/browser-frontend-sprint2.mjs` | PASS, lima viewport; rentang/hari sama, bulan/tahun lintas Desember–Januari, ArrowRight + Enter, jam tidak berubah, enam status, unconnected/loading/error/empty/ready, retry, search/filter Admin, Setujui disabled, 12 gambar/fallback, tanpa request backend |
| `npm run test:backend` | PASS 64/64 existing, fixture memori/file disposable tes saja |
| `node tests/browser-loans.mjs` | PASS 1440/390/320; validasi, WIB saat perangkat New York, retry/double submit, response hilang, riwayat/detail/refresh/IDOR dan stok tetap; database tes terpisah |
| `node tests/browser-auth-navigation.mjs` | PASS tiga role pada 1440/390/320; sesi, loading/error, logout/refresh, publik/internal dan navigasi |
| `node tests/browser-smoke.mjs` | PASS setelah assertion tombol mahasiswa disesuaikan; Home/search/ruangan/profil/draft/empty/error dan tiga role |
| TypeScript/lint terpisah | Tidak dijalankan: tidak tersedia script/compiler lokal. Build Vite bukan full type check |

Viewport komponen: **1440×900, 768×1024, 390×844, 320×568, 640×320**. Tidak terdeteksi overflow horizontal dokumen; screenshot desktop/mobile kalender, jadwal, Admin dan katalog juga ditinjau. Pengujian Chrome headless, bukan klaim cakupan Safari/iOS/semua pembaca layar.

Artefak final lokal di `%LOCALAPPDATA%\Temp\opencode\`:

- `smartlend-frontend-s2-OgsF5t` — lima viewport, komponen termasuk state ready **fixture tes berlabel sintetis**, bukan data aplikasi.
- `smartlend-auth-flow-LroH96` — regresi navigasi role.
- `smartlend-loan-browser-psYApD` — regresi pengajuan existing.
- `smartlend-browser-RmAn75` — smoke.

Kegagalan awal tidak disembunyikan: smoke lama mengklik tombol Kembali mahasiswa yang memang dihapus; assertion diganti untuk memeriksa ketiadaan tombol dan memakai Navbar. Uji komponen awal menemukan DayPicker v8 tidak menerapkan `labelDay` ke tombol hari; custom Day kini memakai hook fokus/keyboard library dan aria-label lengkap. Pengujian Enter awal kekurangan event teks CDP; diperbaiki dan diuji ulang. Pergantian Desember–Januari diperbaiki sebelum run akhir. Download awal domain upload mendapat HTTP 429; seluruh aset final berhasil diambil sebagai thumbnail dari domain thumb Wikimedia.

## Batasan dan kebutuhan Session Backend

- Port **5175** tidak diubah. Listener existing diperiksa sebelum/sesudah dan tetap proses yang sama. Test harness memakai port ephemeral sendiri, tidak menghentikan/menggantikan server aplikasi.
- Tidak membuat pengajuan/booking pada database target, tidak menjalankan seed/migrasi target, tidak mengedit backend/authentication/schema. Transaksi dalam suite regresi hanya pada fixture tes terpisah. Fixture UI tidak tersedia melalui entry aplikasi produksi.
- Belum mengintegrasikan API jadwal atau daftar/statistik Admin. Session Backend perlu menyepakati endpoint resmi, otorisasi/privasi, cakupan/pagination, filter bulan WIB→UTC, status/verifikasi, agregat statistik dan error. Lihat [kontrak props/rencana integrasi](FRONTEND_SPRINT2_CONTRACT.md).
- Adapter runtime harus memvalidasi respons sebelum membentuk state ready, menangani respons stale/cancel, serta tidak menyimpulkan data lengkap dari satu halaman. Statistik tidak dihitung dari jumlah daftar parsial.
- Tidak ada tombol Setujui live yang diaktifkan. Approval, penolakan, stok tersedia dan reservasi tetap memerlukan backend/business rules aman serta persetujuan integrasi. Cabang prototipe legacy tidak diaktifkan atau dijadikan sumber data.
- Keputusan pemilik: persetujuan kontrak API dengan Session Backend dan, bila diperlukan, penggantian ilustrasi dengan foto inventaris milik kampus yang berizin. Tidak diperlukan perubahan schema untuk mapping ilustrasi ini.
