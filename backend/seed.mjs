import { closeSync, existsSync, mkdirSync, openSync, realpathSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDb, root } from './db.mjs';
import { PasswordHasher } from './auth.mjs';

function validatePasswords(passwords) {
  const values = ['student', 'admin', 'warehouse'].map(role => passwords?.[role]);
  if(values.some(value => typeof value!=='string'||value.length<12||value.length>200))
    throw new Error('Password setiap role wajib 12–200 karakter.');
  if(new Set(values).size!==3) throw new Error('Password ketiga role wajib berbeda.');
}

export function seed(db,passwords) {
  validatePasswords(passwords);
  const hasher=new PasswordHasher();
  db.exec('BEGIN IMMEDIATE');
  try {
    if(db.prepare('SELECT COUNT(*) AS count FROM pengguna').get().count)
      throw new Error('Provisioning ditolak: database sudah berisi akun.');
    for(const [id,nama,email,peran,role] of [
      [1,'Mahasiswa Uji','mahasiswa@smartlend.test','mahasiswa','student'],
      [2,'Admin Uji','admin@smartlend.test','admin','admin'],
      [3,'Petugas Gudang Uji','petugas@smartlend.test','petugas','warehouse'],
    ]) db.prepare('INSERT INTO pengguna(id_pengguna,nama,email,password_hash,peran,aktif) VALUES(?,?,?,?,?,1)')
      .run(id,nama,email,hasher.hash(passwords[role]),peran);
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

export function provisionDisposable({ path, confirmed, passwords }) {
  // Verifikasi dilakukan sebelum openDb, yang dapat menjalankan DDL.
  if(confirmed!=='CREATE_NEW_DISPOSABLE') throw new Error('Konfirmasi database disposable wajib diberikan.');
  validatePasswords(passwords);
  const databaseDir=resolve(root,'database');
  const disposableDir=resolve(databaseDir,'disposable');
  if(realpathSync(databaseDir)!==databaseDir) throw new Error('Direktori database tidak boleh berupa symlink/junction.');
  if(typeof path!=='string'||dirname(resolve(path))!==disposableDir||!/^accounts-[a-zA-Z0-9-]+\.disposable\.sqlite$/.test(basename(path)))
    throw new Error('DB_PATH harus file accounts-<id>.disposable.sqlite baru di database/disposable.');
  mkdirSync(disposableDir,{recursive:true});
  if(realpathSync(disposableDir)!==disposableDir) throw new Error('Direktori disposable tidak boleh berupa symlink/junction.');
  const target=resolve(path);
  if([target,target+'-wal',target+'-shm',target+'-journal'].some(existsSync))
    throw new Error('Provisioning ditolak: file database atau sidecar sudah ada. Pilih nama baru.');
  // wx menolak file existing, termasuk symlink, tanpa menimpa isinya.
  closeSync(openSync(target,'wx',0o600));
  const db=openDb(target);
  try { seed(db,passwords); } finally { db.close(); }
  return target;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const path=provisionDisposable({
      path:process.env.DB_PATH,
      confirmed:process.env.SMARTLEND_PROVISION_CONFIRM,
      passwords:{student:process.env.SMARTLEND_STUDENT_PASSWORD,warehouse:process.env.SMARTLEND_WAREHOUSE_PASSWORD,admin:process.env.SMARTLEND_ADMIN_PASSWORD},
    });
    console.log(`Tiga akun uji lokal dibuat (hash scrypt). Database disposable: ${path}`);
  } catch(error) {
    // Jangan mencetak payload environment atau objek error yang mungkin mengandung secret.
    console.error(error.code==='EEXIST' ? 'Provisioning ditolak: file sudah ada.' : error.message);
    process.exitCode=1;
  }
}
