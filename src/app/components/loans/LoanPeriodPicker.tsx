import type { DateRange } from 'react-day-picker';
import { CampusCalendar } from './CampusCalendar';
import { civilDate, jakartaToday, withCivilDay } from './calendar-dates.mjs';

interface Props { start: string; end: string; disabled: boolean; onChange: (start: string, end: string) => void }
export function LoanPeriodPicker({start,end,disabled,onChange}: Props) {
  const from = civilDate(start), to = civilDate(end);
  const select = (range: DateRange | undefined) => onChange(withCivilDay(range?.from,start,'08:00'),withCivilDay(range?.to,end,'17:00'));
  return <section aria-label="Kalender pemilihan periode" className="rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3">
    <h3 className="font-semibold text-sm">Pilih rentang tanggal</h3>
    <p className="text-sm text-slate-600">Klik tanggal mulai lalu tanggal kembali. Untuk hari yang sama, klik tanggal itu dua kali. Bulan dan tahun dapat diubah; jam dapat disesuaikan pada isian di bawah.</p>
    <CampusCalendar mode="range" selected={{from,to}} onSelect={select} defaultMonth={from ?? jakartaToday()} disabled={disabled ? true : {before:jakartaToday()}} />
    <p role="status" className="text-xs text-slate-600">{from ? to ? 'Rentang dipilih. Periksa kembali tanggal dan jam WIB di bawah.' : 'Tanggal mulai dipilih. Pilih tanggal kembali.' : 'Belum ada rentang dipilih.'} Pilihan tanggal bukan bukti ketersediaan. Jam isian awal 08.00 dan 17.00 dapat diubah; bukan aturan jam layanan.</p>
  </section>;
}
