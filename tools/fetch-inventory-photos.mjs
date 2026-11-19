// Explicit, optional asset acquisition. Does not touch APIs or databases.
// Run only when refreshing the reviewed Commons assets; committed local files work offline.
import { mkdir, writeFile } from 'node:fs/promises';
const photos = [
  ['projector','1/14/InFocus_IN34.jpg'],
  ['hdmi','c/c2/HDMI-Connector.jpg'],
  ['speaker','a/ac/JBL_GO_1st_generation.jpg'],
  ['microphone','7/77/Shure_PG58_with_PG2_wireless_microphone_-_on.jpg'],
  ['chair','7/75/Folding_chairs_in_a_display.jpg'],
  ['table','4/41/LifetimeTable.jpg'],
  ['tripod','6/6d/Gitzo_1541T_Traveler_Carbon_Fiber_Tripod_Collage_Horizontal.jpg'],
  ['camera','7/76/12_MP_digital_camera_-_red.jpg'],
  ['cable-reel','a/a8/Cable_reel_extension_cord.jpg'],
  ['presenter','b/b6/PresRemote.png'],
  ['whiteboard','3/30/Whiteboard_in_office.jpeg'],
  ['hdmi-extension','5/5a/Fire_TV_Stick_HDMI_extender.jpg'],
];
const folder = new URL('../src/assets/inventory/',import.meta.url);
await mkdir(folder,{recursive:true});
for (const [name,file] of photos) {
  const url = `https://thumb.wikimedia.org/wikipedia/commons/thumb/${file}/${name==='presenter'?'250':'500'}px-${file.split('/').at(-1)}`;
  const response = await fetch(url,{headers:{'User-Agent':'SmartLend-LocalAssets/1.0 (educational inventory UI; Wikimedia Commons)'}});
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Asset ${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(name+(name==='presenter'?'.png':'.jpg'),folder),bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}
