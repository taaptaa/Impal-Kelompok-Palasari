// Snapshot fingerprint hanya-baca. Tidak menulis SQLite, tidak menampilkan hash password/token.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { fingerprint } from './add-test-inventory.mjs';
const [database,mode,file]=process.argv.slice(2);
if(!database||!['record','verify'].includes(mode)||!file)throw Error('Gunakan <database existing> record|verify <file audit lokal>.');
const target=resolve(database),db=new DatabaseSync(target,{readOnly:true});
try {
  const current=fingerprint(db);
  if(mode==='record')writeFileSync(file,JSON.stringify({target,before:current},null,2),{flag:'wx',mode:0o600});
  else {
    const saved=JSON.parse(readFileSync(file,'utf8'));assert.equal(saved.target,target);
    // Sesi/percobaan login dapat berubah akibat aplikasi pengguna yang sedang berjalan.
    // Dilaporkan terpisah, bukan mengabaikan perubahan akun/inventaris/transaksi.
    assert.equal(current.schemaHash,saved.before.schemaHash,'Schema berubah');
    for(const [name,value] of Object.entries(saved.before.tables))if(!['sesi','percobaan_login'].includes(name))assert.deepEqual(current.tables[name],value,`Data ${name} berubah; periksa aktivitas pengguna, jangan reset data.`);
    console.log(JSON.stringify({result:'PASS',schemaUnchanged:true,accountsAndHashesUnchanged:true,inventoryAndStocksUnchanged:true,loansAndOtherBusinessDataUnchanged:true,accounts:current.tables.pengguna.count,items:current.tables.barang.count,loans:current.tables.peminjaman.count,sessionTablesUnchanged:['sesi','percobaan_login'].every(name=>JSON.stringify(current.tables[name])===JSON.stringify(saved.before.tables[name])),integrity:db.prepare('PRAGMA integrity_check').get().integrity_check,foreignKeyIssues:db.prepare('PRAGMA foreign_key_check').all().length},null,2));
  }
}finally{db.close();}
