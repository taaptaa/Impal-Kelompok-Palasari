import { useState } from 'react';
import { BookingStatus, bookingStatus } from './BookingSchedule';
import { RemoteViewNotice } from './RemoteViewNotice';
import type { AdminRequestsPanelProps } from './view-contracts';
import { campusTime } from '../LoanSummary';

export function AdminRequestsPanel({source={state:'unconnected'},onRetry,filterStatus,onStatusChange,onPageChange,onDetail}: AdminRequestsPanelProps) {
  const [query,setQuery] = useState('');
  const [status,setStatus] = useState('all');
  const overview = source.state==='ready' ? source.data : null;
  const activeStatus=filterStatus??status;
  const rows = overview?.requests.filter(row=>(activeStatus==='all'||row.status===activeStatus) && `${row.number} ${row.borrowerName} ${row.itemSummary}`.toLocaleLowerCase('id').includes(query.trim().toLocaleLowerCase('id'))) ?? [];
  return <section aria-label="Pengajuan dan statistik Admin" className="space-y-5">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{([{key:'total',label:'Total Peminjaman'},{key:'waiting',label:'Menunggu Persetujuan'},{key:'approved',label:'Disetujui'},{key:'active',label:'Sedang Dipinjam'},{key:'completed',label:'Selesai'},{key:'rejected',label:'Ditolak'},{key:'cancelled',label:'Dibatalkan'}] as const).map(stat=><div key={stat.key} data-admin-stat={stat.key} className="bg-white border border-slate-200 rounded-xl p-4"><p className="text-xs text-slate-600">{stat.label}</p><strong className="block text-2xl font-bold mt-2" aria-label={overview?.statistics[stat.key]==null?'Data belum dapat dibaca':undefined}>{overview?.statistics[stat.key] ?? '—'}</strong></div>)}</div>
    <p className="text-xs text-slate-600">Statistik mengikuti filter status, hanya dari agregat API, bukan jumlah daftar pada halaman ini. Angka — berarti data belum dapat dibaca, bukan nol.</p>
    <p className="text-sm text-slate-600">Stok Kritis: <strong>—</strong> · Belum diverifikasi; baseline kapasitas dan ambang stok kritis belum disepakati.</p>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Daftar Pengajuan</h2>{onRetry&&<button type="button" onClick={onRetry} disabled={source.state==='loading'} className="border border-slate-300 rounded-xl px-4 min-h-11 text-sm font-semibold disabled:opacity-50 focus-visible:outline-2">Muat Ulang Pengajuan</button>}</div>
      <p className="text-sm text-slate-600">Mode hanya-baca. Aksi setujui, tolak, serta pengelolaan inventaris dinonaktifkan sampai backend aman dan kontraknya disepakati.</p>
      <RemoteViewNotice source={source} onRetry={onRetry} />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm font-semibold">Cari pada halaman ini<input aria-label="Cari pengajuan" value={query} onChange={e=>setQuery(e.target.value)} disabled={!overview} placeholder="Nomor, peminjam, atau barang" className="mt-2 w-full border border-slate-300 rounded-xl px-3 min-h-11 font-normal focus-visible:outline-2 focus-visible:outline-[#BE1E2D] disabled:opacity-50" /></label>
        <label className="text-sm font-semibold">Status pengajuan<select aria-label="Status pengajuan" value={activeStatus} onChange={e=>{setQuery('');onStatusChange?onStatusChange(e.target.value):setStatus(e.target.value);}} className="mt-2 w-full border border-slate-300 rounded-xl px-3 min-h-11 font-normal focus-visible:outline-2 focus-visible:outline-[#BE1E2D]"><option value="all">Semua status</option>{Object.entries(bookingStatus).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      {overview && (rows.length ? <ul className="space-y-3">{rows.map(row=><li key={row.id} data-admin-request={row.id} className="rounded-xl border border-slate-200 p-4 text-sm space-y-3 break-words">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{row.number}</h3><BookingStatus status={row.status} /></div>
         <p className="font-semibold">{row.borrowerName}</p><p>{row.itemSummary}</p><p className="text-slate-600">{campusTime(row.startsAt)} – {campusTime(row.endsAt)}</p><p>Keperluan: {row.reason}</p>
         {row.createdAt!==undefined && <p>Diajukan: {campusTime(row.createdAt)}</p>}
         {row.totalTypes!==undefined && <p>{row.totalTypes} jenis barang · {row.totalUnits} unit barang</p>}
         {onDetail && <button type="button" data-admin-detail={row.id} onClick={()=>onDetail(row.id)} className="min-h-11 rounded-xl px-4 border border-slate-300 font-semibold mr-2 focus-visible:outline-2">Detail {row.number}</button>}
         <button type="button" disabled aria-describedby="admin-approval-blocked" className="min-h-11 rounded-xl px-4 bg-slate-100 text-slate-500 cursor-not-allowed">Setujui</button>
         <button type="button" disabled aria-describedby="admin-approval-blocked" className="min-h-11 rounded-xl px-4 bg-slate-100 text-slate-500 cursor-not-allowed ml-2">Tolak</button>
      </li>)}</ul> : <p role="status" className="text-sm text-slate-600 py-4">{overview.requests.length ? 'Tidak ada pengajuan yang cocok dengan filter.' : 'Belum ada pengajuan dalam data yang dimuat.'}</p>)}
       <p id="admin-approval-blocked" className="text-xs text-slate-600">Approval dan rejection: BLOCKED. UI ini tidak mengirim perubahan status atau mengurangi stok. Ketersediaan: Belum Diverifikasi.</p>
       {overview?.pagination && <div className="flex flex-wrap gap-3 items-center text-sm" aria-label="Halaman pengajuan"><p data-admin-pagination>{overview.pagination.total} pengajuan sesuai filter · halaman {Math.floor(overview.pagination.offset/overview.pagination.limit)+1}</p><button type="button" onClick={()=>{setQuery('');onPageChange?.(Math.max(0,overview.pagination!.offset-overview.pagination!.limit));}} disabled={!onPageChange||overview.pagination.offset===0} className="border rounded-lg px-3 min-h-11 disabled:opacity-40">Halaman Sebelumnya</button><button type="button" onClick={()=>{setQuery('');onPageChange?.(overview.pagination!.offset+overview.pagination!.limit);}} disabled={!onPageChange||!overview.pagination.hasMore} className="border rounded-lg px-3 min-h-11 disabled:opacity-40">Halaman Berikutnya</button></div>}
       {overview?.asOf && <p className="text-xs text-slate-600">Statistik dibaca {campusTime(overview.asOf)}. Daftar dan statistik adalah snapshot request terpisah, bukan verifikasi kapasitas.</p>}
    </div>
  </section>;
}
