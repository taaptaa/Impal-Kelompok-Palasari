import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { openDb, root } from '../backend/db.mjs';
import { PasswordHasher } from '../backend/auth.mjs';
import { seed, provisionDisposable } from '../backend/seed.mjs';
import { makeServer } from '../backend/server.mjs';

const passwords = () => Object.fromEntries(['student','admin','warehouse'].map(role=>[role,randomBytes(24).toString('base64url')]));

test('seed memvalidasi password berbeda dan tidak mengubah akun existing', () => {
  const db=openDb(':memory:');
  try {
    const credentials=passwords();
    assert.throws(()=>seed(db,{...credentials,admin:credentials.student}),/berbeda/);
    assert.throws(()=>seed(db,{...credentials,admin:'short'}),/12–200/);
    assert.throws(()=>seed(db,{...credentials,admin:'x'.repeat(201)}),/12–200/);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM pengguna').get().count,0);
    seed(db,credentials);
    const before=db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all();
    for(const [index,role] of ['student','admin','warehouse'].entries()) {
      assert.ok(new PasswordHasher().verify(credentials[role],before[index].password_hash));
      assert.notEqual(before[index].password_hash,credentials[role]);
    }
    assert.throws(()=>seed(db,passwords()),/sudah berisi akun/);
    assert.deepEqual(db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all(),before);
  } finally { db.close(); }
});

test('provisioning CLI environment memverifikasi database baru, menolak existing, dan akun dapat login/logout', async () => {
  const path=resolve(root,'database/disposable',`accounts-test-${randomUUID()}.disposable.sqlite`);
  const credentials=passwords();
  const confirmed='CREATE_NEW_DISPOSABLE';
  assert.throws(()=>provisionDisposable({path,passwords:credentials,confirmed:'no'}),/Konfirmasi/);
  assert.equal(existsSync(path),false);
  assert.throws(()=>provisionDisposable({path:resolve(root,'database/smartlend.sqlite'),passwords:credentials,confirmed}),/DB_PATH/);
  assert.throws(()=>provisionDisposable({path,passwords:{...credentials,admin:credentials.student},confirmed}),/berbeda/);
  assert.equal(existsSync(path),false);
  const result=spawnSync(process.execPath,[resolve(root,'backend/seed.mjs')],{
    encoding:'utf8',
    env:{...process.env,DB_PATH:path,SMARTLEND_PROVISION_CONFIRM:confirmed,
      SMARTLEND_STUDENT_PASSWORD:credentials.student,SMARTLEND_ADMIN_PASSWORD:credentials.admin,SMARTLEND_WAREHOUSE_PASSWORD:credentials.warehouse},
  });
  assert.equal(result.status,0,'CLI provisioning gagal');
  assert.ok(Object.values(credentials).every(value=>!`${result.stdout}${result.stderr}`.includes(value)),'Output tidak boleh berisi password');
  const before=readFileSync(path);
  assert.throws(()=>provisionDisposable({path,passwords:passwords(),confirmed}),/sudah ada/);
  assert.deepEqual(readFileSync(path),before);
  const db=openDb(path), server=makeServer(db);
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const url=`http://127.0.0.1:${server.address().port}`;
    const post=(route,data,cookie='',csrf='')=>fetch(url+route,{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':csrf},body:JSON.stringify(data)});
    assert.equal((await fetch(url+'/api/admin')).status,401);
    for(const [role,email] of [['student','mahasiswa@smartlend.test'],['warehouse','petugas@smartlend.test'],['admin','admin@smartlend.test']]) {
      const login=await post('/api/login',{email,password:credentials[role],role});
      assert.equal(login.status,200);
      const session=await login.json(), cookie=login.headers.get('set-cookie').split(';')[0];
      assert.equal(session.user.role,role);
      assert.equal((await fetch(url+'/api/admin',{headers:{Cookie:cookie}})).status,role==='admin'?200:403);
      assert.equal((await post('/api/login',{email,password:randomBytes(24).toString('base64url'),role})).status,401);
      assert.equal((await post('/api/logout',{},cookie,session.csrf)).status,200);
      assert.equal((await fetch(url+'/api/me',{headers:{Cookie:cookie}})).status,401);
    }
  } finally {
    if(server.listening) await new Promise(resolve=>server.close(resolve));
    db.close();
  }
  // Database uji hanya berisi akun sintetis; tidak dihapus otomatis.
});
