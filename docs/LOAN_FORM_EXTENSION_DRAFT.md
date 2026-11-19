# Kontrak form pengajuan tambahan v1 — DRAFT aktivasi

> Pembaruan 19 November 2026: migrasi003 kini diterapkan setelah persetujuan spesifik dan backup/restore. Submit target ditunda pemilik. Lihat [hasil aktivasi terbaru](SPRINT2_FORM_ACTIVATION_REPORT.md); uraian status belum diterapkan di bawah adalah histori tahap DRAFT.

Implementasi dan tes terisolasi tersedia; **belum diterapkan pada database pengguna**. Ini bukan persetujuan migrasi, kebijakan kampus, atau aktivasi approval. Baca hasil aktual pada [laporan checkout](SPRINT2_CHECKOUT_FINAL_REPORT.md).

## Kontrak existing tetap

POST `/api/loans` tetap student-only, cookie sesi, Origin exact, JSON, CSRF dan UUID v4 Idempotency-Key. `items`, `startsAt`, `endsAt`, `reason` tetap bermakna sama. Status awal `menunggu`; stok tidak dikurangi. Payload lama, termasuk hash kanonik/replay, tidak diubah ketika `details` tidak ada. Nomor, peminjam, role dan waktu commit berasal dari server.

## Capability endpoint baru

GET `/api/loans/form-options` hanya untuk sesi Mahasiswa. Anonim 401, role lain 403. Endpoint ini tidak membuat sesi/tabel atau mengubah data.

Respons: `contract:'loan-form-v1'`, `additionalFields:boolean`, `state:'ready'|'BLOCKED'`, `reason`, `limits`, `acknowledgement:{version,text,legalTerms:false}`, `documents:{state:'BLOCKED'}`.

- Tabel pendamping tidak ada → `additionalFields:false`, `migration_not_approved`.
- Tabel ada tetapi SQL profil tidak cocok → false, `schema_requires_audit`.
- Schema DRAFT tepat tersedia secara eksplisit pada DB tes → true.
- Backend lama yang belum di-restart dapat menghasilkan 404 bagi sesi student: UI mempertahankan **form dasar**, menonaktifkan field tambahan dan tidak mengklaim persistensi tambahan.
- Error selain 404 ditampilkan dengan retry; tidak dianggap dukungan aktif. Draft tambahan yang sudah terisi tidak dibuang/dikirim sebagai payload dasar ketika capability tidak tersedia.

## Payload opsional

```text
details: {
  phone: string,
  borrowerIdentifier: string,
  unit: string,
  activityName: string,
  activityLocation: string,
  activityDescription: string,
  acknowledgement: { version: 'submission-info-v1', accepted: true }
}
```

| Field | Validasi teknis untuk kontrak tes |
| --- | --- |
| phone | Wajib untuk payload lengkap; 8–15 digit, opsional `+` awal; tidak membuktikan pemilik nomor |
| borrowerIdentifier | Opsional, maks. 40 karakter, tanpa newline/tab; bukan verifikasi NIM/NIP institusional |
| unit | Opsional, maks. 120 karakter; isian pengguna, bukan unit terverifikasi |
| activityName | Wajib, trim, 1–120 karakter |
| activityLocation | Wajib, trim, 1–160 karakter |
| activityDescription | Opsional, maks. 1.000 karakter |
| acknowledgement | Boolean true dan versi yang dikenal; divalidasi ulang backend |

Semua enam field teks hadir dalam payload lengkap (opsional dapat string kosong). Batas panjang diperiksa sebagai code point setelah trim; kontrol berbahaya ditolak. Key asing, identitas/role/kategori palsu, nama file/upload, timestamp konfirmasi klien, dan versi konfirmasi asing ditolak. React merender teks sebagai teks, tidak memakai HTML mentah.

`reason` tetap keperluan terpisah, maksimal 150 karakter. Metadata tidak diserialisasi diam-diam ke dalamnya. `details` yang dikirim ke server tanpa schema pendamping menghasilkan 503 tanpa commit parsial, bukan diabaikan.

## Konfirmasi informatif, bukan persetujuan legal

Versi `submission-info-v1`:

> Saya memahami bahwa pengajuan menunggu pemeriksaan Admin, bukan reservasi atau persetujuan, dan ketersediaan barang belum diverifikasi.

Backend menyimpan versi dan timestamp UTC yang ditetapkan server. Aktor terhubung lewat FK pengajuan/pemilik sesi, bukan ID aktor dari input. Replay mengembalikan timestamp awal, bukan mencatat konfirmasi baru. Ini **bukan** dokumen syarat/ketentuan legal, persetujuan kampus, verifikasi kapasitas, atau keputusan Admin. Payload dasar tetap kompatibel tanpa persyaratan baru ini; pencatatan konfirmasi hanya wajib bila `details` digunakan.

## Persistensi dan pembacaan

`database/proposals/003-loan-form.DRAFT.sql` menambahkan hanya tabel pendamping `informasi_pengajuan`, relasi satu-ke-satu FK ke `peminjaman`. Tidak mengubah 11 kolom/header/index 001, pengguna, inventaris, atau proposal 002. Nomor 003 bukan instruksi menjalankan 002 lebih dahulu: desain ini independen dari availability.

Header + seluruh detail barang + informasi tambahan ditulis dalam `BEGIN IMMEDIATE` existing. Canonical hash mencakup seluruh metadata tervalidasi jika hadir. Kegagalan insert metadata menggagalkan seluruh paket/key. Otorisasi diperiksa di bawah write lock; retry/concurrency memakai key sama. Tidak ada network call di dalam transaksi.

Respons POST, GET milik peminjam, serta pembacaan Admin menambahkan `details` hanya jika record benar-benar ada, dengan `acknowledgedAt` dari server. Pengajuan lama seperti SL-1 tetap dapat dibaca tanpa field buatan. Tampilan read-back tersedia di Peminjaman Saya dan detail Admin. Metadata tidak dipublikasikan ke `/api/schedule`. Tidak menyimpan token/credential di tabel pendamping.

## Aktivasi berikutnya — perlu persetujuan terpisah

1. Pemilik menyetujui kebutuhan/maksimal data, telepon wajib atau opsional, definisi NIM/unit, akses dan retensi kontak/kegiatan, serta teks/versi konfirmasi.
2. Audit ulang source/target terkini; koordinasikan seluruh penulis. Jangan mengharapkan jumlah transaksi tetap 1 bila ada aktivitas sah.
3. Siapkan backup konsisten SQLite yang mencakup WAL, di luar frontend/dist; uji restore ke file baru, fingerprint, integritas dan FK. Checkpoint hash bukan pengganti backup.
4. Promosikan DDL DRAFT menjadi migrasi manual resmi dengan preflight, checksum/ledger, penolakan schema parsial, backup/preservasi dan tes legacy. Saat ini **tidak ada runner apply ke sumber** dan tidak ada migrasi startup.
5. Setelah izin target eksplisit, terapkan migrasi aditif secara terkoordinasi; verifikasi seluruh tabel lama identik, lalu restart backend dengan DB_PATH yang sama dan APP_ORIGIN 5175. Restart sendiri **tidak** menambahkan tabel.
6. Uji pengajuan lengkap pada target hanya dengan izin mutasi baru. Sampai itu terbukti, jangan menyebut submit lengkap sumber PASS.

Jika gagal sebelum commit DDL, rollback transaksi. Setelah penggunaan nyata, jangan DROP tabel atau restore backup lama menimpa transaksi baru; nonaktifkan integrasi secara terkoordinasi dan rancang perbaikan forward dengan pemilik.

## Dokumen tetap BLOCKED

Tidak ada input file/upload palsu. Prasyarat: jenis dokumen yang diperlukan dan dasar kebutuhannya; whitelist MIME dan pemeriksaan isi/magic bytes; batas ukuran; nama acak server; penyimpanan privat di luar web root; otorisasi pemilik/Admin pada download; pembatasan request; pemeriksaan file berbahaya; retensi/penghapusan; audit akses dan uji akses langsung/IDOR. Jangan mengumpulkan foto KTP atau dokumen identitas tanpa kebijakan sah. Upload tidak diklaim PASS pada tahap ini.
