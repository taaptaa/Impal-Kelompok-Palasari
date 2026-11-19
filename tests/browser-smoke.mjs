// Uji opsional: jalankan setelah build. Membutuhkan Chrome lokal, tidak memakai data produksi.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { makeServer } from '../backend/server.mjs';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(process.env.LOCALAPPDATA + '\\Temp\\opencode', 'smartlend-browser-'));
const passwords = Object.fromEntries(['student','admin','warehouse'].map(role => [role,randomBytes(24).toString('base64url')]));
const db = openDb(':memory:');
seed(db, passwords);
for (const [id, code, name, total] of [[91, 'TEST-91', 'Barang uji alfa', 7], [92, 'TEST-92', 'Barang uji beta', 4]]) {
  db.prepare('INSERT INTO barang(id_barang,kode_barang,nama_barang,jenis,satuan,stok_total) VALUES(?,?,?,?,?,?)').run(id,code,name,id===92?'tetap':'portabel','unit',total);
}
db.prepare('INSERT INTO ruangan(id_ruangan,kode_ruangan,nama_ruangan,kapasitas,lokasi,status_operasional) VALUES(?,?,?,?,?,?)')
  .run(601,'TEST-R601','Ruangan sintetis browser',25,'Gedung uji','perawatan');
const portProbe = (await import('node:net')).createServer();
await new Promise(resolve => portProbe.listen(0,'127.0.0.1',resolve));
const port = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = makeServer(db,base);
let chrome, socket;
try {
  await new Promise(resolve => server.listen(port,'127.0.0.1',resolve));
  chrome = spawn(chromePath,['--headless=new','--no-first-run','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  let debugPort;
  for(let i=0;i<100;i++) {
    try { debugPort = Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]); break; } catch { await delay(100); }
  }
  assert.ok(debugPort,'Chrome CDP gagal dijalankan');
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(base)}`,{method:'PUT'})).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true}); });
  let id=0;
  const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(!message.id)return;const task=pending.get(message.id);if(task){pending.delete(message.id);message.error?task.reject(Error(message.error.message)):task.resolve(message.result);} });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const until=async (check,label)=>{
    for(let i=0;i<100;i++){if(await check()) return;await delay(100);}
    throw Error(`Timeout browser: ${label}`);
  };
  const click=async text=>evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}) || b.getAttribute('aria-label')===${JSON.stringify(text)}); if(!button) throw Error('Button not found'); button.click(); return true; })()`);
  const fill=async (selector,value)=>evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); if(!input) throw Error('Input not found'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  const navigate=async screen=>evaluate(`(() => { const button=[...document.querySelectorAll('[data-nav="${screen}"]')].find(b=>b.getClientRects().length); if(!button) throw Error('Navigation missing'); button.click(); })()`);
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'pemilihan role anonim');
  assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"),401);
  await click('Lihat Katalog & Keranjang');
  await navigate('rooms');
  await until(async()=>await evaluate("!!document.querySelector('[data-room=\"601\"]')"),'room database');
  assert.ok(await evaluate("document.querySelector('[data-room=\"601\"]').innerText.includes('Ruangan sintetis browser')"));
  assert.ok(await evaluate("document.querySelector('[data-room=\"601\"]').innerText.includes('25 orang')"));
  assert.ok(await evaluate("document.querySelector('[data-room=\"601\"]').innerText.includes('Perawatan')"));
  await fill('#room-search','tidak-ada-hasil');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Tidak ada ruangan yang cocok'),'room search no results');
  assert.equal(await evaluate("!!document.querySelector('#home-search')"),false);
  await click('Masuk');
  await click('Mahasiswa');
  await fill('input[type=email]','mahasiswa@smartlend.test');
  await click('Lanjutkan');
  await fill('input[type=password]',passwords.student);
  await click('Masuk');
  await until(async()=>await evaluate("!!document.querySelector('#home-search')"),'Home mahasiswa setelah login');
  for (const name of ['Barang uji alfa','Barang uji beta']) assert.ok(await evaluate(`document.querySelector('#main-content').innerText.includes(${JSON.stringify(name)})`), 'Home menampilkan data API');
  await fill('#home-search','beta');
  await evaluate("document.querySelector('#home-search').form.requestSubmit()");
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Barang uji beta'),'catalog database');
  assert.equal(await evaluate("document.querySelector('#catalog-search').value"),'beta');
  assert.equal(await evaluate("document.querySelectorAll('[data-catalog-item]').length"),1);
  assert.equal(await evaluate("document.querySelector('#catalog-search') !== null"),true);
  await fill('#catalog-search','beta');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Ditemukan 1 dari 2 barang'),'catalog search');
  await fill('#catalog-search','');
  for (const [kind, expectedId] of [['portabel',91],['tetap',92]]) {
    await evaluate(`(() => { const select=document.querySelector('#catalog-kind'); select.value=${JSON.stringify(kind)}; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await until(async()=>await evaluate("document.querySelectorAll('[data-catalog-item]').length")===1,`filter ${kind}`);
    assert.equal(await evaluate("document.querySelector('[data-catalog-item]').getAttribute('data-catalog-item')"),String(expectedId));
  }
  await fill('#catalog-search','ALFA');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Tidak Ada Barang Ditemukan'),'kombinasi filter tetap dan nama alfa');
  await click('Reset Pencarian');
  await until(async()=>await evaluate("document.querySelectorAll('[data-catalog-item]').length")===2,'reset pencarian dan jenis');
  assert.equal(await evaluate("document.querySelector('#catalog-kind').value"),'all');
  await fill('#plan-91','2');
  await evaluate("document.querySelector('[data-plan-add=\"91\"]').click()");
  await fill('#plan-92','1');
  await evaluate("document.querySelector('[data-plan-add=\"92\"]').click()");
  await until(async()=>String(await evaluate("document.querySelector('#plan-heading').parentElement.innerText")).includes('Barang uji beta'),'plan 2 barang');
  assert.equal(await evaluate("document.querySelector('#plan-heading').parentElement.querySelectorAll('ul li').length"),2);
  await fill('#plan-91','3');
  await evaluate("document.querySelector('[data-plan-add=\"91\"]').click()");
  await until(async()=>await evaluate("document.querySelector('#plan-heading').parentElement.querySelectorAll('ul li').length")===2 && await evaluate("document.querySelector('[data-plan-summary=\"91\"]').textContent") === '3 unit','edit cart quantity, without duplicate type');
  await click('Hapus Barang uji alfa');
  await until(async()=>await evaluate("document.querySelector('#plan-heading').parentElement.querySelectorAll('ul li').length")===1,'remove from plan');
  assert.equal((await (await fetch(base+'/api/catalog')).json()).barang[0].stok_total,7);
  const desktopShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync(join(profile,'catalog-desktop.png'),Buffer.from(desktopShot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),true);
  const mobileShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync(join(profile,'catalog-mobile.png'),Buffer.from(mobileShot.data,'base64'));
  assert.equal(await evaluate("[...document.querySelectorAll('#main-content button')].some(button=>button.textContent.trim()==='Kembali')"),false,'Tombol Kembali redundan tidak ditampilkan untuk mahasiswa');
  await navigate('home');
  await click('Logout');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'student logout awal');
  await click('Admin');
  await fill('input[type=email]','admin@smartlend.test');
  await click('Lanjutkan');
  await fill('input[type=password]',passwords.admin);
  await click('Masuk');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Admin Dashboard'),'admin dashboard');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),true);
  assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"),200);
  await navigate('profile');
  await until(async()=>String(await evaluate("document.querySelector('#main-content').innerText")).includes('admin@smartlend.test'),'profile database');
  assert.equal(await evaluate("document.querySelector('#main-content').innerText.includes('+62 812')"),false);
  await navigate('dashboard');
  assert.equal(await evaluate("document.cookie.includes('sid=')"),false);
  await send('Page.reload');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Admin Dashboard'),'admin session restored');
  await click('Lihat Katalog Database');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Barang uji alfa'),'admin catalog');
  await click('Kembali');
  await click('Logout');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'admin logout');
  assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"),401);
  await click('Logistik');
  await fill('input[type=email]','petugas@smartlend.test');
  await click('Lanjutkan');
  await fill('input[type=password]',passwords.warehouse);
  await click('Masuk');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Dashboard Logistik'),'warehouse dashboard');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),true);
  assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"),403);
  await click('Logout');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'warehouse logout');
  await click('Mahasiswa');
  await fill('input[type=email]','mahasiswa@smartlend.test');
  await click('Lanjutkan');
  await fill('input[type=password]',passwords.student);
  await click('Masuk');
  await until(async()=>await evaluate("!!document.querySelector('#home-search')"),'student Home');
  await navigate('profile');
  await until(async()=>String(await evaluate("document.querySelector('#main-content').innerText")).includes('mahasiswa@smartlend.test'),'student profile session');
  assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"),403);
  await click('Syarat & Ketentuan');
  assert.equal(await evaluate("document.body.innerText.includes('Rp 10.000')"),false);
  await click('Mengerti');
  await click('Keluar dari Akun');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'student profile logout');
  assert.equal(await evaluate("fetch('/api/me').then(r=>r.status)"),401);
  db.prepare('DELETE FROM barang').run();
  await send('Page.reload');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'reload after empty inventory');
  await click('Lihat Katalog & Keranjang');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Belum Ada Data Barang'),'empty catalog');
  db.exec('DROP TABLE barang'); // hanya database :memory: disposable, memicu error API
  await send('Page.reload');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Masuk Sebagai'),'reload after API failure');
  await click('Lihat Katalog & Keranjang');
  await until(async()=>String(await evaluate('document.body.innerText')).includes('Katalog gagal dimuat'),'catalog error');
  console.log(`PASS browser: Home/search, katalog barang/ruangan, empty/error, rencana, profil, mobile, login/logout tiga role, akses tidak sah. Screenshot: ${profile}`);
} finally {
  if(socket) socket.close();
  if(chrome) chrome.kill();
  if(server.listening) await new Promise(resolve => server.close(resolve));
  db.close();
}
