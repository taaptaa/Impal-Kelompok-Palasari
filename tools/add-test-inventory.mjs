// CLI lokal saja. Tidak dipanggil aplikasi, tidak seed akun, tidak menjalankan DDL.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from '../backend/db.mjs';

export const additionalInventory = Object.freeze([
  ['UJI-MIC-01', 'Mikrofon Wireless (Uji)', 4],
  ['UJI-KRS-01', 'Kursi Lipat (Uji)', 35],
  ['UJI-MJL-01', 'Meja Lipat (Uji)', 10],
  ['UJI-TRP-01', 'Tripod (Uji)', 6],
  ['UJI-KMR-01', 'Kamera (Uji)', 3],
  ['UJI-KRL-01', 'Kabel Roll (Uji)', 8],
  ['UJI-PTR-01', 'Pointer Presentasi (Uji)', 6],
  ['UJI-WBD-01', 'Whiteboard Portable (Uji)', 4],
  ['UJI-HDX-01', 'Extension HDMI (Uji)', 5],
].map(([kode_barang, nama_barang, stok_total]) => Object.freeze({ kode_barang, nama_barang, jenis: 'portabel', satuan: 'unit', stok_total })));

const originalInventory = [
  ['UJI-PRJ-01', 'Proyektor (Uji)', 3],
  ['UJI-HDM-01', 'Kabel HDMI (Uji)', 5],
  ['UJI-SPK-01', 'Speaker Portable (Uji)', 2],
];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const readInventory = db => db.prepare('SELECT * FROM barang ORDER BY id_barang').all().map(row => ({ ...row }));

export function fingerprint(db) {
  const schema = db.prepare("SELECT name,type,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
  const tables = {};
  for (const table of schema.filter(row => row.type === 'table')) {
    const rows = db.prepare(`SELECT * FROM "${table.name.replaceAll('"', '""')}" ORDER BY rowid`).all();
    tables[table.name] = { count: rows.length, hash: digest(rows) };
  }
  return { schemaHash: digest(schema), tables };
}

function validateIdentity(db) {
  if (db.prepare('PRAGMA integrity_check').all().some(row => row.integrity_check !== 'ok')) throw Error('Integritas SQLite tidak valid.');
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Database memiliki pelanggaran foreign key.');
  const columns = db.prepare('PRAGMA table_info(barang)').all().map(row => row.name);
  if (JSON.stringify(columns) !== JSON.stringify(['id_barang', 'kode_barang', 'nama_barang', 'jenis', 'satuan', 'stok_total'])) throw Error('Schema barang berbeda dari profil yang diaudit. Tidak ada migrasi otomatis.');
  for (const [email, role] of [['mahasiswa@smartlend.test', 'mahasiswa'], ['admin@smartlend.test', 'admin'], ['petugas@smartlend.test', 'petugas']]) {
    if (db.prepare('SELECT peran FROM pengguna WHERE email=?').get(email)?.peran !== role) throw Error('Identitas akun uji tidak sesuai.');
  }
  for (const [code, name, stock] of originalInventory) {
    const row = db.prepare('SELECT * FROM barang WHERE kode_barang=?').get(code);
    if (!row || row.nama_barang !== name || row.stok_total !== stock || row.jenis !== 'portabel' || row.satuan !== 'unit') throw Error('Tiga inventaris awal tidak sesuai baseline. Penambahan dibatalkan.');
  }
  if (new Set(readInventory(db).map(row => row.kode_barang)).size !== readInventory(db).length) throw Error('Kode inventaris sudah duplikat.');
}

function pendingRows(db) {
  return additionalInventory.filter(item => {
    const row = db.prepare('SELECT * FROM barang WHERE kode_barang=?').get(item.kode_barang);
    if (!row) return true;
    if (Object.entries(item).some(([key, value]) => row[key] !== value)) throw Error(`Kode ${item.kode_barang} sudah ada dengan isi berbeda; tidak akan ditimpa.`);
    return false;
  });
}

export function appendInventory(db, expectedFingerprint) {
  db.exec('BEGIN IMMEDIATE');
  try {
    validateIdentity(db);
    const before = fingerprint(db), oldRows = readInventory(db);
    if (expectedFingerprint && digest(before) !== digest(expectedFingerprint)) throw Error('Database berubah sesudah backup; lakukan audit dan backup ulang.');
    const pending = pendingRows(db);
    let nextId = Number(db.prepare('SELECT COALESCE(MAX(id_barang),0) AS id FROM barang').get().id) + 1;
    if (!Number.isSafeInteger(nextId) || nextId < 1 || !Number.isSafeInteger(nextId + pending.length)) throw Error('ID inventaris tidak valid.');
    const insert = db.prepare('INSERT INTO barang(id_barang,kode_barang,nama_barang,jenis,satuan,stok_total) VALUES(?,?,?,?,?,?)');
    for (const item of pending) {
      if (!item.kode_barang.startsWith('UJI-') || !item.nama_barang.endsWith('(Uji)') || !Number.isSafeInteger(item.stok_total) || item.stok_total < 0) throw Error('Manifest data sintetis tidak valid.');
      insert.run(nextId++, item.kode_barang, item.nama_barang, item.jenis, item.satuan, item.stok_total);
    }
    const after = fingerprint(db), rows = readInventory(db);
    if (before.schemaHash !== after.schemaHash) throw Error('Schema berubah; rollback.');
    for (const [table, value] of Object.entries(before.tables)) {
      if (table !== 'barang' && digest(after.tables[table]) !== digest(value)) throw Error('Data non-inventaris berubah; rollback.');
    }
    for (const row of oldRows) if (digest(rows.find(item => item.id_barang === row.id_barang)) !== digest(row)) throw Error('Record inventaris lama berubah; rollback.');
    if (rows.length !== oldRows.length + pending.length) throw Error('Jumlah hasil insert tidak sesuai; rollback.');
    db.exec('COMMIT');
    return { inserted: pending.length, skipped: additionalInventory.length - pending.length, inventory: rows, protectedDataUnchanged: true };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function extendDisposableInventory({ database, apply = false, confirmation }) {
  if (!database) throw Error('Path database eksplisit wajib diberikan. DB_PATH tidak akan diganti.');
  const target = resolve(database), allowed = resolve(root, 'database/disposable');
  if (dirname(target) !== allowed || !/^accounts-[a-zA-Z0-9-]+\.disposable\.sqlite$/.test(basename(target)) || !existsSync(target)) throw Error('Target harus file SQLite existing berlabel disposable dalam database/disposable.');
  if (realpathSync(allowed) !== allowed || realpathSync(target) !== target) throw Error('Path symlink/junction tidak diizinkan.');
  const source = new DatabaseSync(target, { readOnly: true });
  let before, inventory, backupPath;
  try {
    validateIdentity(source);
    before = fingerprint(source);
    inventory = readInventory(source);
    const pending = pendingRows(source);
    if (!apply) return { mode: 'read-only audit', target, before, inventory, proposed: pending };
    if (confirmation !== 'ADD_SYNTHETIC_INVENTORY') throw Error('Konfirmasi ADD_SYNTHETIC_INVENTORY wajib diberikan.');
    if (!pending.length) return { target, inserted: 0, skipped: additionalInventory.length, inventory, protectedDataUnchanged: true, backup: null };
    const backups = resolve(root, 'database/backups');
    mkdirSync(backups, { recursive: true });
    if (realpathSync(backups) !== backups) throw Error('Direktori backup tidak boleh berupa symlink/junction.');
    backupPath = resolve(backups, `inventory-before-${Date.now()}-${randomUUID()}.sqlite`);
    if (existsSync(backupPath)) throw Error('File backup sudah ada; tidak ditimpa.');
    // Snapshot SQLite konsisten yang juga mencakup WAL; bukan copy file .sqlite mentah.
    source.prepare('VACUUM main INTO ?').run(backupPath);
    chmodSync(backupPath, 0o600);
    const backup = new DatabaseSync(backupPath, { readOnly: true });
    try {
      if (digest(fingerprint(backup)) !== digest(before)) throw Error('Verifikasi snapshot backup gagal.');
    } finally { backup.close(); }
    writeFileSync(backupPath + '.audit.json', JSON.stringify({ target, before, inventory, proposed: pending }, null, 2), { flag: 'wx', mode: 0o600 });
  } finally { source.close(); }
  const writer = new DatabaseSync(target); // tidak openDb, tidak seed, tidak DDL
  try {
    writer.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const result = appendInventory(writer, before);
    return { target, backup: backupPath, ...result };
  } finally { writer.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2), value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const result = extendDisposableInventory({ database: value('--database') || process.env.DB_PATH, apply: args.includes('--apply'), confirmation: value('--confirm') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
