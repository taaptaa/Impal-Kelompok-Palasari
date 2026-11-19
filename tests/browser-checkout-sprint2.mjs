// Full checkout UI/HTTP/SQLite tests. Mutations exclusively on this synthetic memory DB.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { migrateLoanSchema } from '../backend/loan-schema.mjs';
import { makeServer } from '../backend/server.mjs';
import { LoanService } from '../backend/loans.mjs';
import { appendInventory } from '../tools/add-test-inventory.mjs';
import { browserHarness } from './helpers/browser-harness.mjs';

const db=openDb(':memory:'),passwords=Object.fromEntries(['student','admin','warehouse'].map(role=>[role,randomBytes(24).toString('base64url')]));
seed(db,passwords);
for(const [id,code,name,stock] of [[9001,'UJI-PRJ-01','Proyektor (Uji)',3],[9002,'UJI-HDM-01','Kabel HDMI (Uji)',5],[9003,'UJI-SPK-01','Speaker Portable (Uji)',2]])db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,code,name,'portabel','unit',stock);
appendInventory(db);db.exec('BEGIN');migrateLoanSchema(db);db.exec('COMMIT');
const stockBefore=db.prepare('SELECT * FROM barang ORDER BY id_barang').all(),accountsBefore=db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all();
const requests=[],keys=[],held=[];let postMode='normal',optionsMode='normal';
const probe=(await import('node:net')).createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base=`http://127.0.0.1:${port}`,server=makeServer(db,base),backend=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',(req,res)=>{
  requests.push({path:req.url,method:req.method});
  if(req.url==='/api/loans/form-options'&&optionsMode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Gangguan kontrak form sintetis"}');return;}
  if(req.url==='/api/loans'&&req.method==='POST'){
    keys.push(req.headers['idempotency-key']);
    if(postMode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Gangguan sintetis sebelum commit"}');return;}
    if(postMode==='hold'){held.push([req,res]);return;}
    if(postMode==='drop')res.end=()=>res.destroy();
  }
  void backend(req,res);
});
let b;
try {
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));b=await browserHarness(base);
  const {send,evaluate,until,click,fill,navigate,screenshot,noOverflow}=b;
  const login=async(role,label,email)=>{await click(label);await until("!!document.querySelector('input[type=email]')",'email');await fill('input[type=email]',email);await click('Lanjutkan');await until("!!document.querySelector('input[type=password]')",'password');await fill('input[type=password]',passwords[role]);await click('Masuk');};
  await until("document.body.innerText.includes('Masuk Sebagai')",'awal');await click('Lihat Katalog & Keranjang (tanpa login)');await until("document.querySelectorAll('[data-catalog-item]').length===12",'katalog');
  assert.equal(await evaluate("document.querySelectorAll('[data-catalog-item] figcaption').length"),0);
  assert.equal(await evaluate("document.querySelector('[data-nav=plan]').textContent.includes('Keranjang (0)')"),true);
  await click('Kredit Gambar');await until("document.querySelectorAll('[data-photo-credit]').length===12",'kredit semua aset');
  assert.equal(await evaluate("document.querySelectorAll('[data-photo-credit] figcaption a').length"),24);
  assert.equal(await evaluate("[...document.querySelectorAll('[data-photo-credit] figcaption a')].every(a=>a.href.startsWith('https://'))"),true);
  assert.equal(await evaluate("document.body.innerText.includes('foto tidak menunjukkan roda')"),true);
  await click('Kembali ke Katalog');await click('Masuk');await until("document.body.innerText.includes('Masuk Sebagai')",'role');await login('student','Mahasiswa','mahasiswa@smartlend.test');await until("!!document.querySelector('#home-search')",'Home');
  await navigate('plan');assert.equal(await evaluate("document.querySelector('[data-loan-apply]').disabled"),true);
  await click('Tambah Barang');
  for(const [id,qty] of [[9001,1],[9002,2],[9003,1]]){await fill(`#plan-${id}`,String(qty));await evaluate(`document.querySelector('[data-plan-add="${id}"]').click()`);}
  await until("document.querySelector('[data-cart-totals]').textContent==='3 jenis barang · 4 unit barang'",'jenis vs unit');
  await evaluate("document.querySelector('[data-plan-add="+'"9002"'+"]').click()");assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"),3,'same item replaces, no new type');
  await fill('#summary-plan-9001','0.5');await evaluate("document.querySelector('[data-plan-save="+'"9001"'+"]').click()");await until("!!document.querySelector('#cart-error-9001')",'fraction rejected');assert.equal(await evaluate("document.querySelector('[data-plan-summary="+'"9001"'+"]').textContent"),'1 unit');
  await fill('#summary-plan-9001','2');await evaluate("document.querySelector('[data-plan-save="+'"9001"'+"]').click()");await until("document.querySelector('[data-plan-summary="+'"9001"'+"]')?.textContent==='2 unit'",'saved quantity');
  await click('Kurangi Proyektor (Uji)');await until("document.querySelector('[data-cart-totals]').textContent==='3 jenis barang · 4 unit barang'",'minus control');
  await click('Hapus Speaker Portable (Uji)');await until("document.querySelectorAll('[data-plan-summary]').length===2",'remove row');await evaluate("document.querySelector('[data-plan-add="+'"9003"'+"]').click()");
  await click('Ajukan Peminjaman');await until("!!document.querySelector('#loan-form')&&!document.body.innerText.includes('Memeriksa dukungan field tambahan')",'base form');
  assert.equal(await evaluate("document.querySelector('#loan-phone').matches(':disabled')"),true,'Target absent schema: no fake active fields');
  assert.equal(await evaluate("document.querySelector('#loan-acknowledgement').disabled"),true);
  assert.equal(await evaluate("document.querySelector('input[type=file]')===null"),true,'No fake upload');
  await fill('#loan-reason','Draft dasar tidak hilang');await click('Kembali ke Keranjang');await click('Ajukan Peminjaman');await until("document.querySelector('#loan-reason').value==='Draft dasar tidak hilang'",'base draft preserved');
  await click('Batalkan Draft');await until("!!document.querySelector('[role=dialog]')",'explicit draft cancellation');await click('Kosongkan Draft Form');await until("!!document.querySelector('#plan-heading')",'return after cancelling form only');
  assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"),3,'Cancelling form does not empty cart');assert.equal(db.prepare('SELECT COUNT(*) n FROM peminjaman').get().n,0);
  await click('Ajukan Peminjaman');await until("!!document.querySelector('#loan-reason')",'new form after deliberate clear');assert.equal(await evaluate("document.querySelector('#loan-reason').value"),'');
  // Enable DRAFT schema on memory DB only, not user source.
  db.exec(readFileSync(new URL('../database/proposals/003-loan-form.DRAFT.sql',import.meta.url),'utf8'));
  await click('Kembali ke Keranjang');optionsMode='fail';await click('Ajukan Peminjaman');await until("document.querySelector('[role=alert]')?.textContent.includes('Gangguan kontrak form sintetis')",'capability error visible');optionsMode='normal';await click('Coba Status Form Lagi');await until("!document.querySelector('#loan-phone').matches(':disabled')",'capability retry, full form enabled');
  await fill('#loan-phone','abc');await fill('#loan-activityName','Kegiatan Checkout Sintetis');await fill('#loan-activityLocation','Lokasi Uji');await fill('#loan-activityDescription','Deskripsi kegiatan sintetis tersimpan.');await fill('#loan-borrowerIdentifier','ID-UJI-01');await fill('#loan-unit','Unit Uji');
  await fill('#loan-start','2030-12-31T09:30');await fill('#loan-end','2031-01-01T12:45');await fill('#loan-reason','Keperluan terpisah, tidak berisi metadata tersembunyi');
  assert.equal(await evaluate("document.querySelector('#loan-submit').disabled"),true);
  await fill('#loan-phone','+628123456789');assert.equal(await evaluate("document.querySelector('#loan-submit').disabled"),true,'Acknowledgement required on extended form');
  await evaluate("document.querySelector('#loan-acknowledgement').click()");await until("!document.querySelector('#loan-submit').disabled",'full valid');
  await fill('#checkout-9001','0.5');await evaluate("document.querySelector('[data-plan-save="+'"9001"'+"]').click()");await until("document.querySelector('#loan-submit').disabled",'Unsaved/invalid checkout quantity prevents submit');
  await fill('#checkout-9001','1');await evaluate("document.querySelector('[data-plan-save="+'"9001"'+"]').click()");await until("!document.querySelector('#loan-submit').disabled",'Corrected quantity permits submit');
  await click('Tambah jumlah Proyektor (Uji)');await until("document.querySelector('[data-cart-totals]').textContent==='3 jenis barang · 5 unit barang'",'checkout plus');await click('Kurangi Proyektor (Uji)');await until("document.querySelector('[data-cart-totals]').textContent==='3 jenis barang · 4 unit barang'",'checkout minus');
  await click('Tambah Barang');await until("!!document.querySelector('#catalog-search')",'checkout to catalog');await click('Ajukan Peminjaman');await until("document.querySelector('#loan-phone')?.value==='+628123456789'",'contact draft preserved after Add Items');
  await click('Batalkan Draft');await until("!!document.querySelector('[role=dialog]')",'cancel confirmation');await click('Lanjut Mengisi');await until("!document.querySelector('[role=dialog]')",'cancel dismissed');assert.equal(await evaluate("document.querySelector('#loan-activityName').value"),'Kegiatan Checkout Sintetis');
  const sizes=[{width:1920,height:1080,cols:4},{width:1440,height:900,cols:4},{width:768,height:1024,cols:2},{width:390,height:844,cols:1},{width:320,height:568,cols:1},{width:640,height:320,cols:2}];
  for(const size of sizes){
    await send('Emulation.setDeviceMetricsOverride',{width:size.width,height:size.height,deviceScaleFactor:1,mobile:size.width<400});
    await navigate('home');await until("!!document.querySelector('[data-home-content]')",'Home layout');
    const align=await evaluate("(()=>{const h=document.querySelector('[data-home-header]').getBoundingClientRect(),c=document.querySelector('[data-home-content]').getBoundingClientRect();return {left:h.left-c.left,width:c.width,header:h.width};})()");
    assert.ok(Math.abs(align.left)<1&&Math.abs(align.width-align.header)<1);if(size.width===1920)assert.ok(align.width>=1400&&align.width<=1440);
    await noOverflow();await evaluate('window.scrollTo(0,0)');await screenshot(`checkout-home-${size.width}.png`);
    await navigate('catalog');await until("document.querySelectorAll('[data-catalog-item]').length===12",'catalog');assert.equal(await evaluate("getComputedStyle(document.querySelector('.sl-catalog-grid')).gridTemplateColumns.split(' ').length"),size.cols);
    await evaluate("document.querySelectorAll('[data-catalog-item] img').forEach(img=>img.loading='eager')");await until("[...document.querySelectorAll('[data-catalog-item] img')].every(img=>img.complete&&img.naturalWidth>0)",'12 images');await noOverflow();await screenshot(`checkout-catalog-${size.width}.png`);
    await navigate('plan');await until("document.activeElement.id==='plan-heading'",'cart focus');
    assert.equal(await evaluate("[...document.querySelectorAll('[data-nav=plan]')].every(e=>e.textContent.includes('Keranjang (3)'))"),true);assert.equal(await evaluate("document.querySelector('[data-cart-totals]').textContent"),'3 jenis barang · 4 unit barang');await noOverflow();await screenshot(`checkout-cart-${size.width}.png`);
    await click('Ajukan Peminjaman');await until("!!document.querySelector('#loan-form')&&!document.querySelector('#loan-phone').matches(':disabled')",'full form after navigation');
    for(const [selector,value] of [['#loan-phone','+628123456789'],['#loan-activityName','Kegiatan Checkout Sintetis'],['#loan-start','2030-12-31T09:30']])assert.equal(await evaluate(`document.querySelector('${selector}').value`),value);
    assert.equal(await evaluate("document.querySelector('[aria-label="+'"Checkout peminjaman"'+"] .sl-checkout-grid').children.length"),2);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.sl-checkout-grid')).gridTemplateColumns.split(' ').length"),size.width>=1024?2:1);
    assert.equal(await evaluate("document.querySelector('#loan-form').innerText.includes('mahasiswa@smartlend.test')"),true);
    assert.equal(await evaluate("document.querySelector('#loan-form input[type=email]')===null"),true,'Trusted identity not editable');
    await noOverflow();await evaluate('window.scrollTo(0,0)');await screenshot(`checkout-form-${size.width}.png`);
    await click('Lihat Jadwal Barang');await until("document.querySelector('[role=dialog]')?.innerText.includes('Pembacaan backend:')",'schedule dialog actual API');
    assert.equal(await evaluate("document.querySelectorAll('[data-connected-schedule]').length"),1);
    assert.equal(await evaluate("document.querySelector('[role=dialog]').innerText.includes('Belum diverifikasi')"),true);
    const geom=await evaluate("(()=>{const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,overflow:d.scrollWidth>d.clientWidth+1};})()");assert.ok(geom.left>=15&&geom.right<=size.width-15);assert.equal(geom.overflow,false);
    await screenshot(`checkout-schedule-dialog-${size.width}.png`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until("!document.querySelector('[role=dialog]')",'Escape closes');
    assert.equal(await evaluate("document.activeElement.textContent"),'Lihat Jadwal Barang');
    await evaluate("document.querySelector('#loan-submit').scrollIntoView({block:'center'})");
    assert.equal(await evaluate("(()=>{const b=document.querySelector('#loan-submit'),r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()"),true,'Submit not obscured');
    assert.deepEqual(db.prepare('SELECT * FROM barang ORDER BY id_barang').all(),stockBefore);
    console.log(`PASS checkout/Home/catalog/cart/form/dialog/focus/overflow ${size.width}x${size.height}`);
  }
  const keyStart=keys.length;postMode='drop';await click('Kirim Pengajuan');await until("document.querySelector('#loan-form [role=alert]')!==null",'response lost after full commit');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM informasi_pengajuan').get().n,1);
  assert.equal(await evaluate("document.body.innerText.includes('Pengajuan Berhasil Dikirim')"),false);
  await click('Kembali ke Keranjang');await click('Ajukan Peminjaman');await until("document.querySelector('#loan-phone').matches(':disabled')",'ambiguous snapshot locked');
  postMode='hold';await click('Coba Kirim Lagi dengan Aman');for(let i=0;i<100&&!held.length;i++)await delay(50);assert.equal(held.length,1);
  await evaluate("document.querySelector('#loan-form').requestSubmit();document.querySelector('#loan-form').requestSubmit()");assert.equal(held.length,1);
  assert.equal(new Set(keys.slice(keyStart)).size,1,'Full-form retry keeps same key');
  postMode='normal';for(const [req,res] of held.splice(0))void backend(req,res);
  await until("!!document.querySelector('[data-loan-receipt]')",'committed receipt');
  const id=await evaluate("Number(document.querySelector('[data-loan-receipt]').dataset.loanReceipt)");
  const saved=new LoanService(db).detail(1,id);assert.equal(saved.details.activityName,'Kegiatan Checkout Sintetis');assert.equal(saved.reason,'Keperluan terpisah, tidak berisi metadata tersembunyi');assert.equal(saved.startsAt,'2030-12-31T02:30:00.000Z');assert.equal(saved.status,'menunggu');assert.equal(saved.totalTypes,3);assert.equal(saved.totalUnits,4);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM peminjaman').get().n,1);
  await send('Page.reload');await until("document.querySelector('[aria-label="+'"Informasi tambahan tersimpan"'+"]')?.innerText.includes('Kegiatan Checkout Sintetis')",'GET persists after refresh');
  await navigate('plan');assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"),0,'Memory cart reset on refresh, saved loan retained');
  await click('Logout');await until("document.body.innerText.includes('Masuk Sebagai')",'logout');await login('admin','Admin','admin@smartlend.test');
  await until("document.querySelectorAll('[data-admin-request]').length===1",'Admin sees same transaction');assert.equal(await evaluate("document.querySelector('[data-admin-stat=total] strong').textContent"),'1');
  await evaluate(`document.querySelector('[data-admin-detail="${id}"]').click()`);await until("document.querySelector('[role=dialog] [aria-label="+'"Informasi tambahan tersimpan"'+"]')?.innerText.includes('Kegiatan Checkout Sintetis')",'Admin details read same data');
  assert.equal(await evaluate("[...document.querySelectorAll('[role=dialog] button')].filter(b=>['Setujui','Tolak'].includes(b.textContent)).every(b=>b.disabled)"),true);
  assert.equal(requests.some(r=>/\/(approve|reject)$/.test(r.path)),false);
  assert.deepEqual(db.prepare('SELECT * FROM barang ORDER BY id_barang').all(),stockBefore);assert.deepEqual(db.prepare('SELECT * FROM pengguna ORDER BY id_pengguna').all(),accountsBefore);assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  console.log(`PASS full-form read-back owner/Admin, no fake upload/legal policy, response lost/retry/double submit, private metadata and stock unchanged. Screenshots: ${b.profile}`);
}finally{for(const [,res] of held)res.destroy();b?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));db.close();}
