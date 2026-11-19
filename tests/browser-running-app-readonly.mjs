// Existing app ports only. GET requests only; no login, POST, seed, migration or DB writes.
import assert from 'node:assert/strict';
import { browserHarness } from './helpers/browser-harness.mjs';
const b=await browserHarness('http://127.0.0.1:5175/');
const responses=[];
try {
  const {send,evaluate,until,click,fill,screenshot,noOverflow}=b;
  await send('Network.enable');
  // Record response metadata only, never cookies, credentials or response bodies.
  // The app's fresh browser profile has no user session.
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__apiReads=[];(()=>{const original=window.fetch;window.fetch=async(input,init)=>{if(init?.method&&init.method!=='GET')throw Error('Mutation forbidden in live probe');const response=await original(input,init);window.__apiReads.push({url:String(input),status:response.status});return response;};})()"});
  await send('Page.reload');
  await until("document.body?.innerText.includes('Masuk Sebagai')",'role publik aktual');
  await click('Lihat Katalog & Keranjang (tanpa login)');await until("document.querySelectorAll('[data-catalog-item]').length===12",'12 dari backend pengguna');
  await evaluate("document.querySelectorAll('[data-catalog-item] img').forEach(e=>e.loading='eager')");
  await until("document.querySelectorAll('[data-catalog-item] img').length===12&&[...document.querySelectorAll('[data-catalog-item] img')].every(e=>e.complete&&e.naturalWidth>0)",'foto aktual');
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
    await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<400});await evaluate('window.scrollTo(0,0)');await noOverflow();await screenshot(`live-catalog-${size.width}.png`);
  }
  await click('Jadwal Peminjaman');await until("!!document.querySelector('#schedule-item')",'jadwal aktual');
  const scope='[aria-label="Kalender Jadwal Peminjaman"]';
  await fill(`${scope} [aria-label="Tahun kalender"]`,'2026');await fill(`${scope} [aria-label="Bulan kalender"]`,'11');
  await until(`document.querySelector('${scope}').innerText.includes('Pembacaan backend:')`,'komunikasi jadwal melalui proxy 5175 ke 3000');
  assert.ok(await evaluate(`document.querySelector('${scope}').innerText.includes('Belum diverifikasi')`));
  assert.equal(await evaluate("document.querySelectorAll('[data-allocation-segment]').length"),0,'Pengajuan menunggu existing tidak dianggap alokasi');
  assert.equal(await evaluate("document.body.innerText.includes('mahasiswa@smartlend.test')"),false);
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
    await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<400});await noOverflow();await evaluate(`document.querySelector('${scope}').scrollIntoView({block:'start'})`);await screenshot(`live-schedule-${size.width}.png`);
  }
  responses.push(...await evaluate('window.__apiReads'));
  assert.ok(responses.some(r=>r.url.startsWith('/api/schedule')&&r.status===200));
  assert.equal(responses.some(r=>r.status>=400&&r.status!==401),false);
  const gate=await evaluate("fetch('/api/admin/loans').then(r=>r.status)");assert.equal(gate,401);
  console.log(`PASS live GET-only 5175 -> 3000: 12 assets, schedule API 200, pending not allocation, unknown availability, Admin anonymous 401, desktop/mobile. Screenshots: ${b.profile}`);
}finally{b.close();}
