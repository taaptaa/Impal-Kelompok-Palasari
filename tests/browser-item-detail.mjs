// Database lokal existing dibuka hanya-baca, tanpa openDb/DDL/seed.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { makeServer } from '../backend/server.mjs';
import { additionalInventory, fingerprint } from '../tools/add-test-inventory.mjs';

if (!process.env.SMARTLEND_MODAL_TEST_DB) throw Error('SMARTLEND_MODAL_TEST_DB harus menunjuk database lokal untuk dibaca saja.');
const db = new DatabaseSync(resolve(process.env.SMARTLEND_MODAL_TEST_DB), { readOnly: true });
const inventory = () => db.prepare('SELECT id_barang,kode_barang,nama_barang,jenis,satuan,stok_total FROM barang ORDER BY id_barang').all().map(item => ({ ...item }));
const before = inventory();
const protectedBefore = fingerprint(db);
const roomsBefore = db.prepare('SELECT id_ruangan FROM ruangan').all();
const accountCount = db.prepare('SELECT COUNT(*) AS count FROM pengguna').get().count;
assert.equal(before.length, 12, 'Uji ini membutuhkan 12 barang dari pengayaan inventaris.');
for (const [id,code,name,stock] of [[9001,'UJI-PRJ-01','Proyektor (Uji)',3],[9002,'UJI-HDM-01','Kabel HDMI (Uji)',5],[9003,'UJI-SPK-01','Speaker Portable (Uji)',2]]) {
  assert.deepEqual(before.find(item=>item.id_barang===id),{id_barang:id,kode_barang:code,nama_barang:name,jenis:'portabel',satuan:'unit',stok_total:stock});
}
for (const item of additionalInventory) {
  const saved = before.find(row=>row.kode_barang===item.kode_barang);
  assert.ok(saved);
  for (const [key,value] of Object.entries(item)) assert.equal(saved[key],value);
}
assert.equal(new Set(before.map(item=>item.kode_barang)).size,12);
const profile = mkdtempSync(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'smartlend-modal-'));
const server = makeServer(db);
let chrome, socket;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-first-run', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let debugPort;
  for (let i = 0; i < 100; i++) {
    try { debugPort = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); break; } catch { await delay(100); }
  }
  assert.ok(debugPort, 'Chrome CDP gagal dimulai');
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(base)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map();
  let id = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data), task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async expression => {
    const data = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (data.exceptionDetails) throw Error(data.exceptionDetails.text);
    return data.result.value;
  };
  const until = async (expression, label) => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw Error(`Timeout: ${label}`);
  };
  const click = async text => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!b) throw Error('Button missing'); b.click(); })()`);
  const navigate = async screen => {
    await evaluate(`(() => { const button = [...document.querySelectorAll('[data-nav="${screen}"]')].find(e => e.getClientRects().length); if (!button) throw Error('Navigation missing'); button.click(); })()`);
  };
  const fill = async (selector, value) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const pointerClick = async selector => {
    const point = await evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center',inline:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    assert.ok(point.x > 0 && point.x < await evaluate('innerWidth'), 'Tombol tidak terjangkau secara horizontal');
    await send('Input.dispatchMouseEvent', {type:'mousePressed', ...point, button:'left', clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased', ...point, button:'left', clickCount:1});
  };
  const screenshot = async name => { const shot = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(profile, name), Buffer.from(shot.data, 'base64')); };
  await until("document.body.innerText.includes('Masuk Sebagai')", 'Pemilihan role publik');
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Lihat Katalog & Keranjang')).click()");
  await until("document.querySelectorAll('[data-catalog-item]').length === 12", '12 barang dari API');
  assert.deepEqual((await (await fetch(base + '/api/catalog')).json()).barang, before);
  for (const query of ['mIkRoFoN','uji-kmr-01','PoRtAbEl','tidak-ada-barang-ini']) {
    await fill('#catalog-search',query);
    const expected = before.filter(item=>`${item.nama_barang} ${item.kode_barang} ${item.jenis}`.toLowerCase().includes(query.toLowerCase())).map(item=>item.id_barang);
    await until(`JSON.stringify([...document.querySelectorAll('[data-catalog-item]')].map(e=>Number(e.dataset.catalogItem))) === ${JSON.stringify(JSON.stringify(expected))}`,`pencarian ${query}`);
    if (!expected.length) assert.ok(await evaluate("document.body.innerText.includes('Tidak Ada Barang Ditemukan')"));
  }
  await fill('#catalog-search','');
  await evaluate("(() => { const s=document.querySelector('#catalog-kind'); s.value='portabel'; s.dispatchEvent(new Event('change',{bubbles:true})); })()");
  await until("document.querySelector('#catalog-kind').value === 'portabel' && document.querySelectorAll('[data-catalog-item]').length === 12",'filter portabel dari API');
  await click('Reset Pencarian');
  for (const size of [{ width: 1920, height: 1080, columns: 4 }, { width: 1440, height: 900, columns: 4 }, { width: 768, height: 1024, columns: 2 }, { width: 390, height: 844, columns: 1 }, { width: 320, height: 568, columns: 1 }, { width: 640, height: 320, columns: 2 }]) {
    await send('Emulation.setDeviceMetricsOverride', { width: size.width, height: size.height, deviceScaleFactor: 1, mobile: size.width <= 390 });
    await evaluate('window.scrollTo(0,0)');
    assert.equal(await evaluate("document.querySelector('[data-catalog-item]').parentElement.children.length"),12);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-catalog-item]').parentElement).gridTemplateColumns.split(' ').length"),size.columns);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'),true,'Grid tidak overflow');
    for (const item of before) {
      const text = await evaluate(`document.querySelector('[data-catalog-item="${item.id_barang}"]').innerText`);
      for (const value of [item.nama_barang,item.kode_barang,item.jenis,`${item.stok_total} ${item.satuan}`,'Belum diverifikasi','Data uji']) assert.ok(text.includes(value));
      assert.match(await evaluate(`document.querySelector('[data-catalog-item="${item.id_barang}"] img').alt`),/^Ilustrasi/);
    }
    assert.equal(await evaluate("document.querySelectorAll('[data-catalog-item] img').length"),12,'Semua kode uji memiliki foto lokal');
    await evaluate("document.querySelectorAll('[data-catalog-item] img').forEach(img=>img.loading='eager')");
    await until("[...document.querySelectorAll('[data-catalog-item] img')].every(img=>img.complete&&img.naturalWidth>0)",'Semua foto dapat dimuat');
    assert.equal(await evaluate("[...document.querySelectorAll('[data-catalog-item] img')].every(img=>new URL(img.src).origin===location.origin)"),true,'Tidak fetch foto eksternal saat runtime');
    await screenshot(`catalog-${size.width}x${size.height}.png`);
    await evaluate("document.querySelector('[data-catalog-item]').scrollIntoView({block:'start'})");
    await screenshot(`catalog-cards-${size.width}x${size.height}.png`);
    const projector = before.find(item => item.nama_barang.includes('Proyektor'));
    const hdmi = before.find(item => item.nama_barang.includes('Kabel HDMI'));
    const summary = id => `[data-plan-summary="${id}"]`;
    await fill(`#plan-${projector.id_barang}`, '2');
    assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(summary(projector.id_barang))})`), false, 'Jumlah pilihan belum boleh masuk rencana sebelum klik');
    await pointerClick(`[data-plan-add="${projector.id_barang}"]`);
    await until(`document.querySelector(${JSON.stringify(summary(projector.id_barang))})?.textContent.includes('2 unit')`, 'Proyektor 2 unit');
    await fill(`#plan-${hdmi.id_barang}`, '1');
    await pointerClick(`[data-plan-add="${hdmi.id_barang}"]`);
    await until(`document.querySelector(${JSON.stringify(summary(hdmi.id_barang))})?.textContent.includes('1 unit')`, 'HDMI 1 unit');
    assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"), 2);
    assert.ok(await evaluate("[...document.querySelectorAll('[role=status]')].some(e=>e.textContent.includes('ditambahkan ke'))"));
    assert.equal(await evaluate("!!document.querySelector('#home-search')"), false, 'Home mahasiswa tidak diberikan kepada pengunjung');
    assert.equal(await evaluate("document.querySelectorAll('[data-nav=home],[data-nav=profile],[data-nav=dashboard]').length"), 0, 'Navigasi publik tidak boleh menawarkan halaman internal');
    await navigate('rooms');
    await until("!!document.querySelector('#room-search')", 'Katalog Ruangan');
    assert.equal(await evaluate("document.querySelectorAll('[data-room]').length"), roomsBefore.length);
    if (roomsBefore.length === 0) assert.ok(await evaluate("document.querySelector('#main-content').innerText.includes('Belum ada data ruangan')"));
    assert.equal(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'), true);
    await navigate('plan');
    await until(`document.querySelector(${JSON.stringify(summary(projector.id_barang))})?.textContent.includes('2 unit')`, 'Rencana bertahan antarhalaman');
    assert.equal(await evaluate("document.activeElement?.id === 'plan-heading'"), true);
    await navigate('catalog');
    await pointerClick(`[data-plan-add="${projector.id_barang}"]`);
    assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"), 2, 'Penambahan ulang tidak boleh duplikat');
    await fill(`#summary-plan-${projector.id_barang}`, '3');
    await pointerClick(`[data-plan-save="${projector.id_barang}"]`);
    await until(`document.querySelector(${JSON.stringify(summary(projector.id_barang))})?.textContent.includes('3 unit')`, 'Ubah jumlah di ringkasan');
    await fill(`#plan-${projector.id_barang}`, '0.5');
    await pointerClick(`[data-plan-add="${projector.id_barang}"]`);
    await until(`!!document.querySelector('#plan-error-${projector.id_barang}')`, 'Tolak pecahan');
    assert.ok(await evaluate(`document.querySelector(${JSON.stringify(summary(projector.id_barang))}).textContent.includes('3 unit')`));
    await fill(`#plan-${projector.id_barang}`, '2');
    await pointerClick(`[data-plan-add="${projector.id_barang}"]`);
    await until(`document.querySelector(${JSON.stringify(summary(projector.id_barang))})?.textContent.includes('2 unit')`, 'Penambahan ulang mengganti jumlah');
    assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"), 2);
    await until("!document.querySelector('[data-sonner-toast]')",'Notifikasi rencana selesai tanpa tumpukan');
    await screenshot(`rencana-${size.width}x${size.height}.png`);
    await evaluate("document.querySelector('#plan-heading').scrollIntoView({block:'start'})");
    await screenshot(`ringkasan-rencana-${size.width}x${size.height}.png`);
    await click(`Hapus ${projector.nama_barang}`);
    await until("document.querySelectorAll('[data-plan-summary]').length === 1", 'Hapus Proyektor');
    await click(`Hapus ${hdmi.nama_barang}`);
    await until("document.querySelectorAll('[data-plan-summary]').length === 0", 'Reset draft uji');
    const microphone = before.find(item=>item.kode_barang==='UJI-MIC-01');
    const camera = before.find(item=>item.kode_barang==='UJI-KMR-01');
    for (const item of [microphone,camera]) {
      await fill(`#plan-${item.id_barang}`,'2');
      await pointerClick(`[data-plan-add="${item.id_barang}"]`);
      await until(`document.querySelector('[data-plan-summary="${item.id_barang}"]')?.textContent.includes('2 unit')`,'Barang baru dalam draft');
    }
    assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"),2);
    for (const value of ['0','-1','1.5',String(microphone.stok_total+1)]) {
      await fill(`#plan-${microphone.id_barang}`,value);
      await pointerClick(`[data-plan-add="${microphone.id_barang}"]`);
      await until(`!!document.querySelector('#plan-error-${microphone.id_barang}')`,'Jumlah tidak valid ditolak');
      assert.ok(await evaluate(`document.querySelector('[data-plan-summary="${microphone.id_barang}"]').textContent.includes('2 unit')`));
    }
    await fill(`#summary-plan-${microphone.id_barang}`,'3');
    await pointerClick(`[data-plan-save="${microphone.id_barang}"]`);
    await until(`document.querySelector('[data-plan-summary="${microphone.id_barang}"]')?.textContent.includes('3 unit')`,'Ubah barang baru');
    assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"),2);
    for (const item of [microphone,camera]) await click(`Hapus ${item.nama_barang}`);
    await until("document.querySelectorAll('[data-plan-summary]').length === 0",'Hapus barang baru');
    assert.deepEqual(inventory(), before);
    console.log(`PASS katalog publik/ruangan/rencana ${size.width}x${size.height}: tanpa Home/profil/dashboard, Proyektor 2 + HDMI 1, draft bertahan antarhalaman, ubah/hapus, stok tetap`);
    for (let index = 0; index < before.length; index++) {
      const item = before[index];
      await pointerClick(`[data-item-detail="${item.id_barang}"]`);
      await until("document.querySelector('[role=dialog]') !== null", 'modal open');
      await until("document.querySelector('[role=dialog]').getAnimations().every(animation => animation.playState === 'finished')", 'modal animation complete');
      await until("!document.querySelector('[data-sonner-toast]')",'Toast tidak menutupi Detail');
      const data = await evaluate(`(() => {
        const d = document.querySelector('[role=dialog]'), r = d.getBoundingClientRect();
        return { text: d.innerText, width: r.width, left: r.left, right: r.right, top: r.top, bottom: r.bottom, viewport: {innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,cssLeft:getComputedStyle(d).left,cssTop:getComputedStyle(d).top}, overflow: d.scrollWidth > d.clientWidth + 1, z: getComputedStyle(d).zIndex, focusInside: d.contains(document.activeElement), overlay: !!document.querySelector('[data-slot=dialog-overlay]'), total: [...d.querySelectorAll('dl > div')].find(x => x.querySelector('dt')?.textContent === 'Stok total')?.querySelector('dd')?.textContent };
      })()`);
      assert.ok(data.text.includes(item.nama_barang) && data.text.includes(item.kode_barang) && data.text.includes(item.jenis));
      assert.equal(data.total, `${item.stok_total} ${item.satuan}`);
      assert.ok(data.text.includes('Belum diverifikasi') && !data.text.includes('Belum diketahui'));
      assert.ok(data.text.includes('Foto ilustrasi'));
      assert.equal(await evaluate("document.querySelectorAll('[role=dialog] figcaption a').length"),2,'Kredit judul/author/sumber dan lisensi tetap tersedia di Detail');
      assert.ok(Math.abs(data.width - Math.min(520, size.width - 32)) < 2, `Lebar modal salah: ${data.width}`);
      assert.ok(data.left >= 15 && data.right <= size.width - 15 && data.top >= 15 && data.bottom <= size.height - 15, `Modal di luar viewport ${size.width}x${size.height}: ${JSON.stringify(data)}`);
      assert.equal(data.overflow, false);
      assert.ok(data.focusInside && data.overlay && Number(data.z) >= 50);
      assert.equal(await evaluate("(() => { const d=document.querySelector('[role=dialog]'), r=d.getBoundingClientRect(); return d.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)); })()"), true, 'Modal harus berada di atas overlay');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), true, JSON.stringify(await evaluate("({scrollWidth:document.documentElement.scrollWidth,innerWidth,bodyWidth:document.body.getBoundingClientRect().width,overflow:[...document.body.querySelectorAll('*')].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+1).slice(0,12)})")));
      // Optional artifact sampling for low disk space. All 12 modal assertions above
      // and keyboard/focus checks below still run at every viewport.
      if(process.env.SMARTLEND_COMPACT_SCREENSHOTS!=='1'||size.width===1440||index===0)await screenshot(`detail-${item.id_barang}-${size.width}x${size.height}.png`);
      // Tutup dengan tombol, lalu buka lagi dan uji Escape/focus restoration.
      const closeButton = await evaluate("(() => { const b=[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent==='Tutup'); b.scrollIntoView({block:'nearest'}); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()");
      assert.ok(closeButton.y > 0 && closeButton.y < size.height);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...closeButton, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...closeButton, button: 'left', clickCount: 1 });
      await until("!document.querySelector('[role=dialog]')", 'Tutup');
      assert.equal(await evaluate(`document.activeElement === document.querySelector('[data-item-detail="${item.id_barang}"]')`), true);
      await evaluate(`document.querySelector('[data-item-detail="${item.id_barang}"]').click()`);
      await until("!!document.querySelector('[role=dialog]')", 'reopen');
      await until("(() => { const d=document.querySelector('[role=dialog]'); return d.contains(document.activeElement) && d.getAnimations().every(a=>a.playState==='finished'); })()", 'reopen ready for keyboard');
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await until("!document.querySelector('[role=dialog]')", 'Escape');
      assert.equal(await evaluate(`document.activeElement === document.querySelector('[data-item-detail="${item.id_barang}"]')`), true);
    }
    await evaluate("document.querySelector('[data-item-detail]').click()");
    await until("!!document.querySelector('[role=dialog]')", 'overlay test');
    await until("document.querySelector('[role=dialog]').contains(document.activeElement)", 'overlay test focus');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"), true);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 4, y: 4, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 4, y: 4, button: 'left', clickCount: 1 });
    await until("!document.querySelector('[role=dialog]')", 'overlay close');
    console.log(`PASS grid ${size.columns} kolom, draft barang lama/baru, modal seluruh 12 barang: ${size.width}x${size.height}, isi, stok, Tutup, Escape, fokus dan overflow`);
  }
  // Simulasi teks panjang hanya pada DOM uji; tidak mengubah data/API/database.
  await evaluate("document.querySelector('[data-item-detail]').click()");
  await until("!!document.querySelector('[role=dialog]')", 'long content');
  await evaluate("document.querySelector('[role=dialog] dd').textContent = 'A'.repeat(6000)");
  assert.equal(await evaluate("(() => { const d=document.querySelector('[role=dialog]'); return d.scrollHeight>d.clientHeight && d.scrollWidth<=d.clientWidth+1; })()"), true);
  await evaluate("document.querySelector('[role=dialog]').scrollTop = 100000");
  await screenshot('detail-long-text-scroll.png');
  await click('Tutup');
  await until("!document.querySelector('[role=dialog]')", 'close long text');
  assert.deepEqual(inventory(), before);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM pengguna').get().count, accountCount);
  assert.deepEqual(fingerprint(db),protectedBefore,'Seluruh database tetap identik setelah uji read-only');
  console.log(`PASS pencarian nama/kode/jenis case-insensitive, filter, API 12, teks panjang scroll vertikal; seluruh data/stok/akun identik. Screenshot: ${profile}`);
} finally {
  socket?.close();
  chrome?.kill();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  db.close();
}
