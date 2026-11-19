// TEST-ONLY reference algorithm. Not imported by backend, frontend, or startup.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename, relative, isAbsolute } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { quote } from '../../tools/database-engineer/audit-readonly.mjs';

export const NOW = Date.parse('2030-01-01T00:00:00.000Z');
export const START = NOW + 10000, END = NOW + 20000;
export const draft = readFileSync(new URL('../../database/proposals/002-availability.DRAFT.sql', import.meta.url), 'utf8');
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const fingerprint = db => Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({ name }) => [name, db.prepare(`SELECT * FROM ${quote(name)} ORDER BY rowid`).all()]));

export function disposableFile() {
  const parent = join(process.env.LOCALAPPDATA, 'Temp', 'opencode');
  assert.ok(existsSync(parent));
  const folder = mkdtempSync(join(parent, 'smartlend-db-engineer-'));
  const file = join(folder, 'availability.disposable.sqlite');
  writeFileSync(file, '', { flag: 'wx', mode: 0o600 });
  return file;
}

// Reconstruct a consistent SELECT snapshot, including WAL-visible records.
// The source is opened READ ONLY. All CREATE/INSERT statements run on the new file.
export function copyReadOnly(source, destination) {
  const parent = realpathSync(join(process.env.LOCALAPPDATA, 'Temp', 'opencode'));
  const target = resolve(destination);
  const rel = relative(parent, target);
  assert.ok(!isAbsolute(rel) && !rel.startsWith('..') && /^smartlend-db-engineer-/.test(basename(dirname(target))), 'destination must be isolated test folder');
  assert.equal(basename(target), 'availability.disposable.sqlite');
  assert.equal(realpathSync(target), target, 'destination must not be symlink');
  assert.equal(statSync(target).size, 0, 'destination must be newly created empty test file');
  assert.notEqual(realpathSync(source), target, 'source must never be writable destination');
  const reader = new DatabaseSync(resolve(source), { readOnly: true });
  const writer = new DatabaseSync(target);
  try {
    reader.exec('PRAGMA query_only=ON; BEGIN');
    writer.exec('PRAGMA foreign_keys=OFF; BEGIN');
    const schema = reader.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END,name").all();
    for (const entry of schema.filter(row => row.type === 'table')) writer.exec(entry.sql);
    const rows = fingerprint(reader);
    for (const [name, values] of Object.entries(rows)) {
      for (const row of values) {
        const keys = Object.keys(row);
        writer.prepare(`INSERT INTO ${quote(name)}(${keys.map(quote).join(',')}) VALUES(${keys.map(() => '?').join(',')})`).run(...Object.values(row));
      }
    }
    for (const entry of schema.filter(row => row.type !== 'table')) writer.exec(entry.sql);
    assert.equal(digest(fingerprint(writer)), digest(rows), 'all copied rows preserved (values redacted)');
    assert.deepEqual(writer.prepare('PRAGMA foreign_key_check').all(), []);
    writer.exec('COMMIT; PRAGMA foreign_keys=ON');
    reader.exec('ROLLBACK');
  } finally { writer.close(); reader.close(); }
}

export function fixture() {
  const file = disposableFile();
  const db = new DatabaseSync(file);
  db.testOnlyFile = file;
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
  db.exec(readFileSync(new URL('../../database/schema.sqlite.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../../database/migrations/001-loan-submission.sql', import.meta.url), 'utf8'));
  for (const [id, role] of [[1, 'mahasiswa'], [2, 'admin'], [3, 'petugas']]) db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(id, 'SINTETIS ' + role, role + '@invalid.test', 'NOT-A-LOGIN-HASH', role);
  db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(91, 'SYN-91', 'SINTETIS A', 'portabel', 'unit', 10);
  db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(92, 'SYN-92', 'SINTETIS B', 'portabel', 'unit', 10);
  db.prepare('INSERT INTO ruangan VALUES(?,?,?,?,?,?)').run(81, 'SYN-81', 'RUANG SINTETIS', 20, 'LOKASI SINTETIS', 'aktif');
  db.exec('BEGIN IMMEDIATE'); db.exec(draft); db.exec('COMMIT');
  return db;
}

export function operation(db, action, loan = null, key = randomUUID(), actor = 2, payload = {}) {
  const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return Number(db.prepare(`INSERT INTO audit_operasi(id_pelaku,request_key,request_hash,aksi,id_peminjaman,dicatat_ms,alasan,sebelum_json,sesudah_json)
    VALUES(?,?,?,?,?,?,'SINTETIS — disposable only','{}',?)`).run(actor, key, hash, action, loan, NOW, JSON.stringify(payload)).lastInsertRowid);
}

export function verify(db, item = 91, good = 10, { facilities = 0, damaged = 0, lost = 0, unknown = 0, state = 'terverifikasi', op } = {}) {
  const revision = db.prepare('SELECT COALESCE(MAX(revisi),0)+1 AS n FROM verifikasi_stok_barang WHERE id_barang=?').get(item).n;
  const total = db.prepare('SELECT stok_total FROM barang WHERE id_barang=?').get(item).stok_total;
  return Number(db.prepare(`INSERT INTO verifikasi_stok_barang(id_barang,revisi,id_operasi,status_verifikasi,stok_total_snapshot,layak_pinjam,fasilitas,rusak,hilang,nonpinjam,belum_verifikasi)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(item, revision, op ?? operation(db, 'verifikasi_stok'), state, total, good, facilities, damaged, lost, total - good - facilities - damaged - lost - unknown, unknown).lastInsertRowid);
}

export function request(db, id, items = [[91, 1]], start = START, end = END, room = false) {
  db.prepare(`INSERT INTO peminjaman(id_peminjaman,kode_peminjaman,id_peminjam,waktu_mulai,waktu_selesai,keperluan,status)
    VALUES(?,?,1,?,?,'SINTETIS','menunggu')`).run(id, 'SYN-' + id, new Date(start).toISOString(), new Date(end).toISOString());
  for (const [item, qty] of items) db.prepare('INSERT INTO detail_barang VALUES(?,?,?)').run(id, item, qty);
  if (room) db.prepare('INSERT INTO detail_ruangan VALUES(?,81,10)').run(id);
}

export function availability(db, item, start, end, now = NOW) {
  assert.ok(Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= now && end > start, 'invalid future interval');
  const v = db.prepare('SELECT * FROM verifikasi_stok_barang WHERE id_barang=? ORDER BY revisi DESC LIMIT 1').get(item);
  if (!v || v.status_verifikasi !== 'terverifikasi') return { available: null, reason: 'UNVERIFIED_STOCK' };
  const b = db.prepare('SELECT stok_total FROM barang WHERE id_barang=?').get(item);
  const facilities = db.prepare('SELECT COALESCE(SUM(jumlah),0) AS n FROM fasilitas_ruangan WHERE id_barang=?').get(item).n;
  if (v.stok_total_snapshot !== b.stok_total || facilities !== v.fasilitas) return { available: null, reason: 'RECONCILIATION_REQUIRED' };
  const missing = db.prepare(`SELECT 1 FROM detail_barang d JOIN peminjaman p USING(id_peminjaman)
    LEFT JOIN alokasi_barang a ON a.id_peminjaman=d.id_peminjaman AND a.id_barang=d.id_barang
    WHERE d.id_barang=? AND p.status IN ('disetujui','dipinjam') AND (a.id_barang IS NULL OR
      (a.dilepas_ms IS NOT NULL AND (a.diambil_ms IS NULL OR
        COALESCE((SELECT SUM(r.baik+r.rusak+r.hilang) FROM penerimaan_barang r
          WHERE r.id_peminjaman=d.id_peminjaman AND r.id_barang=d.id_barang),0)<>d.jumlah))) LIMIT 1`).get(item);
  if (missing) return { available: null, reason: 'UNRECONCILED_LEGACY_ALLOCATION' };
  const allocations = db.prepare(`SELECT a.*,d.jumlah,p.status,
    COALESCE((SELECT SUM(r.baik+r.rusak+r.hilang) FROM penerimaan_barang r
      WHERE r.id_peminjaman=a.id_peminjaman AND r.id_barang=a.id_barang),0) AS returned
    FROM alokasi_barang a JOIN detail_barang d USING(id_peminjaman,id_barang)
    JOIN peminjaman p USING(id_peminjaman) WHERE a.id_barang=? AND a.dilepas_ms IS NULL`).all(item);
  const events = new Map([[start, 0], [end, 0]]);
  for (const a of allocations) {
    if (!['disetujui', 'dipinjam'].includes(a.status) || (a.status === 'dipinjam' && a.diambil_ms === null)) return { available: null, reason: 'ALLOCATION_STATE_MISMATCH' };
    const qty = a.diambil_ms === null ? a.jumlah : a.jumlah - a.returned;
    assert.ok(qty >= 0, 'over-return');
    const left = Math.max(start, a.diambil_ms === null ? a.mulai_ms : Math.min(a.mulai_ms, a.diambil_ms));
    const right = a.diambil_ms === null ? Math.min(end, a.selesai_ms) : end;
    if (left < right && qty) {
      events.set(left, (events.get(left) ?? 0) + qty);
      events.set(right, (events.get(right) ?? 0) - qty);
    }
  }
  let load = 0, peak = 0;
  for (const [, delta] of [...events].sort(([a], [b]) => a - b)) { load += delta; peak = Math.max(peak, load); }
  if (peak > v.layak_pinjam) return { available: null, reason: 'CAPACITY_DEFICIT' };
  return { available: v.layak_pinjam - peak, peak, verification: v.id_verifikasi };
}

export function approve(db, id, key = randomUUID()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db.prepare('SELECT id_operasi,id_peminjaman,aksi FROM audit_operasi WHERE id_pelaku=2 AND request_key=?').get(key);
    if (existing) {
      assert.ok(existing.id_peminjaman === id && existing.aksi === 'setujui', 'idempotency conflict');
      db.exec('COMMIT'); return { replayed: true };
    }
    const p = db.prepare('SELECT * FROM peminjaman WHERE id_peminjaman=?').get(id);
    assert.equal(p.status, 'menunggu');
    const start = Date.parse(p.waktu_mulai), end = Date.parse(p.waktu_selesai);
    const items = db.prepare('SELECT * FROM detail_barang WHERE id_peminjaman=? ORDER BY id_barang').all(id);
    const room = db.prepare('SELECT d.*,r.kapasitas,r.status_operasional FROM detail_ruangan d JOIN ruangan r USING(id_ruangan) WHERE id_peminjaman=?').get(id);
    assert.ok(items.length || room, 'empty request');
    const plans = items.map(d => {
      assert.ok(Number.isSafeInteger(d.jumlah) && d.jumlah > 0);
      const a = availability(db, d.id_barang, start, end);
      assert.ok(a.available !== null && a.available >= d.jumlah, a.reason ?? 'insufficient capacity');
      return { ...d, ...a };
    });
    if (room) {
      assert.equal(room.status_operasional, 'aktif');
      assert.ok(room.jumlah_peserta <= room.kapasitas);
      const unreconciled = db.prepare(`SELECT 1 FROM detail_ruangan d JOIN peminjaman p USING(id_peminjaman)
        LEFT JOIN alokasi_ruangan a USING(id_peminjaman) WHERE d.id_ruangan=? AND p.status IN ('disetujui','dipinjam')
        AND (a.id_peminjaman IS NULL OR a.dilepas_ms IS NOT NULL)`).get(room.id_ruangan);
      assert.ok(!unreconciled, 'unreconciled room');
      const conflict = db.prepare(`SELECT 1 FROM alokasi_ruangan a JOIN detail_ruangan d USING(id_peminjaman)
        WHERE d.id_ruangan=? AND a.dilepas_ms IS NULL AND
        ((a.diambil_ms IS NULL AND a.mulai_ms<? AND ?<a.selesai_ms) OR
         (a.diambil_ms IS NOT NULL AND min(a.mulai_ms,a.diambil_ms)<?))`).get(room.id_ruangan, end, start, end);
      assert.ok(!conflict, 'room overlap');
    }
    const op = operation(db, 'setujui', id, key, 2, { id });
    for (const d of plans) db.prepare('INSERT INTO alokasi_barang(id_peminjaman,id_barang,id_verifikasi,id_operasi,mulai_ms,selesai_ms) VALUES(?,?,?,?,?,?)').run(id, d.id_barang, d.verification, op, start, end);
    if (room) db.prepare('INSERT INTO alokasi_ruangan(id_peminjaman,id_operasi,mulai_ms,selesai_ms) VALUES(?,?,?,?)').run(id, op, start, end);
    const changed = db.prepare("UPDATE peminjaman SET status='disetujui',id_admin=2 WHERE id_peminjaman=? AND status='menunggu'").run(id);
    assert.equal(changed.changes, 1);
    db.exec('COMMIT'); return { replayed: false };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function receive(db, id, item, good, damaged = 0, lost = 0, key = randomUUID()) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const allocation = db.prepare('SELECT a.*,d.jumlah FROM alokasi_barang a JOIN detail_barang d USING(id_peminjaman,id_barang) WHERE id_peminjaman=? AND id_barang=?').get(id, item);
    assert.ok(allocation && allocation.diambil_ms !== null && allocation.dilepas_ms === null, 'not checked out');
    const received = db.prepare('SELECT COALESCE(SUM(baik+rusak+hilang),0) AS n FROM penerimaan_barang WHERE id_peminjaman=? AND id_barang=?').get(id, item).n;
    assert.ok(received + good + damaged + lost <= allocation.jumlah, 'over-return');
    const op = operation(db, 'terima_kembali', id, key, 3);
    db.prepare('INSERT INTO penerimaan_barang(id_peminjaman,id_barang,id_operasi,baik,rusak,hilang) VALUES(?,?,?,?,?,?)').run(id, item, op, good, damaged, lost);
    if (damaged || lost) {
      const v = db.prepare('SELECT * FROM verifikasi_stok_barang WHERE id_barang=? ORDER BY revisi DESC LIMIT 1').get(item);
      verify(db, item, v.layak_pinjam - damaged - lost, { facilities: v.fasilitas, damaged: v.rusak + damaged, lost: v.hilang + lost, op });
    }
    // A real implementation must check all package items/room before closing header.
    if (received + good + damaged + lost === allocation.jumlah) db.prepare('UPDATE alokasi_barang SET dilepas_ms=? WHERE id_peminjaman=? AND id_barang=?').run(NOW, id, item);
    const outstanding = db.prepare('SELECT 1 FROM alokasi_barang WHERE id_peminjaman=? AND dilepas_ms IS NULL').get(id);
    const roomOutstanding = db.prepare('SELECT 1 FROM alokasi_ruangan WHERE id_peminjaman=? AND dilepas_ms IS NULL').get(id);
    if (!outstanding && !roomOutstanding) db.prepare("UPDATE peminjaman SET status='selesai' WHERE id_peminjaman=?").run(id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
