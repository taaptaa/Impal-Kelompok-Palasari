// Acceptance alur sesi/role. Semua mutasi hanya pada SQLite :memory: milik tes.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer as createPortProbe } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { openDb } from '../backend/db.mjs';
import { seed } from '../backend/seed.mjs';
import { makeServer } from '../backend/server.mjs';

const db = openDb(':memory:');
const passwords = Object.fromEntries(['student', 'admin', 'warehouse'].map(role => [role, randomBytes(24).toString('base64url')]));
seed(db, passwords);
for (const [id, name, stock] of [[91, 'Proyektor sintetis', 3], [92, 'Kabel HDMI sintetis', 5], [93, 'Speaker sintetis', 2]]) {
  db.prepare('INSERT INTO barang VALUES(?,?,?,?,?,?)').run(id, `B-${id}`, name, 'portabel', 'unit', stock);
}
db.prepare('INSERT INTO ruangan VALUES(?,?,?,?,?,?)').run(601, 'R-601', 'Ruangan sintetis', 25, 'Lokasi uji', 'aktif');
const inventory = () => db.prepare('SELECT * FROM barang ORDER BY id_barang').all();
const before = inventory();
const probe = createPortProbe();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = makeServer(db, base);
const backend = server.listeners('request')[0];
server.removeAllListeners('request'); // hanya handler server ephemeral milik tes ini
let sessionMode = 'normal', logoutMode = 'normal';
const heldSessions = [], heldLogouts = [];
server.on('request', (req, res) => {
  if (sessionMode === 'offline' && req.url.startsWith('/api/')) { res.destroy(); return; }
  if (req.url === '/api/me') {
    if (sessionMode === 'hold') { heldSessions.push([req, res]); return; }
    if (sessionMode === 'malformed') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ user: { id: 'bad', name: 'Invalid response', email: 'invalid@test', role: 'unsupported-role' }, csrf: 'invalid-response' })); return;
    }
  }
  if (req.url === '/api/logout') {
    if (logoutMode === 'hold') { heldLogouts.push([req, res]); return; }
    if (logoutMode === 'fail') { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Simulasi gangguan logout' })); return; }
  }
  void backend(req, res);
});
const profile = mkdtempSync(join(process.env.LOCALAPPDATA, 'Temp', 'opencode', 'smartlend-auth-flow-'));
let chrome, socket;
try {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let debugPort;
  for (let i = 0; i < 150; i++) {
    try { debugPort = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); break; } catch { await delay(100); }
  }
  assert.ok(debugPort, 'Chrome tidak siap');
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(base)}`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data), task = pending.get(message.id);
    if (task) { pending.delete(message.id); message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async expression => {
    const data = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (data.exceptionDetails) throw Error(data.exceptionDetails.text);
    return data.result.value;
  };
  const until = async (expression, label) => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw Error(`Timeout: ${label}`);
  };
  const click = async text => {
    await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!b) throw Error('Button missing'); b.click(); })()`);
  };
  const fill = async (selector, value) => evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e) throw Error('Input missing'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const navigate = async screen => evaluate(`(() => { const b=[...document.querySelectorAll('[data-nav="${screen}"]')].find(b=>b.getClientRects().length); if(!b) throw Error('Navigation missing'); b.click(); })()`);
  const roleSelection = "[...document.querySelectorAll('h2')].some(e=>e.textContent==='Masuk Sebagai')";
  const noPrivatePage = "!document.querySelector('#home-search') && ![...document.querySelectorAll('h1')].some(e=>/Admin Dashboard|Dashboard Logistik/.test(e.textContent))";
  const screenshot = async name => { const data = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(profile, name), Buffer.from(data.data, 'base64')); };
  const assertNoPrivatePage = async () => assert.equal(await evaluate(noPrivatePage), true);
  const assertNoOverflow = async () => assert.equal(await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1'), true);
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__gateWatch=true; window.__privateSeen=false; new MutationObserver(()=>{ if(window.__gateWatch && (document.querySelector('#home-search') || [...document.querySelectorAll('h1')].some(e=>/Admin Dashboard|Dashboard Logistik/.test(e.textContent)))) window.__privateSeen=true; }).observe(document,{childList:true,subtree:true});` });

  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await send('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: size.width === 390 });
    await send('Page.reload');
    await until(roleSelection, 'AC-01/02 halaman awal anonim dan refresh');
    await assertNoPrivatePage();
    await assertNoOverflow();
    await screenshot(`role-selection-${size.width}.png`);
    await send('Page.navigate', { url: base + '/home' });
    await until(roleSelection, 'AC-14 percobaan akses Home tanpa sesi');
    await assertNoPrivatePage();
    await click('Lihat Katalog & Keranjang (tanpa login)');
    await until("document.querySelectorAll('[data-catalog-item]').length===3", 'AC-13 katalog publik');
    await assertNoPrivatePage();
    assert.equal(await evaluate("document.querySelectorAll('[data-nav=home],[data-nav=profile],[data-nav=dashboard]').length"), 0);
    assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"), 401);
    await click('Kembali ke pemilihan role');
    await until(roleSelection, 'kembali ke pemilihan role');
    console.log(`PASS AC-01/02/13/14/15: anonim hanya katalog, tanpa Home/dashboard (${size.width})`);

    for (const [role, label, email, landing] of [
      ['student', 'Mahasiswa', 'mahasiswa@smartlend.test', "!!document.querySelector('#home-search')"],
      ['admin', 'Admin', 'admin@smartlend.test', "[...document.querySelectorAll('h1')].some(e=>e.textContent==='Admin Dashboard')"],
      ['warehouse', 'Logistik', 'petugas@smartlend.test', "[...document.querySelectorAll('h1')].some(e=>e.textContent==='Dashboard Logistik')"],
    ]) {
      await evaluate(`(() => { const b=[...document.querySelectorAll('button')].find(b=>b.querySelector('h3')?.textContent.trim()===${JSON.stringify(label)}); if(!b) throw Error('Role button missing'); b.click(); })()`);
      await fill('input[type=email]', email);
      await click('Lanjutkan');
      await fill('input[type=password]', randomBytes(24).toString('base64url'));
      await click('Masuk');
      await until("!!document.querySelector('[role=alert]')", 'AC-06 password salah');
      await assertNoPrivatePage();
      await fill('input[type=password]', passwords[role]);
      await click('Masuk');
      await until(landing, `AC-03/04/05 login ${role}`);
      assert.equal(await evaluate("fetch('/api/me').then(r=>r.json()).then(d=>d.user.role)"), role);
      await assertNoOverflow();
      await screenshot(`${role}-${size.width}.png`);

      sessionMode = 'hold';
      await send('Page.reload');
      await until("document.body.innerText.includes('Memeriksa sesi...')", 'AC-24 menunggu sesi');
      await assertNoPrivatePage();
      assert.equal(await evaluate('window.__privateSeen'), false);
      await evaluate('window.__gateWatch=false');
      sessionMode = 'normal';
      for (let i = 0; i < 100 && !heldSessions.length; i++) await delay(50);
      assert.ok(heldSessions.length, 'Permintaan /me tidak tertahan');
      for (const [req, res] of heldSessions.splice(0)) void backend(req, res);
      await until(landing, `AC-07/08/09 refresh ${role}`);
      assert.equal(await evaluate("fetch('/api/admin').then(r=>r.status)"), role === 'admin' ? 200 : 403);

      if (role === 'student') {
        await fill('#home-search', 'HDMI');
        await evaluate("document.querySelector('#home-search').form.requestSubmit()");
        await until("document.querySelectorAll('[data-catalog-item]').length===1", 'AC-17/18 pencarian Home ke katalog');
        assert.equal(await evaluate("document.querySelector('#catalog-search').value"), 'HDMI');
        await fill('#catalog-search', '');
        await fill('#plan-91', '2');
        await evaluate("document.querySelector('[data-plan-add=\"91\"]').click()");
        await fill('#plan-92', '1');
        await evaluate("document.querySelector('[data-plan-add=\"92\"]').click()");
        await until("document.querySelectorAll('[data-plan-summary]').length===2", 'AC-19 dua barang');
        await evaluate("document.querySelector('[data-item-detail=\"91\"]').click()");
        await until("!!document.querySelector('[role=dialog]')", 'AC-20 Detail');
        await click('Tutup');
        await until("!document.querySelector('[role=dialog]')", 'Detail closed');
        await navigate('rooms');
        await until("!!document.querySelector('[data-room=\"601\"]')", 'katalog ruangan');
        await assertNoOverflow();
        await navigate('profile');
        await until("document.querySelector('#main-content').innerText.includes('mahasiswa@smartlend.test')", 'profil sesi');
        await assertNoOverflow();
        await navigate('plan');
        await until("document.activeElement?.id==='plan-heading'", 'rencana shared');
        assert.equal(await evaluate("document.querySelectorAll('[data-plan-summary]').length"), 2);
        await navigate('home');
        await until(landing, 'Home tetap tersedia');
      } else {
        await navigate('catalog');
        await until("document.querySelectorAll('[data-catalog-item]').length===3", 'katalog internal');
        await navigate('dashboard');
        await until(landing, 'kembali ke dashboard');
      }

      if (role === 'admin') {
        const cookies = await send('Network.getCookies', { urls: [base] });
        const cookieBefore = cookies.cookies.find(cookie => cookie.name === 'sid')?.value;
        assert.ok(cookieBefore, 'Sesi belum dibuat');
        sessionMode = 'offline';
        await send('Page.reload');
        await until("document.querySelector('[role=alert]')?.textContent.includes('Sesi belum dapat diverifikasi')", 'AC-23 error backend');
        await assertNoPrivatePage();
        const after = await send('Network.getCookies', { urls: [base] });
        assert.ok(after.cookies.some(cookie => cookie.name === 'sid' && cookie.value === cookieBefore), 'Cookie tidak boleh dihapus saat gangguan backend');
        sessionMode = 'normal';
        await click('Coba periksa sesi lagi');
        await until(landing, 'pemulihan sesudah backend pulih');
        await navigate('catalog');
        await until("document.querySelectorAll('[data-catalog-item]').length===3", 'katalog ikut pulih sesudah retry backend');
        await navigate('dashboard');
        await until(landing, 'dashboard setelah retry');
        logoutMode = 'fail';
        await evaluate("document.querySelector('button[aria-label=Logout]').click()");
        await until("document.body.innerText.includes('Logout gagal; sesi belum dihapus')", 'logout failure notification');
        assert.equal(await evaluate(landing), true);
        assert.equal(await evaluate(roleSelection), false);
        assert.equal(await evaluate("fetch('/api/me').then(r=>r.status)"), 200);
      }

      const cookies = await send('Network.getCookies', { urls: [base] });
      const oldSid = cookies.cookies.find(cookie => cookie.name === 'sid')?.value;
      assert.ok(oldSid, 'Cookie sesi harus ada sebelum logout');
      logoutMode = 'hold';
      await evaluate("document.querySelector('button[aria-label=Logout]').click()");
      await until("document.body.innerText.includes('Mengakhiri sesi...')", 'logout menunggu backend');
      assert.equal(await evaluate(roleSelection), false);
      for (let i = 0; i < 100 && !heldLogouts.length; i++) await delay(50);
      assert.ok(heldLogouts.length, 'Logout backend tidak dipanggil');
      logoutMode = 'normal';
      for (const [req, res] of heldLogouts.splice(0)) void backend(req, res);
      await until(roleSelection, `AC-10/11/12 logout ${role}`);
      await assertNoPrivatePage();
      assert.equal((await fetch(base + '/api/me', { headers: { Cookie: `sid=${oldSid}` } })).status, 401, 'Replay sesi lama harus ditolak');
      assert.equal(await evaluate("fetch('/api/me').then(r=>r.status)"), 401);
      console.log(`PASS login salah/valid, tujuan role, refresh, loading tanpa flash, logout invalidasi/replay: ${role} (${size.width})`);
    }
  }
  sessionMode = 'hold';
  await send('Page.reload');
  await until("document.body.innerText.includes('Memeriksa sesi...')", 'loading anonim');
  await assertNoPrivatePage();
  assert.equal(await evaluate('window.__privateSeen'), false);
  sessionMode = 'normal';
  for (let i = 0; i < 100 && !heldSessions.length; i++) await delay(50);
  for (const [req, res] of heldSessions.splice(0)) void backend(req, res);
  await until(roleSelection, 'anonim sesudah verifikasi');
  sessionMode = 'malformed';
  await send('Page.reload');
  await until("!!document.querySelector('[role=alert]')", 'role tak dikenal ditolak');
  await assertNoPrivatePage();
  assert.deepEqual(inventory(), before);
  console.log(`PASS AC-01–24 browser: role/refresh/logout, error backend tanpa hapus cookie, katalog publik terpisah, Home mahasiswa, nav desktop/mobile, draft/Detail. Screenshot: ${profile}`);
} finally {
  for (const [, res] of [...heldSessions, ...heldLogouts]) res.destroy();
  socket?.close(); chrome?.kill();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  db.close();
}
