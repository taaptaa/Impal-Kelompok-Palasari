# Session 2 — kontrak UI dan rencana integrasi (usulan, belum kontrak API)

## Batas kepemilikan

Session ini tidak mengubah `api.ts`, `App.tsx`, `MainApp.tsx`, `navigation.ts`, Navbar/BottomNav, autentikasi, backend, schema, DB_PATH, atau konfigurasi port. Port aplikasi tetap **5175**. Dokumen lama yang menyebut 5173 bukan instruksi mengganti port sesi ini.

Kalender form tetap menyimpan string wall-clock `YYYY-MM-DDTHH:mm` WIB dalam draft existing. Submit tetap menggunakan `jakartaToUtc` dan payload UTC kanonik existing. Kalender bukan pemeriksaan ketersediaan. Tidak ada batas durasi bisnis baru.

## Kontrak props sebelum implementasi

Tipe di `src/app/components/loans/view-contracts.ts` adalah **view model frontend**, bukan deklarasi endpoint, schema, atau respons API yang sudah disepakati.

- `RemoteView<T>`: `unconnected`, `loading`, `error` (pesan), atau `ready` (data). Hanya `ready` dengan array kosong berarti tidak ada hasil. `unconnected` tidak boleh dianggap nol booking.
- `ScheduleEntry`: ID/label tampilan, `startsAt`/`endsAt` UTC, status schema existing, dan `verification: unverified | verified`. Bukan stok tersedia. Data kalender harus diproyeksikan dan diotorisasi backend; tidak mengirim email/nama peminjam lain ke publik/mahasiswa.
- `BookingScheduleProps`: state daftar, bulan awal opsional, callback bulan untuk loader kelak, retry opsional. Kalender ditampilkan WIB, overlap lintas hari/bulan termasuk; akhir interval eksklusif.
- `AdminRequestRow`: ID/nomor, nama peminjam untuk Admin berotorisasi, waktu UTC, status, ringkasan barang, keperluan. `AdminOverview`: statistik agregat nullable dari API (bukan jumlah hasil halaman), daftar baris. `AdminRequestsPanelProps`: state, retry opsional. Tidak menyediakan callback mutasi/approval.
- Komponen Admin live menerima `overview` opsional; default `unconnected`. Kalender default `unconnected`. Tidak ada fetch atau fixture production. Adapter kelak dimiliki Session Backend/integrasi setelah persetujuan kontrak.

## Yang perlu disepakati Session Backend

1. Endpoint/method resmi untuk jadwal dan overview Admin; jangan menggunakan `/api/admin` sebagai daftar tanpa kontrak baru (existing hanya pemeriksaan akses).
2. Scope mahasiswa/publik/Admin, privasi field, filter bulan WIB dikirim sebagai batas UTC `[from,to)`, status yang masuk kalender, pagination, total agregat dan filter statistik.
   Callback bulan membawa `Date` untuk tampilan civil kalender, bukan instant backend: baca tahun/bulannya, susun awal bulan dan bulan berikutnya pukul 00.00 WIB, lalu konversi eksplisit ke UTC. Jangan langsung memakai `month.toISOString()` dari zona perangkat.
3. UTC kanonik dengan `Z`, `endsAt > startsAt`, status schema: menunggu/disetujui/ditolak/dipinjam/selesai/dibatalkan; arti verifikasi harus eksplisit, tidak disimpulkan dari status disetujui.
4. Bentuk error, penanganan 401/403/503, cancellation respons stale, retry dan timestamp pembaruan. Error tidak boleh diterjemahkan menjadi daftar kosong.
5. Validasi runtime pada adapter sebelum membentuk `ready`, deduplikasi ID dan penanganan pagination; kalender tidak boleh mengklaim cakupan lengkap dari satu halaman parsial.
6. Approval terpisah: otorisasi, CSRF, race/concurrency, validasi stok/jadwal/kondisi dan audit harus aman sebelum tombol Setujui boleh diaktifkan. Pada implementasi sesi ini tombol selalu disabled.

## Penempatan tanpa konflik integrasi

Kalender jadwal ditampilkan sebagai panel mandiri dalam form pengajuan, terpisah dari pemilihan periode. Default menunjukkan belum terhubung, bukan kalender kosong yang menyiratkan tersedia. Admin read-only memakai panel daftar/statistik baru; cabang prototipe tidak diaktifkan. Integrasi `MainApp`/API baru memerlukan koordinasi terpisah.
