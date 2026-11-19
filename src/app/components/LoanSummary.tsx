import type { ReactNode } from 'react';
import type { SavedLoan } from '../api';
import { LoanFormDetails } from './LoanFormDetails';

export const loanStatusLabels: Record<SavedLoan['status'],string> = {
  menunggu:'Menunggu Persetujuan',disetujui:'Disetujui',ditolak:'Ditolak',dipinjam:'Dipinjam',selesai:'Selesai',dibatalkan:'Dibatalkan',
};
export function campusTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Tidak tercatat';
  // Record baru selalu UTC ISO. Record legacy tidak diklaim memiliki zona pasti.
  if (!value.endsWith('Z')) return `${value} (zona waktu data lama belum terverifikasi)`;
  return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' WIB';
}
export function LoanNotice() {
  return <p role="note" className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950">Ketersediaan belum diverifikasi. Pengajuan memerlukan persetujuan Admin dan belum berarti barang telah dipesan, disetujui, atau disediakan. Stok total tidak dikurangi.</p>;
}
export function LoanPage({title,children}: {title:string;children:ReactNode}) {
  return <section className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-5 min-w-0 break-words">
    <h1 className="text-2xl font-bold text-[#9A1823]" tabIndex={-1}>{title}</h1>{children}
  </section>;
}
export function LoanSummary({loan}: {loan:SavedLoan}) {
  return <article data-loan-receipt={loan.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 min-w-0">
    <div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold text-lg">{loan.number}</h2><span className="text-sm font-semibold rounded-full px-3 py-1 bg-amber-50 text-amber-950">{loanStatusLabels[loan.status]}</span></div>
    <dl className="grid sm:grid-cols-2 gap-4 text-sm min-w-0">
      <div><dt className="text-slate-600">Peminjam</dt><dd className="font-semibold">{loan.borrower.name}</dd><dd className="break-all">{loan.borrower.email}</dd></div>
      <div><dt className="text-slate-600">Tanggal pengajuan</dt><dd>{campusTime(loan.createdAt)}</dd></div>
      <div><dt className="text-slate-600">Mulai peminjaman</dt><dd>{campusTime(loan.startsAt)}</dd></div>
      <div><dt className="text-slate-600">Rencana pengembalian</dt><dd>{campusTime(loan.endsAt)}</dd></div>
      <div className="sm:col-span-2"><dt className="text-slate-600">Keperluan</dt><dd className="whitespace-pre-wrap break-words">{loan.reason}</dd></div>
    </dl>
    <ul className="divide-y divide-slate-100">{loan.items.map(item=><li key={item.itemId} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
      <div className="min-w-0"><p className="font-semibold break-words">{item.name}</p><p className="text-xs text-slate-600">{item.code}</p></div><p>{item.quantity} {item.unit}</p>
    </li>)}</ul>
    <p className="text-sm font-semibold">{loan.totalTypes} jenis barang · {loan.totalUnits} unit barang</p>
    <LoanFormDetails details={loan.details} />
  </article>;
}
