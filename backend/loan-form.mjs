import { readFileSync } from 'node:fs';
import { ACKNOWLEDGEMENT_VERSION, ACKNOWLEDGEMENT_TEXT, FORM_LIMITS, normalizeFormDetails, validSavedFormDetails } from '../src/app/loan-form-validation.mjs';

const normalizeSql=sql=>sql.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim().replace(/;$/,'').toLowerCase();
const expected=normalizeSql(readFileSync(new URL('../database/migrations/003-loan-form.sql',import.meta.url),'utf8'));
const unavailable=()=>Object.assign(Error('Formulir lengkap belum aktif: schema pendamping perlu audit dan persetujuan migrasi eksplisit.'),{status:503});
export function loanFormState(db) {
  const row=db.prepare("SELECT type,sql FROM sqlite_schema WHERE name='informasi_pengajuan'").get();
  if(!row)return 'absent';
  return row.type==='table'&&normalizeSql(row.sql||'')===expected?'ready':'invalid';
}
export function loanFormOptions(db) {
  const state=loanFormState(db);
  return {contract:'loan-form-v1',additionalFields:state==='ready',state:state==='ready'?'ready':'BLOCKED',
    reason:state==='ready'?null:state==='absent'?'migration_not_approved':'schema_requires_audit',
    limits:FORM_LIMITS,acknowledgement:{version:ACKNOWLEDGEMENT_VERSION,text:ACKNOWLEDGEMENT_TEXT,legalTerms:false},documents:{state:'BLOCKED'}};
}
export function writeLoanForm(db,id,value,at) {
  if(loanFormState(db)!=='ready')throw unavailable();
  const d=normalizeFormDetails(value);
  db.prepare(`INSERT INTO informasi_pengajuan(id_peminjaman,telepon,identitas_peminjam,unit_peminjam,nama_kegiatan,lokasi_kegiatan,deskripsi_kegiatan,versi_informasi,dikonfirmasi_pada) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(id,d.phone,d.borrowerIdentifier,d.unit,d.activityName,d.activityLocation,d.activityDescription,d.acknowledgement.version,at);
}
export function readLoanForm(db,id) {
  const state=loanFormState(db);
  if(state==='absent')return undefined;
  if(state!=='ready')throw unavailable();
  const row=db.prepare(`SELECT telepon AS phone,identitas_peminjam AS borrowerIdentifier,unit_peminjam AS unit,nama_kegiatan AS activityName,lokasi_kegiatan AS activityLocation,deskripsi_kegiatan AS activityDescription,versi_informasi AS version,dikonfirmasi_pada AS acknowledgedAt FROM informasi_pengajuan WHERE id_peminjaman=?`).get(id);
  if(!row)return undefined;
  const {version,...details}=row;
  const result={...details,acknowledgement:{version,accepted:true}};
  if(!validSavedFormDetails(result))throw unavailable();
  return result;
}
