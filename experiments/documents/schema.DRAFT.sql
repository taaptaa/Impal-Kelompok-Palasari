-- Isolated tests only. Not part of migration 003 or server startup.
CREATE TABLE dokumen_pengajuan (
  id TEXT PRIMARY KEY NOT NULL,
  id_peminjaman INTEGER NOT NULL REFERENCES peminjaman(id_peminjaman),
  id_pengunggah INTEGER NOT NULL REFERENCES pengguna(id_pengguna),
  request_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  nama_tampilan TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes>0),
  sha256 TEXT NOT NULL CHECK(length(sha256)=64),
  diunggah_ms INTEGER NOT NULL,
  kedaluwarsa_ms INTEGER NOT NULL,
  policy_version TEXT NOT NULL,
  scanner_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('stored','deleted')),
  UNIQUE(id_pengunggah,request_key)
) STRICT;
