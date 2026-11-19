import { useRef, useState, type ComponentProps } from 'react';
import { DayPicker, useDayRender, type DayProps } from 'react-day-picker';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { jakartaToday } from './calendar-dates.mjs';
import './campus-calendar.css';

type Props = ComponentProps<typeof DayPicker>;
const months = Array.from({length:12},(_,month)=>new Intl.DateTimeFormat('id-ID',{month:'long'}).format(new Date(2024,month,1)));
// DayPicker v8 does not apply labelDay to day buttons; keep its focus/keyboard
// handlers while giving each date an unambiguous accessible Indonesian name.
function AccessibleDay(props: DayProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const day = useDayRender(props.date,props.displayMonth,ref);
  if (day.isHidden) return <div role="gridcell" />;
  if (!day.isButton) return <div {...day.divProps} />;
  return <button {...day.buttonProps} type="button" ref={ref} aria-label={`${new Intl.DateTimeFormat('id-ID',{dateStyle:'full'}).format(props.date)}${day.activeModifiers.selected?', dipilih':''}`} />;
}
export function CampusCalendar(props: Props) {
  const [localMonth,setLocalMonth] = useState(props.defaultMonth ?? jakartaToday());
  const month = props.month ?? localMonth;
  const move = (next: Date) => { setLocalMonth(next); props.onMonthChange?.(next); };
  const disabled = props.disabled === true;
  const currentYear=jakartaToday().getFullYear();
  const firstYear=Math.max(1,Math.min(currentYear-5,month.getFullYear()-10));
  const lastYear=Math.min(9999,Math.max(currentYear+10,month.getFullYear()+10));
  const years=Array.from({length:lastYear-firstYear+1},(_,i)=>firstYear+i);
  const changeMonth = (year: number, index: number) => {
    const next = new Date(2000,0,1,12); next.setFullYear(year,index,1);
    if (next.getFullYear() >= 1 && next.getFullYear() <= 9999) move(next);
  };
  return <div className="sl-calendar">
    <div className="sl-calendar-controls">
      <button type="button" aria-label="Bulan sebelumnya" disabled={disabled || (month.getFullYear()===1 && month.getMonth()===0)} onClick={()=>changeMonth(month.getFullYear(),month.getMonth()-1)}><ChevronLeft size={18} /></button>
      <label><span className="sr-only">Bulan kalender</span><select aria-label="Bulan kalender" disabled={disabled} value={month.getMonth()} onChange={e=>changeMonth(month.getFullYear(),Number(e.target.value))}>{months.map((name,index)=><option key={name} value={index}>{name}</option>)}</select></label>
      <label className="sl-calendar-year"><span className="sr-only">Tahun kalender</span><select aria-label="Tahun kalender" disabled={disabled} value={month.getFullYear()} onChange={e=>changeMonth(Number(e.target.value),month.getMonth())}>{years.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
      <button type="button" aria-label="Bulan berikutnya" disabled={disabled || (month.getFullYear()===9999 && month.getMonth()===11)} onClick={()=>changeMonth(month.getFullYear(),month.getMonth()+1)}><ChevronRight size={18} /></button>
    </div>
    <DayPicker {...props} month={month} onMonthChange={move} locale={id} weekStartsOn={1} today={jakartaToday()} showOutsideDays
      components={{Day:AccessibleDay}}
      labels={{labelWeekday:name=>new Intl.DateTimeFormat('id-ID',{weekday:'long'}).format(name)}} />
  </div>;
}
