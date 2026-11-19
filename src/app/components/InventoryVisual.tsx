import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { inventoryPhoto } from '../data/inventoryPhotos';

// Local, licensed illustrations; no schema changes and no external image requests.
export function InventoryVisual({ name, code, className = '', credits = false }: { name: string; code?:string; className?: string; credits?:boolean }) {
  const photo = inventoryPhoto(code);
  const [failedSrc,setFailedSrc] = useState('');
  if (photo && failedSrc!==photo.src) return <figure className="min-w-0">
    <div className={`bg-slate-100 ${className}`}><img src={photo.src} alt={`Ilustrasi ${name}, bukan foto inventaris aktual`} loading="lazy" decoding="async" onError={()=>setFailedSrc(photo.src)} className="w-full h-full object-contain" /></div>
    {credits && <figcaption className="px-3 py-2 text-xs leading-relaxed text-slate-600 bg-slate-50 break-words">Foto ilustrasi, bukan barang aktual. <a href={photo.source} target="_blank" rel="noreferrer" className="underline focus-visible:outline-2">{photo.title} — {photo.author}</a> · <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="underline focus-visible:outline-2">{photo.license}</a>. Ditampilkan sesuai aset lokal; ukuran tampilan disesuaikan.</figcaption>}
  </figure>;
  return <div role="img" aria-label={`Foto ${name} belum tersedia`} className={`bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500 ${className}`}>
    <ImageOff className="w-9 h-9" aria-hidden="true" />
    <span className="text-xs text-center px-3">Foto belum tersedia</span>
  </div>;
}
