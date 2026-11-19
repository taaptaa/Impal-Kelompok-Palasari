// UI only: isolated Vite middleware, ephemeral HTTP port, no backend/database calls.
// Does not stop or replace the application running on 5175.
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtempSync,readFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const vite=await createViteServer({server:{middlewareMode:true},appType:'custom'});
const apiCalls=[];
const server=createHttpServer(async(req,res)=>{
  if(req.url.startsWith('/api/')) {apiCalls.push(req.url);res.writeHead(500);res.end('No API permitted in component tests');return;}
  if(req.url==='/') {res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml('/', '<html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/frontend-sprint2.tsx"></script></body></html>'));return;}
  vite.middlewares(req,res,()=>{res.writeHead(404);res.end();});
});
const profile=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-frontend-s2-'));
let chrome,socket;
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-sandbox','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  let debugPort;
  for(let i=0;i<150;i++){try{debugPort=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{await delay(100);}}
  assert.ok(debugPort,'Chrome belum siap');
  const target=await(await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(base)}`,{method:'PUT'})).json();
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data),task=pending.get(data.id);if(task){pending.delete(data.id);data.error?task.reject(Error(data.error.message)):task.resolve(data.result);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});
  const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error(data.exceptionDetails.exception?.description||data.exceptionDetails.text);return data.result.value;};
  const until=async(expression,label)=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timeout: '+label);};
  const click=async text=>{await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('Missing '+${JSON.stringify(text)});button.click();})()`);};
  const fill=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
  const screenshot=async name=>{const data=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(profile,name),Buffer.from(data.data,'base64'));};
  const noOverflow=async()=>assert.equal(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),true);
  await until("!!document.querySelector('#loan-form')",'form');
  await send('Emulation.setTimezoneOverride',{timezoneId:'America/New_York'});
  for(const size of [{width:1440,height:900},{width:768,height:1024},{width:390,height:844},{width:320,height:568},{width:640,height:320}]) {
    await send('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:size.width<400});
    await click('form');
    await until("!!document.querySelector('#loan-form')",'form');
    const scope='[aria-label="Kalender pemilihan periode"]';
    await fill(`${scope} [aria-label="Tahun kalender"]`,'2030');
    await fill(`${scope} [aria-label="Bulan kalender"]`,'11');
    await evaluate(`document.querySelector('${scope} [aria-label="Bulan berikutnya"]').click()`);
    assert.equal(await evaluate(`document.querySelector('${scope} [aria-label="Tahun kalender"]').value`),'2031');
    assert.equal(await evaluate(`document.querySelector('${scope} [aria-label="Bulan kalender"]').value`),'0');
    await evaluate(`document.querySelector('${scope} [aria-label="Bulan sebelumnya"]').click()`);
    assert.equal(await evaluate(`document.querySelector('${scope} [aria-label="Tahun kalender"]').value`),'2030');
    await fill('#loan-start','');await fill('#loan-end','');
    const day=async label=>evaluate(`(()=>{const e=document.querySelector('${scope} button[aria-label^="${label}"]');if(!e)throw Error('Missing day '+${JSON.stringify(label)}+'; '+[...document.querySelectorAll('${scope} button[aria-label]')].map(b=>b.getAttribute('aria-label')).join('|'));e.click();})()`);
    await day('Selasa, 10 Desember 2030');await day('Kamis, 12 Desember 2030');
    assert.equal(await evaluate("document.querySelector('#loan-start').value"),'2030-12-10T08:00');
    assert.equal(await evaluate("document.querySelector('#loan-end').value"),'2030-12-12T17:00');
    await fill('#loan-start','');await fill('#loan-end','');
    await day('Selasa, 10 Desember 2030');await day('Selasa, 10 Desember 2030');
    assert.equal(await evaluate("document.querySelector('#loan-end').value"),'2030-12-10T17:00','same-day range');
    await fill('#loan-start','2030-12-10T09:30');await fill('#loan-end','2030-12-10T11:45');
    await noOverflow();await evaluate(`document.querySelector('${scope}').scrollIntoView({block:'start'})`);await screenshot(`picker-${size.width}.png`);
    // DayPicker keyboard navigation and visible focus, with real CDP keyboard events.
    await evaluate(`document.querySelector('${scope} button.rdp-day_selected').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
    assert.ok(await evaluate("document.activeElement.classList.contains('rdp-day')"));
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await until("document.querySelector('#loan-end').value==='2030-12-11T11:45'",'keyboard selection preserves time '+JSON.stringify(await evaluate("({focus:document.activeElement.outerHTML,start:document.querySelector('#loan-start').value,end:document.querySelector('#loan-end').value})")));
    await click('schedule');await click('unconnected');await until("document.body.innerText.includes('Data belum terhubung')",'unconnected');await noOverflow();
    await click('loading');await until("document.body.innerText.includes('Memuat data dari backend')",'loading');
    await click('error');await until("!!document.querySelector('[role=alert]')",'error');
    await click('Coba Muat Lagi');await until("!!document.querySelector('.has-bookings')",'ready via retry');
    await evaluate(`document.querySelector('button[aria-label^="Selasa, 31 Desember 2030"]').click()`);
    await until("document.querySelectorAll('li').length===6",'all six statuses');
    assert.equal(await evaluate("document.body.innerText.includes('Belum diverifikasi')"),true);
    await evaluate("document.querySelector('[aria-label=\"Kalender Jadwal Peminjaman\"]').scrollIntoView({block:'start'})");await noOverflow();await screenshot(`schedule-${size.width}.png`);
    await click('empty');await until("document.body.innerText.includes('Tidak ada booking pada tanggal ini')",'empty');
    await click('admin');await click('ready');await until("document.querySelectorAll('[data-admin-request]').length===6",'admin ready');
    assert.equal(await evaluate("[...document.querySelectorAll('[data-admin-request] button')].every(b=>b.disabled)"),true);
    assert.equal(await evaluate("document.querySelector('[aria-label=\"Pengajuan dan statistik Admin\"]').innerText.includes('26')"),true,'API total is not page count');
    await fill('[aria-label="Pengajuan dan statistik Admin"] select','menunggu');await until("document.querySelectorAll('[data-admin-request]').length===1",'status filter');await fill('[aria-label="Pengajuan dan statistik Admin"] select','all');
    await fill('[aria-label="Cari pengajuan"]','missing');await until("document.body.innerText.includes('Tidak ada pengajuan yang cocok')",'search');await fill('[aria-label="Cari pengajuan"]','');
    await noOverflow();await evaluate("document.querySelector('[aria-label=\"Pengajuan dan statistik Admin\"]').scrollIntoView({block:'start'})");await screenshot(`admin-${size.width}.png`);
    for(const [state,text] of [['unconnected','Data belum terhubung'],['loading','Memuat data dari backend'],['error','Data gagal dimuat'],['empty','Belum ada pengajuan dalam data yang dimuat']]) {await click(state);await until(`document.body.innerText.includes(${JSON.stringify(text)})`,'admin '+state);await noOverflow();}
    await click('public');await until("!!document.querySelector('[data-catalog-item]')",'public');
    assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Kembali ke pemilihan role'))"),true);
    await evaluate("document.querySelectorAll('[data-catalog-item] img').forEach(img=>img.loading='eager')");
    await until("[...document.querySelectorAll('[data-catalog-item] img')].every(img=>img.complete&&img.naturalWidth>0)",'local photos');
    assert.equal(await evaluate("document.querySelectorAll('[data-catalog-item] img').length"),12);
    await noOverflow();await evaluate("document.querySelector('[data-catalog-item]').scrollIntoView({block:'start'})");await screenshot(`catalog-${size.width}.png`);
    await evaluate("document.querySelector('[data-catalog-item] img').dispatchEvent(new Event('error'))");await until("document.body.innerText.includes('Foto belum tersedia')",'broken image fallback');
    await click('student');await until("!!document.querySelector('[data-catalog-item]')",'student');
    assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Kembali')"),false);
    await click('fallback');await until("document.body.innerText.includes('Foto belum tersedia')",'unknown image fallback');
    console.log(`PASS component states, calendar/range/keyboard, photos/fallback and overflow ${size.width}x${size.height}`);
  }
  assert.deepEqual(apiCalls,[],'Component tests must not call any backend');
  console.log(`PASS no backend calls. Screenshots: ${profile}`);
} finally {socket?.close();chrome?.kill();await vite.close();if(server.listening)await new Promise(resolve=>server.close(resolve));}
