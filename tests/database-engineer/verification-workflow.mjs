// Executable workflow proposal ONLY. Not imported by backend or startup.
// Uses 002 fixture schema; no activation switch for the target application.
import { createHash } from 'node:crypto';
import { availability } from './prototype.mjs';
import { validInstant } from '../../src/app/loan-validation.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const keys=['layak_pinjam','fasilitas','rusak','hilang','nonpinjam','belum_verifikasi'];
function guarded(db,actorId,roles,key,run) {
  const file=db.prepare('PRAGMA database_list').all().find(row=>row.name==='main')?.file;
  if(!file||!/smartlend-db-engineer-[^\\/]+[\\/]availability\.disposable\.sqlite$/.test(file))fail(503,'Only isolated 002 fixtures permitted');
  if(typeof key!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key))fail(400,'UUID required');
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
  try {
    const actor=db.prepare('SELECT aktif,peran FROM pengguna WHERE id_pengguna=?').get(actorId);
    if(!actor?.aktif||!roles.includes(actor.peran))fail(403,'Actor role invalid');
    const result=run();db.exec('COMMIT');return result;
  }catch(e){db.exec('ROLLBACK');throw e;}
}
function replay(db,actorId,key,digest) {
  const existing=db.prepare('SELECT request_hash,sesudah_json FROM audit_operasi WHERE id_pelaku=? AND request_key=?').get(actorId,key);
  if(!existing)return null;if(existing.request_hash!==digest)fail(409,'Key conflicts');
  return {...JSON.parse(existing.sesudah_json),replayed:true};
}
export function verifyCapacity(db,actorId,key,input,now=Date.now()) {
  if(!input||Object.keys(input).sort().join(',')!==['itemId','expectedRevision','evidence','reason',...keys].sort().join(','))fail(400,'Unknown/missing fields');
  if(!Number.isSafeInteger(input.itemId)||input.itemId<1||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||keys.some(k=>!Number.isSafeInteger(input[k])||input[k]<0))fail(400,'Integer counts required');
  for(const k of ['evidence','reason'])if(typeof input[k]!=='string'||!input[k].trim()||input[k].length>1000||/[\u0000-\u001f\u007f]/.test(input[k]))fail(400,'Evidence/reason required');
  const payload={itemId:input.itemId,expectedRevision:input.expectedRevision,evidence:input.evidence.trim(),reason:input.reason.trim(),...Object.fromEntries(keys.map(k=>[k,input[k]]))},digest=hash({action:'verify',payload});
  return guarded(db,actorId,['admin','petugas'],key,()=>{
    const old=replay(db,actorId,key,digest);if(old)return old;
    const item=db.prepare('SELECT stok_total FROM barang WHERE id_barang=?').get(input.itemId);if(!item)fail(404,'Item missing');
    const prior=db.prepare('SELECT * FROM verifikasi_stok_barang WHERE id_barang=? ORDER BY revisi DESC LIMIT 1').get(input.itemId);
    if((prior?.revisi??0)!==input.expectedRevision)fail(409,'Verification revision changed');
    if(keys.reduce((sum,k)=>sum+input[k],0)!==item.stok_total)fail(400,'Buckets must reconcile with total');
    const facilities=db.prepare('SELECT COALESCE(SUM(jumlah),0) n FROM fasilitas_ruangan WHERE id_barang=?').get(input.itemId).n;
    if(facilities!==input.fasilitas)fail(409,'Facility reconciliation required');
    const active=db.prepare("SELECT COUNT(*) n FROM detail_barang d JOIN peminjaman p USING(id_peminjaman) WHERE d.id_barang=? AND p.status IN ('disetujui','dipinjam')").get(input.itemId).n;
    const priorCapacity=active&&prior?availability(db,input.itemId,now,253402300799999,now):null;
    const unresolved=active&&(!priorCapacity||priorCapacity.available===null||priorCapacity.peak>input.layak_pinjam);
    const result={itemId:input.itemId,revision:input.expectedRevision+1,status:input.belum_verifikasi||unresolved?'perlu_rekonsiliasi':'terverifikasi',actorId,verifiedAt:new Date(now).toISOString(),evidence:payload.evidence,buckets:Object.fromEntries(keys.map(k=>[k,input[k]]))};
    const op=db.prepare('INSERT INTO audit_operasi(id_pelaku,request_key,request_hash,aksi,dicatat_ms,alasan,sebelum_json,sesudah_json) VALUES(?,?,?,?,?,?,?,?)').run(actorId,key,digest,'verifikasi_stok',now,payload.reason,JSON.stringify(prior??{}),JSON.stringify(result)).lastInsertRowid;
    db.prepare('INSERT INTO verifikasi_stok_barang(id_barang,revisi,id_operasi,status_verifikasi,stok_total_snapshot,layak_pinjam,fasilitas,rusak,hilang,nonpinjam,belum_verifikasi) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(input.itemId,result.revision,op,result.status,item.stok_total,...keys.map(k=>input[k]));
    return {...result,replayed:false};
  });
}
export function decide(db,actorId,key,{loanId,action,expectedVersion,reason=''},now=Date.now()) {
  if(!Number.isSafeInteger(loanId)||loanId<1||!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!['approve','reject'].includes(action)||typeof reason!=='string'||reason.length>1000||/[\u0000-\u001f\u007f]/.test(reason)||action==='reject'&&!reason.trim())fail(400,'Decision invalid');
  const digest=hash({loanId,action,expectedVersion,reason:reason.trim()});
  return guarded(db,actorId,['admin'],key,()=>{
    const old=replay(db,actorId,key,digest);if(old)return old;
    const loan=db.prepare('SELECT * FROM peminjaman WHERE id_peminjaman=?').get(loanId);if(!loan)fail(404,'Loan missing');
    const version=db.prepare("SELECT COUNT(*) n FROM audit_operasi WHERE id_peminjaman=? AND aksi IN ('setujui','tolak','batalkan')").get(loanId).n;
    if(loan.status!=='menunggu'||version!==expectedVersion)fail(409,'Decision already changed');
    const plans=[];
    if(action==='approve') {
      if(!validInstant(loan.waktu_mulai)||!validInstant(loan.waktu_selesai))fail(503,'Timezone reconciliation required');
      if(db.prepare('SELECT 1 FROM detail_ruangan WHERE id_peminjaman=?').get(loanId))fail(503,'Room workflow not activated in this proposal');
      const start=Date.parse(loan.waktu_mulai),end=Date.parse(loan.waktu_selesai);
      if(start<now||end<=start)fail(400,'Period invalid');
      const items=db.prepare('SELECT * FROM detail_barang WHERE id_peminjaman=?').all(loanId);if(!items.length)fail(400,'Empty request');
      for(const item of items){const a=availability(db,item.id_barang,start,end,now);if(a.available===null)fail(503,a.reason);if(a.available<item.jumlah)fail(409,'Insufficient capacity');plans.push({...item,...a,start,end});}
    }
    const result={loanId,status:action==='approve'?'disetujui':'ditolak',actorId,decidedAt:new Date(now).toISOString(),version:version+1,reason:reason.trim()};
    const op=db.prepare('INSERT INTO audit_operasi(id_pelaku,request_key,request_hash,aksi,id_peminjaman,dicatat_ms,alasan,sebelum_json,sesudah_json) VALUES(?,?,?,?,?,?,?,?,?)').run(actorId,key,digest,action==='approve'?'setujui':'tolak',loanId,now,reason.trim()||'Kapasitas diperiksa pada transaksi',JSON.stringify({status:loan.status,version}),JSON.stringify(result)).lastInsertRowid;
    for(const p of plans)db.prepare('INSERT INTO alokasi_barang(id_peminjaman,id_barang,id_verifikasi,id_operasi,mulai_ms,selesai_ms) VALUES(?,?,?,?,?,?)').run(loanId,p.id_barang,p.verification,op,p.start,p.end);
    if(db.prepare("UPDATE peminjaman SET status=?,id_admin=? WHERE id_peminjaman=? AND status='menunggu'").run(result.status,actorId,loanId).changes!==1)fail(409,'CAS failed');
    return {...result,replayed:false};
  });
}
