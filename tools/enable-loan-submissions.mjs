// Migrasi eksplisit, aditif, hanya untuk disposable teridentifikasi. Default audit-only.
import { DatabaseSync } from 'node:sqlite';
import { chmodSync, existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root } from '../backend/db.mjs';
import { fingerprint, readInventory, additionalInventory } from './add-test-inventory.mjs';
import { loanSchemaState, migrateLoanSchema } from '../backend/loan-schema.mjs';

const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function enableLoanSubmissions({database,apply=false,confirmation}) {
  if (!database) throw Error('Path disposable eksplisit wajib diberikan. DB_PATH tidak diubah.');
  const target=resolve(database),allowed=resolve(root,'database/disposable');
  if(dirname(target)!==allowed || !/^accounts-[a-zA-Z0-9-]+\.disposable\.sqlite$/.test(basename(target)) || !existsSync(target) || realpathSync(target)!==target || realpathSync(allowed)!==allowed) throw Error('Target disposable existing yang teridentifikasi wajib diberikan, tanpa symlink.');
  const reader=new DatabaseSync(target,{readOnly:true});
  let before,backupPath;
  try {
    if(reader.prepare('PRAGMA integrity_check').get().integrity_check!=='ok' || reader.prepare('PRAGMA foreign_key_check').all().length)throw Error('Integritas/FK tidak valid.');
    const roles=reader.prepare('SELECT email,peran FROM pengguna ORDER BY id_pengguna').all();
    if(roles.length!==3 || ![['mahasiswa@smartlend.test','mahasiswa'],['admin@smartlend.test','admin'],['petugas@smartlend.test','petugas']].every(([email,role])=>roles.some(row=>row.email===email&&row.peran===role)))throw Error('Identitas tiga akun uji tidak cocok.');
    const inventory=readInventory(reader);
    const originals=[{kode_barang:'UJI-PRJ-01',nama_barang:'Proyektor (Uji)',stok_total:3},{kode_barang:'UJI-HDM-01',nama_barang:'Kabel HDMI (Uji)',stok_total:5},{kode_barang:'UJI-SPK-01',nama_barang:'Speaker Portable (Uji)',stok_total:2}].map(row=>({...row,jenis:'portabel',satuan:'unit'}));
    if(inventory.length!==12 || ![...originals,...additionalInventory].every(item=>inventory.some(row=>Object.entries(item).every(([key,value])=>row[key]===value))))throw Error('Inventaris 12 barang tidak cocok baseline.');
    before=fingerprint(reader);
    const state=loanSchemaState(reader);
    const summary={target,state,accounts:roles.length,inventory:inventory.length,loans:before.tables.peminjaman.count};
    if(!apply)return {...summary,mode:'read-only audit'};
    if(confirmation!=='ENABLE_LOAN_SUBMISSIONS')throw Error('Konfirmasi ENABLE_LOAN_SUBMISSIONS wajib diberikan.');
    if(state==='ready')return {...summary,changed:false,backup:null};
    const backups=resolve(root,'database/backups');mkdirSync(backups,{recursive:true});
    if(realpathSync(backups)!==backups)throw Error('Direktori backup tidak boleh symlink/junction.');
    backupPath=resolve(backups,`loans-before-${Date.now()}-${randomUUID()}.sqlite`);
    reader.prepare('VACUUM main INTO ?').run(backupPath);chmodSync(backupPath,0o600);
    const backup=new DatabaseSync(backupPath,{readOnly:true});
    try {if(!same(fingerprint(backup),before))throw Error('Snapshot WAL tidak cocok audit.');}finally{backup.close();}
    writeFileSync(backupPath+'.audit.json',JSON.stringify({target,before,inventory},null,2),{flag:'wx',mode:0o600});
  }finally{reader.close();}
  const writer=new DatabaseSync(target);
  try {
    writer.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
    try {
      if(!same(fingerprint(writer),before))throw Error('Database berubah sesudah backup. Audit ulang diperlukan.');
      const oldLoans=writer.prepare('SELECT * FROM peminjaman ORDER BY rowid').all();
      migrateLoanSchema(writer);
      const after=fingerprint(writer);
      for(const [table,value] of Object.entries(before.tables)) {
        if(table!=='peminjaman'&&!same(after.tables[table],value))throw Error(`Data tabel ${table} berubah; rollback.`);
      }
      const updated=writer.prepare('SELECT * FROM peminjaman ORDER BY rowid').all();
      if(updated.length!==oldLoans.length||oldLoans.some((row,i)=>Object.entries(row).some(([key,value])=>updated[i][key]!==value))||updated.some(row=>row.dibuat_pada!==null||row.request_key!==null||row.request_hash!==null))throw Error('Record transaksi lama berubah; rollback.');
      if(writer.prepare('PRAGMA foreign_key_check').all().length)throw Error('FK gagal; rollback.');
      writer.exec('COMMIT');
      return {target,state:'ready',changed:true,backup:backupPath,accountsUnchanged:true,inventoryUnchanged:true,oldLoansUnchanged:true};
    }catch(error){writer.exec('ROLLBACK');throw error;}
  }finally{writer.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    const args=process.argv.slice(2),value=flag=>args.includes(flag)?args[args.indexOf(flag)+1]:undefined;
    console.log(JSON.stringify(enableLoanSubmissions({database:value('--database')||process.env.DB_PATH,apply:args.includes('--apply'),confirmation:value('--confirm')}),null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
