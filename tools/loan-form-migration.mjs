// Explicit local migration tooling. Never imported by server/startup.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statfsSync, statSync, writeFileSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { loanSchemaState } from '../backend/loan-schema.mjs';
import { loanFormState } from '../backend/loan-form.mjs';
import { LoanService } from '../backend/loans.mjs';
import { LoanReadService } from '../backend/loan-reads.mjs';

export const FORM_SQL=readFileSync(new URL('../database/migrations/003-loan-form.sql',import.meta.url),'utf8');
export const LEDGER_SQL=`CREATE TABLE migrasi_aplikasi (
  versi TEXT PRIMARY KEY NOT NULL,
  checksum TEXT NOT NULL CHECK(length(checksum)=64),
  diterapkan_pada TEXT NOT NULL,
  operator TEXT NOT NULL
) STRICT;`;
export const CHECKSUM=createHash('sha256').update(FORM_SQL+'\n'+LEDGER_SQL).digest('hex');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalized=sql=>sql.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim().replace(/;$/,'');
const quote=name=>'"'+name.replaceAll('"','""')+'"';
export function snapshot(db) {
  const objects=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all().map(row=>({...row}));
  const tables={};
  for(const {name} of objects.filter(row=>row.type==='table')) {
    const rows=db.prepare(`SELECT * FROM ${quote(name)}`).all().map(row=>JSON.stringify(row)).sort();
    tables[name]={count:rows.length,hash:digest(rows)};
  }
  return {objects,tables,userVersion:db.prepare('PRAGMA user_version').get().user_version,applicationId:db.prepare('PRAGMA application_id').get().application_id};
}
export function integrity(db) {
  assert.deepEqual(db.prepare('PRAGMA integrity_check').all().map(row=>row.integrity_check),['ok'],'SQLite integrity gagal');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0,'Foreign key gagal');
  assert.equal(loanSchemaState(db),'ready','Profil 001 diperlukan');
}
export function space(path,extra=0) {
  const {bavail,bsize}=statfsSync(path);const free=bavail*bsize;
  const required=1024**3+extra; // Keep >=1 GiB beyond backup/restore/workspace size.
  if(free<required)throw Error(`Ruang disk kurang: ${free} byte; perlu ${required}. Tidak menghapus file.`);
  return {free,required};
}
function actual(path) {
  const target=resolve(path);
  assert.ok(existsSync(target)&&statSync(target).isFile(),'Database existing wajib ada');
  assert.equal(realpathSync(target),target,'Path alias/junction tidak diizinkan');
  return target;
}
export function state(db) {
  integrity(db);
  const form=loanFormState(db),ledger=db.prepare("SELECT type,sql FROM sqlite_schema WHERE name='migrasi_aplikasi'").get();
  if(form==='absent'&&!ledger)return 'pending';
  if(form!=='ready'||ledger?.type!=='table'||normalized(ledger.sql)!==normalized(LEDGER_SQL))throw Error('Schema parsial/berbeda: audit manual, tidak memperbaiki otomatis.');
  const record=db.prepare("SELECT * FROM migrasi_aplikasi WHERE versi='003-loan-form'").get();
  if(record?.checksum!==CHECKSUM)throw Error('Ledger/checksum 003 tidak cocok: audit manual.');
  return 'applied';
}
export function applyToConnection(db,expected,operator) {
  assert.ok(typeof operator==='string'&&operator.trim().length>0&&operator.length<=120,'Operator wajib diisi');
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
  try {
    const status=state(db),before=snapshot(db);
    if(status==='applied'){db.exec('COMMIT');return {changed:false,after:before};}
    assert.deepEqual(before,expected,'Database berubah sejak backup: audit dan backup ulang, tanpa restore/reset.');
    db.exec(FORM_SQL);db.exec(LEDGER_SQL);
    db.prepare('INSERT INTO migrasi_aplikasi VALUES(?,?,?,?)').run('003-loan-form',CHECKSUM,new Date().toISOString(),operator.trim());
    assert.equal(state(db),'applied');
    const after=snapshot(db);
    assert.deepEqual(after.objects.filter(row=>!['informasi_pengajuan','migrasi_aplikasi'].includes(row.tbl_name)),before.objects,'Objek schema lama berubah');
    for(const [name,rows] of Object.entries(before.tables))assert.deepEqual(after.tables[name],rows,`Data ${name} berubah`);
    assert.equal(after.tables.informasi_pengajuan.count,0);
    assert.equal(after.userVersion,before.userVersion);assert.equal(after.applicationId,before.applicationId);
    db.exec('COMMIT');return {changed:true,after};
  }catch(error){db.exec('ROLLBACK');throw error;}
}
function durableJson(path,value) {
  writeFileSync(path,JSON.stringify(value,null,2),{flag:'wx',mode:0o600});
  const fd=openSync(path,'r+');try{fsyncSync(fd);}finally{closeSync(fd);}
}
function vacuumCopy(source,destination) {
  assert.ok(!existsSync(destination),'Tidak menimpa backup/restore existing');
  // SQLite reads committed pages including WAL; never copy just the main file.
  source.prepare('VACUUM main INTO ?').run(destination);
  const fd=openSync(destination,'r+');try{fsyncSync(fd);}finally{closeSync(fd);}
}
export function prepare(database,directory) {
  const target=actual(database),dir=realpathSync(resolve(directory));
  const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
  assert.ok(!dir.toLowerCase().startsWith(root.toLowerCase()+sep),'Backup wajib di luar workspace/web root');
  const disk=space(dir,statSync(target).size*8);
  space(dirname(target),statSync(target).size*4);
  const token=randomUUID(),backup=resolve(dir,`before-003-${token}.sqlite`),restored=resolve(dir,`restore-003-${token}.sqlite`),manifest=resolve(dir,`manifest-003-${token}.json`);
  const source=new DatabaseSync(target,{readOnly:true});let before;
  try {
    source.exec('BEGIN');assert.equal(state(source),'pending','Migrasi sudah ada/parsial; jangan prepare ulang');before=snapshot(source);source.exec('COMMIT');
    vacuumCopy(source,backup);
    const saved=new DatabaseSync(backup,{readOnly:true});
    try {integrity(saved);assert.deepEqual(snapshot(saved),before,'Source berubah saat backup; ulang audit');vacuumCopy(saved,restored);}finally{saved.close();}
    assert.deepEqual(snapshot(source),before,'Source berubah selama persiapan; ulang audit');
  }finally{source.close();}
  const copy=new DatabaseSync(restored);let tests;
  try {
    integrity(copy);assert.deepEqual(snapshot(copy),before,'Restore tidak identik');
    const oldLoans=copy.prepare('SELECT id_peminjaman,id_peminjam FROM peminjaman ORDER BY id_peminjaman').all();
    const service=new LoanService(copy),oldReceipts=oldLoans.map(row=>service.detail(row.id_peminjam,row.id_peminjaman));
    const migration=applyToConnection(copy,before,'isolated-restore-rehearsal');
    assert.equal(applyToConnection(copy,before,'isolated-repeat').changed,false);
    assert.deepEqual(oldLoans.map(row=>service.detail(row.id_peminjam,row.id_peminjaman)),oldReceipts);
    const user=copy.prepare("SELECT id_pengguna FROM pengguna WHERE peran='mahasiswa' AND aktif=1 ORDER BY id_pengguna LIMIT 1").get();
    const item=copy.prepare('SELECT id_barang FROM barang WHERE stok_total>=1 ORDER BY id_barang LIMIT 1').get();
    assert.ok(user&&item,'Salinan perlu akun mahasiswa/item existing untuk rehearsal');
    const key=randomUUID(),input={items:[{itemId:item.id_barang,quantity:1}],startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+172800000).toISOString(),reason:'UJI SALINAN RESTORE 003 — bukan transaksi sumber',details:{phone:'081234567890',borrowerIdentifier:'TEST-COPY',unit:'Unit sintetis',activityName:'Rehearsal migrasi',activityLocation:'Salinan terisolasi',activityDescription:'Hanya database restore terpisah',acknowledgement:{version:'submission-info-v1',accepted:true}}};
    const saved=service.create(user.id_pengguna,key,input).loan;
    assert.deepEqual(service.create(user.id_pengguna,key,input),{replayed:true,loan:saved});
    assert.deepEqual(new LoanReadService(copy).detail(saved.id).loan.details,saved.details);
    const {details,...base}=input;service.create(user.id_pengguna,randomUUID(),base);
    assert.deepEqual(snapshot(copy).tables.barang,before.tables.barang);assert.deepEqual(snapshot(copy).tables.pengguna,before.tables.pengguna);
    assert.deepEqual(oldLoans.map(row=>service.detail(row.id_peminjam,row.id_peminjaman)),oldReceipts);integrity(copy);
    tests={restoreIdentical:true,oldReceiptsUnchanged:true,migrationRepeatNoop:true,extendedReplayAndAdminRead:true,legacySubmit:true,stockAndAccountsUnchanged:true,receiptId:saved.id,ownerId:user.id_pengguna};
    // Reopen durability below; metadata saved in rehearsal only.
    tests.expectedDetailsHash=digest(saved.details);
    assert.equal(migration.changed,true);
  }finally{copy.close();}
  const reopened=new DatabaseSync(restored,{readOnly:true});try{assert.equal(digest(new LoanService(reopened).detail(tests.ownerId,tests.receiptId).details),tests.expectedDetailsHash);integrity(reopened);}finally{reopened.close();}
  const proof={version:1,target,checksum:CHECKSUM,createdAt:new Date().toISOString(),backup,restored,before,tests,disk};
  durableJson(manifest,proof);
  return {target,backup,restored,manifest,checksum:CHECKSUM,tests,disk};
}
export function applyPrepared(database,manifestPath,confirmation,operator) {
  const target=actual(database),proof=JSON.parse(readFileSync(manifestPath,'utf8'));
  assert.equal(confirmation,`APPLY 003 ${target}`,'Konfirmasi exact target wajib');
  assert.equal(proof.target,target);assert.equal(proof.version,1);assert.equal(proof.checksum,CHECKSUM,'SQL berubah setelah rehearsal');
  for(const name of ['restoreIdentical','oldReceiptsUnchanged','migrationRepeatNoop','extendedReplayAndAdminRead','legacySubmit','stockAndAccountsUnchanged'])assert.equal(proof.tests[name],true);
  space(dirname(target),statSync(target).size*4);space(dirname(manifestPath),statSync(target).size*4);
  const backup=new DatabaseSync(actual(proof.backup),{readOnly:true});try{integrity(backup);assert.deepEqual(snapshot(backup),proof.before,'Backup berubah/rusak');}finally{backup.close();}
  const db=new DatabaseSync(target);let result;
  try{result=applyToConnection(db,proof.before,operator);}finally{db.close();}
  // A receipt write failure after commit must not trigger a database restore.
  const receipt=resolve(dirname(manifestPath),`applied-003-${randomUUID()}.json`);
  durableJson(receipt,{target,checksum:CHECKSUM,at:new Date().toISOString(),operator,...result});
  return {target,changed:result.changed,receipt};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [mode,database,arg,confirmation,operator]=process.argv.slice(2);
  if(mode==='prepare')console.log(JSON.stringify(prepare(database,arg),null,2));
  else if(mode==='apply')console.log(JSON.stringify(applyPrepared(database,arg,confirmation,operator),null,2));
  else throw Error('Gunakan prepare <existing-db> <private-external-dir> atau apply <existing-db> <manifest> <exact-confirmation> <operator>.');
}
