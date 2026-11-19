-- DESIGN PROTOTYPE ONLY. NOT APPROVED. Never load from openDb/server/startup.
-- Tests run this only on newly created disposable databases, never on the source.
-- Requires SQLite >= 3.37 (STRICT), foreign_keys=ON, explicit transaction.
-- No ALTER, backfill, seed, stock UPDATE, or changes to the 001 loan profile.
-- Aggregate capacity/overlap checks REQUIRE the transaction contract in
-- docs/DATABASE_BACKEND_CONTRACT_SPRINT2.md; this DDL alone is NOT an approval engine.

CREATE TABLE audit_operasi (
    id_operasi INTEGER PRIMARY KEY CHECK (id_operasi > 0),
    id_pelaku INTEGER NOT NULL REFERENCES pengguna(id_pengguna),
    request_key TEXT NOT NULL CHECK (length(request_key) = 36),
    request_hash TEXT NOT NULL CHECK (length(request_hash) = 64),
    aksi TEXT NOT NULL CHECK (aksi IN ('verifikasi_stok','ubah_kapasitas',
        'setujui','tolak','batalkan','serah_terima','terima_kembali','ubah_ruangan')),
    id_peminjaman INTEGER REFERENCES peminjaman(id_peminjaman),
    id_ruangan INTEGER REFERENCES ruangan(id_ruangan),
    dicatat_ms INTEGER NOT NULL CHECK (dicatat_ms BETWEEN 0 AND 253402300799999),
    alasan TEXT NOT NULL CHECK (length(trim(alasan)) BETWEEN 1 AND 1000),
    sebelum_json TEXT NOT NULL CHECK (json_valid(sebelum_json)),
    sesudah_json TEXT NOT NULL CHECK (json_valid(sesudah_json)),
    UNIQUE (id_pelaku, request_key)
) STRICT;

-- Absolute, reconciled snapshots, NOT deltas to subtract repeatedly.
-- layak_pinjam INCLUDES good units currently checked out/reserved.
-- fasilitas, rusak, hilang, nonpinjam and belum_verifikasi are disjoint buckets.
CREATE TABLE verifikasi_stok_barang (
    id_verifikasi INTEGER PRIMARY KEY CHECK (id_verifikasi > 0),
    id_barang INTEGER NOT NULL REFERENCES barang(id_barang),
    revisi INTEGER NOT NULL CHECK (revisi > 0),
    id_operasi INTEGER NOT NULL REFERENCES audit_operasi(id_operasi),
    status_verifikasi TEXT NOT NULL CHECK (status_verifikasi IN ('terverifikasi','perlu_rekonsiliasi')),
    stok_total_snapshot INTEGER NOT NULL CHECK (stok_total_snapshot BETWEEN 0 AND 2147483647),
    layak_pinjam INTEGER NOT NULL CHECK (layak_pinjam BETWEEN 0 AND 2147483647),
    fasilitas INTEGER NOT NULL CHECK (fasilitas BETWEEN 0 AND 2147483647),
    rusak INTEGER NOT NULL CHECK (rusak BETWEEN 0 AND 2147483647),
    hilang INTEGER NOT NULL CHECK (hilang BETWEEN 0 AND 2147483647),
    nonpinjam INTEGER NOT NULL CHECK (nonpinjam BETWEEN 0 AND 2147483647),
    belum_verifikasi INTEGER NOT NULL CHECK (belum_verifikasi BETWEEN 0 AND 2147483647),
    UNIQUE (id_barang, revisi),
    UNIQUE (id_verifikasi, id_barang),
    UNIQUE (id_operasi, id_barang),
    CHECK (stok_total_snapshot = layak_pinjam + fasilitas + rusak + hilang + nonpinjam + belum_verifikasi),
    CHECK (status_verifikasi <> 'terverifikasi' OR belum_verifikasi = 0)
) STRICT;

-- One allocation per requested item. Quantity comes from detail_barang.jumlah;
-- Backend MUST freeze approved detail quantity and schedule (no rescheduling MVP).
CREATE TABLE alokasi_barang (
    id_peminjaman INTEGER NOT NULL,
    id_barang INTEGER NOT NULL,
    id_verifikasi INTEGER NOT NULL,
    id_operasi INTEGER NOT NULL REFERENCES audit_operasi(id_operasi),
    mulai_ms INTEGER NOT NULL CHECK (mulai_ms BETWEEN 0 AND 253402300799999),
    selesai_ms INTEGER NOT NULL CHECK (selesai_ms BETWEEN 0 AND 253402300799999),
    diambil_ms INTEGER CHECK (diambil_ms BETWEEN 0 AND 253402300799999),
    dilepas_ms INTEGER CHECK (dilepas_ms BETWEEN 0 AND 253402300799999),
    PRIMARY KEY (id_peminjaman, id_barang),
    FOREIGN KEY (id_peminjaman, id_barang) REFERENCES detail_barang(id_peminjaman, id_barang),
    FOREIGN KEY (id_verifikasi, id_barang) REFERENCES verifikasi_stok_barang(id_verifikasi, id_barang),
    CHECK (selesai_ms > mulai_ms),
    CHECK (dilepas_ms IS NULL OR diambil_ms IS NULL OR dilepas_ms >= diambil_ms)
) STRICT;

-- Room identity/participants derive from detail_ruangan; exclusively one booking.
CREATE TABLE alokasi_ruangan (
    id_peminjaman INTEGER PRIMARY KEY REFERENCES detail_ruangan(id_peminjaman),
    id_operasi INTEGER NOT NULL REFERENCES audit_operasi(id_operasi),
    mulai_ms INTEGER NOT NULL CHECK (mulai_ms BETWEEN 0 AND 253402300799999),
    selesai_ms INTEGER NOT NULL CHECK (selesai_ms BETWEEN 0 AND 253402300799999),
    diambil_ms INTEGER CHECK (diambil_ms BETWEEN 0 AND 253402300799999),
    dilepas_ms INTEGER CHECK (dilepas_ms BETWEEN 0 AND 253402300799999),
    CHECK (selesai_ms > mulai_ms),
    CHECK (dilepas_ms IS NULL OR diambil_ms IS NULL OR dilepas_ms >= diambil_ms)
) STRICT;

-- Per-item partial receipts, absent from the legacy one-return-per-loan schema.
-- Damaged/lost units settle custody but do NOT restore lending capacity.
CREATE TABLE penerimaan_barang (
    id_penerimaan INTEGER PRIMARY KEY CHECK (id_penerimaan > 0),
    id_peminjaman INTEGER NOT NULL,
    id_barang INTEGER NOT NULL,
    id_operasi INTEGER NOT NULL REFERENCES audit_operasi(id_operasi),
    baik INTEGER NOT NULL CHECK (baik BETWEEN 0 AND 2147483647),
    rusak INTEGER NOT NULL CHECK (rusak BETWEEN 0 AND 2147483647),
    hilang INTEGER NOT NULL CHECK (hilang BETWEEN 0 AND 2147483647),
    FOREIGN KEY (id_peminjaman, id_barang) REFERENCES alokasi_barang(id_peminjaman, id_barang),
    UNIQUE (id_operasi, id_peminjaman, id_barang),
    CHECK (baik + rusak + hilang > 0)
) STRICT;

CREATE INDEX alokasi_barang_window ON alokasi_barang(id_barang, mulai_ms, selesai_ms)
    WHERE dilepas_ms IS NULL;
CREATE INDEX penerimaan_barang_allocation ON penerimaan_barang(id_peminjaman, id_barang);
CREATE INDEX detail_ruangan_resource ON detail_ruangan(id_ruangan, id_peminjaman);
CREATE INDEX detail_barang_resource ON detail_barang(id_barang, id_peminjaman);
CREATE INDEX audit_operasi_loan ON audit_operasi(id_peminjaman, id_operasi);
CREATE INDEX audit_operasi_room ON audit_operasi(id_ruangan, id_operasi);

-- Only NEW history tables are protected here, not legacy business tables.
CREATE TRIGGER audit_operasi_no_update BEFORE UPDATE ON audit_operasi
BEGIN SELECT RAISE(ABORT, 'audit append-only'); END;
CREATE TRIGGER audit_operasi_no_delete BEFORE DELETE ON audit_operasi
BEGIN SELECT RAISE(ABORT, 'audit append-only'); END;
CREATE TRIGGER verifikasi_stok_no_update BEFORE UPDATE ON verifikasi_stok_barang
BEGIN SELECT RAISE(ABORT, 'verification append-only'); END;
CREATE TRIGGER verifikasi_stok_no_delete BEFORE DELETE ON verifikasi_stok_barang
BEGIN SELECT RAISE(ABORT, 'verification append-only'); END;
CREATE TRIGGER penerimaan_barang_no_update BEFORE UPDATE ON penerimaan_barang
BEGIN SELECT RAISE(ABORT, 'receipt append-only'); END;
CREATE TRIGGER penerimaan_barang_no_delete BEFORE DELETE ON penerimaan_barang
BEGIN SELECT RAISE(ABORT, 'receipt append-only'); END;
