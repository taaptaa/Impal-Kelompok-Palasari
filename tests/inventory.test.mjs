import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { closeSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb, root } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { additionalInventory, appendInventory, extendDisposableInventory, fingerprint, readInventory } from '../tools/add-test-inventory.mjs';
import { makeServer } from '../backend/server.mjs';

function fixture(db) {
  // Hanya fixture memori/file baru milik tes ini, bukan akun/database aktif.
  seed(db, Object.fromEntries(['student', 'admin', 'warehouse'].map(role => [role, randomBytes(24).toString('base64url')])));
  for (const [id, code, name, stock] of [[9001,'UJI-PRJ-01','Proyektor (Uji)',3],[9002,'UJI-HDM-01','Kabel HDMI (Uji)',5],[9003,'UJI-SPK-01','Speaker Portable (Uji)',2]])
    db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,code,name,'portabel','unit',stock);
}

test('penambahan sembilan inventaris aditif/idempotent, akun/schema/record lama identik, API mengembalikan 12', async () => {
  const db = openDb(':memory:');
  let server;
  try {
    fixture(db);
    const before = fingerprint(db), original = readInventory(db);
    const result = appendInventory(db);
    assert.equal(result.inserted, 9);
    assert.equal(result.inventory.length, 12);
    assert.deepEqual(readInventory(db).slice(0,3), original);
    assert.deepEqual(fingerprint(db).tables.pengguna, before.tables.pengguna);
    assert.equal(fingerprint(db).schemaHash, before.schemaHash);
    const repeated = appendInventory(db);
    assert.equal(repeated.inserted, 0);
    assert.equal(repeated.skipped, 9);
    assert.equal(new Set(repeated.inventory.map(row=>row.kode_barang)).size, 12);
    for(const item of additionalInventory) {
      const row = repeated.inventory.find(row=>row.kode_barang===item.kode_barang);
      for(const [key,value] of Object.entries(item)) assert.equal(row[key],value);
    }
    server = makeServer(db);
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const data = await (await fetch(`http://127.0.0.1:${server.address().port}/api/catalog`)).json();
    assert.deepEqual(data.barang,readInventory(db));
    assert.equal(data.barang.some(row=>'availableStock' in row || 'imageUrl' in row),false);
  } finally { if(server?.listening) await new Promise(resolve=>server.close(resolve)); db.close(); }
});

test('konflik kode dan insert yang gagal me-rollback seluruh paket, bukan menimpa data', () => {
  const db = openDb(':memory:');
  try {
    fixture(db);
    db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(9500,'UJI-TRP-01','Data berbeda','portabel','unit',1);
    const before = fingerprint(db);
    assert.throws(()=>appendInventory(db),/tidak akan ditimpa/);
    assert.deepEqual(fingerprint(db),before);
  } finally { db.close(); }
  const failing = openDb(':memory:');
  try {
    fixture(failing);
    failing.exec("CREATE TRIGGER test_fail_insert BEFORE INSERT ON barang WHEN NEW.kode_barang='UJI-KMR-01' BEGIN SELECT RAISE(ABORT,'uji gagal di tengah paket'); END;");
    const before = fingerprint(failing);
    assert.throws(()=>appendInventory(failing),/uji gagal/);
    assert.deepEqual(fingerprint(failing),before);
  } finally { failing.close(); }
});

test('prosedur memverifikasi disposable, snapshot backup WAL, dan penolakan target/konfirmasi salah', () => {
  const path = resolve(root,'database/disposable',`accounts-inventory-test-${randomUUID()}.disposable.sqlite`);
  closeSync(openSync(path,'wx',0o600));
  const db = openDb(path);
  try {
    fixture(db); // biarkan koneksi terbuka agar perubahan fixture masih tercakup WAL
    const before = fingerprint(db);
    const audit = extendDisposableInventory({database:path});
    assert.equal(audit.proposed.length,9);
    assert.deepEqual(fingerprint(db),before);
    assert.throws(()=>extendDisposableInventory({database:path,apply:true}),/Konfirmasi/);
    assert.throws(()=>extendDisposableInventory({database:resolve(root,'smartlend_tubes.sql'),apply:true,confirmation:'ADD_SYNTHETIC_INVENTORY'}),/Target/);
    const result = extendDisposableInventory({database:path,apply:true,confirmation:'ADD_SYNTHETIC_INVENTORY'});
    assert.equal(result.inserted,9);
    const backup = new DatabaseSync(result.backup,{readOnly:true});
    try { assert.deepEqual(fingerprint(backup),before); } finally { backup.close(); }
    const after = fingerprint(db);
    const repeat = extendDisposableInventory({database:path,apply:true,confirmation:'ADD_SYNTHETIC_INVENTORY'});
    assert.equal(repeat.inserted,0);
    assert.equal(repeat.backup,null);
    assert.deepEqual(fingerprint(db),after);
  } finally { db.close(); }
});
