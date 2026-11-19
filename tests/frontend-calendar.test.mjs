import test from 'node:test';
import assert from 'node:assert/strict';
import { civilDate, civilKey, jakartaToday, withCivilDay, overlapsJakartaDay } from '../src/app/components/loans/calendar-dates.mjs';
import { jakartaToUtc } from '../src/app/loan-validation.mjs';

test('civil dates reject normalization and preserve leap days',()=>{
  assert.equal(civilDate('2030-02-30'),undefined);
  assert.equal(civilDate('2030-13-01'),undefined);
  assert.equal(civilKey(civilDate('2028-02-29')),'2028-02-29');
  assert.equal(civilKey(civilDate('2030-12-31T23:30')),'2030-12-31');
});
test('calendar selection preserves explicit time and existing UTC contract in multiple device zones',()=>{
  const original=process.env.TZ;
  try {
    for(const zone of ['Asia/Jakarta','America/New_York','Pacific/Honolulu','Pacific/Auckland']) {
      process.env.TZ=zone;
      const value=withCivilDay(civilDate('2030-01-02'),'2031-02-03T00:30','08:00');
      assert.equal(value,'2030-01-02T00:30');
      assert.equal(jakartaToUtc(value),'2030-01-01T17:30:00.000Z');
      assert.equal(withCivilDay(civilDate('2030-01-02'),'','08:00'),'2030-01-02T08:00');
      assert.equal(withCivilDay(undefined,'2030-01-02T08:00','08:00'),'');
      assert.equal(civilKey(jakartaToday(new Date('2030-01-01T18:00:00Z'))),'2030-01-02');
    }
  } finally {if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test('schedule uses half-open UTC intervals and Jakarta day boundaries across month/year',()=>{
  const entry={startsAt:'2030-12-31T16:30:00.000Z',endsAt:'2030-12-31T18:00:00.000Z'};
  assert.equal(overlapsJakartaDay(entry,civilDate('2030-12-31')),true);
  assert.equal(overlapsJakartaDay(entry,civilDate('2031-01-01')),true);
  assert.equal(overlapsJakartaDay(entry,civilDate('2031-01-02')),false);
  assert.equal(overlapsJakartaDay({...entry,endsAt:'2030-12-31T17:00:00.000Z'},civilDate('2031-01-01')),false);
});
