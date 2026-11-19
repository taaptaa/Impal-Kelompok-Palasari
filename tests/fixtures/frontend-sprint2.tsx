// Synthetic, isolated component fixtures. Never imported by the application.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { LoanFormScreen, emptyLoanDraft } from '../../src/app/screens/LoanFormScreen';
import { BookingSchedule } from '../../src/app/components/loans/BookingSchedule';
import { AdminRequestsPanel } from '../../src/app/components/loans/AdminRequestsPanel';
import { CatalogScreen } from '../../src/app/screens/CatalogScreen';
import { InventoryVisual } from '../../src/app/components/InventoryVisual';
import type { AdminOverview, RemoteView, ScheduleEntry } from '../../src/app/components/loans/view-contracts';
import { legacyFormOptions } from '../../src/app/api';

const user = {id:'test-only',name:'UJI KOMPONEN',email:'fixture@example.test',role:'student' as const};
const names = ['Proyektor','Kabel HDMI','Speaker Portable','Mikrofon Wireless','Kursi Lipat','Meja Lipat','Tripod','Kamera','Kabel Roll','Pointer Presentasi','Whiteboard Portable','Extension HDMI'];
const codes=['UJI-PRJ-01','UJI-HDM-01','UJI-SPK-01','UJI-MIC-01','UJI-KRS-01','UJI-MJL-01','UJI-TRP-01','UJI-KMR-01','UJI-KRL-01','UJI-PTR-01','UJI-WBD-01','UJI-HDX-01'];
const items=names.map((name,index)=>({id_barang:index+1,kode_barang:codes[index],nama_barang:`${name} (Uji)`,jenis:'portabel' as const,satuan:'unit',stok_total:1}));
const statuses=['menunggu','disetujui','ditolak','dipinjam','selesai','dibatalkan'] as const;
const entries: ScheduleEntry[]=statuses.map((status,index)=>({id:`fixture-${index}`,label:`UJI KOMPONEN ${status}`,startsAt:'2030-12-31T16:30:00.000Z',endsAt:'2030-12-31T18:00:00.000Z',status,verification:'unverified'}));
const admin: AdminOverview={statistics:{total:26,waiting:8,active:null,completed:0},requests:entries.map((entry,index)=>({id:index+1,number:entry.id,borrowerName:'UJI KOMPONEN',startsAt:entry.startsAt,endsAt:entry.endsAt,status:entry.status,itemSummary:'Ilustrasi pengajuan sintetis',reason:'Fixture komponen, bukan transaksi'}))};
function Fixture() {
  const [view,setView]=useState('form');
  const [state,setState]=useState('unconnected');
  const [draft,setDraft]=useState(emptyLoanDraft);
  const source=<T,>(data:T):RemoteView<T>=>state==='ready'?{state:'ready',data}:state==='empty'?{state:'ready',data:(Array.isArray(data)?[]:{...admin,requests:[]}) as T}:state==='error'?{state:'error',message:'Gangguan fixture'}:state==='loading'?{state:'loading'}:{state:'unconnected'};
  return <><div style={{padding:16,display:'flex',flexWrap:'wrap',gap:12}}>{['form','schedule','admin','public','student','fallback'].map(name=><button key={name} onClick={()=>setView(name)}>{name}</button>)}{['unconnected','loading','error','empty','ready'].map(name=><button key={name} onClick={()=>setState(name)}>{name}</button>)}</div>
    {view==='form'&&<LoanFormScreen user={user} items={items} plan={{1:1}} draft={draft} onDraftChange={setDraft} onBack={()=>{}} onHistory={()=>{}} onSuccess={()=>{throw Error('Fixture must never submit');}} schedule={{source:{state:'unconnected'}}} formOptions={legacyFormOptions} />}
    <div style={{maxWidth:1000,margin:'auto',padding:16}}>
      {view==='schedule'&&<BookingSchedule source={source(entries)} initialMonth={new Date(2030,11,1)} onRetry={()=>setState('ready')} />}
      {view==='admin'&&<AdminRequestsPanel source={source(admin)} onRetry={()=>setState('ready')} />}
      {view==='fallback'&&<InventoryVisual name="Barang tidak dikenal" className="h-40" />}
    </div>
    {(view==='public'||view==='student')&&<CatalogScreen items={items} loading={false} error="" plan={{}} onPlanChange={()=>{}} onBack={()=>setView('form')} accessMode={view==='public'?'public':'authenticated'} onApply={view==='student'?()=>setView('form'):undefined} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
