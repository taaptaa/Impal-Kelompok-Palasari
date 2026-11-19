import type { User, UserRole } from './types';
import { checkedAdminList, checkedAdminLoan, checkedDecisions, checkedStats, checkedSchedule, scheduleChunks, mergeSegments } from './loan-read-models.mjs';
import { ACKNOWLEDGEMENT_VERSION, ACKNOWLEDGEMENT_TEXT, FORM_LIMITS, validSavedFormDetails, type FormDetailsInput, type SavedFormDetails } from './loan-form-validation.mjs';
export type { FormDetailsInput, SavedFormDetails } from './loan-form-validation.mjs';

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: Record<string,string> = {}) { super(message); }
}

async function jsonResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!data) throw new Error('Server API tidak dapat dihubungi atau respons tidak valid.');
  if (!response.ok) throw new ApiError(data.error || 'Server tidak dapat memproses permintaan.',response.status,data.fields);
  return data;
}

function verifiedSession(data: unknown): { user: User; csrf: string } {
  const session = data as { user?: User; csrf?: string } | null;
  const user = session?.user;
  if (!user || typeof user.id !== 'string' || !user.id || typeof user.name !== 'string' || typeof user.email !== 'string'
    || !['student', 'admin', 'warehouse'].includes(user.role) || typeof session?.csrf !== 'string' || !session.csrf) {
    throw new Error('Respons sesi backend tidak valid. Akses belum diberikan.');
  }
  return { user, csrf: session.csrf };
}

export async function currentSession(): Promise<{ user: User; csrf: string } | null> {
  const response = await fetch('/api/me', { credentials: 'same-origin' });
  if (response.status === 401) return null;
  return verifiedSession(await jsonResponse(response));
}

export async function login(email: string, password: string, role: UserRole): Promise<User> {
  const response = await fetch('/api/login', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  return verifiedSession(await jsonResponse(response)).user;
}

export async function logout(): Promise<void> {
  const session = await currentSession();
  if (!session) return;
  const response = await fetch('/api/logout', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf },
    body: '{}',
  });
  await jsonResponse(response);
}

export interface CatalogItem {
  id_barang: number;
  kode_barang: string;
  nama_barang: string;
  jenis: 'portabel' | 'tetap';
  satuan: string;
  stok_total: number;
}

export interface CatalogRoom {
  id_ruangan: number;
  kode_ruangan: string;
  nama_ruangan: string;
  kapasitas: number;
  lokasi: string;
  status_operasional: 'aktif' | 'perawatan';
}

export async function getCatalog(): Promise<{ barang: CatalogItem[]; ruangan: CatalogRoom[] }> {
  return jsonResponse(await fetch('/api/catalog'));
}

export interface LoanInput {
  items: { itemId: number; quantity: number }[];
  startsAt: string;
  endsAt: string;
  reason: string;
  details?: FormDetailsInput;
}
export interface SavedLoan {
  id: number;
  number: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'dipinjam' | 'selesai' | 'dibatalkan';
  createdAt: string | null;
  borrower: { name: string; email: string; role: 'student' };
  items: { itemId: number; code: string; name: string; unit: string; quantity: number }[];
  totalTypes: number;
  totalUnits: number;
  details?: SavedFormDetails;
}
function verifiedLoan(loan: SavedLoan): SavedLoan {
  if (!loan || !Number.isSafeInteger(loan.id) || loan.id<1 || typeof loan.number!=='string' || !loan.number || !Array.isArray(loan.items) || !loan.borrower || !['menunggu','disetujui','ditolak','dipinjam','selesai','dibatalkan'].includes(loan.status)) throw new Error('Respons pengajuan tidak valid. Periksa Peminjaman Saya sebelum mencoba lagi.');
  if(loan.details!==undefined&&!validSavedFormDetails(loan.details))throw new Error('Respons field tambahan tidak valid. Periksa Peminjaman Saya.');
  return loan;
}
export interface LoanFormOptions {contract:'loan-form-v1';additionalFields:boolean;state:'ready'|'BLOCKED';reason:string|null;limits:typeof FORM_LIMITS;acknowledgement:{version:string;text:string;legalTerms:false};documents:{state:'BLOCKED'}}
export const legacyFormOptions:LoanFormOptions={contract:'loan-form-v1',additionalFields:false,state:'BLOCKED',reason:'backend_not_updated',limits:FORM_LIMITS,acknowledgement:{version:ACKNOWLEDGEMENT_VERSION,text:ACKNOWLEDGEMENT_TEXT,legalTerms:false},documents:{state:'BLOCKED'}};
export async function getLoanFormOptions(signal?:AbortSignal):Promise<LoanFormOptions> {
  const response=await fetch('/api/loans/form-options',{credentials:'same-origin',signal});
  // A running older backend supports the unchanged base form, not the extension.
  if(response.status===404)return legacyFormOptions;
  const data=await jsonResponse(response);
  if(data?.contract!=='loan-form-v1'||typeof data.additionalFields!=='boolean'||data.state!==(data.additionalFields?'ready':'BLOCKED')||data.acknowledgement?.version!==ACKNOWLEDGEMENT_VERSION||data.acknowledgement?.text!==ACKNOWLEDGEMENT_TEXT||data.acknowledgement?.legalTerms!==false||data.documents?.state!=='BLOCKED'||Object.entries(FORM_LIMITS).some(([key,value])=>data.limits?.[key]!==value))throw new Error('Kontrak form tambahan tidak valid; field tidak diaktifkan.');
  return data;
}
export async function createLoan(input: LoanInput, key: string, expectedUserId: string): Promise<SavedLoan> {
  const session = await currentSession();
  if (!session) throw new ApiError('Sesi berakhir. Silakan login kembali.',401);
  if (session.user.role!=='student' || session.user.id!==expectedUserId) throw new ApiError('Identitas sesi berubah. Muat ulang halaman dan periksa akun Anda.',403);
  const data = await jsonResponse(await fetch('/api/loans',{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf,'Idempotency-Key':key},body:JSON.stringify(input),
  }));
  return verifiedLoan(data.loan);
}
export async function getMyLoans(): Promise<SavedLoan[]> {
  const data = await jsonResponse(await fetch('/api/loans/mine',{credentials:'same-origin'}));
  if (!Array.isArray(data.loans)) throw new Error('Daftar pengajuan tidak valid.');
  return data.loans.map(verifiedLoan);
}
export async function getLoan(id: number): Promise<SavedLoan> {
  const data = await jsonResponse(await fetch(`/api/loans/${id}`,{credentials:'same-origin'}));
  return verifiedLoan(data.loan);
}

export interface DecisionGate { state:'BLOCKED'; code:string; blockers:string[] }
export interface DecisionReadiness { approval:DecisionGate; rejection:DecisionGate }
export interface AdminLoan extends Omit<SavedLoan,'borrower'> {
  borrower:{id:number;name:string;email:string;role:UserRole};
  admin:{id:number;name:string}|null;
  room:{roomId:number;code:string;name:string;participants:number}|null;
}
export interface AdminPagination { total:number; limit:number; offset:number; hasMore:boolean }
export interface AdminLoanList { loans:AdminLoan[]; pagination:AdminPagination; asOf:string }
export interface AdminLoanStats {
  total:number;
  byStatus:Record<SavedLoan['status'],number>;
  itemUnitsByStatus:Record<SavedLoan['status'],number>;
  roomLoansByStatus:Record<SavedLoan['status'],number>;
  decisions:DecisionReadiness;
  asOf:string;
}
export interface AdminReadFilter { status?:SavedLoan['status'];itemId?:number;startsAt?:string;endsAt?:string }
export interface ScheduleResource { type:'item'|'room';id:number }
export interface SchedulePeriod { startsAt:string;endsAt:string }
export interface RecordedSegment extends SchedulePeriod { recordedQuantity:number }
export interface ScheduleResponse {
  resource:ScheduleResource & {code:string;name:string;unit?:string;operationalStatus?:string};
  period:SchedulePeriod;
  interval:'[startsAt,endsAt)';scope:'direct_details_only';timeBasis:'sqlite_utc_legacy_unverified';
  segments:RecordedSegment[];
  borrowedQuantityPendingReconciliation:number;
  availability:{verification:'unverified';availableQuantity:null;blockers:string[]};
  asOf:string;
}
function query(values:Record<string,string|number|undefined>) {
  return new URLSearchParams(Object.entries(values).filter(([,value])=>value!==undefined).map(([key,value])=>[key,String(value)])).toString();
}
async function readJson(path:string,signal?:AbortSignal) {
  return jsonResponse(await fetch(path,{credentials:'same-origin',signal}));
}
export async function getAdminLoans(filter:AdminReadFilter,limit=10,offset=0,signal?:AbortSignal):Promise<AdminLoanList> {
  return checkedAdminList(await readJson('/api/admin/loans?'+query({...filter,limit,offset}),signal));
}
export async function getAdminLoanStats(filter:AdminReadFilter,signal?:AbortSignal):Promise<AdminLoanStats> {
  return checkedStats(await readJson('/api/admin/loans/stats?'+query({...filter}),signal));
}
export async function getAdminReadiness(signal?:AbortSignal):Promise<DecisionReadiness> {
  return checkedDecisions((await readJson('/api/admin/loans/readiness',signal)).decisions);
}
export async function getAdminLoan(id:number,signal?:AbortSignal):Promise<{loan:AdminLoan;decisions:DecisionReadiness;asOf:string}> {
  const data=await readJson(`/api/admin/loans/${id}`,signal);
  return {loan:checkedAdminLoan(data.loan),decisions:checkedDecisions(data.decisions),asOf:data.asOf};
}
export async function getSchedule(resource:ScheduleResource,period:SchedulePeriod,signal?:AbortSignal):Promise<ScheduleResponse> {
  const parts=await Promise.all(scheduleChunks(period.startsAt,period.endsAt).map(async chunk=>{
    const suffix=query({...chunk,[resource.type==='item'?'itemId':'roomId']:resource.id});
    return checkedSchedule(await readJson('/api/schedule?'+suffix,signal),resource,chunk);
  }));
  // Each part is a separate read snapshot. Do not sum the reconciliation indicator.
  return {...parts[0],period,segments:mergeSegments(parts),borrowedQuantityPendingReconciliation:Math.max(...parts.map(part=>part.borrowedQuantityPendingReconciliation)),asOf:parts.map(part=>part.asOf).sort()[0]};
}
