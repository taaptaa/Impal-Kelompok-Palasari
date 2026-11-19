import { useEffect, useRef, useState } from 'react';
import { Search, Package, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CatalogItem } from '../api';
import { ItemCard } from '../components/ItemCard';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';
import { CartSummary } from '../components/CartSummary';
import { InventoryVisual } from '../components/InventoryVisual';

export interface CatalogScreenProps {
  onBack: () => void;
  items: CatalogItem[];
  loading: boolean;
  error: string;
  plan: Record<number, number>;
  onPlanChange: (id: number, quantity: number) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  focusPlan?: boolean;
  accessMode?: 'public' | 'authenticated';
  onApply?: () => void;
  onSchedule?: () => void;
  onBrowse?: () => void;
}

export function CatalogScreen({ onBack, items, loading, error, plan, onPlanChange, searchQuery: query, onSearchChange, focusPlan, accessMode, onApply, onSchedule, onBrowse }: CatalogScreenProps) {
  const [localSearch, setLocalSearch] = useState('');
  const searchQuery = query ?? localSearch;
  const setSearchQuery = onSearchChange ?? setLocalSearch;
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [selectedKind, setSelectedKind] = useState('all');
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});
  const [planMessage, setPlanMessage] = useState('');

  useEffect(() => {
    if (focusPlan && !loading) {
      const heading=document.getElementById('plan-heading');
      heading?.scrollIntoView({ block: 'start' });
      heading?.focus({ preventScroll: true });
    }
  }, [focusPlan, loading]);

  const editQuantity = (id: number, value: string) => {
    setQuantityDrafts(previous => ({ ...previous, [id]: value }));
    setQuantityErrors(previous => ({ ...previous, [id]: '' }));
  };
  const saveToPlan = (item: CatalogItem) => {
    const quantity = Number(quantityDrafts[item.id_barang] ?? plan[item.id_barang] ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.stok_total) {
      setPlanMessage('');
      setQuantityErrors(previous => ({ ...previous, [item.id_barang]: `Masukkan jumlah bulat 1–${item.stok_total}. Batas ini stok total, bukan jaminan ketersediaan.` }));
      return;
    }
    const updated = !!plan[item.id_barang];
    onPlanChange(item.id_barang, quantity);
    setQuantityErrors(previous => ({ ...previous, [item.id_barang]: '' }));
    const message = `${item.nama_barang}: ${quantity} ${item.satuan} ${updated ? 'diperbarui dalam' : 'ditambahkan ke'} keranjang. Belum dipesan dan stok tidak berubah.`;
    setPlanMessage(message);
    toast.success(message, { id: 'catalog-plan', duration: 3000 });
  };
  const changeCartQuantity = (id:number,quantity:number) => {
    onPlanChange(id,quantity);
    setQuantityDrafts(previous => { const next={...previous};delete next[id];return next; });
    setQuantityErrors(previous=>({...previous,[id]:''}));
  };

  // Filter items based on search query
  const filteredItems = items.filter(item =>
    `${item.nama_barang} ${item.kode_barang} ${item.jenis}`.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
    (selectedKind === 'all' || item.jenis === selectedKind)
  );
  const kinds = Array.from(new Set(items.map(item => item.jenis))).sort();
  const cart=<CartSummary items={items} plan={plan} onChange={changeCartQuantity} disabled={loading||!!error}
    onBrowse={onBrowse??(()=>document.getElementById('catalog-search')?.focus())}
    onApply={onApply?()=>{toast.dismiss('catalog-plan');onApply();}:undefined} />;

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header with Background Image */}
      <div className="pt-6 pb-6 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${telkomBg})`,
            backgroundPosition: 'center center'
          }}
        />
        {/* Color Overlay - Telkom Maroon */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(135deg, rgba(190, 30, 45, 0.85) 0%, rgba(139, 22, 33, 0.90) 100%)'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 sl-shell" data-catalog-header>
          {/* Existing wiring offers onApply only for Mahasiswa. Keep internal
              dashboard/public return paths without editing shared navigation. */}
          {(accessMode === 'public' || !onApply) && <button
            onClick={onBack}
            className="flex items-center gap-2 mb-4 text-white hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            <span className="font-semibold text-sm">{accessMode === 'public' ? 'Kembali ke pemilihan role' : 'Kembali'}</span>
          </button>}

          <div className="flex items-center gap-4">
            <div className="max-w-[80px]">
              <img 
                src={telkomLogo} 
                alt="Telkom University" 
                className="w-full h-auto"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
                {focusPlan?'Keranjang Peminjaman':'Daftar Barang Inventaris'}
              </h1>
              <p className="text-xs text-white" style={{ opacity: 0.9 }}>
                Katalog inventaris dari database SmartLend
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 py-6">
        <div className="sl-shell space-y-5" data-catalog-content>
          {focusPlan&&cart}
          <p role="note" className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950">
            {accessMode === 'public' && 'Katalog publik tanpa login. '}
            Stok total bukan stok tersedia. Keranjang disimpan sementara di tab ini; belum dikirim, belum memesan barang, dan tidak mengubah stok.
            {' '}Ketersediaan belum diverifikasi: jumlah yang dapat dipinjam perlu pemeriksaan jadwal, pemakaian, dan kondisi barang oleh petugas.
          </p>
          {onSchedule && <button type="button" onClick={onSchedule} className="mb-5 px-5 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-[#9A1823] focus-visible:outline-2">Jadwal Peminjaman</button>}
          {/* Search Bar */}
          <div className="sl-catalog-search bg-white rounded-2xl p-4 sm:p-6 shadow-sm mb-6">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#94A3B8' }}
                strokeWidth={1.5}
              />
              <label htmlFor="catalog-search" className="sr-only">Cari barang</label>
              <input
                id="catalog-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari barang berdasarkan nama, kode, atau jenis..."
                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors text-base"
                style={{ fontSize: '16px' }}
                onFocus={(e) => (e.target.style.borderColor = '#BE1E2D')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
              {searchQuery && (
                <button
                  aria-label="Hapus kata pencarian"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                >
                  <X className="w-5 h-5" style={{ color: '#94A3B8' }} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {/* Search Results Count */}
            <div>
              <label htmlFor="catalog-kind" className="block text-sm font-semibold text-slate-700 mb-2">Filter jenis</label>
              <select id="catalog-kind" value={selectedKind} onChange={event => setSelectedKind(event.target.value)} className="w-full max-w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus-visible:outline-2 focus-visible:outline-[#BE1E2D]">
                <option value="all">Semua jenis</option>{kinds.map(kind => <option key={kind} value={kind}>{kind === 'portabel' ? 'Portabel' : 'Tetap'}</option>)}
              </select>
            </div>
            <div className="sl-catalog-result flex flex-wrap gap-2 items-center justify-between">
              <p className="text-sm" style={{ color: '#64748B' }}>
                {filteredItems.length === items.length 
                  ? `Menampilkan ${filteredItems.length} barang` 
                  : `Ditemukan ${filteredItems.length} dari ${items.length} barang`}
              </p>
              {(searchQuery || selectedKind !== 'all') && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedKind('all'); }}
                  className="text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: '#BE1E2D' }}
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          </div>

          {/* Kartu Figma existing diadaptasi ke kontrak katalog API */}
          {loading ? <p role="status" className="bg-white rounded-2xl p-8">Memuat katalog...</p> : error ?
            <p role="alert" className="bg-red-50 text-red-800 rounded-2xl p-8">Katalog gagal dimuat: {error}</p> : filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <Package className="w-16 h-16 mx-auto mb-4" style={{ color: '#CBD5E1' }} strokeWidth={1.5} />
              <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>
                {items.length === 0 ? 'Belum Ada Data Barang' : 'Tidak Ada Barang Ditemukan'}
              </h3>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>
                {items.length === 0 ? 'Database ini belum memiliki data barang.' : 'Coba gunakan kata kunci yang berbeda.'}
              </p>
              {(searchQuery || selectedKind !== 'all') && <button
                onClick={() => { setSearchQuery(''); setSelectedKind('all'); }}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#BE1E2D' }}
              >
                Reset Pencarian
              </button>}
            </div>
          ) : (
            <div className="sl-catalog-grid">
                    {filteredItems.map(item => (
                        <ItemCard key={item.id_barang} mode="catalog" item={item}>
                          <div>
                            <label htmlFor={`plan-${item.id_barang}`} className="block text-xs font-semibold text-slate-600 mb-2">Jumlah {item.nama_barang}</label>
                            <input id={`plan-${item.id_barang}`} type="number" min="1" max={item.stok_total} step="1"
                              value={quantityDrafts[item.id_barang] ?? plan[item.id_barang] ?? 1} disabled={item.stok_total === 0}
                              aria-invalid={!!quantityErrors[item.id_barang]} aria-describedby={quantityErrors[item.id_barang] ? `plan-error-${item.id_barang}` : undefined}
                              onChange={event => editQuantity(item.id_barang, event.target.value)}
                              className="w-24 border-2 border-slate-200 rounded-lg px-3 py-3 focus-visible:outline-2 focus-visible:outline-[#BE1E2D]" />
                            {quantityErrors[item.id_barang] && <p id={`plan-error-${item.id_barang}`} role="alert" className="mt-2 text-xs text-red-700">{quantityErrors[item.id_barang]}</p>}
                          </div>
                            <div className="flex flex-col gap-2">
                            <button type="button" onClick={() => saveToPlan(item)} disabled={item.stok_total === 0}
                              data-plan-add={item.id_barang} aria-label={`Tambah ke Keranjang ${item.nama_barang}`}
                              className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#BE1E2D] hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BE1E2D]">
                              Tambah ke Keranjang
                            </button>
                            <button
                              onClick={event => { toast.dismiss('catalog-plan'); detailTrigger.current = event.currentTarget; setSelectedItem(item); }}
                              aria-label={`Detail ${item.nama_barang}`}
                              data-item-detail={item.id_barang}
                              className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#BE1E2D]"
                            >
                              Detail
                            </button>
                            </div>
                        </ItemCard>
                    ))}
            </div>
          )}
          <p role="status" aria-live="polite" className="text-sm text-[#9A1823]">{planMessage}</p>
          <p className="text-xs text-slate-600">Barang yang sama ditambahkan lagi mengganti jumlah pilihan sebelumnya, bukan menambah jenis baru.</p>
          {!focusPlan&&cart}
          {!onApply&&<p className="text-sm text-slate-600">Pengajuan hanya dapat dikirim melalui akun Mahasiswa yang sudah login.</p>}
        </div>
      </div>

      {/* Detail read-only menggunakan data katalog asli */}
      <Dialog open={selectedItem !== null} onOpenChange={open => { if (!open) setSelectedItem(null); }}>
        <DialogContent
          className="bg-white rounded-2xl p-6 z-[60] min-w-0 overflow-y-auto"
          // max-w-lg memakai token spacing-lg (24px) pada tema ini.
          // Ukuran eksplisit juga menimpa sm:max-w-lg dari dialog bersama.
          style={{ width: 'min(520px, calc(100vw - 32px))', maxWidth: 'none', left: '50vw', top: '50dvh', maxHeight: 'calc(100dvh - 32px)', overflowWrap: 'anywhere' }}
          onCloseAutoFocus={event => { event.preventDefault(); detailTrigger.current?.focus(); }}
        >
          <DialogHeader className="text-left pr-6 min-w-0">
            <DialogTitle className="text-lg font-bold text-[#BE1E2D]">Detail Barang</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">Informasi inventaris dari database SmartLend.</DialogDescription>
          </DialogHeader>
          {selectedItem && <>
            <InventoryVisual name={selectedItem.nama_barang} code={selectedItem.kode_barang} className="h-40" credits />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 text-sm">
              <div className="sm:col-span-2 min-w-0"><dt className="text-slate-600">Nama barang</dt><dd className="font-semibold text-slate-900">{selectedItem.nama_barang}</dd></div>
              <div className="min-w-0"><dt className="text-slate-600">Kode barang</dt><dd className="font-semibold">{selectedItem.kode_barang}</dd></div>
              <div className="min-w-0"><dt className="text-slate-600">Jenis</dt><dd className="font-semibold">{selectedItem.jenis}</dd></div>
              <div className="min-w-0"><dt className="text-slate-600">Stok total</dt><dd className="font-semibold">{selectedItem.stok_total} {selectedItem.satuan}</dd></div>
              <div className="min-w-0"><dt className="text-slate-600">Ketersediaan</dt><dd className="font-semibold">Belum diverifikasi</dd></div>
            </dl>
            <p className="text-sm text-slate-600">Stok total adalah jumlah inventaris tercatat, bukan jumlah siap dipinjam. Ketersediaan perlu pemeriksaan jadwal, pemakaian, dan kondisi barang oleh petugas.</p>
          </>}
          <DialogClose asChild><button type="button" className="px-4 py-3 rounded-xl bg-[#BE1E2D] text-white font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BE1E2D]">Tutup</button></DialogClose>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="px-12 py-4 text-center">
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          © 2024 Telkom University
        </p>
        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          SmartLend v1.0.0 - Telkom University Edition
        </p>
      </div>
    </div>
  );
}
