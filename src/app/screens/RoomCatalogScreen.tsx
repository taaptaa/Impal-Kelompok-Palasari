import { useState } from 'react';
import { ArrowLeft, Building2, Search } from 'lucide-react';
import type { CatalogRoom } from '../api';

interface Props {
  rooms: CatalogRoom[];
  loading: boolean;
  error: string;
  onBack: () => void;
}

// Halaman tipis dari daftar ruangan LiveCatalogScreen; tidak membuat data/booking baru.
export function RoomCatalogScreen({ rooms, loading, error, onBack }: Props) {
  const [query, setQuery] = useState('');
  const filtered = rooms.filter(room => `${room.nama_ruangan} ${room.kode_ruangan} ${room.lokasi}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="min-h-screen bg-[#F8FAFC]">
    <header className="px-4 sm:px-6 py-6 text-white" style={{ background: 'linear-gradient(135deg, #BE1E2D 0%, #9a1823 100%)' }}>
      <button type="button" onClick={onBack} className="flex items-center gap-2 mb-4 font-semibold focus-visible:outline-2 focus-visible:outline-white"><ArrowLeft className="w-5 h-5" />Kembali ke Home</button>
      <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Katalog Ruangan</h1>
      <p className="text-sm text-white">Informasi ruangan dari database SmartLend.</p>
    </header>
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <p className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm">Status operasional bukan ketersediaan jadwal. Ketersediaan belum diverifikasi; reservasi dan pengajuan ruangan belum tersedia.</p>
      <div className="bg-white p-5 rounded-2xl shadow-sm">
        <label htmlFor="room-search" className="block text-sm font-semibold mb-2">Cari ruangan</label>
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" /><input id="room-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nama, kode, atau lokasi" className="w-full min-w-0 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 focus-visible:outline-2 focus-visible:outline-[#BE1E2D]" /></div>
      </div>
      {loading ? <p role="status">Memuat ruangan...</p> : error ? <p role="alert" className="p-5 rounded-xl bg-red-50 text-red-800">Katalog ruangan gagal dimuat: {error}</p> : rooms.length === 0 ? <p className="bg-white rounded-2xl p-6">Belum ada data ruangan pada database ini.</p> : filtered.length === 0 ? <p>Tidak ada ruangan yang cocok dengan pencarian.</p> :
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">{filtered.map(room => <li key={room.id_ruangan} data-room={room.id_ruangan} className="bg-white rounded-2xl p-6 shadow-sm min-w-0 break-words">
          <Building2 className="w-7 h-7 text-[#BE1E2D] mb-3" /><h2 className="font-bold text-lg">{room.nama_ruangan}</h2><p className="text-sm text-slate-600 mb-3">{room.kode_ruangan}</p>
          <dl className="space-y-2 text-sm"><div><dt className="text-slate-600">Lokasi</dt><dd>{room.lokasi}</dd></div><div><dt className="text-slate-600">Kapasitas</dt><dd>{room.kapasitas} orang</dd></div><div><dt className="text-slate-600">Status operasional</dt><dd>{room.status_operasional === 'aktif' ? 'Aktif' : 'Perawatan'}</dd></div><div><dt className="text-slate-600">Ketersediaan jadwal</dt><dd>Belum diverifikasi</dd></div></dl>
        </li>)}</ul>}
    </div>
  </div>;
}
