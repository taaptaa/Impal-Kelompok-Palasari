# SmartLend Sprint 2 — finalisasi UI, Keranjang dan checkout

> Tahap berikutnya telah menjalankan migrasi form003 dengan izin pemilik. Lihat [laporan aktivasi](SPRINT2_FORM_ACTIVATION_REPORT.md) untuk status terbaru; laporan checkout ini tetap menjadi bukti historis sebelum aktivasi.

**19 November 2026 — laporan aktual, bukan klaim kesiapan produksi.**

## A. Ringkasan

**Selesai dan teruji:** alignment Home/Katalog, container maksimum 1440 px, grid responsif, label Keranjang, ringkasan bergambar dengan kontrol jumlah/hapus/total, checkout dua kolom desktop/satu kolom mobile, kredit gambar terpisah, jadwal dalam dialog dekat periode, serta regresi pengajuan/Admin existing.

**Selesai pada database terisolasi:** kontrak opsional kontak/kegiatan, validasi backend, persistensi atomik/idempotent, konfirmasi informatif berversi, read-back peminjam/Admin dan concurrency retry.

**BLOCKED pada sumber pengguna:** aktivasi field tambahan (belum ada izin migrasi), dokumen, syarat legal resmi, availability terverifikasi, approval/rejection dan Payment Umum. Field tambahan nonaktif pada schema sumber; bukan form lengkap yang diam-diam kehilangan data.

Hasil akhir: build PASS; **95 tes backend + 7 read-model/kalender = 102 PASS**; tambahan **14 tes prototipe availability PASS**; **9 suite browser PASS**. Tes prototipe bukan approval operasional. Seluruh data/schema sumber dan hash 12 gambar identik pada pemeriksaan akhir.

## B. Audit awal

- Session lain dikonfirmasi pengguna sudah berhenti; editor tunggal diizinkan. Tidak ada reset/restore/Git, penghapusan source, atau penggantian hasil session sebelumnya.
- Source frontend, integrasi, API, auth, server, service pengajuan/read, readiness/schema, stylesheet dan laporan baseline diperiksa. Referensi: [integrasi sebelumnya](SPRINT2_INTEGRATION_REPORT.md), [Backend Session 3](BACKEND_SESSION3_REPORT.md), [audit DB](DATABASE_ENGINEER_SPRINT2_AUDIT.md), [proposal availability](DATABASE_SCHEMA_PROPOSAL_SPRINT2.md), [kontrak DRAFT](DATABASE_BACKEND_CONTRACT_SPRINT2.md), [pengajuan existing](LOAN_SUBMISSION_SPRINT2.md), serta [manifest foto](INVENTORY_PHOTO_VERIFICATION.json).
- `docs/PRD.md`, `DESIGN_SYSTEM.md`, dan `USER_FLOWS.md` tidak ditemukan. Stack/dependency existing digunakan, tidak ada paket/router/styling framework baru.
- Root masalah layout: header Home full-width tanpa batas isi, isi Home dan Katalog memakai wrapper/padding berbeda; token spacing global juga membuat kelas ukuran tertentu tidak setara dengan asumsi default Tailwind. Solusi scoped `.sl-shell`, bukan mengganti konfigurasi global/desain.
- Tool Figma dicoba pada file sumber `myW28RLuyQZMbBMsZzaDND`; server menolak karena file Make. Komponen/logo/aset/palet existing menjadi acuan. **Tidak ada klaim sinkronisasi atau perubahan file Figma.**
- Audit SQLite read-only konsisten: 3 akun, 12 barang, 1 header/1 detail SL-1, 0 ruangan. Profil 001 masih 11 kolom dan indeks idempotency. Tidak mengasumsikan tabel baru tersedia.
- Baseline Admin diverifikasi sebelum edit besar: anonim 401 pada listener aktif; SL-1/statistik/detail melalui backend terhadap salinan SELECT terisolasi sesuai sumber; status dan stok tetap.

## C. Perbaikan UI

- Navbar, header dan isi Home/Katalog/check-out mengikuti shell yang sama, maksimal 1440 px dengan padding 16/24/32 px. Header background tetap full-width; isi sejajar. Statistik lebih terbaca, banner mengikuti lebar konten.
- Katalog: 4 kolom pada 1920/1440, 2 pada tablet 768 dan landscape 640, 1 pada 390/320. Search dan filter berdampingan bila cukup ruang. Gambar tetap `object-contain`, tidak dipotong paksa.
- Foto 12 barang tidak diganti/diunduh ulang. SHA-256 dan ukuran semua aset sesuai manifest terverifikasi sebelumnya. Kode stabil `UJI-*` dan fallback tetap digunakan.
- Kartu tidak lagi memuat paragraf atribusi panjang. Detail menampilkan judul/author/sumber/lisensi; tombol **Kredit Gambar** tersedia di footer seluruh route termasuk publik, satu langkah ke 12 kredit lengkap. Author, judul karya, sumber Commons dan tautan lisensi tetap dapat diakses; bukan sekadar teks disembunyikan.
- Penanda ilustrasi tetap ada pada alt dan informasi halaman. Foto whiteboard adalah papan tulis umum, tidak membuktikan roda/model portable atau spesifikasi unit kampus.
- Mobile tidak overflow horizontal pada viewport teruji. Label Keranjang dan jumlah dibagi dua baris di BottomNav agar tidak menjadi ellipsis. Modal memakai ukuran viewport, scroll vertikal dan fokus terkelola; Escape mengembalikan fokus jadwal ke tombol pembuka.

## D. Keranjang

- Label aktif diganti konsisten pada Navbar, BottomNav, Home, katalog, toast, bantuan profil, form dan empty state: **Keranjang**, **Ringkasan Keranjang**, **Tambah ke Keranjang**, **Kembali ke Keranjang**. Identifier internal `plan`, route/API dan nama tabel tidak diganti.
- Hitungan navigasi = jenis unik; contoh Proyektor 1 + HDMI 2 + Speaker 1 → Keranjang (3), total 4 unit. Menambah kode yang sama mengganti jumlah pilihan sesuai kontrak existing, bukan membuat jenis ganda.
- Ringkasan memakai data/foto API: nama, kode, jenis, jumlah/satuan, stok total, availability unknown, plus/minus, input jumlah, Simpan jumlah, Hapus, Tambah Barang dan Ajukan Peminjaman. Route Keranjang menempatkan ringkasan di atas; katalog tetap dapat dipakai untuk menambahkan barang.
- Jumlah bulat positif dan tidak melebihi stok total; ini batas input, bukan verifikasi availability. Perubahan jumlah yang belum disimpan atau invalid menonaktifkan lanjut/submit, bukan terkirim diam-diam.
- Keranjang kosong tidak dapat diajukan. Keranjang tidak membuat transaksi, mengunci kapasitas atau mengurangi stok. Logout/refresh menghapus draft memori sesuai arsitektur existing; riwayat commit tetap dibaca dari SQLite.
- Navigasi Keranjang/Form/Tambah Barang mempertahankan draft form. Batalkan Draft memerlukan konfirmasi, mengosongkan **form saja**, tidak menghapus Keranjang atau transaksi tersimpan. Saat hasil kirim belum pasti, draft/keranjang snapshot dikunci; pembatalan draft tidak ditawarkan untuk menghindari duplikasi.

## E. Form Pengajuan dan status field

Form existing dipertahankan, bukan registrasi akun baru. Desktop ringkasan di kiri dan form di kanan; mobile ringkasan, form, ringkasan jadwal/keputusan awal, lalu aksi. Pengiriman masih menggunakan alur keamanan existing.

| Field/fungsi | Sumber / validasi | Status sumber pengguna |
| --- | --- | --- |
| Nama, email, ID aktor, kategori | Sesi backend; tidak menerima identitas tepercaya dari input | **PASS**, mekanisme existing dipertahankan |
| Keperluan `reason` | Wajib, trim, maks. 150 karakter; tidak dibungkus metadata | **PASS** melalui kontrak dasar; mutasi sumber tidak diautomasi |
| Periode dan jam | WIB eksplisit → ISO UTC; nyata, future dan kembali setelah mulai, tanpa batas durasi bisnis baru | **PASS** pada regresi/tes terisolasi |
| Telepon | Form lengkap: wajib 8–15 digit, boleh `+`; bukan verifikasi pemilik nomor | **BLOCKED aktivasi sumber**, persistensi/validasi tes PASS |
| NIM/ID | Opsional maks. 40, tanpa newline/tab; tidak mengarang format/validitas institusional | **BLOCKED aktivasi/verifikasi institusi**, validasi teknis tes PASS |
| Program studi/unit | Opsional maks. 120, isian pengguna | **BLOCKED aktivasi sumber**, tes PASS |
| Nama kegiatan | Wajib untuk payload lengkap, maks. 120 | **BLOCKED aktivasi sumber**, tes PASS |
| Lokasi kegiatan | Wajib untuk payload lengkap, maks. 160 | **BLOCKED aktivasi sumber**, tes PASS |
| Deskripsi kegiatan | Opsional maks. 1.000 | **BLOCKED aktivasi sumber**, tes PASS |
| Checkbox informatif | Teks bukan reservasi, versi `submission-info-v1`, waktu server; backend memeriksa jika `details` dipakai | **BLOCKED pencatatan sumber**, tes PASS |
| Dokumen | Tidak ada input upload palsu | **BLOCKED**, tidak ada storage/download aman |
| Syarat legal resmi | Belum ada dokumen disahkan; tidak disebut persetujuan kampus | **BLOCKED** |
| Umum/Dosen/Staf/Payment | Tidak ada kategori palsu yang bisa diproses atau tarif baru | **BLOCKED**, tidak diaktifkan |

Field yang belum didukung dirender disabled dengan alasan. UI menunggu capability sebelum mengaktifkan field; gangguan status ditampilkan/retry. Jika draft tambahan terisi tetapi capability hilang, submit dasar diblokir agar data tidak dibuang. Submit hanya aktif untuk data valid; backend tetap memvalidasi tanpa mempercayai disabled/checkbox browser.

Setelah commit, nomor dari backend dan pengguna diarahkan ke Peminjaman Saya. Error, klik ganda, respons hilang setelah commit dan retry mempertahankan payload/key yang sama. Informasi tambahan yang aktif pada DB tes benar-benar dibaca ulang dari storage setelah refresh dan tampil pada detail Admin yang sama.

## F. Kalender

- Tombol **Lihat Jadwal Barang** berada dekat judul jadwal pengajuan. Dialog memakai `ScheduleContainer`/`BookingSchedule` existing, bukan duplikasi kalender/API. Terbuka pada barang pertama dalam checkout dan bulan tanggal mulai bila sudah diisi.
- Kalender input memilih periode; kalender dialog hanya membaca alokasi. Penjelasan fungsi dipisahkan. Pengajuan tetap WIB/Asia/Jakarta dan wire UTC; pergantian tahun serta zona perangkat berbeda teruji.
- `/api/schedule` tetap agregat `[startsAt,endsAt)`, jendela 42 hari dipartisi maksimal 31 hari/request; merge/abort/stale guard tetap. Filter barang, loading/empty/error/retry/refresh dan privasi dipertahankan.
- Pesan wajib tetap terlihat: **Belum diverifikasi**, **menunggu tidak termasuk alokasi**, **jadwal kosong bukan bukti tersedia**. `availableQuantity:null` tidak diubah menjadi nol/total. Penjelasan teknis fasilitas, legacy UTC dan rekonsiliasi diletakkan dalam disclosure yang bisa dibuka; waktu pembacaan tetap terlihat.

## G. Backend yang benar-benar berubah

Rincian kontrak, validasi dan aktivasi: [LOAN_FORM_EXTENSION_DRAFT.md](LOAN_FORM_EXTENSION_DRAFT.md).

- Baru GET `/api/loans/form-options`, student-only, mengumumkan dukungan schema tanpa migrasi/penulisan.
- POST `/api/loans` menerima `details` **opsional** tervalidasi. Payload lama/hash/replay tetap kompatibel; field tidak dikumpulkan lalu disisipkan ke `reason`.
- `backend/loan-form.mjs` memeriksa profil schema pendamping secara tepat. Tidak ada tabel → BLOCKED; schema drift ditolak aman; tidak ada auto-create.
- Metadata ikut hash kanonik, write lock, header/detail dan commit yang sama. Gagal metadata → rollback seluruh header/detail/key. Konfirmasi timestamp ditetapkan server; replay tidak mengubahnya.
- Read model peminjam/Admin menambahkan `details` hanya jika ada record; legacy tidak diberi metadata palsu. Read-back divalidasi runtime di client. Jadwal publik tidak memuat kontak/kegiatan.
- Auth/CSRF/Origin, revalidasi sesi di bawah lock, role dan idempotency existing tidak dilepas. Gate keputusan, `/api/schedule`, algoritma kapasitas dan pembayaran tidak diaktifkan/diubah secara operasional.
- Pada listener lama yang belum memuat source backend baru, UI tetap kompatibel dengan form dasar dan menolak mengaktifkan field tambahan dari respons 404. **Kode endpoint baru teruji pada backend tes; aktivasi source pada proses 3000 memerlukan restart operator.** Tidak melakukan restart proses milik pengguna secara otomatis.

## H. Database, backup dan preservasi

Target tetap `database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite`. Nama disposable tidak menjadi izin untuk meresetnya. Tidak mengganti DB_PATH, password, sesi, seed, stok, atau engine.

DDL baru `database/proposals/003-loan-form.DRAFT.sql` adalah tabel pendamping `informasi_pengajuan`, bukan ALTER header. Hanya dieksekusi di memori/file tes baru. Tidak menerapkan proposal 002 atau 003 ke sumber; tidak membuat baseline/alokasi palsu. Tidak membuat runner apply target atau migrasi startup.

Checkpoint read-only sebelum tugas: `C:\Users\apta3\AppData\Local\Temp\opencode\smartlend-checkout-before-20261119.json`. Ini fingerprint, **bukan backup data**. Karena tidak ada migrasi/mutasi sumber, tidak membuat atau memulihkan backup pengguna. Sebelum aktivasi mendatang wajib backup konsisten termasuk WAL dan uji restore ke file baru, disertai persetujuan target terpisah.

| Data | Awal tugas | Hasil akhir |
| --- | --- | --- |
| Schema | Profil 001, 11 kolom + index | Identik; tidak ada tabel proposal pada sumber |
| Akun/hash | 3 | Seluruh field/hash identik |
| Sesi dan percobaan login | Fingerprint awal | Identik pada verifikasi akhir |
| Barang/stok | 12 | Seluruh field/stok identik |
| SL-1 | `menunggu`, Proyektor 9001 ×1 | Header/detail/status identik |
| Periode SL-1 | `2026-12-20T12:00:00.000Z` → `2027-12-19T17:00:00.000Z` | Identik, tanpa batas durasi baru |
| Transaksi lain/tabel lain | Seluruh isi fingerprint awal | Identik |
| Integritas/FK | Audit read-only | `ok` / 0 masalah |
| Foto | 12 aset terverifikasi | 12 hash dan ukuran identik |

Tes Admin existing menggunakan transaksi SELECT konsisten termasuk WAL, clone ke memori dengan FK aktif dan sesi tes **pada salinan saja**. Tidak meminta password atau mengambil sesi pengguna pada sumber. Salinan/screenshot existing dapat memuat data sensitif; jangan dipublikasikan.

## I. Dashboard Admin

Statistik total dan enam status, daftar/filter/pagination/refresh/retry/detail tetap menggunakan API existing. Multi-barang tidak dihitung ganda. Baseline SL-1 terbaca melalui backend/snapshot: total 1, menunggu 1, status lain 0; Proyektor ×1 dan periode sesuai sumber. UI tidak kembali ke mock/array kosong.

Metadata tambahan tampil pada detail Admin hanya untuk pengajuan yang benar-benar memiliki data tersebut. Uji checkout membuktikan Admin membaca pengajuan sintetis yang sama dengan receipt peminjam, bukan state form lokal. Stok Kritis/availability tetap unknown; Setujui/Tolak disabled.

## J. Approval dan availability

| Blocker | Yang diperlukan sebelum aktivasi |
| --- | --- |
| Baseline kapasitas | Hitung fisik/bukti layak, rusak, hilang, perbaikan dan nonpinjam; `stok_total` bukan kapasitas otomatis |
| Fasilitas/ruangan | Sahkah unit fasilitas termasuk total/pool, aturan eksklusivitas dan konflik silang |
| Custody/return | Rekonsiliasi pinjaman aktif, partial return, overdue dan kondisi; lewat tanggal bukan kembali |
| Waktu legacy | Bukti zona asal dan konversi konsisten tanpa mengubah SL-1 diam-diam |
| Keputusan/audit | Aktor, UTC, alasan rejection, versi/CAS, idempotency keputusan dan audit atomik |
| Transaksi/concurrency | Hitung peak seluruh paket di bawah lock, insufficient capacity, approve-vs-reject, pickup/return/repair melawan approval dan rollback |
| Migrasi target | Review kontrak, backup/restore test, persetujuan eksplisit dan seluruh writer mengikuti protokol yang sama |

Kontrak Database/Backend existing tetap **rancangan yang perlu disahkan pemilik**, tidak diberi label final operasional sepihak. Usulan endpoint approve/reject tetap mengikuti Backend Session 3, bukan endpoint baru duplikat. Rejection juga BLOCKED karena audit/version/idempotency belum ada. Tes gate fail-closed dan 14 tes prototipe terisolasi lulus; **bukan bukti approval operasional sudah selesai**. Tidak ada baseline asumsi, alokasi, status SL-1 atau stok yang diubah pada sumber.

## K. Pengujian dan bukti

| Pemeriksaan | Hasil aktual |
| --- | --- |
| `npm run build` | **PASS**, Vite 6.3.5, 2.537 modul; production bundle terkini |
| `npm run test:backend` | **PASS 95/95**, termasuk 8 tes form tambahan; tanpa skip |
| `npm run test:read-models` | **PASS 7/7** |
| `node --test tests/database-engineer/availability.test.mjs` dengan audit source eksplisit | **PASS 14/14**, tanpa skip; proposal hanya pada salinan/fixture |
| `npm run test:checkout` | **PASS**, enam viewport; identitas, cart3/unit4, +/−/ubah/hapus, invalid/unsaved, draft normal, konfirmasi batal, metadata persisted, refresh, owner/Admin, lost response/idempotent retry/double submit, dialog/Escape/fokus |
| `npm run test:integration` | **PASS**, Admin/statistik/pagination/detail; kalender/31 hari/WIB/lintas tahun; loading/error/retry/malformed/stale dan gate |
| `node tests/browser-loans.mjs` | **PASS**, regresi form dasar/POST/rollback/retry/response hilang/IDOR/history 1440/390/320 |
| `node tests/browser-auth-navigation.mjs` | **PASS**, tiga role, refresh/logout/otorisasi/publik/internal/draft |
| `node tests/browser-smoke.mjs` | **PASS**, Home/search/filter/catalog/ruangan/cart/profil/role |
| `node tests/browser-frontend-sprint2.mjs` | **PASS**, lima viewport, fixture keyboard/kalender/state/fallback, tanpa backend |
| `node tests/browser-item-detail.mjs` dengan sumber read-only dan compact screenshots | **PASS**, seluruh 12 barang di **1920/1440/768/390/320/640-landscape**; tidak mengurangi assertion modal/isi/keyboard/fokus/overflow |
| `node tests/browser-existing-integration.mjs <target>` | **PASS**, SL-1/statistik/detail dari snapshot terisolasi + live katalog/jadwal/refresh/401 pada 5175; sumber identik |
| `node tests/browser-running-app-readonly.mjs` | **PASS**, GET-only **5175 → 3000**; 12 foto/jadwal200/menunggu bukan alokasi/unknown/Admin anonim401; desktop/mobile |
| Verifier checkpoint tugas + hash foto | **PASS**, schema/seluruh data/sesi/stok/transaksi/aset identik, integrity ok/FK0 |
| Full TypeScript checker/lint | **NOT TESTED**, tidak ada script terkonfigurasi; Vite build bukan full typecheck |
| Login/POST lengkap pada DB sumber | **NOT TESTED**, tidak meminta kredensial atau membuat transaksi target; field tambahan belum diaktifkan |
| Browser Safari/iOS fisik | **NOT TESTED**, Chrome headless + emulasi viewport/zona bukan semua browser |
| Upload, legal terms resmi, approval aktif, Payment | **BLOCKED** |

Tes lama disesuaikan dengan label Keranjang, struktur ringkasan bergambar dan grid 4 kolom, bukan dilemahkan: uji qty masih mengecek nilai unit dan jumlah jenis; form invalid kini menonaktifkan submit, dan validasi tetap diuji dengan programmatic submit. Test baru menegaskan kontak/kegiatan benar-benar tersimpan, bukan sekadar render.

Kegagalan awal dan penanganannya:

1. Uji baru menemukan dialog tanpa trigger Radix tidak memulihkan fokus. Source diperbaiki dengan ref tombol dan `onCloseAutoFocus`; assertion Escape/fokus kemudian PASS.
2. Smoke lama mengasumsikan satu string `nama · jumlah`; struktur baru memisahkan elemen. Assertion diubah ke data jumlah dan jumlah baris yang sama, kemudian PASS.
3. Drive C: sempat **0 byte**, beberapa run gagal `ENOSPC` ketika menulis screenshot. Dengan izin pengguna, hanya cache/subfolder runtime Chrome dari direktori tes **sesi ini** dibersihkan; screenshot bukti, source, database, backup dan profil pribadi tidak dihapus. Percobaan pembersihan awal sempat timeout; pembersihan terarah berikutnya berhasil. Pengujian diulang hingga PASS.
4. Mode `SMARTLEND_COMPACT_SCREENSHOTS=1` mengurangi jumlah file gambar (seluruh modal tetap diassert pada semua viewport). Harness membatasi disk cache dan background service Chrome, bukan memblokir API/menghapus assertion.
5. Probe live menemukan race setelah reload saat `document.body` belum ada; readiness condition dibuat null-safe dan seluruh pemeriksaan berikutnya tetap dijalankan, lalu PASS.

**Peringatan operasional:** ruang C: masih sangat terbatas. Pemilik perlu menyediakan ruang kerja memadai (disarankan sedikitnya 500 MB–1 GB) sebelum menambah transaksi/menjalankan banyak browser/build lagi. Jangan menganggap pembersihan cache tes menyelesaikan kapasitas disk pengguna secara umum. Jangan menghapus database/backup untuk mengosongkan disk.

### Artefak lokal

Dasar: `C:\Users\apta3\AppData\Local\Temp\opencode\`.

- `smartlend-integration-browser-W1eVIX`: checkout final; Home/Katalog/Keranjang/form/dialog di enam ukuran. Screenshot 1920, form320 dan dialog320 ditinjau visual.
- `smartlend-integration-browser-6MfRRf`: regresi Admin/kalender sintetis.
- `smartlend-integration-browser-1g03pI`: SL-1 snapshot + jadwal live. **Screenshot Admin memuat PII existing; jangan publikasikan.**
- `smartlend-integration-browser-PvSYNT`: probe live GET-only final.
- `smartlend-modal-qim2Iw`: Detail 12 barang/enam viewport; screenshot disampling, assertion lengkap.
- `smartlend-loan-browser-IzHn9v`, `smartlend-auth-flow-YjjcjP`, `smartlend-browser-maKCa1`, `smartlend-frontend-s2-TodcPa`: regresi lainnya.
- `smartlend-db-engineer-0VQF2G`: salinan SELECT untuk prototipe availability; memuat hash akun, jangan dibagikan.

### Acceptance criteria tugas sekarang

| AC | Status | Batas bukti |
| --- | --- | --- |
| 01–03 | PASS | Alignment/grid/overflow enam viewport, termasuk 1920 |
| 04–05 | PASS | 12 gambar/hash/fallback; kredit di Detail dan halaman publik khusus |
| 06–09 | PASS | Label, Ringkasan, jenis/unit, +/−/ubah/hapus/empty/invalid |
| 10–11 | PASS | Form existing tertata/diperluas aman; identitas sesi, bukan registrasi baru |
| 12 | BLOCKED pada target | Validasi kontak/kegiatan PASS di DB terisolasi; aktivasi sumber menunggu izin |
| 13 | BLOCKED pada target | Persistensi/read-back atomik/idempotent lengkap PASS di tes; tidak diklaim aktif sumber |
| 14–15 | PASS | WIB, bulan/tahun/lintas tahun, dialog jadwal terintegrasi |
| 16–17 | PASS sebagai pengaman | Tidak ada upload palsu/claim legal; fitur upload dan persetujuan resmi sendiri BLOCKED |
| 18–20 | PASS | Regresi submit/history/Admin dan read-back metadata terisolasi |
| 21–24 | PASS | SL-1 menunggu, fail-closed, unknown dan seluruh akun/inventaris identik |
| 25 | PASS kompatibilitas existing | 5175/3000 GET aktual; source backend tambahan perlu restart operator, bukan migrasi otomatis |
| 26–28 | PASS | Build/regresi aktual, schema sumber tetap, laporan dan batas fitur tersedia |

## L. File berubah

| Path | Alasan/dampak |
| --- | --- |
| `src/styles/checkout.css`, `src/styles/index.css` | Alignment scoped, grid, typography statistik, input/mobile/reduced-motion |
| `src/app/screens/HomeScreen.tsx`, `CatalogScreen.tsx` | Lebar/alignment, grid/search/filter, istilah baru, ringkasan dan atribusi Detail |
| `src/app/components/CartSummary.tsx` | Ringkasan reusable katalog/checkout; jumlah/satuan/kontrol/total/validity |
| `src/app/screens/LoanFormScreen.tsx` | Dua kolom, draft aman, capability gate, field tambahan, konfirmasi batal dan dialog jadwal |
| `src/app/components/InventoryVisual.tsx`, `src/app/data/inventoryPhotos.ts`, `src/app/screens/ImageCreditsScreen.tsx` | Gambar tetap; caption opt-in, kredit lengkap per kode |
| `src/app/components/Navbar.tsx`, `BottomNav.tsx`, `src/app/navigation.ts`, `screens/MainApp.tsx` | Label/count Keranjang, route kredit, footer, wiring state/checkout |
| `src/app/screens/RoleSelectionScreen.tsx`, `ProfileScreen.tsx`, `MyLoansScreen.tsx` | Copy aktif konsisten tanpa mengganti identitas/role/transaksi |
| `src/app/components/loans/BookingSchedule.tsx`, `src/app/integrations/ScheduleContainer.tsx` | Pesan ringkas/disclosure, bulan awal checkout, API existing tetap |
| `src/app/loan-form-validation.mjs`, `.d.mts`, `loan-validation.mjs` | Kontrak/validasi tambahan bersama, dasar kompatibel |
| `backend/loan-form.mjs`, `backend/loans.mjs`, `backend/loan-reads.mjs`, `backend/server.mjs` | Capability, optional atomic persist/hash/read-back; gate keputusan tetap |
| `src/app/api.ts`, `loan-read-models.mjs` | Tipe/capability/runtime validation respons tambahan |
| `src/app/components/LoanFormDetails.tsx`, `LoanSummary.tsx`, `integrations/AdminDashboardContainer.tsx` | Metadata hanya dari respons tersimpan, owner/Admin |
| `database/proposals/003-loan-form.DRAFT.sql` | Tabel pendamping usulan; tidak diterapkan pada target |
| `tests/loan-form.test.mjs`, `tests/browser-checkout-sprint2.mjs` | Validasi/persistensi/rollback/concurrency baru dan UX end-to-end |
| `tests/browser-{loans,auth-navigation,smoke,item-detail,integration-sprint2,existing-integration,running-app-readonly}.mjs` | Regresi disesuaikan label/struktur/grid; null-safe reload dan sampling artefak |
| `tests/helpers/browser-harness.mjs`, `tests/fixtures/frontend-sprint2.tsx` | Profil Chrome tes ringan; fixture tanpa panggilan API tetap terisolasi |
| `package.json`, `dist/` | Script backend/checkout dan production build terbaru, tanpa dependency/port baru |
| Dua laporan baru ini | Kontrak DRAFT, bukti, batas aktivasi, pemeriksaan manual |

Tidak mengubah `backend/auth.mjs`, `backend/db.mjs`, baseline schema, migrasi 001, proposal availability 002, aset foto/logo, DB_PATH, Vite config/port, akun/password, stok atau transaksi sumber. Source prototipe lama yang tidak dipakai route live tidak dihapus.

## M. Instruksi manual

### Menjalankan/restart

Sediakan ruang disk terlebih dahulu. Restart hanya melalui terminal server milik operator; asisten tidak menghentikan server 5175/3000. Dari workspace resmi, **pertahankan DB_PATH existing**:

```powershell
if (-not $env:DB_PATH -or -not (Test-Path -LiteralPath $env:DB_PATH -PathType Leaf)) {
  throw 'Gunakan DB_PATH existing terverifikasi. Jangan seed atau membuat DB baru.'
}
$expected = (Resolve-Path 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite').Path
if ((Resolve-Path -LiteralPath $env:DB_PATH).Path -ne $expected) { throw 'Target berbeda; hentikan dan audit.' }
$env:PORT = '3000'
$env:APP_ORIGIN = 'http://127.0.0.1:5175'
npm run server
```

Terminal frontend:

```powershell
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Buka **http://127.0.0.1:5175**, bukan 5173/localhost. Proxy existing `/api` tetap ke 127.0.0.1:3000. Restart backend memuat source capability baru tetapi **tidak** mengaktifkan schema form tambahan atau approval. Jangan menjalankan SQL proposal untuk sekadar memperbarui tampilan.

### Checklist pemilik, tanpa mutasi transaksi sumber

1. Login Mahasiswa memakai kredensial sendiri; jangan kirim password/token ke asisten. Bandingkan Home/Katalog di 1920 dan 390/320: header/isi sejajar, grid proporsional, foto utuh, tanpa paragraf lisensi per kartu.
2. Buka Detail dan Kredit Gambar; cek author, judul, sumber/lisensi dan penanda ilustrasi. Jalur publik tetap bisa kembali ke pemilihan role.
3. Tambahkan Proyektor 1, HDMI 2, Speaker 1: navigasi Keranjang (3), total4. Ubah/tambah/kurangi/hapus; nilai pecahan/negatif tidak boleh diterapkan atau dilanjutkan tanpa koreksi.
4. Ajukan Peminjaman → form. Identitas read-only berasal dari sesi; pada sumber tanpa migrasi, kontak/kegiatan tambahan dan konfirmasi informatif disabled dengan alasan. Keperluan/waktu dasar tetap tersedia. Jangan menganggap field disabled telah tersimpan.
5. Isi periode future WIB, ganti bulan/tahun, buka Lihat Jadwal Barang, filter barang/refresh, tutup/Escape. Tanggal input tetap; jadwal adalah alokasi saja, unknown tetap unknown.
6. Kembali ke Keranjang/Tambah Barang/lalu form: draft bertahan. Batalkan Draft → Lanjut Mengisi mempertahankan data; konfirmasi Kosongkan Draft Form hanya mengosongkan form, Keranjang tetap.
7. Untuk pemeriksaan tanpa mutasi, **jangan klik Kirim Pengajuan pada sumber**. Pengujian lengkap sudah tersedia lewat `npm run test:checkout` pada SQLite memori. Submit sumber baru memerlukan keputusan/izin mutasi dan aktivasi metadata terpisah bila form lengkap dipakai.
8. Login Admin menggunakan akun sendiri. Periksa statistik/SL-1/Detail: pada checkpoint total1/menunggu1, Proyektor ×1 hingga periode2027; filter/refresh bekerja. Jika ada transaksi sah baru, gunakan data aktual, bukan memaksa angka lama. Setujui/Tolak tetap disabled/BLOCKED.
9. Peminjaman Saya tetap membaca transaksi tersimpan setelah refresh. Refresh/logout menghapus draft memori; jika respons pengiriman tidak pasti, periksa riwayat sebelum membuat pengajuan baru/key baru.

### Mengulang tes

```powershell
npm run build
npm run test:backend
npm run test:read-models
npm run test:integration
npm run test:checkout
node tests/browser-existing-integration.mjs 'database/disposable/accounts-a9eb6042270240ada210140f4d9746f7.disposable.sqlite'
node tests/browser-running-app-readonly.mjs
```

Jalankan browser satu per satu dengan ruang disk memadai. Node teruji 22.13.1 (`node:sqlite` masih experimental) dan Chrome lokal diperlukan. Untuk artefak Detail yang lebih hemat, gunakan `SMARTLEND_COMPACT_SCREENSHOTS=1`; ini tidak melewati pemeriksaan barang/viewport. Aktivasi field tambahan, dokumen, kebijakan legal dan approval tetap keputusan pekerjaan berikutnya, bukan efek samping menjalankan tes.
