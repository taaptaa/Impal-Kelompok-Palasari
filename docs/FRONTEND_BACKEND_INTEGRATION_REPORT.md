# SmartLend — integrasi frontend dengan backend existing

## Hasil

Integrasi menggunakan API Admin/jadwal Session Backend **tanpa implementasi ulang atau perubahan backend**. Adapter `src/app/api.ts`, validator `loan-read-models.mjs`, wiring `MainApp.tsx`, dan container integrasi sudah ada saat audit; pekerjaan ini melengkapi dan memverifikasinya.

- Dashboard Admin mengambil daftar, statistik, dan readiness dari `/api/admin/loans`, `/stats`, `/readiness` menggunakan cookie sesi existing.
- Total dan enam status dipisahkan: menunggu, disetujui, dipinjam, selesai, ditolak, dibatalkan. Angka berasal dari statistik API, bukan panjang halaman daftar. Statistik mengikuti filter status; pagination tidak mengubah definisi total.
- Tombol Detail meminta `/api/admin/loans/:id`, menampilkan peminjam, keperluan, periode WIB, seluruh detail barang/ruangan dan jumlah aktual. Tidak memakai modal approval prototipe atau mengarang riwayat keputusan.
- Tombol **Muat Ulang Pengajuan** mengambil ulang daftar/statistik/readiness; tersedia juga retry ketika gagal.
- Kalender katalog publik dan form mahasiswa memakai `/api/schedule` per barang. Rentang grid 42 hari dipartisi menjadi request maksimal 31 hari, digabung tanpa menjumlahkan ulang beban. Perubahan barang/bulan dan retry mengabaikan respons stale.
- Tombol **Muat Ulang Jadwal** meminta ulang data API. Tidak ada polling/push otomatis.
- Kalender hanya menunjukkan alokasi agregat disetujui/dipinjam, tanpa identitas/nomor/keperluan pengajuan. **SL-1 berstatus menunggu tidak menjadi booking atau titik alokasi.** Jadwal kosong tetap bukan bukti tersedia.
- Ketersediaan tetap **Belum Diverifikasi**, angka tersedia `null`. Approval/rejection tetap **BLOCKED**; tombol Setujui/Tolak disabled pada daftar dan detail, tanpa callback/request mutasi.
- Waktu legacy pada daftar kini memakai formatter existing yang memberi penanda zona belum terverifikasi, bukan langsung melabeli waktu lokal perangkat sebagai WIB.

## File utama

| File | Perubahan sesi ini |
| --- | --- |
| `src/app/integrations/AdminDashboardContainer.tsx` | Pemetaan enam statistik, ringkasan paket barang+ruangan, label verifikasi dan keputusan BLOCKED pada detail |
| `src/app/components/loans/AdminRequestsPanel.tsx` | Tujuh kartu total/status, refresh, tombol Tolak disabled, formatter waktu aman dan penjelasan filter |
| `src/app/components/loans/view-contracts.ts` | Tambahan field statistik terpisah; opsional untuk kompatibilitas view/fixture komponen lama, bukan fallback nol |
| `src/app/integrations/ScheduleContainer.tsx` | Refresh jadwal existing dengan cancellation/key guard yang sama |
| `tests/browser-integration-sprint2.mjs` | Assertion statistik terpisah, refresh melalui API, Tolak disabled, tidak ada request keputusan |
| `tests/helpers/readonly-snapshot.mjs` | SELECT snapshot konsisten sumber read-only dan clone SQLite memori dengan FK tetap aktif |
| `tests/browser-existing-integration.mjs` | Uji SL-1 asli pada snapshot terisolasi + flow publik pada server aktif 5175 + preservasi sumber |
| `dist/` | Build produksi diperbarui melalui script existing |

Tidak mengubah `backend/`, schema/migrasi, `DB_PATH`, akun/password, stok, transaksi sumber, konfigurasi Vite, package/lockfile, atau port. Tidak mengaktifkan prototipe dashboard CRUD/approval, tarif atau Payment.

## Perlindungan database dan port

Sumber existing:

`database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`

Checkpoint akhir: **3 akun, 12 barang, 1 pengajuan SL-1 berstatus menunggu**. Statistik sumber: total 1, menunggu 1, lima status lain 0. Ini hasil pembacaan actual, bukan data contoh yang disisipkan.

Uji Admin membaca sumber dengan `DatabaseSync(...,{readOnly:true})`, `query_only=ON`, dan satu transaksi SELECT yang mencakup WAL. Schema dan seluruh data disalin ke **SQLite memori terpisah**, dengan FK tetap aktif. Sesi acak hanya dibuat oleh `SessionRepository` existing **pada salinan**, tidak pada sumber. Browser menjalankan entry frontend build dan backend existing terhadap salinan tersebut. Tidak meminta password pemilik, mengganti password salinan, menambah akun atau menyisipkan pengajuan contoh ke sumber.

Pengujian publik benar-benar membuka **http://127.0.0.1:5175**, membaca 12 barang dan kalender dari proxy API aktif. Cookie salinan dihapus sebelum berpindah port karena cookie bersifat host-scoped, bukan port-scoped. Admin tanpa sesi menghasilkan 401. Probe POST logout anonim dengan Origin 5175 juga menghasilkan 401 (Origin diterima, tidak ada sesi untuk dihapus); fingerprint sumber sebelum/sesudah probe identik.

Fingerprint schema dan **seluruh isi tabel** sebelum/sesudah tes SL-1 identik, termasuk akun, sesi, inventaris dan transaksi. Tidak memakai copy mentah file SQLite yang mengabaikan WAL. Tidak ada reset/restore/seed/migrasi pada sumber.

Listener sebelum/sesudah tetap frontend **5175 / PID 28300**, backend **3000 / PID 3884**. Tidak menghentikan atau mengganti server tersebut. Semua server/browser tes yang dibuat sesi ini terpisah.

## Pengujian aktual — 19 November 2026

| Perintah | Hasil |
| --- | --- |
| `npm run build` | **PASS**, Vite 6.3.5, 2.533 modul |
| `npm run test:backend` | **PASS 87/87**, tanpa perubahan implementasi API |
| `npm run test:read-models` | **PASS 7/7**, validator, chunk/merge, zona waktu dan kalender |
| `node tests/browser-integration-sprint2.mjs` | **PASS**, HTTP/backend/SQLite memori: statistik/pagination/detail, kalender, error/retry/loading/malformed/stale, tidak ada request keputusan; 1440/768/390/320 |
| `node tests/browser-existing-integration.mjs <sumber-existing>` | **PASS**, SL-1/detail/statistik pada snapshot sumber; 5175 live untuk katalog/jadwal/refresh/401; seluruh sumber identik; 1440/390/320 |
| `node tests/browser-auth-navigation.mjs` | **PASS**, login/refresh/logout tiga role, keamanan navigasi, publik/internal; 1440/390/320 |
| `node tests/browser-loans.mjs` | **PASS**, form/idempotency/retry/response hilang/refresh/IDOR; mutasi hanya DB tes; 1440/390/320 |
| `node tests/browser-smoke.mjs` | **PASS**, regresi katalog/Home/ruangan/profil/draft/role |
| `node tests/browser-frontend-sprint2.mjs` | **PASS**, komponen/kalender/keyboard/gambar/overflow; 1440/768/390/320/640-landscape |

Total unit/backend **94 tes lulus**, ditambah **6 suite browser lulus** pada run akhir. Screenshot sintetis Dashboard/detail dan kalender live juga ditinjau. Tidak terdeteksi overflow horizontal pada viewport yang diuji; detail memiliki scroll vertikal pada layar kecil. Vite build bukan full TypeScript checker; script lint/typecheck terpisah tidak tersedia/dijalankan. Chrome headless bukan klaim cakupan Safari/iOS.

Run browser awal yang menjalankan empat Chrome bersamaan gagal (timeout integrasi/auth, timeout detail SL-1, dan pembacaan `document.body` sebelum siap pada regresi loans). Run ulang **satu per satu** berhasil tanpa menonaktifkan assertion atau mengubah API/data sumber. Hasil gagal awal tidak dihitung sebagai lulus.

Artefak lokal di `%LOCALAPPDATA%\Temp\opencode\`:

- `smartlend-integration-browser-h0Jrmk`: SL-1/snapshot existing dan kalender live 5175. **Screenshot Admin memuat PII existing; jangan dipublikasikan.**
- `smartlend-integration-browser-WPuOsg`: integrasi dengan data sintetis berlabel pada DB memori.
- `smartlend-auth-flow-9Tcxut`: tiga role/navigasi.
- `smartlend-loan-browser-D4LlsP`: regresi mahasiswa.
- `smartlend-browser-bKgnTW`: smoke.
- `smartlend-frontend-s2-yYUsrY`: komponen lima viewport.

## Cara memeriksa di aplikasi dan batas bukti

1. Buka **http://127.0.0.1:5175**, login Admin menggunakan akun/password existing.
2. Dashboard menampilkan SL-1 dan statistik API. Gunakan **Detail SL-1**; Setujui/Tolak tetap disabled/BLOCKED. **Muat Ulang Pengajuan** membaca ulang data tersimpan.
3. Buka katalog → **Jadwal Peminjaman**, pilih barang/bulan. Kalender membaca alokasi dari API; SL-1 menunggu tidak muncul sebagai alokasi. Ketersediaan tetap Belum Diverifikasi.

Automasi tidak melakukan login Admin pada **database sumber**: bukti SL-1 menggunakan salinan SELECT existing dengan sesi uji lokal. Login tiga role diuji end-to-end pada DB sintetis terpisah, sedangkan flow publik/proxy/Origin diuji pada listener 5175 yang aktif. Kredensial nyata tetap dikelola pemilik.

Approval, rejection, kapasitas layak pinjam dan alokasi fasilitas belum diaktifkan atau diselesaikan oleh integrasi frontend. Persetujuan kontrak Database/verifikasi kapasitas dan pengujian race approval aktif tetap mengikuti [laporan Backend Session 3](BACKEND_SESSION3_REPORT.md). API mendukung jadwal ruangan, tetapi UI jadwal sesi ini memilih **barang existing**; database sumber tidak mempunyai ruangan sehingga tidak menambahkan pilihan/data ruangan fiktif.
