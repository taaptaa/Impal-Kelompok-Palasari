import { useEffect, useMemo, useState } from 'react';
import { LogOut, Search } from 'lucide-react';
import type { User } from '../types';
import { getCatalog, type CatalogItem, type CatalogRoom } from '../api';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface Props { user: User; onLogout: () => void }

export function LiveCatalogScreen({ user, onLogout }: Props) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [rooms, setRooms] = useState<CatalogRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<Record<number, number>>({});

  useEffect(() => {
    let active = true;
    getCatalog().then(data => {
      if (active) { setItems(data.barang); setRooms(data.ruangan); }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Katalog gagal dimuat.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => items.filter(item =>
    `${item.kode_barang} ${item.nama_barang} ${item.jenis}`.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);
  const plannedItems = items.filter(item => plan[item.id_barang] > 0);

  return <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC]">
    <header className="px-4 sm:px-12 pt-6 pb-6 relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${telkomBg})` }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(190, 30, 45, .9), rgba(139, 22, 33, .95))' }} />
      <div className="relative z-10 max-w-[1200px] mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <span className="text-sm font-semibold">SmartLend · {user.name} ({user.role})</span>
          <button type="button" onClick={onLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
        <div className="flex items-center gap-4">
          <img src={telkomLogo} alt="Telkom University" className="w-16 sm:w-20 h-auto" />
          <div><h1 className="text-xl font-bold">Daftar Inventaris</h1><p className="text-sm">Katalog dari database SmartLend</p></div>
        </div>
      </div>
    </header>

    <main className="w-full max-w-[1200px] mx-auto px-4 sm:px-12 py-6 flex-1 space-y-6">
      <p className="bg-amber-50 text-amber-950 border border-amber-200 rounded-xl p-4 text-sm" role="note">
        Stok total bukan stok tersedia. Ketersediaan berdasarkan tanggal, pengajuan, persetujuan, dan pembayaran belum terhubung. Rencana di halaman ini hanya tersimpan sementara di browser, bukan reservasi atau pengajuan.
      </p>
      {loading && <p role="status">Memuat katalog...</p>}
      {error && <p role="alert" className="text-red-700 bg-red-50 rounded-xl p-4">{error}</p>}
      {!loading && !error && <>
        <section aria-labelledby="items-title" className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 id="items-title" className="font-bold text-lg mb-4">Barang inventaris</h2>
          <label htmlFor="catalog-search" className="block text-sm font-semibold mb-2">Cari barang</label>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" aria-hidden="true" />
            <input id="catalog-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nama, kode, atau jenis" className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus-visible:outline-2 focus-visible:outline-[#BE1E2D]" />
          </div>
          <p className="text-sm text-slate-600 mb-4">{filtered.length} dari {items.length} barang</p>
          {items.length === 0 ? <p>Belum ada data barang pada database ini.</p> : filtered.length === 0 ? <p>Tidak ada barang yang cocok dengan pencarian.</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700"><tr>
              <th scope="col" className="p-3">Kode</th><th scope="col" className="p-3">Nama barang</th><th scope="col" className="p-3">Jenis</th><th scope="col" className="p-3">Stok total</th>
              {user.role === 'student' && <th scope="col" className="p-3">Rencana (lokal)</th>}
            </tr></thead><tbody>{filtered.map(item => <tr key={item.id_barang} className="border-b border-slate-100">
              <td className="p-3">{item.kode_barang}</td><td className="p-3 font-semibold">{item.nama_barang}</td><td className="p-3">{item.jenis}</td><td className="p-3">{item.stok_total} {item.satuan}</td>
              {user.role === 'student' && <td className="p-3">
                <label htmlFor={`quantity-${item.id_barang}`} className="sr-only">Jumlah rencana {item.nama_barang}</label>
                <input id={`quantity-${item.id_barang}`} type="number" min="0" max={item.stok_total} step="1" value={plan[item.id_barang] ?? 0}
                  onChange={e => {
                    const value = Number(e.target.value);
                    if (!Number.isSafeInteger(value) || value < 0 || value > item.stok_total) return;
                    setPlan(previous => ({ ...previous, [item.id_barang]: value }));
                  }} className="w-20 border rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-[#BE1E2D]" />
              </td>}
            </tr>)}</tbody>
          </table></div>}
        </section>
        {user.role === 'student' && <section aria-labelledby="plan-title" className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 id="plan-title" className="font-bold text-lg mb-2">Rencana multi-barang</h2>
          {plannedItems.length ? <><ul className="list-disc pl-5 space-y-1">{plannedItems.map(item => <li key={item.id_barang}>{item.nama_barang} · {plan[item.id_barang]} {item.satuan}</li>)}</ul>
            <button type="button" onClick={() => setPlan({})} className="mt-4 text-[#9A1823] font-semibold underline focus-visible:outline-2">Kosongkan rencana</button></> : <p className="text-slate-600">Belum ada barang dalam rencana.</p>}
          <p className="text-sm text-slate-600 mt-3">Belum dikirim ke server dan akan hilang saat halaman ditutup. Jumlah ini belum diverifikasi terhadap ketersediaan.</p>
        </section>}
        <section aria-labelledby="rooms-title" className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h2 id="rooms-title" className="font-bold text-lg mb-4">Ruangan</h2>
          {rooms.length === 0 ? <p>Belum ada data ruangan pada database ini.</p> : <ul className="space-y-3">{rooms.map(room => <li key={room.id_ruangan} className="border-b border-slate-100 pb-3">
            <strong>{room.nama_ruangan}</strong> · {room.kode_ruangan} · {room.lokasi} · kapasitas {room.kapasitas} orang · operasional: {room.status_operasional}. Ketersediaan jadwal belum diketahui.
          </li>)}</ul>}
        </section>
      </>}
    </main>
    <footer className="px-4 py-5 text-center text-xs text-slate-500">SmartLend · Katalog data lokal</footer>
  </div>;
}
