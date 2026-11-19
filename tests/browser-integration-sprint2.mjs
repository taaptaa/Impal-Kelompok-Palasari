// Real frontend -> HTTP -> backend -> SQLite. All mutations only in memory.
import assert from 'node:assert/strict';
import { randomBytes,randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { migrateLoanSchema } from '../backend/loan-schema.mjs';
import { appendInventory,fingerprint } from '../tools/add-test-inventory.mjs';
import { LoanService } from '../backend/loans.mjs';
import { makeServer } from '../backend/server.mjs';
import { browserHarness } from './helpers/browser-harness.mjs';

const db=openDb(':memory:'),passwords=Object.fromEntries(['student','admin','warehouse'].map(role=>[role,randomBytes(24).toString('base64url')]));
seed(db,passwords);
for(const [id,code,name,stock] of [[9001,'UJI-PRJ-01','Proyektor (Uji)',3],[9002,'UJI-HDM-01','Kabel HDMI (Uji)',5],[9003,'UJI-SPK-01','Speaker Portable (Uji)',2]])db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id,code,name,'portabel','unit',stock);
appendInventory(db);db.exec('BEGIN');migrateLoanSchema(db);db.exec('COMMIT');
const service=new LoanService(db),start='2030-12-31T16:00:00.000Z',end='2031-01-01T02:00:00.000Z';
for(let i=0;i<15;i++){
  const loan=service.create(1,randomUUID(),{items:i===0?[{itemId:9001,quantity:1},{itemId:9004,quantity:2}]:[{itemId:i===1?9001:9002,quantity:i===1?2:1}],startsAt:start,endsAt:end,reason:`PRIVATE-SYNTHETIC-REASON-${i}`}).loan;
  if(i<2)db.prepare('UPDATE peminjaman SET status=?,id_admin=2 WHERE id_peminjaman=?').run(i===0?'disetujui':'dipinjam',loan.id);
}
const before=fingerprint(db),requests=[],held=[];
let scheduleMode='normal',adminMode='normal',detailMode='normal';
const probe=(await import('node:net')).createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base=`http://127.0.0.1:${port}`,server=makeServer(db,base),backend=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',(req,res)=>{
  const url=new URL(req.url,base);requests.push({method:req.method,path:url.pathname,query:url.search});
  if(url.pathname==='/api/schedule'){
    assert.ok(Date.parse(url.searchParams.get('endsAt'))-Date.parse(url.searchParams.get('startsAt'))<=31*86400000,'Per-request limit');
    if(scheduleMode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Gangguan jadwal sintetis'}));return;}
    if(scheduleMode==='hold'&&url.searchParams.get('itemId')==='9002'){held.push([req,res]);return;}
  }
  if(url.pathname.startsWith('/api/admin/loans')){
    if(adminMode==='fail'){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Gangguan Admin sintetis'}));return;}
    if(adminMode==='malformed'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');return;}
    if(adminMode==='hold'&&url.searchParams.get('status')==='menunggu'){held.push([req,res]);return;}
    if(detailMode==='fail'&&/^\/api\/admin\/loans\/\d+$/.test(url.pathname)){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Detail sintetis gagal'}));return;}
  }
  void backend(req,res);
});
let b;
try {
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));b=await browserHarness(base);
  const {evaluate,until,click,fill,navigate,send,screenshot,noOverflow}=b;
  const waitHeld=async()=>{for(let i=0;i<100&&!held.length;i++)await delay(50);assert.ok(held.length);};
  const release=async()=>{for(const [req,res] of held.splice(0))if(!res.destroyed)await backend(req,res);};
  const login=async(role,label,email)=>{await click(label);await until("!!document.querySelector('input[type=email]')",'email');await fill('input[type=email]',email);await click('Lanjutkan');await until("!!document.querySelector('input[type=password]')",'password');await fill('input[type=password]',passwords[role]);await click('Masuk');};
  await until("document.body.innerText.includes('Masuk Sebagai')",'anonim');
  await click('Lihat Katalog & Keranjang (tanpa login)');await until("document.querySelectorAll('[data-catalog-item]').length===12",'12 dari API');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Kembali ke pemilihan role'))"),true);
  await evaluate("document.querySelectorAll('[data-catalog-item] img').forEach(e=>e.loading='eager')");
  await until("document.querySelectorAll('[data-catalog-item] img').length===12&&[...document.querySelectorAll('[data-catalog-item] img')].every(e=>e.complete&&e.naturalWidth>0)",'12 foto lokal dimuat');
  assert.equal(await evaluate("[...document.querySelectorAll('[data-catalog-item] img')].every(e=>new URL(e.src).origin===location.origin)"),true);
  await click('Jadwal Peminjaman');await until("!!document.querySelector('#schedule-item')",'resource picker');
  // Only the test delays reads and ignores AbortSignal, to force late responses.
  await evaluate(`(()=>{const original=window.fetch;window.__completedReads=[];window.fetch=async(input,init={})=>{const url=String(input),read=url.startsWith('/api/schedule')||url.startsWith('/api/admin/loans');const options=read?{...init,signal:undefined}:init;const response=await original(input,options);if(read){await response.clone().text();window.__completedReads.push(url);}return response;};})()`);
  await send('Emulation.setTimezoneOverride',{timezoneId:'Pacific/Kiritimati'});
  const scope='[aria-label="Kalender Jadwal Peminjaman"]';
  for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:568}]){
    await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<400});
    await fill(`${scope} [aria-label="Tahun kalender"]`,'2030');await fill(`${scope} [aria-label="Bulan kalender"]`,'11');
    await evaluate(`document.querySelector('${scope} button[aria-label^="Selasa, 31 Desember 2030"]').click()`);
    await until("document.querySelector('[data-recorded-peak]')?.textContent==='3'",'puncak agregat 3');
    assert.ok(await evaluate(`document.querySelector('${scope}').innerText.includes('Belum diverifikasi')`));
    assert.equal(await evaluate(`document.querySelector('${scope}').innerText.includes('PRIVATE-SYNTHETIC')`),false);
    assert.equal(await evaluate(`document.querySelector('${scope}').innerText.includes('mahasiswa@smartlend.test')`),false);
    await evaluate(`document.querySelector('${scope} [aria-label="Bulan berikutnya"]').click()`);
    await until(`document.querySelector('${scope} [aria-label="Tahun kalender"]').value==='2031'`,'pergantian tahun');
    await until("document.querySelector('[data-recorded-peak]')?.textContent==='3'",'lintas hari/tahun tetap 3');
    await noOverflow();await evaluate(`document.querySelector('${scope}').scrollIntoView({block:'start'})`);await screenshot(`schedule-${size.width}.png`);
  }
  await fill('#schedule-item','9004');await until("document.querySelector('[data-recorded-peak]')?.textContent==='2'",'resource kedua');
  await fill('#schedule-item','9008');await until(`document.querySelector('${scope}').innerText.includes('Tidak ada alokasi tercatat pada tanggal ini')`,'empty bukan tersedia');
  assert.ok(await evaluate(`document.querySelector('${scope}').innerText.includes('Belum diverifikasi')`));
  scheduleMode='fail';await fill('#schedule-item','9001');await until(`document.querySelector('${scope} [role=alert]')?.textContent.includes('Gangguan jadwal sintetis')`,'error jadwal');scheduleMode='normal';await click('Coba Muat Lagi');await until("document.querySelector('[data-recorded-peak]')?.textContent==='3'",'retry jadwal');
  scheduleMode='hold';await fill('#schedule-item','9002');await waitHeld();assert.ok(await evaluate(`document.querySelector('${scope} [role=status]')?.textContent.includes('Memuat')`));
  await fill('#schedule-item','9001');await until("document.querySelector('[data-recorded-peak]')?.textContent==='3'",'filter baru mendahului respons lama');scheduleMode='normal';await release();
  await until("window.__completedReads.some(url=>url.includes('itemId=9002'))",'respons lama selesai');assert.equal(await evaluate("document.querySelector('[data-recorded-peak]').textContent"),'3','Respons lama tidak menimpa filter baru');
  await click('Kembali ke Katalog');await click('Masuk');await until("document.body.innerText.includes('Masuk Sebagai')",'role');await login('student','Mahasiswa','mahasiswa@smartlend.test');await until("!!document.querySelector('#home-search')",'Home');
  assert.equal(await evaluate("!!document.querySelector('button a')"),false,'Tidak ada link atribusi di dalam tombol Home');
  await evaluate("document.querySelectorAll('#main-content img').forEach(e=>e.loading='eager')");await until("document.querySelectorAll('#main-content figure img').length===4&&[...document.querySelectorAll('#main-content figure img')].every(e=>e.complete&&e.naturalWidth>0)",'Home foto API');
  await navigate('catalog');assert.equal(await evaluate("[...document.querySelectorAll('#main-content button')].some(b=>b.textContent.trim()==='Kembali')"),false);
  await fill('#plan-9001','1');await evaluate("document.querySelector('[data-plan-add="+'"9001"'+"]').click()");await click('Ajukan Peminjaman');await until("!!document.querySelector('#loan-form')",'form existing');
  const formScope='[aria-label="Kalender pemilihan periode"]';await fill(`${formScope} [aria-label="Tahun kalender"]`,'2030');await fill(`${formScope} [aria-label="Bulan kalender"]`,'11');
  await until(`!!document.querySelector('${formScope} button[aria-label^="Selasa, 31 Desember 2030"]')`,'tanggal mulai tersedia');
  await evaluate(`document.querySelector('${formScope} button[aria-label^="Selasa, 31 Desember 2030"]').click()`);
  await until("document.querySelector('#loan-start').value==='2030-12-31T08:00'",'pilihan mulai tersinkron');
  await evaluate(`document.querySelector('${formScope} [aria-label="Bulan berikutnya"]').click()`);
  await until(`document.querySelector('${formScope} [aria-label="Tahun kalender"]').value==='2031'&&document.querySelector('${formScope} [aria-label="Bulan kalender"]').value==='0'`,'form memasuki Januari 2031');
  const returnLabel=await evaluate("new Intl.DateTimeFormat('id-ID',{dateStyle:'full'}).format(new Date(2031,0,1,12))");
  await until(`!![...document.querySelectorAll('${formScope} button[aria-label]')].find(e=>e.getAttribute('aria-label').startsWith(${JSON.stringify(returnLabel)}))`,'tanggal kembali tersedia');
  await evaluate(`[...document.querySelectorAll('${formScope} button[aria-label]')].find(e=>e.getAttribute('aria-label').startsWith(${JSON.stringify(returnLabel)})).click()`);
  assert.equal(await evaluate("document.querySelector('#loan-start').value"),'2030-12-31T08:00');assert.equal(await evaluate("document.querySelector('#loan-end').value"),'2031-01-01T17:00');
  await fill('#loan-start','2030-12-31T10:30');await fill('#loan-end','2031-01-01T12:30');await click('Kembali ke Keranjang');await click('Ajukan Peminjaman');assert.equal(await evaluate("document.querySelector('#loan-start').value"),'2030-12-31T10:30');
  await click('Logout');await until("document.body.innerText.includes('Masuk Sebagai')",'logout student');await login('admin','Admin','admin@smartlend.test');await until("document.querySelectorAll('[data-admin-request]').length===10",'10 header pertama');
  const adminScope='[aria-label="Pengajuan dan statistik Admin"]';
  assert.equal(await evaluate("document.querySelector('[data-admin-stat=total] strong').textContent"),'15','15 header, bukan 16 detail');assert.equal(await evaluate("document.querySelector('[data-admin-stat=waiting] strong').textContent"),'13');assert.equal(await evaluate("document.querySelector('[data-admin-stat=active] strong').textContent"),'1');
  for(const [key,value] of [['approved','1'],['completed','0'],['rejected','0'],['cancelled','0']])assert.equal(await evaluate(`document.querySelector('[data-admin-stat=${key}] strong').textContent`),value);
  const statsReads=requests.filter(req=>req.path==='/api/admin/loans/stats').length;
  await click('Muat Ulang Pengajuan');await until("document.querySelector('[data-admin-stat=total] strong').textContent==='15'",'refresh statistik API');
  assert.ok(requests.filter(req=>req.path==='/api/admin/loans/stats').length>statsReads);
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
    await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<400});await evaluate('window.scrollTo(0,0)');await noOverflow();await screenshot(`admin-${size.width}.png`);
    await click('Halaman Berikutnya');await until("document.querySelectorAll('[data-admin-request]').length===5",'pagination 5');
    await evaluate("document.querySelector('[data-admin-detail="+'"1"'+"]').click()");await until("!!document.querySelector('[data-admin-receipt="+'"1"'+"]')",'detail multi-barang');
    await until("document.querySelector('[role=dialog]').getAnimations().every(animation=>animation.playState==='finished')&&!document.querySelector('[data-sonner-toast]')",'modal selesai animasi, toast tidak menutupi');
    assert.equal(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"),true);
    assert.equal(await evaluate("document.querySelector('[role=dialog]').scrollTop"),0,'Judul modal tetap terlihat saat dibuka');
    assert.ok(await evaluate("document.querySelector('[data-admin-receipt]').innerText.includes('2 jenis barang · 3 unit barang')"));
    const geometry=await evaluate("(()=>{const d=document.querySelector('[role=dialog]'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,overflow:d.scrollWidth>d.clientWidth+1};})()");assert.ok(geometry.left>=15&&geometry.right<=size.width-15);assert.equal(geometry.overflow,false);
    await screenshot(`admin-detail-${size.width}.png`);await click('Tutup Detail Admin');await until("!document.querySelector('[role=dialog]')",'tutup detail');await click('Halaman Sebelumnya');await until("document.querySelectorAll('[data-admin-request]').length===10",'kembali halaman1');
  }
  detailMode='fail';await evaluate("document.querySelector('[data-admin-detail]').click()");await until("document.querySelector('[role=dialog] [role=alert]')?.textContent.includes('Detail sintetis gagal')",'detail error');detailMode='normal';await click('Coba Muat Detail Lagi');await until("!!document.querySelector('[data-admin-receipt]')",'detail retry');await click('Tutup Detail Admin');
  adminMode='hold';await fill('[aria-label="Status pengajuan"]','menunggu');await waitHeld();await fill('[aria-label="Status pengajuan"]','disetujui');await until("document.querySelectorAll('[data-admin-request]').length===1",'filter disetujui');adminMode='normal';await release();await until("window.__completedReads.some(url=>url.includes('/api/admin/loans?status=menunggu'))",'filter lama selesai');assert.equal(await evaluate("document.querySelectorAll('[data-admin-request]').length"),1,'Respons lama tidak menimpa filter Admin');
  await fill('[aria-label="Status pengajuan"]','ditolak');await until("document.querySelectorAll('[data-admin-request]').length===0&&document.body.innerText.includes('Belum ada pengajuan dalam data yang dimuat')",'empty Admin');
  adminMode='fail';await fill('[aria-label="Status pengajuan"]','all');await until("document.querySelector('[role=alert]')?.textContent.includes('Gangguan Admin sintetis')",'error Admin bukan angka0');adminMode='normal';await click('Coba Muat Lagi');await until("document.querySelectorAll('[data-admin-request]').length===10",'retry Admin');
  adminMode='malformed';await fill('[aria-label="Status pengajuan"]','menunggu');await until("document.querySelector('[role=alert]')?.textContent.includes('Respons pembacaan tidak valid')",'malformed response tidak menjadi empty');adminMode='normal';await click('Coba Muat Lagi');await until("document.querySelectorAll('[data-admin-request]').length===10",'recover malformed');
  assert.equal(await evaluate("[...document.querySelectorAll('[data-admin-request] button')].filter(e=>e.textContent==='Setujui').every(e=>e.disabled)"),true);
  assert.equal(await evaluate("[...document.querySelectorAll('[data-admin-request] button')].filter(e=>e.textContent==='Tolak').every(e=>e.disabled)"),true);
  assert.ok(await evaluate("document.querySelector('[aria-label="+'"Prasyarat keputusan Admin"'+"]').innerText.includes('Baseline stok layak pinjam belum diverifikasi')"));
  await click('Lihat Katalog Database');await until("document.querySelectorAll('[data-catalog-item]').length===12",'katalog Admin API');
  const after=fingerprint(db);assert.equal(after.schemaHash,before.schemaHash);
  for(const [table,value] of Object.entries(before.tables))if(!['sesi','percobaan_login'].includes(table))assert.deepEqual(after.tables[table],value,table);
  assert.ok(requests.some(r=>r.path==='/api/admin/loans/readiness'));assert.ok(requests.some(r=>r.path==='/api/schedule'));
  assert.ok(!requests.some(r=>/\/(approve|reject)$/.test(r.path)),'UI tidak mengirim keputusan yang BLOCKED');
  console.log(`PASS integrated HTTP/SQLite: 12 photos, safe attribution, public allocation/no PII, 31-day chunks, month/year/WIB, errors/retry/loading/stale guards, Admin stats/pagination/detail/blocked decisions, 1440/768/390/320. Screenshots: ${b.profile}`);
}finally{for(const [,res] of held)res.destroy();b?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));db.close();}
