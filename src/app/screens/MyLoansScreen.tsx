import { useEffect, useState } from 'react';
import { getLoan, getMyLoans, type SavedLoan } from '../api';
import { Button } from '../components/ui/button';
import { campusTime, LoanNotice, LoanPage, LoanSummary, loanStatusLabels } from '../components/LoanSummary';

export function MyLoansScreen({selectedId,onSelect,onBack,confirmation}: {selectedId:number|null;onSelect:(id:number|null)=>void;onBack:()=>void;confirmation?:SavedLoan|null}) {
  const [data,setData] = useState<SavedLoan[]>([]);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [attempt,setAttempt] = useState(0);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setData([]);
    (selectedId===null?getMyLoans():getLoan(selectedId).then(loan=>[loan])).then(loans=>{if(active)setData(loans);}).catch(failure=>{if(active)setError(failure instanceof Error?failure.message:'Pengajuan gagal dimuat.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[selectedId,attempt]);
  // Konfirmasi berasal langsung dari respons POST setelah commit, bukan data mock.
  const receipt = confirmation?.id===selectedId ? confirmation : null;
  return <LoanPage title={receipt?'Pengajuan Berhasil Dikirim':selectedId===null?'Peminjaman Saya':'Detail Pengajuan'}>
    <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={onBack}>Kembali ke Katalog</Button>{selectedId!==null&&<Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={()=>onSelect(null)}>Lihat Semua Pengajuan</Button>}</div>
    {receipt && <p role="status" className="bg-green-50 text-green-900 border border-green-200 rounded-xl p-4 text-sm">Pengajuan berhasil dikirim dan menunggu pemeriksaan Admin. Pengajuan belum berarti barang telah disetujui atau disediakan.</p>}
    <LoanNotice />
    {receipt && <LoanSummary loan={receipt} />}
    {loading && <p role="status">Memuat pengajuan dari database...</p>}
    {error && <div role="alert" className="bg-red-50 text-red-800 p-4 rounded-xl space-y-3"><p>{error}</p><Button type="button" variant="outline" onClick={()=>setAttempt(value=>value+1)}>Coba Muat Lagi</Button></div>}
     {!loading&&!error&&(selectedId===null ? data.length ? <ul className="space-y-4">{data.map(loan=><li key={loan.id} data-my-loan={loan.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-sm min-w-0">
      <div className="flex flex-wrap gap-3 justify-between"><h2 className="font-bold text-lg">{loan.number}</h2><span className="font-semibold text-amber-950">{loanStatusLabels[loan.status]}</span></div>
      <p>Diajukan: {campusTime(loan.createdAt)}</p><p>{campusTime(loan.startsAt)} → {campusTime(loan.endsAt)}</p><p>{loan.totalTypes} jenis barang · {loan.totalUnits} unit barang</p>
      <Button type="button" variant="outline" className="min-h-11 rounded-xl" data-loan-detail={loan.id} onClick={()=>onSelect(loan.id)}>Detail {loan.number}</Button>
     </li>)}</ul> : <p className="bg-white p-6 rounded-2xl">Belum ada pengajuan. Isi Keranjang untuk mengajukan peminjaman.</p> : !receipt&&data[0]&&<LoanSummary loan={data[0]} />)}
  </LoanPage>;
}
