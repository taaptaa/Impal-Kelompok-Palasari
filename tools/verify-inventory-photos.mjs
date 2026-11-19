// Verifies existing local assets + Commons metadata. Never downloads/replaces photos.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const source=readFileSync('src/app/data/inventoryPhotos.ts','utf8');
const imports=Object.fromEntries([...source.matchAll(/import (\w+) from '\.\.\/\.\.\/assets\/inventory\/([^']+)'/g)].map(match=>[match[1],match[2]]));
const photos=[...source.matchAll(/'([^']+)': photo\((\w+),'([^']+)','([^']+)','([^']+)','([^']+)'\)/g)].map(match=>({name:match[1],file:imports[match[2]],title:match[3],author:match[4],license:match[5],licenseUrl:match[6]}));
assert.equal(photos.length,12);assert.equal(Object.keys(imports).length,12);
const codes=[...source.matchAll(/'(UJI-[A-Z]+-\d+)':'([^']+)'/g)].map(match=>({code:match[1],name:match[2]}));
assert.equal(codes.length,12);assert.equal(new Set(codes.map(item=>item.code)).size,12);
const params=new URLSearchParams({action:'query',format:'json',titles:photos.map(photo=>'File:'+photo.title).join('|'),prop:'imageinfo',iiprop:'extmetadata|url'});
const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'SmartLendEducationalInventoryAudit/1.0'},signal:AbortSignal.timeout(30000)});
assert.equal(response.ok,true,`Commons metadata HTTP ${response.status}`);
const data=await response.json(),pages=Object.values(data.query?.pages??{});
const strip=value=>(value??'').replace(/<[^>]*>/g,'').replaceAll('&amp;','&').trim();
const results=photos.map(photo=>{
  const bytes=readFileSync('src/assets/inventory/'+photo.file);
  assert.ok(bytes[0]===255&&bytes[1]===216||bytes.subarray(0,4).equals(Buffer.from([137,80,78,71])),photo.file);
  const page=pages.find(page=>page.title.replaceAll('_',' ')==='File:'+photo.title.replaceAll('_',' '));
  const info=page?.imageinfo?.[0],meta=info?.extmetadata;
  assert.ok(meta,photo.title);assert.match(meta.LicenseShortName.value,/^(CC BY|CC0|Public domain)/);
  assert.equal(meta.LicenseShortName.value,photo.license,`License mismatch: ${photo.title}`);
  return {...photo,code:codes.find(item=>item.name===photo.name)?.code,source:info.descriptionurl,commonsAuthor:strip(meta.Artist?.value),commonsLicense:meta.LicenseShortName.value,commonsLicenseUrl:meta.LicenseUrl?.value??null,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),note:photo.name==='whiteboard portable'?'Ilustrasi papan tulis umum; foto tidak menunjukkan roda/model portabel. Bukan spesifikasi unit kampus.':'Foto ilustrasi representatif; merek/model bukan data inventaris.'};
});
const report={checkedAt:new Date().toISOString(),method:'Existing local files + read-only Commons imageinfo; no image download; visual subject review separately',results};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'PASS',localPhotos:results.length,verifiedLicenses:results.length,assetsReplaced:0,credits:results.map(({code,author,commonsAuthor,license})=>({code,author,commonsAuthor,license}))},null,2));
