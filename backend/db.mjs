import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export const root=fileURLToPath(new URL('../',import.meta.url));
export function openDb(path=process.env.DB_PATH) {
  if (!path) throw new Error('DB_PATH wajib diisi secara eksplisit; jangan gunakan database arsip/demo tanpa izin.');
  const db=new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  db.exec(readFileSync(root+'database/schema.sqlite.sql','utf8'));
  return db;
}
