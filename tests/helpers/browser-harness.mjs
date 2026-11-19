import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync,readFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
export async function browserHarness(base) {
  const profile=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-integration-browser-'));
  // Keep automated profiles small; disable only browser background services,
  // never application/API requests or assertions.
  const chrome=spawn(process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-sandbox','--disable-background-networking','--disable-component-update','--disk-cache-size=1048576','--media-cache-size=1048576','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
  let socket;
  try {
    let port;for(let i=0;i<150;i++){try{port=Number(readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]);break;}catch{await delay(100);}}
    assert.ok(port,'Chrome belum siap');
    const target=await(await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(base)}`,{method:'PUT'})).json();
    socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let id=0;const pending=new Map();
    socket.addEventListener('message',event=>{const message=JSON.parse(event.data),task=pending.get(message.id);if(!task)return;pending.delete(message.id);message.error?task.reject(Error(message.error.message)):task.resolve(message.result);});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
    const until=async(expression,label)=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Timeout: '+label);};
    const click=async text=>evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}||e.querySelector('h3')?.textContent.trim()===${JSON.stringify(text)}||e.getAttribute('aria-label')===${JSON.stringify(text)});if(!e)throw Error('Button missing: '+${JSON.stringify(text)});e.click();})()`);
    const fill=async(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);
    const navigate=screen=>evaluate(`(()=>{const e=[...document.querySelectorAll('[data-nav="${screen}"]')].find(e=>e.getClientRects().length);if(!e)throw Error('Navigation missing');e.click();})()`);
    const screenshot=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(profile,name),Buffer.from(result.data,'base64'));};
    return {profile,send,evaluate,until,click,fill,navigate,screenshot,noOverflow:async()=>assert.equal(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),true),close:()=>{socket.close();chrome.kill();}};
  }catch(error){socket?.close();chrome.kill();throw error;}
}
