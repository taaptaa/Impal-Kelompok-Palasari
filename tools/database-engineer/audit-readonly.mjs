// SELECT/PRAGMA read-only only: never import openDb, seed, or a migration runner.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const quote = name => '"' + name.replaceAll('"', '""') + '"';

export function inspectDatabase(database) {
  if (!database || !existsSync(database)) throw Error('File database existing eksplisit wajib diberikan.');
  const target = realpathSync(resolve(database));
  const db = new DatabaseSync(target, { readOnly: true });
  try {
    db.exec('PRAGMA query_only=ON; BEGIN');
    const schema = db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    const tables = schema.filter(row => row.type === 'table');
    const fingerprints = Object.fromEntries(tables.map(({ name }) => {
      const rows = db.prepare(`SELECT * FROM ${quote(name)} ORDER BY rowid`).all();
      return [name, { count: rows.length, sha256: hash(rows) }];
    }));
    const checks = {
      invalidInventory: db.prepare("SELECT id_barang FROM barang WHERE id_barang IS NULL OR typeof(id_barang)<>'integer' OR typeof(stok_total)<>'integer' OR stok_total<0").all(),
      invalidDetails: db.prepare("SELECT id_peminjaman,id_barang FROM detail_barang WHERE typeof(jumlah)<>'integer' OR jumlah<=0").all(),
      headerWithoutDetail: db.prepare('SELECT p.id_peminjaman FROM peminjaman p WHERE NOT EXISTS(SELECT 1 FROM detail_barang d WHERE d.id_peminjaman=p.id_peminjaman) AND NOT EXISTS(SELECT 1 FROM detail_ruangan r WHERE r.id_peminjaman=p.id_peminjaman)').all(),
      invalidDates: db.prepare('SELECT id_peminjaman FROM peminjaman WHERE julianday(waktu_mulai) IS NULL OR julianday(waktu_selesai) IS NULL OR julianday(waktu_selesai)<=julianday(waktu_mulai)').all(),
      facilitiesExceedTotal: db.prepare('SELECT f.id_barang,SUM(f.jumlah) AS allocated,b.stok_total FROM fasilitas_ruangan f JOIN barang b USING(id_barang) GROUP BY f.id_barang HAVING SUM(f.jumlah)>b.stok_total').all(),
      returnWithoutRequestedItem: db.prepare('SELECT dp.id_pengembalian,dp.id_barang FROM detail_pengembalian dp JOIN pengembalian p USING(id_pengembalian) LEFT JOIN detail_barang d ON d.id_peminjaman=p.id_peminjaman AND d.id_barang=dp.id_barang WHERE d.id_barang IS NULL').all(),
      returnQuantityMismatch: db.prepare('SELECT dp.id_pengembalian,dp.id_barang FROM detail_pengembalian dp JOIN pengembalian p USING(id_pengembalian) JOIN detail_barang d ON d.id_peminjaman=p.id_peminjaman AND d.id_barang=dp.id_barang WHERE dp.jumlah_baik+dp.jumlah_rusak+dp.jumlah_hilang<>d.jumlah').all(),
    };
    const columns = db.prepare('PRAGMA table_info(peminjaman)').all();
    const report = {
      capturedAt: new Date().toISOString(), target, node: process.version,
      dbPathConfiguredInAuditProcess: Boolean(process.env.DB_PATH),
      dbPathMatchesTarget: process.env.DB_PATH ? existsSync(process.env.DB_PATH) && realpathSync(resolve(process.env.DB_PATH)) === target : null,
      mode: 'readOnly:true; query_only=ON; consistent read transaction; no openDb',
      sqlite: db.prepare('SELECT sqlite_version() AS version').get().version,
      integrity: db.prepare('PRAGMA integrity_check').all(),
      foreignKeyViolations: db.prepare('PRAGMA foreign_key_check').all(),
      connectionForeignKeys: db.prepare('PRAGMA foreign_keys').get().foreign_keys,
      journalMode: db.prepare('PRAGMA journal_mode').get().journal_mode,
      schema, peminjamanColumns: columns, fingerprints,
      roles: db.prepare('SELECT peran,aktif,COUNT(*) AS count FROM pengguna GROUP BY peran,aktif ORDER BY peran').all(),
      inventory: db.prepare('SELECT * FROM barang ORDER BY id_barang').all(),
      loanStatusCounts: db.prepare('SELECT status,COUNT(*) AS count FROM peminjaman GROUP BY status').all(),
      loanSchedule: db.prepare('SELECT id_peminjaman,waktu_mulai,waktu_selesai,status FROM peminjaman ORDER BY id_peminjaman').all(),
      details: db.prepare('SELECT * FROM detail_barang ORDER BY id_peminjaman,id_barang').all(),
      rooms: db.prepare('SELECT * FROM ruangan ORDER BY id_ruangan').all(),
      facilities: db.prepare('SELECT * FROM fasilitas_ruangan ORDER BY id_ruangan,id_barang').all(),
      checks,
    };
    db.exec('ROLLBACK');
    return report;
  } finally { db.close(); }
}

export function comparePriorMigration(database, prior) {
  if (!existsSync(database) || !existsSync(prior)) throw Error('Kedua file existing wajib diberikan.');
  const current = new DatabaseSync(database, { readOnly: true });
  const old = new DatabaseSync(prior, { readOnly: true });
  try {
    current.exec('PRAGMA query_only=ON; BEGIN'); old.exec('PRAGMA query_only=ON; BEGIN');
    const schema = db => db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    const oldSchema = schema(old), currentSchema = schema(current);
    const oldColumns = old.prepare('PRAGMA table_info(peminjaman)').all().map(row => row.name);
    const currentColumns = current.prepare('PRAGMA table_info(peminjaman)').all().map(row => row.name);
    const tables = {};
    for (const { name } of oldSchema.filter(row => row.type === 'table')) {
      const before = old.prepare(`SELECT rowid AS _audit_rowid_,* FROM ${quote(name)} ORDER BY rowid`).all();
      const after = current.prepare(`SELECT rowid AS _audit_rowid_,* FROM ${quote(name)} ORDER BY rowid`).all();
      const byRowid = new Map(after.map(row => [row._audit_rowid_, row]));
      let missing = 0, changed = 0;
      for (const row of before) {
        const updated = byRowid.get(row._audit_rowid_);
        if (!updated) missing++;
        else if (Object.entries(row).some(([key, value]) => updated[key] !== value)) changed++;
      }
      tables[name] = { before: before.length, current: after.length, missingLegacyRows: missing, changedLegacyRows: changed, addedRowids: after.filter(row => !before.some(priorRow => priorRow._audit_rowid_ === row._audit_rowid_)).length };
    }
    const exclude = rows => rows.filter(row => row.name !== 'peminjaman' && row.name !== 'peminjaman_request_unique');
    return {
      prior: realpathSync(prior), mode: 'two read-only snapshots; no restore',
      oldColumns, currentColumns,
      exactlyThreeColumnsAppended: JSON.stringify(currentColumns) === JSON.stringify([...oldColumns, 'dibuat_pada', 'request_key', 'request_hash']),
      otherSchemaObjectsUnchanged: JSON.stringify(exclude(oldSchema)) === JSON.stringify(exclude(currentSchema)),
      requestIndex: current.prepare("SELECT sql FROM sqlite_schema WHERE name='peminjaman_request_unique'").get()?.sql,
      tables,
    };
  } finally { current.close(); old.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const report = inspectDatabase(value('--database'));
    if (value('--prior')) report.priorMigration = comparePriorMigration(value('--database'), value('--prior'));
    const output = value('--out');
    if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
