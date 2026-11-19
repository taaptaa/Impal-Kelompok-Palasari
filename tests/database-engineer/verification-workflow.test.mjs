import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fixture,request,availability,NOW,START,END,fingerprint} from './prototype.mjs';
import {verifyCapacity,decide} from './verification-workflow.mjs';
import {LoanService} from '../../backend/loans.mjs';
const counts=(itemId=91,layak_pinjam=10)=>({itemId,expectedRevision:0,evidence:'SINTETIS: lembar hitung TEST-001',reason:'Pemeriksaan sintetis',layak_pinjam,fasilitas:0,rusak:10-layak_pinjam,hilang:0,nonpinjam:0,belum_verifikasi:0});
const decision=(loanId,action='approve')=>({loanId,action,expectedVersion:0,reason:action==='reject'?'Alasan uji sintetis':''});
test('Verification requires evidence, role, complete integer buckets/facilities; actor/time/version recorded; immutable history',()=>{
  const db=fixture();try{
    const before=fingerprint(db);for(const bad of [{...counts(),evidence:''},{...counts(),layak_pinjam:9},{...counts(),rusak:0.5},{...counts(),actorId:2}])assert.throws(()=>verifyCapacity(db,3,randomUUID(),bad,NOW));
    assert.throws(()=>verifyCapacity(db,1,randomUUID(),counts(),NOW),e=>e.status===403);assert.deepEqual(fingerprint(db),before);
    const key=randomUUID(),result=verifyCapacity(db,3,key,counts(),NOW);assert.equal(result.status,'terverifikasi');assert.equal(result.actorId,3);assert.equal(result.verifiedAt,new Date(NOW).toISOString());
    assert.deepEqual(verifyCapacity(db,3,key,counts(),NOW+1),{...result,replayed:true});assert.throws(()=>verifyCapacity(db,2,randomUUID(),counts(),NOW),e=>e.status===409);
    const next=verifyCapacity(db,2,randomUUID(),{...counts(91,8),expectedRevision:1},NOW+1);assert.equal(next.revision,2);assert.equal(db.prepare('SELECT COUNT(*) n FROM verifikasi_stok_barang').get().n,2);
    assert.throws(()=>db.exec('UPDATE verifikasi_stok_barang SET layak_pinjam=10'));assert.equal(db.prepare('SELECT stok_total FROM barang WHERE id_barang=91').get().stok_total,10);
  }finally{db.close();}
});
test('Unknown buckets, missing legacy allocation and damaged capacity deficits require reconciliation; not available total',()=>{
  const db=fixture();try{
    assert.equal(availability(db,91,START,END).available,null);
    verifyCapacity(db,3,randomUUID(),{...counts(91,8),rusak:0,belum_verifikasi:2},NOW);assert.equal(availability(db,91,START,END).available,null);
    verifyCapacity(db,3,randomUUID(),{...counts(),expectedRevision:1},NOW);request(db,1,[[91,9]]);decide(db,2,randomUUID(),decision(1),NOW);
    const result=verifyCapacity(db,3,randomUUID(),{...counts(91,5),expectedRevision:2},NOW);assert.equal(result.status,'perlu_rekonsiliasi');assert.equal(availability(db,91,START,END).available,null);
    request(db,2,[[92,1]]);db.exec("UPDATE peminjaman SET status='dipinjam' WHERE id_peminjaman=2");assert.equal(verifyCapacity(db,3,randomUUID(),counts(92),NOW).status,'perlu_rekonsiliasi');
  }finally{db.close();}
});
test('Decision actor/reason/CAS/replay, owner reads official status, declined loan cannot approve',()=>{
  const db=fixture();try{request(db,1);const key=randomUUID();assert.throws(()=>decide(db,3,key,decision(1,'reject'),NOW),e=>e.status===403);assert.throws(()=>decide(db,2,key,{...decision(1,'reject'),reason:''},NOW),e=>e.status===400);
    const saved=decide(db,2,key,decision(1,'reject'),NOW);assert.equal(new LoanService(db).detail(1,1).status,'ditolak');assert.equal(saved.version,1);
    assert.deepEqual(decide(db,2,key,decision(1,'reject'),NOW+1),{...saved,replayed:true});assert.throws(()=>decide(db,2,randomUUID(),decision(1),NOW),e=>e.status===409);assert.equal(db.prepare('SELECT COUNT(*) n FROM alokasi_barang').get().n,0);
  }finally{db.close();}
});
test('Approval package rollback, cross-year adjacency, overdue custody and insufficient stock',()=>{
  const db=fixture();try{
    verifyCapacity(db,3,randomUUID(),counts(91,1),NOW);request(db,1,[[91,1],[92,1]]);
    assert.throws(()=>decide(db,2,randomUUID(),decision(1),NOW),e=>e.status===503);assert.equal(db.prepare('SELECT COUNT(*) n FROM alokasi_barang').get().n,0);
    verifyCapacity(db,3,randomUUID(),counts(92),NOW);db.exec("CREATE TRIGGER fail_second BEFORE INSERT ON alokasi_barang WHEN NEW.id_barang=92 BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");const before=fingerprint(db);assert.throws(()=>decide(db,2,randomUUID(),decision(1),NOW));assert.deepEqual(fingerprint(db),before);db.exec('DROP TRIGGER fail_second');
    decide(db,2,randomUUID(),decision(1),NOW);request(db,2,[[91,1]]);assert.throws(()=>decide(db,2,randomUUID(),decision(2),NOW),e=>e.status===409);
    request(db,3,[[91,1]],END,Date.parse('2031-01-01T00:00:00.000Z'));decide(db,2,randomUUID(),decision(3),NOW);
    db.exec(`UPDATE alokasi_barang SET diambil_ms=${START} WHERE id_peminjaman=1; UPDATE peminjaman SET status='dipinjam' WHERE id_peminjaman=1`);
    assert.equal(availability(db,91,END+1,END+1000).available,null,'Overdue conflicts produce reconciliation, not fabricated capacity');
  }finally{db.close();}
});
async function worker(file,actorId,input){
  const script=`import {DatabaseSync} from 'node:sqlite';import {decide} from './tests/database-engineer/verification-workflow.mjs';const db=new DatabaseSync(process.argv[1]);try{const result=decide(db,Number(process.argv[2]),process.argv[3],JSON.parse(process.argv[4]),${NOW});console.log(JSON.stringify({ok:true,result}));}catch(e){console.log(JSON.stringify({ok:false,status:e.status}));}finally{db.close();}`;
  return new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--input-type=module','-e',script,file,String(actorId),randomUUID(),JSON.stringify(input)],{stdio:['ignore','pipe','pipe']});let output='',err='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('exit',code=>code?reject(Error(err)):resolve(JSON.parse(output)));});
}
test('Separate-process races: two Admin same loan; approve-vs-reject; two loans last unit',async()=>{
  for(const mode of ['same','opposite','last-unit']){
    const db=fixture();try{
      db.exec("INSERT INTO pengguna VALUES(4,'Admin Two','admin2@example.test','not-hash','admin',1)");verifyCapacity(db,3,randomUUID(),counts(91,1),NOW);request(db,1);if(mode==='last-unit')request(db,2);
      const results=await Promise.all([worker(db.testOnlyFile,2,decision(1)),worker(db.testOnlyFile,4,decision(mode==='last-unit'?2:1,mode==='opposite'?'reject':'approve'))]);
      assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.find(r=>!r.ok).status,409);assert.ok(db.prepare('SELECT COUNT(*) n FROM alokasi_barang').get().n<=1);assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
    }finally{db.close();}
  }
});
