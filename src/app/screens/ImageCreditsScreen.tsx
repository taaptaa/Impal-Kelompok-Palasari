import { inventoryPhotoCredits } from '../data/inventoryPhotos';
import { InventoryVisual } from '../components/InventoryVisual';

export function ImageCreditsScreen({onBack}: {onBack:()=>void}) {
  return <section className="sl-shell sl-section space-y-5" aria-label="Kredit gambar">
    <button type="button" onClick={onBack} className="border rounded-xl px-4 min-h-11 bg-white font-semibold">Kembali ke Katalog</button>
    <h1>Kredit Gambar Inventaris</h1>
    <p>Foto ilustrasi, bukan foto unit kampus atau bukti spesifikasi/kondisi. Kredit berikut memuat judul, pembuat, sumber Wikimedia Commons dan lisensi setiap gambar. Aset lokal tidak diganti; gambar hanya diskalakan untuk tampilan.</p>
    <div className="sl-credit-list">{inventoryPhotoCredits.map(photo=><article key={photo.code} data-photo-credit={photo.code} className="sl-panel space-y-3 break-words">
      <h2 className="capitalize">{photo.name}</h2><p className="text-sm text-slate-600">{photo.code}</p>
      <InventoryVisual name={photo.name} code={photo.code} className="h-40" credits />
      {photo.code==='UJI-WBD-01'&&<p className="text-sm">Ilustrasi papan tulis umum; foto tidak menunjukkan roda atau model portable.</p>}
    </article>)}</div>
  </section>;
}
