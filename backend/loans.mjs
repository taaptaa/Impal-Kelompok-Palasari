import { createHash } from 'node:crypto';
import { validateLoan } from '../src/app/loan-validation.mjs';
import { loanSchemaState } from './loan-schema.mjs';
import { normalizeFormDetails } from '../src/app/loan-form-validation.mjs';
import { loanFormState, readLoanForm, writeLoanForm } from './loan-form.mjs';

export const loanError = (status,message,fields) => Object.assign(new Error(message),{status,fields});
export class LoanService {
  constructor(db) { this.db = db; }
  ready() {
    if (loanSchemaState(this.db) !== 'ready') throw loanError(503,'Pengajuan belum diaktifkan: pengelola perlu menjalankan migrasi eksplisit.');
  }
  detail(userId,id) {
    this.ready();
    if (!Number.isSafeInteger(id) || id < 1) throw loanError(404,'Pengajuan tidak ditemukan.');
    const row = this.db.prepare(`SELECT p.id_peminjaman AS id,p.kode_peminjaman AS number,p.waktu_mulai AS startsAt,p.waktu_selesai AS endsAt,p.keperluan AS reason,p.status,p.dibuat_pada AS createdAt,u.nama AS name,u.email
      FROM peminjaman p JOIN pengguna u ON u.id_pengguna=p.id_peminjam WHERE p.id_peminjaman=? AND p.id_peminjam=?`).get(id,userId);
    if (!row) throw loanError(404,'Pengajuan tidak ditemukan.');
    const items = this.db.prepare(`SELECT b.id_barang AS itemId,b.kode_barang AS code,b.nama_barang AS name,b.satuan AS unit,d.jumlah AS quantity FROM detail_barang d JOIN barang b ON b.id_barang=d.id_barang WHERE d.id_peminjaman=? ORDER BY b.id_barang`).all(id);
    const {name,email,...loan} = row;
    const details=readLoanForm(this.db,id);
    return {...loan,borrower:{name,email,role:'student'},items,totalTypes:items.length,totalUnits:items.reduce((sum,item)=>sum+item.quantity,0),...(details?{details}:{})};
  }
  mine(userId) {
    this.ready();
    return this.db.prepare('SELECT id_peminjaman FROM peminjaman WHERE id_peminjam=? ORDER BY id_peminjaman DESC').all(userId).map(row=>this.detail(userId,row.id_peminjaman));
  }
  create(userId,key,input,assertAuthorized=()=>{}) {
    this.ready();
    if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw loanError(400,'Idempotency-Key wajib berupa UUID v4.');
    key = key.toLowerCase();
    // Validasi bentuk sebelum hashing/replay; retry tetap sah meski jadwal sudah lewat.
    const fields = validateLoan(input, -Infinity);
    if (Object.keys(fields).length) throw loanError(400,'Periksa data pengajuan.',fields);
    const canonical = {...input,reason:input.reason.trim(),items:input.items.map(item=>({itemId:item.itemId,quantity:item.quantity})).sort((a,b)=>a.itemId-b.itemId),...('details' in input?{details:normalizeFormDetails(input.details)}:{})};
    // Do not change hashes of legacy requests. Optional fields are covered when present.
    const hash = createHash('sha256').update(JSON.stringify({items:canonical.items,startsAt:canonical.startsAt,endsAt:canonical.endsAt,reason:canonical.reason,...(canonical.details?{details:canonical.details}:{})})).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // Server memeriksa sesi lagi di bawah write lock. Logout/perubahan role
      // dari koneksi lain tidak boleh menyelinap di antara otorisasi dan commit.
      assertAuthorized();
      if(canonical.details&&loanFormState(this.db)!=='ready')throw loanError(503,'Field tambahan belum aktif. Tunggu audit dan persetujuan migrasi; data tidak disimpan sebagian.');
      const existing = this.db.prepare('SELECT id_peminjaman,request_hash FROM peminjaman WHERE id_peminjam=? AND request_key=?').get(userId,key);
      if (existing) {
        if (existing.request_hash !== hash) throw loanError(409,'Kunci pengiriman sudah dipakai untuk data berbeda. Gunakan pengajuan baru.');
        const loan = this.detail(userId,existing.id_peminjaman);
        this.db.exec('COMMIT');
        return {loan,replayed:true};
      }
      const currentErrors = validateLoan(canonical);
      if (Object.keys(currentErrors).length) throw loanError(400,'Periksa data pengajuan.',currentErrors);
      for (const item of canonical.items) {
        const stock = this.db.prepare('SELECT stok_total FROM barang WHERE id_barang=?').get(item.itemId);
        if (!stock) throw loanError(400,'Barang tidak dikenal.',{items:'Salah satu barang tidak ditemukan. Muat ulang katalog.'});
        if (item.quantity > stock.stok_total) throw loanError(400,'Jumlah melebihi stok total.',{items:'Jumlah tidak boleh melebihi stok total. Ini bukan verifikasi ketersediaan.'});
      }
      // INT PRIMARY KEY existing bukan alias rowid. MAX+1 diserialisasi oleh BEGIN IMMEDIATE,
      // dilindungi PK dan UNIQUE, bukan COUNT+1 dan bukan nomor dari browser.
      const id = Number(this.db.prepare('SELECT COALESCE(MAX(id_peminjaman),0)+1 AS id FROM peminjaman').get().id);
      if (!Number.isSafeInteger(id) || id<1 || `SL-${id}`.length>25) throw loanError(503,'Nomor pengajuan belum dapat dibuat.');
      this.db.prepare(`INSERT INTO peminjaman(id_peminjaman,kode_peminjaman,id_peminjam,id_admin,waktu_mulai,waktu_selesai,keperluan,status,dibuat_pada,request_key,request_hash) VALUES(?,?,?,NULL,?,?,?,'menunggu',?,?,?)`)
        .run(id,`SL-${id}`,userId,canonical.startsAt,canonical.endsAt,canonical.reason,new Date().toISOString(),key,hash);
      const insert = this.db.prepare('INSERT INTO detail_barang(id_peminjaman,id_barang,jumlah) VALUES(?,?,?)');
      for (const item of canonical.items) insert.run(id,item.itemId,item.quantity);
      if(canonical.details)writeLoanForm(this.db,id,canonical.details,new Date().toISOString());
      const loan = this.detail(userId,id);
      this.db.exec('COMMIT');
      return {loan,replayed:false};
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
