// Civil dates for the picker only; never send these Date objects to the backend.
export function civilKey(date) {
  return `${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function civilDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value || '');
  if (!match) return undefined;
  const date = new Date(2000, Number(match[2])-1, Number(match[3]), 12);
  date.setFullYear(Number(match[1]));
  return civilKey(date) === match.slice(1).join('-') ? date : undefined;
}
export function jakartaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part = key => parts.find(p=>p.type===key).value;
  return civilDate(`${part('year')}-${part('month')}-${part('day')}`);
}
export function withCivilDay(date, previous, fallbackTime) {
  return date ? `${civilKey(date)}T${/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(previous) ? previous.slice(11,16) : fallbackTime}` : '';
}
export function overlapsJakartaDay(entry, day) {
  const start = Date.parse(civilKey(day)+'T00:00:00+07:00');
  return Date.parse(entry.startsAt) < start+86400000 && Date.parse(entry.endsAt) > start;
}
