import { useState } from 'react';
import { CampusCalendar } from './CampusCalendar';
import { jakartaToday, overlapsJakartaDay } from './calendar-dates.mjs';
import { RemoteViewNotice } from './RemoteViewNotice';
import type { BookingScheduleProps } from './view-contracts';

export const bookingStatus = {menunggu:'Menunggu',disetujui:'Disetujui',ditolak:'Ditolak',dipinjam:'Dipinjam',selesai:'Selesai',dibatalkan:'Dibatalkan'};
export function BookingStatus({status}: {status: keyof typeof bookingStatus}) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status==='menunggu'?'bg-amber-50 text-amber-900':status==='ditolak'||status==='dibatalkan'?'bg-red-50 text-red-800':'bg-slate-100 text-slate-800'}`}>{bookingStatus[status]}</span>;
}
const format = (value:string) => new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export function BookingSchedule({source={state:'unconnected'},initialMonth,onMonthChange,onRetry,allocation,month}: BookingScheduleProps) {
  const [day,setDay] = useState(()=>initialMonth??month??jakartaToday());
  const remote=allocation ?? source;
  const segments=allocation?.state==='ready'?allocation.data.segments:[];
  const selectedSegments=segments.filter(segment=>overlapsJakartaDay(segment,day));
  const entries = source.state==='ready' ? source.data : [];
  const selected = entries.filter(entry=>overlapsJakartaDay(entry,day));
  return <section aria-label="Kalender Jadwal Peminjaman" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 min-w-0">
    <div><h2 className="font-bold text-lg">Kalender Jadwal Peminjaman</h2><p className="text-sm text-slate-600 mt-1">{allocation?'Alokasi agregat, bukan transaksi individual':'Tanggal dan status booking'} · Asia/Jakarta (WIB), hanya-baca.</p></div>
    <RemoteViewNotice source={remote} onRetry={onRetry} />
    {allocation && <p role="note" className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950">Ketersediaan: Belum diverifikasi. Pengajuan menunggu tidak termasuk alokasi. Jadwal kosong bukan bukti barang tersedia.</p>}
    <div className="grid md:grid-cols-2 gap-5 min-w-0">
      <div><CampusCalendar mode="single" selected={day} onSelect={next=>{if(next){setDay(next);if(month&&(next.getMonth()!==month.getMonth()||next.getFullYear()!==month.getFullYear()))onMonthChange?.(next);}}} defaultMonth={initialMonth} month={month} onMonthChange={next=>{setDay(new Date(next.getFullYear(),next.getMonth(),1,12));onMonthChange?.(next);}} modifiers={{'has-bookings':date=>(allocation?segments:entries).some(entry=>overlapsJakartaDay(entry,date))}} modifiersClassNames={{'has-bookings':'has-bookings'}} />
        <p className="text-xs text-slate-600 mt-3">Titik menandai {allocation?'alokasi agregat':'booking'} dari data yang dimuat, bukan stok tersedia.</p></div>
      <div aria-live="polite" className="min-w-0">
        <h3 className="text-sm font-semibold mb-3">{new Intl.DateTimeFormat('id-ID',{dateStyle:'full'}).format(day)}</h3>
        {allocation ? allocation.state==='ready' ? selectedSegments.length ? <><p className="text-sm mb-3">Puncak alokasi tercatat pada hari ini: <strong data-recorded-peak>{Math.max(...selectedSegments.map(segment=>segment.recordedQuantity))}</strong> {allocation.data.resource.type==='room'?'ruang':allocation.data.resource.unit}. Bukan jumlah tersedia.</p><ul className="space-y-3">{selectedSegments.map(segment=><li data-allocation-segment key={segment.startsAt} className="border border-slate-200 rounded-xl p-3 text-sm space-y-2"><p className="font-semibold">Alokasi tercatat (gabungan disetujui/dipinjam)</p><p>{format(segment.startsAt)} – {format(segment.endsAt)} WIB</p><p>{segment.recordedQuantity} {allocation.data.resource.type==='room'?'ruang':allocation.data.resource.unit} tercatat bersamaan</p></li>)}</ul></> : <p className="text-sm text-slate-600">Tidak ada alokasi tercatat pada tanggal ini. Ketersediaan belum diverifikasi.</p> : <p className="text-sm text-slate-600">Alokasi belum dapat ditampilkan. Bukan berarti tidak ada pemakaian.</p> : source.state==='ready' ? selected.length ? <ul className="space-y-3">{selected.map(entry=><li key={entry.id} className="border border-slate-200 rounded-xl p-3 space-y-2 text-sm break-words">
          <p className="font-semibold">{entry.label}</p><BookingStatus status={entry.status} /><p>{format(entry.startsAt)} – {format(entry.endsAt)} WIB</p><p className="text-xs text-slate-600">{entry.verification==='verified'?'Verifikasi tercatat oleh backend':'Belum diverifikasi'} · bukan jaminan ketersediaan</p>
        </li>)}</ul> : <p className="text-sm text-slate-600">Tidak ada booking pada tanggal ini dalam data yang dimuat. Ketersediaan tetap perlu verifikasi.</p> : <p className="text-sm text-slate-600">Daftar booking belum dapat ditampilkan. Pilihan tanggal tidak memeriksa ketersediaan.</p>}
      </div>
    </div>
    {allocation?.state==='ready' && <div className="text-xs text-slate-600 space-y-2"><details><summary className="cursor-pointer min-h-11 font-semibold">Batas data dan rekonsiliasi</summary><div className="space-y-2"><p>Dipinjam dan belum direkonsiliasi (semua periode): {allocation.data.borrowedQuantityPendingReconciliation} {allocation.data.resource.type==='room'?'ruang':allocation.data.resource.unit}. Lewat rencana kembali bukan bukti pengembalian.</p><p>Angka tersedia masih null. Hanya detail alokasi langsung; fasilitas ruangan belum digabung. Timestamp legacy dibaca sebagai UTC oleh SQLite, zona asalnya belum terverifikasi. Tidak boleh menjadi dasar persetujuan.</p></div></details><p>Pembacaan backend: {format(allocation.data.asOf)} WIB. Bagian rentang dapat berasal dari snapshot baca terpisah.</p></div>}
  </section>;
}
