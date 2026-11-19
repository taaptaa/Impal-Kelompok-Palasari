import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { openDb } from '../backend/db.mjs';
import { SessionRepository, digest } from '../backend/auth.mjs';
import { migrateLoanSchema } from '../backend/loan-schema.mjs';
import { LoanReadService, LOAN_STATUSES, recordedSegments } from '../backend/loan-reads.mjs';
import { makeServer } from '../backend/server.mjs';

// Seluruh akun, inventaris dan transaksi di file ini SINTETIS, hanya DB memori
// atau file disposable baru. Tidak membuka/memutasi DB_PATH maupun target pemilik.
const origin='http://127.0.0.1:3000';
const t=hour=>new Date(Date.UTC(2030,0,2)+hour*3600000).toISOString();
const query=values=>new URLSearchParams(values).toString();
function fixture(db,migrated=true) {
  for (const [id,role] of [[1,'mahasiswa'],[2,'mahasiswa'],[3,'admin'],[4,'petugas']]) {
    db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(id,`PRIVATE-NAME-${id}`,`private-${id}@synthetic.test`,'test-no-login',role);
  }
  for (const id of [91,92,93]) db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,`SYNTH-${id}`,`Barang sintetis ${id}`,'portabel','unit',10);
  for (const id of [71,72]) db.prepare('INSERT INTO ruangan VALUES(?,?,?,?,?,?)').run(id,`SYNTH-ROOM-${id}`,`Ruang sintetis ${id}`,20,'Lokasi sintetis',id===71?'aktif':'perawatan');
  if (migrated) {db.exec('BEGIN');migrateLoanSchema(db);db.exec('COMMIT');}
  const rows=[
    [10,'menunggu',1,1,5,[[91,10]]],
    [11,'disetujui',1,2,4,[[91,2],[92,1]]],
    [12,'dipinjam',2,3,5,[[91,1]]],
    [13,'selesai',1,2,6,[[91,4]]],
    [14,'ditolak',2,0,8,[[91,7]]],
    [15,'dibatalkan',1,0,8,[[91,8]]],
    [16,'disetujui',2,5,7,[]],
    [17,'disetujui',1,6,8,[[91,3]]],
    [18,'disetujui',1,8,9,[[91,3]]],
    [19,'menunggu',2,25,26,[[92,2]]],
    [20,'disetujui',1,10,11,[[91,1]]]
  ];
  for (const [id,status,user,start,end,items] of rows) {
    db.prepare(`INSERT INTO peminjaman(id_peminjaman,kode_peminjaman,id_peminjam,id_admin,waktu_mulai,waktu_selesai,keperluan,status)
      VALUES(?,?,?,?,?,?,?,?)`).run(id,`PRIVATE-NUMBER-${id}`,user,status==='menunggu'?null:3,
        id===20?'2030-01-02 10:00:00':t(start),id===20?'2030-01-02 11:00:00':t(end),`PRIVATE-REASON-${id}`,status);
    for (const [item,quantity] of items) db.prepare('INSERT INTO detail_barang VALUES(?,?,?)').run(id,item,quantity);
  }
  db.prepare('INSERT INTO detail_ruangan VALUES(?,?,?)').run(11,71,10);
  db.prepare('INSERT INTO detail_ruangan VALUES(?,?,?)').run(16,71,12);
  // Tidak boleh ikut dihitung sebagai booking langsung tanpa kebijakan disepakati.
  db.prepare('INSERT INTO fasilitas_ruangan VALUES(?,?,?)').run(71,92,2);
  const sessions={};
  for (const [role,id] of [['student',1],['second',2],['admin',3],['warehouse',4]]) {
    const session=new SessionRepository(db).create(id);
    sessions[role]={...session,cookie:`sid=${session.token}`};
  }
  return sessions;
}
async function start(db) {
  const server=makeServer(db,origin);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,url:`http://127.0.0.1:${server.address().port}`};
}
const stop=server=>new Promise(resolve=>server.close(resolve));
function contents(db) {
  return Object.fromEntries(db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='table' ORDER BY name").all()
    .map(({name,sql})=>[name,{sql,rows:db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()}]));
}
let db,server,url,sessions;
before(async()=>{db=openDb(':memory:');sessions=fixture(db);({server,url}=await start(db));});
after(async()=>{await stop(server);db.close();});
const get=(path,session=sessions.admin)=>fetch(url+path,{headers:{Cookie:session?.cookie||''}});
const adminJson=async path=>{const response=await get(path);assert.equal(response.status,200);return response.json();};
const schedulePath=values=>'/api/schedule?'+query({startsAt:t(0),endsAt:t(12),itemId:91,...values});
const decide=(id,action,{session=sessions.admin,headers={},method='POST'}={})=>fetch(url+`/api/admin/loans/${id}/${action}`,{
  method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:session?.cookie||'','X-CSRF-Token':session?.csrf||'',...headers},
  ...(method==='POST'?{body:'{}'}:{})});

test('Admin: seluruh endpoint dilindungi sesi dan role; jadwal tetap publik',async()=>{
  for (const path of ['/api/admin/loans','/api/admin/loans/11','/api/admin/loans/stats','/api/admin/loans/readiness']) {
    for (const [session,status] of [[null,401],[sessions.student,403],[sessions.second,403],[sessions.warehouse,403]]) {
      assert.equal((await get(path,session)).status,status,path);
    }
  }
  for (const session of [null,sessions.student,sessions.warehouse,sessions.admin]) assert.equal((await get(schedulePath(),session)).status,200);
});
test('Admin: daftar terpagina, detail barang+ruangan nyata, dan tanpa kredensial',async()=>{
  const before=contents(db),data=await adminJson('/api/admin/loans?limit=2&offset=1');
  assert.deepEqual(data.pagination,{total:11,limit:2,offset:1,hasMore:true});
  assert.deepEqual(data.loans.map(loan=>loan.id),[19,18]);
  assert.equal((await adminJson('/api/admin/loans?offset=100')).loans.length,0);
  const {loan,decisions}=await adminJson('/api/admin/loans/11');
  assert.equal(loan.borrower.id,1);assert.equal(loan.admin.id,3);assert.equal(loan.status,'disetujui');
  assert.equal(loan.totalTypes,2);assert.equal(loan.totalUnits,3);assert.equal(loan.room.roomId,71);
  assert.equal(loan.room.participants,10);assert.equal(loan.createdAt,null);
  assert.equal(decisions.approval.state,'BLOCKED');
  assert.equal((await get('/api/admin/loans/999999')).status,404);
  assert.equal((await get('/api/admin/loans/9007199254740993')).status,404);
  assert.doesNotMatch(JSON.stringify(data),/password|request_hash|request_key|token_hash|csrf/);
  assert.deepEqual(contents(db),before);
});
test('Statistik memakai enam status terpisah, header tidak terduplikasi oleh multi-detail',async()=>{
  const data=await adminJson('/api/admin/loans/stats');
  assert.equal(data.total,11);
  assert.deepEqual(data.byStatus,{menunggu:2,disetujui:5,dipinjam:1,selesai:1,ditolak:1,dibatalkan:1});
  assert.equal(data.itemUnitsByStatus.disetujui,10);assert.equal(data.itemUnitsByStatus.menunggu,12);
  assert.equal(data.roomLoansByStatus.disetujui,2);
  for (const status of LOAN_STATUSES) {
    const filter='?'+query({status}),list=await adminJson('/api/admin/loans'+filter),stats=await adminJson('/api/admin/loans/stats'+filter);
    assert.equal(stats.total,list.pagination.total);
    assert.ok(list.loans.every(loan=>loan.status===status));
    assert.equal(Object.values(stats.byStatus).filter(n=>n>0).length,1);
  }
});
test('Filter overlap [mulai,selesai), legacy SQL DATETIME, barang, ruangan dan kombinasi konsisten',async()=>{
  for (const [filter,ids] of [
    [{startsAt:t(4),endsAt:t(6)},[16,15,14,13,12,10]],
    [{status:'disetujui',startsAt:t(4),endsAt:t(6)},[16]],
    [{startsAt:t(10),endsAt:t(11)},[20]],
    [{roomId:71},[16,11]],
    [{roomId:71,itemId:91},[11]],
    [{itemId:93},[]]
  ]) {
    const suffix='?'+query(filter),list=await adminJson('/api/admin/loans'+suffix),stats=await adminJson('/api/admin/loans/stats'+suffix);
    assert.deepEqual(list.loans.map(loan=>loan.id),ids);
    assert.equal(stats.total,ids.length);
  }
});
test('Parameter asing/berulang, status palsu, SQL injection, angka dan tanggal invalid ditolak',async()=>{
  const invalid=[{status:'approved'},{status:"menunggu' OR 1=1 --"},{limit:0},{limit:101},{offset:-1},{itemId:'1.5'},
    {roomId:'1e2'},{itemId:'9007199254740993'},{startsAt:t(1)},{startsAt:t(1),endsAt:t(1)},
    {startsAt:'2030-02-30T00:00:00.000Z',endsAt:t(2)},{startsAt:'2030-01-02',endsAt:t(2)},{userId:1}];
  for (const value of invalid) assert.equal((await get('/api/admin/loans?'+query(value))).status,400,JSON.stringify(value));
  assert.equal((await get('/api/admin/loans?status=menunggu&status=disetujui')).status,400);
  assert.equal((await get('/api/admin/loans/stats?limit=1')).status,400);
});
test('Jadwal publik hanya segmen agregat approved/borrowed, bukan PII, ID pengajuan atau availability',async()=>{
  const response=await get(schedulePath(),null),data=await response.json();
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('set-cookie'),null);
  assert.deepEqual(data.segments,[
    {startsAt:t(2),endsAt:t(3),recordedQuantity:2},
    {startsAt:t(3),endsAt:t(4),recordedQuantity:3},
    {startsAt:t(4),endsAt:t(5),recordedQuantity:1},
    {startsAt:t(6),endsAt:t(9),recordedQuantity:3},
    {startsAt:t(10),endsAt:t(11),recordedQuantity:1}
  ]);
  assert.equal(data.borrowedQuantityPendingReconciliation,1);
  assert.equal(data.availability.availableQuantity,null);assert.equal(data.availability.verification,'unverified');
  assert.equal(data.scope,'direct_details_only');
  assert.doesNotMatch(JSON.stringify(data),/PRIVATE|synthetic\.test|borrower|reason|request_key|token_hash|csrf|peminjaman|"status"|"number"/);
  assert.deepEqual(Object.keys(data.segments[0]).sort(),['endsAt','recordedQuantity','startsAt']);
  const clipped=await (await get(schedulePath({startsAt:t(4),endsAt:t(6)}),null)).json();
  assert.deepEqual(clipped.segments,[{startsAt:t(4),endsAt:t(5),recordedQuantity:1}]);
});
test('Jadwal kosong bukan tersedia; dipinjam lewat jadwal tetap ditandai belum direkonsiliasi',async()=>{
  for (const values of [{itemId:93},{startsAt:t(25),endsAt:t(26)}]) {
    const data=await (await get(schedulePath(values),null)).json();
    assert.deepEqual(data.segments,[]);assert.equal(data.availability.availableQuantity,null);
    if (!values.itemId) assert.equal(data.borrowedQuantityPendingReconciliation,1);
  }
  const room=await (await get('/api/schedule?'+query({startsAt:t(0),endsAt:t(12),roomId:71}),null)).json();
  assert.deepEqual(room.segments,[{startsAt:t(2),endsAt:t(4),recordedQuantity:1},{startsAt:t(5),endsAt:t(7),recordedQuantity:1}]);
  const maintenance=await (await get('/api/schedule?'+query({startsAt:t(0),endsAt:t(12),roomId:72}),null)).json();
  assert.equal(maintenance.resource.operationalStatus,'perawatan');assert.equal(maintenance.availability.availableQuantity,null);
});
test('Jadwal memvalidasi resource tunggal, periode wajib, batas teknis, dan tidak menerima filter status privat',async()=>{
  for (const values of [
    {},{startsAt:t(0),endsAt:t(12)},{startsAt:t(0),endsAt:t(12),itemId:91,roomId:71},
    {startsAt:t(0),endsAt:t(32*24),itemId:91},{startsAt:t(5),endsAt:t(4),itemId:91},
    {startsAt:t(0),endsAt:t(12),itemId:'0'},
    {startsAt:t(0),endsAt:t(12),itemId:91,status:'menunggu'}
  ]) assert.equal((await get('/api/schedule?'+query(values),null)).status,400);
  assert.equal((await get(schedulePath({itemId:999}),null)).status,404);
  assert.equal((await get(schedulePath()+'&itemId=92',null)).status,400);
  assert.equal((await fetch(url+schedulePath(),{method:'POST'})).status,405);
});
test('Sweep-line memakai beban serentak, clipping, nested, batas bersinggungan dan penggabungan segmen',()=>{
  assert.deepEqual(recordedSegments([{start:0,end:5,quantity:2},{start:5,end:10,quantity:2}],0,10),[
    {startsAt:new Date(0).toISOString(),endsAt:new Date(10).toISOString(),recordedQuantity:2}
  ]);
  assert.deepEqual(recordedSegments([{start:0,end:10,quantity:2},{start:3,end:6,quantity:3}],2,8).map(row=>row.recordedQuantity),[2,5,2]);
});
test('Approval/rejection fail-closed: autentikasi, CSRF, Origin, JSON dan tanpa efek samping meski serentak',async()=>{
  const before=contents(db);
  for (const action of ['approve','reject']) {
    for (const [session,status] of [[null,401],[sessions.student,403],[sessions.warehouse,403]]) assert.equal((await decide(11,action,{session})).status,status);
    for (const headers of [{'X-CSRF-Token':''},{Origin:'https://evil.example'},{'Content-Type':'text/plain'}]) assert.equal((await decide(11,action,{headers})).status,403);
    assert.equal((await decide(11,action,{method:'GET'})).status,405);
  }
  const results=await Promise.all(Array.from({length:16},(_,i)=>decide(11,i%2?'approve':'reject')));
  for (const response of results) {
    assert.equal(response.status,503);const data=await response.json();assert.equal(data.state,'BLOCKED');assert.ok(data.blockers.length);
  }
  assert.equal((await adminJson('/api/admin/loans/readiness')).decisions.approval.code,'APPROVAL_BLOCKED');
  assert.deepEqual(contents(db),before);
});
test('Gate keputusan menolak body JSON rusak/bukan objek/besar tanpa mengubah data',async()=>{
  const before=contents(db);
  for (const [body,status] of [['{',400],['null',400],['[]',400],[' '.repeat(4097),413]]) {
    const response=await fetch(url+'/api/admin/loans/11/approve',{method:'POST',headers:{Origin:origin,
      'Content-Type':'application/json',Cookie:sessions.admin.cookie,'X-CSRF-Token':sessions.admin.csrf},body});
    assert.equal(response.status,status);
  }
  assert.deepEqual(contents(db),before);
});
test('Peminjaman Saya membaca ulang seluruh status dari DB tanpa bocor antar peminjam',async()=>{
  const before=contents(db);
  db.exec('BEGIN');
  try {
    for (const status of LOAN_STATUSES) {
      db.prepare('UPDATE peminjaman SET status=? WHERE id_peminjaman=10').run(status);
      const detail=await (await get('/api/loans/10',sessions.student)).json();
      assert.equal(detail.loan.status,status);
      const mine=await (await get('/api/loans/mine',sessions.student)).json();
      assert.equal(mine.loans.find(loan=>loan.id===10).status,status);
      assert.equal((await get('/api/loans/10',sessions.second)).status,404);
    }
  } finally {db.exec('ROLLBACK');}
  assert.deepEqual(contents(db),before);
});
test('Read API berjalan pada schema baseline tanpa migrasi dan koneksi file readOnly',async()=>{
  const folder=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-readonly-'));
  const file=join(folder,'reads.disposable.sqlite');
  let local=openDb(file);const localSessions=fixture(local,false);const before=contents(local);local.close();
  local=new DatabaseSync(file,{readOnly:true});const running=await start(local);
  try {
    for (const path of ['/api/admin/loans','/api/admin/loans/11','/api/admin/loans/stats',schedulePath()]) {
      const response=await fetch(running.url+path,{headers:{Cookie:localSessions.admin.cookie}});assert.equal(response.status,200,path);
    }
    assert.deepEqual(contents(local),before);
  } finally {await stop(running.server);local.close();}
});
test('Jadwal gagal tertutup pada alokasi rusak dan tidak mengirim hasil parsial melebihi batas',()=>{
  const local=openDb(':memory:');fixture(local,false);const service=new LoanReadService(local);
  try {
    local.prepare('UPDATE detail_barang SET jumlah=1.5 WHERE id_peminjaman=11 AND id_barang=91').run();
    assert.throws(()=>service.schedule(new URLSearchParams({startsAt:t(0),endsAt:t(12),itemId:91})),error=>error.status===503);
    local.prepare('UPDATE detail_barang SET jumlah=2 WHERE id_peminjaman=11 AND id_barang=91').run();
    local.prepare('UPDATE peminjaman SET waktu_mulai=?,waktu_selesai=? WHERE id_peminjaman=11').run('bad-a','bad-z');
    assert.throws(()=>service.schedule(new URLSearchParams({startsAt:t(0),endsAt:t(12),itemId:91})),error=>error.status===503);
    local.prepare('UPDATE peminjaman SET waktu_mulai=?,waktu_selesai=? WHERE id_peminjaman=11').run(t(2),t(4));
    local.exec('BEGIN');
    for(let id=100;id<5101;id++) {
      local.prepare("INSERT INTO peminjaman VALUES(?,?,1,3,?,?,'SYNTHETIC','disetujui')").run(id,`SYNTHETIC-${id}`,t(1),t(2));
      local.prepare('INSERT INTO detail_barang VALUES(?,93,1)').run(id);
    }
    local.exec('COMMIT');
    assert.throws(()=>service.schedule(new URLSearchParams({startsAt:t(0),endsAt:t(12),itemId:93})),error=>error.status===503);
  } finally {local.close();}
});
test('Schema di luar profil existing ditolak 503, tidak dimigrasi atau diperbaiki diam-diam',()=>{
  const local=openDb(':memory:');fixture(local,false);
  try {
    local.exec('ALTER TABLE peminjaman ADD COLUMN synthetic_unagreed TEXT');
    const before=contents(local);
    assert.throws(()=>new LoanReadService(local).stats(new URLSearchParams()),error=>error.status===503);
    assert.deepEqual(contents(local),before);
  } finally {local.close();}
});

for (const [label,role,mutate,status] of [
  ['logout selama upload','student',(local,s)=>new SessionRepository(local).delete(s.token),401],
  ['expiry selama upload','student',(local,s)=>local.prepare('UPDATE sesi SET expires_at=0 WHERE token_hash=?').run(digest(s.token)),401],
  ['nonaktif selama upload','student',local=>local.exec('UPDATE pengguna SET aktif=0 WHERE id_pengguna=1'),401],
  ['perubahan role mahasiswa','student',local=>local.exec("UPDATE pengguna SET peran='admin' WHERE id_pengguna=1"),403],
  ['rotasi CSRF','student',(local,s)=>local.prepare("UPDATE sesi SET csrf='changed' WHERE token_hash=?").run(digest(s.token)),403],
  ['pencabutan role admin','admin',local=>local.exec("UPDATE pengguna SET peran='mahasiswa' WHERE id_pengguna=3"),403]
]) test(`TOCTOU: ${label} diperiksa ulang sesudah body selesai`,async()=>{
  const local=openDb(':memory:'),localSessions=fixture(local),running=await start(local),session=localSessions[role];
  const before=local.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n;
  try {
    const invalidated=new Promise(resolve=>running.server.once('request',()=>{mutate(local,session);resolve();}));
    const body=JSON.stringify({items:[{itemId:91,quantity:1}],startsAt:t(1),endsAt:t(2),reason:'Sintetis'});
    let upload;
    const result=new Promise((resolve,reject)=>{
      upload=request(running.url+(role==='admin'?'/api/admin/loans/11/approve':'/api/loans'),{
        method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),
          Cookie:session.cookie,'X-CSRF-Token':session.csrf,'Idempotency-Key':randomUUID()}
      },response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});
      upload.on('error',reject);upload.flushHeaders();
    });
    await invalidated;upload.end(body);
    assert.equal(await result,status);
    assert.equal(local.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n,before);
  } finally {await stop(running.server);local.close();}
});

test('Snapshot read konsisten ketika writer koneksi terpisah commit di antara COUNT dan SELECT',async()=>{
  const folder=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-read-race-'));
  const file=join(folder,'race.disposable.sqlite'),local=openDb(file);fixture(local,false);
  const shared=new SharedArrayBuffer(8),flags=new Int32Array(shared);
  const worker=new Worker(`
    const {workerData}=require('node:worker_threads');
    const {DatabaseSync}=require('node:sqlite');
    const db=new DatabaseSync(workerData.file),flags=new Int32Array(workerData.shared);
    try {
      db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
      Atomics.store(flags,0,1);Atomics.notify(flags,0);
      if(Atomics.wait(flags,1,0,10000)==='timed-out')throw Error('Writer signal timeout');
      db.exec('BEGIN IMMEDIATE');
      db.prepare("UPDATE peminjaman SET status='ditolak' WHERE id_peminjaman=11").run();
      db.prepare('UPDATE detail_barang SET jumlah=8 WHERE id_peminjaman=11 AND id_barang=91').run();
      db.prepare("INSERT INTO peminjaman VALUES(99,'SYNTHETIC-RACE',1,NULL,?,?,'Sintetis','menunggu')").run(workerData.start,workerData.end);
      db.exec('COMMIT');
      Atomics.store(flags,0,2);Atomics.notify(flags,0);
    } catch(error) {Atomics.store(flags,0,-1);Atomics.notify(flags,0);throw error;}
    finally {db.close();}
  `,{eval:true,workerData:{file,shared,start:t(1),end:t(2)}});
  const finished=new Promise((resolve,reject)=>{worker.on('error',reject);worker.on('exit',code=>code?reject(Error(`Worker exit ${code}`)):resolve());});
  // Hindari unhandled rejection bila assertion gagal sebelum await worker.
  finished.catch(()=>{});
  try {
    if(Atomics.load(flags,0)===0)Atomics.wait(flags,0,0,10000);
    assert.equal(Atomics.load(flags,0),1);
    const wrapped={exec:sql=>local.exec(sql),prepare:sql=>{
      const statement=local.prepare(sql);
      if (!sql.startsWith('SELECT COUNT(*) AS n FROM peminjaman p')) return statement;
      return {get:(...args)=>{
        const count=statement.get(...args);
        Atomics.store(flags,1,1);Atomics.notify(flags,1);
        Atomics.wait(flags,0,1,10000);assert.equal(Atomics.load(flags,0),2);
        return count;
      }};
    }};
    const data=new LoanReadService(wrapped).list(new URLSearchParams());
    assert.equal(data.pagination.total,11);assert.equal(data.loans.length,11);
    assert.equal(data.loans.find(loan=>loan.id===11).status,'disetujui');
    assert.equal(data.loans.find(loan=>loan.id===11).items.find(item=>item.itemId===91).quantity,2);
    await finished;
    const fresh=new LoanReadService(local).list(new URLSearchParams());
    assert.equal(fresh.pagination.total,12);assert.equal(fresh.loans.find(loan=>loan.id===11).status,'ditolak');
    assert.equal(local.prepare('PRAGMA foreign_key_check').all().length,0);
  } finally {await worker.terminate();local.close();}
});

test('Otorisasi pengajuan dicek di dalam BEGIN IMMEDIATE, bukan hanya sebelum memperoleh lock',async()=>{
  const local=openDb(':memory:'),localSessions=fixture(local),session=localSessions.student;
  let revoked=false;
  const wrapped={prepare:sql=>local.prepare(sql),exec:sql=>{
    if(sql==='BEGIN IMMEDIATE'&&!revoked) {
      new SessionRepository(local).delete(session.token);revoked=true;
    }
    return local.exec(sql);
  }};
  const running=await start(wrapped),before=local.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n;
  try {
    const response=await fetch(running.url+'/api/loans',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',
      Cookie:session.cookie,'X-CSRF-Token':session.csrf,'Idempotency-Key':randomUUID()},
      body:JSON.stringify({items:[{itemId:91,quantity:1}],startsAt:t(1),endsAt:t(2),reason:'Sintetis'})});
    assert.equal(revoked,true);assert.equal(response.status,401);
    assert.equal(local.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n,before);
    local.exec('BEGIN');local.exec('ROLLBACK'); // Tidak meninggalkan transaksi aktif.
  } finally {await stop(running.server);local.close();}
});
