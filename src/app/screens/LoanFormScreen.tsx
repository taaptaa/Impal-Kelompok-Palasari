import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { User } from '../types';
import { ApiError, createLoan, getLoanFormOptions, legacyFormOptions, type LoanFormOptions, type CatalogItem, type LoanInput, type SavedLoan, type FormDetailsInput } from '../api';
import { jakartaToUtc, REASON_MAX, validateLoan } from '../loan-validation.mjs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { campusTime } from '../components/LoanSummary';
import { LoanPeriodPicker } from '../components/loans/LoanPeriodPicker';
import { BookingSchedule } from '../components/loans/BookingSchedule';
import { ScheduleContainer } from '../integrations/ScheduleContainer';
import type { BookingScheduleProps } from '../components/loans/view-contracts';
import { CartSummary } from '../components/CartSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { emptyFormDetails, normalizeFormDetails, FORM_LIMITS, ACKNOWLEDGEMENT_TEXT, ACKNOWLEDGEMENT_VERSION } from '../loan-form-validation.mjs';
import { civilDate } from '../components/loans/calendar-dates.mjs';
import { PolicyDocument } from '../components/PolicyDocument';

export interface LoanFormDraft {
  start: string;
  end: string;
  reason: string;
  attempt: { key: string; input: LoanInput } | null;
  details?:FormDetailsInput;
}
export const emptyLoanDraft = (): LoanFormDraft => ({start:'',end:'',reason:'',attempt:null,details:emptyFormDetails()});
interface Props {
  user: User;
  items: CatalogItem[];
  plan: Record<number,number>;
  draft: LoanFormDraft;
  onDraftChange: (draft: LoanFormDraft) => void;
  onBack: () => void;
  onHistory: () => void;
  onSuccess: (loan: SavedLoan, submitted: LoanInput) => void;
  schedule?: BookingScheduleProps;
  onBrowse?:()=>void;
  onPlanChange?:(id:number,quantity:number)=>void;
  formOptions?:LoanFormOptions;
}
export function LoanFormScreen({user,items,plan,draft,onDraftChange,onBack,onHistory,onSuccess,schedule,onBrowse,onPlanChange,formOptions}: Props) {
  const [errors,setErrors] = useState<Record<string,string>>({});
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [cartValid,setCartValid]=useState(true);
  const [cancelOpen,setCancelOpen]=useState(false);
  const scheduleTrigger=useRef<HTMLButtonElement|null>(null);
  const cancelTrigger=useRef<HTMLButtonElement|null>(null);
  const [options,setOptions]=useState<LoanFormOptions>(formOptions??legacyFormOptions);
  const [optionsLoading,setOptionsLoading]=useState(!formOptions);
  const [optionsError,setOptionsError]=useState('');
  const [optionsRetry,setOptionsRetry]=useState(0);
  useEffect(()=>{
    if(formOptions){setOptions(formOptions);setOptionsLoading(false);return;}
    const controller=new AbortController();let active=true;setOptionsLoading(true);setOptionsError('');
    getLoanFormOptions(controller.signal).then(data=>{if(active)setOptions(data);}).catch(failure=>{if(active){setOptions(legacyFormOptions);setOptionsError(failure instanceof Error?failure.message:'Status formulir tambahan gagal dimuat.');}}).finally(()=>{if(active)setOptionsLoading(false);});
    return()=>{active=false;controller.abort();};
  },[formOptions,optionsRetry]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    const first = errors.startsAt ? 'loan-start' : errors.endsAt ? 'loan-end' : errors.reason ? 'loan-reason' : Object.keys(errors).map(key=>`loan-${key}`).find(id=>document.getElementById(id))??null;
    if(first){const input=document.getElementById(first);input?.focus();input?.scrollIntoView({block:'center'});}
  },[errors]);
  const chosen = draft.attempt?.input.items ?? Object.entries(plan).filter(([,q])=>q>0).map(([id,quantity])=>({itemId:Number(id),quantity}));
  const locked = loading || !!draft.attempt;
  const details=draft.details??emptyFormDetails();
  const editDetails=(key:keyof typeof FORM_LIMITS,value:string)=>{onDraftChange({...draft,details:{...details,[key]:value}});setErrors({});setError('');};
  const makeInput=():LoanInput=>({items:chosen,startsAt:jakartaToUtc(draft.start),endsAt:jakartaToUtc(draft.end),reason:draft.reason.trim(),...(options.additionalFields?{details:normalizeFormDetails(details)}:{})});
  const edit = (key: 'start'|'end'|'reason',value: string) => {onDraftChange({...draft,[key]:value});setErrors({});setError('');};
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    if(!cartValid){setError('Simpan atau perbaiki jumlah Keranjang sebelum mengirim.');return;}
    if(optionsLoading&&!draft.attempt)return;
    const input: LoanInput = draft.attempt?.input ?? makeInput();
    if(!options.additionalFields&&!draft.attempt&&(Object.keys(FORM_LIMITS).some(key=>!!details[key as keyof typeof FORM_LIMITS])||details.acknowledgement.accepted)){setError('Draft berisi informasi tambahan, tetapi backend belum mendukungnya. Jangan kirim sebagai form dasar; periksa aktivasi atau batalkan draft dengan sadar.');return;}
    const fields = validateLoan(input,draft.attempt ? -Infinity : Date.now());
    if (!fields.items && input.items.some(entry=>{const item=items.find(item=>item.id_barang===entry.itemId);return !item || entry.quantity>item.stok_total;})) fields.items='Barang atau jumlah tidak sesuai katalog. Periksa Keranjang.';
    if(Object.keys(fields).length){setErrors(fields);return;}
    const attempt = draft.attempt ?? {key:crypto.randomUUID(),input};
    onDraftChange({...draft,attempt});
    busy.current=true;setLoading(true);setError('');setErrors({});
    try {
      const loan = await createLoan(attempt.input,attempt.key,user.id);
      if (!mounted.current) return;
      toast.success('Pengajuan tersimpan dan menunggu pemeriksaan Admin.',{id:'loan-submitted'});
      onSuccess(loan,attempt.input);
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof ApiError && failure.status===400) {
        setErrors(failure.fields);onDraftChange({...draft,attempt:null});
      }
      setError(failure instanceof Error ? failure.message : 'Pengajuan belum dapat dikonfirmasi.');
    } finally {busy.current=false;if(mounted.current)setLoading(false);}
  };
  const fieldError = (key:string) => errors[key] ? <p id={`loan-error-${key}`} role="alert" className="text-sm text-red-700 mt-2">{errors[key]}</p> : null;
  const preview=draft.attempt?.input??makeInput();
  const unsupportedDraft=!options.additionalFields&&!draft.attempt&&(Object.keys(FORM_LIMITS).some(key=>!!details[key as keyof typeof FORM_LIMITS])||details.acknowledgement.accepted);
  const valid=cartValid&&!unsupportedDraft&&(!optionsLoading||!!draft.attempt)&&Object.keys(validateLoan(preview,draft.attempt?-Infinity:Date.now())).length===0&&chosen.every(entry=>{const item=items.find(item=>item.id_barang===entry.itemId);return !!item&&entry.quantity<=item.stok_total;});
  const extraInput=(key:keyof typeof FORM_LIMITS,label:string,required=false)=><div><label htmlFor={`loan-${key}`} className="block text-sm font-semibold mb-2">{label}{required?' *':' (opsional)'}</label><Input id={`loan-${key}`} type={key==='phone'?'tel':'text'} inputMode={key==='phone'?'tel':undefined} autoComplete={key==='phone'?'tel':'off'} required={required&&options.additionalFields} maxLength={FORM_LIMITS[key]} value={details[key]} onChange={event=>editDetails(key,event.target.value)} onBlur={()=>{if(options.additionalFields)setErrors(validateLoan(preview));}} aria-invalid={!!errors[key]} aria-describedby={`additional-fields-note${errors[key]?` loan-error-${key}`:''}`} className="min-h-12 rounded-xl text-base" />{fieldError(key)}</div>;
  const checkoutPlan=Object.fromEntries(chosen.map(entry=>[entry.itemId,entry.quantity]));
  return <section className="sl-shell sl-section sl-checkout space-y-5" aria-label="Checkout peminjaman">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-600">Keranjang → Pengajuan → Pemeriksaan Admin</p><h1 className="text-[#9A1823]">Ajukan Peminjaman</h1></div><Button variant="outline" type="button" onClick={onBack} disabled={loading} className="min-h-11 rounded-xl">Kembali ke Keranjang</Button></div>
    <div className="sl-checkout-grid">
      <aside className="min-w-0 space-y-4"><CartSummary items={items} plan={checkoutPlan} onChange={onPlanChange} onBrowse={onBrowse??onBack} onValidityChange={setCartValid} disabled={locked} form />{fieldError('items')}
        <p className="text-sm text-slate-600">Foto ilustrasi, bukan unit kampus. Sumber dan lisensi tersedia melalui Kredit Gambar di bawah halaman.</p>
      </aside>
      <form id="loan-form" onSubmit={submit} noValidate className="sl-panel space-y-6" aria-busy={loading}>
        <section aria-labelledby="loan-borrower" className="sl-form-section space-y-3 text-sm">
          <h2 id="loan-borrower" className="font-bold text-lg">A. Informasi peminjam</h2>
          <dl className="space-y-2"><div><dt className="text-slate-600">Nama lengkap</dt><dd className="font-semibold">{user.name}</dd></div><div><dt className="text-slate-600">Email</dt><dd className="break-all">{user.email}</dd></div><div><dt className="text-slate-600">Kategori peminjam</dt><dd>Mahasiswa · identitas dari sesi backend</dd></div></dl>
          <p className="text-xs text-slate-600">Pengajuan Umum, Dosen dan Staf belum tersedia. Tidak ada tarif atau kategori baru yang diaktifkan.</p>
          {optionsLoading&&<p role="status">Memeriksa dukungan field tambahan...</p>}
          <p id="additional-fields-note" className="text-sm text-slate-600">{options.additionalFields?'Field tambahan didukung oleh schema pendamping pada server ini. Nomor telepon hanya divalidasi formatnya; NIM/ID dan unit adalah isian, bukan hasil verifikasi institusi.':'Field kontak dan kegiatan tambahan belum aktif (BLOCKED). Database pengguna belum dimigrasi; isian nonaktif tidak dikumpulkan atau dikirim. Form dasar waktu/keperluan tetap tersedia.'}</p>
          {optionsError&&<div role="alert"><p>{optionsError}</p><button type="button" className="underline min-h-11" onClick={()=>setOptionsRetry(value=>value+1)}>Coba Status Form Lagi</button></div>}
          {unsupportedDraft&&<p role="alert">Draft memuat field tambahan yang tidak didukung backend saat ini. Data tidak dibuang atau dikirim sebagian.</p>}
          <fieldset disabled={locked||!options.additionalFields} className="grid sm:grid-cols-2 gap-4"><legend className="sr-only">Kontak tambahan</legend>{extraInput('phone','Nomor telepon',true)}{extraInput('borrowerIdentifier','NIM / ID peminjam')}{extraInput('unit','Program studi / unit')}</fieldset>
        </section>
        <section className="sl-form-section space-y-3" aria-labelledby="loan-activity"><h2 id="loan-activity" className="font-bold text-lg">B. Informasi kegiatan</h2>
          <fieldset disabled={locked||!options.additionalFields} className="space-y-4"><legend className="sr-only">Informasi kegiatan tambahan</legend>{extraInput('activityName','Nama kegiatan',true)}{extraInput('activityLocation','Lokasi kegiatan',true)}<div><label htmlFor="loan-activityDescription" className="block text-sm font-semibold mb-2">Deskripsi kegiatan (opsional)</label><Textarea id="loan-activityDescription" rows={3} maxLength={FORM_LIMITS.activityDescription} value={details.activityDescription} onChange={event=>editDetails('activityDescription',event.target.value)} aria-invalid={!!errors.activityDescription} aria-describedby="additional-fields-note" className="rounded-xl text-base" />{fieldError('activityDescription')}</div></fieldset>
          <label htmlFor="loan-reason" className="block text-sm font-semibold">Tujuan / keperluan peminjaman</label>
          <Textarea id="loan-reason" required rows={4} maxLength={REASON_MAX} disabled={locked} value={draft.reason} onChange={event=>edit('reason',event.target.value)} aria-invalid={!!errors.reason} aria-describedby="loan-reason-limit loan-error-reason" className="rounded-xl text-base" />
          <p id="loan-reason-limit" className="text-xs text-slate-600">Maksimal {REASON_MAX} karakter. Keperluan disimpan melalui kontrak existing.</p>{fieldError('reason')}
        </section>
        <section className="sl-form-section space-y-4" aria-labelledby="loan-period"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="loan-period" className="font-bold text-lg">C. Jadwal peminjaman</h2><Button type="button" variant="outline" onClick={event=>{scheduleTrigger.current=event.currentTarget;toast.dismiss();setScheduleOpen(true);}} className="min-h-11 rounded-xl">Lihat Jadwal Barang</Button></div>
          <p id="loan-timezone" className="text-sm text-slate-600">Tanggal dan jam dalam WIB — Asia/Jakarta (UTC+07:00), bukan zona perangkat. Pilih periode di bawah; Lihat Jadwal Barang hanya membaca alokasi, tidak memilih tanggal pengajuan.</p>
          <LoanPeriodPicker start={draft.start} end={draft.end} disabled={locked} onChange={(start,end)=>{onDraftChange({...draft,start,end});setErrors({});setError('');}} />
          <div className="grid sm:grid-cols-2 gap-5 min-w-0">
            {([{key:'start',label:'Tanggal dan waktu mulai',errorKey:'startsAt'},{key:'end',label:'Tanggal dan waktu kembali',errorKey:'endsAt'}] as const).map(field=><div key={field.key} className="min-w-0">
              <label htmlFor={`loan-${field.key}`} className="block text-sm font-semibold mb-2">{field.label} (WIB)</label>
              <Input id={`loan-${field.key}`} type="datetime-local" step="60" required disabled={locked} value={draft[field.key]} onChange={event=>edit(field.key,event.target.value)} aria-invalid={!!errors[field.errorKey]} aria-describedby={`loan-timezone${errors[field.errorKey]?` loan-error-${field.errorKey}`:''}`} className="min-h-12 max-w-full rounded-xl text-base" />{fieldError(field.errorKey)}
            </div>)}
          </div>
        </section>
        <section className="sl-form-section space-y-2 text-sm"><h2 className="font-bold text-lg">D. Dokumen pendukung</h2><p>Upload belum tersedia (BLOCKED). Kebijakan dokumen, pemeriksaan konten, penyimpanan privat dan retensi belum disahkan. Jangan mengirim dokumen identitas melalui keperluan peminjaman.</p></section>
        <section className="sl-form-section space-y-2 text-sm"><h2 className="font-bold text-lg">E. Informasi sebelum mengirim</h2><p>Ketersediaan belum diverifikasi. Pengajuan berstatus awal menunggu pemeriksaan Admin, bukan reservasi atau persetujuan. Stok total tidak dikurangi.</p><PolicyDocument />
          <label className="flex items-start gap-3"><input id="loan-acknowledgement" type="checkbox" checked={details.acknowledgement.accepted} disabled={locked||!options.additionalFields} onChange={event=>{onDraftChange({...draft,details:{...details,acknowledgement:{version:ACKNOWLEDGEMENT_VERSION,accepted:event.target.checked}}});setErrors({});}} className="mt-1 h-5 w-5 shrink-0" aria-describedby="acknowledgement-note" /><span>{ACKNOWLEDGEMENT_TEXT}</span></label>
          <p id="acknowledgement-note" className="text-xs text-slate-600">{options.additionalFields?'Konfirmasi informatif versi submission-info-v1 dicatat backend bersama pengajuan; bukan persetujuan legal.':'Pencatatan konfirmasi informatif belum aktif tanpa schema pendamping. Tidak diwajibkan pada kontrak form dasar existing.'}</p>{fieldError('acknowledgement')}{fieldError('details')}
        </section>
        <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2" aria-label="Ringkasan jadwal"><p>Mulai: {campusTime(preview.startsAt)}</p><p>Kembali: {campusTime(preview.endsAt)}</p><p>Keputusan awal: Menunggu Persetujuan</p></div>
        {fieldError('form')}
        {error&&<div role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl text-sm break-words">{error} Keranjang dan draft tidak dihapus. {draft.attempt&&'Hasil belum dikonfirmasi. Retry memakai kunci dan data yang sama; periksa Peminjaman Saya jika ragu.'}</div>}
        {draft.attempt&&!loading&&<p className="text-sm text-slate-600">Data pengiriman dikunci untuk mencegah duplikasi saat retry. Perubahan Keranjang tidak mengubah request yang sedang dicoba ulang.</p>}
        {!valid&&<p className="text-sm text-slate-600">Lengkapi keperluan, barang dan periode yang valid untuk mengirim pengajuan.</p>}
        <div className="flex flex-wrap gap-3">
          <Button id="loan-submit" type="submit" disabled={loading||!valid} className="min-h-12 rounded-xl bg-[#BE1E2D] text-white whitespace-normal">{loading?'Mengirim pengajuan...':draft.attempt?'Coba Kirim Lagi dengan Aman':'Kirim Pengajuan'}</Button>
          <Button type="button" variant="outline" onClick={onHistory} className="min-h-12 rounded-xl whitespace-normal">Peminjaman Saya</Button>
          <Button type="button" variant="outline" disabled={locked} onClick={event=>{cancelTrigger.current=event.currentTarget;setCancelOpen(true);}} className="min-h-12 rounded-xl">Batalkan Draft</Button>
        </div>
      </form>
    </div>
    <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();scheduleTrigger.current?.focus({preventScroll:true});}} className="bg-white rounded-2xl p-4 sm:p-6 overflow-y-auto" style={{width:'min(1040px, calc(100vw - 32px))',maxWidth:'none',maxHeight:'calc(100dvh - 32px)'}}><DialogHeader><DialogTitle>Jadwal alokasi barang</DialogTitle><DialogDescription>Hanya-baca, bukan kalender pemilihan tanggal atau jaminan stok tersedia.</DialogDescription></DialogHeader>
      {scheduleOpen&&(schedule?<BookingSchedule {...schedule} />:<ScheduleContainer items={items} initialItemId={chosen[0]?.itemId} initialMonth={civilDate(draft.start)??undefined} />)}
      <Button type="button" variant="outline" onClick={()=>setScheduleOpen(false)} className="min-h-11">Tutup Jadwal</Button>
    </DialogContent></Dialog>
    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}><DialogContent onCloseAutoFocus={event=>{event.preventDefault();cancelTrigger.current?.focus({preventScroll:true});}} className="bg-white rounded-2xl p-5" style={{width:'min(520px, calc(100vw - 32px))',maxWidth:'none'}}><DialogHeader><DialogTitle>Batalkan draft form?</DialogTitle><DialogDescription>Isian form akan dikosongkan. Barang di Keranjang tetap ada. Ini tidak membatalkan atau menghapus pengajuan yang sudah tersimpan.</DialogDescription></DialogHeader><Button type="button" variant="outline" onClick={()=>setCancelOpen(false)}>Lanjut Mengisi</Button><Button type="button" onClick={()=>{if(locked)return;onDraftChange(emptyLoanDraft());setErrors({});setError('');setCancelOpen(false);onBack();}}>Kosongkan Draft Form</Button></DialogContent></Dialog>
  </section>;
}
