import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../backend/db.mjs';
import { migrateLoanSchema } from '../backend/loan-schema.mjs';
import { applyToConnection, snapshot, prepare, applyPrepared, FORM_SQL, LEDGER_SQL, CHECKSUM, state } from '../tools/loan-form-migration.mjs';
const directory=()=>mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-migration003-test-'));
function fixture(path=':memory:') {
  const db=openDb(path);migrateLoanSchema(db);
  db.exec("INSERT INTO pengguna VALUES(1,'Synthetic','test@example.test','not-a-real-hash','mahasiswa',1); INSERT INTO barang VALUES(1,'TEST-1','Synthetic','portabel','unit',3)");
  return db;
}
test('003 promoted table SQL stays compatible with DRAFT contract',()=>{
  const a=fixture(),b=fixture();try{
    a.exec(FORM_SQL);b.exec(readFileSync(new URL('../database/proposals/003-loan-form.DRAFT.sql',import.meta.url),'utf8'));
    assert.deepEqual(snapshot(a),snapshot(b));
  }finally{a.close();b.close();}
});
test('003 exact additive schema, old rows intact, ledger checksum and repeat no-op',()=>{
  const db=fixture();try{
    const before=snapshot(db);assert.equal(applyToConnection(db,before,'synthetic tester').changed,true);
    const after=snapshot(db);assert.equal(state(db),'applied');assert.equal(db.prepare('SELECT checksum FROM migrasi_aplikasi').get().checksum,CHECKSUM);
    assert.equal(applyToConnection(db,before,'repeat tester').changed,false);assert.deepEqual(snapshot(db),after);
    for(const [name,rows] of Object.entries(before.tables))assert.deepEqual(after.tables[name],rows);
  }finally{db.close();}
});
test('003 partial/wrong schema/checksum refused, no hidden repair or metadata writes',()=>{
  for(const ddl of ['CREATE TABLE informasi_pengajuan(id INTEGER)',FORM_SQL,LEDGER_SQL,FORM_SQL+LEDGER_SQL+"INSERT INTO migrasi_aplikasi VALUES('003-loan-form','"+'f'.repeat(64)+"','bad','test')"]){
    const db=fixture();try{db.exec(ddl);const before=snapshot(db);assert.throws(()=>applyToConnection(db,before,'test'),/parsial|checksum/);assert.deepEqual(snapshot(db),before);}finally{db.close();}
  }
});
test('003 changed source since backup aborts before DDL; no stale backup restore',()=>{
  const db=fixture();try{const before=snapshot(db);db.exec("UPDATE barang SET nama_barang='Legitimate edit' WHERE id_barang=1");const changed=snapshot(db);assert.throws(()=>applyToConnection(db,before,'test'),/berubah sejak backup/);assert.deepEqual(snapshot(db),changed);}finally{db.close();}
});
test('003 ledger insert failure rolls back table DDL as well',()=>{
  const db=fixture();try{
    const before=snapshot(db);const proxy={exec:sql=>db.exec(sql),prepare:sql=>{if(sql.startsWith('INSERT INTO migrasi_aplikasi'))throw Error('synthetic ledger failure');return db.prepare(sql);}};
    assert.throws(()=>applyToConnection(proxy,before,'test'),/synthetic ledger/);assert.deepEqual(snapshot(db),before);
  }finally{db.close();}
});
test('003 WAL snapshot backup/restore, source preserved, exact confirmation required, backup reusable',()=>{
  const dir=directory(),file=join(dir,'source.sqlite'),db=fixture(file);
  try{
    db.exec('PRAGMA wal_autocheckpoint=0');db.exec("UPDATE barang SET nama_barang='WAL committed' WHERE id_barang=1");
    const before=snapshot(db),proof=prepare(file,dir);assert.deepEqual(snapshot(db),before);
    const backup=new DatabaseSync(proof.backup,{readOnly:true});try{assert.deepEqual(snapshot(backup),before);}finally{backup.close();}
    assert.throws(()=>applyPrepared(file,proof.manifest,'WRONG','test'),/Konfirmasi/);assert.deepEqual(snapshot(db),before);
    const result=applyPrepared(file,proof.manifest,`APPLY 003 ${file}`,'synthetic tester');assert.equal(result.changed,true);
    assert.equal(applyPrepared(file,proof.manifest,`APPLY 003 ${file}`,'synthetic repeat').changed,false);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM peminjaman').get().n,0,'Rehearsal submissions were on restore copy only');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM informasi_pengajuan').get().n,0);
  }finally{db.close();}
});
