import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const digest = value => createHash('sha256').update(value).digest('hex');
export class PasswordHasher {
  hash(password) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
  verify(password, stored) { const [salt,hash]=stored.split(':'); if(!salt || !hash || hash.length!==128) return false; return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hash,'hex')); }
}
export class Pengguna {
  #row;
  constructor(row) { this.#row=row; }
  getRole() { return this.#row.peran; }
  getProfile() { const r=this.#row; return {id:String(r.id_pengguna),name:r.nama,email:r.email,role:{mahasiswa:'student',admin:'admin',petugas:'warehouse'}[r.peran]}; }
}
export class UserRepository {
  #db;
  constructor(db) { this.#db=db; }
  findByEmail(email) { return this.#db.prepare('SELECT * FROM pengguna WHERE email=?').get(email); }
  findById(id) { return this.#db.prepare('SELECT * FROM pengguna WHERE id_pengguna=?').get(id); }
}
export class SessionRepository {
  #db;
  constructor(db) { this.#db=db; }
  create(id) { const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex'); this.#db.prepare('INSERT INTO sesi(token_hash,id_pengguna,csrf,expires_at) VALUES(?,?,?,?)').run(digest(token),id,csrf,Date.now()+3600000);return {token,csrf}; }
  find(token) { return this.#db.prepare('SELECT * FROM sesi WHERE token_hash=? AND expires_at>?').get(digest(token || ''),Date.now()); }
  delete(token) { this.#db.prepare('DELETE FROM sesi WHERE token_hash=?').run(digest(token || '')); }
}
export class AuthService {
  #users; #sessions; #hasher; #db; #dummy;
  constructor(db) { this.#db=db; this.#users=new UserRepository(db);this.#sessions=new SessionRepository(db);this.#hasher=new PasswordHasher();this.#dummy=this.#hasher.hash('dummy-password'); }
  login(email,password,role,oldToken='') {
    if(typeof email!=='string'||typeof password!=='string'||typeof role!=='string'||!email.trim()||!password||email.length>100||password.length>200) throw Object.assign(new Error('Email dan password wajib diisi (maks. 100/200 karakter).'),{status:400});
    email=email.trim().toLowerCase();
    const attempt=this.#db.prepare('SELECT * FROM percobaan_login WHERE email=?').get(email);
    if(attempt && attempt.locked_until>Date.now()) throw Object.assign(new Error('Terlalu banyak percobaan. Coba lagi dalam 15 menit.'),{status:429});
    const row=this.#users.findByEmail(email); const valid=this.#hasher.verify(password,row?.password_hash || this.#dummy);
    if(!valid||!row||!row.aktif||new Pengguna(row).getProfile().role!==role) {
      const count=attempt && attempt.updated_at>Date.now()-900000 ? attempt.jumlah+1:1;
      this.#db.prepare('INSERT INTO percobaan_login(email,jumlah,locked_until,updated_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET jumlah=excluded.jumlah,locked_until=excluded.locked_until,updated_at=excluded.updated_at').run(email,count,count>=5?Date.now()+900000:0,Date.now());
      throw Object.assign(new Error('Email, password, atau peran tidak sesuai.'),{status:401});
    }
    this.#db.prepare('DELETE FROM percobaan_login WHERE email=?').run(email);
    this.#sessions.delete(oldToken);
    const session=this.#sessions.create(row.id_pengguna);return {...session,user:new Pengguna(row).getProfile()};
  }
  current(token) { const s=this.#sessions.find(token);if(!s) return null; const row=this.#users.findById(s.id_pengguna);return row?.aktif?{user:new Pengguna(row).getProfile(),csrf:s.csrf}:null; }
  logout(token) { this.#sessions.delete(token); }
}
