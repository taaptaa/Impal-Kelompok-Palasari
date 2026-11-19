import { useEffect, useState } from 'react';
import type { CatalogItem } from '../api';
import { InventoryVisual } from './InventoryVisual';

interface Props {
  items:CatalogItem[]; plan:Record<number,number>; onChange?:(id:number,quantity:number)=>void;
  onBrowse?:()=>void; onApply?:()=>void; disabled?:boolean; form?:boolean;
  onValidityChange?:(valid:boolean)=>void;
}
// Keeps the existing replace-quantity contract. Cart state never writes inventory.
export function CartSummary({items,plan,onChange,onBrowse,onApply,disabled=false,form=false,onValidityChange}:Props) {
  const [drafts,setDrafts]=useState<Record<number,string>>({});
  const [errors,setErrors]=useState<Record<number,string>>({});
  const [message,setMessage]=useState('');
  const chosen=items.filter(item=>plan[item.id_barang]>0);
  const signature=JSON.stringify(plan);
  const pending=chosen.some(item=>drafts[item.id_barang]!==undefined&&drafts[item.id_barang]!==String(plan[item.id_barang]))||Object.values(errors).some(Boolean);
  useEffect(()=>{onValidityChange?.(!pending);},[pending,onValidityChange]);
  useEffect(()=>{setDrafts({});setErrors({});},[signature]);
  const save=(item:CatalogItem,value:string)=>{
    const quantity=Number(value);
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>item.stok_total){setErrors(previous=>({...previous,[item.id_barang]:`Jumlah harus bulat 1–${item.stok_total}. Ini batas stok total, bukan ketersediaan.`}));return;}
    onChange?.(item.id_barang,quantity);setDrafts(previous=>({...previous,[item.id_barang]:String(quantity)}));setErrors(previous=>({...previous,[item.id_barang]:''}));setMessage(`Jumlah ${item.nama_barang} diperbarui. Stok tidak berubah.`);
  };
  return <section className="sl-panel" aria-labelledby={form?'checkout-cart-heading':'plan-heading'}>
    <h2 id={form?'checkout-cart-heading':'plan-heading'} tabIndex={-1} style={{scrollMarginTop:120}} className="font-bold text-lg">Ringkasan Keranjang</h2>
    <p className="text-sm text-slate-600 mt-2">Keranjang sementara, bukan transaksi atau reservasi. Ketersediaan belum diverifikasi; stok total tidak berubah.</p>
    {!chosen.length&&<p className="py-5 text-sm">Keranjang kosong. Belum ada barang dipilih.</p>}
    <ul>{chosen.map(item=><li className="sl-cart-row" key={item.id_barang} data-loan-form-item={form?item.id_barang:undefined}>
      <InventoryVisual name={item.nama_barang} code={item.kode_barang} className="h-20" />
      <div className="min-w-0 text-sm break-words"><h3 className="font-semibold text-base">{item.nama_barang}</h3><p className="text-xs text-slate-600">{item.kode_barang} · {item.jenis}</p>
        <p data-plan-summary={item.id_barang}>{plan[item.id_barang]} {item.satuan}</p><p className="text-xs text-slate-600">Stok total: {item.stok_total} {item.satuan}</p></div>
      {onChange&&<div className="sl-cart-controls">
        <button type="button" disabled={disabled||plan[item.id_barang]<=1} aria-label={`Kurangi ${item.nama_barang}`} onClick={()=>save(item,String(plan[item.id_barang]-1))} className="border rounded-lg px-4 disabled:opacity-40">−</button>
        <label className="text-xs text-slate-600">Jumlah ({item.satuan})<input id={`${form?'checkout':'summary-plan'}-${item.id_barang}`} type="number" min={1} max={item.stok_total} step={1} disabled={disabled} value={drafts[item.id_barang]??plan[item.id_barang]} onChange={event=>setDrafts(previous=>({...previous,[item.id_barang]:event.target.value}))} aria-label={`Jumlah keranjang ${item.nama_barang}`} aria-invalid={!!errors[item.id_barang]} aria-describedby={errors[item.id_barang]?`cart-error-${item.id_barang}`:undefined} className="block mt-1 border rounded-lg px-2 bg-white" /></label>
        <button type="button" disabled={disabled||plan[item.id_barang]>=item.stok_total} aria-label={`Tambah jumlah ${item.nama_barang}`} onClick={()=>save(item,String(plan[item.id_barang]+1))} className="border rounded-lg px-4 disabled:opacity-40">+</button>
        <button type="button" disabled={disabled} data-plan-save={item.id_barang} onClick={()=>save(item,drafts[item.id_barang]??String(plan[item.id_barang]))} className="border rounded-lg px-3 font-semibold disabled:opacity-40">Simpan jumlah</button>
        <button type="button" disabled={disabled} onClick={()=>{onChange(item.id_barang,0);setMessage(`${item.nama_barang} dihapus dari keranjang. Stok tidak berubah.`);}} className="text-[#9A1823] px-2 underline disabled:opacity-40" aria-label={`Hapus dari Keranjang ${item.nama_barang}`}>Hapus {item.nama_barang}</button>
      </div>}
      {errors[item.id_barang]&&<p id={`cart-error-${item.id_barang}`} role="alert" className="col-span-full text-sm text-red-700">{errors[item.id_barang]}</p>}
    </li>)}</ul>
    <p className="font-semibold text-sm my-4" data-cart-totals>{chosen.length} jenis barang · {chosen.reduce((total,item)=>total+plan[item.id_barang],0)} unit barang</p>
    {pending&&<p role="status" className="text-sm text-amber-900">Simpan atau perbaiki perubahan jumlah sebelum melanjutkan. Jumlah terkirim masih mengikuti ringkasan.</p>}
    <p role="status" className="text-sm text-slate-600" aria-live="polite">{message}</p>
    <div className="flex flex-wrap gap-3 mt-4">
      {onBrowse&&<button type="button" disabled={disabled} onClick={onBrowse} className="px-4 min-h-11 border rounded-xl bg-white font-semibold disabled:opacity-40">Tambah Barang</button>}
      {onApply&&<button type="button" data-loan-apply disabled={disabled||pending||!chosen.length} onClick={onApply} className="px-5 min-h-11 rounded-xl bg-[#BE1E2D] text-white font-semibold disabled:opacity-50">Ajukan Peminjaman</button>}
    </div>
  </section>;
}
