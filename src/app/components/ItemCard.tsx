import { Item } from '../types';
import type { ReactNode } from 'react';
import type { CatalogItem } from '../api';
import { InventoryVisual } from './InventoryVisual';

type ItemCardProps = {
  mode?: 'legacy';
  item: Item;
  onClick: () => void;
} | { mode: 'catalog'; item: CatalogItem; children: ReactNode };

export function ItemCard(props: ItemCardProps) {
  if (props.mode === 'catalog') {
    const item = props.item;
    return <article data-catalog-item={item.id_barang} className="min-w-0 bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 flex flex-col">
      <InventoryVisual name={item.nama_barang} code={item.kode_barang} className="h-40 sm:h-44" />
      <div className="p-5 flex flex-col gap-3 flex-1 min-w-0">
        <div className="flex flex-wrap gap-2 items-center"><span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{item.jenis}</span>
          {(item.kode_barang.startsWith('UJI-') || item.nama_barang.endsWith('(Uji)')) && <span className="text-xs font-semibold text-[#9A1823]">Data uji</span>}</div>
        <div className="min-w-0"><h2 className="font-bold text-lg break-words">{item.nama_barang}</h2><p className="text-xs text-slate-600 break-words">{item.kode_barang}</p></div>
        <dl className="text-sm space-y-1"><div className="flex justify-between gap-2 flex-wrap"><dt className="text-slate-600">Stok total</dt><dd className="font-semibold">{item.stok_total} {item.satuan}</dd></div>
          <div><dt className="text-slate-600">Ketersediaan</dt><dd className="text-slate-600">Belum diverifikasi</dd></div></dl>
        <div className="mt-auto space-y-3">{props.children}</div>
      </div>
    </article>;
  }
  const { item, onClick } = props;
  const getStatusColor = () => {
    if (item.availableStock === 0) return 'var(--color-error)';
    if (item.availableStock < 5) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const getStatusText = () => {
    if (item.availableStock === 0) return 'Habis';
    if (item.availableStock < 5) return 'Stok Menipis';
    return 'Tersedia';
  };

  const isOutOfStock = item.availableStock === 0;

  return (
    <div
      onClick={isOutOfStock ? undefined : onClick}
      className={`bg-white overflow-hidden transition-all hover:shadow-lg ${
        isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'
      }`}
      style={{ 
        boxShadow: 'var(--shadow-md)',
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* Image - Aspect ratio 1:1 */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/400x400?text=No+Image';
          }}
        />
        {/* Badge Stok - Top Right */}
        <div
          className="absolute top-2 right-2 px-3 py-1 rounded-full text-white text-xs font-medium"
          style={{ backgroundColor: getStatusColor() }}
        >
          {getStatusText()}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Nama Barang - Truncate 2 lines */}
        <h4 
          className="font-semibold mb-1 line-clamp-2" 
          style={{ 
            color: 'var(--color-navy)',
            minHeight: '2.5rem'
          }}
        >
          {item.name}
        </h4>
        
        {/* Category */}
        <p className="text-xs mb-3 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
          {item.category}
        </p>
        
        {/* Stock Info */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Stok: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {item.availableStock}/{item.totalStock}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
