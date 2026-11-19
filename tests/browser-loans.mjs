// Alur transaksi browser. Semua mutasi pada SQLite :memory: terpisah, bukan DB pemilik.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { makeServer } from '../backend/server.mjs';
import { migrateLoanSchema } from '../backend/loan-schema.mjs';
import { LoanService } from '../backend/loans.mjs';
import { appendInventory } from '../tools/add-test-inventory.mjs';
import { jakartaToUtc } from '../src/app/loan-validation.mjs';

const db=openDb(':memory:');
const passwords=Object.fromEntries(['student','admin','warehouse'].map(role=>[role,randomBytes(24).toString('base64url')]));
seed(db,passwords);
for(const [id,code,name,stock] of [[9001,'UJI-PRJ-01','Proyektor (Uji)',3],[9002,'UJI-HDM-01','Kabel HDMI (Uji)',5],[9003,'UJI-SPK-01','Speaker Portable (Uji)',2]]) db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,code,name,'portabel','unit',stock);
appendInventory(db);db.exec('BEGIN');migrateLoanSchema(db);db.exec('COMMIT');
const beforeItems=db.prepare('SELECT * FROM barang ORDER BY id_barang').all();
const beforeAccounts=db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all();
const probe=(await import('node:net')).createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base=`http://127.0.0.1:${port}`,server=makeServer(db,base),backend=server.listeners('request')[0];
server.removeAllListeners('request');
let postMode='normal',getMode='normal';const held=[],keys=[];
server.on('request',(req,res)=>{
  if(req.method==='POST'&&req.url==='/api/loans'){
    keys.push(req.headers['idempotency-key']);
    if(postMode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Gangguan sintetis sebelum commit.'}));return;}
    if(postMode==='hold'){held.push([req,res]);return;}
    if(postMode==='drop-after-commit')res.end=()=>res.destroy();
  }
  if(req.method==='GET'&&req.url==='/api/loans/mine'&&getMode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Riwayat sintetis gagal dimuat.'}));return;}
  void backend(req,res);
});
const profile=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-loan-browser-'));
let chrome,socket;
try {
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  let debugPort;
  for(let i=0;i<150;i++){try{debugPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{await delay(100);}}
  assert.ok(debugPort,'Chrome belum siap');
  const target=await(await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(base)}`,{method:'PUT'})).json();
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data),task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(Error(message.error.message)):task.resolve(message.result);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error(data.exceptionDetails.exception?.description||data.exceptionDetails.text);return data.result.value;};
  const until=async(expression,label)=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw Error(`Timeout: ${label}`);};
  const click=async text=>evaluate(`(() => {const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}||e.querySelector('h3')?.textContent.trim()===${JSON.stringify(text)}||e.getAttribute('aria-label')===${JSON.stringify(text)});if(!e)throw Error('Button missing: '+${JSON.stringify(text)});e.click();})()`);
  const fill=async(selector,value)=>evaluate(`(() => {const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const navigate=async screen=>evaluate(`(() => {const e=[...document.querySelectorAll('[data-nav="${screen}"]')].find(e=>e.getClientRects().length);if(!e)throw Error('Navigation missing');e.click();})()`);
  const screenshot=async name=>{const data=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(profile,name),Buffer.from(data.data,'base64'));};
  const noOverflow=async()=>assert.equal(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),true);
  const loanCount=()=>db.prepare('SELECT COUNT(*) AS n FROM peminjaman').get().n;
  await until("document.body.innerText.includes('Masuk Sebagai')",'awal anonim');
  await click('Lihat Katalog & Keranjang (tanpa login)');
  await until("document.querySelectorAll('[data-catalog-item]').length===12",'katalog 12');
  assert.equal(await evaluate("!!document.querySelector('[data-loan-apply],[data-nav=loans]')"),false);
  assert.equal(await evaluate("fetch('/api/loans',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(r=>r.status)"),401);
  await click('Masuk');await until("document.body.innerText.includes('Masuk Sebagai')",'pilih role');await click('Mahasiswa');await until("!!document.querySelector('input[type=email]')",'login email');await fill('input[type=email]','mahasiswa@smartlend.test');await click('Lanjutkan');await until("!!document.querySelector('input[type=password]')",'login password');await fill('input[type=password]',passwords.student);await click('Masuk');
  await until("!!document.querySelector('#home-search')",'Home mahasiswa');
  await navigate('loans');await until("document.body.innerText.includes('Belum ada pengajuan.')",'riwayat kosong dari API');
  await send('Emulation.setTimezoneOverride',{timezoneId:'America/New_York'});
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
    await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<400});
    await navigate('plan');await until("!!document.querySelector('[data-loan-apply]')",'Rencana');
    assert.equal(await evaluate("document.querySelector('[data-loan-apply]').disabled"),true,'Tidak bisa ajukan draft kosong');
    const chosen=[[9001,2],[9004,1],[9008,1]];
    for(const [itemId,quantity] of chosen){await fill(`#plan-${itemId}`,String(quantity));await evaluate(`document.querySelector('[data-plan-add="${itemId}"]').click()`);}
    await until("document.querySelectorAll('[data-plan-summary]').length===3",'rencana tiga barang');
    await click('Ajukan Peminjaman');await until("!!document.querySelector('#loan-form')",'form');
    assert.equal(await evaluate("document.querySelectorAll('[data-loan-form-item]').length"),3);
    for(const text of ['Mahasiswa Uji','mahasiswa@smartlend.test','3 jenis barang · 4 unit barang','Asia/Jakarta'])assert.ok(await evaluate(`document.querySelector('#main-content').innerText.includes(${JSON.stringify(text)})`));
    await screenshot(`form-identity-${size.width}.png`);
    assert.equal(await evaluate("document.querySelector('#loan-submit').disabled"),true,'Submit disabled jika form kosong');
    await evaluate("document.querySelector('#loan-form').requestSubmit()");
    await until("!!document.querySelector('#loan-error-startsAt')&&!!document.querySelector('#loan-error-endsAt')&&!!document.querySelector('#loan-error-reason')",'validasi wajib per field');
    await noOverflow();await screenshot(`form-errors-${size.width}.png`);
    const start=new Date(Date.now()+2*86400000+7*3600000).toISOString().slice(0,16),end=new Date(Date.now()+3*86400000+7*3600000).toISOString().slice(0,16);
    const past=new Date(Date.now()-86400000+7*3600000).toISOString().slice(0,16);
    await fill('#loan-start',past);await fill('#loan-end',end);await fill('#loan-reason','Uji');assert.equal(await evaluate("document.querySelector('#loan-submit').disabled"),true);await evaluate("document.querySelector('#loan-form').requestSubmit()");await until("!!document.querySelector('#loan-error-startsAt')",'mulai lampau');
    await fill('#loan-start',start);await fill('#loan-end',start);await evaluate("document.querySelector('#loan-form').requestSubmit()");await until("!!document.querySelector('#loan-error-endsAt')",'kembali sama');
    await fill('#loan-end',past);await evaluate("document.querySelector('#loan-form').requestSubmit()");await until("!!document.querySelector('#loan-error-endsAt')",'kembali sebelum mulai');
    await fill('#loan-end',end);await fill('#loan-reason','A'.repeat(151));await evaluate("document.querySelector('#loan-form').requestSubmit()");await until("!!document.querySelector('#loan-error-reason')",'keperluan panjang');
    const reason=`UJI SPRINT 2 — pengajuan sintetis browser ${size.width}`;
    await fill('#loan-reason',reason);await noOverflow();
    await evaluate("document.querySelector('#loan-submit').scrollIntoView({block:'center'})");
    assert.equal(await evaluate("(() => {const b=document.querySelector('#loan-submit'),r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()"),true,'Submit tidak tertutup Navbar/BottomNav');
    await screenshot(`form-valid-${size.width}.png`);
    const before=loanCount(),keyIndex=keys.length;
    postMode=size.width===390?'drop-after-commit':'fail';
    await click('Kirim Pengajuan');await until("document.querySelector('#loan-form [role=alert]')!==null",'gagal API mempertahankan draft');
    assert.equal(loanCount(),before+(size.width===390?1:0));
    assert.equal(await evaluate("document.body.innerText.includes('Pengajuan Berhasil Dikirim')"),false);
    await click('Kembali ke Keranjang');
    assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"),3);
    await click('Ajukan Peminjaman');await until("!!document.querySelector('#loan-form')",'retry form');
    assert.equal(await evaluate("document.querySelector('#loan-start').disabled"),true,'Request ambiguous dikunci ke snapshot');
    postMode='hold';
    await click('Coba Kirim Lagi dengan Aman');
    await until("document.querySelector('#loan-submit').disabled",'loading');
    for(let i=0;i<100&&!held.length;i++)await delay(50);assert.equal(held.length,1);
    const requestsBeforeDouble=keys.length;
    await evaluate("document.querySelector('#loan-form').requestSubmit();document.querySelector('#loan-form').requestSubmit()");
    assert.equal(keys.length,requestsBeforeDouble,'Klik ganda tidak menambah request');
    // Chrome dapat mengulang POST sendiri saat koneksi diputus setelah commit.
    // Seluruh retry jaringan maupun retry UI wajib tetap memakai satu key.
    assert.ok(keys.slice(keyIndex).length>=2);
    assert.equal(new Set(keys.slice(keyIndex)).size,1,'Semua retry memakai key sama setelah navigasi');
    assert.equal(await evaluate("document.body.innerText.includes('Pengajuan Berhasil Dikirim')"),false,'Tidak ada konfirmasi sebelum commit');
    await evaluate("document.querySelector('#loan-submit').scrollIntoView({block:'center'})");
    await screenshot(`form-loading-${size.width}.png`);
    postMode='normal';for(const [req,res] of held.splice(0))void backend(req,res);
    await until("document.body.innerText.includes('Pengajuan Berhasil Dikirim')",'konfirmasi setelah commit');
    await until("!!document.querySelector('[data-loan-receipt]')",'receipt');
    const receiptId=await evaluate("Number(document.querySelector('[data-loan-receipt]').dataset.loanReceipt)");
    const saved=new LoanService(db).detail(1,receiptId);
    assert.equal(saved.startsAt,jakartaToUtc(start));assert.equal(saved.endsAt,jakartaToUtc(end));assert.equal(saved.reason,reason);assert.equal(saved.status,'menunggu');assert.deepEqual(saved.items.map(item=>[item.itemId,item.quantity]),chosen);
    assert.equal(loanCount(),before+1,'Retry setelah kegagalan/commit tidak menduplikasi');
    await until("!document.querySelector('[data-sonner-toast]')",'notifikasi selesai');await noOverflow();await screenshot(`confirmation-${size.width}.png`);
    await send('Page.reload');await until(`!!document.querySelector('[data-loan-receipt="${receiptId}"]')`,'refresh detail tersimpan');
    assert.equal(await evaluate("document.body.innerText.includes('Pengajuan Berhasil Dikirim')"),false,'Refresh membaca GET, bukan sukses palsu');
    await noOverflow();
    await navigate('plan');await until("document.querySelectorAll('[data-plan-summary]').length===0",'Draft sudah dikosongkan setelah sukses');
    assert.equal(await evaluate("document.querySelector('[data-loan-apply]').disabled"),true);
    await navigate('loans');await until(`document.querySelectorAll('[data-my-loan]').length===${loanCount()}`,'daftar backend setelah refresh');
    await evaluate(`document.querySelector('[data-loan-detail="${receiptId}"]').click()`);await until(`!!document.querySelector('[data-loan-receipt="${receiptId}"]')`,'Detail dari daftar');
    await noOverflow();await screenshot(`detail-${size.width}.png`);
    assert.deepEqual(db.prepare('SELECT * FROM barang ORDER BY id_barang').all(),beforeItems);
    console.log(`PASS AC-01–05/13–15/17/22: form WIB, validasi, gagal API/response hilang, retry, double submit, konfirmasi, daftar/detail/refresh, stok tetap (${size.width}x${size.height})`);
  }
  getMode='fail';await navigate('loans');await until("document.querySelector('[role=alert]')?.textContent.includes('Riwayat sintetis gagal')",'riwayat error');getMode='normal';await click('Coba Muat Lagi');await until("document.querySelectorAll('[data-my-loan]').length===3",'riwayat retry');
  db.prepare('INSERT INTO pengguna SELECT 4,?,?,password_hash,?,1 FROM pengguna WHERE id_pengguna=1').run('Pemilik Lain Sintetis','lain@smartlend.test','mahasiswa');
  const other=new LoanService(db).create(4,randomUUID(),{items:[{itemId:9002,quantity:1}],startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+172800000).toISOString(),reason:'UJI privat pengguna lain'}).loan;
  await send('Page.navigate',{url:base+`/#loans/${other.id}`});await until("document.querySelector('[role=alert]')?.textContent.includes('Pengajuan tidak ditemukan')",'IDOR ditolak tanpa bocor');
  assert.equal(await evaluate("!!document.querySelector('[data-loan-receipt]')"),false);
  assert.equal(await evaluate("document.body.innerText.includes('UJI privat pengguna lain')"),false);
  assert.deepEqual(db.prepare('SELECT * FROM pengguna WHERE id_pengguna<=3 ORDER BY id_pengguna').all(),beforeAccounts);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM peminjaman WHERE status<>'menunggu' OR id_admin IS NOT NULL").get().n,0);
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  await click('Logout');await until("document.body.innerText.includes('Masuk Sebagai')",'logout');
  assert.equal(await evaluate('window.location.hash'),'','Logout menghapus deep link transaksi');
  await click('Mahasiswa');await until("!!document.querySelector('input[type=email]')",'login ulang email');await fill('input[type=email]','mahasiswa@smartlend.test');await click('Lanjutkan');await until("!!document.querySelector('input[type=password]')",'login ulang password');await fill('input[type=password]',passwords.student);await click('Masuk');await until("!!document.querySelector('#home-search')",'login baru tetap menuju Home');
  console.log(`PASS AC-16/19/20/24: IDOR/empty/error, inventaris 12, akun/hash dan stok tetap, tanpa approval/payment. Screenshot: ${profile}`);
}finally{
  for(const [,res] of held)res.destroy();socket?.close();chrome?.kill();if(server.listening)await new Promise(resolve=>server.close(resolve));db.close();
}
