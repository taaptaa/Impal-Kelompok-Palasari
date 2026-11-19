import { useEffect, useState } from 'react';
import { getSchedule, type CatalogItem, type SchedulePeriod, type ScheduleResponse } from '../api';
import { BookingSchedule } from '../components/loans/BookingSchedule';
import { jakartaToday, civilKey } from '../components/loans/calendar-dates.mjs';
import { jakartaToUtc } from '../loan-validation.mjs';
import type { RemoteView } from '../components/loans/view-contracts';

export function calendarWindow(month:Date):SchedulePeriod {
  const start=new Date(2000,0,1,12);start.setFullYear(month.getFullYear(),month.getMonth(),1);
  start.setDate(start.getDate()-(start.getDay()+6)%7);
  const end=new Date(start);end.setDate(end.getDate()+42);
  return {startsAt:jakartaToUtc(civilKey(start)+'T00:00'),endsAt:jakartaToUtc(civilKey(end)+'T00:00')};
}
export function ScheduleContainer({items,loading=false,error='',initialItemId,initialMonth}: {items:CatalogItem[];loading?:boolean;error?:string;initialItemId?:number;initialMonth?:Date}) {
  const [chosenId,setChosenId]=useState(initialItemId??0);
  const itemId=items.some(item=>item.id_barang===chosenId)?chosenId:items[0]?.id_barang;
  const [month,setMonth]=useState(()=>initialMonth??jakartaToday());
  const [retry,setRetry]=useState(0);
  const period=calendarWindow(month);
  const key=`${itemId}:${period.startsAt}:${period.endsAt}:${retry}`;
  const [state,setState]=useState<{key:string;view:RemoteView<ScheduleResponse>}>({key:'',view:{state:'loading'}});
  useEffect(()=>{
    if(!itemId)return;
    const controller=new AbortController();let active=true;
    setState({key,view:{state:'loading'}});
    getSchedule({type:'item',id:itemId},period,controller.signal).then(data=>{if(active)setState({key,view:{state:'ready',data}});}).catch(failure=>{if(active)setState({key,view:{state:'error',message:failure instanceof Error?failure.message:'Jadwal gagal dimuat.'}});});
    return()=>{active=false;controller.abort();};
  },[key]);
  if(loading)return <p role="status">Memuat pilihan barang untuk jadwal...</p>;
  if(error)return <p role="alert">Katalog jadwal gagal dimuat: {error}</p>;
  if(!itemId)return <p className="p-5 rounded-xl bg-white">Belum ada barang untuk dipilih. Ketersediaan belum diverifikasi.</p>;
  return <div className="space-y-4 min-w-0" data-connected-schedule>
    <label className="block text-sm font-semibold">Barang pada jadwal<select id="schedule-item" value={itemId} onChange={event=>setChosenId(Number(event.target.value))} className="block mt-2 w-full min-w-0 max-w-full rounded-xl border border-slate-300 min-h-12 px-3 bg-white">{items.map(item=><option key={item.id_barang} value={item.id_barang}>{item.nama_barang} — {item.kode_barang}</option>)}</select></label>
    <button type="button" onClick={()=>setRetry(value=>value+1)} disabled={state.key!==key||state.view.state==='loading'} className="border border-slate-300 rounded-xl px-4 min-h-11 bg-white text-sm font-semibold disabled:opacity-50 focus-visible:outline-2">Muat Ulang Jadwal</button>
    <BookingSchedule allocation={state.key===key?state.view:{state:'loading'}} month={month} onMonthChange={setMonth} onRetry={()=>setRetry(value=>value+1)} />
  </div>;
}
