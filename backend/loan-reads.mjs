import { validInstant } from '../src/app/loan-validation.mjs';
import { loanSchemaState } from './loan-schema.mjs';
import { loanError } from './loans.mjs';
import { readLoanForm } from './loan-form.mjs';

export const LOAN_STATUSES = Object.freeze(['menunggu','disetujui','dipinjam','selesai','ditolak','dibatalkan']);
const roles = {mahasiswa:'student',admin:'admin',petugas:'warehouse'};
const maxScheduleRows = 5000;

// Tidak ada feature flag yang dapat melewati prasyarat ini. Aktivasi memerlukan
// kontrak Database, data terverifikasi, implementasi transaksi dan tes baru.
export function decisionReadiness() {
  return {
    approval:{state:'BLOCKED',code:'APPROVAL_BLOCKED',blockers:[
      'capacity_baseline_unverified','facility_allocation_policy_unresolved',
      'return_reconciliation_unverified','allocation_completeness_unverified',
      'legacy_time_zone_unverified','atomic_allocation_contract_missing','decision_audit_contract_missing'
    ]},
    rejection:{state:'BLOCKED',code:'REJECTION_BLOCKED',blockers:['decision_audit_contract_missing']}
  };
}

function integer(value,name,min,max=Number.MAX_SAFE_INTEGER) {
  if (!/^(0|[1-9]\d*)$/.test(value ?? '') || !Number.isSafeInteger(Number(value)) || Number(value)<min || Number(value)>max) {
    throw loanError(400,`${name} tidak valid.`);
  }
  return Number(value);
}
function parameters(search,allowed) {
  for (const key of search.keys()) {
    if (!allowed.includes(key) || search.getAll(key).length!==1) throw loanError(400,'Parameter tidak dikenal atau berulang.');
  }
}
function interval(search,required=false) {
  const startsAt=search.get('startsAt'),endsAt=search.get('endsAt');
  if (startsAt===null && endsAt===null && !required) return {startsAt:null,endsAt:null};
  if (!validInstant(startsAt) || !validInstant(endsAt) || endsAt<=startsAt) {
    throw loanError(400,'Periode wajib berpasangan, berupa ISO UTC kanonik, dan selesai setelah mulai.');
  }
  return {startsAt,endsAt};
}
function adminFilters(search,paginated) {
  parameters(search,['status','startsAt','endsAt','itemId','roomId',...(paginated?['limit','offset']:[])]);
  const status=search.get('status');
  if (status!==null && !LOAN_STATUSES.includes(status)) throw loanError(400,'Status tidak dikenal.');
  return {status,...interval(search),
    itemId:search.has('itemId')?integer(search.get('itemId'),'itemId',1):null,
    roomId:search.has('roomId')?integer(search.get('roomId'),'roomId',1):null};
}
function where(filters) {
  const clauses=[],values=[];
  if (filters.status) {clauses.push('p.status=?');values.push(filters.status);}
  if (filters.startsAt) {
    clauses.push('julianday(p.waktu_mulai)<julianday(?) AND julianday(p.waktu_selesai)>julianday(?)');
    values.push(filters.endsAt,filters.startsAt);
  }
  if (filters.itemId) {clauses.push('EXISTS (SELECT 1 FROM detail_barang d WHERE d.id_peminjaman=p.id_peminjaman AND d.id_barang=?)');values.push(filters.itemId);}
  if (filters.roomId) {clauses.push('EXISTS (SELECT 1 FROM detail_ruangan r WHERE r.id_peminjaman=p.id_peminjaman AND r.id_ruangan=?)');values.push(filters.roomId);}
  return {sql:clauses.length?'WHERE '+clauses.join(' AND '):'',values};
}

// Agregasi beban tercatat, BUKAN perhitungan stok tersedia. Interval [mulai,selesai).
export function recordedSegments(rows,start,end) {
  const events=new Map();
  for (const row of rows) {
    const left=Math.max(row.start,start),right=Math.min(row.end,end);
    if (left>=right) continue;
    events.set(left,(events.get(left)||0)+row.quantity);
    events.set(right,(events.get(right)||0)-row.quantity);
  }
  const times=[...events.keys()].sort((a,b)=>a-b),segments=[];
  let quantity=0;
  for (let i=0;i<times.length-1;i++) {
    quantity+=events.get(times[i]);
    if (!Number.isSafeInteger(quantity) || quantity<0) throw loanError(503,'Alokasi tercatat perlu diaudit.');
    if (!quantity) continue;
    const startsAt=new Date(times[i]).toISOString(),endsAt=new Date(times[i+1]).toISOString();
    const previous=segments.at(-1);
    if (previous?.endsAt===startsAt && previous.recordedQuantity===quantity) previous.endsAt=endsAt;
    else segments.push({startsAt,endsAt,recordedQuantity:quantity});
  }
  return segments;
}

export class LoanReadService {
  constructor(db) {this.db=db;}
  snapshot(read) {
    this.db.exec('BEGIN');
    try {
      let state;
      try {state=loanSchemaState(this.db);} catch {throw loanError(503,'Schema pembacaan pengajuan perlu diaudit bersama Session Database.');}
      const result=read(state,new Date().toISOString());
      this.db.exec('COMMIT');
      return result;
    } catch (error) {this.db.exec('ROLLBACK');throw error;}
  }
  headerSql(state) {
    return `SELECT p.id_peminjaman AS id,p.kode_peminjaman AS number,p.waktu_mulai AS startsAt,
      p.waktu_selesai AS endsAt,p.keperluan AS reason,p.status,${state==='ready'?'p.dibuat_pada':'NULL'} AS createdAt,
      u.id_pengguna AS borrowerId,u.nama AS borrowerName,u.email AS borrowerEmail,u.peran AS borrowerRole,
      a.id_pengguna AS adminId,a.nama AS adminName
      FROM peminjaman p JOIN pengguna u ON u.id_pengguna=p.id_peminjam
      LEFT JOIN pengguna a ON a.id_pengguna=p.id_admin`;
  }
  present(row) {
    const {borrowerId,borrowerName,borrowerEmail,borrowerRole,adminId,adminName,...loan}=row;
    const items=this.db.prepare(`SELECT b.id_barang AS itemId,b.kode_barang AS code,b.nama_barang AS name,
      b.satuan AS unit,d.jumlah AS quantity FROM detail_barang d JOIN barang b ON b.id_barang=d.id_barang
      WHERE d.id_peminjaman=? ORDER BY b.id_barang`).all(loan.id);
    const room=this.db.prepare(`SELECT r.id_ruangan AS roomId,r.kode_ruangan AS code,r.nama_ruangan AS name,
      d.jumlah_peserta AS participants FROM detail_ruangan d JOIN ruangan r ON r.id_ruangan=d.id_ruangan
      WHERE d.id_peminjaman=?`).get(loan.id) || null;
    const details=readLoanForm(this.db,loan.id);
    return {...loan,...(details?{details}:{}),borrower:{id:borrowerId,name:borrowerName,email:borrowerEmail,role:roles[borrowerRole]},
      admin:adminId===null?null:{id:adminId,name:adminName},items,room,totalTypes:items.length,
      totalUnits:items.reduce((sum,item)=>sum+item.quantity,0)};
  }
  list(search) {
    const filters=adminFilters(search,true),limit=search.has('limit')?integer(search.get('limit'),'limit',1,100):25;
    const offset=search.has('offset')?integer(search.get('offset'),'offset',0,1000000):0;
    return this.snapshot((state,asOf)=>{
      const {sql,values}=where(filters);
      const total=this.db.prepare(`SELECT COUNT(*) AS n FROM peminjaman p ${sql}`).get(...values).n;
      const loans=this.db.prepare(`${this.headerSql(state)} ${sql} ORDER BY p.id_peminjaman DESC LIMIT ? OFFSET ?`).all(...values,limit,offset).map(row=>this.present(row));
      return {loans,pagination:{total,limit,offset,hasMore:offset+loans.length<total},filters,asOf};
    });
  }
  detail(id) {
    if (!Number.isSafeInteger(id) || id<1) throw loanError(404,'Pengajuan tidak ditemukan.');
    return this.snapshot((state,asOf)=>{
      const row=this.db.prepare(`${this.headerSql(state)} WHERE p.id_peminjaman=?`).get(id);
      if (!row) throw loanError(404,'Pengajuan tidak ditemukan.');
      return {loan:this.present(row),decisions:decisionReadiness(),asOf};
    });
  }
  stats(search) {
    const filters=adminFilters(search,false);
    return this.snapshot((state,asOf)=>{
      const {sql,values}=where(filters);
      const rows=this.db.prepare(`SELECT p.status,COUNT(*) AS loans,
        SUM((SELECT COALESCE(SUM(d.jumlah),0) FROM detail_barang d WHERE d.id_peminjaman=p.id_peminjaman)) AS itemUnits,
        SUM(EXISTS (SELECT 1 FROM detail_ruangan r WHERE r.id_peminjaman=p.id_peminjaman)) AS roomLoans
        FROM peminjaman p ${sql} GROUP BY p.status`).all(...values);
      const byStatus=Object.fromEntries(LOAN_STATUSES.map(status=>[status,0]));
      const itemUnitsByStatus={...byStatus},roomLoansByStatus={...byStatus};
      for (const row of rows) {byStatus[row.status]=row.loans;itemUnitsByStatus[row.status]=row.itemUnits;roomLoansByStatus[row.status]=row.roomLoans;}
      return {total:rows.reduce((sum,row)=>sum+row.loans,0),byStatus,itemUnitsByStatus,roomLoansByStatus,filters,decisions:decisionReadiness(),asOf};
    });
  }
  schedule(search) {
    parameters(search,['startsAt','endsAt','itemId','roomId']);
    const period=interval(search,true),start=Date.parse(period.startsAt),end=Date.parse(period.endsAt);
    if (end-start>31*86400000) throw loanError(400,'Rentang jadwal maksimal 31 hari per request.');
    if (search.has('itemId')===search.has('roomId')) throw loanError(400,'Pilih tepat satu itemId atau roomId.');
    const item=search.has('itemId'),id=integer(search.get(item?'itemId':'roomId'),item?'itemId':'roomId',1);
    return this.snapshot((state,asOf)=>{
      const resource=item
        ?this.db.prepare('SELECT id_barang AS id,kode_barang AS code,nama_barang AS name,satuan AS unit FROM barang WHERE id_barang=?').get(id)
        :this.db.prepare('SELECT id_ruangan AS id,kode_ruangan AS code,nama_ruangan AS name,status_operasional AS operationalStatus FROM ruangan WHERE id_ruangan=?').get(id);
      if (!resource) throw loanError(404,'Barang atau ruangan tidak ditemukan.');
      // Seluruh identifier SQL dipilih server, tidak berasal dari parameter klien.
      const source=item?'detail_barang':'detail_ruangan',column=item?'id_barang':'id_ruangan',quantity=item?'d.jumlah':'1';
      const from=`FROM ${source} d JOIN peminjaman p ON p.id_peminjaman=d.id_peminjaman
        WHERE d.${column}=? AND p.status IN ('disetujui','dipinjam')`;
      const invalid=this.db.prepare(`SELECT 1 ${from} AND (julianday(p.waktu_mulai) IS NULL OR julianday(p.waktu_selesai) IS NULL
        OR julianday(p.waktu_selesai)<=julianday(p.waktu_mulai) OR typeof(${quantity})<>'integer' OR ${quantity}<=0) LIMIT 1`).get(id);
      if (invalid) throw loanError(503,'Periode atau jumlah alokasi tercatat perlu diaudit.');
      const rows=this.db.prepare(`SELECT ROUND((julianday(p.waktu_mulai)-2440587.5)*86400000) AS start,
        ROUND((julianday(p.waktu_selesai)-2440587.5)*86400000) AS end,${quantity} AS quantity ${from}
        AND julianday(p.waktu_mulai)<julianday(?) AND julianday(p.waktu_selesai)>julianday(?) LIMIT ?`)
        .all(id,period.endsAt,period.startsAt,maxScheduleRows+1);
      if (rows.length>maxScheduleRows) throw loanError(503,'Jadwal terlalu padat; perkecil rentang waktu.');
      // Indikator terpisah: jadwal berakhir tidak membuktikan barang sudah kembali.
      const borrowedQuantityPendingReconciliation=this.db.prepare(`SELECT COALESCE(SUM(${quantity}),0) AS n ${from} AND p.status='dipinjam'`).get(id).n;
      if (!Number.isSafeInteger(borrowedQuantityPendingReconciliation)) throw loanError(503,'Alokasi tercatat perlu diaudit.');
      return {resource:{type:item?'item':'room',...resource},period,interval:'[startsAt,endsAt)',
        scope:'direct_details_only',timeBasis:'sqlite_utc_legacy_unverified',
        segments:recordedSegments(rows,start,end),borrowedQuantityPendingReconciliation,
        availability:{verification:'unverified',availableQuantity:null,blockers:decisionReadiness().approval.blockers},
        asOf};
    });
  }
}
