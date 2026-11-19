import { useEffect, useState } from 'react';
import type { User } from '../types';
import { getAdminLoans, getAdminLoanStats, getAdminLoan, getAdminReadiness, type AdminLoan, type DecisionReadiness, type SavedLoan } from '../api';
import { ReadOnlyAdminDashboard } from '../screens/AdminDashboard';
import type { AdminOverview, RemoteView } from '../components/loans/view-contracts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { campusTime, loanStatusLabels } from '../components/LoanSummary';
import { toast } from 'sonner';
import { LoanFormDetails } from '../components/LoanFormDetails';

const blockers:Record<string,string>={capacity_baseline_unverified:'Baseline stok layak pinjam belum diverifikasi.',facility_allocation_policy_unresolved:'Kebijakan alokasi fasilitas ruangan belum disepakati.',return_reconciliation_unverified:'Kondisi dan pengembalian belum direkonsiliasi.',allocation_completeness_unverified:'Kelengkapan alokasi belum terbukti.',legacy_time_zone_unverified:'Zona waktu transaksi legacy belum diverifikasi.',atomic_allocation_contract_missing:'Kontrak alokasi atomik belum diterapkan.',decision_audit_contract_missing:'Kontrak audit keputusan belum diterapkan.'};
export function AdminDashboardContainer({user,onLogout,onBrowse}: {user:User;onLogout:()=>void;onBrowse:()=>void}) {
  const [status,setStatus]=useState('all'),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
  const key=`${status}:${offset}:${retry}`;
  const [state,setState]=useState<{key:string;view:RemoteView<AdminOverview>}>({key:'',view:{state:'loading'}});
  const [gates,setGates]=useState<DecisionReadiness|null>(null);
  const [selected,setSelected]=useState<number|null>(null),[detailRetry,setDetailRetry]=useState(0);
  const detailKey=`${selected}:${detailRetry}`;
  const [detail,setDetail]=useState<{key:string;view:RemoteView<AdminLoan>}>({key:'',view:{state:'loading'}});
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    const filter=status==='all'?{}:{status:status as SavedLoan['status']};
    setState({key,view:{state:'loading'}});setGates(null);
    Promise.all([getAdminLoans(filter,10,offset,controller.signal),getAdminLoanStats(filter,controller.signal),getAdminReadiness(controller.signal)]).then(([list,stats,decisions])=>{
      if(!active)return;
      setGates(decisions);
      setState({key,view:{state:'ready',data:{statistics:{total:stats.total,waiting:stats.byStatus.menunggu,approved:stats.byStatus.disetujui,active:stats.byStatus.dipinjam,completed:stats.byStatus.selesai,rejected:stats.byStatus.ditolak,cancelled:stats.byStatus.dibatalkan},requests:list.loans.map(loan=>({id:loan.id,number:loan.number,borrowerName:loan.borrower.name,startsAt:loan.startsAt,endsAt:loan.endsAt,status:loan.status,reason:loan.reason,itemSummary:[...loan.items.map(item=>`${item.code} · ${item.name}: ${item.quantity} ${item.unit}`),...(loan.room?[`${loan.room.code} · ${loan.room.name}: ${loan.room.participants} peserta`]:[])].join('; ')||'Tidak ada detail barang atau ruangan',createdAt:loan.createdAt,totalTypes:loan.totalTypes,totalUnits:loan.totalUnits})),pagination:list.pagination,asOf:stats.asOf}}});
    }).catch(failure=>{if(active)setState({key,view:{state:'error',message:failure instanceof Error?failure.message:'Data Admin gagal dimuat.'}});});
    return()=>{active=false;controller.abort();};
  },[key]);
  useEffect(()=>{
    if(selected===null)return;
    const controller=new AbortController();let active=true;
    setDetail({key:detailKey,view:{state:'loading'}});
    getAdminLoan(selected,controller.signal).then(data=>{if(active){setDetail({key:detailKey,view:{state:'ready',data:data.loan}});setGates(data.decisions);}}).catch(failure=>{if(active)setDetail({key:detailKey,view:{state:'error',message:failure instanceof Error?failure.message:'Detail gagal dimuat.'}});});
    return()=>{active=false;controller.abort();};
  },[detailKey]);
  const detailView=detail.key===detailKey?detail.view:{state:'loading' as const};
  return <>
    <ReadOnlyAdminDashboard user={user} onLogout={onLogout} onBrowse={onBrowse} source={state.key===key?state.view:{state:'loading'}} filterStatus={status} onStatusChange={value=>{setStatus(value);setOffset(0);}} onPageChange={setOffset} onDetail={id=>{toast.dismiss();setSelected(id);}} onRetry={()=>setRetry(value=>value+1)} />
    <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-6 text-sm space-y-2" aria-label="Prasyarat keputusan Admin"><h2 className="font-bold">Approval dan penolakan: BLOCKED</h2><p>Belum ada aksi perubahan status. Stok total tidak berubah.</p>{gates&&<ul className="list-disc pl-5">{[...new Set([...gates.approval.blockers,...gates.rejection.blockers])].map(code=><li key={code}>{blockers[code]??code}</li>)}</ul>}</section>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="bg-white rounded-2xl p-5 overflow-y-auto" style={{width:'min(760px, calc(100vw - 32px))',maxWidth:'none',maxHeight:'calc(100dvh - 32px)',overflowWrap:'anywhere'}} onOpenAutoFocus={event=>{event.preventDefault();document.querySelector<HTMLElement>('[data-admin-detail-title]')?.focus({preventScroll:true});}}>
      <DialogHeader><DialogTitle tabIndex={-1} data-admin-detail-title>Detail Pengajuan Admin</DialogTitle><DialogDescription>Informasi dari database, hanya untuk Admin. Tidak ada perubahan status.</DialogDescription></DialogHeader>
      {detailView.state==='loading'&&<p role="status">Memuat detail...</p>}
      {detailView.state==='error'&&<div role="alert"><p>{detailView.message}</p><button type="button" onClick={()=>setDetailRetry(value=>value+1)} className="underline min-h-11">Coba Muat Detail Lagi</button></div>}
      {detailView.state==='ready'&&<article data-admin-receipt={detailView.data.id} className="space-y-4 text-sm">
        <h3 className="font-bold text-lg">{detailView.data.number}</h3><p>{loanStatusLabels[detailView.data.status]}</p>
        <p>{detailView.data.borrower.name} · {detailView.data.borrower.email}</p><p>Diajukan: {campusTime(detailView.data.createdAt)}</p>
        <p>{campusTime(detailView.data.startsAt)} → {campusTime(detailView.data.endsAt)}</p><p className="whitespace-pre-wrap">Keperluan: {detailView.data.reason}</p>
        <ul className="divide-y">{detailView.data.items.map(item=><li key={item.itemId} className="py-3">{item.code} — {item.name}: {item.quantity} {item.unit}</li>)}</ul>
        <p>{detailView.data.totalTypes} jenis barang · {detailView.data.totalUnits} unit barang</p>
        {detailView.data.room&&<p>Ruangan: {detailView.data.room.name} · {detailView.data.room.participants} peserta</p>}
        <p>Admin tercatat: {detailView.data.admin?.name??'Belum tercatat'}. Riwayat keputusan rinci belum tersedia; tidak mengarang waktu atau alasan keputusan.</p>
        <LoanFormDetails details={detailView.data.details} />
      </article>}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-3">
        <p>Ketersediaan: <strong>Belum Diverifikasi</strong>.</p>
        <p id="admin-detail-decisions-blocked">Approval dan rejection: <strong>BLOCKED</strong>. Baseline kapasitas dan audit keputusan belum siap. Tidak ada perubahan status atau stok.</p>
        <div className="flex flex-wrap gap-3"><button type="button" disabled aria-describedby="admin-detail-decisions-blocked" className="min-h-11 px-4 rounded-xl border border-slate-300 text-slate-600 cursor-not-allowed">Setujui</button><button type="button" disabled aria-describedby="admin-detail-decisions-blocked" className="min-h-11 px-4 rounded-xl border border-slate-300 text-slate-600 cursor-not-allowed">Tolak</button></div>
      </div>
      <button type="button" onClick={()=>setSelected(null)} className="border border-slate-300 rounded-xl px-4 min-h-11 font-semibold">Tutup Detail Admin</button>
    </DialogContent></Dialog>
  </>;
}
