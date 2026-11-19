import type { RemoteView } from './view-contracts';

export function RemoteViewNotice({source,onRetry}: {source: RemoteView<unknown>; onRetry?: () => void}) {
  if (source.state==='ready') return null;
  if (source.state==='loading') return <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm">Memuat data dari backend…</p>;
  if (source.state==='error') return <div role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 text-sm"><p>Data gagal dimuat: {source.message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 min-h-11 underline font-semibold focus-visible:outline-2">Coba Muat Lagi</button>}</div>;
  return <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Data belum terhubung. Jadwal dan ketersediaan belum diverifikasi. Belum ada data bukan berarti tidak ada booking atau barang tersedia.</p>;
}
