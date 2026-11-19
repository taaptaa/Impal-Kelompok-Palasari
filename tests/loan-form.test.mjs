// Optional full-form contract. DRAFT DDL is applied only to fresh memory/temp DBs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from '../backend/db.mjs';
import { migrateLoanSchema, loanSchemaState } from '../backend/loan-schema.mjs';
import { LoanService } from '../backend/loans.mjs';
import { LoanReadService } from '../backend/loan-reads.mjs';
import { loanFormOptions, loanFormState } from '../backend/loan-form.mjs';
import { SessionRepository } from '../backend/auth.mjs';
import { makeServer } from '../backend/server.mjs';
import { emptyFormDetails, validateFormDetails, validSavedFormDetails } from '../src/app/loan-form-validation.mjs';

const ddl=readFileSync(new URL('../database/proposals/003-loan-form.DRAFT.sql',import.meta.url),'utf8');
const details=()=>({...emptyFormDetails(),phone:'+628123456789',borrowerIdentifier:'UJI-ID-01',unit:'Unit Sintetis',activityName:'Kegiatan Sintetis',activityLocation:'Lokasi Sintetis',activityDescription:'Deskripsi uji, bukan kegiatan kampus nyata.',acknowledgement:{version:'submission-info-v1',accepted:true}});
const input=()=>({items:[{itemId:91,quantity:1},{itemId:92,quantity:2}],startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+172800000).toISOString(),reason:'Keperluan existing tidak digabung dengan field lain',details:details()});
function setup(path=':memory:') {
  const db=openDb(path);
  db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(1,'Mahasiswa Sintetis','student@example.test','not-a-login-hash','mahasiswa');
  db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(2,'Admin Sintetis','admin@example.test','not-a-login-hash','admin');
  db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(3,'Petugas Sintetis','warehouse@example.test','not-a-login-hash','petugas');
  db.exec("INSERT INTO barang VALUES(91,'TEST-91','Barang A','portabel','unit',3),(92,'TEST-92','Barang B','portabel','unit',5)");
  db.exec('BEGIN');migrateLoanSchema(db);db.exec('COMMIT');return db;
}
const counts=db=>['peminjaman','detail_barang','informasi_pengajuan'].map(table=>db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n);

test('Absent schema: optional fields BLOCKED, base contract still works, no automatic DDL',()=>{
  const db=setup();try {
    const before=db.prepare('SELECT sql FROM sqlite_schema ORDER BY name').all();
    assert.equal(loanFormState(db),'absent');assert.equal(loanFormOptions(db).additionalFields,false);
    assert.throws(()=>new LoanService(db).create(1,randomUUID(),input()),error=>error.status===503);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM peminjaman').get().n,0);
    const {details:unused,...base}=input();const saved=new LoanService(db).create(1,randomUUID(),base).loan;
    assert.equal('details' in saved,false);assert.equal(saved.reason,base.reason);
    assert.deepEqual(db.prepare('SELECT sql FROM sqlite_schema ORDER BY name').all(),before);
  }finally{db.close();}
});
test('DRAFT additive side table preserves legacy rows/profile/hash replay; old receipts have no invented details',()=>{
  const db=setup();try {
    const {details:unused,...base}=input(),key=randomUUID(),service=new LoanService(db),saved=service.create(1,key,base).loan;
    const old=db.prepare('SELECT * FROM peminjaman').all(),stock=db.prepare('SELECT * FROM barang').all();
    db.exec('BEGIN');db.exec(ddl);db.exec('COMMIT');
    assert.equal(loanSchemaState(db),'ready');assert.equal(loanFormState(db),'ready');
    assert.deepEqual(db.prepare('SELECT * FROM peminjaman').all(),old);assert.deepEqual(db.prepare('SELECT * FROM barang').all(),stock);
    assert.deepEqual(service.create(1,key,base),{loan:saved,replayed:true});assert.equal(counts(db)[2],0);
    assert.equal('details' in new LoanReadService(db).detail(saved.id).loan,false);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{db.close();}
});
test('Full form persists atomically, read-back owner/Admin, timestamp server, all fields covered by idempotency',()=>{
  const db=setup();try {
    db.exec(ddl);const service=new LoanService(db),data=input(),key=randomUUID();
    const before=Date.now(),created=service.create(1,key,data),saved=created.loan;
    assert.equal(created.replayed,false);assert.deepEqual(counts(db),[1,2,1]);assert.equal(saved.status,'menunggu');assert.equal(saved.reason,data.reason);
    assert.equal(validSavedFormDetails(saved.details),true);assert.ok(Date.parse(saved.details.acknowledgedAt)>=before);assert.deepEqual(saved.details,{...data.details,acknowledgedAt:saved.details.acknowledgedAt});
    assert.deepEqual(service.create(1,key,data),{loan:saved,replayed:true});
    assert.throws(()=>service.create(1,key,{...data,details:{...data.details,activityLocation:'Different'}}),error=>error.status===409);
    assert.deepEqual(service.detail(1,saved.id),saved);assert.deepEqual(new LoanReadService(db).detail(saved.id).loan.details,saved.details);
    assert.equal(new LoanReadService(db).stats(new URLSearchParams()).total,1);assert.deepEqual(db.prepare('SELECT stok_total FROM barang ORDER BY id_barang').all().map(row=>row.stok_total),[3,5]);
    const publicData=new LoanReadService(db).schedule(new URLSearchParams({itemId:'91',startsAt:data.startsAt,endsAt:data.endsAt}));
    assert.equal(publicData.availability.availableQuantity,null);assert.equal(JSON.stringify(publicData).includes(data.details.phone),false);assert.equal(JSON.stringify(publicData).includes(data.details.activityName),false);
  }finally{db.close();}
});
test('Validation rejects invalid phone, oversize/controls, forged identity/category/documents/time and missing acknowledgement',()=>{
  for(const changed of [null,{...details(),phone:'abc'},{...details(),phone:'1234567'},{...details(),unit:'a'.repeat(121)},{...details(),borrowerIdentifier:'A\nB'},{...details(),activityName:' '},{...details(),activityLocation:'x\u0000y'},{...details(),activityDescription:'x'.repeat(1001)},{...details(),userId:2},{...details(),category:'admin'},{...details(),document:'evil.pdf'},{...details(),acknowledgedAt:new Date().toISOString()},{...details(),acknowledgement:{version:'legal-v1',accepted:true}},{...details(),acknowledgement:{version:'submission-info-v1',accepted:'true'}},{...details(),acknowledgement:{version:'submission-info-v1',accepted:false}}])assert.ok(Object.keys(validateFormDetails(changed)).length);
  const db=setup();try {db.exec(ddl);for(const d of [{...details(),phone:'bad'},{...details(),borrowerId:2},{...details(),acknowledgement:{version:'submission-info-v1',accepted:false}}])assert.throws(()=>new LoanService(db).create(1,randomUUID(),{...input(),details:d}),error=>error.status===400);assert.deepEqual(counts(db),[0,0,0]);}finally{db.close();}
});
test('Metadata failure rolls back header, all item details and key; retry succeeds once',()=>{
  const db=setup();try {
    db.exec(ddl);db.exec("CREATE TRIGGER fail_form BEFORE INSERT ON informasi_pengajuan BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
    const service=new LoanService(db),data=input(),key=randomUUID();assert.throws(()=>service.create(1,key,data));assert.deepEqual(counts(db),[0,0,0]);
    db.exec('DROP TRIGGER fail_form');assert.equal(service.create(1,key,data).replayed,false);assert.deepEqual(counts(db),[1,2,1]);
  }finally{db.close();}
});
test('Schema drift is fail-closed and never creates partial extended submissions',()=>{
  const db=setup();try {db.exec('CREATE TABLE informasi_pengajuan(id_peminjaman INTEGER PRIMARY KEY, telepon TEXT)');assert.equal(loanFormState(db),'invalid');assert.equal(loanFormOptions(db).additionalFields,false);assert.throws(()=>new LoanService(db).create(1,randomUUID(),input()),error=>error.status===503);assert.equal(db.prepare('SELECT COUNT(*) n FROM peminjaman').get().n,0);}finally{db.close();}
});
test('HTTP: capability access, CSRF/Origin/role, identity spoof, IDOR and private stored metadata',async()=>{
  const db=setup();db.exec(ddl);const sessions=new SessionRepository(db),student=sessions.create(1),admin=sessions.create(2),warehouse=sessions.create(3);
  const server=makeServer(db);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const get=(path,s)=>fetch(base+path,{headers:s?{Cookie:`sid=${s.token}`}:{}});
  const post=(body,s=student,headers={})=>fetch(base+'/api/loans',{method:'POST',headers:{Cookie:`sid=${s.token}`,Origin:'http://127.0.0.1:3000','Content-Type':'application/json','X-CSRF-Token':s.csrf,'Idempotency-Key':randomUUID(),...headers},body:JSON.stringify(body)});
  try {
    assert.equal((await get('/api/loans/form-options')).status,401);assert.equal((await get('/api/loans/form-options',admin)).status,403);assert.equal((await get('/api/loans/form-options',warehouse)).status,403);assert.equal((await(await get('/api/loans/form-options',student)).json()).additionalFields,true);
    assert.equal((await post(input(),student,{'X-CSRF-Token':'bad'})).status,403);assert.equal((await post(input(),student,{Origin:'http://evil.test'})).status,403);assert.equal((await post(input(),admin)).status,403);assert.equal((await post({...input(),userId:2})).status,400);
    const response=await post(input());assert.equal(response.status,201);const saved=(await response.json()).loan;
    assert.equal((await(await get(`/api/loans/${saved.id}`,student)).json()).loan.borrower.email,'student@example.test');
    assert.equal((await(await get(`/api/admin/loans/${saved.id}`,admin)).json()).loan.details.activityName,'Kegiatan Sintetis');
    db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(4,'Other','other@example.test','not-a-login-hash','mahasiswa');const other=sessions.create(4);
    assert.equal((await get(`/api/loans/${saved.id}`,other)).status,404);
    assert.deepEqual((await(await get('/api/loans/mine',other)).json()).loans,[]);
    assert.equal((await get(`/api/admin/loans/${saved.id}`,student)).status,403);
    assert.equal((await(await get('/api/admin/loans/readiness',admin)).json()).decisions.rejection.state,'BLOCKED');
  }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});
test('File reopen + separate-process concurrent retry yields one extended receipt, stock intact',async()=>{
  const dir=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-form-contract-')),file=join(dir,'form.disposable.sqlite');
  const db=setup(file);db.exec(ddl);db.close();const data=input(),key=randomUUID();
  const script=`import {DatabaseSync} from 'node:sqlite';import {LoanService} from './backend/loans.mjs';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');try{const r=new LoanService(db).create(1,process.argv[2],JSON.parse(process.argv[3]));console.log(JSON.stringify({id:r.loan.id,replayed:r.replayed}));}finally{db.close();}`;
  const worker=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',script,file,key,JSON.stringify(data)],{stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',chunk=>out+=chunk);child.stderr.on('data',chunk=>err+=chunk);child.on('error',reject);child.on('exit',code=>code?reject(Error(err)):resolve(JSON.parse(out)));});
  const results=await Promise.all([worker(),worker()]);assert.equal(results[0].id,results[1].id);assert.equal(results.filter(result=>!result.replayed).length,1);
  const reopened=new DatabaseSync(file,{readOnly:true});try {assert.deepEqual(counts(reopened),[1,2,1]);assert.equal(new LoanService(reopened).detail(1,results[0].id).details.activityName,data.details.activityName);assert.equal(reopened.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(reopened.prepare('PRAGMA foreign_key_check').all().length,0);}finally{reopened.close();}
});
