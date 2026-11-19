import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changePlan } from '../src/app/plan.mjs';

test('draft publik dua jenis barang tidak duplikat dan tidak mengubah inventaris', () => {
  const items = [
    { id_barang: 1, stok_total: 7 },
    { id_barang: 2, stok_total: 4 },
  ];
  let plan = {};
  plan = changePlan(plan, items, 1, 2);
  plan = changePlan(plan, items, 2, 1);
  plan = changePlan(plan, items, 1, 3);
  assert.deepEqual(plan, { 1: 3, 2: 1 });
  assert.equal(Object.keys(plan).length, 2);
  assert.strictEqual(changePlan(plan, items, 2, 1.5), plan);
  assert.strictEqual(changePlan(plan, items, 1, 8), plan);
  assert.strictEqual(changePlan(plan, items, 3, 1), plan);
  plan = changePlan(plan, items, 1, 0);
  assert.deepEqual(plan, { 2: 1 });
  assert.deepEqual(items, [{ id_barang: 1, stok_total: 7 }, { id_barang: 2, stok_total: 4 }]);
});
