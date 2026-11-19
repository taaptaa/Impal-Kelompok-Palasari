import type { SavedFormDetails } from '../api';
import { ACKNOWLEDGEMENT_TEXT } from '../loan-form-validation.mjs';
import { campusTime } from './LoanSummary';

export function LoanFormDetails({details}: {details?:SavedFormDetails}) {
  if(!details)return null;
  return <section aria-label="Informasi tambahan tersimpan" className="border-t border-slate-200 pt-4 space-y-3 text-sm break-words">
    <h3 className="font-bold">Informasi kegiatan dan kontak</h3>
    <dl className="space-y-2">{[
      ['Nama kegiatan',details.activityName],['Lokasi kegiatan',details.activityLocation],['Deskripsi kegiatan',details.activityDescription||'Tidak diisi'],
      ['Nomor telepon',details.phone],['NIM / ID peminjam',details.borrowerIdentifier||'Tidak diisi'],['Program studi / unit',details.unit||'Tidak diisi'],
    ].map(([label,value])=><div key={label}><dt className="text-slate-600">{label}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl>
    <p className="text-xs text-slate-600">Kontak, ID dan unit adalah data isian peminjam, bukan identitas institusional yang telah diverifikasi.</p>
    <p>{ACKNOWLEDGEMENT_TEXT}</p><p>Konfirmasi informatif: {details.acknowledgement.version} · {campusTime(details.acknowledgedAt)}. Bukan persetujuan legal atau keputusan Admin.</p>
  </section>;
}
