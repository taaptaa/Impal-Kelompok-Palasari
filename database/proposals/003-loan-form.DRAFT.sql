-- DRAFT: only applied explicitly by tests to isolated databases. Never startup/apply on user DB.
-- Independent of availability 002; existing 11-column peminjaman stays unchanged.
CREATE TABLE informasi_pengajuan (
  id_peminjaman INTEGER PRIMARY KEY NOT NULL REFERENCES peminjaman(id_peminjaman),
  telepon TEXT NOT NULL CHECK(length(telepon) BETWEEN 8 AND 24),
  identitas_peminjam TEXT NOT NULL CHECK(length(identitas_peminjam) <= 40),
  unit_peminjam TEXT NOT NULL CHECK(length(unit_peminjam) <= 120),
  nama_kegiatan TEXT NOT NULL CHECK(length(nama_kegiatan) BETWEEN 1 AND 120),
  lokasi_kegiatan TEXT NOT NULL CHECK(length(lokasi_kegiatan) BETWEEN 1 AND 160),
  deskripsi_kegiatan TEXT NOT NULL CHECK(length(deskripsi_kegiatan) <= 1000),
  versi_informasi TEXT NOT NULL CHECK(versi_informasi = 'submission-info-v1'),
  dikonfirmasi_pada TEXT NOT NULL CHECK(length(dikonfirmasi_pada) = 24)
) STRICT;
