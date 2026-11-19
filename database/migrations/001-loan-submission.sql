-- Eksplisit saja: tidak dipanggil openDb/server. Kolom lama dan record lama dipertahankan.
ALTER TABLE peminjaman ADD COLUMN dibuat_pada TEXT;
ALTER TABLE peminjaman ADD COLUMN request_key TEXT CHECK (request_key IS NULL OR length(request_key) = 36);
ALTER TABLE peminjaman ADD COLUMN request_hash TEXT CHECK (request_hash IS NULL OR length(request_hash) = 64);
CREATE UNIQUE INDEX peminjaman_request_unique ON peminjaman(id_peminjam, request_key) WHERE request_key IS NOT NULL;
