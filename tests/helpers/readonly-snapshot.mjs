// Test helper only. Source is SELECT-only in a consistent read transaction;
// never copy a raw SQLite file while WAL may contain committed data.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';

const quote=name=>'"'+name.replaceAll('"','""')+'"';
export function readSnapshot(file) {
  if(!file||!existsSync(file))throw Error('Path database existing eksplisit diperlukan.');
  const db=new DatabaseSync(realpathSync(file),{readOnly:true});
  try {
    db.exec('PRAGMA query_only=ON; BEGIN');
    const schema=db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    const tables=schema.filter(row=>row.type==='table').map(({name,sql})=>({name,sql,
      columns:db.prepare(`PRAGMA table_info(${quote(name)})`).all().map(row=>row.name),
      dependencies:[...new Set(db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all().map(row=>row.table))],
      rows:db.prepare(`SELECT * FROM ${quote(name)} ORDER BY rowid`).all()}));
    db.exec('ROLLBACK');
    return {schema,tables,fingerprint:createHash('sha256').update(JSON.stringify({schema,tables})).digest('hex')};
  } finally {db.close();}
}

export function cloneToMemory(snapshot) {
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON; BEGIN');
    for(const table of snapshot.tables)db.exec(table.sql);
    const remaining=new Map(snapshot.tables.map(table=>[table.name,table])),copied=new Set();
    while(remaining.size) {
      const ready=[...remaining.values()].filter(table=>table.dependencies.every(name=>copied.has(name)));
      if(!ready.length)throw Error('Dependensi schema salinan perlu ditinjau; tidak menonaktifkan FK.');
      for(const table of ready) {
        const insert=db.prepare(`INSERT INTO ${quote(table.name)} (${table.columns.map(quote).join(',')}) VALUES (${table.columns.map(()=>'?').join(',')})`);
        for(const row of table.rows)insert.run(...table.columns.map(column=>row[column]));
        remaining.delete(table.name);copied.add(table.name);
      }
    }
    for(const object of snapshot.schema)if(object.type!=='table'&&object.sql)db.exec(object.sql);
    if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Salinan gagal pemeriksaan FK.');
    db.exec('COMMIT');
    return db;
  } catch(error) {db.close();throw error;}
}
