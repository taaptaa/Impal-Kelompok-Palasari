// Verifikasi independen hanya-baca terhadap backup sebelum penambahan.
// Tidak mencetak data pengguna, hash password, atau token sesi.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [targetPath, backupPath] = process.argv.slice(2);
if (!targetPath || !backupPath) throw Error('Berikan path target dan backup sebelum insert secara eksplisit.');
const target = new DatabaseSync(resolve(targetPath), { readOnly: true });
const backup = new DatabaseSync(resolve(backupPath), { readOnly: true });
try {
  const metadata = JSON.parse(readFileSync(resolve(backupPath) + '.audit.json', 'utf8'));
  assert.equal(resolve(metadata.target), resolve(targetPath));
  const schema = db => db.prepare("SELECT name,type,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(row=>({...row}));
  assert.deepEqual(schema(target),schema(backup),'Schema tidak berubah');
  let protectedTables = 0;
  for (const table of schema(backup).filter(row=>row.type==='table' && row.name!=='barang')) {
    const query = `SELECT * FROM "${table.name.replaceAll('"','""')}" ORDER BY rowid`;
    assert.deepEqual(target.prepare(query).all(),backup.prepare(query).all(),`Tabel ${table.name} harus identik`);
    protectedTables++;
  }
  const inventory = db => db.prepare('SELECT * FROM barang ORDER BY id_barang').all().map(row=>({...row}));
  const oldRows = inventory(backup), rows = inventory(target);
  assert.equal(oldRows.length,3);
  assert.deepEqual(oldRows,metadata.inventory);
  assert.equal(rows.length,12);
  for (const row of oldRows) assert.deepEqual(rows.find(item=>item.id_barang===row.id_barang),row);
  const added = rows.filter(item=>!oldRows.some(row=>row.id_barang===item.id_barang));
  assert.equal(added.length,9);
  for (const expected of metadata.proposed) {
    const actual = added.find(item=>item.kode_barang===expected.kode_barang);
    assert.ok(actual);
    for (const [key,value] of Object.entries(expected)) assert.equal(actual[key],value);
  }
  assert.equal(new Set(rows.map(item=>item.kode_barang)).size,12);
  assert.equal(target.prepare('SELECT COUNT(*) AS count FROM pengguna').get().count,3);
  assert.equal(target.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(target.prepare('PRAGMA foreign_key_check').all().length,0);
  console.log(JSON.stringify({result:'PASS',before:oldRows.length,after:rows.length,inserted:added.length,uniqueCodes:true,schemaUnchanged:true,oldInventoryUnchanged:true,protectedTables,accountsAndPasswordHashesUnchanged:true,integrity:'ok',foreignKeyIssues:0},null,2));
} finally { target.close(); backup.close(); }
