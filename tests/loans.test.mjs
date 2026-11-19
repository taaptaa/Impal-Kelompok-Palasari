import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { openDb } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { AuthService } from '../backend/auth.mjs';
import { migrateLoanSchema, loanSchemaState } from '../backend/loan-schema.mjs';
import { LoanService } from '../backend/loans.mjs';
import { makeServer } from '../backend/server.mjs';
import { jakartaToUtc, validateLoan } from '../src/app/loan-validation.mjs';
import { removeSubmittedPlan } from '../src/app/plan.mjs';
import { enableLoanSubmissions } from '../tools/enable-loan-submissions.mjs';
import { appendInventory, fingerprint } from '../tools/add-test-inventory.mjs';

let db,server,url,sessions,originalAccounts,originalInventory;
const origin='http://127.0.0.1:3000';
const valid = () => ({items:[{itemId:91,quantity:2},{itemId:92,quantity:1}],startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+172800000).toISOString(),reason:'UJI SPRINT 2 — kegiatan akademik sintetis'});
const counts = () => ({header:db.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n,details:db.prepare('SELECT COUNT(*) AS n FROM detail_barang').get().n});
const post = (input,{session=sessions.student,key=randomUUID(),headers={},raw}={})=>fetch(url+'/api/loans',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:session?.cookie||'','X-CSRF-Token':session?.csrf||'','Idempotency-Key':key,...headers},body:raw??JSON.stringify(input)});
const get = (path,session=sessions.student)=>fetch(url+path,{headers:{Cookie:session?.cookie||''}});
before(async()=>{
  db=openDb(':memory:');
  const passwords=Object.fromEntries(['student','admin','warehouse'].map(role=>[role,randomBytes(24).toString('base64url')]));
  seed(db,passwords);
  db.prepare('INSERT INTO pengguna SELECT 4,?,?,password_hash,?,1 FROM pengguna WHERE id_pengguna=1').run('Mahasiswa Kedua Sintetis','kedua@smartlend.test','mahasiswa');
  for (const [id,name,total] of [[91,'Proyektor sintetis',3],[92,'HDMI sintetis',5]]) db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,`TEST-${id}`,name,'portabel','unit',total);
  assert.equal(loanSchemaState(db),'pending');
  db.exec('BEGIN');migrateLoanSchema(db);db.exec('COMMIT');
  const auth=new AuthService(db);sessions={};
  for(const [role,email] of [['student','mahasiswa@smartlend.test'],['admin','admin@smartlend.test'],['warehouse','petugas@smartlend.test'],['second','kedua@smartlend.test']]){
    const session=auth.login(email,passwords[role==='second'?'student':role],role==='second'?'student':role);
    sessions[role]={cookie:`sid=${session.token}`,csrf:session.csrf};
  }
  originalAccounts=db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all();
  originalInventory=db.prepare('SELECT * FROM barang ORDER BY id_barang').all();
  server=makeServer(db,origin);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();});

test('AC-06/16/18: anonim, role lain, CSRF dan Origin tidak dapat membuat/membaca transaksi mahasiswa',async()=>{
  for(const [session,status] of [[null,401],[sessions.admin,403],[sessions.warehouse,403]]){
    assert.equal((await post(valid(),{session})).status,status);
    assert.equal((await get('/api/loans/mine',session)).status,status);
    assert.equal((await get('/api/loans/1',session)).status,status);
  }
  for(const headers of [{'X-CSRF-Token':''},{Origin:'https://evil.example'},{'Content-Type':'text/plain'}]) assert.equal((await post(valid(),{headers})).status,403);
  assert.deepEqual(counts(),{header:0,details:0});
});

const invalidCases = [
  ['rencana kosong',input=>({...input,items:[]})],
  ['jumlah nol',input=>({...input,items:[{itemId:91,quantity:0}]})],
  ['jumlah negatif',input=>({...input,items:[{itemId:91,quantity:-1}]})],
  ['jumlah pecahan',input=>({...input,items:[{itemId:91,quantity:1.5}]})],
  ['jumlah string',input=>({...input,items:[{itemId:91,quantity:'2'}]})],
  ['jumlah terlalu besar',input=>({...input,items:[{itemId:91,quantity:Number.MAX_SAFE_INTEGER}]})],
  ['melebihi stok',input=>({...input,items:[{itemId:91,quantity:4}]})],
  ['barang tidak dikenal',input=>({...input,items:[{itemId:999,quantity:1}]})],
  ['ID string',input=>({...input,items:[{itemId:'91',quantity:1}]})],
  ['ID duplikat',input=>({...input,items:[{itemId:91,quantity:1},{itemId:91,quantity:2}]})],
  ['waktu lampau',input=>({...input,startsAt:new Date(Date.now()-60000).toISOString()})],
  ['kembali sebelum mulai',input=>({...input,endsAt:new Date(Date.parse(input.startsAt)-60000).toISOString()})],
  ['mulai sama selesai',input=>({...input,endsAt:input.startsAt})],
  ['waktu tidak valid',input=>({...input,startsAt:'2028-02-30T01:00:00.000Z'})],
  ['waktu tanpa zona',input=>({...input,startsAt:'2028-01-01T10:00'})],
  ['keperluan kosong',input=>({...input,reason:'  '})],
  ['keperluan terlalu panjang',input=>({...input,reason:'A'.repeat(151)})],
  ['spoof peminjam',input=>({...input,id_peminjam:4})],
  ['spoof userId',input=>({...input,userId:4})],
  ['spoof status',input=>({...input,status:'disetujui'})],
  ['field detail asing',input=>({...input,items:[{itemId:91,quantity:1,stock:100}]})],
  ['payload null',()=>null],
  ['payload array',()=>[]],
];
for(const [label,change] of invalidCases) test(`AC-04/07/08: backend menolak ${label}, tanpa data parsial`,async()=>{
  const before=counts(),response=await post(change(valid()));
  assert.equal(response.status,400,label);assert.deepEqual(counts(),before);
  const text=JSON.stringify(await response.json());assert.ok(!/stack|password_hash|token_hash/.test(text));
});
test('JSON rusak, payload besar, jumlah jenis request dan key invalid ditolak',async()=>{
  const before=counts();
  assert.equal((await post(null,{raw:'{"items":'})).status,400);
  assert.equal((await post(valid(),{raw:' '.repeat(17000)})).status,413);
  assert.equal((await post({...valid(),items:Array.from({length:101},(_,i)=>({itemId:i+1,quantity:1}))})).status,400);
  assert.equal((await post(valid(),{key:'not-a-key'})).status,400);
  assert.equal((await post(valid(),{headers:{'Idempotency-Key':''}})).status,400);
  assert.deepEqual(counts(),before);
});
test('AC-05/10/11/12/14/16: commit multi-barang, pemilik sesi, nomor/status backend, daftar/detail privat',async()=>{
  const input=valid(),before=counts(),response=await post(input);
  assert.equal(response.status,201);
  const {loan,replayed}=await response.json();assert.equal(replayed,false);
  assert.equal(loan.status,'menunggu');assert.equal(loan.totalTypes,2);assert.equal(loan.totalUnits,3);
  assert.deepEqual(loan.items.map(item=>[item.itemId,item.quantity]),[[91,2],[92,1]]);
  assert.equal(loan.borrower.name,'Mahasiswa Uji');assert.ok(loan.createdAt.endsWith('Z'));
  const header=db.prepare('SELECT * FROM peminjaman WHERE id_peminjaman=?').get(loan.id);
  assert.equal(header.id_peminjam,1);assert.equal(header.id_admin,null);assert.equal(header.kode_peminjaman,`SL-${loan.id}`);
  assert.deepEqual(counts(),{header:before.header+1,details:before.details+2});
  assert.deepEqual((await (await get(`/api/loans/${loan.id}`)).json()).loan,loan);
  assert.equal((await get(`/api/loans/${loan.id}`,sessions.second)).status,404);
  assert.equal((await get('/api/loans/999999')).status,404);
  assert.deepEqual((await (await get('/api/loans/mine',sessions.second)).json()).loans,[]);
  const other=await (await post({...valid(),items:[{itemId:92,quantity:1}]},{session:sessions.second})).json();
  assert.notEqual(other.loan.id,loan.id);assert.notEqual(other.loan.number,loan.number);
  assert.equal((await get(`/api/loans/${other.loan.id}`)).status,404);
  const mine=(await (await get('/api/loans/mine')).json()).loans;
  assert.ok(mine.some(item=>item.id===loan.id)&&!mine.some(item=>item.id===other.loan.id));
  assert.deepEqual(db.prepare('SELECT * FROM barang ORDER BY id_barang').all(),originalInventory);
  assert.deepEqual(db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all(),originalAccounts);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
});
test('AC-13: request paralel/retry berkunci sama satu transaksi; key sama data berbeda 409',async()=>{
  const key=randomUUID(),input=valid(),before=counts();
  const responses=await Promise.all(Array.from({length:8},()=>post(input,{key})));
  assert.equal(responses.filter(response=>response.status===201).length,1);
  assert.equal(responses.filter(response=>response.status===200).length,7);
  const data=await Promise.all(responses.map(response=>response.json()));assert.equal(new Set(data.map(result=>result.loan.id)).size,1);
  assert.deepEqual(counts(),{header:before.header+1,details:before.details+2});
  const changed=await post({...input,reason:'Berbeda'},{key});assert.equal(changed.status,409);
  const reordered=await post({...input,items:[...input.items].reverse()},{key});assert.equal(reordered.status,200);
  // Key scoped per peminjam, bukan bocor/replay transaksi peminjam lain.
  const second=await post(input,{key,session:sessions.second});assert.equal(second.status,201);
  assert.notEqual((await second.json()).loan.id,data[0].loan.id);
});
test('retry tetap mengembalikan commit lama meskipun waktu mulai kemudian terlewati',()=>{
  const service=new LoanService(db),key=randomUUID(),input=valid();
  const first=service.create(1,key,input);
  const realNow=Date.now;
  try {Date.now=()=>Date.parse(input.endsAt)+86400000;assert.equal(service.create(1,key,input).loan.id,first.loan.id);assert.throws(()=>service.create(1,randomUUID(),input),/Periksa data/);}
  finally {Date.now=realNow;}
});
test('AC-09/14: kegagalan detail kedua rollback header, detail pertama dan key; retry aman',async()=>{
  const before=counts(),input=valid(),key=randomUUID();
  db.exec("CREATE TRIGGER test_loan_failure BEFORE INSERT ON detail_barang WHEN NEW.id_barang=92 BEGIN SELECT RAISE(ABORT,'uji gagal detail'); END");
  try {
    const response=await post(input,{key});assert.equal(response.status,500);
    assert.equal((await response.json()).error,'Kesalahan internal server.');assert.deepEqual(counts(),before);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM peminjaman WHERE request_key=?').get(key).n,0);
  }finally{db.exec('DROP TRIGGER test_loan_failure');}
  assert.equal((await post(input,{key})).status,201);
});
test('constraint PK detail, FK, status, jumlah positif dan unique request database tetap aktif',()=>{
  const loan=new LoanService(db).create(1,randomUUID(),valid()).loan;
  assert.throws(()=>db.prepare('INSERT INTO detail_barang VALUES(?,?,?)').run(loan.id,91,1));
  assert.throws(()=>db.prepare('INSERT INTO detail_barang VALUES(?,?,?)').run(999999,91,1));
  assert.throws(()=>db.prepare('UPDATE detail_barang SET jumlah=0 WHERE id_peminjaman=?').run(loan.id));
  assert.throws(()=>db.prepare("UPDATE peminjaman SET status='approved' WHERE id_peminjaman=?").run(loan.id));
  const existing=db.prepare('SELECT * FROM peminjaman WHERE id_peminjaman=?').get(loan.id);
  assert.throws(()=>db.prepare('INSERT INTO peminjaman SELECT id_peminjaman+100000,kode_peminjaman||?,id_peminjam,id_admin,waktu_mulai,waktu_selesai,keperluan,status,dibuat_pada,request_key,request_hash FROM peminjaman WHERE id_peminjaman=?').run('X',loan.id));
  assert.equal(db.prepare('SELECT request_key FROM peminjaman WHERE id_peminjaman=?').get(loan.id).request_key,existing.request_key);
});
test('logout menginvalidasi sesi untuk POST dan GET pengajuan',async()=>{
  const response=await fetch(url+'/api/logout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:sessions.second.cookie,'X-CSRF-Token':sessions.second.csrf},body:'{}'});
  assert.equal(response.status,200);assert.equal((await post(valid(),{session:sessions.second})).status,401);assert.equal((await get('/api/loans/mine',sessions.second)).status,401);
});
test('WIB eksplisit, tanggal invalid, tanpa kebijakan maksimum durasi dan clear draft selektif',()=>{
  assert.equal(jakartaToUtc('2030-01-02T10:30'),'2030-01-02T03:30:00.000Z');
  assert.equal(jakartaToUtc('2030-02-30T10:30'),'');
  assert.equal(jakartaToUtc('2030-01-01T25:00'),'');
  const input=valid();assert.deepEqual(validateLoan({...input,endsAt:'2099-01-01T00:00:00.000Z'}),{});
  assert.deepEqual(removeSubmittedPlan({91:3,92:1,93:2},[{itemId:91,quantity:2},{itemId:92,quantity:1}]),{91:3,93:2});
});
test('AC-15/21: file SQLite terpisah tetap menyimpan pengajuan setelah close/reopen; migrasi aditif/rollback',()=>{
  const folder=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-loans-db-')),file=join(folder,'loans.disposable.sqlite');
  let local=openDb(file);
  try {
    local.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,?)').run(1,'Peminjam Sintetis','sintetis@smartlend.test','hash-fixture-tidak-untuk-login','mahasiswa',1);
    local.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(91,'TEST-91','Barang Sintetis','portabel','unit',3);
    local.prepare('INSERT INTO peminjaman VALUES(?,?,?,?,?,?,?,?)').run(40,'LEGACY-40',1,null,'2030-01-01','2030-01-02','Data lama','menunggu');
    const old=local.prepare('SELECT * FROM peminjaman').get();
    local.exec('BEGIN');migrateLoanSchema(local);local.exec('ROLLBACK');assert.equal(loanSchemaState(local),'pending');
    local.exec('BEGIN');assert.equal(migrateLoanSchema(local),true);local.exec('COMMIT');assert.equal(migrateLoanSchema(local),false);
    const migrated=local.prepare('SELECT * FROM peminjaman WHERE id_peminjaman=40').get();
    for(const [key,value] of Object.entries(old))assert.equal(migrated[key],value);
    assert.equal(migrated.dibuat_pada,null);
    const result=new LoanService(local).create(1,randomUUID(),{...valid(),items:[{itemId:91,quantity:1}]});
    assert.equal(result.loan.id,41);
    local.close();local=new DatabaseSync(file,{readOnly:true});
    assert.deepEqual(new LoanService(local).detail(1,41),result.loan);
    console.log(`Contoh sintetis: ${result.loan.number}, ${result.loan.borrower.name}, TEST-91 x1, ${result.loan.startsAt} – ${result.loan.endsAt}, ${result.loan.status}; baca ulang identik.`);
  }finally{local.close();}
});
test('migrasi eksplisit memverifikasi identitas, backup WAL, tidak mengubah data, dan idempotent',()=>{
  const path=resolve('database/disposable',`accounts-loan-migration-test-${randomUUID()}.disposable.sqlite`);
  const fixture=openDb(path);
  try {
    seed(fixture,Object.fromEntries(['student','admin','warehouse'].map(role=>[role,randomBytes(24).toString('base64url')])));
    for(const [id,code,name,stock] of [[9001,'UJI-PRJ-01','Proyektor (Uji)',3],[9002,'UJI-HDM-01','Kabel HDMI (Uji)',5],[9003,'UJI-SPK-01','Speaker Portable (Uji)',2]]) fixture.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,code,name,'portabel','unit',stock);
    appendInventory(fixture);
    const before=fingerprint(fixture);
    assert.equal(enableLoanSubmissions({database:path}).state,'pending');assert.deepEqual(fingerprint(fixture),before);
    assert.throws(()=>enableLoanSubmissions({database:path,apply:true}),/Konfirmasi/);
    assert.throws(()=>enableLoanSubmissions({database:resolve('database/schema.sqlite.sql'),apply:true,confirmation:'ENABLE_LOAN_SUBMISSIONS'}),/Target/);
    const result=enableLoanSubmissions({database:path,apply:true,confirmation:'ENABLE_LOAN_SUBMISSIONS'});
    assert.equal(result.changed,true);
    const backup=new DatabaseSync(result.backup,{readOnly:true});
    try {assert.deepEqual(fingerprint(backup),before);}finally{backup.close();}
    const after=fingerprint(fixture);
    assert.notEqual(after.schemaHash,before.schemaHash);
    assert.deepEqual(after.tables,before.tables,'Data seluruh tabel identik, hanya schema aditif');
    assert.equal(enableLoanSubmissions({database:path,apply:true,confirmation:'ENABLE_LOAN_SUBMISSIONS'}).changed,false);
    assert.deepEqual(fingerprint(fixture),after);
  }finally{fixture.close();}
});
test('koneksi SQLite lintas proses: key sama satu commit, nomor request berbeda tetap unik',async()=>{
  const folder=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-loan-concurrency-')),file=join(folder,'concurrent.disposable.sqlite');
  const fixture=openDb(file);
  try {
    fixture.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,?)').run(1,'Sintetis Paralel','paralel@smartlend.test','fixture-tidak-untuk-login','mahasiswa',1);
    for(const id of [91,92])fixture.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,`C-${id}`,'Barang Sintetis','portabel','unit',10);
    fixture.exec('BEGIN');migrateLoanSchema(fixture);fixture.exec('COMMIT');
    const payload=JSON.stringify(valid());
    const code="import {DatabaseSync} from 'node:sqlite';import {LoanService} from './backend/loans.mjs';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');try{const r=new LoanService(db).create(1,process.argv[2],JSON.parse(process.argv[3]));console.log(JSON.stringify({id:r.loan.id,replayed:r.replayed}));}finally{db.close();}";
    const run=key=>new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['--input-type=module','-e',code,file,key,payload],{stdio:['ignore','pipe','pipe']});let output='',error='';
      child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{error+=chunk;});child.on('error',reject);child.on('exit',status=>{if(status)reject(Error(error));else{try{resolve(JSON.parse(output));}catch(failure){reject(failure);}}});
    });
    const key=randomUUID(),same=await Promise.all([run(key),run(key),run(key)]);
    assert.equal(new Set(same.map(result=>result.id)).size,1);assert.equal(same.filter(result=>!result.replayed).length,1);
    const different=await Promise.all([run(randomUUID()),run(randomUUID()),run(randomUUID())]);
    assert.equal(new Set([...same,...different].map(result=>result.id)).size,4);
    assert.equal(fixture.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n,4);
    assert.equal(fixture.prepare('SELECT COUNT(*) AS n FROM detail_barang').get().n,8);
    assert.equal(fixture.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{fixture.close();}
});
test('schema lama tidak dimigrasi otomatis oleh service; fitur memberi 503 sampai migrasi eksplisit',()=>{
  const fixture=openDb(':memory:');
  try {
    const before=fingerprint(fixture);
    assert.throws(()=>new LoanService(fixture).mine(1),error=>error.status===503);
    assert.deepEqual(fingerprint(fixture),before);
  }finally{fixture.close();}
});
