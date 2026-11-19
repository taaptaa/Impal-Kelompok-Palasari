import projector from '../../assets/inventory/projector.jpg';
import hdmi from '../../assets/inventory/hdmi.jpg';
import speaker from '../../assets/inventory/speaker.jpg';
import microphone from '../../assets/inventory/microphone.jpg';
import chair from '../../assets/inventory/chair.jpg';
import table from '../../assets/inventory/table.jpg';
import tripod from '../../assets/inventory/tripod.jpg';
import camera from '../../assets/inventory/camera.jpg';
import cableReel from '../../assets/inventory/cable-reel.jpg';
import presenter from '../../assets/inventory/presenter.png';
import whiteboard from '../../assets/inventory/whiteboard.jpg';
import hdmiExtension from '../../assets/inventory/hdmi-extension.jpg';

// Presentation-only illustrations, NOT photographs/specifications of actual campus stock.
// Reviewed metadata is preserved; lookup below uses stable inventory codes only.
const photo = (src:string,title:string,author:string,license:string,licenseUrl:string) => ({src,title,author,license,licenseUrl,source:`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replaceAll(' ','_'))}`});
const photos = {
  'proyektor': photo(projector,'InFocus IN34.jpg','Dave Pape','Public domain','https://commons.wikimedia.org/wiki/File:InFocus_IN34.jpg'),
  'kabel hdmi': photo(hdmi,'HDMI-Connector.jpg','Evan-Amos','Public domain','https://commons.wikimedia.org/wiki/File:HDMI-Connector.jpg'),
  'speaker portable': photo(speaker,'JBL GO 1st generation.jpg','Apiiroja','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),
  'mikrofon wireless': photo(microphone,'Shure PG58 with PG2 wireless microphone - on.jpg','Christian Dahlqvist','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/'),
  'kursi lipat': photo(chair,'Folding chairs in a display.jpg','Suyash.dwivedi','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),
  'meja lipat': photo(table,'LifetimeTable.jpg','GreenGlass1972','Public domain','https://commons.wikimedia.org/wiki/File:LifetimeTable.jpg'),
  'tripod': photo(tripod,'Gitzo 1541T Traveler Carbon Fiber Tripod Collage Horizontal.jpg','Lucasbosch','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),
  'kamera': photo(camera,'12 MP digital camera - red.jpg','Packer1028','CC0','https://creativecommons.org/publicdomain/zero/1.0/'),
  'kabel roll': photo(cableReel,'Cable reel extension cord.jpg','Fumikas Sagisavas','CC0','https://creativecommons.org/publicdomain/zero/1.0/'),
  'pointer presentasi': photo(presenter,'PresRemote.png','BCampbell (WMF)','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),
  'whiteboard portable': photo(whiteboard,'Whiteboard in office.jpeg','User:openuow','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/'),
  'extension hdmi': photo(hdmiExtension,'Fire TV Stick HDMI extender.jpg','Elmepi','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'),
};
const keyByCode: Record<string,keyof typeof photos> = {
  'UJI-PRJ-01':'proyektor','UJI-HDM-01':'kabel hdmi','UJI-SPK-01':'speaker portable',
  'UJI-MIC-01':'mikrofon wireless','UJI-KRS-01':'kursi lipat','UJI-MJL-01':'meja lipat',
  'UJI-TRP-01':'tripod','UJI-KMR-01':'kamera','UJI-KRL-01':'kabel roll',
  'UJI-PTR-01':'pointer presentasi','UJI-WBD-01':'whiteboard portable','UJI-HDX-01':'extension hdmi',
};
export function inventoryPhoto(code?:string) {
  const key=code ? keyByCode[code] : undefined;
  return key ? photos[key] : undefined;
}
export const inventoryPhotoCredits = Object.entries(keyByCode).map(([code,key])=>({code,name:key,...photos[key]}));
