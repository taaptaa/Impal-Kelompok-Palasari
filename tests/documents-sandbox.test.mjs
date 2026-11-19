import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,writeFileSync,utimesSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {openDb} from '../backend/db.mjs';
import {SessionRepository} from '../backend/auth.mjs';
import {documentSandbox} from '../experiments/documents/server.mjs';
import {candidateDocumentPolicy} from '../experiments/documents/candidate-policy.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
// Parser/scanner doubles are deliberately labelled: no real security engine installed.
const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
async function fixture(adapters=true,scanHook=()=>{}){
  const directory=mkdtempSync(join(process.env.LOCALAPPDATA,'Temp','opencode','smartlend-documents-test-'));
  const db=openDb(':memory:');db.exec(readFileSync(new URL('../experiments/documents/schema.DRAFT.sql',import.meta.url),'utf8'));
  for(const [id,role] of [[1,'mahasiswa'],[2,'admin'],[3,'petugas'],[4,'mahasiswa']])db.prepare('INSERT INTO pengguna VALUES(?,?,?,?,?,1)').run(id,'SYNTHETIC',id+'@example.test','not-a-hash',role);
  db.exec("INSERT INTO peminjaman VALUES(1,'TEST-1',1,NULL,'2030-01-01','2030-01-02','SYNTHETIC','menunggu')");
  const repo=new SessionRepository(db),sessions=[null,...[1,2,3,4].map(id=>repo.create(id))];let now=Date.now();
  const policy=candidateDocumentPolicy;
  const args={directory,origin:'http://127.0.0.1:5175',policy,clock:()=>now};
  if(adapters){args.inspectPdf=async bytes=>({valid:!bytes.includes('BROKEN'),activeContent:bytes.includes('/JavaScript'),encrypted:bytes.includes('/Encrypt')});args.scan=async bytes=>{await scanHook(db);return {clean:!bytes.includes('MALWARE'),sha256:digest(bytes),version:'synthetic-scanner-NOT-production'};};}
  const sandbox=documentSandbox(db,args);await new Promise(r=>sandbox.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${sandbox.server.address().port}`;
  const upload=(body=pdf,{user=1,key=randomUUID(),name='proposal.pdf',headers={}}={})=>fetch(base+'/api/loans/1/documents',{method:'POST',headers:{...(user?{Cookie:`sid=${sessions[user].token}`,'X-CSRF-Token':sessions[user].csrf}:{}),Origin:args.origin,'Content-Type':'application/pdf','Idempotency-Key':key,'X-Document-Name':name,...headers},body});
  const get=(id,user=1,path='/api/documents/')=>fetch(base+path+id,{headers:user?{Cookie:`sid=${sessions[user].token}`}:{}});
  return {...sandbox,db,directory,upload,get,sessions,repo,setTime:t=>now=t,close:async()=>{await new Promise(r=>sandbox.server.close(r));db.close();}};
}
test('Document sandbox stores private bytes/metadata, owner/Admin download, repeat upload once',async()=>{
  const f=await fixture();try{const key=randomUUID(),r=await f.upload(pdf,{key});assert.equal(r.status,201);const data=await r.json(),id=data.document.id;
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM dokumen_pengajuan').get().n,1);assert.deepEqual(readFileSync(join(f.directory,id+'.pdf')),pdf);
    const repeated=await f.upload(pdf,{key});assert.equal(repeated.status,200);assert.equal((await repeated.json()).document.id,id);
    assert.equal((await f.upload(Buffer.from('%PDF-1.4\nchanged\n%%EOF'),{key})).status,409);
    for(const user of [1,2]){const response=await f.get(id,user);assert.equal(response.status,200);assert.match(response.headers.get('Content-Disposition'),/^attachment/);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.deepEqual(Buffer.from(await response.arrayBuffer()),pdf);}
    assert.equal((await f.get(id,0)).status,401);assert.equal((await f.get(id,4)).status,404);assert.equal((await f.get(id,3)).status,404);
    assert.equal((await f.get(id,0,'/public/')).status,404);assert.equal((await f.get(id,0,'/dist/')).status,404);
    assert.equal((await f.upload(pdf,{user:2})).status,404);assert.equal((await f.upload(pdf,{user:4})).status,404);
  }finally{await f.close();}
});
test('Document validation size/MIME/extension/traversal/signature/parser/malware; no files on rejection',async()=>{
  const f=await fixture();try{
    for(const [body,options,status] of [[Buffer.alloc(candidateDocumentPolicy.maxBytes+1),{},413],[pdf,{headers:{'Content-Type':'image/png'}},415],[pdf,{name:'a.exe'},400],[pdf,{name:'../a.pdf'},400],[pdf,{name:'C:\\a.pdf'},400],[Buffer.from('not pdf'),{},415],[Buffer.from('%PDF-1.4\nBROKEN\n%%EOF'),{},422],[Buffer.from('%PDF-1.4\n/JavaScript\n%%EOF'),{},422],[Buffer.from('%PDF-1.4\n/Encrypt\n%%EOF'),{},422],[Buffer.from('%PDF-1.4\nMALWARE\n%%EOF'),{},503],[pdf,{user:0},401],[pdf,{headers:{Origin:'http://evil.test'}},403],[pdf,{headers:{'X-CSRF-Token':'wrong'}},403]])assert.equal((await f.upload(body,options)).status,status);
    assert.equal(f.db.prepare('SELECT COUNT(*) n FROM dokumen_pengajuan').get().n,0);assert.deepEqual(readdirSync(f.directory),[]);
    assert.equal((await f.upload()).status,201);assert.equal((await f.upload()).status,201);assert.equal((await f.upload()).status,409);
  }finally{await f.close();}
});
test('Document missing real adapters fails closed; DB failure cleans newly written private bytes',async()=>{
  const blocked=await fixture(false);try{assert.equal((await blocked.upload()).status,503);assert.deepEqual(readdirSync(blocked.directory),[]);}finally{await blocked.close();}
  const f=await fixture();try{
    f.db.exec("CREATE TRIGGER fail_document BEFORE INSERT ON dokumen_pengajuan BEGIN SELECT RAISE(ABORT,'synthetic'); END");
    const key=randomUUID();assert.equal((await f.upload(pdf,{key})).status,500);assert.deepEqual(readdirSync(f.directory),[]);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM dokumen_pengajuan').get().n,0);
    f.db.exec('DROP TRIGGER fail_document');assert.equal((await f.upload(pdf,{key})).status,201);
  }finally{await f.close();}
});
test('Document expiry denies reads, retention purges bytes but keeps retry tombstone; orphan sweep conservative',async()=>{
  const f=await fixture();try{
    const key=randomUUID(),data=await(await f.upload(pdf,{key})).json(),id=data.document.id;
    f.setTime(Date.parse(data.document.expiresAt)+1);assert.equal((await f.get(id)).status,410);assert.equal(f.sweep(),1);
    assert.equal(f.db.prepare('SELECT status FROM dokumen_pengajuan').get().status,'deleted');assert.deepEqual(readdirSync(f.directory),[]);
    assert.equal((await(await f.upload(pdf,{key})).json()).document.status,'deleted');assert.deepEqual(readdirSync(f.directory),[]);
    const orphan=join(f.directory,randomUUID()+'.part');writeFileSync(orphan,'orphan');utimesSync(orphan,0,0);writeFileSync(join(f.directory,'user-note.txt'),'preserve');
    assert.equal(f.sweep(),1);assert.deepEqual(readdirSync(f.directory),['user-note.txt']);
  }finally{await f.close();}
});
test('Document reauthorizes after asynchronous inspection; parallel retry is single file; changed bytes denied',async()=>{
  const revoked=await fixture(true,db=>db.exec('UPDATE pengguna SET aktif=0 WHERE id_pengguna=1'));
  try{assert.equal((await revoked.upload()).status,401);assert.deepEqual(readdirSync(revoked.directory),[]);}finally{await revoked.close();}
  const f=await fixture();try{
    const key=randomUUID(),responses=await Promise.all([f.upload(pdf,{key}),f.upload(pdf,{key})]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
    const ids=await Promise.all(responses.map(async r=>(await r.json()).document.id));assert.equal(ids[0],ids[1]);assert.equal(readdirSync(f.directory).length,1);
    writeFileSync(join(f.directory,ids[0]+'.pdf'),'corrupt');assert.equal((await f.get(ids[0])).status,503);
  }finally{await f.close();}
});
