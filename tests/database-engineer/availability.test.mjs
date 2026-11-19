import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture, verify, request, approve, availability, receive, operation,
  draft, fingerprint, digest, disposableFile, copyReadOnly, NOW, START, END } from './prototype.mjs';
import { inspectDatabase } from '../../tools/database-engineer/audit-readonly.mjs';
import { loanSchemaState } from '../../backend/loan-schema.mjs';
import { LoanService } from '../../backend/loans.mjs';

function use(run) { const db = fixture(); try { run(db); } finally { db.close(); } }
function pickup(db, id) {
  db.exec('BEGIN IMMEDIATE');
  operation(db, 'serah_terima', id, randomUUID(), 3);
  db.prepare('UPDATE alokasi_barang SET diambil_ms=? WHERE id_peminjaman=?').run(NOW, id);
  db.prepare("UPDATE peminjaman SET status='dipinjam' WHERE id_peminjaman=?").run(id);
  db.exec('COMMIT');
}

test('DDL additive: rollback, profile 001, legacy rows and new empty baseline preserved on SELECT copy', { skip: !process.env.SMARTLEND_DATABASE_AUDIT_SOURCE }, () => {
  const source = process.env.SMARTLEND_DATABASE_AUDIT_SOURCE;
  const before = inspectDatabase(source);
  const copy = disposableFile(); copyReadOnly(source, copy);
  const db = new DatabaseSync(copy);
  try {
    db.exec('PRAGMA foreign_keys=ON');
    const original = digest(fingerprint(db));
    const schema = db.prepare('SELECT sql FROM sqlite_schema ORDER BY name').all();
    assert.equal(loanSchemaState(db), 'ready');
    db.exec('BEGIN IMMEDIATE'); db.exec(draft); db.exec('ROLLBACK');
    assert.deepEqual(db.prepare('SELECT sql FROM sqlite_schema ORDER BY name').all(), schema);
    db.exec('BEGIN IMMEDIATE'); db.exec(draft); db.exec('COMMIT');
    const after = fingerprint(db);
    for (const name of ['audit_operasi','verifikasi_stok_barang','alokasi_barang','alokasi_ruangan','penerimaan_barang']) {
      assert.deepEqual(after[name], []); delete after[name];
    }
    assert.equal(digest(after), original, 'all source accounts, inventory and transactions preserved');
    assert.equal(loanSchemaState(db), 'ready', '11-column readiness profile unchanged');
    assert.equal(availability(db, 9001, START, END).available, null, 'real 12 items are NOT given invented condition data');
    // Compatibility with real submission service: ONLY a new synthetic item in copy.
    db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(99001, 'SYN-ONLY-COPY', 'SINTETIS COPY ONLY', 'portabel', 'unit', 2);
    const student = db.prepare("SELECT id_pengguna FROM pengguna WHERE peran='mahasiswa'").get().id_pengguna;
    const result = new LoanService(db).create(student, randomUUID(), { items: [{ itemId: 99001, quantity: 1 }], startsAt: new Date(START).toISOString(), endsAt: new Date(END).toISOString(), reason: 'SINTETIS — separate copy only' });
    assert.equal(result.loan.status, 'menunggu');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM alokasi_barang').get().n, 0);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    console.log('Disposable SELECT-copy validated: ' + copy + ' (contains sensitive local account hashes; do not share).');
  } finally { db.close(); }
  const after = inspectDatabase(source);
  assert.deepEqual(after.fingerprints, before.fingerprints, 'source rows unchanged during test; concurrent legitimate edits require re-audit, never reset');
  assert.deepEqual(after.schema, before.schema, 'source schema unchanged');
});

test('no verified stock means null, not zero or stok_total; pending does not reserve', () => use(db => {
  request(db, 1, [[91, 8]]);
  assert.equal(availability(db, 91, START, END).available, null);
  verify(db, 91, 7);
  assert.equal(availability(db, 91, START, END).available, 7);
}));

test('STRICT, sums, FKs, same-item verification and immutable audit constraints', () => use(db => {
  const op = operation(db, 'verifikasi_stok');
  assert.throws(() => verify(db, 91, 10.5), /INTEGER/);
  assert.throws(() => verify(db, 91, -1));
  assert.throws(() => verify(db, 91, 10, { unknown: 1 }));
  const a = verify(db, 91, 10), b = verify(db, 92, 10);
  assert.throws(() => db.prepare('UPDATE verifikasi_stok_barang SET layak_pinjam=9 WHERE id_verifikasi=?').run(a), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM audit_operasi WHERE id_operasi=?').run(op), /append-only/);
  request(db, 1);
  assert.throws(() => db.prepare('INSERT INTO alokasi_barang VALUES(1,91,?,?,?, ?,NULL,NULL)').run(b, op, START, END), /FOREIGN KEY/);
  assert.throws(() => db.prepare('INSERT INTO alokasi_barang VALUES(999,91,?,?,?, ?,NULL,NULL)').run(a, op, START, END), /FOREIGN KEY/);
  assert.throws(() => db.prepare('INSERT INTO alokasi_barang VALUES(1,91,?,?,?, ?,NULL,NULL)').run(a, op, END, START), /CHECK/);
}));

test('facility exclusion and condition baseline are disjoint; drift blocks approval', () => use(db => {
  db.prepare('INSERT INTO fasilitas_ruangan VALUES(81,91,2)').run();
  verify(db, 91, 7, { facilities: 2, damaged: 1 });
  assert.equal(availability(db, 91, START, END).available, 7);
  db.prepare('UPDATE fasilitas_ruangan SET jumlah=3 WHERE id_barang=91').run();
  assert.equal(availability(db, 91, START, END).reason, 'RECONCILIATION_REQUIRED');
  request(db, 1); assert.throws(() => approve(db, 1), /RECONCILIATION_REQUIRED/);
}));

test('half-open adjacent intervals, overlap rejected and allocation not duplicated on retry', () => use(db => {
  verify(db); request(db, 1, [[91, 10]]); const key = randomUUID();
  assert.equal(approve(db, 1, key).replayed, false);
  assert.equal(approve(db, 1, key).replayed, true);
  request(db, 2, [[91, 1]], END - 1, END + 1000);
  assert.throws(() => approve(db, 2), /insufficient/);
  request(db, 3, [[91, 10]], END, END + 1000); approve(db, 3);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM alokasi_barang').get().n, 2);
}));

test('availability uses peak concurrent load, not sum of all overlaps', () => use(db => {
  verify(db);
  request(db, 1, [[91, 6]], START, END); approve(db, 1);
  request(db, 2, [[91, 6]], END, END + 10000); approve(db, 2);
  assert.equal(availability(db, 91, START, END + 10000).available, 4);
  request(db, 3, [[91, 4]], START, END + 10000); approve(db, 3);
  assert.equal(availability(db, 91, START, END + 10000).available, 0);
  request(db, 4, [[91, 1]], START + 1, END - 1); assert.throws(() => approve(db, 4));
}));

test('multi-item approval failure rolls back allocations, audit and status', () => use(db => {
  verify(db); verify(db, 92, 0); request(db, 1, [[91, 1], [92, 1]]);
  const before = digest(fingerprint(db)); assert.throws(() => approve(db, 1));
  assert.equal(digest(fingerprint(db)), before);
  verify(db, 92, 10);
  db.exec("CREATE TRIGGER synthetic_fail BEFORE INSERT ON alokasi_barang WHEN NEW.id_barang=92 BEGIN SELECT RAISE(ABORT,'synthetic second item failure'); END");
  const prior = digest(fingerprint(db)); assert.throws(() => approve(db, 1), /second item/);
  assert.equal(digest(fingerprint(db)), prior);
}));

test('room exclusive overlap, operational state and mixed package atomicity', () => use(db => {
  verify(db); request(db, 1, [], START, END, true); approve(db, 1);
  request(db, 2, [[91, 1]], START + 1, END + 1, true);
  const before = digest(fingerprint(db)); assert.throws(() => approve(db, 2), /room overlap/);
  assert.equal(digest(fingerprint(db)), before);
  request(db, 3, [], END, END + 1000, true); approve(db, 3);
  db.prepare("UPDATE ruangan SET status_operasional='perawatan' WHERE id_ruangan=81").run();
  request(db, 4, [], END + 1000, END + 2000, true); assert.throws(() => approve(db, 4));
}));

test('room participant capacity is rechecked, not inferred from an empty schedule', () => use(db => {
  request(db, 1, [], START, END, true);
  db.prepare('UPDATE detail_ruangan SET jumlah_peserta=21 WHERE id_peminjaman=1').run();
  assert.throws(() => approve(db, 1));
}));

test('rejection and cancellation do not reserve; cancellation releases only unpicked allocation', () => use(db => {
  verify(db); request(db, 1, [[91, 10]]); approve(db, 1);
  db.exec('BEGIN IMMEDIATE'); operation(db, 'batalkan', 1);
  db.prepare('UPDATE alokasi_barang SET dilepas_ms=? WHERE id_peminjaman=1 AND diambil_ms IS NULL').run(NOW);
  db.prepare("UPDATE peminjaman SET status='dibatalkan' WHERE id_peminjaman=1").run(); db.exec('COMMIT');
  request(db, 2, [[91, 10]]); db.prepare("UPDATE peminjaman SET status='ditolak' WHERE id_peminjaman=2").run();
  assert.equal(availability(db, 91, START, END).available, 10);
}));

test('checked-out overdue stock remains blocked beyond planned end until verified partial returns', () => use(db => {
  verify(db); request(db, 1, [[91, 6]]); approve(db, 1); pickup(db, 1);
  assert.equal(availability(db, 91, END + 10000, END + 20000).available, 4);
  receive(db, 1, 91, 2);
  assert.equal(availability(db, 91, END + 10000, END + 20000).available, 6);
  const before = digest(fingerprint(db)); assert.throws(() => receive(db, 1, 91, 5), /over-return/);
  assert.equal(digest(fingerprint(db)), before);
  receive(db, 1, 91, 4);
  assert.equal(availability(db, 91, END + 10000, END + 20000).available, 10);
}));

test('damaged/lost receipt lowers capacity once, repair appends a new absolute snapshot', () => use(db => {
  verify(db); request(db, 1, [[91, 6]]); approve(db, 1); pickup(db, 1);
  receive(db, 1, 91, 2, 1, 1);
  assert.equal(availability(db, 91, START, END).available, 6); // 8 good - 2 still out
  receive(db, 1, 91, 2);
  assert.equal(availability(db, 91, START, END).available, 8); // not 10, not 6
  verify(db, 91, 9, { lost: 1 }); // one genuinely repaired SYNTHETIC unit
  assert.equal(availability(db, 91, START, END).available, 9);
  assert.equal(db.prepare('SELECT stok_total FROM barang WHERE id_barang=91').get().stok_total, 10);
}));

test('capacity reduction, incomplete verification and legacy approved rows fail closed', () => use(db => {
  verify(db); request(db, 1, [[91, 8]]); approve(db, 1);
  verify(db, 91, 7);
  assert.equal(availability(db, 91, START, END).reason, 'CAPACITY_DEFICIT');
  verify(db, 91, 7, { unknown: 1, state: 'perlu_rekonsiliasi' });
  assert.equal(availability(db, 91, START, END).available, null);
  verify(db); request(db, 2);
  db.prepare("UPDATE peminjaman SET status='disetujui' WHERE id_peminjaman=2").run();
  assert.equal(availability(db, 91, START, END).reason, 'UNRECONCILED_LEGACY_ALLOCATION');
}));

test('two SQLite writer processes cannot both approve the last capacity', async () => {
  const db = fixture();
  const file = db.testOnlyFile;
  try {
    verify(db); request(db, 1, [[91, 10]]); request(db, 2, [[91, 10]]);
    const modulePath = fileURLToPath(new URL('./prototype.mjs', import.meta.url));
    const code = `import {DatabaseSync} from 'node:sqlite'; import {pathToFileURL} from 'node:url';
      const {approve}=await import(pathToFileURL(process.argv[1]));
      const db=new DatabaseSync(process.argv[2]); db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
      try {approve(db,Number(process.argv[3]));console.log('approved');}
      catch(e){if(!e.message.includes('insufficient'))throw e;console.log('conflict');} finally{db.close();}`;
    const run = id => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--input-type=module','-e',code,modulePath,file,String(id)], { stdio: ['ignore','pipe','pipe'] });
      let out = '', err = ''; child.stdout.on('data', data => { out += data; }); child.stderr.on('data', data => { err += data; });
      child.on('error', reject); child.on('exit', status => status ? reject(Error(err)) : resolve(out.trim()));
    });
    assert.deepEqual((await Promise.all([run(1), run(2)])).sort(), ['approved','conflict']);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM alokasi_barang').get().n, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});
