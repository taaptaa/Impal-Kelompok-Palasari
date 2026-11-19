// Jalankan segera setelah migrasi; seluruh akses hanya-baca, tidak mencetak data akun.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loanSchemaState } from '../backend/loan-schema.mjs';

const [targetPath,backupPath]=process.argv.slice(2);
if(!targetPath||!backupPath)throw Error('Berikan target dan backup sebelum migrasi secara eksplisit.');
const db=new DatabaseSync(resolve(targetPath),{readOnly:true}),backup=new DatabaseSync(resolve(backupPath),{readOnly:true});
try {
  const metadata=JSON.parse(readFileSync(resolve(backupPath)+'.audit.json','utf8'));
  assert.equal(resolve(metadata.target),resolve(targetPath));assert.equal(loanSchemaState(backup),'pending');assert.equal(loanSchemaState(db),'ready');
  const schema=connection=>connection.prepare("SELECT name,type,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(row=>({...row}));
  const oldSchema=schema(backup),newSchema=schema(db),added=newSchema.filter(row=>!oldSchema.some(old=>old.name===row.name&&old.type===row.type));
  assert.equal(added.length,1);assert.equal(added[0].name,'peminjaman_request_unique');
  for(const row of oldSchema.filter(row=>row.name!=='peminjaman'))assert.deepEqual(newSchema.find(newRow=>newRow.name===row.name&&newRow.type===row.type),row);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_list(peminjaman)').all(),backup.prepare('PRAGMA foreign_key_list(peminjaman)').all());
  assert.deepEqual(db.prepare('PRAGMA table_info(peminjaman)').all().slice(0,8),backup.prepare('PRAGMA table_info(peminjaman)').all());
  const columns=db.prepare('PRAGMA table_info(peminjaman)').all().slice(8).map(row=>row.name);
  assert.deepEqual(columns,['dibuat_pada','request_key','request_hash']);
  let tablesUnchanged=0;
  for(const table of oldSchema.filter(row=>row.type==='table')){
    const quote=name=>'"'+name.replaceAll('"','""')+'"';
    const fields=backup.prepare(`PRAGMA table_info(${quote(table.name)})`).all().map(row=>quote(row.name)).join(',');
    const query=`SELECT ${fields} FROM ${quote(table.name)} ORDER BY rowid`;
    assert.deepEqual(db.prepare(query).all(),backup.prepare(query).all(),`Seluruh record lama ${table.name} harus identik`);tablesUnchanged++;
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pengguna').get().n,3);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM barang').get().n,12);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  console.log(JSON.stringify({result:'PASS',tablesWithIdenticalExistingData:tablesUnchanged,accounts:3,accountsAndPasswordHashesUnchanged:true,inventory:12,inventoryAndStocksUnchanged:true,addedColumns:columns,addedUniqueIndex:added[0].name,otherSchemaUnchanged:true,loans:db.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n,integrity:'ok',foreignKeyIssues:0},null,2));
}finally{db.close();backup.close();}
