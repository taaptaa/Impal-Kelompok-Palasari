// Compare persisted JSON values, not SQLite's null-prototype row objects.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectDatabase } from './audit-readonly.mjs';

try {
  const [database, checkpoint] = process.argv.slice(2);
  if (!database || !checkpoint) throw Error('Usage: node tools/database-engineer/verify-checkpoint.mjs <existing.sqlite> <checkpoint.json>');
  const before = JSON.parse(readFileSync(checkpoint, 'utf8'));
  const after = inspectDatabase(database);
  assert.equal(after.target, before.target, 'checkpoint must belong to the same target');
  assert.equal(JSON.stringify(after.schema), JSON.stringify(before.schema), 'source schema differs; re-audit, never reset');
  assert.equal(JSON.stringify(after.fingerprints), JSON.stringify(before.fingerprints), 'source rows differ; re-audit legitimate concurrent changes, never reset');
  assert.equal(after.integrity[0].integrity_check, 'ok');
  assert.equal(after.foreignKeyViolations.length, 0);
  console.log(JSON.stringify({ checkedAt: after.capturedAt, sourceUnchanged: true,
    tables: Object.keys(after.fingerprints).length,
    accounts: after.fingerprints.pengguna.count, items: after.fingerprints.barang.count,
    loans: after.fingerprints.peminjaman.count, details: after.fingerprints.detail_barang.count,
    proposalTablesInSource: after.schema.filter(row => ['audit_operasi','verifikasi_stok_barang','alokasi_barang','alokasi_ruangan','penerimaan_barang'].includes(row.name)).length,
    dbPathConfigured: after.dbPathConfiguredInAuditProcess }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
