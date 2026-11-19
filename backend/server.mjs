import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDb,root } from './db.mjs';
import { AuthService } from './auth.mjs';
import { LoanService, loanError } from './loans.mjs';
import { LoanReadService, decisionReadiness } from './loan-reads.mjs';
import { loanFormOptions } from './loan-form.mjs';
export function makeServer(db,origin='http://127.0.0.1:3000') {
 const auth=new AuthService(db),loans=new LoanService(db),reads=new LoanReadService(db),dist=resolve(root,'dist');
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const token=(req.headers.cookie||'').match(/(?:^|;\s*)sid=([a-f0-9]{64})(?:;|$)/)?.[1] || '';
  const requestUrl=new URL(req.url,origin),path=requestUrl.pathname;
  try {
   if(path.startsWith('/api/')) {
    if(req.method==='GET'&&path==='/api/catalog') {
     const barang=db.prepare('SELECT id_barang, kode_barang, nama_barang, jenis, satuan, stok_total FROM barang ORDER BY id_barang').all();
     const ruangan=db.prepare('SELECT id_ruangan, kode_ruangan, nama_ruangan, kapasitas, lokasi, status_operasional FROM ruangan ORDER BY id_ruangan').all();
     return send(200,{barang,ruangan});
    }
     if(req.method==='GET'&&path==='/api/me') {const data=auth.current(token);return send(data?200:401,data || {error:'Silakan login.'});}
      if(req.method==='GET'&&path==='/api/admin') {const data=auth.current(token);return send(!data?401:data.user.role==='admin'?200:403,!data?{error:'Silakan login.'}:data.user.role==='admin'?{message:'Akses admin terverifikasi.'}:{error:'Akses ditolak.'});}
     if(path==='/api/schedule') {
      if(req.method!=='GET')return send(405,{error:'Metode tidak diizinkan.'});
      return send(200,reads.schedule(requestUrl.searchParams));
     }
     const adminLoanPath=path==='/api/admin/loans'||path.startsWith('/api/admin/loans/');
     const decision=path.match(/^\/api\/admin\/loans\/([1-9]\d*)\/(approve|reject)$/);
     let adminSession;
     if(adminLoanPath) {
      adminSession=auth.current(token);
      if(!adminSession)return send(401,{error:'Silakan login.'});
      if(adminSession.user.role!=='admin')return send(403,{error:'Akses ditolak.'});
      if(req.method==='GET'&&path==='/api/admin/loans')return send(200,reads.list(requestUrl.searchParams));
      if(req.method==='GET'&&path==='/api/admin/loans/stats')return send(200,reads.stats(requestUrl.searchParams));
      if(req.method==='GET'&&path==='/api/admin/loans/readiness')return send(200,{decisions:decisionReadiness()});
      if(req.method==='GET'&&/^\/api\/admin\/loans\/[1-9]\d*$/.test(path))return send(200,reads.detail(Number(path.split('/').pop())));
      if(!decision)return send(404,{error:'Endpoint tidak ditemukan.'});
      if(req.method!=='POST')return send(405,{error:'Metode tidak diizinkan.'});
      if(req.headers['x-csrf-token']!==adminSession.csrf)return send(403,{error:'CSRF tidak valid.'});
     }
     const loanPath=path==='/api/loans'||path.startsWith('/api/loans/');
     let loanSession;
     if(loanPath) {
      loanSession=auth.current(token);
      if(!loanSession)return send(401,{error:'Silakan login.'});
       if(loanSession.user.role!=='student')return send(403,{error:'Pengajuan mahasiswa memerlukan role Mahasiswa.'});
       if(req.method==='GET'&&path==='/api/loans/form-options')return send(200,loanFormOptions(db));
      if(req.method==='GET'&&path==='/api/loans/mine')return send(200,{loans:loans.mine(Number(loanSession.user.id))});
      if(req.method==='GET'&&/^\/api\/loans\/\d+$/.test(path))return send(200,{loan:loans.detail(Number(loanSession.user.id),Number(path.split('/').pop()))});
      if(req.method==='POST'&&path==='/api/loans'&&req.headers['x-csrf-token']!==loanSession.csrf)return send(403,{error:'CSRF tidak valid.'});
     }
    if(req.method!=='POST') return send(404,{error:'Endpoint tidak ditemukan.'});
    if(req.headers.origin!==origin || !(req.headers['content-type']||'').startsWith('application/json')) return send(403,{error:'Origin atau format permintaan tidak diizinkan.'});
     const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>(loanPath?16384:4096))return send(413,{error:'Permintaan terlalu besar.'});chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
     let input;try{input=JSON.parse(body);}catch{return send(400,{error:'JSON tidak valid.'});}
     if(!input||typeof input!=='object'||Array.isArray(input))return send(400,{error:'Payload harus berupa objek.'});
     // Pembacaan stream body mengandung await: sesi/role dapat dicabut ketika upload.
     // Periksa ulang tepat sebelum operasi sinkron; jangan gunakan snapshot sesi lama.
     if(loanPath||adminLoanPath) {
      const current=auth.current(token),role=adminLoanPath?'admin':'student';
      if(!current)return send(401,{error:'Silakan login.'});
      if(current.user.role!==role)return send(403,{error:'Akses ditolak.'});
      if(req.headers['x-csrf-token']!==current.csrf)return send(403,{error:'CSRF tidak valid.'});
      if(adminLoanPath) {
       const blocked=decisionReadiness()[decision[2]==='approve'?'approval':'rejection'];
       return send(503,{error:'Keputusan belum diaktifkan; prasyarat perlu disepakati dan diverifikasi.',...blocked});
      }
      loanSession=current;
     }
    const cookie=`Path=/; HttpOnly; SameSite=Strict${origin.startsWith('https:')?'; Secure':''}`;
    if(path==='/api/login'){ const result=auth.login(input.email,input.password,input.role,token);res.setHeader('Set-Cookie',`sid=${result.token}; Max-Age=3600; ${cookie}`);return send(200,{user:result.user,csrf:result.csrf}); }
     if(path==='/api/logout'){const current=auth.current(token);if(!current)return send(401,{error:'Silakan login.'});if(req.headers['x-csrf-token']!==current.csrf)return send(403,{error:'CSRF tidak valid.'});auth.logout(token);res.setHeader('Set-Cookie',`sid=; Max-Age=0; ${cookie}`);return send(200,{ok:true});}
      if(path==='/api/loans'){
       const assertAuthorized=()=>{
        const current=auth.current(token);
        if(!current||current.user.id!==loanSession.user.id)throw loanError(401,'Silakan login.');
        if(current.user.role!=='student')throw loanError(403,'Akses ditolak.');
        if(req.headers['x-csrf-token']!==current.csrf)throw loanError(403,'CSRF tidak valid.');
       };
       const result=loans.create(Number(loanSession.user.id),req.headers['idempotency-key'],input,assertAuthorized);
       return send(result.replayed?200:201,result);
      }
    return send(404,{error:'Endpoint tidak ditemukan.'});
   }
   if(req.method!=='GET')return send(405,{error:'Metode tidak diizinkan.'});
   const file=resolve(dist,'.'+decodeURIComponent(path));if(!file.startsWith(dist+sep)&&file!==dist)return send(403,{error:'Akses ditolak.'});
   let data; let extension=extname(file);try{data=await readFile(file);}catch{data=await readFile(dist+'/index.html');extension='.html';}
   res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[extension]||'application/octet-stream'});res.end(data);
   }catch(e){send(e.status||([5,6].includes(e.errcode)?503:500),{error:e.status?e.message:'Kesalahan internal server.',...(e.status&&e.fields?{fields:e.fields}:{})});}
 });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT||3000),origin=process.env.APP_ORIGIN||`http://127.0.0.1:${port}`;makeServer(openDb(),origin).listen(port,'127.0.0.1',()=>console.log(`SmartLend: ${origin}`));}
