import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkedSchedule, scheduleChunks, mergeSegments, checkedStats, checkedAdminList } from '../src/app/loan-read-models.mjs';
const date=day=>new Date(Date.UTC(2030,0,day)).toISOString();
const resource={type:'item',id:91},period={startsAt:date(1),endsAt:date(10)};
const sample=()=>({resource:{...resource,name:'Barang sintetis',code:'TEST-91',unit:'unit'},period,interval:'[startsAt,endsAt)',scope:'direct_details_only',timeBasis:'sqlite_utc_legacy_unverified',segments:[{startsAt:date(2),endsAt:date(3),recordedQuantity:2}],borrowedQuantityPendingReconciliation:0,availability:{verification:'unverified',availableQuantity:null,blockers:['capacity_baseline_unverified']},asOf:date(1)});
test('Kalender 42 hari dipartisi <=31 hari, batas bersebelahan tanpa gap/duplikasi',()=>{
  const parts=scheduleChunks(date(1),date(43));assert.equal(parts.length,2);
  assert.equal(parts[0].endsAt,parts[1].startsAt);assert.equal(parts[1].endsAt,date(43));
  for(const part of parts)assert.ok(Date.parse(part.endsAt)-Date.parse(part.startsAt)<=31*86400000);
  assert.throws(()=>scheduleChunks(date(1),date(1)));assert.throws(()=>scheduleChunks('2030-02-30T00:00:00.000Z',date(50)));
});
test('Merge segmen antar chunk tidak menjumlahkan beban, menggabungkan adjacency saja',()=>{
  const parts=[{segments:[{startsAt:date(1),endsAt:date(3),recordedQuantity:2}]},{segments:[{startsAt:date(3),endsAt:date(4),recordedQuantity:2},{startsAt:date(4),endsAt:date(5),recordedQuantity:3}]}];
  assert.deepEqual(mergeSegments(parts),[{startsAt:date(1),endsAt:date(4),recordedQuantity:2},{startsAt:date(4),endsAt:date(5),recordedQuantity:3}]);
  assert.equal(parts[0].segments[0].endsAt,date(3));
  assert.throws(()=>mergeSegments([{segments:[{startsAt:date(1),endsAt:date(4),recordedQuantity:2}]},parts[1]]));
});
test('Proyeksi jadwal tidak menciptakan transaksi/status; unknown tidak diubah menjadi stok tersedia',()=>{
  const result=checkedSchedule({...sample(),borrower:'SHOULD-NOT-BE-PROJECTED'},resource,period);
  assert.equal(result.availability.availableQuantity,null);assert.equal('borrower' in result,false);
  assert.deepEqual(Object.keys(result.segments[0]).sort(),['endsAt','recordedQuantity','startsAt']);
  for(const changed of [null,{...sample(),availability:{verification:'verified',availableQuantity:5,blockers:[]}},{...sample(),resource:{...resource,id:92}}, {...sample(),segments:[{startsAt:date(2),endsAt:date(3),recordedQuantity:1.5}]},{...sample(),period:{startsAt:date(1),endsAt:date(9)}}])assert.throws(()=>checkedSchedule(changed,resource,period));
});
test('Daftar/statistik malformed tidak diterjemahkan menjadi kosong/nol',()=>{
  assert.throws(()=>checkedAdminList({loans:[]}));assert.throws(()=>checkedStats({total:0}));
  assert.throws(()=>checkedAdminList({loans:[],pagination:{total:1,limit:10,offset:0,hasMore:false},asOf:date(1)}));
});
