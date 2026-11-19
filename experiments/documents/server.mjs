// Isolated mechanism, NOT wired to backend/server. No production policy/default scanner.
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, realpathSync, writeFileSync, readFileSync, renameSync, unlinkSync, readdirSync, openSync, closeSync, fsyncSync } from 'node:fs';
import { resolve, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthService } from '../../backend/auth.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function documentSandbox(db,{directory,origin,policy,inspectPdf,scan,clock=Date.now}) {
  // Explicit test DB only. A caller cannot accidentally activate this on the user DB.
  const main=db.prepare('PRAGMA database_list').all().find(row=>row.name==='main');
  if(main.file&&!/smartlend-documents-test-[^\\/]+[\\/]documents\.sqlite$/.test(main.file))throw Error('Only isolated document test databases permitted');
  const root=realpathSync(directory),workspace=resolve(fileURLToPath(new URL('../../',import.meta.url)));
  if(root.toLowerCase()===workspace.toLowerCase()||root.toLowerCase().startsWith(workspace.toLowerCase()+sep))throw Error('Private storage must be outside workspace/public/dist');
  if(root!==resolve(directory)||lstatSync(root).isSymbolicLink())throw Error('Storage alias rejected');
  if(!policy||policy.optional!==true||!Number.isSafeInteger(policy.maxBytes)||policy.maxBytes<1||policy.maxBytes>10*1024**2||!Number.isSafeInteger(policy.maxFiles)||policy.maxFiles<1||policy.maxFiles>5||!Number.isSafeInteger(policy.retentionMs)||policy.retentionMs<1||!policy.version)throw Error('Explicit test policy required');
  const auth=new AuthService(db);
  const session=token=>{const value=auth.current(token);if(!value)fail(401,'Login diperlukan.');return value;};
  const access=(token,loanId,write=false)=>{
    const s=session(token),loan=db.prepare('SELECT id_peminjam FROM peminjaman WHERE id_peminjaman=?').get(loanId);
    if(!loan||!(s.user.role==='student'&&Number(s.user.id)===loan.id_peminjam||!write&&s.user.role==='admin'))fail(404,'Dokumen/pengajuan tidak ditemukan.');
    return s;
  };
  const privatePath=id=>{if(!uuid.test(id))fail(404,'Dokumen tidak ditemukan.');return join(root,id+'.pdf');};
  const receipt=row=>({id:row.id,loanId:row.id_peminjaman,name:row.nama_tampilan,bytes:row.bytes,sha256:row.sha256,uploadedAt:new Date(row.diunggah_ms).toISOString(),expiresAt:new Date(row.kedaluwarsa_ms).toISOString(),status:row.status});
  const server=createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    const token=(req.headers.cookie||'').match(/(?:^|;\s*)sid=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
    try {
      const path=new URL(req.url,origin).pathname;
      const upload=path.match(/^\/api\/loans\/([1-9]\d*)\/documents$/),download=path.match(/^\/api\/documents\/([a-f0-9-]+)$/);
      if(upload&&req.method==='POST') {
        const loanId=Number(upload[1]),s=access(token,loanId,true),key=req.headers['idempotency-key'],name=req.headers['x-document-name'];
        if(req.headers.origin!==origin||req.headers['x-csrf-token']!==s.csrf)fail(403,'Origin/CSRF invalid.');
        if(typeof inspectPdf!=='function'||typeof scan!=='function')fail(503,'Parser PDF dan scanner belum tersedia.');
        if(typeof key!=='string'||!uuid.test(key))fail(400,'UUID key diperlukan.');
        if(typeof name!=='string'||!name.endsWith('.pdf')||name.length>100||/[\\/\x00-\x1f\x7f:]/.test(name)||name.includes('..'))fail(400,'Nama PDF invalid.');
        if(req.headers['content-type']!=='application/pdf')fail(415,'Hanya PDF.');
        if(Number(req.headers['content-length'])>policy.maxBytes)fail(413,'File terlalu besar.');
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>policy.maxBytes)fail(413,'File terlalu besar.');chunks.push(chunk);}
        const bytes=Buffer.concat(chunks),sha=hash(bytes);
        if(!/^%PDF-1\.[0-7][\r\n]/.test(bytes.subarray(0,12).toString('latin1'))||!bytes.subarray(-32).toString('latin1').trimEnd().endsWith('%%EOF'))fail(415,'Signature PDF invalid.');
        // Header/EOF alone is NOT a security parser. Both adapters must approve exact bytes.
        const parsed=await inspectPdf(bytes),scanned=await scan(bytes);
        if(parsed?.valid!==true||parsed.activeContent!==false||parsed.encrypted!==false)fail(422,'PDF rusak/aktif/terenkripsi tidak diterima.');
        if(scanned?.clean!==true||scanned.sha256!==sha||typeof scanned.version!=='string'||!scanned.version)fail(503,'Pemeriksaan malware tidak lolos/tidak tersedia.');
        const id=randomUUID(),temp=join(root,id+'.part'),final=privatePath(id),requestHash=hash(Buffer.from(JSON.stringify({loanId,name,sha,policy:policy.version})));
        let created=false,savedResult;
        db.exec('BEGIN IMMEDIATE');
        try {
          const current=access(token,loanId,true);if(current.csrf!==req.headers['x-csrf-token'])fail(403,'Sesi berubah.');
          const existing=db.prepare('SELECT * FROM dokumen_pengajuan WHERE id_pengunggah=? AND request_key=?').get(Number(current.user.id),key);
          if(existing){if(existing.request_hash!==requestHash)fail(409,'Key berbeda payload.');db.exec('COMMIT');send(200,{document:receipt(existing),replayed:true});return;}
          const count=db.prepare("SELECT COUNT(*) n FROM dokumen_pengajuan WHERE id_peminjaman=? AND status='stored'").get(loanId).n;
          if(count>=policy.maxFiles)fail(409,'Batas jumlah file.');
          writeFileSync(temp,bytes,{flag:'wx',mode:0o600});created=true;
          const fd=openSync(temp,'r+');try{fsyncSync(fd);}finally{closeSync(fd);}
          renameSync(temp,final);
          const now=clock();
          db.prepare('INSERT INTO dokumen_pengajuan VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,loanId,Number(current.user.id),key,requestHash,name,size,sha,now,now+policy.retentionMs,policy.version,scanned.version,'stored');
          const saved=db.prepare('SELECT * FROM dokumen_pengajuan WHERE id=?').get(id);savedResult={document:receipt(saved),replayed:false};db.exec('COMMIT');
        }catch(error){db.exec('ROLLBACK');if(created){for(const file of [temp,final])try{unlinkSync(file);}catch(e){if(e.code!=='ENOENT')throw e;}}throw error;}
        send(201,savedResult);return;
      }
      if(download&&req.method==='GET') {
        session(token);const row=db.prepare('SELECT * FROM dokumen_pengajuan WHERE id=?').get(download[1]);
        if(!row)fail(404,'Dokumen tidak ditemukan.');access(token,row.id_peminjaman);
        if(row.status!=='stored'||row.kedaluwarsa_ms<=clock())fail(410,'Dokumen kedaluwarsa/dihapus.');
        const file=privatePath(row.id);if(lstatSync(file).isSymbolicLink()||realpathSync(file)!==file)fail(503,'Storage tidak valid.');
        const bytes=readFileSync(file);if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail(503,'Integritas dokumen gagal.');
        res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="document-${row.id}.pdf"`,'Content-Security-Policy':"sandbox; default-src 'none'"});res.end(bytes);return;
      }
      send(404,{error:'Endpoint tidak ditemukan.'});
    }catch(error){send(error.status||500,{error:error.status?error.message:'Kesalahan dokumen.'});}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  // Maintenance on isolated storage only. Expiry is enforced on reads even before purge.
  function sweep(graceMs=3600000) {
    db.exec('BEGIN IMMEDIATE');let removed=0;
    try {
      for(const row of db.prepare("SELECT id FROM dokumen_pengajuan WHERE status='stored' AND kedaluwarsa_ms<=?").all(clock())){
        try{unlinkSync(privatePath(row.id));}catch(e){if(e.code!=='ENOENT')throw e;}
        db.prepare("UPDATE dokumen_pengajuan SET status='deleted' WHERE id=?").run(row.id);removed++;
      }
      for(const entry of readdirSync(root,{withFileTypes:true})){
        const match=entry.name.match(/^([a-f0-9-]+)\.(pdf|part)$/);if(!entry.isFile()||!match||!uuid.test(match[1]))continue;
        const path=join(root,entry.name);if(clock()-lstatSync(path).mtimeMs<graceMs)continue;
        if(db.prepare("SELECT 1 FROM dokumen_pengajuan WHERE id=? AND status='stored'").get(match[1]))continue;
        unlinkSync(path);removed++;
      }
      db.exec('COMMIT');return removed;
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  return {server,sweep};
}
