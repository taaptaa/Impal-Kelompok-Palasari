import { readFileSync } from 'node:fs';

const base = ['id_peminjaman','kode_peminjaman','id_peminjam','id_admin','waktu_mulai','waktu_selesai','keperluan','status'];
export function loanSchemaState(db) {
  const columns = db.prepare('PRAGMA table_info(peminjaman)').all().map(row=>row.name);
  if (JSON.stringify(columns) === JSON.stringify(base)) return 'pending';
  const index = db.prepare("SELECT sql FROM sqlite_schema WHERE name='peminjaman_request_unique'").get()?.sql;
  if (JSON.stringify(columns) === JSON.stringify([...base,'dibuat_pada','request_key','request_hash']) && index?.includes('UNIQUE INDEX') && index.includes('(id_peminjam, request_key)')) return 'ready';
  throw Error('Schema pengajuan berbeda dari profil yang didukung; perlu audit manual.');
}

// Pemanggil wajib mengelola transaksi dan backup. Tidak ada migrasi saat startup.
export function migrateLoanSchema(db) {
  if (loanSchemaState(db) === 'ready') return false;
  db.exec(readFileSync(new URL('../database/migrations/001-loan-submission.sql',import.meta.url),'utf8'));
  if (loanSchemaState(db) !== 'ready') throw Error('Verifikasi schema pengajuan gagal.');
  return true;
}
