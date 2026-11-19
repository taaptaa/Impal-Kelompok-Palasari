// Validation/projection of the read API. Never turn failed/partial responses into empty data.
import { validInstant } from './loan-validation.mjs';
import { validSavedFormDetails } from './loan-form-validation.mjs';
export const readStatuses=['menunggu','disetujui','dipinjam','selesai','ditolak','dibatalkan'];
const bad=()=>{throw Error('Respons pembacaan tidak valid. Coba muat lagi.');};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const count=value=>Number.isSafeInteger(value)&&value>=0;
const positive=value=>count(value)&&value>0;
const string=value=>typeof value==='string';
export function checkedDecisions(value) {
  if(!object(value))return bad();
  for(const key of ['approval','rejection'])if(!object(value[key])||value[key].state!=='BLOCKED'||!string(value[key].code)||!Array.isArray(value[key].blockers)||!value[key].blockers.every(string))return bad();
  return value;
}
export function checkedAdminLoan(value) {
  if(!object(value)||!positive(value.id)||!string(value.number)||!value.number||!string(value.startsAt)||!string(value.endsAt)||!string(value.reason)||!readStatuses.includes(value.status)||!(value.createdAt===null||validInstant(value.createdAt)))return bad();
  const borrower=value.borrower;
  if(!object(borrower)||!positive(borrower.id)||!string(borrower.name)||!string(borrower.email)||!['student','admin','warehouse'].includes(borrower.role))return bad();
  if(!Array.isArray(value.items)||new Set(value.items.map(item=>item?.itemId)).size!==value.items.length)return bad();
  for(const item of value.items)if(!object(item)||!positive(item.itemId)||!positive(item.quantity)||!['code','name','unit'].every(key=>string(item[key])))return bad();
  if(!count(value.totalTypes)||value.totalTypes!==value.items.length||!count(value.totalUnits)||value.totalUnits!==value.items.reduce((sum,item)=>sum+item.quantity,0))return bad();
  if(value.admin!==null&&(!object(value.admin)||!positive(value.admin.id)||!string(value.admin.name)))return bad();
  if(value.room!==null&&(!object(value.room)||!positive(value.room.roomId)||!string(value.room.code)||!string(value.room.name)||!positive(value.room.participants)))return bad();
  if(value.details!==undefined&&!validSavedFormDetails(value.details))return bad();
  return value;
}
export function checkedAdminList(value) {
  if(!object(value)||!Array.isArray(value.loans)||!object(value.pagination)||!validInstant(value.asOf))return bad();
  const p=value.pagination;
  if(!count(p.total)||!positive(p.limit)||p.limit>100||!count(p.offset)||typeof p.hasMore!=='boolean'||value.loans.length>p.limit||p.hasMore!==(p.offset+value.loans.length<p.total))return bad();
  value.loans.forEach(checkedAdminLoan);
  if(new Set(value.loans.map(loan=>loan.id)).size!==value.loans.length)return bad();
  return value;
}
export function checkedStats(value) {
  if(!object(value)||!count(value.total)||!validInstant(value.asOf))return bad();
  for(const key of ['byStatus','itemUnitsByStatus','roomLoansByStatus'])if(!object(value[key])||!readStatuses.every(status=>count(value[key][status])))return bad();
  if(readStatuses.reduce((sum,status)=>sum+value.byStatus[status],0)!==value.total)return bad();
  checkedDecisions(value.decisions);return value;
}
export function checkedSchedule(value,resource,period) {
  if(!object(value)||!object(value.resource)||value.resource.id!==resource.id||value.resource.type!==resource.type||!string(value.resource.name)||!string(value.resource.code)||!object(value.period)||value.period.startsAt!==period.startsAt||value.period.endsAt!==period.endsAt||value.interval!=='[startsAt,endsAt)'||value.scope!=='direct_details_only'||value.timeBasis!=='sqlite_utc_legacy_unverified'||!validInstant(value.asOf))return bad();
  if(!Array.isArray(value.segments)||!count(value.borrowedQuantityPendingReconciliation)||!object(value.availability)||value.availability.verification!=='unverified'||value.availability.availableQuantity!==null||!Array.isArray(value.availability.blockers)||!value.availability.blockers.every(string))return bad();
  let previous=period.startsAt;
  const segments=value.segments.map(segment=>{
    if(!object(segment)||!validInstant(segment.startsAt)||!validInstant(segment.endsAt)||segment.startsAt<previous||segment.startsAt<period.startsAt||segment.endsAt>period.endsAt||segment.endsAt<=segment.startsAt||!positive(segment.recordedQuantity))return bad();
    previous=segment.endsAt;
    return {startsAt:segment.startsAt,endsAt:segment.endsAt,recordedQuantity:segment.recordedQuantity};
  });
  // Deliberately project public fields; no loan id, status, borrower or reason is invented.
  return {resource:value.resource,period:value.period,interval:value.interval,scope:value.scope,timeBasis:value.timeBasis,segments,borrowedQuantityPendingReconciliation:value.borrowedQuantityPendingReconciliation,availability:value.availability,asOf:value.asOf};
}
export function scheduleChunks(startsAt,endsAt) {
  if(!validInstant(startsAt)||!validInstant(endsAt)||endsAt<=startsAt||Date.parse(endsAt)-Date.parse(startsAt)>366*86400000)throw Error('Rentang pembacaan kalender tidak valid.');
  const chunks=[];
  for(let start=Date.parse(startsAt);start<Date.parse(endsAt);){const end=Math.min(start+31*86400000,Date.parse(endsAt));chunks.push({startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString()});start=end;}
  return chunks;
}
export function mergeSegments(parts) {
  const segments=[];
  for(const segment of parts.flatMap(part=>part.segments)){
    const prior=segments.at(-1);
    if(prior&&segment.startsAt<prior.endsAt)return bad();
    if(prior&&prior.endsAt===segment.startsAt&&prior.recordedQuantity===segment.recordedQuantity)prior.endsAt=segment.endsAt;
    else segments.push({...segment});
  }
  return segments;
}
