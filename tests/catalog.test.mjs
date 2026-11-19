import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../backend/db.mjs';
import { makeServer } from '../backend/server.mjs';

test('katalog membaca barang dan ruangan dari database memori, tanpa status tersedia', async () => {
  const db = openDb(':memory:');
  const server = makeServer(db);
  try {
    db.prepare('INSERT INTO barang(id_barang,kode_barang,nama_barang,jenis,satuan,stok_total) VALUES(?,?,?,?,?,?)')
      .run(91,'TEST-91','Barang uji','portabel','unit',7);
    db.prepare('INSERT INTO ruangan(id_ruangan,kode_ruangan,nama_ruangan,kapasitas,lokasi,status_operasional) VALUES(?,?,?,?,?,?)')
      .run(92,'ROOM-92','Ruang uji',25,'Gedung uji','perawatan');
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(url+'/api/catalog');
    assert.equal(response.status,200);
    const data = await response.json();
    assert.deepEqual(data.barang,[{id_barang:91,kode_barang:'TEST-91',nama_barang:'Barang uji',jenis:'portabel',satuan:'unit',stok_total:7}]);
    assert.deepEqual(data.ruangan,[{id_ruangan:92,kode_ruangan:'ROOM-92',nama_ruangan:'Ruang uji',kapasitas:25,lokasi:'Gedung uji',status_operasional:'perawatan'}]);
    assert.equal(JSON.stringify(data).includes('availableStock'),false);
    db.prepare('UPDATE barang SET stok_total=? WHERE id_barang=?').run(9,91);
    const updated = await (await fetch(url+'/api/catalog')).json();
    assert.equal(updated.barang[0].stok_total,9);
    // Endpoint pengajuan kini tersedia, tetapi katalog publik tidak memberikan sesi transaksi.
    assert.equal((await fetch(url+'/api/loans/mine')).status,401);
    assert.equal((await fetch(url+'/api/not-an-endpoint')).status,404);
    assert.equal((await fetch(url+'/api/me')).status,401);
  } finally {
    if(server.listening) await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
